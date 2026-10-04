/**
 * Interactive Crop & Straighten Modal
 * Features:
 * 1. User-Guided Active Contour Refinement ("Smart Snap to Edges")
 * 2. Precision Touch Loupe (2.5x magnification under finger)
 * 3. Batch Propagation ("Apply Smart Crop to All Pages")
 * 4. Perspective Rectification & Homography Unwarping
 * 5. 1:1 Aspect-Locked Coordinate Mapping with zero letterbox drift
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Crop, Wand2, Maximize, RotateCcw, Check, Sparkles, Layers, Info } from 'lucide-react';
import {
  DocumentCorners,
  autoDetectDocumentCorners,
  refineCornersWithUserPrior,
  getDefaultCorners,
  warpAndCropDocument,
  Point,
} from '../utils/cropDetector';
import { loadImageElement } from '../utils/pdfHandler';

interface CropModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceImageUrl: string;
  totalPages: number;
  onApplyCrop: (croppedCanvas: HTMLCanvasElement, applyToAll: boolean, corners: DocumentCorners) => void;
}

export const CropModal: React.FC<CropModalProps> = ({
  isOpen,
  onClose,
  sourceImageUrl,
  totalPages,
  onApplyCrop,
}) => {
  const [corners, setCorners] = useState<DocumentCorners>(getDefaultCorners());
  const [activeCorner, setActiveCorner] = useState<keyof DocumentCorners | null>(null);
  const [pointerCoord, setPointerCoord] = useState<{ clientX: number; clientY: number } | null>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number }>({ width: 800, height: 1100 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [applyToAllPages, setApplyToAllPages] = useState(false);
  const [hasAdjusted, setHasAdjusted] = useState(false);

  const imageContainerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const activeCornerRef = useRef<keyof DocumentCorners | null>(null);
  activeCornerRef.current = activeCorner;

  // Initialize and run auto-detection when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const initImg = async () => {
      try {
        const img = await loadImageElement(sourceImageUrl);
        if (!isMounted) return;

        const w = img.naturalWidth || img.width || 800;
        const h = img.naturalHeight || img.height || 1100;
        setImageSize({ width: w, height: h });

        try {
          const detected = autoDetectDocumentCorners(img);
          setCorners(detected);
        } catch {
          setCorners(getDefaultCorners());
        }
      } catch (err) {
        console.error('Failed to load image for crop modal:', err);
      }
    };

    initImg();

    return () => {
      isMounted = false;
    };
  }, [isOpen, sourceImageUrl]);

  // Window-level pointer tracking for smooth, rock-solid pin dragging
  useEffect(() => {
    if (!activeCorner) return;

    const onPointerMove = (e: PointerEvent) => {
      if (!activeCornerRef.current || !imageContainerRef.current) return;
      const rect = imageContainerRef.current.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

      setPointerCoord({ clientX: e.clientX, clientY: e.clientY });
      setCorners((prev) => ({
        ...prev,
        [activeCornerRef.current!]: {
          x: Number(x.toFixed(4)),
          y: Number(y.toFixed(4)),
        },
      }));
    };

    const onPointerUp = () => {
      setActiveCorner(null);
      setPointerCoord(null);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('pointercancel', onPointerUp, { passive: true });

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [activeCorner]);

  const handlePointerDownPin = (cornerKey: keyof DocumentCorners, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveCorner(cornerKey);
    setPointerCoord({ clientX: e.clientX, clientY: e.clientY });
    setHasAdjusted(true);
  };

  // User-Guided Active Contour Refinement ("Smart Snap to Paper Edges")
  const handleSmartSnap = async () => {
    setIsProcessing(true);
    try {
      const img = imgRef.current || (await loadImageElement(sourceImageUrl));
      const snapped = refineCornersWithUserPrior(img, corners);
      setCorners(snapped);
      setHasAdjusted(true);
    } catch (err) {
      console.error('Smart snap error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Auto-detect from scratch
  const handleAutoDetectFromScratch = async () => {
    setIsProcessing(true);
    try {
      const img = imgRef.current || (await loadImageElement(sourceImageUrl));
      const detected = autoDetectDocumentCorners(img);
      setCorners(detected);
      setHasAdjusted(false);
    } catch (err) {
      console.error('Auto detect error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset to full image
  const handleExpandFull = () => {
    setCorners({
      topLeft: { x: 0, y: 0 },
      topRight: { x: 1, y: 0 },
      bottomRight: { x: 1, y: 1 },
      bottomLeft: { x: 0, y: 1 },
    });
    setHasAdjusted(true);
  };

  // Apply crop & homography unwarp
  const handleApply = async () => {
    setIsProcessing(true);
    try {
      const img = imgRef.current || (await loadImageElement(sourceImageUrl));
      const croppedCanvas = warpAndCropDocument(img, corners);
      onApplyCrop(croppedCanvas, applyToAllPages, corners);
      onClose();
    } catch (err) {
      console.error('Failed to crop image:', err);
      alert('Unable to crop document. Please adjust corner pins and try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  // Calculate approximate cropped dimensions for display
  const p0x = corners.topLeft.x * imageSize.width;
  const p0y = corners.topLeft.y * imageSize.height;
  const p1x = corners.topRight.x * imageSize.width;
  const p1y = corners.topRight.y * imageSize.height;
  const p2x = corners.bottomRight.x * imageSize.width;
  const p2y = corners.bottomRight.y * imageSize.height;
  const p3x = corners.bottomLeft.x * imageSize.width;
  const p3y = corners.bottomLeft.y * imageSize.height;

  const approxW = Math.round(Math.max(Math.hypot(p1x - p0x, p1y - p0y), Math.hypot(p2x - p3x, p2y - p3y)));
  const approxH = Math.round(Math.max(Math.hypot(p3x - p0x, p3y - p0y), Math.hypot(p2x - p1x, p2y - p1y)));

  const cornerPins: { key: keyof DocumentCorners; label: string; badge: string; pt: Point }[] = [
    { key: 'topLeft', label: 'Top-Left', badge: 'TL', pt: corners.topLeft },
    { key: 'topRight', label: 'Top-Right', badge: 'TR', pt: corners.topRight },
    { key: 'bottomRight', label: 'Bottom-Right', badge: 'BR', pt: corners.bottomRight },
    { key: 'bottomLeft', label: 'Bottom-Left', badge: 'BL', pt: corners.bottomLeft },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-xs select-none">
      <div className="relative w-full max-w-4xl h-[94vh] max-h-[880px] rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl flex flex-col overflow-hidden text-neutral-100">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 border-b border-neutral-800 bg-neutral-900 shrink-0">
          <div className="flex items-center gap-2">
            <Crop className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-bold text-white">Smart Crop & Straighten</span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* User-Guided Smart Snap to Paper Boundary */}
            <button
              onClick={handleSmartSnap}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm shadow-indigo-600/30 transition-colors"
              title="Magnetic Edge Snap: Locks pins onto the physical paper boundary based on your rough selection"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Smart Snap to Edges</span>
            </button>

            <button
              onClick={handleAutoDetectFromScratch}
              disabled={isProcessing}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg transition-colors"
              title="Re-run computer vision boundary detection from scratch"
            >
              <Wand2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Auto-Detect</span>
            </button>

            <button
              onClick={handleExpandFull}
              className="hidden md:flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg transition-colors"
              title="Expand pins to include the full image"
            >
              <Maximize className="w-3.5 h-3.5" />
              <span>Full Image</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tip & Telemetry Strip */}
        <div className="px-4 sm:px-6 py-1.5 bg-neutral-950/80 border-b border-neutral-800/80 text-[11px] text-neutral-400 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>
              Drag the 4 corner pins to match the paper corners. The app will perspective-straighten the document into a clean rectangle.
            </span>
          </div>
          <div className="flex items-center gap-3 font-mono text-neutral-500 tabular-nums shrink-0 text-[11px]">
            <span>Crop: {approxW}×{approxH}px</span>
            <span>Source: {imageSize.width}×{imageSize.height}px</span>
          </div>
        </div>

        {/* Main Interactive Viewport */}
        <div className="flex-1 flex items-center justify-center p-3 sm:p-5 bg-neutral-950 overflow-hidden relative">
          {/*
            Exact Aspect-Ratio Locked Container:
            Guarantees 1:1 mapping between DOM coordinates, pins, and image bitmap with zero letterbox offset!
          */}
          <div
            ref={imageContainerRef}
            className="relative select-none max-w-full max-h-[62vh] sm:max-h-[68vh] shadow-2xl rounded-sm"
            style={{
              aspectRatio: `${imageSize.width} / ${imageSize.height}`,
              height: 'auto',
              width: 'auto',
              maxHeight: 'min(68vh, 650px)',
              maxWidth: 'min(90vw, 840px)',
            }}
          >
            {/* The Document Image */}
            <img
              ref={imgRef}
              src={sourceImageUrl}
              alt="Document boundary selection"
              className="w-full h-full block rounded-sm pointer-events-none object-fill"
            />

            {/* SVG Overlay: Darkened Mask outside quad + bright boundary lines */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <defs>
                <mask id="cropPolygonMask">
                  <rect width="100" height="100" fill="white" />
                  <polygon
                    points={`
                      ${corners.topLeft.x * 100},${corners.topLeft.y * 100}
                      ${corners.topRight.x * 100},${corners.topRight.y * 100}
                      ${corners.bottomRight.x * 100},${corners.bottomRight.y * 100}
                      ${corners.bottomLeft.x * 100},${corners.bottomLeft.y * 100}
                    `}
                    fill="black"
                  />
                </mask>
              </defs>

              {/* Darkened mask covering background outside the document */}
              <rect width="100" height="100" fill="rgba(0, 0, 0, 0.65)" mask="url(#cropPolygonMask)" />

              {/* Document boundary line */}
              <polygon
                points={`
                  ${corners.topLeft.x * 100},${corners.topLeft.y * 100}
                  ${corners.topRight.x * 100},${corners.topRight.y * 100}
                  ${corners.bottomRight.x * 100},${corners.bottomRight.y * 100}
                  ${corners.bottomLeft.x * 100},${corners.bottomLeft.y * 100}
                `}
                fill="rgba(99, 102, 241, 0.12)"
                stroke="#6366f1"
                strokeWidth="0.75"
                strokeDasharray="2, 1.5"
              />

              {/* Center crosshair guide connecting diagonals */}
              <line
                x1={corners.topLeft.x * 100}
                y1={corners.topLeft.y * 100}
                x2={corners.bottomRight.x * 100}
                y2={corners.bottomRight.y * 100}
                stroke="rgba(129, 140, 248, 0.25)"
                strokeWidth="0.4"
                strokeDasharray="1, 2"
              />
              <line
                x1={corners.topRight.x * 100}
                y1={corners.topRight.y * 100}
                x2={corners.bottomLeft.x * 100}
                y2={corners.bottomLeft.y * 100}
                stroke="rgba(129, 140, 248, 0.25)"
                strokeWidth="0.4"
                strokeDasharray="1, 2"
              />
            </svg>

            {/* 4 Interactive Corner Pins */}
            {cornerPins.map((c) => {
              const isMoving = activeCorner === c.key;

              return (
                <div
                  key={c.key}
                  onPointerDown={(e) => handlePointerDownPin(c.key, e)}
                  style={{
                    left: `${c.pt.x * 100}%`,
                    top: `${c.pt.y * 100}%`,
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center cursor-crosshair touch-none z-30 transition-transform ${
                    isMoving ? 'scale-125' : 'hover:scale-110'
                  }`}
                  title={`${c.label}: Drag to paper corner`}
                >
                  {/* Pin Circle with badge */}
                  <div className="relative w-8 h-8 rounded-full border-2 border-white bg-indigo-600 shadow-xl flex items-center justify-center ring-2 ring-indigo-500/50">
                    <span className="text-[9px] font-bold text-white font-mono">{c.badge}</span>
                  </div>
                </div>
              );
            })}

            {/* 2.5x Precision Magnifying Loupe under finger while dragging */}
            {activeCorner && pointerCoord && imageContainerRef.current && (
              <div
                className="fixed pointer-events-none w-28 h-28 rounded-full border-2 border-indigo-400 shadow-2xl overflow-hidden bg-neutral-950 z-50"
                style={{
                  left: `${pointerCoord.clientX - 56}px`,
                  top: `${Math.max(10, pointerCoord.clientY - 120)}px`,
                }}
              >
                <div
                  className="w-full h-full"
                  style={{
                    backgroundImage: `url(${sourceImageUrl})`,
                    backgroundSize: `${imageContainerRef.current.clientWidth * 2.8}px ${imageContainerRef.current.clientHeight * 2.8}px`,
                    backgroundPosition: `-${corners[activeCorner].x * imageContainerRef.current.clientWidth * 2.8 - 56}px -${
                      corners[activeCorner].y * imageContainerRef.current.clientHeight * 2.8 - 56
                    }px`,
                    backgroundRepeat: 'no-repeat',
                  }}
                />
                {/* Loupe Crosshairs */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-full h-0.5 bg-indigo-500/80 absolute" />
                  <div className="h-full w-0.5 bg-indigo-500/80 absolute" />
                  <div className="w-2.5 h-2.5 rounded-full border border-white bg-indigo-600 z-10" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-3 border-t border-neutral-800 bg-neutral-900 shrink-0">
          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
            <button
              onClick={() => {
                setCorners(getDefaultCorners());
                setHasAdjusted(false);
              }}
              className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Corners</span>
            </button>

            {totalPages > 1 && (
              <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-300 hover:text-white bg-neutral-800/80 px-2.5 py-1 rounded-md border border-neutral-700/60">
                <input
                  type="checkbox"
                  checked={applyToAllPages}
                  onChange={(e) => setApplyToAllPages(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Apply learned crop to all {totalPages} pages</span>
                </span>
              </label>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
            >
              Cancel
            </button>

            <button
              onClick={handleApply}
              disabled={isProcessing}
              className="flex items-center justify-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm shadow-indigo-600/30 transition-colors disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>
                {applyToAllPages && totalPages > 1
                  ? `Straighten & Crop All ${totalPages} Pages`
                  : 'Apply Straighten & Crop'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
