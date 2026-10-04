/**
 * Modal to quickly pick and load test document scenarios
 */

import React from 'react';
import { X, Sparkles, Check } from 'lucide-react';
import { SAMPLE_DOCUMENTS, SampleDocMeta } from '../utils/sampleDocuments';

interface SampleSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSample: (sample: SampleDocMeta) => void;
}

export const SampleSelectionModal: React.FC<SampleSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectSample,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs select-none">
      <div className="relative w-full max-w-xl rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl p-6 text-neutral-100">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white">Load Test Document Scenario</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-4 space-y-3">
          {SAMPLE_DOCUMENTS.map((sample) => (
            <div
              key={sample.id}
              onClick={() => {
                onSelectSample(sample);
                onClose();
              }}
              className="p-3.5 rounded-xl bg-neutral-800/60 hover:bg-neutral-800 border border-neutral-700/60 hover:border-neutral-600 cursor-pointer transition-all flex items-start justify-between gap-3 group"
            >
              <div>
                <span className="text-xs font-semibold text-indigo-400 group-hover:text-indigo-300">
                  {sample.label}
                </span>
                <h4 className="text-sm font-semibold text-white mt-0.5">{sample.name}</h4>
                <p className="text-xs text-neutral-400 mt-1">{sample.description}</p>
              </div>

              <div className="shrink-0 mt-1 px-3 py-1.5 rounded-lg bg-neutral-700/50 group-hover:bg-indigo-600 group-hover:text-white text-neutral-300 text-xs font-medium transition-colors">
                Load
              </div>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-neutral-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
