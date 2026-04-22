/**
 * Extremely rough token estimate used for UI feedback only.
 * Not accurate enough for billing; use provider usage counters when available.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  // ~4 chars per token is a common heuristic for English prose.
  return Math.max(1, Math.round(text.length / 4));
}
