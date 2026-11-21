/**
 * Nicht ladbarer lazy-Chunk nach einem Deploy → einmal neu laden bzw. Hinweis "Neue Version"
 *
 *   CR-01  Chunk-Ladefehler der drei Browser werden erkannt, andere Fehler nicht
 *   CR-02  Automatisches Neuladen höchstens einmal pro Minute (kein Endlos-Reload)
 *   CR-03  Ohne nutzbaren sessionStorage wird nicht automatisch neu geladen
 *   CR-04  main.jsx: ErrorBoundary zeigt bei Chunk-Fehlern "neue Version" und lädt einmal neu;
 *          andere Fehler behalten die bisherige Meldung; der Neu-laden-Knopf bleibt
 *   CR-05  Das Neuladen verändert keine Nutzerdaten (kein Schreiben/Löschen von Speicher)
 */
import { it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isChunkLoadError, shouldAutoReload, RELOAD_FLAG_KEY, RELOAD_COOLDOWN_MS } from '../src/utils/chunkError.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

class FakeStorage {
  constructor() { this.m = new Map(); }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { this.m.set(k, String(v)); }
}

it('CR-01 erkennt Chunk-Ladefehler (Chrome, Firefox, Safari), nicht andere Fehler', () => {
  const yes = [
    new TypeError('Failed to fetch dynamically imported module: https://x.de/assets/LegalScreen-abc.js'),
    new TypeError('error loading dynamically imported module: https://x.de/assets/a.js'),
    new TypeError('Importing a module script failed.'),
    Object.assign(new Error('Loading chunk 7 failed.'), { name: 'ChunkLoadError' }),
    { name: 'TypeError', message: 'Unable to preload CSS for /assets/x.css' },
  ];
  for (const e of yes) assert.equal(isChunkLoadError(e), true, String(e.message));
  const no = [
    new TypeError("Cannot read properties of undefined (reading 'title')"),
    new Error('Netzwerkfehler beim Analysieren'),
    null, undefined, {}, 'Failed to fetch dynamically imported module', // String ohne Fehlerobjekt zählt nicht
  ];
  for (const e of no) assert.equal(isChunkLoadError(e), false, String(e?.message ?? e));
});

it('CR-02 höchstens einmal pro Minute automatisch neu laden', () => {
  const s = new FakeStorage();
  const t0 = 1_000_000;
  assert.equal(shouldAutoReload({ storage: s, now: t0 }), true, 'erster Fehler → neu laden');
  assert.equal(s.getItem(RELOAD_FLAG_KEY), String(t0));
  assert.equal(shouldAutoReload({ storage: s, now: t0 + 5_000 }), false, 'gleich wieder → Hinweis statt Schleife');
  assert.equal(shouldAutoReload({ storage: s, now: t0 + RELOAD_COOLDOWN_MS - 1 }), false);
  assert.equal(shouldAutoReload({ storage: s, now: t0 + RELOAD_COOLDOWN_MS }), true, 'nach einer Minute wieder erlaubt');
  // kaputter Wert blockiert nicht dauerhaft
  s.setItem(RELOAD_FLAG_KEY, 'quatsch');
  assert.equal(shouldAutoReload({ storage: s, now: t0 }), true);
});

it('CR-03 ohne nutzbaren sessionStorage kein automatisches Neuladen', () => {
  const broken = { getItem() { throw new Error('gesperrt'); }, setItem() { throw new Error('gesperrt'); } };
  assert.equal(shouldAutoReload({ storage: broken }), false);
  assert.equal(shouldAutoReload({ storage: { getItem: () => null, setItem() { throw new Error('voll'); } } }), false);
});

it('CR-04 ErrorBoundary: Hinweis "Neue Version", einmal neu laden, sonst unverändert', () => {
  const main = read('../src/main.jsx');
  assert.match(main, /import \{ isChunkLoadError, shouldAutoReload \} from '\.\/utils\/chunkError\.js';/);
  assert.match(main, /const newVersion = isChunkLoadError\(this\.state\.error\);/);
  assert.match(main, /\{newVersion && <ReloadOnceOnNewVersion \/>\}/);
  assert.match(main, /if \(shouldAutoReload\(\)\) window\.location\.reload\(\);/);
  assert.ok(main.includes('Es gibt eine neue Version von Lumo.'));
  assert.ok(main.includes('Etwas ist schiefgelaufen.'), 'bisherige Meldung für echte Fehler bleibt');
  assert.ok(main.includes('Seite neu laden'), 'Knopf bleibt');
  assert.ok(main.includes('Fehlerdetails'), 'Details bleiben');
});

it('CR-05 Neuladen schreibt/löscht keine Nutzerdaten', () => {
  const lib = read('../src/utils/chunkError.js');
  const writes = lib.split(/\r?\n/).filter((l) => /\.(setItem|removeItem|clear)\(/.test(l)).map((l) => l.trim());
  assert.deepEqual(writes, ['s.setItem(RELOAD_FLAG_KEY, String(now));'], 'nur der Zeitstempel im sessionStorage');
  const code = lib.replace(/\/\*[\s\S]*?\*\//g, '').split(/\r?\n/).filter((l) => !/^\s*\/\//.test(l)).join('\n');
  assert.ok(!/localStorage|indexedDB|clearProject/.test(code), 'Nutzerdaten-Speicher im Code angefasst');
});
