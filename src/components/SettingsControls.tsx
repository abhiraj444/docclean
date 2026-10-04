/**
 * Settings Controls Panel
 * Provides sliders and parameter inputs for lighting, color cast, adaptive thresholding,
 * unsharp masking, deskew, and toner-saving color inversion modes.
 */

import React, { useState } from 'react';
import {
  Sun,
  Contrast,
  Sliders,
  Sparkles,
  RotateCcw,
  Printer,
  Palette,
  CheckCheck,
  Type,
  ShieldCheck,
} from 'lucide-react';
import { ProcessingSettings, InversionMode } from '../types/document';

interface SettingsControlsProps {
  settings: ProcessingSettings;
  onChange: (newSettings: ProcessingSettings) => void;
  onReset: () => void;
  onReAutoOptimize: () => void;
  onApplyToAllPages: () => void;
  totalPages: number;
}

export const SettingsControls: React.FC<SettingsControlsProps> = ({
  settings,
  onChange,
  onReset,
  onReAutoOptimize,
  onApplyToAllPages,
  totalPages,
}) => {
  const [activeTab, setActiveTab] = useState<'lighting' | 'color' | 'text' | 'printing'>('lighting');

  const update = <K extends keyof ProcessingSettings>(key: K, value: ProcessingSettings[K]) => {
    onChange({
      ...settings,
      [key]: value,
    });
  };

  return (
    <div className="flex flex-col h-full bg-neutral-900 border-l border-neutral-800 text-neutral-200 select-none overflow-hidden">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-800 bg-neutral-900/80">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-white">Parameters</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onReAutoOptimize}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-indigo-300 hover:text-white bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-800/80 rounded-md transition-colors"
            title="Recalculate mathematical inverse parameters from original scan"
          >
            <Sparkles className="w-3 h-3" />
            <span>Auto</span>
          </button>

          <button
            onClick={onReset}
            className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-md transition-colors"
            title="Reset all settings to natural document defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-4 p-1.5 bg-neutral-950/70 border-b border-neutral-800 gap-1 text-[11px] font-medium">
        <button
          onClick={() => setActiveTab('lighting')}
          className={`py-1.5 px-1 rounded-md transition-colors flex flex-col items-center gap-1 ${
            activeTab === 'lighting' ? 'bg-neutral-800 text-white shadow-xs' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Sun className="w-3.5 h-3.5" />
          <span>Lighting</span>
        </button>

        <button
          onClick={() => setActiveTab('color')}
          className={`py-1.5 px-1 rounded-md transition-colors flex flex-col items-center gap-1 ${
            activeTab === 'color' ? 'bg-neutral-800 text-white shadow-xs' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          <span>Color</span>
        </button>

        <button
          onClick={() => setActiveTab('text')}
          className={`py-1.5 px-1 rounded-md transition-colors flex flex-col items-center gap-1 ${
            activeTab === 'text' ? 'bg-neutral-800 text-white shadow-xs' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Type className="w-3.5 h-3.5" />
          <span>Text & Sharp</span>
        </button>

        <button
          onClick={() => setActiveTab('printing')}
          className={`py-1.5 px-1 rounded-md transition-colors flex flex-col items-center gap-1 ${
            activeTab === 'printing' ? 'bg-neutral-800 text-white shadow-xs' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Ink Saver</span>
        </button>
      </div>

      {/* Controls Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin scrollbar-thumb-neutral-800">
        {/* TAB 1: LIGHTING & ILLUMINATION */}
        {activeTab === 'lighting' && (
          <div className="space-y-4">
            {/* Illumination Correction / 2D Background division */}
            <div className="p-3 rounded-lg bg-indigo-950/20 border border-indigo-800/40">
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-semibold text-indigo-300">Illumination Correction</span>
                <span className="font-mono tabular-nums text-indigo-200">{settings.illuminationCorrection}%</span>
              </div>
              <p className="text-[11px] text-neutral-400 mb-2">
                2D spatial background division to flatten phone, finger & corner shadows.
              </p>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={settings.illuminationCorrection}
                onChange={(e) => update('illuminationCorrection', Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            {/* White-Point Cutoff */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-medium text-neutral-300">White-Point (Paper Cutoff)</span>
                <span className="font-mono tabular-nums text-neutral-400">{settings.whitePoint} / 255</span>
              </div>
              <p className="text-[11px] text-neutral-500 mb-2">
                Levels above this become pure clean #FFFFFF white paper.
              </p>
              <input
                type="range"
                min="140"
                max="255"
                step="1"
                value={settings.whitePoint}
                onChange={(e) => update('whitePoint', Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            {/* Black-Point Shadow Cutoff */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-medium text-neutral-300">Black-Point (Faint Text Cutoff)</span>
                <span className="font-mono tabular-nums text-neutral-400">{settings.blackPoint} / 120</span>
              </div>
              <p className="text-[11px] text-neutral-500 mb-2">
                Levels below this clamp to solid black (recovers faint pencil/thermal ink).
              </p>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={settings.blackPoint}
                onChange={(e) => update('blackPoint', Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            {/* Contrast */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-medium text-neutral-300">Contrast</span>
                <span className="font-mono tabular-nums text-neutral-400">{settings.contrast.toFixed(2)}×</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.5"
                step="0.05"
                value={settings.contrast}
                onChange={(e) => update('contrast', Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            {/* Gamma */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-medium text-neutral-300">Gamma Curve</span>
                <span className="font-mono tabular-nums text-neutral-400">{settings.gamma.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.4"
                max="2.2"
                step="0.05"
                value={settings.gamma}
                onChange={(e) => update('gamma', Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            {/* Exposure / Brightness */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-medium text-neutral-300">Exposure Boost</span>
                <span className="font-mono tabular-nums text-neutral-400">
                  {settings.exposure > 0 ? `+${settings.exposure.toFixed(2)}` : settings.exposure.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="-0.8"
                max="0.8"
                step="0.02"
                value={settings.exposure}
                onChange={(e) => update('exposure', Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* TAB 2: COLOR & BACKGROUND */}
        {activeTab === 'color' && (
          <div className="space-y-4">
            {/* Preserve Signatures & Stamps */}
            <div className="p-3.5 rounded-lg bg-neutral-800/80 border border-neutral-700/80">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.preserveSignatures}
                  onChange={(e) => update('preserveSignatures', e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Preserve Signatures & Stamps</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Retains blue ballpoint ink and red notary seals in full color while purging paper yellowing.
                  </p>
                </div>
              </label>
            </div>

            {/* Color Temperature (Cool down yellowed paper) */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-medium text-neutral-300">Color Temperature</span>
                <span className="font-mono tabular-nums text-neutral-400">
                  {settings.colorTemp > 0 ? `+${settings.colorTemp} (Warm)` : `${settings.colorTemp} (Cool)`}
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 mb-2">
                Shift left (-Cool) to neutralize yellow/sepia paper aging.
              </p>
              <input
                type="range"
                min="-100"
                max="100"
                step="1"
                value={settings.colorTemp}
                onChange={(e) => update('colorTemp', Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            {/* Saturation */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-medium text-neutral-300">Saturation</span>
                <span className="font-mono tabular-nums text-neutral-400">
                  {Math.round(settings.saturation * 100)}%
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 mb-2">
                0% creates pure grayscale document; 100% retains original color.
              </p>
              <input
                type="range"
                min="0"
                max="1.5"
                step="0.05"
                value={settings.saturation}
                onChange={(e) => update('saturation', Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* TAB 3: TEXT & SHARPNESS */}
        {activeTab === 'text' && (
          <div className="space-y-4">
            {/* Adaptive Local Threshold (Sauvola blend) */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-medium text-neutral-300">Adaptive Threshold Binarizer</span>
                <span className="font-mono tabular-nums text-neutral-400">{settings.adaptiveThreshold}%</span>
              </div>
              <p className="text-[11px] text-neutral-500 mb-2">
                Local Sauvola thresholding for razor-sharp text on uneven or patterned background.
              </p>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={settings.adaptiveThreshold}
                onChange={(e) => update('adaptiveThreshold', Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            {/* Edge Sharpening (Unsharp Mask) */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-medium text-neutral-300">Unsharp Mask Sharpening</span>
                <span className="font-mono tabular-nums text-neutral-400">{settings.sharpen}%</span>
              </div>
              <p className="text-[11px] text-neutral-500 mb-2">
                Accentuates text stroke contours for out-of-focus captures.
              </p>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={settings.sharpen}
                onChange={(e) => update('sharpen', Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            {/* Denoise Filter */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-medium text-neutral-300">Paper Denoise</span>
                <span className="font-mono tabular-nums text-neutral-400">{settings.denoise}%</span>
              </div>
              <p className="text-[11px] text-neutral-500 mb-2">
                Smooths JPEG compression grain in margins without blurring text.
              </p>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={settings.denoise}
                onChange={(e) => update('denoise', Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            {/* Deskew Angle */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-medium text-neutral-300">Fine Deskew Angle</span>
                <span className="font-mono tabular-nums text-neutral-400">
                  {settings.deskew > 0 ? `+${settings.deskew}°` : `${settings.deskew}°`}
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 mb-2">
                Straightens tilted documents to align text baseline horizontally.
              </p>
              <input
                type="range"
                min="-10"
                max="10"
                step="0.2"
                value={settings.deskew}
                onChange={(e) => update('deskew', Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* TAB 4: PRINTING & INK SAVING */}
        {activeTab === 'printing' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-white block mb-1">
                Inversion & Toner-Saving Architecture
              </label>
              <p className="text-[11px] text-neutral-400 mb-3">
                Converts heavy dark backgrounds to clean paper to prevent draining printer cartridges.
              </p>

              <div className="space-y-2">
                {(
                  [
                    { id: 'none', label: 'Standard (No Inversion)', desc: 'Natural document polarity' },
                    { id: 'invert_full', label: 'Dark Mode Polarity Invert', desc: 'Inverts black background to pure white paper' },
                    { id: 'ink_saver_outline', label: 'Hollow Stroke Outline (Max Toner Save)', desc: 'Converts solid black fills into thin boundary outlines (saves ~80% ink)' },
                    { id: 'ink_saver_toner', label: 'Grayscale Toner Washout', desc: 'Eliminates gray backgrounds and caps dark text density' },
                    { id: 'blueprint_invert', label: 'Blueprint to White Paper', desc: 'Navy blue CAD schematics converted to clean white blueprints' },
                    { id: 'high_contrast_mono', label: 'Pure 1-Bit Binary Mono', desc: 'Strict black or white pixels only for laser photocopiers' },
                  ] as { id: InversionMode; label: string; desc: string }[]
                ).map((mode) => (
                  <div
                    key={mode.id}
                    onClick={() => update('inversionMode', mode.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      settings.inversionMode === mode.id
                        ? 'bg-indigo-950/40 border-indigo-500 ring-1 ring-indigo-500'
                        : 'bg-neutral-800/60 border-neutral-700/60 hover:bg-neutral-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white">{mode.label}</span>
                      <input
                        type="radio"
                        name="inversionMode"
                        checked={settings.inversionMode === mode.id}
                        onChange={() => update('inversionMode', mode.id)}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-1">{mode.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Ink Saver Strength */}
            {(settings.inversionMode === 'ink_saver_outline' || settings.inversionMode === 'ink_saver_toner') && (
              <div className="p-3 rounded-lg bg-neutral-800 border border-neutral-700">
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="font-medium text-white">Ink-Saver Aggressiveness</span>
                  <span className="font-mono tabular-nums text-emerald-400">{settings.inkSaverStrength}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  step="5"
                  value={settings.inkSaverStrength}
                  onChange={(e) => update('inkSaverStrength', Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Panel Bottom Action */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-neutral-800 bg-neutral-900/90">
          <button
            onClick={onApplyToAllPages}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white border border-neutral-700 transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>Apply These Settings to All {totalPages} Pages</span>
          </button>
        </div>
      )}
    </div>
  );
};
