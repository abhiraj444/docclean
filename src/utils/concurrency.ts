/**
 * Multi-Threaded & Concurrent Task Execution Engine
 * Dynamically scales concurrency across CPU cores (navigator.hardwareConcurrency)
 * to process high-resolution PDF pages, batch crops, and document restorations
 * in parallel without locking the browser UI.
 */

const STORAGE_KEY = 'docclean_thread_concurrency';

export function getSystemCores(): number {
  if (typeof navigator === 'undefined' || !navigator.hardwareConcurrency) {
    return 8;
  }
  return navigator.hardwareConcurrency;
}

export function getUserConcurrency(): number {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const val = parseInt(saved, 10);
      if (!isNaN(val) && val >= 1 && val <= 32) {
        return val;
      }
    }
  }
  // Default: Use available hardware cores (capped at 12 for safe GPU memory allocation)
  return getOptimalConcurrency(12);
}

export function setUserConcurrency(threads: number): void {
  if (typeof window !== 'undefined') {
    const safeThreads = Math.max(1, Math.min(32, threads));
    localStorage.setItem(STORAGE_KEY, String(safeThreads));
  }
}

export function getOptimalConcurrency(maxLimit: number = 12): number {
  const cores = getSystemCores();
  // Safe default: use hardware cores up to maxLimit, leaving 1 core for UI if high core count
  const optimal = cores > 4 ? cores - 1 : cores;
  return Math.min(Math.max(2, optimal), maxLimit);
}

/**
 * Yield control to the browser event loop to maintain 60fps responsiveness
 */
export function yieldToMain(): Promise<void> {
  if (typeof (globalThis as any).scheduler?.yield === 'function') {
    return (globalThis as any).scheduler.yield();
  }
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Executes async tasks concurrently up to concurrencyLimit, preserving exact order
 */
export async function runConcurrentTasks<T, R>(
  items: T[],
  taskFn: (item: T, index: number) => Promise<R>,
  onProgress?: (completed: number, total: number, lastResult?: R) => void,
  concurrencyLimit?: number
): Promise<R[]> {
  const total = items.length;
  if (total === 0) return [];

  const limit = Math.min(concurrencyLimit || getUserConcurrency(), total);
  const results: R[] = new Array(total);
  let nextIndex = 0;
  let completedCount = 0;

  const workers = Array.from({ length: limit }, async () => {
    while (true) {
      const idx = nextIndex++;
      if (idx >= total) break;

      const item = items[idx];
      const result = await taskFn(item, idx);
      results[idx] = result;
      completedCount++;

      if (onProgress) {
        onProgress(completedCount, total, result);
      }

      // Small yield to let animations and layout breathe
      await yieldToMain();
    }
  });

  await Promise.all(workers);
  return results;
}
