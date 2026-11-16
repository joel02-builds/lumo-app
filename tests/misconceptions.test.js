/**
 * F024 — Fehlvorstellungen in /api/evaluate-understanding
 * ─────────────────────────────────────────────────────────────────────────────
 * Ehrlich zur Aussagekraft: Der Anthropic-Client ist gemockt. Diese Tests
 * belegen die Technik drumherum – Schema, Prompt-Regel, Durchreichen und
 * Absichern des Feldes, Pflichtfeld-400, UI ohne Rot. Ob das Modell bei einer
 * falschen Antwort wirklich eine Fehlvorstellung nennt und bei einer richtigen
 * keine erfindet, belegen sie NICHT (das zeigen nur echte Aufrufe).
 *
 *   MC-01  Schema: misconceptions ist Pflichtfeld, Array von Strings, kein maxItems
 *   MC-02  Prompt: Lücke ≠ Fehlvorstellung, leeres Array ist der Normalfall
 *   MC-03  Route reicht einen Eintrag durch (falsche Antwort → Eintrag)
 *   MC-04  Leeres Array bleibt leer (richtige Antwort → kein Eintrag)
 *   MC-05  Fehlt das Feld in der Antwort, wird es zu []
 *   MC-06  Ungültige Einträge fliegen raus, höchstens 2 bleiben
 *   MC-07  Fehlende Pflichtfelder in der Anfrage → 400, kein Claude-Aufruf
 *   MC-08  UI: Block nur bei Einträgen, ohne Rot
 */
import { it, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evaluateUnderstandingSchema, EVALUATE_UNDERSTANDING_SYSTEM } from '../server/prompts.js';
import { normalizeMisconceptions } from '../server/materialUtils.js';

let server, port, nextReply, callCount;

const baseReply = {
  status: 'unsicher',
  goodPoints: [],
  uncertainPoints: ['Das Warum fehlt noch'],
  summaryText: 'Du hast es in eigenen Worten versucht.',
  sampleAnswer: 'Synapsen übertragen Signale chemisch über Botenstoffe.',
};

before(async () => {
  process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'test-key-misconceptions';
  process.env.NODE_ENV = 'test';
  const { app, __setClientForTesting } = await import('../server/index.js');
  __setClientForTesting({
    messages: {
      stream() {
        callCount++;
        return {
          async finalMessage() {
            return { stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(nextReply) }] };
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
beforeEach(() => { callCount = 0; nextReply = { ...baseReply, misconceptions: [] }; });

const evaluate = (body) => fetch('http://127.0.0.1:' + port + '/api/evaluate-understanding', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
}).then(async (r) => ({ status: r.status, json: await r.json() }));

const VALID = { blockTitle: 'Synapse', blockContent: 'Signalübertragung ist chemisch.', userExplanation: 'Synapsen leiten Strom schneller weiter.' };

describe('Schema und Prompt', () => {
  it('MC-01 misconceptions ist Pflichtfeld, Array von Strings, ohne maxItems', () => {
    assert.ok(evaluateUnderstandingSchema.required.includes('misconceptions'));
    const field = evaluateUnderstandingSchema.properties.misconceptions;
    assert.equal(field.type, 'array');
    assert.equal(field.items.type, 'string');
    assert.equal(field.maxItems, undefined);
    assert.equal(evaluateUnderstandingSchema.additionalProperties, false);
  });

  it('MC-02 Prompt trennt Lücke von Fehlvorstellung und nennt das leere Array als Normalfall', () => {
    assert.match(EVALUATE_UNDERSTANDING_SYSTEM, /Lücke ist KEINE Fehlvorstellung/);
    assert.match(EVALUATE_UNDERSTANDING_SYSTEM, /leere Array ist der NORMALFALL/);
    assert.match(EVALUATE_UNDERSTANDING_SYSTEM, /Erfinde niemals/);
  });
});

describe('Route', () => {
  it('MC-03 falsche Antwort → Eintrag wird durchgereicht', async () => {
    nextReply = { ...baseReply, misconceptions: ['Du hast angenommen, Synapsen leiten Strom. Tatsächlich übertragen sie chemisch über Botenstoffe.'] };
    const r = await evaluate(VALID);
    assert.equal(r.status, 200);
    assert.equal(r.json.data.misconceptions.length, 1);
    assert.match(r.json.data.misconceptions[0], /chemisch/);
  });

  it('MC-04 richtige Antwort → leeres Array bleibt leer', async () => {
    nextReply = { ...baseReply, status: 'sicher', uncertainPoints: [], misconceptions: [] };
    const r = await evaluate({ ...VALID, userExplanation: 'Botenstoffe übertragen das Signal chemisch.' });
    assert.equal(r.status, 200);
    assert.deepEqual(r.json.data.misconceptions, []);
  });

  it('MC-05 fehlt das Feld in der Antwort, wird es zu []', async () => {
    nextReply = { ...baseReply };
    const r = await evaluate(VALID);
    assert.equal(r.status, 200);
    assert.deepEqual(r.json.data.misconceptions, []);
  });

  it('MC-06 ungültige Einträge fliegen raus, höchstens 2 bleiben', () => {
    const out = normalizeMisconceptions({ misconceptions: ['  a  ', '', 42, null, 'b', 'c'] });
    assert.deepEqual(out.misconceptions, ['a', 'b']);
    assert.deepEqual(normalizeMisconceptions({ misconceptions: 'kein array' }).misconceptions, []);
    assert.equal(normalizeMisconceptions(null), null);
  });

  it('MC-07 fehlende Pflichtfelder → 400 und kein Claude-Aufruf', async () => {
    const r = await evaluate({ blockTitle: 'Synapse', blockContent: 'Inhalt' });
    assert.equal(r.status, 400);
    assert.equal(callCount, 0);
  });
});

describe('UI', () => {
  const ui = readFileSync(new URL('../src/screens/session/CheckUnderstandingPhase.jsx', import.meta.url), 'utf8');

  it('MC-08 Block nur bei Einträgen, in Amber, ohne Rot', () => {
    assert.ok(ui.includes('result.misconceptions?.length > 0'), 'Block ist nicht an Einträge gebunden');
    assert.ok(ui.includes('Fehlvorstellung erkannt'));
    const start = ui.indexOf('Fehlvorstellung erkannt') - 900;
    const block = ui.slice(Math.max(0, start), ui.indexOf('Fehlvorstellung erkannt') + 600);
    assert.ok(block.includes('var(--amber'), 'kein Amber im Block');
    assert.ok(!/var\(--red|#b91c1c|#ff0000/i.test(block), 'Rot im Fehlvorstellungs-Block');
  });
});
