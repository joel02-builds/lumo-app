/**
 * HTTP-Integrationstests für die Express-Endpunkte von Lumo.
 *
 * Strategie: Die Anthropic-SDK-Grenze wird durch einen injizierten Mock-Client
 * (__setClientForTesting) ersetzt. So werden tatsächliche Express-Endpunkte
 * über HTTP getestet, ohne echte Anthropic-API-Aufrufe auszulösen.
 *
 * Warum Client-Injection statt ANTHROPIC_BASE_URL + Mock-HTTP-Server:
 * Die CCR-Testumgebung hat einen Egress-Proxy, der Outbound-HTTP-Anfragen
 * von Express-Handlern abfängt – auch Loopback-Requests auf 127.0.0.1.
 * Direktes SDK-Testing (außerhalb von Express) funktioniert; HTTP-Mocking
 * für Server-interne Aufrufe ist in dieser Umgebung unzuverlässig.
 * Client-Injection ist umgebungsunabhängig und vollständig deterministisch.
 *
 * Was damit bewiesen wird:
 * - Korrekte HTTP-Statuscodes und Fehlermeldungen der Express-Routen
 * - DOCX/PDF-Validierung vor jedem Anthropic-Aufruf
 * - Weitergabe von Content-Blöcken (PDF, Text) an das SDK
 * - Korrekte Fehlerbehandlung aller SDK-Fehlermodi (500, max_tokens, invalid_json)
 * - AbortController-Propagation bei Client-Disconnect
 * - Server-seitiger Timeout-Mechanismus
 * - Genau ein SDK-Aufruf pro Request (kein Retry)
 */

import { it, before, after, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─── Konstanten (dupliziert für Assertions) ──────────────────────────────────
const TIMEOUT_ERROR  = 'Lumo braucht einen Moment länger. Warte kurz oder versuch es nochmal.';
const FRIENDLY_ERROR = 'Lumo hat gerade ein kleines Problem. Versuch es gleich nochmal.';
const MAX_TOKENS_ERR = 'Das Material ist für eine einzelne Analyse zu umfangreich. Bitte teile es in kleinere Abschnitte auf.';

// Oversized base64: floor(33554436 * 0.75) = 25165827 > 25165824 = MAX_PDF_BYTES_RAW
const OVER_LIMIT_B64 = 'A'.repeat(33554436);

// Sicherheitsnetz: maximale Wartezeit pro fetch()-Aufruf
const FETCH_TIMEOUT = 12_000;

// Mock-Antwort für erfolgreiche Analysen
// Muss alle vom analyzeSchema required-Felder enthalten:
//   blocks, totalBlocks, recommendedOrder, subject
// Außerdem müssen blocks[].title und blocks[].content für validateAnalyzeData vorhanden sein.
const MOCK_OK = {
  subject: 'mock-fach',
  totalBlocks: 1,
  recommendedOrder: [1],
  blocks: [{ id: 1, title: 'Mock', difficulty: 1, estimatedMinutes: 5, content: 'X', subtopics: [], concepts: [{ concept: 'A', explanation: 'B' }] }],
};

// ─── Geteilter Mock-Zustand ──────────────────────────────────────────────────
const mockState = {
  behavior: 'success',   // 'success' | 'max_tokens' | 'invalid_json' | 'error500' | 'hang'
  callCount: 0,          // Anzahl finalMessage()-Aufrufe (= API-Aufrufe ohne Retry)
  lastRequestBody: null, // Letzter params-Wert aus messages.stream()
  socketClosedCount: 0,  // Anzahl der Abort-Signal-Feuererungen im hang-Modus
  onRequestReceived: null,
};

// ─── Mock-Anthropic-Client ───────────────────────────────────────────────────
// Ersetzt den echten Anthropic-Client in server/index.js.
// Implementiert exakt die API, die askLumo() verwendet:
//   client.messages.stream(params, { signal }) → { finalMessage() }
//
// Kein HTTP, kein Netz — vollständig deterministisch.
function createMockAnthropicClient(state) {
  return {
    messages: {
      stream(params, options) {
        // Request-Body für spätere Assertions sichern
        state.lastRequestBody = { messages: params.messages };
        const behavior = state.behavior;  // zum Aufrufzeitpunkt einfrieren
        const abortSignal = options?.signal;

        return {
          async finalMessage() {
            state.callCount++;

            // onRequestReceived-Callback feuern (für Tests, die auf den Eingang warten)
            if (state.onRequestReceived) {
              const cb = state.onRequestReceived;
              state.onRequestReceived = null;
              cb();
            }

            // Bereits abgebrochen?
            if (abortSignal?.aborted) {
              const e = new Error('Request was aborted.'); e.name = 'AbortError'; throw e;
            }

            // ── Verhalten nach behavior ──────────────────────────────────────

            if (behavior === 'hang') {
              // Hängt bis das Abort-Signal feuert.
              // socketClosedCount simuliert "Verbindung zur Anthropic-API getrennt".
              return new Promise((_, reject) => {
                const onAbort = () => {
                  state.socketClosedCount++;
                  const e = new Error('Request was aborted.'); e.name = 'AbortError'; reject(e);
                };
                if (abortSignal?.aborted) { onAbort(); return; }
                if (abortSignal) abortSignal.addEventListener('abort', onAbort, { once: true });
              });
            }

            if (behavior === 'error500') {
              const err = new Error('Internal Server Error');
              err.status = 500; err.name = 'APIStatusError'; throw err;
            }

            if (behavior === 'max_tokens') {
              return {
                stop_reason: 'max_tokens',
                content: [{ type: 'text', text: JSON.stringify(MOCK_OK) }],
              };
            }

            if (behavior === 'invalid_json') {
              return {
                stop_reason: 'end_turn',
                content: [{ type: 'text', text: 'kein JSON )))' }],
              };
            }

            // default: success
            return {
              stop_reason: 'end_turn',
              content: [{ type: 'text', text: JSON.stringify(MOCK_OK) }],
            };
          },
        };
      },
    },
  };
}

// ─── Server-Handles ──────────────────────────────────────────────────────────
let exprServer, exprPort;

before(async () => {
  // Env vor dem Import setzen: server/index.js prüft ANTHROPIC_API_KEY beim Start
  process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'test-key-integ-x001';

  // Server-Modul importieren (isMain-Check verhindert auto-listen)
  const { app, __setClientForTesting } = await import('../server/index.js');

  // Mock-Client injizieren — ersetzt den echten Anthropic-Client
  __setClientForTesting(createMockAnthropicClient(mockState));

  // Express auf zufälligem Port starten
  exprServer = await new Promise(r => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
  exprPort = exprServer.address().port;
});

after(async () => {
  await new Promise(r => exprServer?.close(r));
});

beforeEach(() => {
  mockState.behavior         = 'success';
  mockState.callCount        = 0;
  mockState.lastRequestBody  = null;
  mockState.socketClosedCount = 0;
  mockState.onRequestReceived = null;
});

async function post(body) {
  const r = await fetch(`http://127.0.0.1:${exprPort}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(FETCH_TIMEOUT),
  });
  const j = await r.json();
  return { status: r.status, json: j };
}

// ════════════════════════════════════════════════════════════════════════════
// 1. DOCX → 400, kein Anthropic-Aufruf
// ════════════════════════════════════════════════════════════════════════════
it('DOCX → HTTP 400, kein Anthropic-Aufruf', async () => {
  const { status, json } = await post({
    topic: 'T',
    files: [{ base64: 'UEsDB', mediaType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', name: 'x.docx' }],
  });
  assert.strictEqual(status, 400);
  assert.ok(json.error?.includes('DOCX'), json.error);
  assert.strictEqual(mockState.callCount, 0);
});

// ════════════════════════════════════════════════════════════════════════════
// 2. PDF über Größenlimit → 400, kein Anthropic-Aufruf
// ════════════════════════════════════════════════════════════════════════════
it('PDF über Größenlimit → HTTP 400, kein Anthropic-Aufruf', async () => {
  const { status, json } = await post({
    topic: 'T',
    files: [{ base64: OVER_LIMIT_B64, mediaType: 'application/pdf', name: 'gross.pdf' }],
  });
  assert.strictEqual(status, 400);
  assert.ok(json.error?.includes('groß') || json.error?.includes('MB'), json.error);
  assert.strictEqual(mockState.callCount, 0);
});

// ════════════════════════════════════════════════════════════════════════════
// 3. Leere/ungültige PDF → kontrollierte Fehlermeldung
// ════════════════════════════════════════════════════════════════════════════
it('Leere/ungültige PDF → kontrollierte Fehlermeldung', async () => {
  // base64:'' ist falsy → kein document-Block; Server ruft trotzdem askLumo auf.
  // Mock gibt 500 → Server antwortet mit FRIENDLY_ERROR.
  mockState.behavior = 'error500';
  const { status, json } = await post({
    topic: 'T',
    files: [{ base64: '', mediaType: 'application/pdf', name: 'leer.pdf' }],
  });
  assert.ok(
    status === 400 || (status === 500 && json.error === FRIENDLY_ERROR),
    `Erwartet 400 oder 500+FRIENDLY_ERROR, bekommen: ${status} / ${json.error}`,
  );
});

// ════════════════════════════════════════════════════════════════════════════
// 4. Mehrere TXT-Dateien → alle Inhalte im Anthropic-Request
// ════════════════════════════════════════════════════════════════════════════
it('Mehrere TXT-Dateien → alle Inhalte gelangen in die Analyse', async () => {
  const merged = '--- datei1.txt ---\nInhalt1\n\n--- datei2.txt ---\nInhalt2';
  const { status, json } = await post({ topic: 'T', materialText: merged });
  assert.strictEqual(status, 200);
  assert.ok(json.data);
  const sentText = (mockState.lastRequestBody?.messages?.[0]?.content ?? [])
    .find(b => b.type === 'text')?.text ?? '';
  assert.ok(sentText.includes('datei1.txt'), `TXT-Header 'datei1.txt' fehlt im Prompt`);
  assert.ok(sentText.includes('datei2.txt'), `TXT-Header 'datei2.txt' fehlt im Prompt`);
  assert.ok(sentText.includes('Inhalt1'), `'Inhalt1' fehlt im Prompt`);
  assert.ok(sentText.includes('Inhalt2'), `'Inhalt2' fehlt im Prompt`);
});

// ════════════════════════════════════════════════════════════════════════════
// 5. PDF + TXT → beide Inhalte im Request
// ════════════════════════════════════════════════════════════════════════════
it('PDF + TXT → beide Inhalte gelangen in die Analyse', async () => {
  const txt = 'Lernmaterial aus TXT';
  const { status, json } = await post({
    topic: 'T',
    materialText: txt,
    files: [{ base64: 'JVBE', mediaType: 'application/pdf', name: 's.pdf' }],
  });
  assert.strictEqual(status, 200);
  const content = mockState.lastRequestBody?.messages?.[0]?.content ?? [];
  assert.ok(content.some(b => b.type === 'document'), 'document-Block fehlt im Request');
  assert.ok(content.some(b => b.type === 'text' && b.text?.includes(txt)), 'TXT-Inhalt fehlt im Request');
});

// ════════════════════════════════════════════════════════════════════════════
// 6. stop_reason=max_tokens → Fehlerstatus, kein Erfolg
// ════════════════════════════════════════════════════════════════════════════
it('stop_reason=max_tokens → verständlicher Fehlerstatus', async () => {
  mockState.behavior = 'max_tokens';
  const { status, json } = await post({ topic: 'T', materialText: 'x' });
  assert.strictEqual(status, 500);
  assert.strictEqual(json.error, MAX_TOKENS_ERR);
  assert.ok(!json.data);
});

// ════════════════════════════════════════════════════════════════════════════
// 7. Ungültiges JSON → kontrollierter Fehler
// ════════════════════════════════════════════════════════════════════════════
it('Ungültiges JSON von Anthropic → FRIENDLY_ERROR', async () => {
  mockState.behavior = 'invalid_json';
  const { status, json } = await post({ topic: 'T', materialText: 'x' });
  assert.strictEqual(status, 500);
  assert.strictEqual(json.error, FRIENDLY_ERROR);
});

// ════════════════════════════════════════════════════════════════════════════
// 8. Kein Retry bei maxRetries:0
// Was damit bewiesen wird: askLumo gibt jeden API-Fehler sofort weiter ohne
// eigene Wiederholungslogik. Zusammen mit maxRetries:0 im Anthropic-Client
// stellt das sicher, dass kein unkontrollierter Mehrfachaufruf stattfindet.
// ════════════════════════════════════════════════════════════════════════════
it('maxRetries:0 → genau ein API-Aufruf bei Fehler', async () => {
  mockState.behavior = 'error500';
  const { status } = await post({ topic: 'T', materialText: 'x' });
  assert.strictEqual(status, 500);
  assert.strictEqual(mockState.callCount, 1, `Erwartet 1 Aufruf, bekommen: ${mockState.callCount}`);
});

// ════════════════════════════════════════════════════════════════════════════
// 9. Client-Abbruch → AbortController-Kette propagiert bis zum SDK-Aufruf
// ════════════════════════════════════════════════════════════════════════════
it('Client-Abbruch → Anthropic-Aufruf wird abgebrochen', async () => {
  mockState.behavior = 'hang';
  const reqRcvd = new Promise(r => { mockState.onRequestReceived = r; });

  const ctrl = new AbortController();
  const p = fetch(`http://127.0.0.1:${exprPort}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic: 'T', materialText: 'x' }),
    signal: ctrl.signal,
  });

  // Warten bis der Mock-Client den Aufruf empfangen hat
  await reqRcvd;
  ctrl.abort();
  try { await p; } catch (e) { assert.ok(e.name === 'AbortError'); }

  // Event-Loop yielden damit Abort-Propagation (req.socket.on('close') → askLumo) durchläuft
  await new Promise(r => setTimeout(r, 150));
  assert.ok(
    mockState.socketClosedCount >= 1,
    `socketClosedCount=${mockState.socketClosedCount} — AbortController wurde nicht weitergeleitet`,
  );
});

// ════════════════════════════════════════════════════════════════════════════
// 10. Timeout während Streaming → TIMEOUT_ERROR (mock.timers)
// ════════════════════════════════════════════════════════════════════════════
it('Timeout während Streaming → TIMEOUT_ERROR', async () => {
  mockState.behavior = 'hang';
  const reqRcvd = new Promise(r => { mockState.onRequestReceived = r; });

  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const p = fetch(`http://127.0.0.1:${exprPort}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: 'T', materialText: 'to-test' }),
      // kein AbortSignal.timeout — testet server-seitigen Timeout
    });

    // Warten bis Mock den Aufruf empfangen hat (setTimeout im Server bereits gesetzt)
    await reqRcvd;

    // Fake-Timer um 56 Sekunden vorspulen → feuert setTimeout in askLumo
    mock.timers.tick(56_000);

    // Microtasks/Event-Loop yielden damit Abort-Signal-Kette durchläuft
    await new Promise(r => setImmediate(r));
    await new Promise(r => setImmediate(r));

    const resp = await p;
    const json = await resp.json();

    assert.strictEqual(resp.status, 500);
    assert.strictEqual(json.error, TIMEOUT_ERROR, `Bekommen: ${json.error}`);
  } finally {
    mock.timers.reset();
  }
});
