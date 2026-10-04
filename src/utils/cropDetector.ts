/**
 * Document Boundary Detection & Perspective Homography Warper
 * Automatically detects paper edges from background and provides
 * 4-corner perspective correction, user-guided edge snapping, and batch propagation.
 */

export interface Point {
  x: number; // Normalized coordinate (0 to 1)
  y: number; // Normalized coordinate (0 to 1)
}

export interface DocumentCorners {
  topLeft: Point;
  topRight: Point;
  bottomRight: Point;
  bottomLeft: Point;
}

export function getDefaultCorners(): DocumentCorners {
  return {
    topLeft: { x: 0.04, y: 0.04 },
    topRight: { x: 0.96, y: 0.04 },
    bottomRight: { x: 0.96, y: 0.96 },
    bottomLeft: { x: 0.04, y: 0.96 },
  };
}

/**
 * Computer Vision technique to detect document corners from background
 * (e.g. paper on table, desk, fabric, or dark scanner bed)
 */
export function autoDetectDocumentCorners(
  imgElement: HTMLImageElement | HTMLCanvasElement
): DocumentCorners {
  const naturalW = imgElement instanceof HTMLImageElement
    ? (imgElement.naturalWidth || imgElement.width)
    : imgElement.width;
  const naturalH = imgElement instanceof HTMLImageElement
    ? (imgElement.naturalHeight || imgElement.height)
    : imgElement.height;

  if (!naturalW || !naturalH) {
    return getDefaultCorners();
  }

  // Work on a balanced thumbnail for fast edge extraction
  const maxDim = 400;
  const scale = Math.min(1, maxDim / Math.max(naturalW, naturalH));
  const w = Math.max(60, Math.round(naturalW * scale));
  const h = Math.max(60, Math.round(naturalH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return getDefaultCorners();

  ctx.drawImage(imgElement, 0, 0, w, h);
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // 1. Sample border background pixels along all 4 outer margins
  let bgR = 0, bgG = 0, bgB = 0;
  let bgCount = 0;
  const margin = Math.max(2, Math.round(Math.min(w, h) * 0.02));

  for (let x = 0; x < w; x += 3) {
    // Top border
    let idx = (margin * w + x) * 4;
    bgR += data[idx]; bgG += data[idx + 1]; bgB += data[idx + 2];
    // Bottom border
    idx = ((h - 1 - margin) * w + x) * 4;
    bgR += data[idx]; bgG += data[idx + 1]; bgB += data[idx + 2];
    bgCount += 2;
  }
  for (let y = 0; y < h; y += 3) {
    // Left border
    let idx = (y * w + margin) * 4;
    bgR += data[idx]; bgG += data[idx + 1]; bgB += data[idx + 2];
    // Right border
    idx = (y * w + (w - 1 - margin)) * 4;
    bgR += data[idx]; bgG += data[idx + 1]; bgB += data[idx + 2];
    bgCount += 2;
  }
  bgR /= Math.max(1, bgCount);
  bgG /= Math.max(1, bgCount);
  bgB /= Math.max(1, bgCount);

  // 2. Scan inward from each edge across multiple scan lines to detect paper edge transitions
  const numScanlines = 15;
  const threshold = 38; // color distance threshold for paper vs background

  // Top edge detections
  const topEdgePoints: { x: number; y: number }[] = [];
  for (let i = 1; i <= numScanlines; i++) {
    const x = Math.round((i / (numScanlines + 1)) * w);
    let foundY = 0;
    for (let y = margin; y < Math.floor(h * 0.48); y++) {
      const idx = (y * w + x) * 4;
      const dist = Math.abs(data[idx] - bgR) + Math.abs(data[idx + 1] - bgG) + Math.abs(data[idx + 2] - bgB);
      if (dist > threshold) {
        foundY = y;
        break;
      }
    }
    if (foundY > margin) topEdgePoints.push({ x, y: foundY });
  }

  // Bottom edge detections
  const bottomEdgePoints: { x: number; y: number }[] = [];
  for (let i = 1; i <= numScanlines; i++) {
    const x = Math.round((i / (numScanlines + 1)) * w);
    let foundY = h - 1;
    for (let y = h - 1 - margin; y > Math.floor(h * 0.52); y--) {
      const idx = (y * w + x) * 4;
      const dist = Math.abs(data[idx] - bgR) + Math.abs(data[idx + 1] - bgG) + Math.abs(data[idx + 2] - bgB);
      if (dist > threshold) {
        foundY = y;
        break;
      }
    }
    if (foundY < h - 1 - margin) bottomEdgePoints.push({ x, y: foundY });
  }

  // Left edge detections
  const leftEdgePoints: { x: number; y: number }[] = [];
  for (let i = 1; i <= numScanlines; i++) {
    const y = Math.round((i / (numScanlines + 1)) * h);
    let foundX = 0;
    for (let x = margin; x < Math.floor(w * 0.48); x++) {
      const idx = (y * w + x) * 4;
      const dist = Math.abs(data[idx] - bgR) + Math.abs(data[idx + 1] - bgG) + Math.abs(data[idx + 2] - bgB);
      if (dist > threshold) {
        foundX = x;
        break;
      }
    }
    if (foundX > margin) leftEdgePoints.push({ x: foundX, y });
  }

  // Right edge detections
  const rightEdgePoints: { x: number; y: number }[] = [];
  for (let i = 1; i <= numScanlines; i++) {
    const y = Math.round((i / (numScanlines + 1)) * h);
    let foundX = w - 1;
    for (let x = w - 1 - margin; x > Math.floor(w * 0.52); x--) {
      const idx = (y * w + x) * 4;
      const dist = Math.abs(data[idx] - bgR) + Math.abs(data[idx + 1] - bgG) + Math.abs(data[idx + 2] - bgB);
      if (dist > threshold) {
        foundX = x;
        break;
      }
    }
    if (foundX < w - 1 - margin) rightEdgePoints.push({ x: foundX, y });
  }

  // If insufficient edge points detected (e.g. clean white scan with no table background)
  if (topEdgePoints.length < 3 && bottomEdgePoints.length < 3 && leftEdgePoints.length < 3 && rightEdgePoints.length < 3) {
    return getDefaultCorners();
  }

  // Calculate robust corner positions from detected edge distributions
  const topYValues = topEdgePoints.map((p) => p.y).sort((a, b) => a - b);
  const bottomYValues = bottomEdgePoints.map((p) => p.y).sort((a, b) => a - b);
  const leftXValues = leftEdgePoints.map((p) => p.x).sort((a, b) => a - b);
  const rightXValues = rightEdgePoints.map((p) => p.x).sort((a, b) => a - b);

  const medTopY = topYValues.length > 0 ? topYValues[Math.floor(topYValues.length / 2)] : margin;
  const medBottomY = bottomYValues.length > 0 ? bottomYValues[Math.floor(bottomYValues.length / 2)] : h - 1 - margin;
  const medLeftX = leftXValues.length > 0 ? leftXValues[Math.floor(leftXValues.length / 2)] : margin;
  const medRightX = rightXValues.length > 0 ? rightXValues[Math.floor(rightXValues.length / 2)] : w - 1 - margin;

  // Compute slight perspective slope if edges are tilted
  let topSlope = 0;
  if (topEdgePoints.length >= 4) {
    const firstHalf = topEdgePoints.slice(0, Math.floor(topEdgePoints.length / 2));
    const secondHalf = topEdgePoints.slice(Math.floor(topEdgePoints.length / 2));
    const avgFirst = firstHalf.reduce((acc, p) => acc + p.y, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((acc, p) => acc + p.y, 0) / secondHalf.length;
    topSlope = (avgSecond - avgFirst) / Math.max(10, w / 2);
  }

  let bottomSlope = 0;
  if (bottomEdgePoints.length >= 4) {
    const firstHalf = bottomEdgePoints.slice(0, Math.floor(bottomEdgePoints.length / 2));
    const secondHalf = bottomEdgePoints.slice(Math.floor(bottomEdgePoints.length / 2));
    const avgFirst = firstHalf.reduce((acc, p) => acc + p.y, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((acc, p) => acc + p.y, 0) / secondHalf.length;
    bottomSlope = (avgSecond - avgFirst) / Math.max(10, w / 2);
  }

  // Assemble 4 corners
  const tlX = Math.max(0.01, Math.min(0.40, medLeftX / w));
  const tlY = Math.max(0.01, Math.min(0.40, (medTopY - (topSlope * (w / 4))) / h));

  const trX = Math.min(0.99, Math.max(0.60, medRightX / w));
  const trY = Math.max(0.01, Math.min(0.40, (medTopY + (topSlope * (w / 4))) / h));

  const brX = Math.min(0.99, Math.max(0.60, medRightX / w));
  const brY = Math.min(0.99, Math.max(0.60, (medBottomY + (bottomSlope * (w / 4))) / h));

  const blX = Math.max(0.01, Math.min(0.40, medLeftX / w));
  const blY = Math.min(0.99, Math.max(0.60, (medBottomY - (bottomSlope * (w / 4))) / h));

  return {
    topLeft: { x: Number(tlX.toFixed(4)), y: Number(tlY.toFixed(4)) },
    topRight: { x: Number(trX.toFixed(4)), y: Number(trY.toFixed(4)) },
    bottomRight: { x: Number(brX.toFixed(4)), y: Number(brY.toFixed(4)) },
    bottomLeft: { x: Number(blX.toFixed(4)), y: Number(blY.toFixed(4)) },
  };
}

/**
 * USER-GUIDED ACTIVE CONTOUR EDGE REFINEMENT:
 * Takes the rough corner placements from the user, uses the region inside
 * as the "document model" and the region outside as "background model",
 * then snaps each corner along the radial vector to the exact paper boundary.
 */
export function refineCornersWithUserPrior(
  imgElement: HTMLImageElement | HTMLCanvasElement,
  roughCorners: DocumentCorners
): DocumentCorners {
  const naturalW = imgElement instanceof HTMLImageElement
    ? (imgElement.naturalWidth || imgElement.width)
    : imgElement.width;
  const naturalH = imgElement instanceof HTMLImageElement
    ? (imgElement.naturalHeight || imgElement.height)
    : imgElement.height;

  if (!naturalW || !naturalH) return roughCorners;

  const maxDim = 500;
  const scale = Math.min(1, maxDim / Math.max(naturalW, naturalH));
  const w = Math.max(80, Math.round(naturalW * scale));
  const h = Math.max(80, Math.round(naturalH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return roughCorners;

  ctx.drawImage(imgElement, 0, 0, w, h);
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // Center of user's quad
  const centerX = (roughCorners.topLeft.x + roughCorners.topRight.x + roughCorners.bottomRight.x + roughCorners.bottomLeft.x) / 4;
  const centerY = (roughCorners.topLeft.y + roughCorners.topRight.y + roughCorners.bottomRight.y + roughCorners.bottomLeft.y) / 4;

  // 1. Sample paper color inside each corner (inset by 15%)
  const cornersList: (keyof DocumentCorners)[] = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'];
  let paperR = 0, paperG = 0, paperB = 0;
  let paperCount = 0;

  for (const k of cornersList) {
    const pt = roughCorners[k];
    const inX = Math.round((centerX * 0.25 + pt.x * 0.75) * w);
    const inY = Math.round((centerY * 0.25 + pt.y * 0.75) * h);
    if (inX >= 0 && inX < w && inY >= 0 && inY < h) {
      const idx = (inY * w + inX) * 4;
      paperR += data[idx]; paperG += data[idx + 1]; paperB += data[idx + 2];
      paperCount++;
    }
  }
  paperR /= Math.max(1, paperCount);
  paperG /= Math.max(1, paperCount);
  paperB /= Math.max(1, paperCount);

  // 2. Sample background color outside each corner (outset by 8%)
  let bgR = 0, bgG = 0, bgB = 0;
  let bgCount = 0;

  for (const k of cornersList) {
    const pt = roughCorners[k];
    const outX = Math.min(w - 1, Math.max(0, Math.round((pt.x + (pt.x - centerX) * 0.15) * w)));
    const outY = Math.min(h - 1, Math.max(0, Math.round((pt.y + (pt.y - centerY) * 0.15) * h)));
    const idx = (outY * w + outX) * 4;
    bgR += data[idx]; bgG += data[idx + 1]; bgB += data[idx + 2];
    bgCount++;
  }
  bgR /= Math.max(1, bgCount);
  bgG /= Math.max(1, bgCount);
  bgB /= Math.max(1, bgCount);

  // 3. Snap each corner by searching along the radial ray from center through corner
  const snapCorner = (origPt: Point): Point => {
    const origPxX = origPt.x * w;
    const origPxY = origPt.y * h;
    const centerPxX = centerX * w;
    const centerPxY = centerY * h;

    const dirX = origPxX - centerPxX;
    const dirY = origPxY - centerPxY;
    const len = Math.hypot(dirX, dirY) || 1;
    const normX = dirX / len;
    const normY = dirY / len;

    // Search range: ±24px along the ray
    const searchSpan = 22;
    let bestX = origPxX;
    let bestY = origPxY;
    let maxTransition = -1;

    for (let offset = -searchSpan; offset <= searchSpan; offset++) {
      const sampleX = Math.round(origPxX + normX * offset);
      const sampleY = Math.round(origPxY + normY * offset);

      if (sampleX <= 2 || sampleX >= w - 3 || sampleY <= 2 || sampleY >= h - 3) continue;

      // Color transition between inner sample (towards center) and outer sample (away from center)
      const inX = Math.round(sampleX - normX * 3);
      const inY = Math.round(sampleY - normY * 3);
      const outX = Math.round(sampleX + normX * 3);
      const outY = Math.round(sampleY + normY * 3);

      const inIdx = (inY * w + inX) * 4;
      const outIdx = (outY * w + outX) * 4;

      const diffColor = Math.abs(data[inIdx] - data[outIdx]) +
                        Math.abs(data[inIdx + 1] - data[outIdx + 1]) +
                        Math.abs(data[inIdx + 2] - data[outIdx + 2]);

      // Agreement with paper on inside and background on outside
      const inPaperMatch = Math.hypot(data[inIdx] - paperR, data[inIdx + 1] - paperG, data[inIdx + 2] - paperB);
      const outBgMatch = Math.hypot(data[outIdx] - bgR, data[outIdx + 1] - bgG, data[outIdx + 2] - bgB);
      const modelAgreement = Math.max(0, 150 - (inPaperMatch + outBgMatch));

      // Distance penalty to anchor near user's pin
      const distWeight = Math.exp(-(offset * offset) / (2 * 12 * 12));

      const score = (diffColor * 1.6 + modelAgreement * 0.9) * distWeight;

      if (score > maxTransition) {
        maxTransition = score;
        bestX = sampleX;
        bestY = sampleY;
      }
    }

    return {
      x: Math.max(0.005, Math.min(0.995, Number((bestX / w).toFixed(4)))),
      y: Math.max(0.005, Math.min(0.995, Number((bestY / h).toFixed(4)))),
    };
  };

  return {
    topLeft: snapCorner(roughCorners.topLeft),
    topRight: snapCorner(roughCorners.topRight),
    bottomRight: snapCorner(roughCorners.bottomRight),
    bottomLeft: snapCorner(roughCorners.bottomLeft),
  };
}

/**
 * Propagates crop prior to another image in a batch
 */
export function propagateCropPriorToImage(
  targetImg: HTMLImageElement | HTMLCanvasElement,
  priorCorners: DocumentCorners
): HTMLCanvasElement {
  const refined = refineCornersWithUserPrior(targetImg, priorCorners);
  return warpAndCropDocument(targetImg, refined);
}

/**
 * Crops and perspective-unwarps a document from source image into a rectangular, straightened canvas.
 */
export function warpAndCropDocument(
  sourceImage: HTMLImageElement | HTMLCanvasElement,
  corners: DocumentCorners
): HTMLCanvasElement {
  const isImg = sourceImage instanceof HTMLImageElement;
  const srcW = isImg ? (sourceImage.naturalWidth || sourceImage.width) : sourceImage.width;
  const srcH = isImg ? (sourceImage.naturalHeight || sourceImage.height) : sourceImage.height;

  if (!srcW || !srcH) {
    throw new Error('Invalid image dimensions for crop');
  }

  // Convert normalized corner points to exact pixel coordinates
  const p0 = { x: corners.topLeft.x * srcW, y: corners.topLeft.y * srcH };
  const p1 = { x: corners.topRight.x * srcW, y: corners.topRight.y * srcH };
  const p2 = { x: corners.bottomRight.x * srcW, y: corners.bottomRight.y * srcH };
  const p3 = { x: corners.bottomLeft.x * srcW, y: corners.bottomLeft.y * srcH };

  // Calculate target width and height based on Euclidean distance
  const widthTop = Math.hypot(p1.x - p0.x, p1.y - p0.y);
  const widthBottom = Math.hypot(p2.x - p3.x, p2.y - p3.y);
  let targetW = Math.max(100, Math.round(Math.max(widthTop, widthBottom)));

  const heightLeft = Math.hypot(p3.x - p0.x, p3.y - p0.y);
  const heightRight = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  let targetH = Math.max(100, Math.round(Math.max(heightLeft, heightRight)));

  // Cap maximum dimension to 2400 to prevent browser memory exhaustion on mobile
  const maxDim = 2400;
  if (Math.max(targetW, targetH) > maxDim) {
    const scale = maxDim / Math.max(targetW, targetH);
    targetW = Math.round(targetW * scale);
    targetH = Math.round(targetH * scale);
  }

  // Check if corners form a nearly axis-aligned rectangle (< 3px tilt)
  const isRectangular =
    Math.abs(p0.y - p1.y) < 3 &&
    Math.abs(p3.y - p2.y) < 3 &&
    Math.abs(p0.x - p3.x) < 3 &&
    Math.abs(p1.x - p2.x) < 3;

  if (isRectangular) {
    // Fast path: direct hardware-accelerated 2D canvas clipping
    const sx = Math.max(0, Math.min(srcW - 1, Math.round(Math.min(p0.x, p3.x))));
    const sy = Math.max(0, Math.min(srcH - 1, Math.round(Math.min(p0.y, p1.y))));
    const sw = Math.max(10, Math.min(srcW - sx, Math.round(Math.max(widthTop, widthBottom))));
    const sh = Math.max(10, Math.min(srcH - sy, Math.round(Math.max(heightLeft, heightRight))));

    const dstCanvas = document.createElement('canvas');
    dstCanvas.width = targetW;
    dstCanvas.height = targetH;
    const dstCtx = dstCanvas.getContext('2d');
    if (!dstCtx) throw new Error('Could not get canvas context');
    dstCtx.drawImage(sourceImage, sx, sy, sw, sh, 0, 0, targetW, targetH);
    return dstCanvas;
  }

  // Perspective Homography Warping
  // Source canvas to read pixel data safely
  // If source image is larger than 2400px, bound the read canvas to save RAM
  let workW = srcW;
  let workH = srcH;
  let workScale = 1.0;
  if (Math.max(srcW, srcH) > 2400) {
    workScale = 2400 / Math.max(srcW, srcH);
    workW = Math.round(srcW * workScale);
    workH = Math.round(srcH * workScale);
  }

  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = workW;
  srcCanvas.height = workH;
  const srcCtx = srcCanvas.getContext('2d', { willReadFrequently: true });
  if (!srcCtx) throw new Error('Could not get 2D canvas context');
  srcCtx.drawImage(sourceImage, 0, 0, workW, workH);
  const srcImageData = srcCtx.getImageData(0, 0, workW, workH);
  const srcData = srcImageData.data;

  // Scale corner coordinates to work canvas
  const wp0 = { x: p0.x * workScale, y: p0.y * workScale };
  const wp1 = { x: p1.x * workScale, y: p1.y * workScale };
  const wp2 = { x: p2.x * workScale, y: p2.y * workScale };
  const wp3 = { x: p3.x * workScale, y: p3.y * workScale };

  // Destination canvas
  const dstCanvas = document.createElement('canvas');
  dstCanvas.width = targetW;
  dstCanvas.height = targetH;
  const dstCtx = dstCanvas.getContext('2d');
  if (!dstCtx) throw new Error('Could not get destination canvas context');
  const dstImageData = dstCtx.createImageData(targetW, targetH);
  const dstData = dstImageData.data;

  // Compute 3x3 Projective Homography Matrix H mapping destination (x, y) to work source (u, v)
  const H = getPerspectiveTransform(
    [
      { x: 0, y: 0 },
      { x: targetW, y: 0 },
      { x: targetW, y: targetH },
      { x: 0, y: targetH },
    ],
    [wp0, wp1, wp2, wp3]
  );

  // Bilinear interpolation mapping
  for (let y = 0; y < targetH; y++) {
    const h1y = H[1] * y + H[2];
    const h4y = H[4] * y + H[5];
    const h7y = H[7] * y + H[8];
    const rowDst = y * targetW * 4;

    for (let x = 0; x < targetW; x++) {
      const w = H[6] * x + h7y;
      const invW = 1 / (w || 1e-6);
      const u = (H[0] * x + h1y) * invW;
      const v = (H[3] * x + h4y) * invW;

      const u0 = Math.floor(u);
      const v0 = Math.floor(v);
      const dstIdx = rowDst + (x * 4);

      if (u0 >= 0 && u0 < workW - 1 && v0 >= 0 && v0 < workH - 1) {
        const uFrac = u - u0;
        const vFrac = v - v0;

        const idx00 = (v0 * workW + u0) * 4;
        const idx10 = (v0 * workW + (u0 + 1)) * 4;
        const idx01 = ((v0 + 1) * workW + u0) * 4;
        const idx11 = ((v0 + 1) * workW + (u0 + 1)) * 4;

        for (let c = 0; c < 3; c++) {
          const top = srcData[idx00 + c] * (1 - uFrac) + srcData[idx10 + c] * uFrac;
          const bottom = srcData[idx01 + c] * (1 - uFrac) + srcData[idx11 + c] * uFrac;
          dstData[dstIdx + c] = Math.round(top * (1 - vFrac) + bottom * vFrac);
        }
        dstData[dstIdx + 3] = 255;
      } else if (u0 >= 0 && u0 < workW && v0 >= 0 && v0 < workH) {
        const idx = (v0 * workW + u0) * 4;
        dstData[dstIdx] = srcData[idx];
        dstData[dstIdx + 1] = srcData[idx + 1];
        dstData[dstIdx + 2] = srcData[idx + 2];
        dstData[dstIdx + 3] = 255;
      } else {
        dstData[dstIdx] = 255;
        dstData[dstIdx + 1] = 255;
        dstData[dstIdx + 2] = 255;
        dstData[dstIdx + 3] = 255;
      }
    }
  }

  dstCtx.putImageData(dstImageData, 0, 0);
  return dstCanvas;
}

/**
 * Computes 3x3 Projective Transform matrix from 4 source points to 4 destination points
 */
function getPerspectiveTransform(src: { x: number; y: number }[], dst: { x: number; y: number }[]): number[] {
  const a: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i < 4; i++) {
    a.push([src[i].x, src[i].y, 1, 0, 0, 0, -src[i].x * dst[i].x, -src[i].y * dst[i].x]);
    b.push(dst[i].x);

    a.push([0, 0, 0, src[i].x, src[i].y, 1, -src[i].x * dst[i].y, -src[i].y * dst[i].y]);
    b.push(dst[i].y);
  }

  const h = solveLinearSystem(a, b);
  return [...h, 1];
}

function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = b.length;
  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) {
        maxRow = k;
      }
    }

    const tmpRow = A[i];
    A[i] = A[maxRow];
    A[maxRow] = tmpRow;

    const tmpB = b[i];
    b[i] = b[maxRow];
    b[maxRow] = tmpB;

    if (Math.abs(A[i][i]) < 1e-12) continue;

    for (let k = i + 1; k < n; k++) {
      const factor = A[k][i] / A[i][i];
      for (let j = i; j < n; j++) {
        A[k][j] -= factor * A[i][j];
      }
      b[k] -= factor * b[i];
    }
  }

  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = b[i];
    for (let j = i + 1; j < n; j++) {
      sum -= A[i][j] * x[j];
    }
    x[i] = Math.abs(A[i][i]) > 1e-12 ? sum / A[i][i] : 0;
  }
  return x;
}
