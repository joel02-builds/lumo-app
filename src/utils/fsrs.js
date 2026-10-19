/**
 * FSRS-6 Implementierung für Lumo
 * ─────────────────────────────────────────────────────────────────────────────
 * Bibliothek: ts-fsrs (v5.4.2)
 * Algorithmus: Free Spaced Repetition Scheduler v6
 *
 * Warum FSRS-6 statt SM-2?
 * ─────────────────────────
 * SM-2 (1987) optimiert die Intervalle auf Basis einer einzigen Kennzahl (ease
 * factor). FSRS-6 modelliert explizit drei Lernparameter:
 *
 *   D (Difficulty, 0–10)  – intrinsische Schwierigkeit des Konzepts
 *   S (Stability, Tage)   – wie viele Tage, bis die Erinnerung auf 90% fällt
 *   R (Retrievability, %) – aktuell geschätzte Abrufwahrscheinlichkeit
 *
 * In Open-Source-Benchmarks benötigt FSRS-6 ca. 20–30% weniger Wiederholungen
 * als SM-2 für denselben Retentionswert. Für ADHS-Nutzer ist das kritisch:
 * weniger erzwungene Karten = mehr Motivation.
 *
 * Rating-Mapping:
 * ───────────────
 * Lumo nutzt 4 UI-Stufen:
 *   0 = "Keine Ahnung" → Rating.Again (1)
 *   1 = "Schwer"       → Rating.Hard (2)
 *   2 = "Mittel"       → Rating.Good (3)
 *   3 = "Leicht"       → Rating.Easy (4)
 *
 * Legacy SM-2 Daten:
 * ──────────────────
 * Existierende Karteikarten (mit easeFactor/interval/repetitions) werden
 * automatisch migriert. SM-2-Karten bekommen FSRS-Parameter zugewiesen,
 * die ihrem bisherigen Lernstand entsprechen.
 */

import { createEmptyCard, fsrs, generatorParameters, Rating, State } from 'ts-fsrs';

// ─── FSRS-Instanz mit Standardparametern ──────────────────────────────────

const params = generatorParameters({ enable_fuzz: true });
const f = fsrs(params);

// ─── Rating-Mapping ────────────────────────────────────────────────────────

/**
 * Konvertiert Lumo-Quality (0–3) zu FSRS Rating.
 * 0 = Keine Ahnung → Again
 * 1 = Schwer       → Hard
 * 2 = Mittel       → Good
 * 3 = Leicht       → Easy
 */
export function qualityToRating(quality) {
  switch (quality) {
    case 0:  return Rating.Again;
    case 1:  return Rating.Hard;
    case 2:  return Rating.Good;
    case 3:  return Rating.Easy;
    default: return Rating.Good;
  }
}

// ─── SM-2 → FSRS Migration ────────────────────────────────────────────────

/**
 * Prüft ob eine Karte noch SM-2 Format hat (kein `fsrs`-Feld).
 */
export function needsMigration(card) {
  return !card.fsrs && (card.easeFactor !== undefined || card.interval !== undefined);
}

/**
 * Migriert eine SM-2 Karte zu FSRS-Format.
 *
 * Mapping-Logik:
 * - Neue Karte (repetitions=0): FSRS New State
 * - Wenige Wiederholungen (1-2): FSRS Learning State, kurze Stabilität
 * - Lernend (3-4): FSRS Review State, Stabilität aus SM-2 Interval
 * - Gemeistert (>=5): FSRS Review State, hohe Stabilität
 */
export function migrateSM2ToFSRS(card) {
  const rep = card.repetitions || 0;
  const interval = card.interval || 1;

  let fsrsCard = createEmptyCard();

  if (rep === 0) {
    // Neue Karte — unverändert lassen
    return { ...card, fsrs: fsrsCard, _algorithm: 'fsrs6' };
  }

  // SM-2 Interval als Stabilität verwenden
  // Stabilität ≈ halbes Interval (FSRS-Intervall ist bei R=0.9 etwas kürzer als SM-2)
  const estimatedStability = Math.max(1, interval * 0.8);
  const difficulty = Math.max(1, Math.min(10,
    6 - (card.easeFactor - 1.3) / (2.5 - 1.3) * 5
  ));

  fsrsCard = {
    ...fsrsCard,
    state: rep >= 5 ? State.Review : rep >= 2 ? State.Review : State.Learning,
    difficulty,
    stability: estimatedStability,
    due: card.nextReview ? new Date(card.nextReview) : new Date(),
    last_review: card.lastReview ? new Date(card.lastReview) : new Date(Date.now() - interval * 86400000),
    reps: rep,
    lapses: 0,
    elapsed_days: interval,
    scheduled_days: interval,
    retrievability: 0.9,
  };

  return {
    ...card,
    fsrs: fsrsCard,
    _algorithm: 'fsrs6',
    _migratedFromSM2: true,
  };
}

// ─── Kernfunktion: Nächste Wiederholung berechnen ─────────────────────────

/**
 * Berechnet den nächsten Wiederholungszeitpunkt mit FSRS-6.
 *
 * @param {object} card - Die Karteikarte (mit oder ohne fsrs-Feld)
 * @param {number} quality - 0..3 (Keine Ahnung → Leicht)
 * @returns {object} Aktualisierte Karteikarte-Properties zum Mergen
 */
export function calculateNextReview(card, quality) {
  // Migration wenn nötig
  let workCard = needsMigration(card) ? migrateSM2ToFSRS(card) : card;

  // FSRS Card initialisieren oder aus bestehenden Daten laden
  const fsrsCard = workCard.fsrs || createEmptyCard();
  const rating = qualityToRating(quality);
  const now = new Date();

  let schedulingResult;
  try {
    // FSRS-Scheduling-Algorithmus ausführen
    const cards = f.repeat(fsrsCard, now);
    schedulingResult = cards[rating];
  } catch {
    // Fallback bei FSRS-Fehler: einfaches exponentielles Backoff
    const days = quality === 0 ? 1 : quality === 1 ? 2 : quality === 2 ? 4 : 7;
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + days);
    return {
      nextReview: nextReview.toISOString(),
      status: quality >= 2 ? 'learning' : 'new',
      _algorithm: 'fallback',
    };
  }

  const updatedCard = schedulingResult.card;
  const interval = schedulingResult.card.scheduled_days || 1;

  // Status ableiten aus FSRS State
  let status;
  switch (updatedCard.state) {
    case State.New:      status = 'new';      break;
    case State.Learning: status = 'learning'; break;
    case State.Relearning: status = 'learning'; break;
    case State.Review:   status = interval >= 21 ? 'mastered' : 'review'; break;
    default:             status = 'learning';
  }

  return {
    fsrs: updatedCard,
    nextReview: updatedCard.due.toISOString(),
    lastReview: now.toISOString(),
    interval,
    difficulty: updatedCard.difficulty,
    stability: updatedCard.stability,
    retrievability: updatedCard.retrievability,
    status,
    _algorithm: 'fsrs6',
  };
}

// ─── Fälligkeits-Utilities ────────────────────────────────────────────────

/**
 * Prüft ob eine Karte fällig ist.
 * FSRS verwendet `due` in der fsrs-Unterstruktur, SM-2 legacy verwendet `nextReview`.
 */
export function isDueForReview(card) {
  const dueDate = card.fsrs?.due
    ? new Date(card.fsrs.due)
    : card.nextReview
      ? new Date(card.nextReview)
      : new Date(0);
  return dueDate <= new Date();
}

/**
 * Gibt alle fälligen Karten zurück (gemastertes ausgenommen).
 */
export function getDueCards(flashcards) {
  return flashcards.filter(card =>
    card.status !== 'mastered' && isDueForReview(card)
  );
}

/**
 * Gibt alle Karten zurück die in den nächsten `days` Tagen fällig werden.
 * Nützlich für "Preview" und Planung.
 */
export function getUpcomingCards(flashcards, days = 7) {
  const cutoff = new Date(Date.now() + days * 86400000);
  return flashcards.filter(card => {
    const due = card.fsrs?.due ? new Date(card.fsrs.due) : card.nextReview ? new Date(card.nextReview) : null;
    return due && due <= cutoff && card.status !== 'mastered';
  });
}

/**
 * Berechnet die geschätzte Erinnerbarkeit (0–100%) für eine Karte.
 * Basiert auf FSRS Retrievability, fällt zurück auf Heuristik.
 */
export function getRetentionPercent(card) {
  if (card.retrievability !== undefined) {
    return Math.round(card.retrievability * 100);
  }
  if (!card.nextReview) return 100;
  const daysSinceReview = (new Date() - new Date(card.lastReview || card.nextReview)) / 86400000;
  const stability = card.stability || card.interval || 1;
  return Math.round(Math.pow(0.9, daysSinceReview / stability) * 100);
}

// ─── buildInterleavedQueue re-export von sm2.js ───────────────────────────
// Die Queue-Logik ist algorithmisch unabhängig (nur Sortierung/Reihenfolge),
// deshalb wird sie aus sm2.js wiederverwendet.
export { buildInterleavedQueue } from './sm2.js';
