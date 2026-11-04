/**
 * P-BE-05 Concurrency-Limit-Tests für /api/analyze
 *
 * Strategie: Gleiche Client-Injection wie api-integration.test.js,
 * aber eigene Datei → eigener Node-Prozess → frische Modulinstanz →
 * _activeAnalyzeCount startet bei 0 und ist unabhängig von anderen Tests.
 *
 * Was nachgewiesen wird (Sprint-1-Spec P-BE-05, Anforderungen 1–7):
 *   T1 – Drei parallele Requests dürfen zugelassen werden.
 *   T2 – Ein vierter Request wird mit HTTP 429 abgewiesen.
 *   T3 – Nach Abschluss eines Requests wird wieder ein Slot frei.
 *   T4 – Ein Fehler-Response gibt den Slot frei.
 *   T5 – Ein ungültiger JSON-Body gibt den Slot frei.
 *   T6 – Ein abgebrochener Request gibt den Slot frei.
 *   T7 – Ein abgewiesener Request wird nicht erst vollständig eingelesen.
 *
 * Warum T7 als Never-Ending-Stream:
 *   Wenn express.json() VOR der Admission Control laufen würde, müsste
 *   der Server den vollständigen Request-Body einlesen, bevor er antworten
 *   kann. Ein Stream, der nie schließt, würde den Server dann ewig blockieren.
 *   Mit der Admission-Control-First-Implementierung kommt die 429-Antwort
 *   sofort – unabhängig vom Body-Stand.
 */

import { it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// ─── Mock-Payload ─────────────────────────────────────────────────────────────
const MOCK_OK = {
  subject: 'mock-fach',
  totalBlocks: 1,
  recommendedOrder: [1],
  blocks: [{
    id: 1, title: 'Mock', difficulty: 1, estimatedMinutes: 5,
    content: 'X', subtopics: [],
    concepts: [{ concept: 'A', explanation: 'B' }],
  }],
};

// ─── Geteilter Mock-Zustand ───────────────────────────────────────────────────
const mockState = {
  behavior: 'success',  // 'success' | 'error500' | 'hang'
  callCount: 0,
  // Warteschlange von Einmal-Callbacks: jeder feuert, wenn ein Request in
  // finalMessage() ankommt (d. h. Slot erworben + Body geparst).
  requestCallbacks: [],
};

// ─── Mock-Anthropic-Client ───────────────────────────────────────────────────
function createMockClient(state) {
  return {
    messages: {
      stream(params, options) {
        // behavior zum Aufrufzeitpunkt einfrieren (Thread-Isolation zwischen Requests)
        const behavior = state.behavior;
        const signal   = options?.signal;
        return {
          async finalMessage() {
            state.callCount++;
            // Nächsten Callback aus der Warteschlange feuern (einmalig pro Request)
            if (state.requestCallbacks.length > 0) {
              state.requestCallbacks.shift()();
            }

            if (behavior === 'hang') {
              // Hängt bis AbortSignal feuert (simuliert laufenden Anthropic-Aufruf)
              return new Promise((_, reject) => {
                const onAbort = () => {
                  const e = new Error('Aborted'); e.name = 'AbortError'; reject(e);
                };
                if (signal?.aborted) return onAbort();
                signal?.addEventListener('abort', onAbort, { once: true });
              });
            }

            if (behavior === 'error500') {
              const err = new Error('Internal Server Error');
              err.status = 500; err.name = 'APIStatusError'; throw err;
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
let server, port, __getActiveAnalyzeCount;

before(async () => {
  process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'test-key-conc-x001';

  const { app, __setClientForTesting, __getActiveAnalyzeCountForTesting } =
    await import('../server/index.js');

  __setClientForTesting(createMockClient(mockState));
  __getActiveAnalyzeCount = __getActiveAnalyzeCountForTesting;

  server = await new Promise(r => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
  port   = server.address().port;
});

after(async () => {
  await new Promise(r => server?.close(r));
});

beforeEach(() => {
  mockState.behavior        = 'success';
  mockState.callCount       = 0;
  mockState.requestCallbacks = [];
});

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

/**
 * Erstellt ein Promise, das auflöst, wenn genau n Requests in
 * finalMessage() angekommen sind (Slot erworben + Body geparst).
 */
function waitForNRequests(n) {
  const promises = [];
  for (let i = 0; i < n; i++) {
    promises.push(new Promise(resolve => mockState.requestCallbacks.push(resolve)));
  }
  return Promise.all(promises);
}

/** Sendet POST /api/analyze und gibt { status, json } zurück. */
async function post(body, signal) {
  const r = await fetch(`http://127.0.0.1:${port}/api/analyze`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
    signal:  signal ?? AbortSignal.timeout(8_000),
  });
  const j = await r.json();
  return { status: r.status, json: j };
}

/**
 * Füllt n Slots mit hängenden Requests und wartet, bis alle im Mock sind.
 * Gibt { controllers, promises } zurück für späteres drainSlots().
 */
async function fillSlots(n) {
  mockState.behavior = 'hang';
  const ready       = waitForNRequests(n);
  const controllers = Array.from({ length: n }, () => new AbortController());
  const promises    = controllers.map(ctrl =>
    fetch(`http://127.0.0.1:${port}/api/analyze`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ topic: 'T', materialText: 'x' }),
      signal:  ctrl.signal,
    }),
  );
  await ready;
  return { controllers, promises };
}

/**
 * Bricht alle hängenden Slots ab und wartet auf Freigabe.
 * 200 ms genügen für: Abort → TCP-Close → req.socket('close') → _releaseSlot().
 */
async function drainSlots({ controllers, promises }) {
  controllers.forEach(c => c.abort());
  await Promise.allSettled(promises);
  await new Promise(r => setTimeout(r, 200));
}

// ════════════════════════════════════════════════════════════════════════════
// T1 – Drei parallele Requests dürfen zugelassen werden
// ════════════════════════════════════════════════════════════════════════════
it('P-BE-05 T1: Drei parallele Requests werden zugelassen (callCount=3, activeSlots=3)', async () => {
  const slots = await fillSlots(3);

  // Alle drei haben admission control passiert und befinden sich in finalMessage()
  assert.strictEqual(mockState.callCount, 3,
    'Alle drei Requests müssen vom Mock empfangen worden sein');
  assert.strictEqual(__getActiveAnalyzeCount(), 3,
    'Genau 3 Slots müssen belegt sein');

  await drainSlots(slots);

  assert.strictEqual(__getActiveAnalyzeCount(), 0,
    'Nach drainSlots müssen alle Slots freigegeben sein');
});

// ════════════════════════════════════════════════════════════════════════════
// T2 – Ein vierter Request wird mit HTTP 429 abgewiesen
// ════════════════════════════════════════════════════════════════════════════
it('P-BE-05 T2: Vierter Request → HTTP 429 mit retryAfter, kein zusätzlicher Mock-Aufruf', async () => {
  const slots = await fillSlots(3);
  try {
    const { status, json } = await post({ topic: 'T', materialText: 'x' });

    assert.strictEqual(status, 429,
      'Vierter Request muss HTTP 429 erhalten');
    assert.ok(typeof json.retryAfter === 'number',
      `retryAfter muss eine Zahl sein, bekommen: ${JSON.stringify(json)}`);
    assert.strictEqual(mockState.callCount, 3,
      'Mock darf nicht durch den abgewiesenen Request aufgerufen worden sein');
    assert.strictEqual(__getActiveAnalyzeCount(), 3,
      'Slot-Zähler darf sich durch den 429-Request nicht verändert haben');
  } finally {
    await drainSlots(slots);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// T3 – Nach Abschluss eines Requests wird wieder ein Slot frei
// ════════════════════════════════════════════════════════════════════════════
it('P-BE-05 T3: Slot wird nach Abschluss freigegeben — neuer Request wird akzeptiert', async () => {
  const slots = await fillSlots(3);
  try {
    // Vierter Request muss abgewiesen werden (Slots voll)
    { const { status } = await post({ topic: 'T', materialText: 'x' });
      assert.strictEqual(status, 429, 'Voraussetzung: vierter Request muss 429 erhalten'); }

    // Ersten Slot freigeben (Client-Abort → res.on('close') → _releaseSlot)
    slots.controllers[0].abort();
    await slots.promises[0].catch(() => {});
    await new Promise(r => setTimeout(r, 250));

    assert.strictEqual(__getActiveAnalyzeCount(), 2,
      'Nach Abort eines Slots müssen 2 Slots belegt sein');

    // Jetzt muss ein neuer Request zugelassen werden
    mockState.behavior = 'success';
    const { status } = await post({ topic: 'T', materialText: 'x' });
    assert.strictEqual(status, 200,
      'Request nach Slot-Freigabe muss HTTP 200 erhalten');
  } finally {
    // Verbleibende Slots leeren
    slots.controllers.slice(1).forEach(c => c.abort());
    await Promise.allSettled(slots.promises.slice(1));
    await new Promise(r => setTimeout(r, 200));
  }
});

// ════════════════════════════════════════════════════════════════════════════
// T4 – Ein Fehler-Response gibt den Slot frei
// ════════════════════════════════════════════════════════════════════════════
it('P-BE-05 T4: Slot wird nach API-Fehler-Response freigegeben', async () => {
  // 2 Slots füllen, damit Platz für den gezielten error500-Request bleibt
  mockState.behavior = 'hang';
  const ready2 = waitForNRequests(2);
  const ctrl2  = [new AbortController(), new AbortController()];
  const p2     = ctrl2.map(c => fetch(`http://127.0.0.1:${port}/api/analyze`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic: 'T', materialText: 'x' }), signal: c.signal,
  }));
  await ready2;

  try {
    // 3. Request: error500 → gibt Slot nach res.on('finish') frei
    mockState.behavior = 'error500';
    const r3 = await post({ topic: 'T', materialText: 'x' });
    assert.strictEqual(r3.status, 500, '3. Request muss HTTP 500 zurückgeben');

    // Kurz warten bis res 'finish' Event ausgelöst wurde
    await new Promise(r => setTimeout(r, 50));
    assert.strictEqual(__getActiveAnalyzeCount(), 2,
      'Nach Fehler-Response müssen 2 Slots belegt sein (3. wurde freigegeben)');

    // 4. Request muss jetzt zugelassen werden
    mockState.behavior = 'success';
    const r4 = await post({ topic: 'T', materialText: 'x' });
    assert.strictEqual(r4.status, 200,
      'Request nach Fehler-Slot-Freigabe muss HTTP 200 erhalten');
  } finally {
    ctrl2.forEach(c => c.abort());
    await Promise.allSettled(p2);
    await new Promise(r => setTimeout(r, 200));
  }
});

// ════════════════════════════════════════════════════════════════════════════
// T5 – Ein ungültiger JSON-Body gibt den Slot frei
// ════════════════════════════════════════════════════════════════════════════
it('P-BE-05 T5: Slot wird nach ungültigem JSON-Body (HTTP 400) freigegeben', async () => {
  // 2 Slots füllen
  mockState.behavior = 'hang';
  const ready2 = waitForNRequests(2);
  const ctrl2  = [new AbortController(), new AbortController()];
  const p2     = ctrl2.map(c => fetch(`http://127.0.0.1:${port}/api/analyze`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic: 'T', materialText: 'x' }), signal: c.signal,
  }));
  await ready2;

  try {
    // 3. Request: ungültiger JSON-Body → express.json() gibt 400 zurück → Slot frei
    // Wichtig: Slot wird VOR dem Body-Parser erworben, daher muss 400 ihn freigeben
    const r3 = await fetch(`http://127.0.0.1:${port}/api/analyze`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    '{ kein gültiges JSON }}}',
      signal:  AbortSignal.timeout(5_000),
    });
    assert.strictEqual(r3.status, 400,
      'Ungültiger JSON-Body muss HTTP 400 zurückgeben');

    await new Promise(r => setTimeout(r, 50));
    assert.strictEqual(__getActiveAnalyzeCount(), 2,
      'Nach 400-Response müssen 2 Slots belegt sein (3. wurde freigegeben)');

    // 4. Request muss jetzt zugelassen werden
    mockState.behavior = 'success';
    const r4 = await post({ topic: 'T', materialText: 'x' });
    assert.strictEqual(r4.status, 200,
      'Request nach JSON-Fehler-Freigabe muss HTTP 200 erhalten');
  } finally {
    ctrl2.forEach(c => c.abort());
    await Promise.allSettled(p2);
    await new Promise(r => setTimeout(r, 200));
  }
});

// ════════════════════════════════════════════════════════════════════════════
// T6 – Ein abgebrochener Request gibt den Slot frei
// ════════════════════════════════════════════════════════════════════════════
it('P-BE-05 T6: Slot wird nach Client-Abbruch freigegeben', async () => {
  // 2 Slots füllen (hängen)
  const slots2 = await fillSlots(2);

  // 3. hängenden Request starten
  const ready3 = waitForNRequests(1);
  const ctrl3  = new AbortController();
  const p3     = fetch(`http://127.0.0.1:${port}/api/analyze`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic: 'T', materialText: 'x' }), signal: ctrl3.signal,
  });
  await ready3;  // warten bis Slot erworben + im Mock

  assert.strictEqual(__getActiveAnalyzeCount(), 3, 'Voraussetzung: 3 Slots belegt');

  try {
    // 3. Request abbrechen → req.socket.on('close') → _releaseSlot()
    ctrl3.abort();
    await p3.catch(() => {});
    // 300 ms: Abort → TCP-Close → socket-Event → Abort-Propagation → _releaseSlot
    await new Promise(r => setTimeout(r, 300));

    assert.strictEqual(__getActiveAnalyzeCount(), 2,
      'Nach Client-Abbruch müssen 2 Slots belegt sein');

    // Neuer Request muss jetzt zugelassen werden
    mockState.behavior = 'success';
    const { status } = await post({ topic: 'T', materialText: 'x' });
    assert.strictEqual(status, 200,
      'Request nach Abbruch-Slot-Freigabe muss HTTP 200 erhalten');
  } finally {
    await drainSlots(slots2);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// T7 – Abgewiesener Request wird nicht erst vollständig eingelesen
// ════════════════════════════════════════════════════════════════════════════
it('P-BE-05 T7: HTTP 429 kommt zurück bevor Body vollständig gesendet wurde', async () => {
  // Alle 3 Slots füllen
  const slots = await fillSlots(3);

  let streamCtrl;
  try {
    // Body-Stream der nie schließt — simuliert großen Upload (z. B. 24-MB-PDF)
    // Wenn express.json() VOR der Admission Control liefe, würde der Server
    // auf das Ende dieses Streams warten → Timeout nach 5000 ms.
    // Mit Admission-Control-First kommt 429 sofort (< 2000 ms).
    const neverEndingBody = new ReadableStream({
      start(controller) {
        streamCtrl = controller;
        // Ersten Chunk senden — Stream bleibt danach offen (kein controller.close())
        controller.enqueue(new TextEncoder().encode('{"topic":"T","materialText":"'));
      },
    });

    const start = Date.now();
    // duplex: 'half' erlaubt das Empfangen einer Response während der Request-
    // Body noch gesendet wird (Node.js 18+ / undici).
    const r4 = await fetch(`http://127.0.0.1:${port}/api/analyze`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    neverEndingBody,
      duplex:  'half',
      signal:  AbortSignal.timeout(5_000),
    });
    const elapsed = Date.now() - start;

    assert.strictEqual(r4.status, 429,
      'Vierter Request auf volle Slots muss HTTP 429 erhalten');
    assert.ok(elapsed < 2000,
      `429 kam nach ${elapsed} ms — Body wurde möglicherweise gelesen ` +
      `(würde mit never-ending-Stream nie fertig werden)`);

    // Mock darf nicht aufgerufen worden sein (Slot wurde nie erworben)
    assert.strictEqual(mockState.callCount, 3,
      'Admission Control darf den Mock nicht aufgerufen haben');
  } finally {
    // Stream aufräumen (Verbindung ist bereits durch Server-Antwort geschlossen)
    try { streamCtrl?.close(); } catch (_) { /* bereits geschlossen */ }
    await drainSlots(slots);
  }
});
