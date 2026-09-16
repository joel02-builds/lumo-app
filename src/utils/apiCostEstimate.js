export const AVG_TOKENS_PER_CALL = { input: 800, output: 300 };
export const PRICE_PER_TOKEN = { input: 0.000003, output: 0.000015 };
export const COST_PER_CALL =
  (AVG_TOKENS_PER_CALL.input * PRICE_PER_TOKEN.input) +
  (AVG_TOKENS_PER_CALL.output * PRICE_PER_TOKEN.output);
export const API_CALLS_PER_BLOCK = 8;
export const COST_PER_BLOCK_SESSION = COST_PER_CALL * API_CALLS_PER_BLOCK;

export function estimateMonthlyCost(monthlyActiveUsers, blocksPerUser = 5) {
  const totalSessions = monthlyActiveUsers * blocksPerUser;
  const totalCost = totalSessions * COST_PER_BLOCK_SESSION;
  return {
    totalCost: totalCost.toFixed(2),
    perUser: (totalCost / monthlyActiveUsers).toFixed(3),
    breakEvenPrice: (totalCost / monthlyActiveUsers * 3).toFixed(2),
  };
}

// Beispiel: 100 aktive Nutzer, 5 Blöcke/Nutzer/Monat
// estimateMonthlyCost(100) → { totalCost: '27.60', perUser: '0.276', breakEvenPrice: '0.83' }
