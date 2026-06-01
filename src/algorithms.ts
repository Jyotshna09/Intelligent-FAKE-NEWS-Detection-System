import { KmpResult, RabinKarpResult } from './types';

export function computeLps(pattern: string): number[] {
  const lps = new Array(pattern.length).fill(0);
  let len = 0;
  let i = 1;
  while (i < pattern.length) {
    if (pattern[i] === pattern[len]) {
      len++;
      lps[i] = len;
      i++;
    } else {
      if (len !== 0) {
        len = lps[len - 1];
      } else {
        lps[i] = 0;
        i++;
      }
    }
  }
  return lps;
}

export function runKmp(text: string, pattern: string): KmpResult {
  const steps: string[] = [];
  const matches: number[] = [];

  if (!pattern || !text || pattern.length > text.length) {
    return { pattern, lps: [], matches: [], steps: ['Pattern empty, longer than text, or text empty. Skipping.'] };
  }

  const pLower = pattern.toLowerCase();
  const tLower = text.toLowerCase();
  const lps = computeLps(pLower);
  steps.push(`LPS Table for "${pattern}": [${lps.join(', ')}]`);

  let i = 0; // text index
  let j = 0; // pattern index
  const N = tLower.length;
  const M = pLower.length;

  while (i < N) {
    if (tLower[i] === pLower[j]) {
      i++;
      j++;
    }

    if (j === M) {
      const matchIndex = i - j;
      matches.push(matchIndex);
      steps.push(`[KMP SUCCESS] Full pattern match verified at text start index ${matchIndex}.`);
      j = lps[j - 1];
    } else if (i < N && tLower[i] !== pLower[j]) {
      if (j !== 0) {
        steps.push(`[KMP SHIFT] Mismatch at text[${i}] ("${text[i]}") & pattern[${j}] ("${pattern[j]}"). Shifting pattern to LPS[${j - 1}] = ${lps[j - 1]}`);
        j = lps[j - 1];
      } else {
        steps.push(`[KMP ADVANCE] Mismatch at text[${i}] ("${text[i]}"). Advancing text pointer to ${i + 1}`);
        i++;
      }
    }
  }

  return { pattern, lps, matches, steps };
}

export function runRabinKarp(text: string, pattern: string): RabinKarpResult {
  const steps: string[] = [];
  const matches: { index: number; hashCollisions: number }[] = [];

  if (!pattern || !text || pattern.length > text.length) {
    return { pattern, patternHash: 0, matches: [], steps: ['Pattern empty, longer than text, or text empty. Skipping.'] };
  }

  const pLower = pattern.toLowerCase();
  const tLower = text.toLowerCase();
  const N = tLower.length;
  const M = pLower.length;

  const d = 256;      // radix/alphabet size
  const q = 101;      // prime modulo
  let h = 1;          // d^(M-1) % q

  for (let i = 0; i < M - 1; i++) {
    h = (h * d) % q;
  }

  let pHash = 0;
  let tHash = 0;

  // Calculate initial hashes
  for (let i = 0; i < M; i++) {
    pHash = (d * pHash + pLower.charCodeAt(i)) % q;
    tHash = (d * tHash + tLower.charCodeAt(i)) % q;
  }

  steps.push(`Pattern "${pattern}" target hash (mod ${q}) is calculated as: ${pHash}`);

  let collisionCount = 0;
  for (let i = 0; i <= N - M; i++) {
    const substring = text.substring(i, i + M);
    steps.push(`[RK CHECK] Window [${i}...${i + M - 1}] "${substring}": Hash value = ${tHash}`);

    if (pHash === tHash) {
      steps.push(`[RK HASH MATCH] Hash match found at index ${i}! Verifying character-by-character...`);
      let j = 0;
      for (j = 0; j < M; j++) {
        if (tLower[i + j] !== pLower[j]) {
          break;
        }
      }

      if (j === M) {
        matches.push({ index: i, hashCollisions: collisionCount });
        steps.push(`[RK SUCCESS] Confirmed pattern match at index ${i}!`);
      } else {
        collisionCount++;
        steps.push(`[RK COLLISION] Spurious collision at index ${i}! Hashes matched but actual strings model differed.`);
      }
    }

    // Rolling hash calculations for next window
    if (i < N - M) {
      tHash = (d * (tHash - tLower.charCodeAt(i) * h) + tLower.charCodeAt(i + M)) % q;
      if (tHash < 0) {
        tHash = tHash + q;
      }
    }
  }

  return {
    pattern,
    patternHash: pHash,
    matches,
    steps
  };
}

/**
 * Searches the text using both KMP and Rabin-Karp on multiple target keywords.
 */
export function analyzePatterns(text: string, patterns: string[]) {
  const kmpResults: KmpResult[] = [];
  const rkResults: RabinKarpResult[] = [];
  
  // Combine all matches into a consistent position map for visual highlighting
  const combinedMatches: { index: number; length: number; pattern: string; algorithm: 'KMP' | 'Rabin-Karp' | 'Both' }[] = [];

  for (const pattern of patterns) {
    if (!pattern.trim()) continue;
    const kmp = runKmp(text, pattern);
    const rk = runRabinKarp(text, pattern);

    kmpResults.push(kmp);
    rkResults.push(rk);

    const kmpSet = new Set(kmp.matches);
    const rkIndices = rk.matches.map(m => m.index);
    const rkSet = new Set(rkIndices);

    // Merge match positions
    const allMatches = Array.from(new Set([...kmp.matches, ...rkIndices])).sort((a, b) => a - b);
    for (const index of allMatches) {
      let algo: 'KMP' | 'Rabin-Karp' | 'Both' = 'Both';
      if (kmpSet.has(index) && !rkSet.has(index)) algo = 'KMP';
      else if (!kmpSet.has(index) && rkSet.has(index)) algo = 'Rabin-Karp';

      combinedMatches.push({
        index,
        length: pattern.length,
        pattern,
        algo
      } as any);
    }
  }

  return {
    kmp: kmpResults,
    rabinKarp: rkResults,
    combinedMatches
  };
}
