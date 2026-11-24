// Fortschritt für „Mein Lernstand": Anteil ALLER Blöcke, nicht nur der bearbeiteten.
// Vorher zählte die Formel Konzept-Karten – und Blöcke ohne Karten (noch nicht geöffnet) fielen aus dem
// Nenner. Bei 1 von 6 Blöcken stand dort „100 % Starker Lernstand". Gespeicherte Daten bleiben unverändert;
// das hier liest nur status und confidence (siehe CLAUDE.md, Value-Vokabulare).
export function getBlockProgress(blocks) {
  const all = (blocks || []).filter(Boolean);
  const total = all.length;
  const understood = all.filter((b) => b.status === 'completed' && b.confidence === 'sicher').length;
  const percent = total > 0 ? Math.round((understood / total) * 100) : 0;
  const label = `${understood} von ${total} ${total === 1 ? 'Block' : 'Blöcken'} verstanden.`;
  return { total, understood, percent, label };
}
