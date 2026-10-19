export const FREE_BLOCK_LIMIT = 20;
// Frühwarnung: ab diesem Schwellenwert zeigen wir die Amber-Warnung
export const FREE_BLOCK_WARN_THRESHOLD = 3;

export function isFreeLimitReached(blocksAnalyzedTotal) {
  return blocksAnalyzedTotal >= FREE_BLOCK_LIMIT;
}

export function getRemainingFreeBlocks(blocksAnalyzedTotal) {
  return Math.max(0, FREE_BLOCK_LIMIT - blocksAnalyzedTotal);
}

/**
 * Gibt zurück ob der Nutzer dem Free-Limit nahe ist (≤ WARN_THRESHOLD Blöcke übrig).
 * Zeigt Warnung FRÜH genug, damit er sich vorbereiten kann — nicht erst wenn es zu spät ist.
 * ADHS-Design: Frühwarnung statt Überraschung → reduziert Frustration.
 */
export function isApproachingLimit(blocksAnalyzedTotal) {
  const remaining = getRemainingFreeBlocks(blocksAnalyzedTotal);
  return remaining > 0 && remaining <= FREE_BLOCK_WARN_THRESHOLD;
}
