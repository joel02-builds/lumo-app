/**
 * Fortschritts-Zähler (rein, ohne Browser-/Netzwerk-Abhängigkeiten)
 * ─────────────────────────────────────────────────────────────────────────────
 * Vorher privat in serverSync.js. Jetzt hier, weil sowohl der Server-Merge
 * (serverSync.js) als auch der Tab-Abgleich (tabSync.js) denselben Maßstab
 * brauchen – und weil serverSync.js `import.meta.env` nutzt und sich nicht in
 * einem Node-Test laden lässt.
 *
 * Gewichtung der Blöcke/Zähler unverändert (10 / 5 / 10 / 3 / 2).
 * NEU (F009): Karten-Wiederholungen zählen mit je 1 – gelesen aus dem
 * bestehenden Feld card.fsrs.reps (bzw. card.reps). Kein Formatwechsel; Stände
 * ohne Karten ergeben exakt denselben Wert wie vorher.
 */

/** Anzahl bisheriger Wiederholungen einer Karte (0, wenn unbekannt). */
export function cardReps(card) {
  const n = card?.fsrs?.reps ?? card?.reps;
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function countProgress(state) {
  if (!state) return 0;
  let count = 0;
  // Aktiver Block-Fortschritt
  if (Array.isArray(state.blocks)) {
    count += state.blocks.filter(b => b.status === 'completed').length * 10;
    count += state.blocks.filter(b => b.confidence === 'sicher').length * 5;
  }
  // Alle Projekte
  if (Array.isArray(state.projects)) {
    state.projects.forEach(p => {
      if (Array.isArray(p.blocks)) {
        count += p.blocks.filter(b => b.status === 'completed').length * 10;
      }
    });
  }
  // Gesamtzähler
  count += (state.blocksAnalyzedTotal || 0) * 3;
  count += (state.sessionsTotal || 0) * 2;
  // Karten-Wiederholungen (F009)
  if (Array.isArray(state.flashcards)) {
    for (const c of state.flashcards) count += cardReps(c);
  }
  return count;
}
