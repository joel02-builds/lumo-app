/**
 * F018 — Maskottchen-Assets: nur WebP, nichts Unreferenziertes
 *
 *   MA-01  Jedes in LumoMascot.jsx genannte Bild existiert in public/mascot
 *   MA-02  public/mascot enthält keine lumo-*.png mehr (4,1 MB ungenutzt, landeten in dist/)
 *   MA-03  Im Quelltext (src, server, index.html, Manifest) wird kein mascot-PNG referenziert
 */
import { it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');

it('MA-01 alle referenzierten Maskottchen-Bilder existieren', () => {
  const src = read('src/components/LumoMascot.jsx');
  const paths = [...src.matchAll(/'(\/mascot\/[^']+)'/g)].map((m) => m[1]);
  assert.ok(paths.length >= 5, 'zu wenige Pfade gefunden');
  for (const p of new Set(paths)) {
    assert.ok(p.endsWith('.webp'), p + ' ist kein WebP');
    assert.ok(existsSync(new URL('public' + p, root)), p + ' fehlt in public/');
  }
});

it('MA-02 keine lumo-*.png in public/mascot', () => {
  const pngs = readdirSync(new URL('public/mascot/', root)).filter((n) => /^lumo-.*\.png$/i.test(n));
  assert.deepEqual(pngs, []);
});

it('MA-03 kein Maskottchen-PNG im Quelltext referenziert', () => {
  function walk(dir, out = []) {
    for (const n of readdirSync(dir)) {
      const u = new URL(n + (statSync(new URL(n, dir)).isDirectory() ? '/' : ''), dir);
      if (statSync(u).isDirectory()) walk(u, out); else if (/\.(jsx?|mjs|html|css|json)$/.test(n)) out.push(u);
    }
    return out;
  }
  const files = [...walk(new URL('src/', root)), ...walk(new URL('server/', root)), new URL('index.html', root), new URL('public/manifest.json', root)];
  const hits = files.filter((f) => /mascot\/[^'"\s]*\.png/i.test(readFileSync(f, 'utf8')));
  assert.deepEqual(hits.map(String), []);
});
