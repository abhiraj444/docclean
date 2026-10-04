/**
 * DocClean Inverse Optimizer & Batch Restorer
 * Main Application Hub
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DocumentPage, ProcessingSettings } from './types/document';
import { Header } from './components/Header';
import { ComparisonViewer } from './components/ComparisonViewer';
import { BottomControls } from './components/BottomControls';
import { BatchExportModal } from './components/BatchExportModal';
import { UploadDropzone } from './components/UploadDropzone';
import { CropModal } from './components/CropModal';
import { SampleDocMeta } from './utils/sampleDocuments';
import { createPageFromCanvas, loadDocumentFiles, loadImageElement } from './utils/pdfHandler';
import { processDocumentImage } from './utils/imageProcessor';
import { calculateRecommendedSettings, generateCandidatePresets } from './utils/optimizer';
import { analyzeDocumentImage } from './utils/analyzer';
import { DocumentCorners, propagateCropPriorToImage } from './utils/cropDetector';
import {
  runConcurrentTasks,
  getOptimalConcurrency,
  getUserConcurrency,
  setUserConcurrency,
  getSystemCores,
} from './utils/concurrency';
import { Cpu, AlertCircle, CheckCircle, Info, X } from 'lucide-react';

export default function App() {
  // Empty by default - shows only clean upload screen at first!
  const [pages, setPages] = useState<DocumentPage[]>([]);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  const [currentInkCoverage, setCurrentInkCoverage] = useState<number>(10);
  const [isProcessingCanvas, setIsProcessingCanvas] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isCropModalOpen, setIsCropModalOpen] = useState<boolean>(false);
  const [isBatchLoading, setIsBatchLoading] = useState<boolean>(false);
  const [batchStatusMessage, setBatchStatusMessage] = useState<string>('');

  // Active parameter feedback HUD shown on the preview when dragging sliders
  const [activeParamHUD, setActiveParamHUD] = useState<{ name: string; value: string } | null>(null);

  // In-app notification toast (non-blocking, iframe-safe)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((curr) => (curr?.message === message ? null : curr));
    }, 4500);
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const renderTimeoutRef = useRef<number | null>(null);

  const activePage = pages[activePageIndex];

  // Update processed image whenever active page settings change
  const updateProcessedImage = useCallback(async (page: DocumentPage) => {
    if (!page) return;
    setIsProcessingCanvas(true);

    try {
      const img = await loadImageElement(page.sourceUrl);
      const { dataUrl, inkCoverage } = await processDocumentImage(
        img,
        page.currentSettings,
        page.rotation,
        1400
      );

      setProcessedImageUrl(dataUrl);
      setCurrentInkCoverage(inkCoverage);
    } catch (err) {
      console.error('Failed to process document:', err);
    } finally {
      setIsProcessingCanvas(false);
    }
  }, []);

  // Debounced real-time canvas processing
  useEffect(() => {
    if (!activePage) return;

    if (renderTimeoutRef.current) {
      window.clearTimeout(renderTimeoutRef.current);
    }

    renderTimeoutRef.current = window.setTimeout(() => {
      updateProcessedImage(activePage);
    }, 30);

    return () => {
      if (renderTimeoutRef.current) {
        window.clearTimeout(renderTimeoutRef.current);
      }
    };
  }, [activePage, updateProcessedImage]);

  // Handle setting updates
  const handleSettingsChange = (newSettings: ProcessingSettings) => {
    if (!activePage) return;
    setPages((prevPages) =>
      prevPages.map((p, idx) => (idx === activePageIndex ? { ...p, currentSettings: newSettings } : p))
    );
  };

  // Reset active page to default
  const handleResetSettings = () => {
    if (!activePage) return;
    const defaultSettings: ProcessingSettings = {
      exposure: 0,
      gamma: 1.0,
      contrast: 1.0,
      blackPoint: 15,
      whitePoint: 240,
      saturation: 1.0,
      colorTemp: 0,
      illuminationCorrection: 0,
      adaptiveThreshold: 0,
      sharpen: 0,
      denoise: 0,
      deskew: 0,
      inversionMode: 'none',
      inkSaverStrength: 50,
      preserveSignatures: true,
    };
    handleSettingsChange(defaultSettings);
  };

  // Re-run auto optimizer
  const handleReAutoOptimize = () => {
    if (!activePage) return;
    const recommended = calculateRecommendedSettings(activePage.metrics);
    handleSettingsChange(recommended);
  };

  // Apply Current Settings to ALL Pages in the Batch concurrently
  const handleApplySettingsToAll = async () => {
    if (!activePage || pages.length <= 1) return;

    const sourceSettings = { ...activePage.currentSettings };
    setIsBatchLoading(true);
    const concurrency = getUserConcurrency();
    setBatchStatusMessage(`Applying settings to ${pages.length} pages in parallel (${concurrency} cores)...`);

    try {
      const updatedPages = await runConcurrentTasks(
        pages,
        async (page) => {
          const img = await loadImageElement(page.sourceUrl);
          const { dataUrl: processedThumbnailUrl } = await processDocumentImage(
            img,
            sourceSettings,
            page.rotation,
            350
          );

          return {
            ...page,
            currentSettings: { ...sourceSettings },
            processedThumbnailUrl,
          };
        },
        (completed, total) => {
          setBatchStatusMessage(`Applying inverse settings (${completed}/${total} pages ready)...`);
        },
        concurrency
      );

      setPages(updatedPages);
      showNotification(`Applied settings across all ${pages.length} pages`, 'success');
    } catch (err) {
      console.error('Batch settings apply error:', err);
      showNotification('Failed to apply settings to all pages', 'error');
    } finally {
      setIsBatchLoading(false);
    }
  };

  // Load a Test Sample Document
  const handleLoadSample = async (sample: SampleDocMeta) => {
    setIsBatchLoading(true);
    setBatchStatusMessage(`Loading sample: ${sample.name}...`);

    try {
      const canvas = sample.generate();
      const newPage = await createPageFromCanvas(canvas, sample.name, 1);
      setPages([newPage]);
      setActivePageIndex(0);
      showNotification(`Loaded ${sample.name}`, 'info');
    } catch (err) {
      console.error('Failed to load sample:', err);
      showNotification('Failed to load sample document', 'error');
    } finally {
      setIsBatchLoading(false);
    }
  };

  // Handle uploaded files (PDF or Images) with parallel processing
  const handleFilesSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;

    setIsBatchLoading(true);
    setBatchStatusMessage(`Processing ${files.length} file(s) with multi-core acceleration...`);

    try {
      const newPages = await loadDocumentFiles(files, (msg) => {
        setBatchStatusMessage(msg);
      });

      if (newPages.length > 0) {
        setPages((prev) => [...prev, ...newPages]);
        setActivePageIndex(pages.length);
        showNotification(`Loaded ${newPages.length} page(s) successfully`, 'success');
      } else {
        showNotification('No readable pages found in selected file(s)', 'error');
      }
    } catch (err) {
      console.error('File load error:', err);
      showNotification(
        `Failed to open file: ${err instanceof Error ? err.message : 'Unknown error'}`,
        'error'
      );
    } finally {
      setIsBatchLoading(false);
    }
  };

  // Slider interaction callback to blur/hide bottom controls during adjustment
  const handleSliderDragStateChange = (
    isDragging: boolean,
    activeParamName?: string,
    activeParamValue?: string
  ) => {
    if (isDragging && activeParamName && activeParamValue) {
      setActiveParamHUD({ name: activeParamName, value: activeParamValue });
    } else {
      setActiveParamHUD(null);
    }
  };

  // Handle Crop & Straighten with Learned User Prior & Multi-Threaded Batch Propagation
  const handleApplyCrop = async (
    croppedCanvas: HTMLCanvasElement,
    applyToAll: boolean,
    corners: DocumentCorners
  ) => {
    if (!activePage) return;

    if (applyToAll && pages.length > 1) {
      setIsBatchLoading(true);
      const concurrency = getUserConcurrency();
      setBatchStatusMessage(`Straightening & cropping ${pages.length} pages in parallel (${concurrency} cores)...`);

      try {
        const updatedPages = await runConcurrentTasks(
          pages,
          async (p, idx) => {
            let canvas = croppedCanvas;
            if (idx !== activePageIndex) {
              const pageImg = await loadImageElement(p.sourceUrl);
              canvas = await propagateCropPriorToImage(pageImg, corners);
            }

            const croppedUrl = canvas.toDataURL('image/jpeg', 0.95);
            const { metrics, reasons } = analyzeDocumentImage(canvas);
            const suggested = calculateRecommendedSettings(metrics);
            const candidates = generateCandidatePresets(metrics, suggested);

            // Thumbnail
            const { dataUrl: processedThumbnailUrl } = await processDocumentImage(
              canvas,
              suggested,
              0,
              350
            );

            return {
              ...p,
              sourceUrl: croppedUrl,
              width: canvas.width,
              height: canvas.height,
              rotation: 0,
              metrics,
              reasons,
              suggestedSettings: suggested,
              currentSettings: { ...suggested },
              candidates,
              processedThumbnailUrl,
            };
          },
          (completed, total) => {
            setBatchStatusMessage(`Straightened & cropped ${completed}/${total} pages...`);
          },
          concurrency
        );

        setPages(updatedPages);
        if (updatedPages[activePageIndex]) {
          setProcessedImageUrl(updatedPages[activePageIndex].sourceUrl);
        }
        showNotification(`Propagated learned crop to all ${pages.length} pages`, 'success');
      } catch (err) {
        console.error('Batch crop error:', err);
        showNotification('Failed to complete batch crop operation', 'error');
      } finally {
        setIsBatchLoading(false);
      }
    } else {
      const croppedUrl = croppedCanvas.toDataURL('image/jpeg', 0.95);
      const { metrics, reasons } = analyzeDocumentImage(croppedCanvas);
      const suggested = calculateRecommendedSettings(metrics);
      const candidates = generateCandidatePresets(metrics, suggested);

      // Immediately sync preview image to avoid showing old uncropped layer
      setProcessedImageUrl(croppedUrl);

      setPages((prev) =>
        prev.map((p, idx) =>
          idx === activePageIndex
            ? {
                ...p,
                sourceUrl: croppedUrl,
                width: croppedCanvas.width,
                height: croppedCanvas.height,
                rotation: 0,
                metrics,
                reasons,
                suggestedSettings: suggested,
                currentSettings: { ...suggested },
                candidates,
              }
            : p
        )
      );
      showNotification('Page cropped and straightened', 'success');
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-neutral-950 font-sans">
      {/* Hidden file input for adding pages */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,image/jpeg,image/png,image/webp"
        onChange={(e) => {
          if (e.target.files) {
            handleFilesSelected(Array.from(e.target.files));
          }
        }}
        className="hidden"
      />

      {/* Top Header */}
      <Header
        totalPages={pages.length}
        activePageIndex={activePageIndex}
        onPrevPage={() => setActivePageIndex((i) => Math.max(0, i - 1))}
        onNextPage={() => setActivePageIndex((i) => Math.min(pages.length - 1, i + 1))}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onTriggerUpload={() => fileInputRef.current?.click()}
        onClearAll={() => {
          setPages([]);
          setActivePageIndex(0);
          setProcessedImageUrl(null);
        }}
        isProcessingBatch={isBatchLoading}
      />

      {/* Screen 1: Clean Upload Screen (If no document uploaded yet) */}
      {pages.length === 0 ? (
        <UploadDropzone
          onFilesSelected={handleFilesSelected}
          onLoadSample={handleLoadSample}
          isProcessing={isBatchLoading}
        />
      ) : (
        /* Screen 2: Clean Document Workspace */
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Main Frame: ~75% of viewport height dedicated to document preview */}
          <div className="flex-1 min-h-0 overflow-hidden relative">
            {activePage && (
              <ComparisonViewer
                page={activePage}
                processedImageUrl={processedImageUrl}
                inkCoverage={currentInkCoverage}
                isProcessing={isProcessingCanvas}
                activeParamHUD={activeParamHUD}
                onOpenCropModal={() => setIsCropModalOpen(true)}
              />
            )}
          </div>

          {/* Bottom Bar: Elegant parameters drawer that blurs/fades when adjusting */}
          {activePage && (
            <div className="shrink-0">
              <BottomControls
                settings={activePage.currentSettings}
                onChange={handleSettingsChange}
                onReset={handleResetSettings}
                onAutoOptimize={handleReAutoOptimize}
                onApplyToAllPages={handleApplySettingsToAll}
                onOpenCropModal={() => setIsCropModalOpen(true)}
                totalPages={pages.length}
                onSliderDragStateChange={handleSliderDragStateChange}
              />
            </div>
          )}
        </div>
      )}

      {/* Batch Processing Overlay */}
      {isBatchLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs select-none">
          <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl flex flex-col items-center gap-3.5 max-w-sm text-center">
            <div className="relative flex items-center justify-center">
              <div className="w-10 h-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
              <Cpu className="w-4 h-4 text-indigo-400 absolute" />
            </div>
            <div>
              <span className="text-sm font-semibold text-white block">Multi-Core Processing</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-400/90 mt-0.5">
                <span>Parallel Acceleration Active</span>
              </span>
            </div>
            <p className="text-xs text-neutral-300 bg-neutral-950 px-3 py-1.5 rounded-lg border border-neutral-800/80 max-w-xs">
              {batchStatusMessage}
            </p>
          </div>
        </div>
      )}

      {/* Floating Notification Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 max-w-md animate-in fade-in slide-in-from-top-2 duration-200">
          <div
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border shadow-xl text-xs font-medium backdrop-blur-md ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
                : toast.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/40 text-rose-200'
                : 'bg-neutral-900/90 border-neutral-700/60 text-neutral-200'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-indigo-400 shrink-0" />
            )}
            <span className="flex-1">{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="p-1 text-neutral-400 hover:text-white rounded-md transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Export Clean Document Modal */}
      <BatchExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        pages={pages}
        activePageIndex={activePageIndex}
      />

      {/* Crop & Straighten Modal */}
      {activePage && (
        <CropModal
          isOpen={isCropModalOpen}
          onClose={() => setIsCropModalOpen(false)}
          sourceImageUrl={activePage.sourceUrl}
          totalPages={pages.length}
          onApplyCrop={handleApplyCrop}
        />
      )}
    </div>
  );
}
