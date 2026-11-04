/**
 * AUDIT-K-01 — FSRS Test-Suite
 *
 * Ausführung: node --test src/utils/fsrs.test.js
 * Keine zusätzlichen Flags nötig ("type": "module" in package.json).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyCard, State } from 'ts-fsrs';
import { calculateNextReview, isDueForReview } from './fsrs.js';

// ─── Hilfsfunktion: Reducer-Merge nachbilden ──────────────────────────────
// Entspricht genau appReducer.js UPDATE_FLASHCARD:
//   { ...card, ...updates, lastReviewed: new Date().toISOString() }
function applyReducerMerge(card, updates) {
  return { ...card, ...updates, lastReviewed: new Date().toISOString() };
}

// ─── Szenario 1 ───────────────────────────────────────────────────────────
// Neue Karte, quality=2 → fsrs6, learning
describe('S1: Neue Karte quality=2', () => {
  it('liefert fsrs6, status=learning, interval≥1, fsrs-Objekt', () => {
    const result = calculateNextReview({ id: 'c1', concept: 'x' }, 2);
    assert.equal(result._algorithm, 'fsrs6');
    assert.equal(result.status, 'learning');
    assert.ok(result.interval >= 1);
    assert.ok(result.fsrs != null);
    assert.ok(result.nextReview);
  });
});

// ─── Szenario 2 ───────────────────────────────────────────────────────────
// Neue Karte, quality=0 (Again)
// FSRS setzt neue Karte nach Again auf Learning, NICHT auf 'new'
describe('S2: Neue Karte quality=0', () => {
  it('liefert fsrs6, status=learning (nicht new)', () => {
    const result = calculateNextReview({ id: 'c2', concept: 'x' }, 0);
    assert.equal(result._algorithm, 'fsrs6');
    assert.equal(result.status, 'learning'); // verifiziert: nicht 'new'
    assert.ok(result.fsrs != null);
  });
});

// ─── Szenario 3 ───────────────────────────────────────────────────────────
// Kein fsrs-Feld → fällt auf createEmptyCard zurück
describe('S3: fsrs=null → createEmptyCard-Pfad', () => {
  it('liefert fsrs6, kein Fallback', () => {
    const result = calculateNextReview({ id: 'c3', concept: 'x', status: 'learning' }, 2);
    assert.equal(result._algorithm, 'fsrs6');
    assert.ok(result.fsrs != null);
  });
});

// ─── Szenario 4 ───────────────────────────────────────────────────────────
// NaN stability + difficulty=0 → innerer catch → Fallback mit fsrs=null
describe('S4: NaN stability + difficulty=0 → Fallback', () => {
  it('setzt fsrs=null, interval=4, status erhalten', () => {
    const card = {
      id: 'c4', concept: 'x', status: 'review',
      interval: 14,
      fsrs: { ...createEmptyCard(), stability: NaN, difficulty: 0 },
    };
    const result = calculateNextReview(card, 2);
    assert.equal(result._algorithm, 'fallback');
    assert.equal(result.fsrs, null);       // aktiv genullt — kein fehlendes Feld
    assert.equal(result.interval, 4);      // quality=2 → 4 Tage Fallback-Interval
    assert.equal(result.status, 'review'); // card.status erhalten, kein Downgrade
    assert.ok(result._fallbackReason);
  });
});

// ─── Szenario 4b ──────────────────────────────────────────────────────────
// Nach Fallback-Merge: nächster calculateNextReview schlägt nicht fehl
describe('S4b: Nach Fallback (Reducer-Merge mit fsrs=null)', () => {
  it('nächster Aufruf → fsrs6 (Loop gebrochen)', () => {
    // Ursprungskarte mit korruptem fsrs
    const corruptCard = {
      id: 'c4b', concept: 'x', status: 'review', interval: 14,
      fsrs: { ...createEmptyCard(), stability: NaN, difficulty: 0 },
    };
    const fallbackResult = calculateNextReview(corruptCard, 2);
    assert.equal(fallbackResult._algorithm, 'fallback');
    assert.equal(fallbackResult.fsrs, null);

    // Reducer-Merge (genau wie appReducer.js UPDATE_FLASHCARD)
    const cardAfterMerge = applyReducerMerge(corruptCard, fallbackResult);
    assert.equal(cardAfterMerge.fsrs, null); // null wurde wirklich gemergt

    // Nächster Aufruf: null → createEmptyCard → d=0,s=0 → kein Fehler
    const nextResult = calculateNextReview(cardAfterMerge, 2);
    assert.equal(nextResult._algorithm, 'fsrs6');
    assert.ok(nextResult.fsrs != null);
  });
});

// ─── Szenario 4c ──────────────────────────────────────────────────────────
// isDueForReview nach Fallback-Merge: liest nextReview, nicht altes fsrs.due
describe('S4c: isDueForReview nach Fallback-Merge', () => {
  it('liest nextReview (Zukunft), nicht altes fsrs.due (Vergangenheit)', () => {
    const corruptCard = {
      id: 'c4c', concept: 'x', status: 'review', interval: 14,
      fsrs: {
        ...createEmptyCard(),
        stability: NaN, difficulty: 0,
        due: new Date(Date.now() - 86400000 * 3).toISOString(), // 3 Tage in Vergangenheit
      },
      nextReview: new Date(Date.now() - 86400000 * 3).toISOString(),
    };
    const fallbackResult = calculateNextReview(corruptCard, 2);
    const cardAfterMerge = applyReducerMerge(corruptCard, fallbackResult);

    // fsrs ist null → isDueForReview fällt auf nextReview zurück (Zukunft)
    assert.equal(cardAfterMerge.fsrs, null);
    const isDue = isDueForReview(cardAfterMerge);
    assert.equal(isDue, false, 'Karte darf nach Fallback nicht sofort wieder fällig sein');
  });
});

// ─── Szenario 5 ───────────────────────────────────────────────────────────
// NaN stability + difficulty=5 (Review-Karte) → RangeError → Fallback
describe('S5: NaN stability + difficulty=5 (Review-Karte)', () => {
  it('Fallback mit fsrs=null, status erhalten', () => {
    const card = {
      id: 'c5', concept: 'x', status: 'review',
      fsrs: { ...createEmptyCard(), stability: NaN, difficulty: 5, state: State.Review },
    };
    const result = calculateNextReview(card, 2);
    assert.equal(result._algorithm, 'fallback');
    assert.equal(result.fsrs, null);
    assert.equal(result.status, 'review');
  });
});

// ─── Szenario 6 ───────────────────────────────────────────────────────────
// state=99 → TypeError → Fallback
describe('S6: state=99 (ungültiger FSRS-State)', () => {
  it('Fallback mit fsrs=null, status erhalten', () => {
    const card = {
      id: 'c6', concept: 'x', status: 'review',
      fsrs: { ...createEmptyCard(), state: 99, stability: 10, difficulty: 5 },
    };
    const result = calculateNextReview(card, 2);
    assert.equal(result._algorithm, 'fallback');
    assert.equal(result.fsrs, null);
    assert.equal(result.status, 'review');
    assert.ok(result._fallbackReason?.includes('state may be invalid'));
  });
});

// ─── Szenario 7 ───────────────────────────────────────────────────────────
// ISO-String due → kein Fehler (TypeConvert.time() konvertiert transparent)
describe('S7: ISO-String due → kein Fallback', () => {
  it('liefert fsrs6, ISO-String due wird akzeptiert', () => {
    const card = {
      id: 'c7', concept: 'x', status: 'review',
      fsrs: {
        ...createEmptyCard(),
        due: '2024-01-01T00:00:00.000Z',
        state: State.Review, stability: 10, difficulty: 5, reps: 5,
      },
    };
    const result = calculateNextReview(card, 2);
    assert.equal(result._algorithm, 'fsrs6'); // kein Fallback
    assert.ok(result.fsrs != null);
  });
});

// ─── Szenario 8 ───────────────────────────────────────────────────────────
// Gültige Review-Karte → mastered (Interval ≥ 21)
describe('S8: Gültige Review-Karte quality=2', () => {
  it('liefert fsrs6, status=mastered, interval≥21', () => {
    const card = {
      id: 'c8', concept: 'x', status: 'review',
      fsrs: {
        ...createEmptyCard(),
        state: State.Review, stability: 30, difficulty: 5,
        reps: 10,
        due: new Date(),
        last_review: new Date(Date.now() - 86400000 * 30),
      },
    };
    const result = calculateNextReview(card, 2);
    assert.equal(result._algorithm, 'fsrs6');
    assert.equal(result.status, 'mastered');
    assert.ok(result.interval >= 21);
  });
});

// ─── Szenario 9 ───────────────────────────────────────────────────────────
// SM-2 Karte → automatische Migration → fsrs6
describe('S9: SM-2 Karte → automatische Migration', () => {
  it('liefert fsrs6, fsrs-Feld vorhanden, kein Fallback', () => {
    const card = {
      id: 'c9', concept: 'x', status: 'review',
      easeFactor: 2.5, interval: 14, repetitions: 8,
      nextReview: new Date(Date.now() + 86400000 * 14).toISOString(),
      lastReview: new Date(Date.now() - 86400000 * 14).toISOString(),
    };
    const result = calculateNextReview(card, 2);
    assert.equal(result._algorithm, 'fsrs6');
    assert.ok(result.fsrs != null);
    assert.notEqual(result._algorithm, 'fallback');
  });
});

// ─── NaN in Dashboard-Werten ──────────────────────────────────────────────
// Sicherstellen, dass NaN nach Fallback-Merge nicht in sichtbare Felder gelangt
describe('NaN-Guard: Dashboard-Felder nach Fallback-Merge', () => {
  it('interval ist kein NaN nach Fallback', () => {
    const card = {
      id: 'nan-guard', concept: 'x', status: 'review',
      interval: 14, stability: NaN,
      fsrs: { ...createEmptyCard(), stability: NaN, difficulty: 0 },
    };
    const fallback = calculateNextReview(card, 2);
    const merged = applyReducerMerge(card, fallback);
    // interval wird vom Fallback auf days gesetzt (nicht mehr alter NaN-Wert)
    assert.equal(isNaN(merged.interval), false, 'interval darf kein NaN sein');
    assert.ok(merged.interval >= 1);
  });

  it('fsrs ist null nach Fallback-Merge (kein korruptes Objekt)', () => {
    const card = {
      id: 'nan-guard2', concept: 'x', status: 'review',
      fsrs: { ...createEmptyCard(), state: 99, stability: 10, difficulty: 5 },
    };
    const fallback = calculateNextReview(card, 2);
    const merged = applyReducerMerge(card, fallback);
    assert.equal(merged.fsrs, null, 'fsrs muss nach Fallback auf null gesetzt sein');
  });
});

// ─── Fallback: quality-Mapping für interval ───────────────────────────────
describe('Fallback: interval-Mapping nach quality', () => {
  const brokenCard = {
    id: 'map', concept: 'x', status: 'review',
    fsrs: { ...createEmptyCard(), stability: NaN, difficulty: 0 },
  };
  it('quality=0 → interval=1', () => {
    assert.equal(calculateNextReview(brokenCard, 0).interval, 1);
  });
  it('quality=1 → interval=2', () => {
    assert.equal(calculateNextReview(brokenCard, 1).interval, 2);
  });
  it('quality=2 → interval=4', () => {
    assert.equal(calculateNextReview(brokenCard, 2).interval, 4);
  });
  it('quality=3 → interval=7', () => {
    assert.equal(calculateNextReview(brokenCard, 3).interval, 7);
  });
});
