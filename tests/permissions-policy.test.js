/**
 * F019 — Permissions-Policy-Header
 *
 *   PP-01  Header ist gesetzt: Kamera, Standort, Zahlung, USB gesperrt, Mikrofon nur 'self'
 *   PP-02  Auch Fehlerantworten (404 / 400) tragen den Header
 *   PP-03  Features, die das YouTube-Embed per allow-Attribut braucht, werden NICHT gesperrt
 *   PP-04  Die App nutzt keine gesperrte Browser-Funktion (Kamera, Standort, Zahlung, USB)
 */
import { it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';

let server, port;

before(async () => {
  process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'test-key-pp';
  process.env.NODE_ENV = 'test';
  const { app } = await import('../server/index.js');
  server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  port = server.address().port;
});
after(() => new Promise((resolve) => server.close(resolve)));

const get = (path, init) => fetch(`http://127.0.0.1:${port}${path}`, init);

it('PP-01 Header gesetzt, Kamera/Standort/Zahlung/USB gesperrt, Mikrofon nur self', async () => {
  const r = await get('/api/health');
  const pp = r.headers.get('permissions-policy') || '';
  for (const f of ['camera=()', 'geolocation=()', 'payment=()', 'usb=()']) assert.ok(pp.includes(f), `${f} fehlt: ${pp}`);
  assert.ok(pp.includes('microphone=(self)'), `Mikrofon muss für die Spracheingabe erlaubt bleiben: ${pp}`);
});

it('PP-02 Fehlerantworten tragen den Header', async () => {
  const r404 = await get('/api/gibt-es-nicht');
  assert.ok(r404.headers.get('permissions-policy'));
  const r400 = await get('/api/evaluate-card-answer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(r400.status, 400);
  assert.ok(r400.headers.get('permissions-policy'));
});

it('PP-03 YouTube-Embed-Features bleiben unberührt', async () => {
  const pp = (await get('/api/health')).headers.get('permissions-policy') || '';
  for (const f of ['autoplay', 'clipboard-write', 'encrypted-media', 'accelerometer', 'gyroscope', 'fullscreen']) {
    assert.ok(!pp.includes(f), `${f} darf nicht gesperrt werden: ${pp}`);
  }
});

it('PP-04 kein Code nutzt gesperrte Funktionen', () => {
  function walk(dir, out = []) {
    for (const n of readdirSync(dir)) {
      const u = new URL(n + (statSync(new URL(n, dir)).isDirectory() ? '/' : ''), dir);
      if (statSync(u).isDirectory()) walk(u, out); else if (/\.jsx?$/.test(n)) out.push(u);
    }
    return out;
  }
  const re = /getUserMedia|navigator\.geolocation|PaymentRequest|navigator\.usb|mediaDevices/;
  const hits = walk(new URL('../src/', import.meta.url)).filter((f) => re.test(readFileSync(f, 'utf8')));
  assert.deepEqual(hits.map(String), []);
});
