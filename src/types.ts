export interface KmpResult {
  pattern: string;
  lps: number[];
  matches: number[];
  steps: string[];
}

export interface RabinKarpResult {
  pattern: string;
  patternHash: number;
  matches: { index: number; hashCollisions: number }[];
  steps: string[];
}

export interface DetectionResult {
  kmp: KmpResult[];
  rabinKarp: RabinKarpResult[];
  combinedMatches: { index: number; length: number; pattern: string; algorithm: 'KMP' | 'Rabin-Karp' | 'Both' }[];
}

export interface AnalysisPayload {
  text: string;
  patterns: string[];
}

export interface FactCheckReport {
  classification: 'True' | 'False' | 'Suspicious' | 'Potential Misinformation' | 'Opinion' | 'Verification Inconclusive';
  riskScore: number; // 0-100
  detectedIndicators: string[];
  factVerification: 'TRUE' | 'FALSE' | 'OPINION' | 'INCONCLUSIVE';
  correctInformation: string;
  toneAnalysis: string;
  contextAnalysis: string;
  reasoning: string;
  recommendedSources: string[];
  rawOutput: string; // The exact requested text formatted block
  isOfflineFallback?: boolean;
}
