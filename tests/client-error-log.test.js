/**
 * F016 — eigenes Fehler-Log für Client-Fehler (ohne neue Abhängigkeit)
 * ─────────────────────────────────────────────────────────────────────────────
 *   CE-01  gültige Meldung → 204, genau eine console.error-Zeile mit Typ, Screen, Meldung
 *   CE-02  Log-Injection: Zeilenumbrüche, Steuerzeichen, ANSI und Anführungszeichen werden
 *          neutralisiert – es entsteht immer genau EINE Zeile
 *   CE-03  keine Nutzerinhalte: Text in Anführungszeichen, E-Mail-Adressen und URLs werden
 *          entfernt; Meldung ≤ 200 Zeichen; Stack und unbekannte Felder werden ignoriert
 *   CE-04  ungültige Anfragen → 400 und kein Log (falscher Typ, fehlende/zu lange Felder)
 *   CE-05  Rate-Limit: nach 20 Meldungen 429
 *   CE-06  setzt kein Cookie, loggt weder IP noch Nutzer-Kennung noch User-Agent
 *   CE-07  Client: Meldungen gedrosselt/dedupliziert, Anführungszeichen-Inhalt entfernt,
 *          ErrorBoundary und window.onerror sind verdrahtet, keine neue Abhängigkeit
 */
import { it, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sanitizeClientError, MAX_CLIENT_ERROR_MESSAGE } from '../server/clientError.js';

let server, port;
const logged = [];
const origError = console.error;

before(async () => {
  process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'test-key-ce';
  process.env.NODE_ENV = 'test';
  const { app } = await import('../server/index.js');
  server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  port = server.address().port;
});
after(() => { console.error = origError; return new Promise((resolve) => server.close(resolve)); });

const post = (body, headers = {}) => fetch(`http://127.0.0.1:${port}/api/client-error`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'User-Agent': 'UA-GEHEIM-123', ...headers },
  body: typeof body === 'string' ? body : JSON.stringify(body),
});

/** Nur die [ClientError]-Zeilen eines Aufrufs einsammeln. */
async function capture(fn) {
  logged.length = 0;
  console.error = (...a) => { if (a[0] === '[ClientError]') logged.push(a); };
  try { return await fn(); } finally { console.error = origError; }
}

describe('Route', () => {
  it('CE-01 gültige Meldung → 204 und eine Logzeile', async () => {
    const r = await capture(() => post({ type: 'error', screen: 'dashboard', message: 'Cannot read properties of undefined' }));
    assert.equal(r.status, 204);
    assert.equal(logged.length, 1);
    assert.equal(logged[0].length, 2, 'Präfix + ein JSON-String');
    assert.deepEqual(JSON.parse(logged[0][1]), { type: 'error', screen: 'dashboard', message: 'Cannot read properties of undefined' });
  });

  it('CE-02 Log-Injection wird neutralisiert', async () => {
    const evil = 'x\n[ClientError] {"type":"fake"}\r\n\u001b[31mROT\u001b[0m\u2028zeile2\u0000ende';
    await capture(() => post({ type: 'boundary', screen: 'session', message: evil }));
    assert.equal(logged.length, 1, 'es darf nur EINE Logzeile entstehen');
    const line = logged[0][1];
    assert.ok(!/[\r\n\u2028\u2029\u0000\u001b]/.test(line), 'Steuerzeichen im Log');
    const parsed = JSON.parse(line);
    assert.equal(parsed.type, 'boundary');
    assert.ok(!/[\r\n\u2028\u2029\u0000\u001b]/.test(parsed.message));
    // Screen-Name kommt vom Client und wird ebenfalls geprüft
    await capture(() => post({ type: 'error', screen: 'x"\n[ClientError] y', message: 'm' }));
    assert.equal(JSON.parse(logged[0][1]).screen, 'unknown');
  });

  it('CE-03 keine Nutzerinhalte: Anführungszeichen-Text, E-Mail, URL; Länge begrenzt; Stack ignoriert', async () => {
    const msg = `Unexpected token 'Meine Klausurnotizen zur Zelle' in "{\\"text\\":\\"geheim\\"}" von max@uni.de unter https://x.example/pfad?q=1 ` + 'a'.repeat(500);
    await capture(() => post({ type: 'unhandledrejection', screen: 'session', message: msg, stack: 'at secret (/user/data.js:1:1)', userText: 'Passwort 123' }));
    const out = JSON.parse(logged[0][1]);
    assert.deepEqual(Object.keys(out).sort(), ['message', 'screen', 'type'], 'nur Typ, Screen, Meldung');
    for (const leak of ['Klausurnotizen', 'geheim', 'max@uni.de', 'x.example', 'Passwort', 'secret']) {
      assert.ok(!JSON.stringify(out).includes(leak), `Inhalt durchgesickert: ${leak}`);
    }
    assert.ok(out.message.length <= MAX_CLIENT_ERROR_MESSAGE);
    assert.match(out.message, /Unexpected token/);
  });

  it('CE-04 ungültige Anfragen → 400 und kein Log', async () => {
    const bad = [
      { type: 'sonstiges', screen: 'dashboard', message: 'm' },
      { screen: 'dashboard', message: 'm' },
      { type: 'error', screen: 'dashboard' },
      { type: 'error', screen: 'dashboard', message: '   ' },
      { type: 'error', screen: 'dashboard', message: 'x'.repeat(2001) },
      { type: 'error', screen: 'd'.repeat(100), message: 'm' },
      { type: 'error', screen: 'dashboard', message: { a: 1 } },
      '[]',
    ];
    for (const b of bad) {
      const r = await capture(() => post(b));
      assert.equal(r.status, 400, JSON.stringify(b));
      assert.equal(logged.length, 0, 'ungültige Meldung wurde geloggt: ' + JSON.stringify(b));
    }
  });

  it('CE-06 kein Cookie, keine IP / Nutzer-Kennung / User-Agent im Log', async () => {
    const r = await capture(() => post({ type: 'error', screen: 'settings', message: 'm' }, { Cookie: 'lumo_uid=abc123' }));
    assert.equal(r.status, 204);
    assert.equal(r.headers.get('set-cookie'), null);
    const text = JSON.stringify(logged);
    for (const s of ['UA-GEHEIM', '127.0.0.1', 'abc123', 'lumo_uid']) assert.ok(!text.includes(s), s + ' im Log');
  });

  it('CE-05 Rate-Limit: nach 20 Meldungen 429', async () => {
    let first429 = -1;
    await capture(async () => {
      for (let i = 1; i <= 30; i++) {
        const r = await post({ type: 'error', screen: 'dashboard', message: 'burst ' + i });
        if (r.status === 429 && first429 === -1) first429 = i;
      }
    });
    assert.ok(first429 > 0 && first429 <= 21, 'Limit greift nicht rechtzeitig: erste 429 bei ' + first429);
    assert.ok(logged.length <= 20, 'über das Limit hinaus geloggt: ' + logged.length);
  });
});

describe('Bereinigung (rein)', () => {
  it('sanitizeClientError: Normalfall, Unbrauchbares → null', () => {
    assert.deepEqual(sanitizeClientError({ type: 'error', screen: 'flashcards', message: 'Boom' }), { type: 'error', screen: 'flashcards', message: 'Boom' });
    assert.equal(sanitizeClientError(null), null);
    assert.equal(sanitizeClientError({ type: 'error', screen: 'x', message: '"nur Anführungszeichen"' })?.message, '…');
    assert.equal(sanitizeClientError({ type: 'error', screen: 5, message: 'm' })?.screen, 'unknown');
  });
});

describe('Client', () => {
  const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
  const rep = read('../src/utils/errorReport.js');

  it('CE-08 Client: höchstens 5 Meldungen, gleiche nur einmal, bereinigt, ohne Cookies', async () => {
    const mod = await import('../src/utils/errorReport.js');
    mod.__resetReportStateForTesting();
    const calls = [];
    const realFetch = globalThis.fetch;
    globalThis.fetch = (url, init) => { calls.push({ url, init }); return Promise.resolve({ ok: true }); };
    try {
      mod.setReportScreen('flashcards');
      for (let i = 0; i < 4; i++) mod.reportClientError('error', new Error('gleich'));
      assert.equal(calls.length, 1, 'gleiche Meldung nur einmal');
      for (let i = 0; i < 10; i++) mod.reportClientError('error', new Error('anders ' + i));
      assert.equal(calls.length, 5, 'höchstens 5 pro Seitenaufruf');

      mod.__resetReportStateForTesting();
      calls.length = 0;
      mod.setReportScreen('dashboard');
      mod.reportClientError('unhandledrejection', new Error(`Fehler bei 'Meine Notizen' von a@b.de`));
      const sentBody = JSON.parse(calls[0].init.body);
      assert.deepEqual(Object.keys(sentBody).sort(), ['message', 'screen', 'type']);
      assert.equal(sentBody.screen, 'dashboard');
      assert.ok(!/Notizen|a@b\.de/.test(sentBody.message));
      assert.equal(calls[0].init.credentials, 'omit');
      assert.ok(calls[0].url.endsWith('/api/client-error'));

      // Ein kaputter fetch darf nie selbst einen Fehler werfen
      globalThis.fetch = () => { throw new Error('offline'); };
      mod.__resetReportStateForTesting();
      assert.doesNotThrow(() => mod.reportClientError('error', new Error('x')));
      mod.setReportScreen('so ein Name mit Leerzeichen!');
      globalThis.fetch = (url, init) => { calls.push({ url, init }); return Promise.resolve(); };
      calls.length = 0;
      mod.reportClientError('error', new Error('y'));
      assert.equal(JSON.parse(calls[0].init.body).screen, 'unknown');
    } finally {
      globalThis.fetch = realFetch;
      mod.__resetReportStateForTesting();
    }
  });

  it('CE-07 Verdrahtung, Drosselung, keine neue Abhängigkeit', () => {
    assert.ok(read('../src/main.jsx').includes('reportClientError('), 'ErrorBoundary meldet nicht');
    assert.ok(read('../src/main.jsx').includes('installGlobalErrorHandlers'));
    assert.match(rep, /addEventListener\('error'/);
    assert.match(rep, /addEventListener\('unhandledrejection'/);
    assert.match(rep, /MAX_REPORTS_PER_PAGE/);
    assert.ok(!/message:\s*error\.stack|\.stack/.test(rep), 'Stack darf nicht gesendet werden');
    assert.ok(read('../src/App.jsx').includes('setReportScreen('), 'Screen-Name wird nicht gesetzt');
    const pkg = JSON.parse(read('../package.json'));
    const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    assert.ok(!deps.some((d) => /sentry|bugsnag|rollbar|logrocket/i.test(d)), 'Tracking-Abhängigkeit gefunden');
  });
});
