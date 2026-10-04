/**
 * High-performance Canvas Image Processor for Document Restoration
 * Features 2D spatial illumination flattening, level stretching, white-point cutoff,
 * color temperature correction, unsharp masking, deskew, and toner-saving inversion modes.
 */

import { ProcessingSettings } from '../types/document';

export async function processDocumentImage(
  sourceImage: HTMLImageElement | HTMLCanvasElement,
  settings: ProcessingSettings,
  rotation: number = 0,
  maxDimension?: number
): Promise<{ canvas: HTMLCanvasElement; dataUrl: string; inkCoverage: number }> {
  // Step 1: Base dimensions and rotation
  let srcW = sourceImage.width || (sourceImage as HTMLImageElement).naturalWidth;
  let srcH = sourceImage.height || (sourceImage as HTMLImageElement).naturalHeight;

  let scale = 1.0;
  if (maxDimension && Math.max(srcW, srcH) > maxDimension) {
    scale = maxDimension / Math.max(srcW, srcH);
  }

  const w = Math.max(30, Math.round(srcW * scale));
  const h = Math.max(30, Math.round(srcH * scale));

  // Determine canvas size after rotation (rotation in 90 deg steps)
  const isRotated90 = (rotation % 180) !== 0;
  const canvasW = isRotated90 ? h : w;
  const canvasH = isRotated90 ? w : h;

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Unable to create 2D canvas context');
  }

  // Draw source with 90-degree step rotation and fine deskew angle
  ctx.save();
  ctx.translate(canvasW / 2, canvasH / 2);
  const totalAngleRad = ((rotation + settings.deskew) * Math.PI) / 180;
  ctx.rotate(totalAngleRad);
  ctx.drawImage(sourceImage, -w / 2, -h / 2, w, h);
  ctx.restore();

  let imgData = ctx.getImageData(0, 0, canvasW, canvasH);
  const pixels = imgData.data;
  const pixelCount = canvasW * canvasH;

  // Step 2: Illumination Correction (2D Background Normalization)
  // Eliminates phone shadows, corner falloff, and fold shadows
  if (settings.illuminationCorrection > 0) {
    applyIlluminationCorrection(pixels, canvasW, canvasH, settings.illuminationCorrection / 100);
  }

  // Pre-calculate Level Stretch / Gamma / Exposure Look-up Table (LUT)
  const lut = buildLevelsLUT(settings);

  // Temperature balance factors
  const tempShift = settings.colorTemp / 100; // -1 to +1
  const rTempMult = 1 + (tempShift > 0 ? tempShift * 0.25 : tempShift * 0.15);
  const bTempMult = 1 - (tempShift > 0 ? tempShift * 0.25 : tempShift * 0.35);

  const satMult = settings.saturation;
  const preserveStamps = settings.preserveSignatures;

  // Step 3: Color, Exposure, White/Black Point Stretch
  for (let i = 0; i < pixels.length; i += 4) {
    let r = pixels[i];
    let g = pixels[i + 1];
    let b = pixels[i + 2];

    // Detect if this pixel is a colored stamp or signature (e.g. blue pen, red notary stamp)
    const colorfulness = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(b - r));
    const isColoredInk = preserveStamps && colorfulness > 24;

    if (!isColoredInk) {
      // Color Temperature
      if (settings.colorTemp !== 0) {
        r = Math.min(255, Math.max(0, Math.round(r * rTempMult)));
        b = Math.min(255, Math.max(0, Math.round(b * bTempMult)));
      }

      // Saturation
      if (satMult !== 1.0) {
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        r = Math.min(255, Math.max(0, Math.round(lum + (r - lum) * satMult)));
        g = Math.min(255, Math.max(0, Math.round(lum + (g - lum) * satMult)));
        b = Math.min(255, Math.max(0, Math.round(lum + (b - lum) * satMult)));
      }
    }

    // Apply Levels LUT (White point, black point, contrast, gamma, exposure)
    pixels[i] = lut[r];
    pixels[i + 1] = lut[g];
    pixels[i + 2] = lut[b];
  }

  // Step 4: Adaptive Local Thresholding (sauvola/local mean blend)
  if (settings.adaptiveThreshold > 0) {
    applyAdaptiveThreshold(pixels, canvasW, canvasH, settings.adaptiveThreshold / 100, preserveStamps);
  }

  // Step 5: Sharpening (Unsharp Masking)
  if (settings.sharpen > 0) {
    applySharpen(pixels, canvasW, canvasH, settings.sharpen / 100);
  }

  // Step 6: Denoising (Background 3x3 Smoothing)
  if (settings.denoise > 0) {
    applyDenoise(pixels, canvasW, canvasH, settings.denoise / 100);
  }

  // Step 7: Inversion & Ink-Saving Transformations
  if (settings.inversionMode !== 'none') {
    applyInversionMode(pixels, canvasW, canvasH, settings.inversionMode, settings.inkSaverStrength / 100);
  }

  // Write processed pixels back
  ctx.putImageData(imgData, 0, 0);

  // Compute final ink coverage (% of pixels that are non-white)
  let printedDots = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const lum = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
    if (lum < 235) {
      printedDots += (255 - lum) / 255;
    }
  }
  const inkCoverage = Math.min(100, Math.max(0, Math.round((printedDots / pixelCount) * 100)));

  return {
    canvas,
    dataUrl: canvas.toDataURL('image/jpeg', 0.92),
    inkCoverage,
  };
}

/**
 * Builds a fast 256-element Look-Up Table for combined exposure, levels stretch,
 * black-point cutoff, white-point cutoff, gamma, and contrast.
 */
function buildLevelsLUT(settings: ProcessingSettings): Uint8Array {
  const lut = new Uint8Array(256);
  const bp = settings.blackPoint;
  const wp = Math.max(bp + 10, settings.whitePoint);
  const gamma = Math.max(0.2, settings.gamma);
  const invGamma = 1 / gamma;
  const contrast = settings.contrast;
  const exposureBoost = settings.exposure * 60;

  for (let i = 0; i < 256; i++) {
    // 1. Exposure shift
    let val = i + exposureBoost;

    // 2. Black point & White point stretch
    if (val <= bp) {
      val = 0;
    } else if (val >= wp) {
      val = 255;
    } else {
      val = ((val - bp) / (wp - bp)) * 255;
    }

    // 3. Normalized 0 to 1
    let norm = Math.max(0, Math.min(1, val / 255));

    // 4. Gamma power curve
    norm = Math.pow(norm, invGamma);

    // 5. Contrast adjustment centered at 0.5
    if (contrast !== 1.0) {
      norm = (norm - 0.5) * contrast + 0.5;
      norm = Math.max(0, Math.min(1, norm));
    }

    lut[i] = Math.round(norm * 255);
  }

  return lut;
}

/**
 * 2D Background Division / Illumination Compensation
 * Estimates low-frequency background envelope and normalizes pixel values
 */
function applyIlluminationCorrection(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  strength: number
): void {
  // Downsample to a coarse grid to estimate low-frequency illumination
  const gridW = 32;
  const gridH = 32;
  const bgGrid = new Float32Array(gridW * gridH);

  const blockW = width / gridW;
  const blockH = height / gridH;

  for (let gy = 0; gy < gridH; gy++) {
    for (let gx = 0; gx < gridW; gx++) {
      const startX = Math.floor(gx * blockW);
      const endX = Math.min(width, Math.floor((gx + 1) * blockW));
      const startY = Math.floor(gy * blockH);
      const endY = Math.min(height, Math.floor((gy + 1) * blockH));

      // Collect upper 85th percentile luminance as background
      let maxLums: number[] = [];
      for (let y = startY; y < endY; y += 2) {
        for (let x = startX; x < endX; x += 2) {
          const idx = (y * width + x) * 4;
          const lum = 0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2];
          maxLums.push(lum);
        }
      }
      maxLums.sort((a, b) => a - b);
      const bgIndex = Math.floor(maxLums.length * 0.88);
      bgGrid[gy * gridW + gx] = maxLums[bgIndex] || 200;
    }
  }

  // Smooth the grid
  const smoothedGrid = new Float32Array(gridW * gridH);
  for (let gy = 0; gy < gridH; gy++) {
    for (let gx = 0; gx < gridW; gx++) {
      let sum = 0;
      let count = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const ny = gy + dy;
          const nx = gx + dx;
          if (nx >= 0 && nx < gridW && ny >= 0 && ny < gridH) {
            sum += bgGrid[ny * gridW + nx];
            count++;
          }
        }
      }
      smoothedGrid[gy * gridW + gx] = sum / count;
    }
  }

  // Normalize image pixels using bilinear interpolation of smoothed background
  for (let y = 0; y < height; y++) {
    const gy = (y / height) * (gridH - 1);
    const gy0 = Math.floor(gy);
    const gy1 = Math.min(gridH - 1, gy0 + 1);
    const yFrac = gy - gy0;

    for (let x = 0; x < width; x++) {
      const gx = (x / width) * (gridW - 1);
      const gx0 = Math.floor(gx);
      const gx1 = Math.min(gridW - 1, gx0 + 1);
      const xFrac = gx - gx0;

      // Bilinear interpolation
      const bg00 = smoothedGrid[gy0 * gridW + gx0];
      const bg10 = smoothedGrid[gy0 * gridW + gx1];
      const bg01 = smoothedGrid[gy1 * gridW + gx0];
      const bg11 = smoothedGrid[gy1 * gridW + gx1];

      const bgTop = bg00 + (bg10 - bg00) * xFrac;
      const bgBottom = bg01 + (bg11 - bg01) * xFrac;
      const localBg = Math.max(25, bgTop + (bgBottom - bgTop) * yFrac);

      const idx = (y * width + x) * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];

      // Divide by local background and scale to 245
      const normFactor = 245 / localBg;
      const targetR = Math.min(255, Math.round(r * normFactor));
      const targetG = Math.min(255, Math.round(g * normFactor));
      const targetB = Math.min(255, Math.round(b * normFactor));

      // Blend with strength
      pixels[idx] = Math.round(r + (targetR - r) * strength);
      pixels[idx + 1] = Math.round(g + (targetG - g) * strength);
      pixels[idx + 2] = Math.round(b + (targetB - b) * strength);
    }
  }
}

/**
 * Adaptive Local Thresholding (Sauvola / Bradley technique)
 * Compares pixel to local neighborhood mean with threshold factor
 */
function applyAdaptiveThreshold(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  blend: number,
  preserveStamps: boolean
): void {
  // Integral image for fast O(1) box window calculation
  const intImg = new Float64Array((width + 1) * (height + 1));
  const intW = width + 1;

  for (let y = 0; y < height; y++) {
    let rowSum = 0;
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const lum = 0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2];
      rowSum += lum;
      intImg[(y + 1) * intW + (x + 1)] = intImg[y * intW + (x + 1)] + rowSum;
    }
  }

  // Radius for local window (~1/35th of image width)
  const radius = Math.max(4, Math.round(width / 35));
  const thresholdSens = 0.88; // Bradley threshold constant

  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - radius);
    const y1 = Math.min(height, y + radius + 1);

    for (let x = 0; x < width; x++) {
      const x0 = Math.max(0, x - radius);
      const x1 = Math.min(width, x + radius + 1);

      const count = (x1 - x0) * (y1 - y0);
      const sum =
        intImg[y1 * intW + x1] -
        intImg[y0 * intW + x1] -
        intImg[y1 * intW + x0] +
        intImg[y0 * intW + x0];
      const localMean = sum / count;

      const idx = (y * width + x) * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      const colorfulness = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(b - r));
      if (preserveStamps && colorfulness > 24) {
        continue; // Keep stamp color
      }

      // Is it text or background?
      const isForeground = lum < localMean * thresholdSens;
      const binaryTarget = isForeground ? 10 : 255;

      pixels[idx] = Math.round(r + (binaryTarget - r) * blend);
      pixels[idx + 1] = Math.round(g + (binaryTarget - g) * blend);
      pixels[idx + 2] = Math.round(b + (binaryTarget - b) * blend);
    }
  }
}

/**
 * 3x3 Unsharp Mask Kernel
 */
function applySharpen(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  strength: number
): void {
  const original = new Uint8ClampedArray(pixels);
  const factor = strength * 0.8;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;

      for (let c = 0; c < 3; c++) {
        const center = original[idx + c];
        const up = original[((y - 1) * width + x) * 4 + c];
        const down = original[((y + 1) * width + x) * 4 + c];
        const left = original[(y * width + (x - 1)) * 4 + c];
        const right = original[(y * width + (x + 1)) * 4 + c];

        // High-pass laplacian
        const highPass = 4 * center - up - down - left - right;
        const val = center + highPass * factor;
        pixels[idx + c] = Math.max(0, Math.min(255, Math.round(val)));
      }
    }
  }
}

/**
 * Denoise filter (3x3 low-pass on near-white background)
 */
function applyDenoise(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  strength: number
): void {
  const copy = new Uint8ClampedArray(pixels);

  for (let y = 1; y < height - 1; y += 2) {
    for (let x = 1; x < width - 1; x += 2) {
      const idx = (y * width + x) * 4;
      const lum = 0.299 * copy[idx] + 0.587 * copy[idx + 1] + 0.114 * copy[idx + 2];

      // Only denoise light background areas to avoid blurring text strokes
      if (lum > 200) {
        let avgR = 0;
        let avgG = 0;
        let avgB = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nIdx = ((y + dy) * width + (x + dx)) * 4;
            avgR += copy[nIdx];
            avgG += copy[nIdx + 1];
            avgB += copy[nIdx + 2];
          }
        }
        avgR /= 9;
        avgG /= 9;
        avgB /= 9;

        pixels[idx] = Math.round(pixels[idx] + (avgR - pixels[idx]) * strength);
        pixels[idx + 1] = Math.round(pixels[idx + 1] + (avgG - pixels[idx + 1]) * strength);
        pixels[idx + 2] = Math.round(pixels[idx + 2] + (avgB - pixels[idx + 2]) * strength);
      }
    }
  }
}

/**
 * Inversion & Printing Ink-Saver Modes
 */
function applyInversionMode(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  mode: ProcessingSettings['inversionMode'],
  inkSaverStrength: number
): void {
  if (mode === 'none') return;

  if (mode === 'invert_full') {
    // Standard full polarity inversion (black background -> clean white paper)
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = 255 - pixels[i];
      pixels[i + 1] = 255 - pixels[i + 1];
      pixels[i + 2] = 255 - pixels[i + 2];
    }
    return;
  }

  if (mode === 'high_contrast_mono') {
    // Pure 1-bit binary output
    for (let i = 0; i < pixels.length; i += 4) {
      const lum = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
      const val = lum < 150 ? 0 : 255;
      pixels[i] = val;
      pixels[i + 1] = val;
      pixels[i + 2] = val;
    }
    return;
  }

  if (mode === 'blueprint_invert') {
    // Blueprint: Deep blue/white inverted to white paper with dark blue strokes
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      // Inverted luminance
      const invLum = 255 - lum;
      // Dark blueprint stroke on white paper
      pixels[i] = Math.round(invLum * 0.95);
      pixels[i + 1] = Math.round(invLum * 0.95);
      pixels[i + 2] = Math.min(255, Math.round(invLum * 1.1 + (255 - invLum) * 0.1));
    }
    return;
  }

  if (mode === 'ink_saver_toner') {
    // Grayscale washout curve: purges light gray ink to 0%, limits dark text to 60% toner
    const targetMinTonerLum = Math.round(18 + inkSaverStrength * 60); // 18 to 78 lum instead of 0

    for (let i = 0; i < pixels.length; i += 4) {
      const lum = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
      if (lum >= 200) {
        // Complete 0% toner on paper margins
        pixels[i] = 255;
        pixels[i + 1] = 255;
        pixels[i + 2] = 255;
      } else {
        // Remap dark text to lighter toner density
        const remapped = Math.round(targetMinTonerLum + (lum / 200) * (255 - targetMinTonerLum));
        pixels[i] = remapped;
        pixels[i + 1] = remapped;
        pixels[i + 2] = remapped;
      }
    }
    return;
  }

  if (mode === 'ink_saver_outline') {
    // Stroke / Edge Extraction: Hollow out thick text blocks into outlines
    const copy = new Uint8ClampedArray(pixels);
    const outlineThresh = Math.max(15, Math.round(45 - inkSaverStrength * 25));

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        const lum = 0.299 * copy[idx] + 0.587 * copy[idx + 1] + 0.114 * copy[idx + 2];

        // Only process dark text regions
        if (lum < 160) {
          // Horizontal & Vertical gradient
          const rightLum = 0.299 * copy[idx + 4] + 0.587 * copy[idx + 5] + 0.114 * copy[idx + 6];
          const downLum = 0.299 * copy[((y + 1) * width + x) * 4] + 0.587 * copy[((y + 1) * width + x) * 4 + 1] + 0.114 * copy[((y + 1) * width + x) * 4 + 2];

          const edge = Math.abs(lum - rightLum) + Math.abs(lum - downLum);

          if (edge > outlineThresh) {
            // Keep boundary stroke dark
            pixels[idx] = 10;
            pixels[idx + 1] = 10;
            pixels[idx + 2] = 10;
          } else {
            // Hollow interior: white out solid fill to save massive ink!
            pixels[idx] = 255;
            pixels[idx + 1] = 255;
            pixels[idx + 2] = 255;
          }
        } else {
          pixels[idx] = 255;
          pixels[idx + 1] = 255;
          pixels[idx + 2] = 255;
        }
      }
    }
    return;
  }
}
