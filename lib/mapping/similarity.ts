/**
 * Fuzzy name matching used only to *suggest* a COSEC <-> Frappe employee
 * mapping — the suggestion is always subject to human confirmation
 * (lib/mapping/suggest.ts), never auto-saved. Built and tuned against real
 * name pairs seen between this COSEC device and this Frappe instance, e.g.
 * "DINESH CHOURASIA" (COSEC) vs "DINESH CHAURASIA" (Frappe), and
 * "JIGARKUMAR J PADHIYAR" vs "JIGAR PADHIYAR" (extra token + middle initial).
 */

// Single-character tokens (middle initials like "J", "R") carry little
// discriminative signal and desynchronize token counts between the two
// systems, so they're dropped before comparison.
export function normalizeTokens(name: string): string[] {
  return name
    .toUpperCase()
    .replace(/[^A-Z\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1);
}

function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i++) {
    let prevDiagonal = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prevDiagonal : 1 + Math.min(prevDiagonal, dp[j], dp[j - 1]);
      prevDiagonal = temp;
    }
  }

  return dp[b.length];
}

const MIN_TOKEN_SIMILARITY = 0.7;

function tokenMatchScore(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a))) return 0.9;

  const distance = levenshtein(a, b);
  const similarity = 1 - distance / Math.max(a.length, b.length);
  return similarity >= MIN_TOKEN_SIMILARITY ? similarity : 0;
}

/**
 * Token-overlap similarity, 0..1. Each token in the shorter name is greedily
 * paired with its best unused match in the other name, tolerant of reordered
 * tokens, an extra middle/maiden name on one side, and minor spelling drift.
 */
export function tokenSimilarity(nameA: string, nameB: string): number {
  const tokensA = normalizeTokens(nameA);
  const tokensB = normalizeTokens(nameB);
  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  const usedB = new Set<number>();
  let totalScore = 0;

  for (const tokenA of tokensA) {
    let bestScore = 0;
    let bestIndex = -1;
    tokensB.forEach((tokenB, index) => {
      if (usedB.has(index)) return;
      const score = tokenMatchScore(tokenA, tokenB);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });
    if (bestIndex >= 0) {
      usedB.add(bestIndex);
      totalScore += bestScore;
    }
  }

  return totalScore / Math.min(tokensA.length, tokensB.length);
}
