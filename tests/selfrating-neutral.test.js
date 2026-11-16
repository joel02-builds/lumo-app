/**
 * F013 — selfRating ist rein additiv
 * ─────────────────────────────────────────────────────────────────────────────
 * Die Selbsteinschätzung nach der KI-Bewertung wird nur gespeichert. Sie darf
 * weder Block-Status/-Confidence noch FSRS-Daten der Karteikarten verändern.
 * Getestet wird der ECHTE Reducer (keine Kopie) und der Quelltext.
 *
 *   SR-01  BLOCK_FINISHED: status/confidence/Punkte/sessionsTotal sind mit und
 *          ohne selfRating (alle drei Werte) identisch
 *   SR-02  Flashcards (inkl. FSRS-Felder) bleiben bei BLOCK_FINISHED unberührt
 *   SR-03  selfRating wird nur im Block gespeichert, sonst nirgends gelesen
 *   SR-04  Die FSRS-Eingabe kennt nur die Karten-Qualität 0–3, kein selfRating
 */
import { it, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { appReducer, initialState } from '../src/state/appReducer.js';

const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

const fsrsCard = {
  id: 'c1', concept: 'Synapse', front: 'Synapse', back: 'Kontaktstelle',
  status: 'review', due: '2026-12-01T08:00:00.000Z',
  stability: 12.34, difficulty: 5.67, reps: 4, lapses: 1, state: 2,
  lastReviewed: '2026-11-10T08:00:00.000Z', _algorithm: 'fsrs',
};

const base = () => ({
  ...initialState,
  blocks: [
    { id: 'b1', title: 'A', status: 'in-progress', confidence: null },
    { id: 'b2', title: 'B', status: 'not-started', confidence: null },
  ],
  flashcards: [structuredClone(fsrsCard)],
  sessionsTotal: 2,
  currentBlockId: 'b1',
});

const finish = (extra) => appReducer(base(), {
  type: 'BLOCK_FINISHED', blockId: 'b1', status: 'unsicher',
  goodPoints: ['x'], uncertainPoints: ['y'], ...extra,
});

// Alles am Block außer selfRating und dem Zeitstempel
const core = (s) => {
  const { selfRating, completedAt, ...rest } = s.blocks.find((b) => b.id === 'b1');
  return rest;
};

describe('Reducer', () => {
  it('SR-01 Status, Confidence und Zähler hängen nicht von selfRating ab', () => {
    const ohne = finish({});
    for (const v of ['sicher', 'unsicher', 'noch_nicht']) {
      const mit = finish({ selfRating: v });
      assert.equal(mit.blocks.find((b) => b.id === 'b1').selfRating, v);
      assert.deepEqual(core(mit), core(ohne), 'Block weicht ab bei ' + v);
      assert.equal(mit.sessionsTotal, ohne.sessionsTotal);
      assert.equal(mit.blocks.find((b) => b.id === 'b2').status, 'not-started');
    }
    assert.equal(core(ohne).status, 'completed');
    assert.equal(core(ohne).confidence, 'unsicher');
    assert.equal(ohne.blocks.find((b) => b.id === 'b1').selfRating, null);
  });

  it('SR-02 Flashcards und FSRS-Felder bleiben unverändert', () => {
    for (const v of [undefined, 'sicher', 'noch_nicht']) {
      const after = finish({ selfRating: v });
      assert.deepEqual(after.flashcards, [fsrsCard]);
    }
  });
});

describe('Quelltext', () => {
  function walk(dir, out = []) {
    for (const n of readdirSync(dir)) {
      const p = dir + n;
      if (statSync(p).isDirectory()) walk(p + '/', out);
      else if (/\.jsx?$/.test(n)) out.push(p);
    }
    return out;
  }

  it('SR-03 selfRating kommt nur in Eingabe-Screen und Reducer vor', () => {
    const dir = new URL('../src/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
    const files = walk(dir).filter((f) => readFileSync(f, 'utf8').includes('selfRating'))
      .map((f) => f.slice(dir.length));
    assert.deepEqual(files.sort(), ['screens/session/CheckUnderstandingPhase.jsx', 'state/appReducer.js']);
  });

  it('SR-04 FSRS-Eingabe ist nur die Karten-Qualität', () => {
    assert.match(read('../src/utils/fsrs.js'), /export function calculateNextReview\(card, quality\)/);
    const app = read('../src/App.jsx');
    assert.ok(app.includes('calculateNextReview(card, quality)'));
    assert.ok(!app.includes('selfRating'));
  });
});
