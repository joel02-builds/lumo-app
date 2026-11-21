/**
 * Statische Dateien dürfen nie von der CORS-Whitelist blockiert werden
 * ─────────────────────────────────────────────────────────────────────────────
 * Vorher: app.use(cors({ origin: Whitelist })) galt für ALLE Pfade und warf bei jeder fremden Origin
 * einen Fehler → HTTP 500 für index.html, JS, CSS, Manifest, Icons. Module-Skripte senden einen
 * Origin-Header, auch wenn die Seite von der eigenen Adresse kommt. Folge: Wer die Seite über eine
 * Adresse außerhalb von FRONTEND_URL aufruft (www/Apex, zweite Domain, onrender.com-Adresse) oder wenn
 * FRONTEND_URL in Produktion fehlt, bekam eine leere Seite.
 * Jetzt: CORS gilt nur für /api. Die API bleibt streng.
 *
 * Echter Produktions-Start im Kindprozess (NODE_ENV=production) mit eigenem Temp-dist
 * (tests/helpers/prodServer.js), Anthropic nicht beteiligt.
 *
 *   CS-01  FRONTEND_URL gesetzt, fremde Origin: Seite, SPA-Fallback, Manifest, Icon, robots, JS, CSS → 200
 *   CS-02  dieselbe fremde Origin an der API → wie vorher abgelehnt (500, kein Allow-Origin-Header)
 *   CS-03  erlaubte Origin: Seite und API funktionieren wie vorher (Allow-Origin + Credentials an der API)
 *   CS-04  FRONTEND_URL leer: Seite lädt (200), API lehnt weiter ab
 *   CS-05  Quelltext: CORS nur auf /api, nicht mehr global
 */
import { it, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { makeDist, runProd, ROOT } from './helpers/prodServer.js';

let dist, staticPaths;
before(() => {
  dist = makeDist();
  staticPaths = ['/', '/index.html', '/irgendeine-seite', '/manifest.json', '/icon-192.png', '/robots.txt', '/assets/index-AbCd1234.js', '/assets/index-AbCd1234.css'];
});
after(() => dist.cleanup());

const FOREIGN = 'https://fremd.example';
const ALLOWED = 'https://erlaubt.example';
const run = (frontendUrl, probes) => runProd({ frontendUrl, distDir: dist.dir }, probes);

describe('CORS gilt nur für die API', () => {
  it('CS-01 fremde Origin: statische Dateien und Seite → 200', async () => {
    const r = await run(ALLOWED, staticPaths.map((path) => ({ path, origin: FOREIGN })));
    for (const x of r) assert.equal(x.status, 200, `${x.path} mit fremder Origin → ${x.status}`);
    assert.match(r.find((x) => x.path === '/').ct, /text\/html/);
    assert.match(r.find((x) => x.path.endsWith('.js')).ct, /javascript/);
    for (const x of r) assert.equal(x.acao, null, 'statische Dateien brauchen keinen Allow-Origin-Header');
  });

  it('CS-02 fremde Origin an der API → wie vorher abgelehnt', async () => {
    const r = await run(ALLOWED, [
      { path: '/api/health', origin: FOREIGN },
      { path: '/api/state', origin: FOREIGN },
      { path: '/api/client-error', origin: FOREIGN, method: 'POST', body: JSON.stringify({ type: 'error', screen: 'x', message: 'm' }) },
    ]);
    for (const x of r) {
      assert.equal(x.status, 500, `${x.path} mit fremder Origin muss abgelehnt werden (war 500), ist ${x.status}`);
      assert.equal(x.acao, null);
    }
  });

  it('CS-03 erlaubte Origin: Seite und API wie vorher', async () => {
    const r = await run(ALLOWED, [
      { path: '/', origin: ALLOWED },
      { path: '/api/health', origin: ALLOWED },
    ]);
    assert.equal(r[0].status, 200);
    assert.equal(r[1].status, 200);
    assert.equal(r[1].acao, ALLOWED);
    assert.equal(r[1].acac, 'true');
  });

  it('CS-04 FRONTEND_URL leer: Seite lädt, API lehnt weiter ab', async () => {
    const own = 'https://lumo-app.onrender.com';
    const r = await run('', [
      ...staticPaths.map((path) => ({ path, origin: own })),
      { path: '/api/health', origin: own },
    ]);
    for (const x of r.filter((y) => !y.path.startsWith('/api'))) assert.equal(x.status, 200, `${x.path} bei leerem FRONTEND_URL → ${x.status}`);
    assert.equal(r.find((x) => x.path === '/api/health').status, 500, 'API bleibt streng');
  });

  it('CS-05 Quelltext: CORS nur auf /api', () => {
    const src = readFileSync(join(ROOT, 'server/index.js'), 'utf8');
    assert.match(src, /app\.use\('\/api', cors\(\{/);
    assert.ok(!/app\.use\(cors\(\{/.test(src), 'globales cors() ist noch da');
  });
});
