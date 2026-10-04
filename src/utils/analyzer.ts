/**
 * Document Image Quality Analyzer
 * Evaluates background uniformity, illumination gradients, color cast,
 * text contrast, sharpness, noise, and skew angle.
 */

import { QualityMetrics, DiagnosticReason } from '../types/document';

export function analyzeDocumentImage(
  imgElement: HTMLImageElement | HTMLCanvasElement
): { metrics: QualityMetrics; reasons: DiagnosticReason[] } {
  // Create an offscreen canvas downscaled for rapid, reliable statistical processing
  const canvas = document.createElement('canvas');
  const maxDim = 400;
  let w = imgElement.width || (imgElement as HTMLImageElement).naturalWidth || 400;
  let h = imgElement.height || (imgElement as HTMLImageElement).naturalHeight || 400;

  const scale = Math.min(1, maxDim / Math.max(w, h));
  canvas.width = Math.max(50, Math.round(w * scale));
  canvas.height = Math.max(50, Math.round(h * scale));

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return getDefaultMetrics();
  }

  ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const pixelCount = canvas.width * canvas.height;

  // 1. Histogram & Luminance distribution
  const hist = new Int32Array(256);
  let totalLum = 0;
  let totalR = 0;
  let totalG = 0;
  let totalB = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    hist[lum]++;
    totalLum += lum;
    totalR += r;
    totalG += g;
    totalB += b;
  }

  const avgLum = totalLum / pixelCount;
  const isDarkDocument = avgLum < 110;

  // 2. Identify Background & Foreground (Text) Peaks
  // For standard documents, background is the highest peak in the upper half of the histogram.
  // For dark documents, background is the peak in the lower half.
  let bgPeakLum = isDarkDocument ? 30 : 220;
  let maxBgFreq = 0;
  const bgRangeStart = isDarkDocument ? 0 : 120;
  const bgRangeEnd = isDarkDocument ? 120 : 255;

  for (let l = bgRangeStart; l <= bgRangeEnd; l++) {
    if (hist[l] > maxBgFreq) {
      maxBgFreq = hist[l];
      bgPeakLum = l;
    }
  }

  // Find text peak (furthest peak away from background)
  let textPeakLum = isDarkDocument ? 220 : 40;
  let maxTextFreq = 0;
  const textRangeStart = isDarkDocument ? 130 : 0;
  const textRangeEnd = isDarkDocument ? 255 : 140;

  for (let l = textRangeStart; l <= textRangeEnd; l++) {
    if (hist[l] > maxTextFreq) {
      maxTextFreq = hist[l];
      textPeakLum = l;
    }
  }

  const contrastSeparation = Math.abs(bgPeakLum - textPeakLum);
  const textContrast = Math.min(100, Math.round((contrastSeparation / 255) * 100));
  const faintTextDetected = contrastSeparation < 75;

  // 3. Color Cast Extraction (Sample the pixels near the background luminance)
  let sampleR = 0;
  let sampleG = 0;
  let sampleB = 0;
  let bgSampleCount = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    // Check if within background cluster
    if (Math.abs(lum - bgPeakLum) < 25) {
      sampleR += r;
      sampleG += g;
      sampleB += b;
      bgSampleCount++;
    }
  }

  if (bgSampleCount === 0) {
    bgSampleCount = 1;
    sampleR = totalR / pixelCount;
    sampleG = totalG / pixelCount;
    sampleB = totalB / pixelCount;
  } else {
    sampleR /= bgSampleCount;
    sampleG /= bgSampleCount;
    sampleB /= bgSampleCount;
  }

  const hexR = Math.round(sampleR).toString(16).padStart(2, '0');
  const hexG = Math.round(sampleG).toString(16).padStart(2, '0');
  const hexB = Math.round(sampleB).toString(16).padStart(2, '0');
  const dominantHex = `#${hexR}${hexG}${hexB}`;

  // Analyze color imbalances
  let detectedCast: 'none' | 'yellow' | 'blue' | 'red' | 'gray' | 'dark' = 'none';
  let castIntensity = 0;
  let castDescription = 'Neutral paper background';

  if (isDarkDocument) {
    detectedCast = 'dark';
    castIntensity = Math.min(100, Math.round((1 - avgLum / 120) * 100));
    castDescription = 'Dark / inverted background document';
  } else {
    // Yellow paper check (R and G notably higher than B)
    const yellowDiff = (sampleR + sampleG) / 2 - sampleB;
    if (yellowDiff > 16) {
      detectedCast = 'yellow';
      castIntensity = Math.min(100, Math.round((yellowDiff / 65) * 100));
      castDescription = `Warm / aged paper cast (+${castIntensity}% warmth)`;
    } else if (sampleB - (sampleR + sampleG) / 2 > 15) {
      detectedCast = 'blue';
      castIntensity = Math.min(100, Math.round(((sampleB - (sampleR + sampleG) / 2) / 60) * 100));
      castDescription = `Cool cyan / blue cast (+${castIntensity}%)`;
    } else if (sampleR - sampleG > 20 && sampleR - sampleB > 20) {
      detectedCast = 'red';
      castIntensity = Math.min(100, Math.round(((sampleR - sampleG) / 50) * 100));
      castDescription = `Pink / reddish hue cast (+${castIntensity}%)`;
    } else if (bgPeakLum < 210) {
      detectedCast = 'gray';
      castIntensity = Math.min(100, Math.round(((235 - bgPeakLum) / 100) * 100));
      castDescription = `Gray underexposed paper (luminance ${bgPeakLum}/255)`;
    }
  }

  // 4. Illumination Uniformity & Shadow Detection (Tile-based 6x6 grid)
  const tilesX = 6;
  const tilesY = 6;
  const tileW = Math.floor(canvas.width / tilesX);
  const tileH = Math.floor(canvas.height / tilesY);
  const tileBgLums: number[] = [];

  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      let tileLums: number[] = [];
      for (let y = ty * tileH; y < (ty + 1) * tileH; y++) {
        for (let x = tx * tileW; x < (tx + 1) * tileW; x++) {
          const idx = (y * canvas.width + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          tileLums.push(0.299 * r + 0.587 * g + 0.114 * b);
        }
      }
      // Top 85th percentile represents background of this tile
      tileLums.sort((a, b) => a - b);
      const bgIndex = Math.floor(tileLums.length * (isDarkDocument ? 0.15 : 0.85));
      tileBgLums.push(tileLums[bgIndex] || avgLum);
    }
  }

  let minTileBg = 255;
  let maxTileBg = 0;
  let sumTileBg = 0;
  for (const val of tileBgLums) {
    if (val < minTileBg) minTileBg = val;
    if (val > maxTileBg) maxTileBg = val;
    sumTileBg += val;
  }
  const tileDelta = maxTileBg - minTileBg;
  const illuminationGradient = Math.min(100, Math.round((tileDelta / 120) * 100));
  const backgroundUniformity = Math.max(0, 100 - illuminationGradient);

  // 5. Blurriness / Sharpness (Laplacian high-frequency variance)
  let laplacianSum = 0;
  let edgeCount = 0;
  const stride = 2;
  for (let y = 1; y < canvas.height - 1; y += stride) {
    for (let x = 1; x < canvas.width - 1; x += stride) {
      const idx = (y * canvas.width + x) * 4;
      const center = data[idx];
      const left = data[idx - 4];
      const right = data[idx + 4];
      const up = data[((y - 1) * canvas.width + x) * 4];
      const down = data[((y + 1) * canvas.width + x) * 4];

      // Discrete Laplacian: 4 * center - left - right - up - down
      const lap = Math.abs(4 * center - left - right - up - down);
      laplacianSum += lap;
      edgeCount++;
    }
  }
  const avgLaplacian = edgeCount > 0 ? laplacianSum / edgeCount : 0;
  const sharpnessScore = Math.min(100, Math.round(Math.min(1, avgLaplacian / 22) * 100));

  // 6. Noise Score (variance in the background area)
  let noiseVarianceSum = 0;
  let noiseCount = 0;
  for (let i = 0; i < data.length - 8; i += 16) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    if (Math.abs(lum - bgPeakLum) < 15) {
      const nextLum = 0.299 * data[i + 4] + 0.587 * data[i + 5] + 0.114 * data[i + 6];
      noiseVarianceSum += Math.abs(lum - nextLum);
      noiseCount++;
    }
  }
  const avgNoise = noiseCount > 0 ? noiseVarianceSum / noiseCount : 0;
  const noiseScore = Math.min(100, Math.round((avgNoise / 18) * 100));

  // 7. Skew Angle Detection (Horizontal projection profile variance)
  const detectedSkewAngle = estimateSkewAngle(data, canvas.width, canvas.height, isDarkDocument);

  // 8. Estimated Ink Coverage
  let inkPixels = 0;
  for (let i = 0; i < data.length; i += 4) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    if (isDarkDocument) {
      // In dark document, almost everything is ink
      if (lum < 200) inkPixels++;
    } else {
      if (lum < 220) inkPixels++;
    }
  }
  const estimatedInkCoverage = Math.min(100, Math.round((inkPixels / pixelCount) * 100));

  const metrics: QualityMetrics = {
    backgroundLuminance: Math.round(bgPeakLum),
    backgroundUniformity,
    illuminationGradient,
    colorCast: {
      detected: detectedCast,
      intensity: castIntensity,
      dominantHex,
      description: castDescription,
    },
    textContrast,
    faintTextDetected,
    sharpnessScore,
    noiseScore,
    detectedSkewAngle,
    isDarkDocument,
    estimatedInkCoverage,
  };

  const reasons = generateDiagnosticReasons(metrics);

  return { metrics, reasons };
}

/**
 * Fast horizontal projection profile variance across angles -3.5° to +3.5°
 */
function estimateSkewAngle(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  isDark: boolean
): number {
  const angles = [-3.0, -2.0, -1.0, -0.5, 0, 0.5, 1.0, 2.0, 3.0];
  let bestAngle = 0;
  let maxVariance = -1;

  for (const angle of angles) {
    const rad = (angle * Math.PI) / 180;
    const tan = Math.tan(rad);
    const rowSums = new Float32Array(height);

    for (let y = 0; y < height; y += 3) {
      let sum = 0;
      let count = 0;
      for (let x = 0; x < width; x += 3) {
        const sampleY = Math.round(y + (x - width / 2) * tan);
        if (sampleY >= 0 && sampleY < height) {
          const idx = (sampleY * width + x) * 4;
          const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
          // Text pixels have strong contrast
          const isText = isDark ? lum > 140 : lum < 140;
          if (isText) sum++;
          count++;
        }
      }
      rowSums[y] = count > 0 ? sum / count : 0;
    }

    // Compute variance of row profile (higher variance = aligned lines of text)
    let mean = 0;
    let n = 0;
    for (let y = 0; y < height; y += 3) {
      mean += rowSums[y];
      n++;
    }
    mean = n > 0 ? mean / n : 0;

    let variance = 0;
    for (let y = 0; y < height; y += 3) {
      const diff = rowSums[y] - mean;
      variance += diff * diff;
    }

    if (variance > maxVariance) {
      maxVariance = variance;
      bestAngle = angle;
    }
  }

  return bestAngle;
}

function generateDiagnosticReasons(m: QualityMetrics): DiagnosticReason[] {
  const reasons: DiagnosticReason[] = [];

  // Problem 1: Dark or Inverted Document
  if (m.isDarkDocument) {
    reasons.push({
      problem: 'Dark / Blackboard background detected',
      measuredMetric: `Average luminance is only ${m.backgroundLuminance}/255`,
      suggestedAction: 'Apply polarity inversion (dark-to-white) to conserve up to 85% printer ink/toner',
      affectedSettings: {
        inversionMode: 'invert_full',
        whitePoint: 245,
        blackPoint: 25,
      },
      severity: 'high',
    });
  }

  // Problem 2: Yellow / Aged Paper or Color Cast
  if (m.colorCast.detected === 'yellow' && m.colorCast.intensity > 15) {
    reasons.push({
      problem: 'Aged / Yellow paper color cast',
      measuredMetric: `Warmth imbalance is +${m.colorCast.intensity}% (R/G dominant over B)`,
      suggestedAction: 'Cool color temperature by ' + m.colorCast.intensity + '%, desaturate background, and raise white-point',
      affectedSettings: {
        colorTemp: -Math.min(90, Math.round(m.colorCast.intensity * 0.8)),
        saturation: 0.25,
        whitePoint: 220,
      },
      severity: m.colorCast.intensity > 40 ? 'high' : 'medium',
    });
  } else if (m.colorCast.detected === 'gray') {
    reasons.push({
      problem: 'Dull / Gray paper background',
      measuredMetric: `Background luminance sits at ${m.backgroundLuminance}/255 (underexposed scan)`,
      suggestedAction: 'Lower white-point threshold to 200 to whiten paper into pure clean sheet',
      affectedSettings: {
        whitePoint: Math.max(160, m.backgroundLuminance - 10),
        gamma: 1.15,
      },
      severity: 'medium',
    });
  }

  // Problem 3: Uneven Lighting & Shadows
  if (m.illuminationGradient > 25) {
    const sev = m.illuminationGradient > 55 ? 'high' : 'medium';
    reasons.push({
      problem: 'Uneven lighting or smartphone shadow',
      measuredMetric: `Tile illumination variance is ${m.illuminationGradient}% across page`,
      suggestedAction: 'Activate 2D spatial background division to flatten corner & hand shadows',
      affectedSettings: {
        illuminationCorrection: Math.min(100, Math.round(m.illuminationGradient * 1.15)),
      },
      severity: sev,
    });
  }

  // Problem 4: Faint / Washed-out Text
  if (m.faintTextDetected || m.textContrast < 45) {
    reasons.push({
      problem: 'Faint or low-contrast text',
      measuredMetric: `Foreground-to-background separation is only ${m.textContrast}%`,
      suggestedAction: 'Increase contrast +25%, raise black-point shadow cutoff to darken faint strokes',
      affectedSettings: {
        contrast: 1.35,
        blackPoint: 35,
        gamma: 0.9,
      },
      severity: 'high',
    });
  }

  // Problem 5: Blurry or Soft Edges
  if (m.sharpnessScore < 40) {
    reasons.push({
      problem: 'Soft or out-of-focus text strokes',
      measuredMetric: `Laplacian sharpness index is low (${m.sharpnessScore}/100)`,
      suggestedAction: 'Apply unsharp mask edge convolution filter',
      affectedSettings: {
        sharpen: Math.min(80, Math.round((50 - m.sharpnessScore) * 1.5)),
      },
      severity: 'low',
    });
  }

  // Problem 6: Skewed Document
  if (Math.abs(m.detectedSkewAngle) >= 0.5) {
    reasons.push({
      problem: 'Page tilted during capture',
      measuredMetric: `Estimated tilt is ${m.detectedSkewAngle > 0 ? '+' : ''}${m.detectedSkewAngle}°`,
      suggestedAction: `Deskew rotation by ${-m.detectedSkewAngle}° to straighten text baselines`,
      affectedSettings: {
        deskew: -m.detectedSkewAngle,
      },
      severity: 'low',
    });
  }

  // Problem 7: High Toner Consumption
  if (!m.isDarkDocument && m.estimatedInkCoverage > 45) {
    reasons.push({
      problem: 'High print toner consumption (dirty margins)',
      measuredMetric: `Estimated page ink coverage is ${m.estimatedInkCoverage}% (standard clean doc is ~5-12%)`,
      suggestedAction: 'Apply background whitening and adaptive thresholding to purge dirty margins',
      affectedSettings: {
        whitePoint: 220,
        adaptiveThreshold: 35,
      },
      severity: 'medium',
    });
  }

  return reasons;
}

export function getDefaultMetrics(): { metrics: QualityMetrics; reasons: DiagnosticReason[] } {
  const metrics: QualityMetrics = {
    backgroundLuminance: 215,
    backgroundUniformity: 80,
    illuminationGradient: 20,
    colorCast: {
      detected: 'none',
      intensity: 0,
      dominantHex: '#f0f0f0',
      description: 'Neutral paper',
    },
    textContrast: 70,
    faintTextDetected: false,
    sharpnessScore: 65,
    noiseScore: 15,
    detectedSkewAngle: 0,
    isDarkDocument: false,
    estimatedInkCoverage: 14,
  };
  return { metrics, reasons: [] };
}
