/**
 * Cookie-Einwilligung — lumo_uid nur auf Sync-Routen
 * ─────────────────────────────────────────────────────────────────────────────
 * lumo_uid ist kein technisch notwendiges Cookie (ePrivacy). Der Server darf es
 * deshalb nur auf den Sync-Routen /api/state* setzen – die ruft der Client
 * ausschließlich nach "Ja, gerne" im Cookie-Banner auf. Wer "Nur lokal" wählt,
 * bekommt nie ein Cookie, auch nicht über /api/health oder die KI-Routen.
 *
 *   CC-01  GET /api/health setzt kein Cookie
 *   CC-02  KI-Route ohne Cookie funktioniert und setzt kein Cookie
 *   CC-03  GET /api/state setzt das Cookie (httpOnly)
 *   CC-04  POST /api/state/streak setzt das Cookie
 *   CC-05  Vorhandenes gültiges Cookie wird auf anderen Routen nicht ersetzt
 *   CC-06  Unbekanntes Token auf einer KI-Route erzeugt keine neue Session
 *   CC-07  Client: jeder Sync-Aufruf in App.jsx hängt an der Einwilligung
 */
import { it, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

let server, port;

before(async () => {
  process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'test-key-cookie-consent';
  process.env.NODE_ENV = 'test';
  const { app, __setClientForTesting } = await import('../server/index.js');
  // Kein echter Anthropic-Aufruf: CC-02 erreicht askLumo().
  __setClientForTesting({
    messages: {
      stream() {
        return {
          async finalMessage() {
            return { stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify({ hint: 'mock' }) }] };
          },
        };
      },
    },
  });
  server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  port = server.address().port;
});

after(() => new Promise((resolve) => server.close(resolve)));

async function call(method, path, { body, cookie } = {}) {
  const res = await fetch(`http://127.0.0.1:${port}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, setCookie: res.headers.get('set-cookie') };
}

const HINT_BODY = { blockTitle: 'Titel', blockContent: 'Inhalt' };

describe('lumo_uid wird nur auf Sync-Routen gesetzt', () => {
  it('CC-01 GET /api/health setzt kein Cookie', async () => {
    const r = await call('GET', '/api/health');
    assert.equal(r.status, 200);
    assert.equal(r.setCookie, null);
  });

  it('CC-02 KI-Route ohne Cookie funktioniert und setzt kein Cookie', async () => {
    const r = await call('POST', '/api/understanding-hint', { body: HINT_BODY });
    assert.equal(r.status, 200);
    assert.equal(r.setCookie, null);
  });

  it('CC-03 GET /api/state setzt das Cookie (httpOnly)', async () => {
    const r = await call('GET', '/api/state');
    assert.equal(r.status, 200);
    assert.match(r.setCookie || '', /^lumo_uid=[0-9a-f]{64};/);
    assert.match(r.setCookie, /HttpOnly/i);
  });

  it('CC-04 POST /api/state/streak setzt das Cookie', async () => {
    const r = await call('POST', '/api/state/streak');
    assert.match(r.setCookie || '', /^lumo_uid=/);
  });

  it('CC-05 vorhandenes gültiges Cookie wird auf anderen Routen nicht ersetzt', async () => {
    const first = await call('GET', '/api/state');
    const cookie = first.setCookie.split(';')[0];
    const health = await call('GET', '/api/health', { cookie });
    const hint = await call('POST', '/api/understanding-hint', { body: HINT_BODY, cookie });
    assert.equal(health.setCookie, null);
    assert.equal(hint.setCookie, null);
  });

  it('CC-06 unbekanntes Token auf einer KI-Route erzeugt keine neue Session', async () => {
    const r = await call('POST', '/api/understanding-hint', {
      body: HINT_BODY,
      cookie: `lumo_uid=${'a'.repeat(64)}`,
    });
    assert.equal(r.status, 200);
    assert.equal(r.setCookie, null);
  });
});

describe('Client ruft Sync-Routen nur mit Einwilligung auf', () => {
  it('CC-07 jeder Sync-Aufruf in App.jsx hängt an der Einwilligung', () => {
    const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
    for (const fn of ['loadServerState(', 'scheduleSyncToServer(', 'syncStreak(']) {
      const at = app.indexOf(fn, app.indexOf('export default function App'));
      assert.ok(at > 0, `${fn} nicht gefunden`);
      const before = app.slice(Math.max(0, at - 400), at);
      assert.ok(
        before.includes("cookieConsent === 'accepted'"),
        `${fn} wird ohne Einwilligungs-Prüfung aufgerufen`
      );
    }
  });
});
