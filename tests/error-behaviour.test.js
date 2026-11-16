/**
 * Fehlerverhalten in der Session
 * ─────────────────────────────────────────────────────────────────────────────
 *   EB-01  KI ausgelastet (MAX_CONCURRENT_AI) → 429 mit Retry-After-Header,
 *          retryAfter im Body und verständlicher deutscher Meldung
 *   EB-02  Kartenlade-Fehler: echter Retry im Zustand, kein Seiten-Reload
 *   EB-03  Kein erfundenes Feedback in den catch-Blöcken der Kartenphase
 *   EB-04  Sync-Fehler-Leiste ist nicht rot
 */
import { it, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

let server, port, release;

before(async () => {
  process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'test-key-error-behaviour';
  process.env.NODE_ENV = 'test';
  const { app, __setClientForTesting } = await import('../server/index.js');
  // Mock hält jeden Aufruf offen, bis release() gerufen wird – so lassen sich
  // die fünf KI-Slots gezielt belegen. Kein echter Anthropic-Aufruf.
  const gate = new Promise((resolve) => { release = resolve; });
  __setClientForTesting({
    messages: {
      stream() {
        return {
          async finalMessage() {
            await gate;
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

const hint = () => fetch('http://127.0.0.1:' + port + '/api/understanding-hint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ blockTitle: 'Titel', blockContent: 'Inhalt' }),
});

describe('Server ausgelastet', () => {
  it('EB-01 sechster paralleler KI-Aufruf → 429 mit Retry-After', async () => {
    const pending = Array.from({ length: 5 }, hint);
    await new Promise((r) => setTimeout(r, 150)); // Slots belegen lassen
    const res = await hint();
    const json = await res.json();
    release();
    await Promise.all(pending);

    assert.equal(res.status, 429);
    assert.equal(res.headers.get('retry-after'), '5');
    assert.equal(json.retryAfter, 5);
    assert.ok(typeof json.error === 'string' && json.error.length > 10);
    assert.ok(!/error|exception|stack|status/i.test(json.error), 'Meldung klingt technisch: ' + json.error);
  });
});

describe('Kartenphase', () => {
  const cards = read('../src/screens/session/CardLearningPhase.jsx');

  it('EB-02 Kartenlade-Fehler nutzt retryKey statt Seiten-Reload', () => {
    assert.ok(!cards.includes('window.location.reload'), 'CardLearningPhase lädt die Seite neu');
    assert.ok(cards.includes('setRetryKey('), 'retryKey fehlt');
  });

  it('EB-03 kein erfundenes Feedback bei API-Fehler', () => {
    assert.ok(!cards.includes('Interessanter Gedanke'), 'Fallback-Lob bei Fehler gefunden');
    assert.ok(!/isGood:\s*true\s*,\s*feedback/.test(cards), 'Fallback mit isGood: true gefunden');
  });
});

describe('Sync-Fehler', () => {
  it('EB-04 Leiste ist nicht rot', () => {
    const app = read('../src/App.jsx');
    assert.ok(!/#b91c1c/i.test(app), 'Rot (#b91c1c) in App.jsx');
  });
});
