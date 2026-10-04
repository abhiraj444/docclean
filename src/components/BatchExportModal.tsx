/**
 * Batch Export Modal
 * Allows downloading all processed pages as:
 * 1. Multi-Page Clean PDF
 * 2. ZIP Archive of JPEG Images
 * 3. ZIP Archive of PNG Images
 * 4. Single page export
 */

import React, { useState } from 'react';
import { X, FileText, FileArchive, Download, CheckCircle2, RefreshCw, Cpu } from 'lucide-react';
import { DocumentPage, BatchProgress } from '../types/document';
import {
  exportAllPagesAsPdf,
  exportAllPagesAsZip,
  downloadBlob,
  loadImageElement,
} from '../utils/pdfHandler';
import { processDocumentImage } from '../utils/imageProcessor';
import { getOptimalConcurrency } from '../utils/concurrency';

interface BatchExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  pages: DocumentPage[];
  activePageIndex: number;
}

export const BatchExportModal: React.FC<BatchExportModalProps> = ({
  isOpen,
  onClose,
  pages,
  activePageIndex,
}) => {
  const [exportType, setExportType] = useState<'pdf' | 'zip_jpg' | 'zip_png' | 'single_jpg'>('pdf');
  const [docName, setDocName] = useState('cleaned_document');
  const [progress, setProgress] = useState<BatchProgress>({
    total: pages.length,
    current: 0,
    status: '',
    isExporting: false,
  });

  if (!isOpen) return null;

  const handleStartExport = async () => {
    setProgress({
      total: pages.length,
      current: 0,
      status: 'Initializing batch processor...',
      isExporting: true,
    });

    try {
      if (exportType === 'pdf') {
        const blob = await exportAllPagesAsPdf(pages, (current, total) => {
          setProgress({
            total,
            current,
            status: `Multi-core processing: page ${current} of ${total} vectorized...`,
            isExporting: true,
          });
        });
        downloadBlob(blob, `${docName || 'cleaned_document'}.pdf`);
      } else if (exportType === 'zip_jpg' || exportType === 'zip_png') {
        const format = exportType === 'zip_png' ? 'png' : 'jpeg';
        const blob = await exportAllPagesAsZip(pages, format, (current, total) => {
          setProgress({
            total,
            current,
            status: `Multi-core processing: image ${current} of ${total} compressed...`,
            isExporting: true,
          });
        });
        downloadBlob(blob, `${docName || 'cleaned_batch'}_images.zip`);
      } else if (exportType === 'single_jpg') {
        const activePage = pages[activePageIndex];
        if (activePage) {
          const img = await loadImageElement(activePage.sourceUrl);
          const { canvas } = await processDocumentImage(
            img,
            activePage.currentSettings,
            activePage.rotation
          );
          canvas.toBlob((blob) => {
            if (blob) {
              downloadBlob(blob, `${activePage.originalName || 'page'}_cleaned.jpg`);
            }
          }, 'image/jpeg', 0.95);
        }
      }

      setProgress((p) => ({ ...p, isExporting: false, status: 'Export completed!' }));
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      console.error('Export error:', err);
      setProgress((p) => ({
        ...p,
        isExporting: false,
        status: `Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs select-none">
      <div className="relative w-full max-w-lg rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl p-6 text-neutral-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Export Cleaned Document</h3>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Cpu className="w-3 h-3" />
                  <span>{getOptimalConcurrency()} Cores Active</span>
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Packaging {pages.length} {pages.length === 1 ? 'page' : 'pages'} with multi-threaded hardware acceleration
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={progress.isExporting}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="py-5 space-y-4">
          {/* Filename */}
          <div>
            <label className="text-xs font-semibold text-neutral-300 block mb-1">
              File Base Name
            </label>
            <input
              type="text"
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-800 border border-neutral-700 text-white focus:outline-hidden focus:border-indigo-500"
              placeholder="e.g. Cleaned_Contract_Batch"
            />
          </div>

          {/* Export Formats */}
          <div>
            <label className="text-xs font-semibold text-neutral-300 block mb-2">
              Select Output Format
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Option 1: Multi-Page PDF */}
              <div
                onClick={() => setExportType('pdf')}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  exportType === 'pdf'
                    ? 'bg-indigo-950/40 border-indigo-500 ring-1 ring-indigo-500'
                    : 'bg-neutral-800/60 border-neutral-700/60 hover:bg-neutral-800'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-semibold text-white">Multi-Page PDF</span>
                </div>
                <p className="text-[11px] text-neutral-400">
                  Combines all {pages.length} pages into a single print-ready PDF file.
                </p>
              </div>

              {/* Option 2: ZIP of JPEGs */}
              <div
                onClick={() => setExportType('zip_jpg')}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  exportType === 'zip_jpg'
                    ? 'bg-indigo-950/40 border-indigo-500 ring-1 ring-indigo-500'
                    : 'bg-neutral-800/60 border-neutral-700/60 hover:bg-neutral-800'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <FileArchive className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-white">ZIP Archive (JPEG)</span>
                </div>
                <p className="text-[11px] text-neutral-400">
                  Bundle all pages as high-quality individual .jpg image files.
                </p>
              </div>

              {/* Option 3: ZIP of PNGs */}
              <div
                onClick={() => setExportType('zip_png')}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  exportType === 'zip_png'
                    ? 'bg-indigo-950/40 border-indigo-500 ring-1 ring-indigo-500'
                    : 'bg-neutral-800/60 border-neutral-700/60 hover:bg-neutral-800'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <FileArchive className="w-4 h-4 text-teal-400" />
                  <span className="text-xs font-semibold text-white">ZIP Archive (PNG)</span>
                </div>
                <p className="text-[11px] text-neutral-400">
                  Lossless crisp PNG images for OCR and technical schematics.
                </p>
              </div>

              {/* Option 4: Current Page Only */}
              <div
                onClick={() => setExportType('single_jpg')}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  exportType === 'single_jpg'
                    ? 'bg-indigo-950/40 border-indigo-500 ring-1 ring-indigo-500'
                    : 'bg-neutral-800/60 border-neutral-700/60 hover:bg-neutral-800'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Download className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-semibold text-white">Current Page ({activePageIndex + 1})</span>
                </div>
                <p className="text-[11px] text-neutral-400">
                  Instantly download only the active page currently in view.
                </p>
              </div>
            </div>
          </div>

          {/* Progress Indicator */}
          {progress.isExporting && (
            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-300 font-medium flex items-center gap-2">
                  <RefreshCw className="w-3 h-3 text-indigo-400 animate-spin" />
                  <span>{progress.status}</span>
                </span>
                <span className="font-mono text-neutral-400 tabular-nums">
                  {progress.current} / {progress.total}
                </span>
              </div>
              <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 transition-all duration-200"
                  style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
          <button
            onClick={onClose}
            disabled={progress.isExporting}
            className="px-4 py-2 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors disabled:opacity-40"
          >
            Cancel
          </button>

          <button
            onClick={handleStartExport}
            disabled={progress.isExporting}
            className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm shadow-indigo-600/30 transition-colors disabled:opacity-40"
          >
            {progress.isExporting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>
              {exportType === 'pdf'
                ? 'Export Multi-Page PDF'
                : exportType === 'zip_jpg' || exportType === 'zip_png'
                ? 'Export ZIP Archive'
                : 'Download Current Page'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
