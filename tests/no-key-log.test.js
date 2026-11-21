/**
 * F008 — keine Logzeile über den API-Key in Produktion
 * ─────────────────────────────────────────────────────────────────────────────
 *   NK-01  Server in NODE_ENV=production importiert: Ausgabe nennt weder den Key
 *          noch "API KEY vorhanden" (Modul-Ebene läuft bei jedem Start)
 *   NK-02  Quelltext: "ANTHROPIC_API_KEY geladen." nur außerhalb von Produktion
 */
import { it } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ROOT = new URL('../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

it('NK-01 Produktions-Start loggt keine Existenz des API-Keys', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'lumo-nk-'));
  const KEY = 'sk-ant-test-NK01-geheim';
  try {
    const out = await new Promise((resolve) => {
      execFile(
        process.execPath,
        ['-e', "import('./server/index.js').then(() => setTimeout(() => process.exit(0), 400))"],
        {
          cwd: ROOT,
          env: {
            ...process.env,
            NODE_ENV: 'production',
            ANTHROPIC_API_KEY: KEY,
            DB_PATH: dir,
            FRONTEND_URL: 'https://example.test',
          },
        },
        (_err, stdout, stderr) => resolve(stdout + '\n' + stderr),
      );
    });
    assert.ok(!/API KEY/i.test(out), 'Log nennt API KEY:\n' + out);
    assert.ok(!out.includes(KEY), 'Key-Wert im Log');
    assert.ok(!/ANTHROPIC_API_KEY geladen/.test(out), 'Key-Existenz im Log');
  } finally {
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* Temp räumt das System */ }
  }
});

it('NK-02 "ANTHROPIC_API_KEY geladen." steht nur im !isProd-Zweig', () => {
  const src = readFileSync(new URL('../server/index.js', import.meta.url), 'utf8');
  assert.ok(!src.includes('API KEY vorhanden'));
  const i = src.indexOf("console.log('ANTHROPIC_API_KEY geladen.')");
  assert.ok(i > 0);
  assert.match(src.slice(Math.max(0, i - 200), i), /else if \(!isProd\)/);
});
