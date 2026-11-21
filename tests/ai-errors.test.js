/**
 * Fehlermeldungen je Fehlerklasse, KI-Antwort-Log, Wartehinweis
 * ─────────────────────────────────────────────────────────────────────────────
 * Anthropic-Client gemockt: kein echter Aufruf, keine Kosten.
 *
 *   AE-01  Anthropic 400/413 "prompt too long" / zu viele PDF-Seiten → "zu umfangreich";
 *          andere 400er bekommen NICHT diese Meldung
 *   AE-02  stop_reason max_tokens → neutral, ohne Schuldzuweisung ("zu umfangreich" nur noch bei Eingabe)
 *   AE-03  429 / 529 / overloaded_error → "Gerade ist viel los …"
 *   AE-04  401 / 403 / 404 → in Entwicklung klarer Konfigurationshinweis
 *   AE-05  401 / 404 in PRODUKTION → generische Meldung, keine Details (echter Produktions-Start)
 *   AE-06  Unverändert: Timeout, Parse-Fehler, Unbekanntes → bisherige Meldungen
 *   AE-07  Logzeile [AI]: Route, stop_reason, Tokens, Dauer, Fehlerklasse – ohne Inhalte, Dateinamen, IP
 *   AE-08  Klassifizierung (rein) als Tabelle
 *   AE-09  AnalyzingScreen: Hinweis nach 15 s, Platz reserviert (kein Layout-Sprung), Timer wird aufgeräumt
 */
import { it, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const FRIENDLY = 'Lumo hat gerade ein kleines Problem. Versuch es gleich nochmal.';
const TIMEOUT = 'Lumo braucht einen Moment länger. Warte kurz oder versuch es nochmal.';
const TOO_LONG = 'Das Material ist zu umfangreich. Teile es in kleinere Abschnitte auf.';
const OUTPUT_LONG = 'Lumo hat zu viel auf einmal geschrieben. Versuch es noch einmal.';
const BUSY = 'Gerade ist viel los. Versuch es in ein paar Sekunden noch einmal.';

let server, port, behavior;

/** Fehler in der Form, in der das Anthropic-SDK sie wirft. */
function sdkError(status, type, message, name = 'APIError') {
  const e = new Error(`${status} ${JSON.stringify({ type: 'error', error: { type, message }, request_id: 'req_test' })}`);
  e.status = status;
  e.name = name;
  e.error = { type: 'error', error: { type, message } };
  return e;
}

const okResponse = (obj, extra = {}) => ({
  stop_reason: 'end_turn',
  usage: { input_tokens: 1234, output_tokens: 56 },
  content: [{ type: 'text', text: JSON.stringify(obj) }],
  ...extra,
});

before(async () => {
  process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'test-key-ai-errors';
  process.env.NODE_ENV = 'test';
  const { app, __setClientForTesting } = await import('../server/index.js');
  __setClientForTesting({
    messages: {
      stream() {
        return {
          async finalMessage() {
            if (behavior.error) throw behavior.error;
            return behavior.response;
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
beforeEach(() => { behavior = { response: okResponse({ isGood: true, feedback: 'ok', misconception: '' }) }; });

const CARD = { concept: 'Synapse', explanation: 'GEHEIMER-INHALT-123 Signale werden chemisch übertragen.', question: 'Wie?', userAnswer: 'GEHEIMER-INHALT-123 Botenstoffe.' };
const post = (path, body, headers = {}) => fetch(`http://127.0.0.1:${port}${path}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Cookie: 'lumo_uid=abc123', ...headers },
  body: JSON.stringify(body),
}).then(async (r) => ({ status: r.status, json: await r.json() }));
const card = () => post('/api/evaluate-card-answer', CARD);
const analyze = () => post('/api/analyze', { topic: 'Bio', materialText: 'Zellen und so weiter.', goalType: 'understand' });

describe('Fehlerklassen', () => {
  it('AE-01 Eingabe zu lang → "zu umfangreich"; andere 400er nicht', async () => {
    const tooLong = [
      sdkError(400, 'invalid_request_error', 'prompt is too long: 250000 tokens > 200000 maximum', 'BadRequestError'),
      sdkError(413, 'request_too_large', 'Request exceeds the maximum allowed number of bytes.', 'APIError'),
      sdkError(400, 'invalid_request_error', 'A maximum of 100 PDF pages may be provided.', 'BadRequestError'),
    ];
    for (const e of tooLong) {
      behavior = { error: e };
      const r = await analyze();
      assert.equal(r.status, 500);
      assert.equal(r.json.error, TOO_LONG, e.message);
    }
    behavior = { error: sdkError(400, 'invalid_request_error', 'output_config.format.schema: ungültig', 'BadRequestError') };
    assert.equal((await analyze()).json.error, FRIENDLY, 'ein anderer 400er ist kein Materialproblem');
  });

  it('AE-02 stop_reason max_tokens → neutrale Meldung, keine Schuldzuweisung', async () => {
    behavior = { response: { stop_reason: 'max_tokens', usage: { input_tokens: 2500, output_tokens: 8000 }, content: [{ type: 'text', text: '{"blocks":[' }] } };
    const r = await analyze();
    assert.equal(r.status, 500);
    assert.equal(r.json.error, OUTPUT_LONG);
    assert.ok(!/umfangreich|teile|Material/i.test(r.json.error));
  });

  it('AE-03 429 / 529 / overloaded → "Gerade ist viel los"', async () => {
    for (const e of [
      sdkError(529, 'overloaded_error', 'Overloaded', 'APIError'),
      sdkError(429, 'rate_limit_error', 'Number of request tokens has exceeded your rate limit', 'RateLimitError'),
    ]) {
      behavior = { error: e };
      assert.equal((await card()).json.error, BUSY, String(e.status));
    }
  });

  it('AE-04 401 / 403 / 404 → in Entwicklung klarer Konfigurationshinweis', async () => {
    behavior = { error: sdkError(401, 'authentication_error', 'invalid x-api-key', 'AuthenticationError') };
    let r = await card();
    assert.match(r.json.error, /Konfigurationsproblem \(HTTP 401\).*ANTHROPIC_API_KEY/);
    behavior = { error: sdkError(403, 'permission_error', 'forbidden', 'PermissionDeniedError') };
    assert.match((await card()).json.error, /Konfigurationsproblem \(HTTP 403\)/);
    behavior = { error: sdkError(404, 'not_found_error', 'model: claude-xyz', 'NotFoundError') };
    r = await card();
    assert.match(r.json.error, /Konfigurationsproblem \(HTTP 404\).*MODEL.*ANTHROPIC_BASE_URL/);
  });

  it('AE-06 Unverändert: Timeout, Parse-Fehler, Unbekanntes', async () => {
    behavior = { error: Object.assign(new Error('Request timed out.'), { name: 'APIConnectionTimeoutError' }) };
    assert.equal((await card()).json.error, TIMEOUT);
    behavior = { response: { stop_reason: 'end_turn', usage: {}, content: [{ type: 'text', text: 'kein json' }] } };
    assert.equal((await card()).json.error, FRIENDLY);
    behavior = { response: { stop_reason: 'end_turn', usage: {}, content: [] } };
    assert.equal((await card()).json.error, FRIENDLY);
    behavior = { error: new Error('irgendwas Unbekanntes') };
    assert.equal((await card()).json.error, FRIENDLY);
    behavior = { error: sdkError(500, 'api_error', 'Internal server error', 'InternalServerError') };
    assert.equal((await card()).json.error, FRIENDLY);
  });
});

describe('Produktion', () => {
  it('AE-05 401 / 404 → generische Meldung, keine Details (echter Produktions-Start)', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'lumo-ae-'));
    const script = `
      const { app, __setClientForTesting } = await import('./server/index.js');
      let err;
      __setClientForTesting({ messages: { stream() { return { async finalMessage() { throw err; } }; } } });
      const srv = await new Promise((r) => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
      const out = [];
      for (const status of [401, 404]) {
        err = Object.assign(new Error(status + ' {"error":{"type":"x","message":"geheim"}}'), { status });
        const res = await fetch('http://127.0.0.1:' + srv.address().port + '/api/evaluate-card-answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Origin: 'https://example.test' },
          body: JSON.stringify(${JSON.stringify(CARD)}),
        });
        out.push({ status: res.status, body: await res.json() });
      }
      console.log('RESULT:' + JSON.stringify(out));
      process.exit(0);
    `;
    try {
      const stdout = await new Promise((resolve) => {
        execFile(process.execPath, ['--input-type=module', '-e', script], {
          cwd: new URL('../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'),
          env: { ...process.env, NODE_ENV: 'production', ANTHROPIC_API_KEY: 'test-key', DB_PATH: dir, FRONTEND_URL: 'https://example.test' },
        }, (_e, so) => resolve(so));
      });
      const line = stdout.split('\n').find((l) => l.startsWith('RESULT:'));
      assert.ok(line, 'Produktions-Start lieferte kein Ergebnis:\n' + stdout);
      for (const r of JSON.parse(line.slice(7))) {
        assert.equal(r.status, 500);
        assert.equal(r.body.error, FRIENDLY);
        assert.ok(!('details' in r.body), 'Details in Produktion');
        assert.ok(!/Konfiguration|ANTHROPIC|MODEL|geheim/i.test(JSON.stringify(r.body)));
      }
    } finally {
      try { rmSync(dir, { recursive: true, force: true }); } catch { /* Temp räumt das System */ }
    }
  });
});

describe('Logzeile', () => {
  const origLog = console.log;
  const lines = [];
  const capture = async (fn) => {
    lines.length = 0;
    console.log = (...a) => { if (a[0] === '[AI]') lines.push(a); else origLog(...a); };
    try { return await fn(); } finally { console.log = origLog; }
  };

  it('AE-07 genau eine [AI]-Zeile je Antwort, nur technische Felder', async () => {
    behavior = { response: okResponse({ isGood: true, feedback: 'ok', misconception: '' }) };
    await capture(() => card());
    assert.equal(lines.length, 1);
    const ok = JSON.parse(lines[0][1]);
    assert.deepEqual(Object.keys(ok).sort(), ['input_tokens', 'klass', 'ms', 'output_tokens', 'route', 'status', 'stop_reason']);
    assert.equal(ok.route, '/api/evaluate-card-answer');
    assert.equal(ok.stop_reason, 'end_turn');
    assert.equal(ok.input_tokens, 1234);
    assert.equal(ok.output_tokens, 56);
    assert.equal(typeof ok.ms, 'number');
    assert.equal(ok.klass, null);
    assert.equal(ok.status, null);

    behavior = { error: sdkError(529, 'overloaded_error', 'Overloaded GEHEIMER-INHALT-123') };
    await capture(() => card());
    const bad = JSON.parse(lines[0][1]);
    assert.equal(bad.klass, 'overloaded');
    assert.equal(bad.status, 529);
    assert.equal(bad.stop_reason, null);

    behavior = { response: { stop_reason: 'max_tokens', usage: { input_tokens: 10, output_tokens: 8000 }, content: [{ type: 'text', text: '{' }] } };
    await capture(() => analyze());
    const mt = JSON.parse(lines[0][1]);
    assert.deepEqual([mt.route, mt.stop_reason, mt.output_tokens, mt.klass], ['/api/analyze', 'max_tokens', 8000, 'output_too_long']);

    // keine Inhalte, Dateinamen, IP, Cookie, Nutzer-Kennung, Fehlertext
    const all = JSON.stringify(lines);
    for (const leak of ['GEHEIMER-INHALT', '127.0.0.1', 'abc123', 'lumo_uid', 'Cookie', 'Overloaded', 'Zellen']) {
      assert.ok(!all.includes(leak), `${leak} im Log`);
    }
  });
});

describe('Klassifizierung (rein)', () => {
  it('AE-08 Tabelle', async () => {
    const { classifyAiError, userMessageFor } = await import('../server/aiErrors.js');
    const cases = [
      [sdkError(400, 'invalid_request_error', 'prompt is too long: 9 tokens > 8 maximum'), 'input_too_long'],
      [sdkError(413, 'request_too_large', 'too large'), 'input_too_long'],
      [Object.assign(new Error('max_tokens_exceeded')), 'output_too_long'],
      [sdkError(529, 'overloaded_error', 'Overloaded'), 'overloaded'],
      [sdkError(429, 'rate_limit_error', 'x'), 'overloaded'],
      [sdkError(401, 'authentication_error', 'x'), 'config'],
      [sdkError(403, 'permission_error', 'x'), 'config'],
      [sdkError(404, 'not_found_error', 'x'), 'config'],
      [new Error('request_timeout'), 'timeout'],
      [Object.assign(new Error('Request timed out.'), { name: 'APIConnectionTimeoutError' }), 'timeout'],
      [new Error('json_parse_error'), 'parse'],
      [new Error('empty_response'), 'parse'],
      [sdkError(400, 'invalid_request_error', 'schema ungültig'), 'other'],
      [sdkError(500, 'api_error', 'x'), 'other'],
      [null, 'other'],
      [undefined, 'other'],
    ];
    for (const [err, klass] of cases) assert.equal(classifyAiError(err), klass, String(err?.message));
    assert.equal(userMessageFor('config', sdkError(401, 'a', 'b'), { isProd: true }), FRIENDLY);
    assert.match(userMessageFor('config', sdkError(401, 'a', 'b'), { isProd: false }), /Konfigurationsproblem/);
    assert.equal(userMessageFor('other', null, { isProd: false }), FRIENDLY);
  });
});

describe('AnalyzingScreen', () => {
  const src = readFileSync(new URL('../src/screens/AnalyzingScreen.jsx', import.meta.url), 'utf8');

  it('AE-09 Hinweis nach 15 s, Platz reserviert, Timer aufgeräumt', () => {
    assert.match(src, /const SLOW_HINT_AFTER_MS = 15000;/);
    assert.ok(src.includes('Lumo arbeitet noch, das dauert manchmal 20–30 Sekunden.'));
    assert.match(src, /setTimeout\(\(\) => setSlow\(true\), SLOW_HINT_AFTER_MS\)/);
    assert.match(src, /return \(\) => clearTimeout\(t\);/);
    const i = src.indexOf('role="status"');
    assert.ok(i > 0, 'role="status" fehlt');
    const para = src.slice(i - 80, i + 420);
    assert.match(para, /minHeight: '20px'/, 'Platz nicht reserviert → Layout-Sprung');
    assert.ok(!/opacity/.test(para), 'kein opacity auf Text');
    assert.match(para, /var\(--text-secondary\)/);
  });
});
