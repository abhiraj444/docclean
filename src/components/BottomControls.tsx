/**
 * Elegant Bottom Controls Panel
 * Fully scrollable parameters sheet with auto-sliding collapse during slider adjustment
 * so the document preview takes full screen height in focus.
 */

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  CheckCheck,
  RotateCcw,
  Sun,
  Type,
  Printer,
  Palette,
  ShieldCheck,
  Crop,
} from 'lucide-react';
import { ProcessingSettings, InversionMode } from '../types/document';

interface BottomControlsProps {
  settings: ProcessingSettings;
  onChange: (newSettings: ProcessingSettings) => void;
  onReset: () => void;
  onAutoOptimize: () => void;
  onApplyToAllPages: () => void;
  onOpenCropModal: () => void;
  totalPages: number;
  onSliderDragStateChange: (isDragging: boolean, activeParamName?: string, activeParamValue?: string) => void;
}

export const BottomControls: React.FC<BottomControlsProps> = ({
  settings,
  onChange,
  onReset,
  onAutoOptimize,
  onApplyToAllPages,
  onOpenCropModal,
  totalPages,
  onSliderDragStateChange,
}) => {
  const [activeCategory, setActiveCategory] = useState<'paper' | 'text' | 'color' | 'ink'>('paper');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);

  const update = <K extends keyof ProcessingSettings>(key: K, value: ProcessingSettings[K]) => {
    onChange({
      ...settings,
      [key]: value,
    });
  };

  const handleStartDrag = (paramName: string, paramValue: string) => {
    setIsInteracting(true);
    onSliderDragStateChange(true, paramName, paramValue);
  };

  const handleEndDrag = () => {
    setIsInteracting(false);
    onSliderDragStateChange(false);
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isInteracting) {
        setIsInteracting(false);
        onSliderDragStateChange(false);
      }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('touchend', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchend', handleGlobalMouseUp);
    };
  }, [isInteracting, onSliderDragStateChange]);

  return (
    <div
      className={`w-full bg-neutral-900/95 backdrop-blur-md border-t border-neutral-800 transition-all duration-300 select-none z-30 shadow-2xl ${
        isInteracting ? 'translate-y-[78%] opacity-35' : 'translate-y-0 opacity-100'
      }`}
    >
      {/* Drawer Header & Category Tabs */}
      <div className="flex items-center justify-between px-3 sm:px-6 py-2 border-b border-neutral-800 bg-neutral-900/80">
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-none py-0.5">
          <div className="flex items-center gap-1 p-0.5 bg-neutral-800 rounded-lg border border-neutral-700/60 shrink-0">
            <button
              onClick={() => {
                setActiveCategory('paper');
                setIsCollapsed(false);
              }}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                activeCategory === 'paper' && !isCollapsed
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>Paper & Shadows</span>
            </button>

            <button
              onClick={() => {
                setActiveCategory('text');
                setIsCollapsed(false);
              }}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                activeCategory === 'text' && !isCollapsed
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              <span>Text & Sharp</span>
            </button>

            <button
              onClick={() => {
                setActiveCategory('color');
                setIsCollapsed(false);
              }}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                activeCategory === 'color' && !isCollapsed
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Color</span>
            </button>

            <button
              onClick={() => {
                setActiveCategory('ink');
                setIsCollapsed(false);
              }}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                activeCategory === 'ink' && !isCollapsed
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Toner Saver</span>
            </button>
          </div>
        </div>

        {/* Quick Toolbar */}
        <div className="flex items-center gap-1.5 shrink-0 pl-2">
          {/* Crop & Straighten Button */}
          <button
            onClick={onOpenCropModal}
            className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-neutral-200 hover:text-white bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-md transition-colors whitespace-nowrap"
            title="Crop & straighten document corners"
          >
            <Crop className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Crop</span>
          </button>

          {/* Auto Clean */}
          <button
            onClick={onAutoOptimize}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-300 hover:text-white bg-indigo-950/70 hover:bg-indigo-900 border border-indigo-800/80 rounded-md transition-colors whitespace-nowrap"
            title="Recalculate mathematical inverse settings"
          >
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span>Auto</span>
          </button>

          {totalPages > 1 && (
            <button
              onClick={onApplyToAllPages}
              className="hidden md:flex items-center gap-1 px-2 py-1 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-md transition-colors whitespace-nowrap"
              title="Apply these parameters to all pages"
            >
              <CheckCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>Apply to All</span>
            </button>
          )}

          <button
            onClick={onReset}
            className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-md transition-colors"
            title="Reset parameters"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-md transition-colors"
            title={isCollapsed ? 'Show Parameters' : 'Hide to Focus Preview'}
          >
            {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Scrollable Parameters Body */}
      {!isCollapsed && (
        <div className="max-h-[38vh] sm:max-h-[32vh] overflow-y-auto px-4 sm:px-6 py-3.5 scrollbar-thin scrollbar-thumb-neutral-700">
          {/* CATEGORY 1: PAPER & SHADOWS */}
          {activeCategory === 'paper' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              {/* Whiten Dirty Paper */}
              <div className="space-y-1.5 p-2 rounded-lg bg-neutral-950/40 border border-neutral-800/60">
                <div className="flex justify-between items-baseline text-xs">
                  <span className="font-semibold text-white">Whiten Dirty Paper</span>
                  <span className="font-mono text-indigo-400 font-bold tabular-nums">
                    {255 - settings.whitePoint > 0 ? `+${255 - settings.whitePoint}` : 'Off'}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-tight">
                  Removes gray, yellowish, or underexposed paper background into clean #FFFFFF.
                </p>
                <input
                  type="range"
                  min="160"
                  max="255"
                  step="1"
                  value={settings.whitePoint}
                  onMouseDown={() => handleStartDrag('Whiten Dirty Paper', `${settings.whitePoint}`)}
                  onTouchStart={() => handleStartDrag('Whiten Dirty Paper', `${settings.whitePoint}`)}
                  onChange={(e) => {
                    update('whitePoint', Number(e.target.value));
                    onSliderDragStateChange(true, 'Whiten Dirty Paper', `${e.target.value}`);
                  }}
                  className="w-full accent-indigo-500 cursor-pointer h-2"
                />
              </div>

              {/* Remove Camera Shadows */}
              <div className="space-y-1.5 p-2 rounded-lg bg-neutral-950/40 border border-neutral-800/60">
                <div className="flex justify-between items-baseline text-xs">
                  <span className="font-semibold text-white">Remove Camera Shadows</span>
                  <span className="font-mono text-indigo-400 font-bold tabular-nums">{settings.illuminationCorrection}%</span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-tight">
                  2D spatial background division to eradicate phone, hand, and fold shadows.
                </p>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={settings.illuminationCorrection}
                  onMouseDown={() => handleStartDrag('Remove Camera Shadows', `${settings.illuminationCorrection}%`)}
                  onTouchStart={() => handleStartDrag('Remove Camera Shadows', `${settings.illuminationCorrection}%`)}
                  onChange={(e) => {
                    update('illuminationCorrection', Number(e.target.value));
                    onSliderDragStateChange(true, 'Remove Camera Shadows', `${e.target.value}%`);
                  }}
                  className="w-full accent-indigo-500 cursor-pointer h-2"
                />
              </div>

              {/* Document Brightness */}
              <div className="space-y-1.5 p-2 rounded-lg bg-neutral-950/40 border border-neutral-800/60">
                <div className="flex justify-between items-baseline text-xs">
                  <span className="font-semibold text-white">Document Brightness</span>
                  <span className="font-mono text-indigo-400 font-bold tabular-nums">
                    {settings.exposure > 0 ? `+${settings.exposure.toFixed(2)}` : settings.exposure.toFixed(2)}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-tight">
                  Increases overall image exposure to lighten dark indoor captures.
                </p>
                <input
                  type="range"
                  min="-0.6"
                  max="0.6"
                  step="0.02"
                  value={settings.exposure}
                  onMouseDown={() => handleStartDrag('Document Brightness', `${settings.exposure.toFixed(2)}`)}
                  onTouchStart={() => handleStartDrag('Document Brightness', `${settings.exposure.toFixed(2)}`)}
                  onChange={(e) => {
                    update('exposure', Number(e.target.value));
                    onSliderDragStateChange(true, 'Document Brightness', `${Number(e.target.value).toFixed(2)}`);
                  }}
                  className="w-full accent-indigo-500 cursor-pointer h-2"
                />
              </div>
            </div>
          )}

          {/* CATEGORY 2: TEXT & CONTRAST */}
          {activeCategory === 'text' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              {/* Darken Faint Letters */}
              <div className="space-y-1.5 p-2 rounded-lg bg-neutral-950/40 border border-neutral-800/60">
                <div className="flex justify-between items-baseline text-xs">
                  <span className="font-semibold text-white">Darken Faint Letters</span>
                  <span className="font-mono text-indigo-400 font-bold tabular-nums">+{settings.blackPoint}</span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-tight">
                  Clamps low-contrast pencil, faint ballpoint, or receipt ink to solid black.
                </p>
                <input
                  type="range"
                  min="0"
                  max="90"
                  step="1"
                  value={settings.blackPoint}
                  onMouseDown={() => handleStartDrag('Darken Faint Letters', `${settings.blackPoint}`)}
                  onTouchStart={() => handleStartDrag('Darken Faint Letters', `${settings.blackPoint}`)}
                  onChange={(e) => {
                    update('blackPoint', Number(e.target.value));
                    onSliderDragStateChange(true, 'Darken Faint Letters', `${e.target.value}`);
                  }}
                  className="w-full accent-indigo-500 cursor-pointer h-2"
                />
              </div>

              {/* Sharpen Blurry Strokes */}
              <div className="space-y-1.5 p-2 rounded-lg bg-neutral-950/40 border border-neutral-800/60">
                <div className="flex justify-between items-baseline text-xs">
                  <span className="font-semibold text-white">Sharpen Blurry Strokes</span>
                  <span className="font-mono text-indigo-400 font-bold tabular-nums">{settings.sharpen}%</span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-tight">
                  High-pass Laplacian convolution to sharpen out-of-focus camera captures.
                </p>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={settings.sharpen}
                  onMouseDown={() => handleStartDrag('Sharpen Blurry Strokes', `${settings.sharpen}%`)}
                  onTouchStart={() => handleStartDrag('Sharpen Blurry Strokes', `${settings.sharpen}%`)}
                  onChange={(e) => {
                    update('sharpen', Number(e.target.value));
                    onSliderDragStateChange(true, 'Sharpen Blurry Strokes', `${e.target.value}%`);
                  }}
                  className="w-full accent-indigo-500 cursor-pointer h-2"
                />
              </div>

              {/* Photocopy Text Binarizer */}
              <div className="space-y-1.5 p-2 rounded-lg bg-neutral-950/40 border border-neutral-800/60">
                <div className="flex justify-between items-baseline text-xs">
                  <span className="font-semibold text-white">Photocopy Text Binarizer</span>
                  <span className="font-mono text-indigo-400 font-bold tabular-nums">{settings.adaptiveThreshold}%</span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-tight">
                  Local adaptive thresholding for crisp, zero-grain photocopier letters.
                </p>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={settings.adaptiveThreshold}
                  onMouseDown={() => handleStartDrag('Text Binarizer', `${settings.adaptiveThreshold}%`)}
                  onTouchStart={() => handleStartDrag('Text Binarizer', `${settings.adaptiveThreshold}%`)}
                  onChange={(e) => {
                    update('adaptiveThreshold', Number(e.target.value));
                    onSliderDragStateChange(true, 'Text Binarizer', `${e.target.value}%`);
                  }}
                  className="w-full accent-indigo-500 cursor-pointer h-2"
                />
              </div>
            </div>
          )}

          {/* CATEGORY 3: COLOR & AGING */}
          {activeCategory === 'color' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              {/* Remove Yellow Aging */}
              <div className="space-y-1.5 p-2 rounded-lg bg-neutral-950/40 border border-neutral-800/60">
                <div className="flex justify-between items-baseline text-xs">
                  <span className="font-semibold text-white">Remove Yellow Aging</span>
                  <span className="font-mono text-indigo-400 font-bold tabular-nums">
                    {settings.colorTemp < 0 ? `${settings.colorTemp}` : '0'}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-tight">
                  Cools down yellowed, sepia paper, and incandescent room illumination.
                </p>
                <input
                  type="range"
                  min="-100"
                  max="40"
                  step="1"
                  value={settings.colorTemp}
                  onMouseDown={() => handleStartDrag('Remove Yellow Aging', `${settings.colorTemp}`)}
                  onTouchStart={() => handleStartDrag('Remove Yellow Aging', `${settings.colorTemp}`)}
                  onChange={(e) => {
                    update('colorTemp', Number(e.target.value));
                    onSliderDragStateChange(true, 'Remove Yellow Aging', `${e.target.value}`);
                  }}
                  className="w-full accent-indigo-500 cursor-pointer h-2"
                />
              </div>

              {/* Color Saturation */}
              <div className="space-y-1.5 p-2 rounded-lg bg-neutral-950/40 border border-neutral-800/60">
                <div className="flex justify-between items-baseline text-xs">
                  <span className="font-semibold text-white">Color Saturation</span>
                  <span className="font-mono text-indigo-400 font-bold tabular-nums">{Math.round(settings.saturation * 100)}%</span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-tight">
                  0% produces crisp grayscale; 100% preserves original color.
                </p>
                <input
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.05"
                  value={settings.saturation}
                  onMouseDown={() => handleStartDrag('Color Saturation', `${Math.round(settings.saturation * 100)}%`)}
                  onTouchStart={() => handleStartDrag('Color Saturation', `${Math.round(settings.saturation * 100)}%`)}
                  onChange={(e) => {
                    update('saturation', Number(e.target.value));
                    onSliderDragStateChange(true, 'Color Saturation', `${Math.round(Number(e.target.value) * 100)}%`);
                  }}
                  className="w-full accent-indigo-500 cursor-pointer h-2"
                />
              </div>

              {/* Preserve Signatures & Stamps */}
              <div className="flex flex-col justify-center p-3 rounded-lg bg-neutral-950/40 border border-neutral-800/60">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.preserveSignatures}
                    onChange={(e) => update('preserveSignatures', e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <div>
                    <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Preserve Color Signatures & Stamps</span>
                    </div>
                    <p className="text-[10px] text-neutral-400 mt-0.5">
                      Keeps blue pen ink and red notary seals in full color.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* CATEGORY 4: TONER / INK SAVER */}
          {activeCategory === 'ink' && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {(
                [
                  { id: 'none', title: 'Normal Document', desc: 'Standard polarity' },
                  { id: 'invert_full', title: 'Dark to White Paper', desc: 'Inverts black background to save 85% toner' },
                  { id: 'ink_saver_outline', title: 'Hollow Text Outline', desc: 'Hollows solid ink into contours (80% save)' },
                  { id: 'ink_saver_toner', title: 'Grayscale Washout', desc: '0% ink on margins, lightened dark text' },
                ] as { id: InversionMode; title: string; desc: string }[]
              ).map((mode) => (
                <div
                  key={mode.id}
                  onClick={() => update('inversionMode', mode.id)}
                  className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                    settings.inversionMode === mode.id
                      ? 'bg-indigo-950/50 border-indigo-500 ring-1 ring-indigo-500'
                      : 'bg-neutral-950/40 border-neutral-800 hover:bg-neutral-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">{mode.title}</span>
                    <input
                      type="radio"
                      name="inkMode"
                      checked={settings.inversionMode === mode.id}
                      onChange={() => update('inversionMode', mode.id)}
                      className="text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </div>
                  <p className="text-[10px] text-neutral-400 mt-1">{mode.desc}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
