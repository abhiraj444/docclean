/**
 * Clean, minimal top bar compliant with Top Bar Contract
 */

import React from 'react';
import { Sparkles, Download, ChevronLeft, ChevronRight, Plus, RotateCcw } from 'lucide-react';

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
