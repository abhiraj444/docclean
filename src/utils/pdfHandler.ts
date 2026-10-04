/**
 * Multi-Page PDF & Image Batch Handler
 * Handles high-speed multi-threaded PDF rasterization via PDF.js,
 * parallel document analysis, multi-core PDF packaging via jsPDF,
 * and concurrent ZIP packaging via JSZip.
 */

import * as pdfjsLib from 'pdfjs-dist';
import * as pdfWorkerModule from 'pdfjs-dist/build/pdf.worker.min.mjs';
import jsPDF from 'jspdf';
import JSZip from 'jszip';
import { DocumentPage, ProcessingSettings } from '../types/document';
import { analyzeDocumentImage } from './analyzer';
import { calculateRecommendedSettings, generateCandidatePresets } from './optimizer';
import { processDocumentImage } from './imageProcessor';
import { runConcurrentTasks, getUserConcurrency } from './concurrency';

// Configure fail-safe PDF.js worker:
// In Vite and iframe environments, dynamic worker script imports often fail due to CSP or cross-origin restrictions.
// By attaching WorkerMessageHandler directly to globalThis.pdfjsWorker, PDF.js can run in-memory without network calls!
if (typeof window !== 'undefined') {
  (globalThis as any).pdfjsWorker = pdfWorkerModule;

  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
  } catch (e) {
    console.warn('PDF.js worker URL registration note:', e);
  }
}

/**
 * Loads files (PDF or Images) and returns an array of DocumentPages using concurrent processing
 */
export async function loadDocumentFiles(
  files: File[],
  onProgress?: (msg: string, current: number, total: number) => void
): Promise<DocumentPage[]> {
  const pages: DocumentPage[] = [];

  for (let fileIdx = 0; fileIdx < files.length; fileIdx++) {
    const file = files[fileIdx];
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (isPdf) {
      if (onProgress) onProgress(`Reading PDF: ${file.name}...`, fileIdx + 1, files.length);
      const pdfPages = await loadPdfFile(file, onProgress);
      pages.push(...pdfPages);
    } else if (file.type.startsWith('image/')) {
      if (onProgress) onProgress(`Loading image: ${file.name}...`, fileIdx + 1, files.length);
      const page = await loadImageFile(file, pages.length + 1);
      pages.push(page);
    }
  }

  return pages;
}

/**
 * Loads multi-page PDF and rasterizes pages concurrently across multiple CPU threads
 */
async function loadPdfFile(
  file: File,
  onProgress?: (msg: string, current: number, total: number) => void
): Promise<DocumentPage[]> {
  const arrayBuffer = await file.arrayBuffer();

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    cMapPacked: true,
    useSystemFonts: true,
  });

  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;

  if (numPages === 0) {
    throw new Error('PDF file has no readable pages');
  }

  const concurrency = getUserConcurrency();
  if (onProgress) {
    onProgress(`Multithreaded rendering: starting ${numPages} pages across ${concurrency} CPU cores...`, 0, numPages);
  }

  const pageNumbers = Array.from({ length: numPages }, (_, i) => i + 1);

  // Render pages concurrently across hardware threads
  const pages = await runConcurrentTasks<number, DocumentPage>(
    pageNumbers,
    async (pageNum) => {
      const pdfPage = await pdf.getPage(pageNum);

      // Render at 2x viewport scale for crisp document quality
      const viewport = pdfPage.getViewport({ scale: 2.0 });
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error(`Unable to obtain 2D canvas context for page ${pageNum}`);
      }

      await pdfPage.render({
        canvasContext: ctx,
        viewport: viewport,
        canvas: canvas,
      }).promise;

      const sourceUrl = canvas.toDataURL('image/jpeg', 0.95);
      const { metrics, reasons } = analyzeDocumentImage(canvas);
      const suggestedSettings = calculateRecommendedSettings(metrics);
      const candidates = generateCandidatePresets(metrics, suggestedSettings);

      // Initial thumbnail
      const { dataUrl: processedThumbnailUrl } = await processDocumentImage(
        canvas,
        suggestedSettings,
        0,
        350
      );

      return {
        id: `pdf-${Date.now()}-${pageNum}-${Math.random().toString(36).substring(2, 7)}`,
        pageNumber: pageNum,
        originalName: `${file.name.replace(/\.pdf$/i, '')}_page_${pageNum}`,
        sourceUrl,
        width: canvas.width,
        height: canvas.height,
        rotation: 0,
        metrics,
        reasons,
        suggestedSettings,
        currentSettings: { ...suggestedSettings },
        candidates,
        processedThumbnailUrl,
      };
    },
    (completed, total) => {
      if (onProgress) {
        onProgress(`Multithreaded rendering: ${completed} of ${total} pages ready...`, completed, total);
      }
    },
    concurrency
  );

  return pages;
}

/**
 * Loads a single image file (JPG, PNG, WEBP, etc.)
 */
async function loadImageFile(file: File, pageNumber: number): Promise<DocumentPage> {
  const dataUrl = await fileToDataUrl(file);
  const img = await loadImageElement(dataUrl);

  const { metrics, reasons } = analyzeDocumentImage(img);
  const suggestedSettings = calculateRecommendedSettings(metrics);
  const candidates = generateCandidatePresets(metrics, suggestedSettings);

  const { dataUrl: processedThumbnailUrl } = await processDocumentImage(
    img,
    suggestedSettings,
    0,
    350
  );

  return {
    id: `img-${Date.now()}-${pageNumber}-${Math.random().toString(36).substring(2, 7)}`,
    pageNumber,
    originalName: file.name.replace(/\.[^/.]+$/, ''),
    sourceUrl: dataUrl,
    width: img.naturalWidth || img.width,
    height: img.naturalHeight || img.height,
    rotation: 0,
    metrics,
    reasons,
    suggestedSettings,
    currentSettings: { ...suggestedSettings },
    candidates,
    processedThumbnailUrl,
  };
}

/**
 * Creates a DocumentPage directly from an HTMLCanvasElement
 */
export async function createPageFromCanvas(
  canvas: HTMLCanvasElement,
  name: string,
  pageNumber: number
): Promise<DocumentPage> {
  const sourceUrl = canvas.toDataURL('image/jpeg', 0.95);
  const { metrics, reasons } = analyzeDocumentImage(canvas);
  const suggestedSettings = calculateRecommendedSettings(metrics);
  const candidates = generateCandidatePresets(metrics, suggestedSettings);

  const { dataUrl: processedThumbnailUrl } = await processDocumentImage(
    canvas,
    suggestedSettings,
    0,
    350
  );

  return {
    id: `sample-${Date.now()}-${pageNumber}`,
    pageNumber,
    originalName: name,
    sourceUrl,
    width: canvas.width,
    height: canvas.height,
    rotation: 0,
    metrics,
    reasons,
    suggestedSettings,
    currentSettings: { ...suggestedSettings },
    candidates,
    processedThumbnailUrl,
  };
}

/**
 * Export all pages into a unified, multi-page PDF document using multi-threaded page processing
 */
export async function exportAllPagesAsPdf(
  pages: DocumentPage[],
  onProgress?: (current: number, total: number) => void
): Promise<Blob> {
  const concurrency = getUserConcurrency();

  // Multithreaded parallel processing of all high-res canvases
  const processedPages = await runConcurrentTasks(
    pages,
    async (page) => {
      const img = await loadImageElement(page.sourceUrl);
      const { canvas } = await processDocumentImage(
        img,
        page.currentSettings,
        page.rotation
      );
      const isLandscape = canvas.width > canvas.height;
      return {
        width: canvas.width,
        height: canvas.height,
        orientation: isLandscape ? ('l' as const) : ('p' as const),
        imgData: canvas.toDataURL('image/jpeg', 0.92),
      };
    },
    (completed, total) => {
      if (onProgress) onProgress(completed, total);
    },
    concurrency
  );

  // Fast linear assembly into jsPDF
  let doc: jsPDF | null = null;
  for (let i = 0; i < processedPages.length; i++) {
    const item = processedPages[i];
    const pdfW = item.width * 0.75;
    const pdfH = item.height * 0.75;

    if (i === 0) {
      doc = new jsPDF({
        orientation: item.orientation,
        unit: 'pt',
        format: [pdfW, pdfH],
      });
    } else {
      doc!.addPage([pdfW, pdfH], item.orientation);
    }

    doc!.addImage(item.imgData, 'JPEG', 0, 0, pdfW, pdfH);
  }

  return doc ? doc.output('blob') : new Blob([]);
}

/**
 * Export all pages as individual images inside a ZIP archive using multi-threaded page processing
 */
export async function exportAllPagesAsZip(
  pages: DocumentPage[],
  format: 'jpeg' | 'png' = 'jpeg',
  onProgress?: (current: number, total: number) => void
): Promise<Blob> {
  const zip = new JSZip();
  const folder = zip.folder('cleaned_documents') || zip;
  const mime = format === 'png' ? 'image/png' : 'image/jpeg';
  const ext = format === 'png' ? 'png' : 'jpg';
  const quality = format === 'png' ? undefined : 0.94;
  const concurrency = getUserConcurrency();

  const processedItems = await runConcurrentTasks(
    pages,
    async (page, index) => {
      const img = await loadImageElement(page.sourceUrl);
      const { canvas } = await processDocumentImage(
        img,
        page.currentSettings,
        page.rotation
      );

      const dataUrl = canvas.toDataURL(mime, quality);
      const base64Data = dataUrl.split(',')[1];
      const fileName = `${String(index + 1).padStart(2, '0')}_${page.originalName || 'page'}.${ext}`;

      return { fileName, base64Data };
    },
    (completed, total) => {
      if (onProgress) onProgress(completed, total);
    },
    concurrency
  );

  for (const item of processedItems) {
    folder.file(item.fileName, item.base64Data, { base64: true });
  }

  return await zip.generateAsync({ type: 'blob' });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Only set crossOrigin for external http(s) URLs; data: and blob: URLs will error in some browsers with crossOrigin
    if (url.startsWith('http://') || url.startsWith('https://')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () => {
      // If failed with crossOrigin, retry once without crossOrigin
      if (img.crossOrigin) {
        const retryImg = new Image();
        retryImg.onload = () => resolve(retryImg);
        retryImg.onerror = reject;
        retryImg.src = url;
      } else {
        reject(new Error('Failed to load image element'));
      }
    };
    img.src = url;
  });
}
