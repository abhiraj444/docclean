/**
 * Multi-Page PDF & Image Batch Handler
 * Handles PDF rendering via PDF.js, image conversions,
 * multi-page PDF generation via jsPDF, and ZIP packaging via JSZip.
 */

import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import jsPDF from 'jspdf';
import JSZip from 'jszip';
import { DocumentPage, ProcessingSettings } from '../types/document';
import { analyzeDocumentImage } from './analyzer';
import { calculateRecommendedSettings, generateCandidatePresets } from './optimizer';
import { processDocumentImage } from './imageProcessor';

// Configure local PDF.js worker without external CDN dependencies
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
}

/**
 * Loads a file (PDF or Image) and returns an array of DocumentPages
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
      if (onProgress) onProgress(`Parsing PDF: ${file.name}...`, fileIdx + 1, files.length);
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
 * Loads multi-page PDF and rasterizes each page to high-res canvas
 */
async function loadPdfFile(
  file: File,
  onProgress?: (msg: string, current: number, total: number) => void
): Promise<DocumentPage[]> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
  });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const pages: DocumentPage[] = [];

  for (let i = 1; i <= numPages; i++) {
    if (onProgress) onProgress(`Rendering PDF page ${i} of ${numPages}...`, i, numPages);
    const pdfPage = await pdf.getPage(i);

    // Render at 2x viewport scale for crisp document quality
    const viewport = pdfPage.getViewport({ scale: 2.0 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) continue;

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

    pages.push({
      id: `pdf-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`,
      pageNumber: i,
      originalName: `${file.name.replace(/\.pdf$/i, '')}_page_${i}`,
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
    });
  }

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
 * Export all pages into a unified, multi-page PDF document
 */
export async function exportAllPagesAsPdf(
  pages: DocumentPage[],
  onProgress?: (current: number, total: number) => void
): Promise<Blob> {
  let doc: jsPDF | null = null;

  for (let i = 0; i < pages.length; i++) {
    if (onProgress) onProgress(i + 1, pages.length);
    const page = pages[i];
    const img = await loadImageElement(page.sourceUrl);

    // Full-resolution processed canvas
    const { canvas } = await processDocumentImage(
      img,
      page.currentSettings,
      page.rotation
    );

    const isLandscape = canvas.width > canvas.height;
    const orientation = isLandscape ? 'l' : 'p';

    // Standard A4 aspect mapping or fit
    if (i === 0) {
      doc = new jsPDF({
        orientation,
        unit: 'pt',
        format: [canvas.width * 0.75, canvas.height * 0.75],
      });
    } else {
      doc!.addPage([canvas.width * 0.75, canvas.height * 0.75], orientation);
    }

    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    doc!.addImage(imgData, 'JPEG', 0, 0, canvas.width * 0.75, canvas.height * 0.75);
  }

  return doc ? doc.output('blob') : new Blob([]);
}

/**
 * Export all pages as individual JPEG images inside a ZIP archive
 */
export async function exportAllPagesAsZip(
  pages: DocumentPage[],
  format: 'jpeg' | 'png' = 'jpeg',
  onProgress?: (current: number, total: number) => void
): Promise<Blob> {
  const zip = new JSZip();
  const folder = zip.folder('cleaned_documents') || zip;

  for (let i = 0; i < pages.length; i++) {
    if (onProgress) onProgress(i + 1, pages.length);
    const page = pages[i];
    const img = await loadImageElement(page.sourceUrl);

    const { canvas } = await processDocumentImage(
      img,
      page.currentSettings,
      page.rotation
    );

    const mime = format === 'png' ? 'image/png' : 'image/jpeg';
    const ext = format === 'png' ? 'png' : 'jpg';
    const quality = format === 'png' ? undefined : 0.94;
    const dataUrl = canvas.toDataURL(mime, quality);

    // Strip base64 prefix
    const base64Data = dataUrl.split(',')[1];
    const fileName = `${String(i + 1).padStart(2, '0')}_${page.originalName || 'page'}.${ext}`;

    folder.file(fileName, base64Data, { base64: true });
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
