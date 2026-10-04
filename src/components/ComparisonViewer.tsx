/**
 * Main Document Frame Preview
 * Covers the screen, responsive, with Split Slider, Hold-to-Compare,
 * Crop trigger, and live parameter adjustment HUD.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SplitSquareVertical, Eye, ZoomIn, ZoomOut, Maximize2, Sparkles, Crop } from 'lucide-react';
import { DocumentPage } from '../types/document';

interface ComparisonViewerProps {
  page: DocumentPage;
  processedImageUrl: string | null;
  inkCoverage: number;
  isProcessing: boolean;
  activeParamHUD?: { name: string; value: string } | null;
  onOpenCropModal?: () => void;
}

export const ComparisonViewer: React.FC<ComparisonViewerProps> = ({
  page,
  processedImageUrl,
  inkCoverage,
  isProcessing,
  activeParamHUD,
  onOpenCropModal,
}) => {
  const [viewMode, setViewMode] = useState<'split' | 'cleaned' | 'toggle'>('split');
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);
  const [isHoldingOriginal, setIsHoldingOriginal] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1.0);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageBoxRef = useRef<HTMLDivElement>(null);

  // Handle slider drag
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingSlider || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percent = Math.max(2, Math.min(98, (x / rect.width) * 100));
    setSliderPosition(percent);
  }, [isDraggingSlider]);

  const handleMouseUp = useCallback(() => {
    setIsDraggingSlider(false);
  }, []);

  useEffect(() => {
    if (isDraggingSlider) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingSlider, handleMouseMove, handleMouseUp]);

  // Touch support for slider
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!containerRef.current) return;
    const touch = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(touch.clientX - rect.left, rect.width));
    const percent = Math.max(2, Math.min(98, (x / rect.width) * 100));
    setSliderPosition(percent);
  };

  const originalInk = page.metrics.estimatedInkCoverage;
  const inkSavedPercent =
    originalInk > 0 ? Math.max(0, Math.round(((originalInk - inkCoverage) / originalInk) * 100)) : 0;

  return (
    <div className="flex flex-col h-full w-full bg-neutral-950 text-neutral-100 select-none overflow-hidden relative">
      {/* Top Preview Controls Bar */}
      <div className="shrink-0 flex items-center justify-between px-3 sm:px-6 py-2 bg-neutral-900/60 border-b border-neutral-800/80 z-20">
        {/* Mode Selector */}
        <div className="flex items-center gap-1 p-0.5 bg-neutral-800/80 rounded-lg border border-neutral-700/60">
          <button
            onClick={() => setViewMode('split')}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              viewMode === 'split' ? 'bg-neutral-900 text-white shadow-xs' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <SplitSquareVertical className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Before / After</span>
            <span className="sm:hidden">Split</span>
          </button>

          <button
            onClick={() => setViewMode('cleaned')}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              viewMode === 'cleaned' ? 'bg-neutral-900 text-white shadow-xs' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Clean</span>
          </button>

          <button
            onClick={() => setViewMode('toggle')}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              viewMode === 'toggle' ? 'bg-neutral-900 text-white shadow-xs' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Hold Original</span>
            <span className="sm:hidden">Hold</span>
          </button>
        </div>

        {/* Ink Saved Readout & Crop Action */}
        <div className="flex items-center gap-2">
          {onOpenCropModal && (
            <button
              onClick={onOpenCropModal}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-neutral-800/90 hover:bg-neutral-700 border border-neutral-700/80 text-xs font-medium text-neutral-200 hover:text-white transition-colors"
              title="Crop & straighten document edges"
            >
              <Crop className="w-3.5 h-3.5 text-indigo-400" />
              <span>Crop & Straighten</span>
            </button>
          )}

          <div className="hidden sm:flex items-center gap-2 text-xs text-neutral-400 font-mono">
            <span>Toner: {inkCoverage}%</span>
            {inkSavedPercent > 0 && (
              <span className="text-emerald-400 font-medium">({inkSavedPercent}% saved)</span>
            )}
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoomLevel((z) => Math.max(0.6, Number((z - 0.15).toFixed(2))))}
            className="p-1 text-neutral-400 hover:text-white bg-neutral-800/70 hover:bg-neutral-750 border border-neutral-700/60 rounded-md transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <span className="text-[11px] font-mono tabular-nums text-neutral-400 min-w-[34px] text-center">
            {Math.round(zoomLevel * 100)}%
          </span>

          <button
            onClick={() => setZoomLevel((z) => Math.min(2.5, Number((z + 0.15).toFixed(2))))}
            className="p-1 text-neutral-400 hover:text-white bg-neutral-800/70 hover:bg-neutral-750 border border-neutral-700/60 rounded-md transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setZoomLevel(1.0)}
            className="p-1 text-neutral-400 hover:text-white bg-neutral-800/70 hover:bg-neutral-750 border border-neutral-700/60 rounded-md transition-colors"
            title="Fit to Screen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Live Parameter Adjustment HUD (Floats clearly at top when adjusting slider) */}
      {activeParamHUD && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-40 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-neutral-900/95 border border-indigo-500 shadow-2xl backdrop-blur-md text-xs">
            <span className="font-semibold text-white">{activeParamHUD.name}:</span>
            <span className="font-mono text-indigo-300 font-bold tabular-nums bg-indigo-950/90 px-2 py-0.5 rounded-full border border-indigo-800/80">
              {activeParamHUD.value}
            </span>
          </div>
        </div>
      )}

      {/* Main Full-Size Document Preview Viewport */}
      <div className="flex-1 w-full h-full min-h-0 overflow-auto p-2 sm:p-4 flex items-center justify-center bg-radial from-neutral-900/80 via-neutral-950 to-neutral-950 relative">
        {/* Computing indicator */}
        {isProcessing && (
          <div className="absolute top-3 right-3 z-30 flex items-center gap-2 px-2.5 py-1 rounded-full bg-neutral-900/90 border border-neutral-700 text-[11px] text-neutral-300 shadow-lg">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
            <span>Processing...</span>
          </div>
        )}

        {/* 1. Split Slider View */}
        {viewMode === 'split' && (
          <div
            ref={containerRef}
            className="relative inline-block max-w-full max-h-full shadow-2xl rounded-lg overflow-hidden border border-neutral-800/80 bg-neutral-900/60"
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'center center',
              transition: 'transform 0.12s ease-out',
            }}
          >
            <div ref={imageBoxRef} className="relative cursor-ew-resize select-none">
              {/* Cleaned Layer */}
              <img
                src={processedImageUrl || page.sourceUrl}
                alt="Cleaned Document"
                className="block max-h-[72vh] sm:max-h-[78vh] w-auto max-w-[94vw] object-contain pointer-events-none"
              />

              {/* Original Layer */}
              <div
                className="absolute inset-0 overflow-hidden pointer-events-none"
                style={{ width: `${sliderPosition}%` }}
              >
                <img
                  src={page.sourceUrl}
                  alt="Original Document"
                  className="block pointer-events-none object-fill"
                  style={{
                    width: imageBoxRef.current ? `${imageBoxRef.current.clientWidth}px` : '100%',
                    height: imageBoxRef.current ? `${imageBoxRef.current.clientHeight}px` : '100%',
                    maxWidth: 'none',
                  }}
                />
              </div>

              {/* Slider Handle */}
              <div
                className="absolute top-0 bottom-0 z-10 w-0.5 bg-white cursor-ew-resize shadow-[0_0_8px_rgba(0,0,0,0.6)]"
                style={{ left: `${sliderPosition}%` }}
                onMouseDown={() => setIsDraggingSlider(true)}
                onTouchMove={handleTouchMove}
              >
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-neutral-900 border-2 border-white shadow-xl flex items-center justify-center text-white cursor-grab active:cursor-grabbing">
                  <SplitSquareVertical className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Before/After Badges */}
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/75 text-[10px] font-medium text-neutral-300 pointer-events-none border border-white/10">
                Original
              </div>
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-indigo-950/80 text-[10px] font-medium text-indigo-200 pointer-events-none border border-indigo-500/20">
                Cleaned
              </div>
            </div>
          </div>
        )}

        {/* 2. Full Clean View */}
        {viewMode === 'cleaned' && (
          <div
            className="relative inline-block max-w-full max-h-full shadow-2xl rounded-lg overflow-hidden border border-neutral-800 bg-neutral-900/60"
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'center center',
              transition: 'transform 0.12s ease-out',
            }}
          >
            <img
              src={processedImageUrl || page.sourceUrl}
              alt="Cleaned Document"
              className="block max-h-[74vh] sm:max-h-[80vh] w-auto max-w-[94vw] object-contain"
            />
          </div>
        )}

        {/* 3. Hold to Compare View */}
        {viewMode === 'toggle' && (
          <div
            className="flex flex-col items-center gap-3 max-h-full"
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'center center',
              transition: 'transform 0.12s ease-out',
            }}
          >
            <div className="relative inline-block max-w-full shadow-2xl rounded-lg overflow-hidden border border-neutral-800 bg-neutral-900/60">
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/75 text-[10px] font-medium text-white border border-white/10">
                {isHoldingOriginal ? 'Original Input' : 'Cleaned Output'}
              </div>
              <img
                src={isHoldingOriginal ? page.sourceUrl : (processedImageUrl || page.sourceUrl)}
                alt="Document View"
                className="block max-h-[68vh] sm:max-h-[74vh] w-auto max-w-[94vw] object-contain"
              />
            </div>

            <button
              onMouseDown={() => setIsHoldingOriginal(true)}
              onMouseUp={() => setIsHoldingOriginal(false)}
              onTouchStart={() => setIsHoldingOriginal(true)}
              onTouchEnd={() => setIsHoldingOriginal(false)}
              className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 border border-neutral-700 text-xs font-medium text-neutral-200 shadow-md cursor-pointer transition-colors"
            >
              Hold Down to Compare Original
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
