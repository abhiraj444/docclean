/**
 * Page Carousel for Multi-Page PDF and Multi-Image Batching
 * Enables individual page selection, 90° rotation, page deletion,
 * and batch synchronization ("Apply Current Settings to All Pages").
 */

import React from 'react';
import { RotateCw, Trash2, Layers, CheckCheck, Wand2, Plus } from 'lucide-react';
import { DocumentPage } from '../types/document';

interface PageCarouselProps {
  pages: DocumentPage[];
  activePageIndex: number;
  onSelectPage: (index: number) => void;
  onRotatePage: (index: number) => void;
  onDeletePage: (index: number) => void;
  onApplySettingsToAll: () => void;
  onAutoAnalyzeAllPages: () => void;
  onTriggerUpload: () => void;
  hasAppliedToAll: boolean;
}

export const PageCarousel: React.FC<PageCarouselProps> = ({
  pages,
  activePageIndex,
  onSelectPage,
  onRotatePage,
  onDeletePage,
  onApplySettingsToAll,
  onAutoAnalyzeAllPages,
  onTriggerUpload,
  hasAppliedToAll,
}) => {
  if (pages.length === 0) return null;

  const activePage = pages[activePageIndex];

  return (
    <div className="bg-neutral-900 border-b border-neutral-800 px-6 py-2.5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 text-xs text-neutral-400">
          <Layers className="w-4 h-4 text-indigo-400" />
          <span className="font-semibold text-neutral-200">
            Batch Queue ({pages.length} {pages.length === 1 ? 'Page' : 'Pages'})
          </span>
          <span aria-hidden="true">·</span>
          <span>Editing Page {activePageIndex + 1} of {pages.length}</span>
          {activePage && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-neutral-500 tabular-nums">
                {activePage.width}×{activePage.height}px
              </span>
            </>
          )}
        </div>

        {/* Batch Operations */}
        <div className="flex items-center gap-2">
          {pages.length > 1 && (
            <>
              <button
                onClick={onApplySettingsToAll}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-all whitespace-nowrap ${
                  hasAppliedToAll
                    ? 'bg-emerald-950/70 border-emerald-700/80 text-emerald-300'
                    : 'bg-neutral-800 hover:bg-neutral-750 border-neutral-700 text-neutral-200 hover:text-white'
                }`}
                title="Copies current tuned sliders and filter parameters to every page in this batch"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>{hasAppliedToAll ? 'Applied to All' : 'Apply Settings to All Pages'}</span>
              </button>

              <button
                onClick={onAutoAnalyzeAllPages}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 text-neutral-200 hover:text-white rounded-md transition-colors whitespace-nowrap"
                title="Runs independent quality analysis and calculates custom parameters for each page individually"
              >
                <Wand2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Auto-Optimize All Individually</span>
              </button>
            </>
          )}

          <button
            onClick={() => onRotatePage(activePageIndex)}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 text-neutral-300 hover:text-white rounded-md transition-colors"
            title="Rotate active page clockwise 90 degrees"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Rotate 90°</span>
          </button>

          {pages.length > 1 && (
            <button
              onClick={() => onDeletePage(activePageIndex)}
              className="p-1.5 text-neutral-400 hover:text-rose-400 bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 rounded-md transition-colors"
              title="Delete active page"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={onTriggerUpload}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 text-neutral-300 hover:text-white rounded-md transition-colors"
            title="Add more PDF pages or images"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Pages</span>
          </button>
        </div>
      </div>

      {/* Thumbnail Carousel Bar */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-1 pt-0.5 scrollbar-thin scrollbar-thumb-neutral-700">
        {pages.map((page, index) => {
          const isActive = index === activePageIndex;
          const previewImg = page.processedThumbnailUrl || page.sourceUrl;

          return (
            <div
              key={page.id}
              onClick={() => onSelectPage(index)}
              className={`group relative shrink-0 cursor-pointer rounded-lg p-1 transition-all ${
                isActive
                  ? 'bg-indigo-600/20 ring-2 ring-indigo-500 shadow-md'
                  : 'bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700/60'
              }`}
            >
              <div className="relative w-16 h-22 sm:w-20 sm:h-26 overflow-hidden rounded bg-neutral-950 flex items-center justify-center">
                <img
                  src={previewImg}
                  alt={`Page ${index + 1}`}
                  className="w-full h-full object-contain"
                  style={{
                    transform: `rotate(${page.rotation}deg)`,
                  }}
                />

                {/* Page number badge */}
                <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/75 text-[10px] font-mono tabular-nums text-white">
                  #{index + 1}
                </div>

                {/* Condition tag if problem detected */}
                {page.metrics.isDarkDocument && (
                  <div className="absolute bottom-1 right-1 px-1 rounded bg-indigo-900/90 text-[9px] font-medium text-indigo-200">
                    Dark
                  </div>
                )}
                {page.metrics.colorCast.detected === 'yellow' && (
                  <div className="absolute bottom-1 right-1 px-1 rounded bg-amber-900/90 text-[9px] font-medium text-amber-200">
                    Yellow
                  </div>
                )}
                {page.metrics.illuminationGradient > 30 && !page.metrics.isDarkDocument && (
                  <div className="absolute bottom-1 right-1 px-1 rounded bg-purple-900/90 text-[9px] font-medium text-purple-200">
                    Shadow
                  </div>
                )}
              </div>

              <div className="mt-1 text-center">
                <p className="text-[11px] font-medium text-neutral-300 truncate max-w-[80px]">
                  {page.originalName || `Page ${index + 1}`}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
