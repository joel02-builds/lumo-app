/**
 * Test-Helfer: echter Produktions-Start des Servers im Kindprozess mit EIGENEM Temp-dist.
 * Rührt das echte dist/ nie an, deshalb können mehrere Testdateien parallel laufen (auch in CI vor dem Build).
 * Wird nicht von `node --test` aufgerufen (nur aus Testdateien importiert).
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const ROOT = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

/** Kleines dist mit Vite-typischen Namen (Hash = 8 Zeichen, auch mit _ und -). */
export function makeDist() {
  const dir = mkdtempSync(join(tmpdir(), 'lumo-dist-'));
  const w = (rel, content) => {
    const p = join(dir, rel);
    mkdirSync(join(p, '..'), { recursive: true });
    writeFileSync(p, content);
  };
  w('index.html', '<!doctype html><title>t</title>');
  w('manifest.json', '{"name":"t"}');
  w('sw.js', '// sw');
  w('robots.txt', 'User-agent: *\n');
  w('icon-192.png', Buffer.from([137, 80, 78, 71]));
  w('fonts/inter-latin.woff2', Buffer.from('wOF2'));
  w('mascot/lumo-idle.webp', Buffer.from('RIFF'));
  const hashed = [
    'assets/index-AbCd1234.js', 'assets/index-AbCd1234.css', 'assets/OnboardingScreen1-Zy9_x-Qw.js',
    'assets/rolldown-runtime-WkwZ5CU-.js', 'assets/workbox-window.prod.es5-Bd17z0YL.js',
  ];
  for (const f of hashed) w(f, f.endsWith('.css') ? 'a{}' : '//x');
  return { dir, hashed, cleanup: () => { try { rmSync(dir, { recursive: true, force: true }); } catch { /* Temp räumt das System */ } } };
}

/**
 * Startet den Server (NODE_ENV=production) und führt alle Proben im Prozess aus.
 * @param {{ frontendUrl?: string, distDir: string }} cfg
 * @param {Array<{ path: string, origin?: string, method?: string, body?: string, headers?: Record<string,string> }>} probes
 */
export function runProd({ frontendUrl = 'https://erlaubt.example', distDir }, probes) {
  const dbDir = mkdtempSync(join(tmpdir(), 'lumo-db-'));
  const script = `
    const { app } = await import('./server/index.js');
    const srv = await new Promise((r) => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
    const base = 'http://127.0.0.1:' + srv.address().port;
    const out = [];
    for (const p of ${JSON.stringify(probes)}) {
      const headers = { 'Content-Type': 'application/json', ...(p.origin ? { Origin: p.origin } : {}), ...(p.headers || {}) };
      // cache: 'no-cache' = Revalidierung wie im Browser (Cache-Control: max-age=0). Ohne das hängt Nodes fetch bei
      // eigenem If-None-Match "Cache-Control: no-cache" an, und Express antwortet darauf bewusst mit 200 statt 304.
      const res = await fetch(base + p.path, { method: p.method || 'GET', headers, body: p.body, redirect: 'manual', cache: 'no-cache' });
      out.push({ ...p, status: res.status, cc: res.headers.get('cache-control'), etag: res.headers.get('etag'), ct: res.headers.get('content-type'), acao: res.headers.get('access-control-allow-origin'), acac: res.headers.get('access-control-allow-credentials') });
    }
    console.log('RESULT:' + JSON.stringify(out));
    process.exit(0);
  `;
  return new Promise((resolve, reject) => {
    execFile(process.execPath, ['--input-type=module', '-e', script], {
      cwd: ROOT,
      env: { ...process.env, NODE_ENV: 'production', ANTHROPIC_API_KEY: 'test-key', DB_PATH: dbDir, FRONTEND_URL: frontendUrl, LUMO_DIST_PATH: distDir },
    }, (_e, so) => {
      try { rmSync(dbDir, { recursive: true, force: true }); } catch { /* ignore */ }
      const line = String(so).split('\n').find((l) => l.startsWith('RESULT:'));
      if (!line) return reject(new Error('Produktions-Start ohne Ergebnis:\n' + so));
      resolve(JSON.parse(line.slice(7)));
    });
  });
}
