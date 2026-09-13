// Gemeinsame Logik für Dashboard und Willkommen-zurück-Screen: ein
// in Bearbeitung befindlicher Block hat Vorrang, sonst der erste noch nicht
// gestartete Block in der empfohlenen Reihenfolge.
export function getRecommendedBlock(blocks, recommendedOrder) {
  const inProgress = blocks.find((b) => b.status === 'in-progress');
  if (inProgress) return inProgress;
  return recommendedOrder.map((id) => blocks.find((b) => b.id === id)).find((b) => b && b.status === 'not-started');
}
