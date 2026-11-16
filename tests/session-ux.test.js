/**
 * Session-UX (Phase 2.3): F012, F013, F025, F026, F027
 * ─────────────────────────────────────────────────────────────────────────────
 * Echte Verhaltensprüfung nur dort, wo es ohne Browser geht (Reducer). Der Rest
 * sind Quelltext-Prüfungen als Schutz vor Rückfall; die Wirkung selbst wurde im
 * Browser gesehen (siehe PR-Beschreibung).
 *
 *   SU-01  F013: BLOCK_FINISHED speichert selfRating, ändert confidence nicht
 *   SU-02  F013: ohne Selbsteinschätzung bleibt selfRating null
 *   SU-03  F012: kein Button "Verstanden, weiter" bei Lücken
 *   SU-04  F025: Wiederholungsrunde hat Pause, Lösung und "Nochmal versuchen"
 *   SU-05  F026: Skeleton-Karte zeigt eine Statuszeile
 *   SU-06  F027: Wordmark wird in FocusRitual und Elaboration ausgeblendet
 */
import { it, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { appReducer, initialState } from '../src/state/appReducer.js';

const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const base = {
  ...initialState,
  blocks: [{ id: 1, title: 'A', status: 'in-progress', confidence: null }],
  sessionsTotal: 0,
};

describe('F013 Selbsteinschätzung', () => {
  it('SU-01 wird gespeichert und ändert confidence nicht', () => {
    const next = appReducer(base, { type: 'BLOCK_FINISHED', blockId: 1, status: 'unsicher', selfRating: 'sicher' });
    assert.equal(next.blocks[0].selfRating, 'sicher');
    assert.equal(next.blocks[0].confidence, 'unsicher');
  });

  it('SU-02 fehlt sie, bleibt das Feld null', () => {
    const next = appReducer(base, { type: 'BLOCK_FINISHED', blockId: 1, status: 'sicher' });
    assert.equal(next.blocks[0].selfRating, null);
  });
});

describe('Quelltext-Schutz', () => {
  it('SU-03 F012: Button sagt bei Lücken nicht "Verstanden"', () => {
    assert.ok(!read('../src/screens/session/BlockCompletePhase.jsx').includes('Verstanden, weiter'));
    assert.ok(!read('../src/screens/session/CheckUnderstandingPhase.jsx').includes('Verstanden, weiter'));
  });

  it('SU-04 F025: Wiederholungsrunde hat Pause, Lösung und Retry', () => {
    const cards = read('../src/screens/session/CardLearningPhase.jsx');
    const at = cards.indexOf("phase === 'repeat-card' && repeatMode");
    const repeatScreen = cards.slice(at, cards.indexOf("phase === 'final-recall'", at));
    assert.ok(repeatScreen.includes('onClick={onExit}'), 'kein Pause-Knopf');
    assert.ok(repeatScreen.includes('Hier die Antwort'), 'keine Lösung');
    assert.ok(repeatScreen.includes('handleRepeatRetry'), 'kein Retry');
  });

  it('SU-05 F026: Skeleton-Karte hat eine Statuszeile', () => {
    const sk = read('../src/components/SkeletonLoader.jsx');
    assert.ok(sk.includes('Lumo bereitet deine Karten vor'));
    assert.ok(sk.includes('role="status"'));
  });

  it('SU-06 F027: FocusRitual und Elaboration blenden die Wordmark aus', () => {
    const s = read('../src/screens/session/SessionScreen.jsx');
    const at = s.indexOf('const hasOwnHeader');
    const decl = s.slice(at, s.indexOf(';', at));
    assert.ok(decl.includes('PHASES.FOCUS_RITUAL') && decl.includes('PHASES.ELABORATION'));
  });
});
