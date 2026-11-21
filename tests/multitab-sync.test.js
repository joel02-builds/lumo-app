/**
 * F009 Stufe 1 — zwei Tabs im selben Browser überschreiben sich nicht mehr
 * ─────────────────────────────────────────────────────────────────────────────
 * Simuliert werden zwei Tabs mit EINEM gemeinsamen Speicher (wie localStorage im
 * Browser). Getestet wird der echte Code (tabSync.js, progress.js, appReducer.js).
 * Server-Pfad und Speicherformat sind unverändert; das wird mitgeprüft.
 *
 *   MT-01  Tab A schließt Block 5 ab, Tab B (alter Stand) übernimmt statt zu überschreiben
 *          (Gegenprobe: blindes Speichern wie vorher verliert Block 5)
 *   MT-02  FSRS-Daten, Kartenreihenfolge und Fortschritt bleiben bei der Übernahme unverändert
 *   MT-03  Hat der veraltete Tab mehr Fortschritt, gewinnt er – gemessen an den Karten behält
 *          jede Karte den weiteren Stand (ganzes Objekt, Reihenfolge des Gewinners)
 *   MT-04  Ein einzelner Tab schreibt wie vorher; identische Stände lösen keine Schleife aus
 *   MT-05  ADOPT_SNAPSHOT: nur Daten, Screen/aktueller Block bleiben, idempotent
 *   MT-06  countProgress: Stände ohne Karten ergeben denselben Wert wie vorher; Karten zählen mit
 *   MT-07  Speicherformat unverändert: gleiche Schlüssel, getrennter Revisions-Schlüssel
 *   MT-08  Revision ändert sich nur, wenn sich der gespeicherte Inhalt ändert
 *   MT-09  App.jsx: Schutz vor dem Speichern, Server-Sync wird bei 'skip' übersprungen
 */
import { it, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createTabSync, resolveSnapshots, PROJECT_KEY, REV_KEY } from '../src/utils/tabSync.js';
import { countProgress } from '../src/utils/progress.js';
import { appReducer, initialState } from '../src/state/appReducer.js';

// ─── Hilfsmittel ─────────────────────────────────────────────────────────────
class FakeStorage {
  constructor() { this.m = new Map(); }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { this.m.set(k, String(v)); }
  removeItem(k) { this.m.delete(k); }
}

function deepFreeze(o) {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const k of Object.keys(o)) deepFreeze(o[k]);
  }
  return o;
}

const card = (id, reps, lastReviewed = '2026-11-01T10:00:00.000Z') => ({
  id, concept: 'K' + id, front: 'K' + id, back: 'A' + id, status: reps ? 'review' : 'new',
  nextReview: '2026-12-01T08:00:00.000Z', lastReviewed,
  fsrs: { due: '2026-12-01T08:00:00.000Z', stability: 3.1 + reps, difficulty: 5.2, reps, lapses: 0, state: reps ? 2 : 0 },
  _algorithm: 'fsrs6',
});

const block = (n, status) => ({ id: 'b' + n, title: 'Block ' + n, status, confidence: status === 'completed' ? 'unsicher' : null });

/** Stand: Blöcke 1–4 fertig; `done5` schließt Block 5 ab. Karten in fester Reihenfolge. */
function snap({ done5 = false, goalDate = null, cards } = {}) {
  const blocks = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => block(n, n <= 4 || (n === 5 && done5) ? 'completed' : 'not-started'));
  return {
    projectName: 'Bio', materialName: 'bio.txt', goalType: 'exam', goalDate, sprintMode: false,
    blocks, recommendedOrder: blocks.map((b) => b.id), subjectColor: '#D4A843', learningStyle: 'examples',
    subjectHistory: [], projects: [], activeProjectId: null, examResult: null, examResultAskedAt: null,
    blocksAnalyzedTotal: 8, sessionsTotal: done5 ? 5 : 4,
    flashcards: cards || [card('c1', 1), card('c2', 0), card('c3', 2), card('c4', 0), card('c5', 1), card('c6', 0)],
  };
}

/** Wie der Speichern-Effekt in App.jsx: Schutz fragen, dann ggf. schreiben. */
function save(tab, storage, snapshot) {
  const g = tab.beforeSave(snapshot);
  if (g.action === 'write') {
    storage.setItem(PROJECT_KEY, JSON.stringify(snapshot));
    tab.afterSave();
  }
  return g;
}

/** Verhalten VOR der Änderung: blind schreiben, last write wins. */
function blindSave(storage, snapshot) {
  storage.setItem(PROJECT_KEY, JSON.stringify(snapshot));
}

// ─── Tests ───────────────────────────────────────────────────────────────────
describe('Zwei-Tab-Szenario', () => {
  it('MT-01 Tab A schließt Block 5 ab, Tab B mit altem Stand übernimmt statt zu überschreiben', () => {
    const storage = new FakeStorage();
    const base = snap();
    storage.setItem(PROJECT_KEY, JSON.stringify(base));
    const tabA = createTabSync({ storage });
    const tabB = createTabSync({ storage });   // beide starten mit dem alten Stand

    const stateA = snap({ done5: true, cards: [card('c1', 2), card('c2', 1), card('c3', 2), card('c4', 0), card('c5', 1), card('c6', 0)] });
    assert.equal(save(tabA, storage, stateA).action, 'write');
    const afterA = storage.getItem(PROJECT_KEY);

    // Tab B hat noch den alten Stand und ändert nur eine Kleinigkeit (z. B. Prüfungsdatum)
    const staleB = snap({ goalDate: '2026-12-24' });
    const g = save(tabB, storage, staleB);

    assert.equal(g.adopt, true, 'Tab B muss den neueren Stand übernehmen');
    assert.equal(g.action, 'skip', 'Tab B darf nichts schreiben');
    assert.deepEqual(g.snapshot, stateA, 'übernommen wird genau der Stand von Tab A');
    assert.equal(storage.getItem(PROJECT_KEY), afterA, 'gespeicherter Stand blieb unberührt');
    assert.equal(g.snapshot.blocks.find((b) => b.id === 'b5').status, 'completed', 'Block 5 bleibt abgeschlossen');
  });

  it('MT-01b Gegenprobe: blindes Speichern (altes Verhalten) verliert Block 5', () => {
    const storage = new FakeStorage();
    const stateA = snap({ done5: true });
    blindSave(storage, stateA);
    blindSave(storage, snap({ goalDate: '2026-12-24' })); // Tab B überschreibt
    const left = JSON.parse(storage.getItem(PROJECT_KEY));
    assert.equal(left.blocks.find((b) => b.id === 'b5').status, 'not-started', 'so ging Fortschritt verloren');
    assert.ok(countProgress(left) < countProgress(stateA));
  });

  it('MT-02 FSRS-Daten, Kartenreihenfolge und Fortschritt bleiben bei der Übernahme unverändert', () => {
    const storage = new FakeStorage();
    storage.setItem(PROJECT_KEY, JSON.stringify(snap()));
    const tabA = createTabSync({ storage });
    const tabB = createTabSync({ storage });
    const stateA = snap({ done5: true, cards: [card('c1', 4), card('c2', 2), card('c3', 3), card('c4', 1), card('c5', 1), card('c6', 0)] });
    save(tabA, storage, stateA);
    const expected = structuredClone(stateA);

    const staleB = deepFreeze(snap());     // eingefroren: jede Mutation würde hier werfen
    const g = tabB.beforeSave(staleB);

    assert.deepEqual(g.snapshot, expected);
    assert.deepEqual(g.snapshot.flashcards.map((c) => c.id), ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'], 'Kartenreihenfolge');
    for (let i = 0; i < expected.flashcards.length; i++) {
      assert.deepEqual(g.snapshot.flashcards[i].fsrs, expected.flashcards[i].fsrs, 'FSRS-Daten Karte ' + (i + 1));
    }
    assert.equal(countProgress(g.snapshot), countProgress(expected));
    assert.deepEqual(JSON.parse(storage.getItem(PROJECT_KEY)), expected, 'gespeicherter Stand unverändert');
  });

  it('MT-03 Veralteter Tab mit mehr Fortschritt gewinnt; weiter gelernte Karten bleiben erhalten', () => {
    const stored = deepFreeze(snap({ cards: [card('c1', 5), card('c2', 1), card('c3', 0)] }));
    const mine = deepFreeze(snap({ done5: true, cards: [card('c3', 0), card('c2', 3), card('c1', 2)] })); // mehr Blöcke, andere Reihenfolge
    const merged = resolveSnapshots(mine, stored);

    assert.deepEqual(merged.flashcards.map((c) => c.id), ['c3', 'c2', 'c1'], 'Reihenfolge des Gewinners');
    assert.strictEqual(merged.flashcards[2], stored.flashcards[0], 'c1: der weitere Stand (5 > 2) kommt als ganzes Objekt');
    assert.strictEqual(merged.flashcards[1], mine.flashcards[1], 'c2: der eigene Stand (3 > 1)');
    assert.equal(merged.blocks.find((b) => b.id === 'b5').status, 'completed');

    // nichts zu retten → dasselbe Objekt
    const same = snap({ done5: true });
    assert.strictEqual(resolveSnapshots(same, snap()), same);
  });

  it('MT-03b Gleichstand beim Fortschritt: der gespeicherte (neuere) Stand gewinnt', () => {
    const stored = snap({ goalDate: '2026-12-01' });
    const mine = snap({ goalDate: '2026-12-24' });
    assert.strictEqual(resolveSnapshots(mine, stored), stored);
  });
});

describe('Kein Eingriff im Normalfall', () => {
  it('MT-04 Einzelner Tab schreibt wie vorher; Übernahme löst keine Schleife aus', () => {
    const storage = new FakeStorage();
    const tab = createTabSync({ storage });
    for (let n = 0; n < 3; n++) {
      const g = save(tab, storage, snap({ goalDate: '2026-12-0' + (n + 1) }));
      assert.deepEqual([g.action, g.adopt], ['write', false]);
    }

    // zwei Tabs: Übernahme, danach schreibt B denselben Stand nicht zurück (Echo)
    const s2 = new FakeStorage();
    s2.setItem(PROJECT_KEY, JSON.stringify(snap()));
    const A = createTabSync({ storage: s2 });
    const B = createTabSync({ storage: s2 });
    save(A, s2, snap({ done5: true }));
    const g1 = save(B, s2, snap());
    assert.equal(g1.adopt, true);
    const revAfterAdopt = s2.getItem(REV_KEY);
    const g2 = save(B, s2, g1.snapshot);              // der Effekt läuft nach ADOPT erneut
    assert.deepEqual([g2.action, g2.adopt], ['skip', false]);
    assert.equal(s2.getItem(REV_KEY), revAfterAdopt, 'keine neue Revision durch die Übernahme');
    // und A wird dadurch nicht „veraltet“
    assert.deepEqual([save(A, s2, snap({ done5: true, goalDate: '2026-12-24' })).action], ['write']);
  });

  it('MT-04b ohne brauchbaren gespeicherten Stand wird geschrieben (altes Verhalten)', () => {
    const storage = new FakeStorage();
    const A = createTabSync({ storage });
    const B = createTabSync({ storage });
    save(A, storage, snap({ done5: true }));
    storage.setItem(PROJECT_KEY, '{kaputt');          // unlesbar
    assert.equal(save(B, storage, snap()).action, 'write');
  });
});

describe('Reducer ADOPT_SNAPSHOT', () => {
  it('MT-05 nur Daten, Screen und aktueller Block bleiben, idempotent', () => {
    const s0 = { ...initialState, screen: 'session', currentBlockId: 'b2', onboardingStep: 3, blocks: snap().blocks, flashcards: snap().flashcards };
    const payload = snap({ done5: true, cards: [card('c1', 4), card('c9', 0)] });
    const s1 = appReducer(s0, { type: 'ADOPT_SNAPSHOT', payload });
    assert.equal(s1.screen, 'session');
    assert.equal(s1.currentBlockId, 'b2');
    assert.equal(s1.onboardingStep, 3);
    assert.deepEqual(s1.blocks, payload.blocks);
    assert.deepEqual(s1.flashcards, payload.flashcards);
    assert.equal(s1.sessionsTotal, 5);
    assert.deepEqual(appReducer(s1, { type: 'ADOPT_SNAPSHOT', payload }), s1, 'zweimal ausgeführt = gleich');
    assert.strictEqual(appReducer(s0, { type: 'ADOPT_SNAPSHOT', payload: null }), s0, 'ungültige Nutzlast ändert nichts');
    // fehlende Felder behalten den bisherigen Wert
    const s2 = appReducer(s0, { type: 'ADOPT_SNAPSHOT', payload: { sessionsTotal: 9 } });
    assert.equal(s2.sessionsTotal, 9);
    assert.deepEqual(s2.blocks, s0.blocks);
  });
});

describe('Fortschrittszähler', () => {
  it('MT-06 Stände ohne Karten ergeben denselben Wert wie vorher; Karten zählen mit', () => {
    // Alte Formel von Hand: 4 fertig ×10 + 4 "unsicher" ×0 … + 8×3 + 4×2
    const noCards = snap({ cards: [] });
    assert.equal(countProgress(noCards), 4 * 10 + 8 * 3 + 4 * 2);
    assert.equal(countProgress({ ...noCards, flashcards: undefined }), countProgress(noCards));
    const withProjects = { ...noCards, projects: [{ blocks: [block(1, 'completed'), block(2, 'not-started')] }] };
    assert.equal(countProgress(withProjects), countProgress(noCards) + 10);

    assert.equal(countProgress(snap({ cards: [card('a', 2), card('b', 3)] })) - countProgress(noCards), 5);
    assert.equal(countProgress(snap({ cards: [{ id: 'x' }, null, { id: 'y', fsrs: null }] })), countProgress(noCards), 'unvollständige Karten zählen 0');
    assert.equal(countProgress(null), 0);
  });
});

describe('Speicherformat und Verdrahtung', () => {
  const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
  const storageSrc = readFileSync(new URL('../src/utils/storage.js', import.meta.url), 'utf8');

  it('MT-07 Projekt-Format unverändert, Revision in eigenem Schlüssel', () => {
    assert.match(storageSrc, /const LS_KEY = 'lumo_project';/);
    assert.equal(PROJECT_KEY, 'lumo_project');
    assert.notEqual(REV_KEY, PROJECT_KEY);
    const body = app.match(/function buildSnapshot\(state\) \{\s*return \{([\s\S]*?)\r?\n  \};\r?\n\}/)[1];
    const keys = [...body.matchAll(/^\s{4}(\w+):/gm)].map((m) => m[1]);
    assert.deepEqual(keys, [
      'projectName', 'materialName', 'goalType', 'goalDate', 'sprintMode', 'blocks', 'recommendedOrder',
      'subjectColor', 'learningStyle', 'subjectHistory', 'projects', 'activeProjectId', 'examResult',
      'examResultAskedAt', 'blocksAnalyzedTotal', 'sessionsTotal', 'flashcards',
    ]);
    // der Schutz schreibt nie ein Feld in den Projekt-Stand
    const tabSyncSrc = readFileSync(new URL('../src/utils/tabSync.js', import.meta.url), 'utf8');
    assert.ok(!/setItem\(PROJECT_KEY/.test(tabSyncSrc), 'tabSync darf den Projekt-Stand nie selbst schreiben');
  });

  it('MT-08 neue Revision nur bei geändertem Inhalt', () => {
    const storage = new FakeStorage();
    const tab = createTabSync({ storage });
    const s = snap();
    save(tab, storage, s);
    const rev1 = storage.getItem(REV_KEY);
    assert.ok(rev1);
    save(tab, storage, s);                              // identisch gespeichert
    assert.equal(storage.getItem(REV_KEY), rev1);
    save(tab, storage, snap({ goalDate: '2026-12-24' }));
    assert.notEqual(storage.getItem(REV_KEY), rev1);
  });

  it('MT-09 App.jsx: Schutz vor dem Speichern, bei skip kein lokaler/Server-Write', () => {
    const iGuard = app.indexOf('tabSyncRef.current.beforeSave(snapshot)');
    const iSave = app.indexOf('saveProject(snapshot);');
    const iServer = app.indexOf('scheduleSyncToServer(snapshot');
    assert.ok(iGuard > 0 && iGuard < iSave && iSave < iServer, 'Reihenfolge: Schutz → localStorage → Server');
    assert.match(app, /if \(guard\.action !== 'write'\) return;/);
    assert.ok(app.includes("addEventListener('storage'") && app.includes("'lumo_project_rev'"));
    assert.match(app, /s\.screen === SCREENS\.SESSION\) return;/, 'keine Übernahme mitten in der Session');
  });
});
