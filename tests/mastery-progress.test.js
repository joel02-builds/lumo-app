/**
 * „Mein Lernstand": Fortschritt nach Anteil ALLER Blöcke
 * Vorher: 1 von 6 Blöcken verstanden → „100 % Starker Lernstand." (Nenner = nur Karten bearbeiteter Blöcke)
 *
 *   MP-01  1 von 6 verstanden → 17 %, Text „1 von 6 Blöcken verstanden."
 *   MP-02  Offene Blöcke zählen im Nenner; Blöcke mit Lücken zählen nicht als verstanden
 *   MP-03  Alle verstanden → 100 %; keine Blöcke → 0 %, kein Absturz
 *   MP-04  WeakSpotsScreen zeigt keine „Starker Lernstand"-Überschrift und nutzt die Funktion
 *   MP-05  Die Funktion verändert die Blöcke nicht (gespeicherte Daten unberührt)
 */
import { it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/screens/WeakSpotsScreen.jsx', import.meta.url), 'utf8');
const { getBlockProgress } = await import('../src/utils/masteryProgress.js').catch(() => ({ getBlockProgress: null }));

const cards = [{ concept: 'a' }, { concept: 'b' }, { concept: 'c' }, { concept: 'd' }];
const done = (id) => ({ id, status: 'completed', confidence: 'sicher', cards, uncertainPoints: [] });
const open = (id) => ({ id, status: 'not-started', confidence: null });

it('MP-01 1 von 6 → 17 %', () => {
  assert.ok(getBlockProgress, 'src/utils/masteryProgress.js fehlt');
  const p = getBlockProgress([done('a'), ...['b', 'c', 'd', 'e', 'f'].map(open)]);
  assert.equal(p.percent, 17);
  assert.equal(p.label, '1 von 6 Blöcken verstanden.');
});

it('MP-02 offene und lückenhafte Blöcke', () => {
  const gaps = { id: 'g', status: 'completed', confidence: 'unsicher', cards, uncertainPoints: ['x'] };
  const p = getBlockProgress([done('a'), gaps, open('b'), open('c')]);
  assert.equal(p.total, 4);
  assert.equal(p.understood, 1);
  assert.equal(p.percent, 25);
});

it('MP-03 Randfälle', () => {
  assert.equal(getBlockProgress([done('a'), done('b')]).percent, 100);
  assert.deepEqual(getBlockProgress([]).percent, 0);
  assert.equal(getBlockProgress(null).total, 0);
  assert.equal(getBlockProgress([null, done('a')]).total, 1);
  assert.equal(getBlockProgress([done('a')]).label, '1 von 1 Block verstanden.');
});

it('MP-04 Screen ohne Wertungs-Überschrift', () => {
  assert.doesNotMatch(src, /Starker Lernstand/);
  assert.doesNotMatch(src, /Noch viel zu tun/);
  assert.match(src, /getBlockProgress\(/);
});

it('MP-05 Eingabe bleibt unverändert', () => {
  const blocks = [done('a'), open('b')];
  const before = JSON.stringify(blocks);
  getBlockProgress(blocks);
  assert.equal(JSON.stringify(blocks), before);
});
