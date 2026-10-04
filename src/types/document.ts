/**
 * Types and interfaces for Document Quality Analyzer & Inverse Processing Optimizer
 */

export type InversionMode = 
  | 'none'
  | 'invert_full'          // Dark mode / Blackboard to clean white paper
  | 'ink_saver_outline'    // Stroke / edge extraction: turn solid fills into outlines
  | 'ink_saver_toner'      // Grayscale washout curve: 0% gray background, high-contrast text
  | 'blueprint_invert'     // Blue/white inverted technical drawing
  | 'high_contrast_mono';  // Strict 1-bit black & white binarization

export interface ProcessingSettings {
  exposure: number;           // -1.0 to 1.0 (default 0)
  gamma: number;              // 0.4 to 2.5 (default 1.0)
  contrast: number;           // 0.5 to 2.5 (default 1.0)
  blackPoint: number;         // 0 to 120 (level shadows cutoff, default 15)
  whitePoint: number;         // 140 to 255 (background paper cutoff, default 240)
  saturation: number;         // 0.0 to 1.5 (0 = pure grayscale, 1 = normal color)
  colorTemp: number;          // -100 to +100 (- = cooler/blue, + = warmer)
  illuminationCorrection: number; // 0 to 100% (2D background subtraction to kill shadows)
  adaptiveThreshold: number;  // 0 to 100% (blend between smooth levels & local Sauvola threshold)
  sharpen: number;            // 0 to 100% (unsharp mask edge enhancement)
  denoise: number;            // 0 to 100% (background artifact reduction)
  deskew: number;             // -15 to +15 degrees
  inversionMode: InversionMode;
  inkSaverStrength: number;   // 0 to 100%
  preserveSignatures: boolean;// Preserve colorful stamps & signatures (red, blue ink)
}

export interface QualityMetrics {
  backgroundLuminance: number;     // 0-255 (low = dark/gray paper, high = white)
  backgroundUniformity: number;    // 0-100% (variance across spatial tiles)
  illuminationGradient: number;    // 0-100 (severity of uneven lighting/shadow)
  colorCast: {
    detected: 'none' | 'yellow' | 'blue' | 'red' | 'gray' | 'dark';
    intensity: number;             // 0-100%
    dominantHex: string;
    description: string;
  };
  textContrast: number;            // 0-100 (peak separation between text & background)
  faintTextDetected: boolean;
  sharpnessScore: number;          // 0-100 (Laplacian edge energy)
  noiseScore: number;              // 0-100 (high-frequency grain in flat regions)
  detectedSkewAngle: number;       // degrees (-5 to +5)
  isDarkDocument: boolean;         // Average luminance < 100 (negative/dark mode)
  estimatedInkCoverage: number;    // 0-100% (estimated toner used on print)
}

export interface DiagnosticReason {
  problem: string;
  measuredMetric: string;
  suggestedAction: string;
  affectedSettings: Partial<ProcessingSettings>;
  severity: 'low' | 'medium' | 'high';
}

export interface CandidatePreset {
  id: string;
  title: string;
  description: string;
  settings: ProcessingSettings;
  score: {
    overall: number;            // 0-100 composite score
    backgroundCleanliness: number;
    textPreservation: number;
    readabilityScore: number;
    inkEfficiency: number;
  };
  tag: string;
}

export interface DocumentPage {
  id: string;
  pageNumber: number;
  originalName: string;
  sourceUrl: string;             // original image data URL
  width: number;
  height: number;
  rotation: number;              // 0, 90, 180, 270 degrees
  metrics: QualityMetrics;
  reasons: DiagnosticReason[];
  suggestedSettings: ProcessingSettings;
  currentSettings: ProcessingSettings;
  candidates: CandidatePreset[];
  processedThumbnailUrl?: string;
  isProcessing?: boolean;
}

export interface BatchProgress {
  total: number;
  current: number;
  status: string;
  isExporting: boolean;
}
