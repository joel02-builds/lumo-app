/**
 * F034 — entfernter toter Code (nur belegt tot) + bewusst Behaltenes
 *
 *   DC-01  Die entfernten Dateien existieren nicht mehr
 *   DC-02  Nichts in src/, server/, tests/ (außer dieser Datei) verweist auf Entferntes
 *   DC-03  Bewusst NICHT entfernt (FSRS, Sync, Datenbank): bleibt vorhanden und exportiert
 *   DC-04  Reducer: Nachbar-Aktionen der entfernten Cases sind unversehrt
 *
 * Belegt tot hieß: Suche über src, server, tests, scripts, index.html, vite.config.js, package.json
 * ergab keinen Verweis (außer der eigenen Definition bzw. Dokumentation).
 */
import { it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const rel = (p) => new URL(p, root);
const read = (p) => readFileSync(rel(p), 'utf8');

function walk(dir, out = []) {
  for (const n of readdirSync(dir)) {
    const u = new URL(n + (statSync(new URL(n, dir)).isDirectory() ? '/' : ''), dir);
    if (statSync(u).isDirectory()) walk(u, out); else if (/\.(jsx?|css|html)$/.test(n)) out.push(u);
  }
  return out;
}

it('DC-01 entfernte Dateien sind weg', () => {
  for (const f of ['src/screens/onboarding/OnboardingScreen2.jsx', 'src/utils/apiCostEstimate.js', 'src/components/LumoMascot.css']) {
    assert.equal(existsSync(rel(f)), false, f + ' existiert noch');
  }
});

it('DC-02 keine Verweise auf Entferntes', () => {
  const needles = ['OnboardingScreen2.jsx', 'apiCostEstimate', 'estimateMonthlyCost', 'PRETEST_SYSTEM', 'pretestSchema', 'LumoMascot.css', 'GO_TO_STEP2', 'BACK_TO_STEP1'];
  const files = [...walk(rel('src/')), ...walk(rel('server/')), ...walk(rel('tests/'))]
    .filter((u) => !u.pathname.endsWith('/tests/dead-code-removed.test.js'));
  files.push(rel('index.html'), rel('vite.config.js'), rel('package.json'));
  const hits = [];
  for (const f of files) {
    const s = readFileSync(f, 'utf8');
    for (const n of needles) if (s.includes(n)) hits.push(`${f.pathname.split('/lumo-app/')[1]}: ${n}`);
  }
  assert.deepEqual(hits, []);
});

it('DC-03 Bewusst behalten: FSRS, Sync, Datenbank', () => {
  assert.match(read('src/utils/fsrs.js'), /export function getUpcomingCards\(/);
  assert.match(read('src/utils/fsrs.js'), /export \{ buildInterleavedQueue \} from '\.\/sm2\.js';/);
  assert.ok(existsSync(rel('src/utils/sm2.js')), 'sm2.js (Warteschlangen-Reihenfolge) muss bleiben');
  assert.match(read('src/utils/serverSync.js'), /export function getLastSyncedAt\(/);
  assert.match(read('server/db.js'), /export function getOrCreateUser\(/);
});

it('DC-04 Reducer: Nachbar-Aktionen bleiben', () => {
  const r = read('src/state/appReducer.js');
  for (const c of ['ADOPT_SNAPSHOT', 'BACK_TO_STEP2', 'SET_MATERIAL', 'BLOCK_FINISHED', 'HYDRATE_FROM_STORAGE', 'UPDATE_FLASHCARDS_BATCH']) {
    assert.ok(r.includes(`case '${c}'`), `case '${c}' fehlt`);
  }
});
