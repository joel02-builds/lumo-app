/**
 * Cache-Header der ausgelieferten Seite
 * ─────────────────────────────────────────────────────────────────────────────
 * Vorher: alles `public, max-age=0` (Express-Standard). Dateien unter /assets haben einen Hash im Namen
 * (Vite) und ändern sich nie unter demselben Namen → dürfen ein Jahr gecacht werden. index.html, sw.js und
 * manifest.json müssen bei jedem Gebrauch geprüft werden, sonst sieht der Browser ein Update (PWA-
 * Update-Banner, neue Chunk-Namen) nicht. Komprimierung bleibt unverändert.
 *
 *   CH-01  Hash-Dateien unter /assets (auch mit _ und - im Hash): public, max-age=31536000, immutable
 *   CH-02  index.html (/, /index.html, SPA-Fallback), sw.js, manifest.json: no-cache
 *   CH-03  Revalidierung funktioniert: If-None-Match → 304 für Seite, sw.js und Assets
 *   CH-04  Übrige Dateien (Icons, Schriften, Maskottchen, robots.txt) unverändert (kein immutable)
 *   CH-05  Fehlende Hash-Datei (alter Tab nach Deploy): Antwort ist nie "immutable" (sonst würde die Seite
 *          als JavaScript für ein Jahr gecacht)
 *   CH-06  API-Antworten: kein immutable
 *   CH-07  cacheControlFor (rein)
 */
import { it, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeDist, runProd } from './helpers/prodServer.js';
import { cacheControlFor, IMMUTABLE_CACHE, REVALIDATE_CACHE } from '../server/cachePolicy.js';

let dist;
before(() => { dist = makeDist(); });
after(() => dist.cleanup());

const IMMUTABLE = 'public, max-age=31536000, immutable';
const probe = (probes) => runProd({ distDir: dist.dir }, probes);

describe('Cache-Control', () => {
  it('CH-01 Hash-Dateien: ein Jahr, immutable', async () => {
    const r = await probe(dist.hashed.map((f) => ({ path: '/' + f })));
    for (const x of r) {
      assert.equal(x.status, 200, x.path);
      assert.equal(x.cc, IMMUTABLE, x.path);
    }
  });

  it('CH-02 index.html, SPA-Fallback, sw.js, manifest.json: no-cache', async () => {
    const r = await probe(['/', '/index.html', '/irgendeine-seite', '/sw.js', '/manifest.json'].map((path) => ({ path })));
    for (const x of r) {
      assert.equal(x.status, 200, x.path);
      assert.equal(x.cc, 'no-cache', x.path);
    }
    assert.ok(r.every((x) => x.path === '/irgendeine-seite' || x.etag), 'ETag für die Revalidierung fehlt');
  });

  it('CH-03 If-None-Match → 304', async () => {
    const first = await probe([{ path: '/index.html' }, { path: '/sw.js' }, { path: '/' + dist.hashed[0] }]);
    const second = await probe(first.map((x) => ({ path: x.path, headers: { 'If-None-Match': x.etag } })));
    for (const x of second) assert.equal(x.status, 304, x.path);
  });

  it('CH-04 übrige Dateien unverändert', async () => {
    const r = await probe(['/icon-192.png', '/fonts/inter-latin.woff2', '/mascot/lumo-idle.webp', '/robots.txt'].map((path) => ({ path })));
    for (const x of r) {
      assert.equal(x.status, 200, x.path);
      assert.ok(!/immutable/.test(x.cc || ''), `${x.path}: ${x.cc}`);
      assert.equal(x.cc, 'public, max-age=0', x.path);
    }
  });

  it('CH-05 fehlende Hash-Datei (alter Tab) wird nie immutable ausgeliefert', async () => {
    const r = await probe([{ path: '/assets/LegalScreen-ALTERHSH.js' }, { path: '/assets/index-ALTERHSH.css' }]);
    for (const x of r) {
      assert.ok(!/immutable|max-age=31536000/.test(x.cc || ''), `${x.path}: ${x.cc}`);
      assert.equal(x.cc, 'no-cache', x.path);
    }
  });

  it('CH-06 API-Antworten nicht immutable', async () => {
    const [x] = await probe([{ path: '/api/health', origin: 'https://erlaubt.example' }]);
    assert.equal(x.status, 200);
    assert.ok(!/immutable/.test(x.cc || ''), String(x.cc));
  });
});

describe('cacheControlFor (rein)', () => {
  it('CH-07 Zuordnung', () => {
    for (const p of ['/assets/index-O1NtWmUS.js', '/assets/index-CCgOSex9.css', '/assets/rolldown-runtime-WkwZ5CU-.js', '/assets/OnboardingScreen1-Zy9_x-Qw.js', '/assets/workbox-window.prod.es5-Bd17z0YL.js']) {
      assert.equal(cacheControlFor(p), IMMUTABLE_CACHE, p);
    }
    assert.equal(IMMUTABLE_CACHE, IMMUTABLE);
    for (const p of ['/index.html', '/sw.js', '/manifest.json', '/registerSW.js']) assert.equal(cacheControlFor(p), REVALIDATE_CACHE, p);
    for (const p of ['/', '/icon-192.png', '/fonts/inter-latin.woff2', '/mascot/lumo-idle.webp', '/robots.txt', '/assets/kurz.js', '/assets/', '/x/assets/index-AbCd1234.js', '/workbox-2ff6bd68.js', '/assets/index-AbCd1234', '']) {
      assert.equal(cacheControlFor(p), null, p);
    }
    assert.equal(cacheControlFor(undefined), null);
  });
});
