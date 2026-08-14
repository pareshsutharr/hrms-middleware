import { tokenSimilarity } from "./similarity";

export interface FrappeEmployeeCandidate {
  /** Frappe Employee doc name, e.g. "HR-EMP-00021". */
  id: string;
  name: string;
}

export interface MatchSuggestion {
  employeeId: string;
  employeeName: string;
  score: number;
}

const MIN_SUGGESTION_SCORE = 0.5;

/**
 * Best-guess Frappe employee match for a COSEC employee name — a suggestion
 * to pre-fill in the UI, never applied automatically. Every mapping still
 * requires an explicit confirm click (see app/api/mappings/route.ts).
 */
export function suggestFrappeMatch(
  cosecName: string,
  candidates: FrappeEmployeeCandidate[]
): MatchSuggestion | null {
  let best: MatchSuggestion | null = null;

  for (const candidate of candidates) {
    const score = tokenSimilarity(cosecName, candidate.name);
    if (score >= MIN_SUGGESTION_SCORE && (!best || score > best.score)) {
      best = { employeeId: candidate.id, employeeName: candidate.name, score };
    }
  }

  return best;
}
