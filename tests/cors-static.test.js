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
 * Echter Produktions-Start im Kindprozess (NODE_ENV=production), Anthropic nicht beteiligt.
 *
 *   CS-01  FRONTEND_URL gesetzt, fremde Origin: Seite, SPA-Fallback, Manifest, Icon, robots, JS, CSS → 200
 *   CS-02  dieselbe fremde Origin an der API → wie vorher abgelehnt (500, kein Allow-Origin-Header)
 *   CS-03  erlaubte Origin: Seite und API funktionieren wie vorher (Allow-Origin + Credentials an der API)
 *   CS-04  FRONTEND_URL leer: Seite lädt (200), API lehnt weiter ab
 *   CS-05  Quelltext: CORS nur auf /api, nicht mehr global
 */
import { it, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, mkdirSync, writeFileSync, rmSync, existsSync, mkdtempSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ROOT = new URL('../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const DIST = join(ROOT, 'dist');
let createdDist = false;
let staticPaths;

before(() => {
  // CI führt die Tests VOR dem Build aus: ohne dist/ eine kleine Attrappe anlegen (und danach wieder entfernen).
  if (!existsSync(join(DIST, 'index.html'))) {
    createdDist = true;
    mkdirSync(join(DIST, 'assets'), { recursive: true });
    writeFileSync(join(DIST, 'index.html'), '<!doctype html><title>t</title>');
    writeFileSync(join(DIST, 'manifest.json'), '{"name":"t"}');
    writeFileSync(join(DIST, 'robots.txt'), 'User-agent: *\n');
    writeFileSync(join(DIST, 'icon-192.png'), Buffer.from([137, 80, 78, 71]));
    writeFileSync(join(DIST, 'assets', 'index-abc12345.js'), '//x');
    writeFileSync(join(DIST, 'assets', 'index-abc12345.css'), 'a{}');
  }
  const assets = readdirSync(join(DIST, 'assets'));
  const js = assets.find((f) => /^index-.*\.js$/.test(f));
  const css = assets.find((f) => /^index-.*\.css$/.test(f));
  assert.ok(js && css, 'dist/assets ohne index-*.js/css');
  staticPaths = ['/', '/index.html', '/irgendeine-seite', '/manifest.json', '/icon-192.png', '/robots.txt', `/assets/${js}`, `/assets/${css}`];
});
after(() => { if (createdDist) { try { rmSync(DIST, { recursive: true, force: true }); } catch { /* ignore */ } } });

/** Startet den echten Server in Produktion und führt alle Proben darin aus. */
function run(frontendUrl, probes) {
  const dir = mkdtempSync(join(tmpdir(), 'lumo-cors-'));
  const script = `
    const { app } = await import('./server/index.js');
    const srv = await new Promise((r) => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
    const base = 'http://127.0.0.1:' + srv.address().port;
    const out = [];
    for (const p of ${JSON.stringify(probes)}) {
      const res = await fetch(base + p.path, { method: p.method || 'GET', headers: { Origin: p.origin, 'Content-Type': 'application/json' }, body: p.body });
      out.push({ ...p, status: res.status, acao: res.headers.get('access-control-allow-origin'), acac: res.headers.get('access-control-allow-credentials'), ct: res.headers.get('content-type') });
    }
    console.log('RESULT:' + JSON.stringify(out));
    process.exit(0);
  `;
  return new Promise((resolve, reject) => {
    execFile(process.execPath, ['--input-type=module', '-e', script], {
      cwd: ROOT,
      env: { ...process.env, NODE_ENV: 'production', ANTHROPIC_API_KEY: 'test-key', DB_PATH: dir, FRONTEND_URL: frontendUrl },
    }, (_e, so) => {
      try { rmSync(dir, { recursive: true, force: true }); } catch { /* Temp räumt das System */ }
      const line = String(so).split('\n').find((l) => l.startsWith('RESULT:'));
      if (!line) return reject(new Error('Produktions-Start ohne Ergebnis:\n' + so));
      resolve(JSON.parse(line.slice(7)));
    });
  });
}

const FOREIGN = 'https://fremd.example';
const ALLOWED = 'https://erlaubt.example';

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
