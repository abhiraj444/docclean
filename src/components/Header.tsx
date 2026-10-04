/**
 * Clean, minimal top bar compliant with Top Bar Contract
 */

import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Download, ChevronLeft, ChevronRight, Plus, RotateCcw, Cpu, Check, ChevronDown } from 'lucide-react';
import { getUserConcurrency, setUserConcurrency, getSystemCores } from '../utils/concurrency';

interface HeaderProps {
  totalPages: number;
  activePageIndex: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  onOpenExportModal: () => void;
  onTriggerUpload: () => void;
  onClearAll: () => void;
  isProcessingBatch: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  totalPages,
  activePageIndex,
  onPrevPage,
  onNextPage,
  onOpenExportModal,
  onTriggerUpload,
  onClearAll,
  isProcessingBatch,
}) => {
  const [activeThreads, setActiveThreads] = useState<number>(getUserConcurrency());
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const systemCores = getSystemCores();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectThreads = (n: number) => {
    setUserConcurrency(n);
    setActiveThreads(n);
    setIsMenuOpen(false);
  };

  const threadOptions = Array.from(
    new Set([2, 4, 8, 12, 16, systemCores].filter((n) => n <= Math.max(16, systemCores)))
  ).sort((a, b) => a - b);
  return (
    <header className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-2.5 bg-neutral-900 border-b border-neutral-800 z-30 select-none">
      {/* Zone 1: Single text wordmark */}
      <div className="flex items-center gap-2.5">
        <a href="/" className="flex items-center gap-2 text-sm sm:text-base font-bold text-white hover:text-neutral-200 transition-colors">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span>DocClean</span>
        </a>
      </div>

      {/* Zone 2: Page Navigation (When pages are loaded) */}
      {totalPages > 0 && (
        <div className="flex items-center gap-2">
          {totalPages > 1 && (
            <div className="flex items-center gap-1 bg-neutral-800/80 px-2 py-1 rounded-lg border border-neutral-700/60 text-xs">
              <button
                onClick={onPrevPage}
                disabled={activePageIndex === 0}
                className="p-0.5 text-neutral-400 hover:text-white disabled:opacity-30 transition-colors"
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="font-mono text-neutral-200 tabular-nums px-1.5 font-medium">
                Page {activePageIndex + 1} of {totalPages}
              </span>

              <button
                onClick={onNextPage}
                disabled={activePageIndex === totalPages - 1}
                className="p-0.5 text-neutral-400 hover:text-white disabled:opacity-30 transition-colors"
                title="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Zone 3: Primary Actions */}
      <div className="flex items-center gap-2">
        {/* CPU Hardware Thread Selector */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-750 border border-neutral-700/80 rounded-md transition-colors"
            title={`Hardware Concurrency: ${systemCores} CPU Cores detected. Currently using ${activeThreads} parallel threads.`}
          >
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline font-mono">{activeThreads} Cores</span>
            <span className="sm:hidden font-mono">{activeThreads}</span>
            <ChevronDown className="w-3 h-3 text-neutral-400" />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 p-3 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl z-50 text-xs">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-800">
                <span className="font-semibold text-white">Parallel Acceleration</span>
                <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-500/20">
                  {systemCores} Cores Detected
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 mb-2.5 leading-relaxed">
                Choose parallel CPU worker threads for PDF rendering, batch cropping, and export.
              </p>
              <div className="space-y-1">
                {threadOptions.map((n) => (
                  <button
                    key={n}
                    onClick={() => handleSelectThreads(n)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                      activeThreads === n
                        ? 'bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/30'
                        : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="font-mono">{n} {n === 1 ? 'thread' : 'threads'}</span>
                      {n === systemCores && (
                        <span className="text-[9px] bg-neutral-800 px-1.5 py-0.2 rounded text-neutral-400">
                          Max Cores
                        </span>
                      )}
                      {n === 4 && (
                        <span className="text-[9px] bg-neutral-800 px-1.5 py-0.2 rounded text-neutral-400">
                          Low RAM
                        </span>
                      )}
                    </span>
                    {activeThreads === n && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                  </button>
                ))}
              </div>
              <div className="mt-2.5 pt-2 border-t border-neutral-800 text-[10px] text-neutral-500">
                Higher thread counts process faster but consume more browser memory (RAM).
              </div>
            </div>
          )}
        </div>

        {totalPages > 0 ? (
          <>
            <button
              onClick={onTriggerUpload}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 rounded-md transition-colors whitespace-nowrap"
              title="Add more pages or images"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Add Pages</span>
            </button>

            <button
              onClick={onClearAll}
              className="p-1.5 text-neutral-400 hover:text-rose-400 bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 rounded-md transition-colors"
              title="Clear & Upload New File"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onOpenExportModal}
              disabled={isProcessingBatch}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md shadow-xs shadow-indigo-600/30 transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Clean Doc</span>
            </button>
          </>
        ) : null}
      </div>
    </header>
  );
};
