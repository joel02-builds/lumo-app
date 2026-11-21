/**
 * F021 Hebel 1 — SessionScreen als eigener Chunk (Quelltext-Schutz vor Rückfall)
 * Die Wirkung (Hauptchunk 218,7 → 97,4 kB, Chunk wird im Leerlauf vorgeladen, Erstbesucher lädt
 * ihn nicht) wurde im echten Build gemessen. Diese Tests halten die Struktur fest.
 *
 *   LZ-01  SessionScreen wird per lazy() geladen, kein statischer Import in App.jsx
 *   LZ-02  Fallback: Suspense um die Session mit .screen/.screen-content + Skeleton-Karte
 *   LZ-03  Dashboard und WelcomeBack bleiben statisch importiert (bewusst nicht lazy)
 *   LZ-04  Vorladen nur auf Dashboard/Willkommen, nur das Laden der Datei – kein API-Aufruf
 *   LZ-05  Kein anderes Modul außerhalb der Session importiert Session-Dateien
 *          (sonst käme der Code zurück ins Hauptbündel)
 */
import { it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';

const src = new URL('../src/', import.meta.url);
const app = readFileSync(new URL('App.jsx', src), 'utf8');

it('LZ-01 lazy() statt statischem Import', () => {
  assert.ok(!/^import SessionScreen from/m.test(app), 'statischer Import von SessionScreen');
  assert.match(app, /const loadSessionScreen = \(\) => import\('\.\/screens\/session\/SessionScreen\.jsx'\);/);
  assert.match(app, /const SessionScreen = lazy\(loadSessionScreen\);/);
});

it('LZ-02 Fallback ohne Layout-Sprung', () => {
  const fb = app.match(/function SessionFallback\(\) \{([\s\S]*?)\r?\n\}/)[1];
  assert.ok(fb.includes('className="screen"') && fb.includes('className="screen-content"'));
  assert.ok(fb.includes('<SkeletonCard'));
  const i = app.indexOf('<SessionScreen\n') >= 0 ? app.indexOf('<SessionScreen\n') : app.indexOf('<SessionScreen\r\n');
  assert.ok(i > 0);
  assert.match(app.slice(Math.max(0, i - 160), i), /<Suspense fallback=\{<SessionFallback \/>\}>/);
});

it('LZ-03 Dashboard und WelcomeBack bleiben eager', () => {
  assert.match(app, /^import DashboardScreen from '\.\/screens\/dashboard\/DashboardScreen\.jsx';/m);
  assert.match(app, /^import WelcomeBackScreen from '\.\/screens\/WelcomeBackScreen\.jsx';/m);
  assert.ok(!/const DashboardScreen\s*=\s*lazy/.test(app) && !/const WelcomeBackScreen\s*=\s*lazy/.test(app));
});

it('LZ-04 Vorladen: nur Dashboard/Willkommen, nur Datei laden', () => {
  const i = app.indexOf('const run = () => { loadSessionScreen()');
  assert.ok(i > 0, 'Vorlade-Effekt fehlt');
  const effect = app.slice(app.lastIndexOf('useEffect(', i), app.indexOf('}, [state.screen]);', i));
  assert.match(effect, /SCREENS\.DASHBOARD/);
  assert.match(effect, /SCREENS\.WELCOME_BACK/);
  assert.ok(!/lumoApi|fetch\(/.test(effect), 'Vorladen darf keinen API-Aufruf auslösen');
  assert.match(effect, /requestIdleCallback/);
});

it('LZ-05 nur App.jsx importiert Session-Dateien', () => {
  function walk(dir, out = []) {
    for (const n of readdirSync(dir)) {
      const u = new URL(n + (statSync(new URL(n, dir)).isDirectory() ? '/' : ''), dir);
      if (statSync(u).isDirectory()) walk(u, out); else if (/\.jsx?$/.test(n)) out.push(u);
    }
    return out;
  }
  const offenders = walk(src)
    .filter((u) => !u.pathname.includes('/screens/session/') && !u.pathname.endsWith('/src/App.jsx'))
    .filter((u) => /from\s+['"][^'"]*\/session\/[^'"]*['"]|import\(\s*['"][^'"]*\/session\//.test(readFileSync(u, 'utf8')));
  assert.deepEqual(offenders.map(String), []);
  // und App.jsx importiert nur lazy
  const appImports = [...app.matchAll(/^import .* from '\.\/screens\/session\/[^']+';/gm)];
  assert.deepEqual(appImports.map((m) => m[0]), []);
});
