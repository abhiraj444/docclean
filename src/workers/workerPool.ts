/**
 * Dedicated Worker Pool Manager
 * Manages background workers with automatic fallback to high-speed in-thread execution
 * if web workers are unavailable in sandboxed iframes.
 */

import { getUserConcurrency } from '../utils/concurrency';

interface PendingRequest {
  resolve: (value: Uint8ClampedArray) => void;
  reject: (reason?: any) => void;
}

class ImageWorkerPool {
  private workers: Worker[] = [];
  private pending = new Map<number, PendingRequest>();
  private reqId = 1;
  private isAvailable = false;
  private initialized = false;

  public init() {
    if (this.initialized) return;
    this.initialized = true;

    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      this.isAvailable = false;
      return;
    }

    try {
      const poolSize = getUserConcurrency();
      for (let i = 0; i < poolSize; i++) {
        const worker = new Worker(
          new URL('./imageWorker.ts', import.meta.url),
          { type: 'module' }
        );

        worker.onmessage = (e: MessageEvent) => {
          const { id, type, dstData, error } = e.data || {};
          const req = this.pending.get(id);
          if (!req) return;
          this.pending.delete(id);

          if (type === 'WARP_HOMOGRAPHY_SUCCESS') {
            req.resolve(dstData);
          } else {
            req.reject(new Error(error || 'Worker operation failed'));
          }
        };

        worker.onerror = () => {
          this.isAvailable = false;
        };

        this.workers.push(worker);
      }
      this.isAvailable = this.workers.length > 0;
    } catch (err) {
      console.warn('Web Worker pool initialization skipped; using high-speed in-thread fallback:', err);
      this.isAvailable = false;
    }
  }

  public async warpHomography(
    srcData: Uint8ClampedArray,
    workW: number,
    workH: number,
    targetW: number,
    targetH: number,
    H: number[]
  ): Promise<Uint8ClampedArray> {
    this.init();

    if (this.isAvailable && this.workers.length > 0) {
      const worker = this.workers[this.reqId % this.workers.length];
      const id = this.reqId++;

      try {
        return await new Promise<Uint8ClampedArray>((resolve, reject) => {
          this.pending.set(id, { resolve, reject });
          const clonedSrc = srcData.slice();
          worker.postMessage(
            {
              id,
              type: 'WARP_HOMOGRAPHY',
              payload: {
                srcData: clonedSrc,
                workW,
                workH,
                targetW,
                targetH,
                H,
              },
            },
            [clonedSrc.buffer]
          );
        });
      } catch (err) {
        console.warn('Worker homography failed, using in-thread execution:', err);
      }
    }

    return runInThreadWarp(srcData, workW, workH, targetW, targetH, H);
  }
}

export function runInThreadWarp(
  srcData: Uint8ClampedArray,
  workW: number,
  workH: number,
  targetW: number,
  targetH: number,
  H: number[]
): Uint8ClampedArray {
  const dstData = new Uint8ClampedArray(targetW * targetH * 4);

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
        const w00 = (1 - uFrac) * (1 - vFrac);
        const w10 = uFrac * (1 - vFrac);
        const w01 = (1 - uFrac) * vFrac;
        const w11 = uFrac * vFrac;

        const idx00 = (v0 * workW + u0) * 4;
        const idx10 = (v0 * workW + (u0 + 1)) * 4;
        const idx01 = ((v0 + 1) * workW + u0) * 4;
        const idx11 = ((v0 + 1) * workW + (u0 + 1)) * 4;

        dstData[dstIdx] = (srcData[idx00] * w00 + srcData[idx10] * w10 + srcData[idx01] * w01 + srcData[idx11] * w11 + 0.5) | 0;
        dstData[dstIdx + 1] = (srcData[idx00 + 1] * w00 + srcData[idx10 + 1] * w10 + srcData[idx01 + 1] * w01 + srcData[idx11 + 1] * w11 + 0.5) | 0;
        dstData[dstIdx + 2] = (srcData[idx00 + 2] * w00 + srcData[idx10 + 2] * w10 + srcData[idx01 + 2] * w01 + srcData[idx11 + 2] * w11 + 0.5) | 0;
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

  return dstData;
}

export const imageWorkerPool = new ImageWorkerPool();
