/**
 * Diagnostics & Quality Analysis Panel
 * Answers: "Why did the algorithm choose these settings?"
 * Displays measured image quality metrics and evaluates candidate transformations
 * against a document quality scoring model.
 */

import React from 'react';
import { AlertCircle, CheckCircle2, Sliders, Sparkles, Layers, Zap, Info } from 'lucide-react';
import { DocumentPage, CandidatePreset, ProcessingSettings } from '../types/document';

interface DiagnosticsPanelProps {
  page: DocumentPage;
  onApplyCandidate: (candidate: CandidatePreset) => void;
  onApplySuggested: (settings: ProcessingSettings) => void;
  onClose?: () => void;
}

export const DiagnosticsPanel: React.FC<DiagnosticsPanelProps> = ({
  page,
  onApplyCandidate,
  onApplySuggested,
}) => {
  const m = page.metrics;
  const reasons = page.reasons;

  return (
    <div className="h-full overflow-y-auto bg-neutral-950 p-6 text-neutral-100 space-y-8 scrollbar-thin scrollbar-thumb-neutral-800">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-neutral-900 border border-neutral-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-indigo-400">
              Inverse Parameter Derivation Engine
            </span>
            <span aria-hidden="true" className="text-neutral-600">·</span>
            <span className="text-xs text-neutral-400">Page #{page.pageNumber}</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            Document Quality Diagnostics & Rationale
          </h2>
          <p className="text-xs text-neutral-400 mt-1 max-w-2xl">
            Statistical breakdown of paper illumination, color cast, stroke sharpness, and the mathematical justification for recommended adjustments.
          </p>
        </div>

        <button
          onClick={() => onApplySuggested(page.suggestedSettings)}
          className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm shadow-indigo-600/30 transition-colors whitespace-nowrap self-start md:self-center"
        >
          <Sparkles className="w-4 h-4" />
          <span>Apply Recommended Settings</span>
        </button>
      </div>

      {/* 2. Measured Quality Telemetry Grid */}
      <div>
        <h3 className="text-sm font-semibold text-neutral-200 mb-3 flex items-center gap-2">
          <span>01. Image Quality Statistical Analysis</span>
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Background Luminance */}
          <div className="p-3.5 rounded-lg bg-neutral-900 border border-neutral-800/80">
            <div className="text-[11px] font-medium text-neutral-400">Paper Luminance</div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-bold font-mono tabular-nums text-white">
                {m.backgroundLuminance}
              </span>
              <span className="text-xs text-neutral-500 font-mono">/ 255</span>
            </div>
            <div className="mt-2 w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-indigo-500 h-full rounded-full"
                style={{ width: `${(m.backgroundLuminance / 255) * 100}%` }}
              />
            </div>
            <div className="mt-1 text-[10px] text-neutral-400">
              {m.backgroundLuminance > 230 ? 'Near pure white' : m.backgroundLuminance < 110 ? 'Dark / Inverted' : 'Gray / Underexposed'}
            </div>
          </div>

          {/* Illumination Gradient */}
          <div className="p-3.5 rounded-lg bg-neutral-900 border border-neutral-800/80">
            <div className="text-[11px] font-medium text-neutral-400">Lighting Gradient / Shadow</div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-bold font-mono tabular-nums text-white">
                {m.illuminationGradient}%
              </span>
            </div>
            <div className="mt-2 w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${m.illuminationGradient > 40 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${m.illuminationGradient}%` }}
              />
            </div>
            <div className="mt-1 text-[10px] text-neutral-400">
              {m.illuminationGradient > 30 ? 'Phone / fold shadow detected' : 'Evenly illuminated'}
            </div>
          </div>

          {/* Text Contrast */}
          <div className="p-3.5 rounded-lg bg-neutral-900 border border-neutral-800/80">
            <div className="text-[11px] font-medium text-neutral-400">Text-to-Paper Contrast</div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-bold font-mono tabular-nums text-white">
                {m.textContrast}%
              </span>
            </div>
            <div className="mt-2 w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${m.textContrast < 45 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                style={{ width: `${m.textContrast}%` }}
              />
            </div>
            <div className="mt-1 text-[10px] text-neutral-400">
              {m.faintTextDetected ? 'Faint text detected' : 'Clear character separation'}
            </div>
          </div>

          {/* Color Cast */}
          <div className="p-3.5 rounded-lg bg-neutral-900 border border-neutral-800/80">
            <div className="text-[11px] font-medium text-neutral-400">Color Cast Balance</div>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                style={{ backgroundColor: m.colorCast.dominantHex }}
              />
              <span className="text-base font-semibold text-white truncate capitalize">
                {m.colorCast.detected === 'none' ? 'Neutral' : `${m.colorCast.detected} (+${m.colorCast.intensity}%)`}
              </span>
            </div>
            <div className="mt-2 text-[10px] text-neutral-400 truncate">
              {m.colorCast.description}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Why did the algorithm choose these settings? (Reasoning Engine) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
            <span>02. Why Did the Algorithm Choose These Settings?</span>
          </h3>
          <span className="text-xs text-neutral-500">
            {reasons.length} condition{reasons.length === 1 ? '' : 's'} identified
          </span>
        </div>

        {reasons.length === 0 ? (
          <div className="p-4 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-neutral-400 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>Document appears optimal! Only subtle contrast balance was applied.</span>
          </div>
        ) : (
          <div className="space-y-3">
            {reasons.map((reason, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        reason.severity === 'high'
                          ? 'bg-rose-500'
                          : reason.severity === 'medium'
                          ? 'bg-amber-500'
                          : 'bg-indigo-400'
                      }`}
                    />
                    <h4 className="text-sm font-semibold text-white">{reason.problem}</h4>
                  </div>

                  <span className="text-[11px] font-mono text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded border border-neutral-700">
                    {reason.severity.toUpperCase()} IMPACT
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs mt-3 pt-3 border-t border-neutral-800/80">
                  <div>
                    <span className="text-neutral-500 block text-[11px] mb-0.5">Measurement Sensor</span>
                    <span className="text-neutral-300 font-medium">{reason.measuredMetric}</span>
                  </div>

                  <div>
                    <span className="text-neutral-500 block text-[11px] mb-0.5">Mathematical Inverse Action</span>
                    <span className="text-indigo-300 font-medium">{reason.suggestedAction}</span>
                  </div>
                </div>

                {/* Affected Parameters Badge List */}
                <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 text-[11px]">
                  <span className="text-neutral-500">Tuned Parameters:</span>
                  {Object.entries(reason.affectedSettings).map(([key, val]) => (
                    <span
                      key={key}
                      className="font-mono px-2 py-0.5 rounded bg-neutral-800 text-indigo-300 border border-neutral-700/80"
                    >
                      {key}: {String(val)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Multi-Candidate Transformations & Scoring Model */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-neutral-200">
              03. Candidate Transformations & Document-Quality Scoring Model
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              The optimizer searches through candidate processing permutations and scores each against readability, text preservation, and toner economy.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {page.candidates.map((cand) => (
            <div
              key={cand.id}
              className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between hover:border-neutral-700 transition-all"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-semibold text-indigo-400">{cand.tag}</span>
                  <div className="flex items-baseline gap-1 bg-neutral-800 px-2 py-0.5 rounded border border-neutral-700">
                    <span className="text-xs text-neutral-400">Score</span>
                    <span className="text-sm font-bold font-mono tabular-nums text-emerald-400">
                      {cand.score.overall}
                    </span>
                    <span className="text-[10px] text-neutral-500 font-mono">/100</span>
                  </div>
                </div>

                <h4 className="text-base font-semibold text-white mb-1">{cand.title}</h4>
                <p className="text-xs text-neutral-400 mb-4">{cand.description}</p>

                {/* Score Breakdown Bars */}
                <div className="space-y-2 text-xs mb-5">
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-neutral-400">Background Cleanliness</span>
                      <span className="font-mono text-neutral-300">{cand.score.backgroundCleanliness}%</span>
                    </div>
                    <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${cand.score.backgroundCleanliness}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-neutral-400">Text Edge Preservation</span>
                      <span className="font-mono text-neutral-300">{cand.score.textPreservation}%</span>
                    </div>
                    <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${cand.score.textPreservation}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-neutral-400">Print Toner Efficiency</span>
                      <span className="font-mono text-neutral-300">{cand.score.inkEfficiency}%</span>
                    </div>
                    <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
                      <div className="h-full bg-teal-500 rounded-full" style={{ width: `${cand.score.inkEfficiency}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onApplyCandidate(cand)}
                className="w-full py-2 px-3 text-xs font-medium rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white border border-neutral-700 transition-colors flex items-center justify-center gap-1.5"
              >
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                <span>Apply This Candidate</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
