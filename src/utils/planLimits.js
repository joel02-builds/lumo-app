export const FREE_BLOCK_LIMIT = 20;

export function isFreeLimitReached(blocksAnalyzedTotal) {
  return blocksAnalyzedTotal >= FREE_BLOCK_LIMIT;
}

export function getRemainingFreeBlocks(blocksAnalyzedTotal) {
  return Math.max(0, FREE_BLOCK_LIMIT - blocksAnalyzedTotal);
}
