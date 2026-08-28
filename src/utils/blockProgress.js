// Gemeinsame Logik für Dashboard und Willkommen-zurück-Screen: ein
// in Bearbeitung befindlicher Block hat Vorrang, sonst der erste noch nicht
// gestartete Block in der empfohlenen Reihenfolge.
export function getRecommendedBlock(blocks, recommendedOrder) {
  const inProgress = blocks.find((b) => b.status === 'in-progress');
  if (inProgress) return inProgress;
  return recommendedOrder.map((id) => blocks.find((b) => b.id === id)).find((b) => b && b.status === 'not-started');
}

// Zählt Blöcke, deren completedAt-Zeitstempel auf das heutige Kalenderdatum
// fällt – wichtig, weil Projekte über Tage hinweg via localStorage
// weiterlaufen können, "heute" also nicht gleich "insgesamt" ist.
export function countCompletedToday(blocks) {
  const today = new Date().toDateString();
  return blocks.filter((b) => b.completedAt && new Date(b.completedAt).toDateString() === today).length;
}
