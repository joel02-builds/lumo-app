/**
 * AUDIT-K-01 — FSRS Test-Suite
 *
 * Ausführung: node --test src/utils/fsrs.test.js
 * Keine zusätzlichen Flags nötig ("type": "module" in package.json).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyCard, Rating, State } from 'ts-fsrs';
import { calculateNextReview, isDueForReview, qualityToRating } from './fsrs.js';

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

// ─── K-01: qualityToRating — alle 4 Stufen ───────────────────────────────
// Verifiziert das Rating-Mapping aus fsrs.js (Lumo-Quality → ts-fsrs Rating)
describe('K-01: qualityToRating — alle 4 Stufen', () => {
  it('quality=0 → Rating.Again', () => {
    assert.equal(qualityToRating(0), Rating.Again);
  });
  it('quality=1 → Rating.Hard', () => {
    assert.equal(qualityToRating(1), Rating.Hard);
  });
  it('quality=2 → Rating.Good', () => {
    assert.equal(qualityToRating(2), Rating.Good);
  });
  it('quality=3 → Rating.Easy', () => {
    assert.equal(qualityToRating(3), Rating.Easy);
  });
  it('quality=99 (default) → Rating.Good', () => {
    assert.equal(qualityToRating(99), Rating.Good);
  });
});

// ─── K-01: quality=1 (Hard) neue Karte ───────────────────────────────────
describe('K-01: Neue Karte quality=1 (Hard)', () => {
  it('liefert fsrs6, status=learning, interval≥1', () => {
    const result = calculateNextReview({ id: 'k01-hard', concept: 'x' }, 1);
    assert.equal(result._algorithm, 'fsrs6');
    assert.equal(result.status, 'learning');
    assert.ok(result.interval >= 1, `interval=${result.interval} soll ≥1 sein`);
    assert.ok(result.fsrs != null);
  });
});

// ─── K-01: quality=3 (Easy) neue Karte ───────────────────────────────────
describe('K-01: Neue Karte quality=3 (Easy)', () => {
  it('liefert fsrs6, gültiger Status, interval≥1', () => {
    const result = calculateNextReview({ id: 'k01-easy', concept: 'x' }, 3);
    assert.equal(result._algorithm, 'fsrs6');
    assert.ok(
      ['learning', 'review', 'mastered'].includes(result.status),
      `Unerwarteter status: ${result.status}`
    );
    assert.ok(result.interval >= 1, `interval=${result.interval} soll ≥1 sein`);
    assert.ok(result.fsrs != null);
  });
});

// ─── K-01: Intervall-Ordnung (Easy > Good > Hard > Again) ────────────────
// FSRS-Kerngarantie: höhere Qualität → längeres Intervall.
// Stabiler Review-Card (stability=30) damit Fuzz die Ordnung nicht kippt.
describe('K-01: Review-Karte — Interval-Ordnung (Easy ≥ Good ≥ Hard ≥ Again)', () => {
  function makeStableReviewCard(id) {
    return {
      id, concept: 'x', status: 'review',
      fsrs: {
        ...createEmptyCard(),
        state: State.Review,
        stability: 30,
        difficulty: 5,
        reps: 10,
        due: new Date(),
        last_review: new Date(Date.now() - 86400000 * 30),
      },
    };
  }

  it('alle 4 Ratings liefern fsrs6', () => {
    for (let q = 0; q <= 3; q++) {
      const r = calculateNextReview(makeStableReviewCard(`ord-algo-${q}`), q);
      assert.equal(r._algorithm, 'fsrs6', `quality=${q} soll fsrs6 liefern`);
    }
  });

  it('interval: Easy ≥ Good ≥ Hard', () => {
    // Again geht in Relearning (interval=1) → klare Trennung zu Hard/Good/Easy.
    const r1 = calculateNextReview(makeStableReviewCard('ord-hard'), 1);
    const r2 = calculateNextReview(makeStableReviewCard('ord-good'), 2);
    const r3 = calculateNextReview(makeStableReviewCard('ord-easy'), 3);
    assert.ok(r3.interval >= r2.interval,
      `Easy(${r3.interval}) soll ≥ Good(${r2.interval}) sein`);
    assert.ok(r2.interval >= r1.interval,
      `Good(${r2.interval}) soll ≥ Hard(${r1.interval}) sein`);
  });

  it('Again-Intervall deutlich kürzer als Good-Intervall', () => {
    const r0 = calculateNextReview(makeStableReviewCard('ord-again'), 0);
    const r2 = calculateNextReview(makeStableReviewCard('ord-good2'), 2);
    assert.ok(r0.interval < r2.interval,
      `Again(${r0.interval}) soll < Good(${r2.interval}) sein`);
  });
});

// ─── K-01: App.jsx Quality-Mapper (Spiegelung der Produktionslogik) ──────
// Dokumentiert und verifiziert die qualityOrLegacy-Konversion aus
// App.jsx handleSaveCardResults (nicht aus fsrs.js exportiert).
// Isolierter Test ohne React-Testframework.
describe('K-01: App.jsx Quality-Mapper (Legacy-Fallback + Range-Clamp)', () => {
  // Exakte Spiegelung der Produktionslogik aus App.jsx:
  //   const quality = typeof qualityOrLegacy === 'number'
  //     ? Math.max(0, Math.min(3, Math.round(qualityOrLegacy)))
  //     : (qualityOrLegacy ? 2 : 0);
  function mapQuality(qualityOrLegacy) {
    return typeof qualityOrLegacy === 'number'
      ? Math.max(0, Math.min(3, Math.round(qualityOrLegacy)))
      : (qualityOrLegacy ? 2 : 0);
  }

  // Legacy boolean → FSRS quality
  it('boolean true  → 2 (Good — Legacy-Fallback)', () => {
    assert.equal(mapQuality(true), 2);
  });
  it('boolean false → 0 (Again — Legacy-Fallback)', () => {
    assert.equal(mapQuality(false), 0);
  });

  // 4 neue Quality-Stufen passthrough
  it('0 → 0 (Again, unverändert)', () => { assert.equal(mapQuality(0), 0); });
  it('1 → 1 (Hard, unverändert)',  () => { assert.equal(mapQuality(1), 1); });
  it('2 → 2 (Good, unverändert)',  () => { assert.equal(mapQuality(2), 2); });
  it('3 → 3 (Easy, unverändert)',  () => { assert.equal(mapQuality(3), 3); });

  // Range-Clamp: Werte außerhalb 0–3
  it('-1 → 0 (Clamp auf Minimum)', () => { assert.equal(mapQuality(-1), 0); });
  it(' 4 → 3 (Clamp auf Maximum)', () => { assert.equal(mapQuality(4), 3); });

  // Rounding: Dezimalwerte
  it('2.7 → 3 (Math.round)', () => { assert.equal(mapQuality(2.7), 3); });
  it('1.3 → 1 (Math.round)', () => { assert.equal(mapQuality(1.3), 1); });
  it('0.5 → 1 (Math.round → 1, dann kein Clamp)', () => { assert.equal(mapQuality(0.5), 1); });
});
