/**
 * Clean, distraction-free upload screen
 * Shows only the PDF/image dropzone and file picker
 */

import React, { useRef } from 'react';
import { UploadCloud, FileText, Sparkles } from 'lucide-react';
import { SAMPLE_DOCUMENTS, SampleDocMeta } from '../utils/sampleDocuments';

interface UploadDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  onLoadSample: (sample: SampleDocMeta) => void;
  isProcessing: boolean;
}

export const UploadDropzone: React.FC<UploadDropzoneProps> = ({
  onFilesSelected,
  onLoadSample,
  isProcessing,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(Array.from(e.dataTransfer.files));
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[85vh] px-4 py-8 select-none">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,image/jpeg,image/png,image/webp"
        onChange={(e) => {
          if (e.target.files) {
            onFilesSelected(Array.from(e.target.files));
          }
        }}
        className="hidden"
      />

      <div className="w-full max-w-xl flex flex-col items-center text-center space-y-6">
        {/* Brand Kicker */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-xs font-medium text-neutral-300">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Document Quality & Inverse Optimizer</span>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Upload Document or PDF
          </h1>
          <p className="text-sm text-neutral-400 mt-2 max-w-md mx-auto">
            Drop your badly scanned or photographed document to automatically whiten paper, remove shadows, and optimize ink.
          </p>
        </div>

        {/* Clean Drop Area */}
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="w-full p-8 sm:p-12 rounded-2xl border-2 border-dashed border-neutral-700 hover:border-indigo-500 bg-neutral-900/60 hover:bg-neutral-900 transition-all cursor-pointer flex flex-col items-center justify-center gap-4 group"
        >
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center group-hover:scale-105 group-hover:bg-indigo-600/20 transition-transform">
            <UploadCloud className="w-8 h-8" />
          </div>

          <div>
            <p className="text-base font-semibold text-white">
              Drag & drop your PDF or images here
            </p>
            <p className="text-xs text-neutral-400 mt-1">
              Supports multi-page PDF documents, JPG, PNG, and WebP
            </p>
          </div>

          <button
            type="button"
            className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors mt-2"
          >
            Browse Files
          </button>
        </div>

        {/* Sample Docs as subtle text links */}
        <div className="pt-2 text-xs text-neutral-400">
          <span>Or test with a sample:</span>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
            {SAMPLE_DOCUMENTS.map((sample) => (
              <button
                key={sample.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onLoadSample(sample);
                }}
                className="px-2.5 py-1 rounded-md bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white transition-colors"
              >
                {sample.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
