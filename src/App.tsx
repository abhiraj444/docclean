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

  // Apply Current Settings to ALL Pages in the Batch
  const handleApplySettingsToAll = async () => {
    if (!activePage || pages.length <= 1) return;

    const sourceSettings = { ...activePage.currentSettings };
    setIsBatchLoading(true);
    setBatchStatusMessage('Applying inverse settings to all pages...');

    const updatedPages = await Promise.all(
      pages.map(async (page) => {
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
      })
    );

    setPages(updatedPages);
    setIsBatchLoading(false);
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
    } catch (err) {
      console.error('Failed to load sample:', err);
    } finally {
      setIsBatchLoading(false);
    }
  };

  // Handle uploaded files (PDF or Images)
  const handleFilesSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;

    setIsBatchLoading(true);
    setBatchStatusMessage(`Processing ${files.length} file(s)...`);

    try {
      const newPages = await loadDocumentFiles(files, (msg) => {
        setBatchStatusMessage(msg);
      });

      if (newPages.length > 0) {
        setPages((prev) => [...prev, ...newPages]);
        setActivePageIndex(pages.length);
      }
    } catch (err) {
      console.error('File load error:', err);
      alert('Could not load files: ' + (err instanceof Error ? err.message : 'Unknown error'));
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

  // Handle Crop & Straighten with Learned User Prior & Batch Propagation
  const handleApplyCrop = async (
    croppedCanvas: HTMLCanvasElement,
    applyToAll: boolean,
    corners: DocumentCorners
  ) => {
    if (!activePage) return;

    if (applyToAll && pages.length > 1) {
      setIsBatchLoading(true);
      setBatchStatusMessage(`Propagating learned boundary crop across ${pages.length} pages...`);

      try {
        const updatedPages = await Promise.all(
          pages.map(async (p, idx) => {
            let canvas = croppedCanvas;
            if (idx !== activePageIndex) {
              const pageImg = await loadImageElement(p.sourceUrl);
              canvas = propagateCropPriorToImage(pageImg, corners);
            }

            const croppedUrl = canvas.toDataURL('image/jpeg', 0.95);
            const { metrics, reasons } = analyzeDocumentImage(canvas);
            const suggested = calculateRecommendedSettings(metrics);
            const candidates = generateCandidatePresets(metrics, suggested);

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
            };
          })
        );

        setPages(updatedPages);
      } catch (err) {
        console.error('Batch crop error:', err);
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs select-none">
          <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl flex flex-col items-center gap-3 max-w-sm text-center">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            <span className="text-sm font-semibold text-white">Processing Document</span>
            <p className="text-xs text-neutral-400">{batchStatusMessage}</p>
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
