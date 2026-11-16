/**
 * F024 (Karten-Ebene) — Fehlvorstellungen in /api/evaluate-card-answer
 * ─────────────────────────────────────────────────────────────────────────────
 * Ehrlich zur Aussagekraft: Der Anthropic-Client ist gemockt. Diese Tests
 * belegen Schema, Prompt-Regel, Durchreichen/Absichern des Feldes, 400er und
 * UI ohne Rot. Ob das Modell bei einer falschen Antwort wirklich eine
 * Fehlvorstellung nennt und bei Lücken keine erfindet, belegen sie NICHT – das
 * misst das Golden Set (Golden Set, Punkt 3.2) mit echten Aufrufen.
 *
 *   CM-01  Schema: misconception ist Pflicht-String
 *   CM-02  Prompt: Lücke ≠ Fehlvorstellung, "" ist der Normalfall
 *   CM-03  falsche Antwort → Eintrag wird durchgereicht
 *   CM-04  richtige Antwort / Lücke → "" bleibt ""
 *   CM-05  fehlendes oder ungültiges Feld → "", Text wird getrimmt und gekürzt
 *   CM-06  fehlende Pflichtfelder → 400, kein Claude-Aufruf
 *   CM-07  Tokenbudget reicht für feedback + misconception
 *   CM-08  UI: Block nur bei Eintrag, Amber, kein Rot, wird zurückgesetzt
 */
import { it, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evaluateCardAnswerSchema, EVALUATE_CARD_ANSWER_SYSTEM } from '../server/prompts.js';
import { normalizeCardMisconception, MAX_CARD_MISCONCEPTION_CHARS } from '../server/materialUtils.js';

let server, port, nextReply, callCount, lastArgs;

before(async () => {
  process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'test-key-card-misconceptions';
  process.env.NODE_ENV = 'test';
  const { app, __setClientForTesting } = await import('../server/index.js');
  __setClientForTesting({
    messages: {
      stream(args) {
        callCount++;
        lastArgs = args;
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
beforeEach(() => { callCount = 0; lastArgs = null; nextReply = { isGood: true, feedback: 'Du hast den Zusammenhang erkannt.', misconception: '' }; });

const evaluate = (body) => fetch('http://127.0.0.1:' + port + '/api/evaluate-card-answer', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
}).then(async (r) => ({ status: r.status, json: await r.json() }));

const VALID = {
  concept: 'Synapse',
  explanation: 'Signale werden chemisch über Botenstoffe übertragen.',
  question: 'Wie wird ein Signal an der Synapse weitergegeben?',
  userAnswer: 'Über Strom, der direkt überspringt.',
};

describe('Schema und Prompt', () => {
  it('CM-01 misconception ist Pflicht-String', () => {
    assert.ok(evaluateCardAnswerSchema.required.includes('misconception'));
    assert.equal(evaluateCardAnswerSchema.properties.misconception.type, 'string');
    assert.equal(evaluateCardAnswerSchema.additionalProperties, false);
    assert.equal(evaluateCardAnswerSchema.properties.misconception.maxLength, undefined);
  });

  it('CM-02 Prompt trennt Lücke von Fehlvorstellung', () => {
    assert.match(EVALUATE_CARD_ANSWER_SYSTEM, /Lücke ist KEINE Fehlvorstellung/);
    assert.match(EVALUATE_CARD_ANSWER_SYSTEM, /leere String "" ist der NORMALFALL/);
    assert.match(EVALUATE_CARD_ANSWER_SYSTEM, /Erfinde niemals/);
  });
});

describe('Route', () => {
  it('CM-03 falsche Antwort → Eintrag wird durchgereicht', async () => {
    nextReply = { isGood: false, feedback: 'Der Übertragungsweg fehlt noch.', misconception: '  Du hast angenommen, Strom springt über. Tatsächlich übertragen Botenstoffe das Signal.  ' };
    const r = await evaluate(VALID);
    assert.equal(r.status, 200);
    assert.match(r.json.data.misconception, /^Du hast angenommen/);
    assert.equal(r.json.data.misconception, r.json.data.misconception.trim());
    assert.equal(r.json.data.isGood, false);
  });

  it('CM-04 richtige Antwort und Lücke → "" bleibt ""', async () => {
    let r = await evaluate({ ...VALID, userAnswer: 'Botenstoffe übertragen das Signal.' });
    assert.equal(r.json.data.misconception, '');
    nextReply = { isGood: false, feedback: 'Das Warum fehlt noch.', misconception: '' };
    r = await evaluate({ ...VALID, userAnswer: 'Weiß ich nicht genau.' });
    assert.equal(r.status, 200);
    assert.equal(r.json.data.misconception, '');
    assert.equal(r.json.data.isGood, false);
  });

  it('CM-05 fehlendes/ungültiges Feld → "", lange Texte werden gekürzt', async () => {
    nextReply = { isGood: true, feedback: 'ok' };
    assert.equal((await evaluate(VALID)).json.data.misconception, '');
    nextReply = { isGood: true, feedback: 'ok', misconception: 42 };
    assert.equal((await evaluate(VALID)).json.data.misconception, '');
    assert.equal(normalizeCardMisconception(null), null);
    const long = normalizeCardMisconception({ misconception: 'x'.repeat(1000) });
    assert.equal(long.misconception.length, MAX_CARD_MISCONCEPTION_CHARS);
  });

  it('CM-06 fehlende Pflichtfelder → 400 und kein Claude-Aufruf', async () => {
    const r = await evaluate({ concept: 'Synapse', explanation: 'x', question: 'y' });
    assert.equal(r.status, 400);
    assert.equal(callCount, 0);
  });

  it('CM-07 Tokenbudget reicht für feedback + misconception', async () => {
    await evaluate(VALID);
    assert.ok(lastArgs.max_tokens >= 400, 'max_tokens zu klein: ' + lastArgs.max_tokens);
  });
});

describe('UI', () => {
  const ui = readFileSync(new URL('../src/screens/session/CardLearningPhase.jsx', import.meta.url), 'utf8');

  it('CM-08 Block nur bei Eintrag, Amber, kein Rot, wird zurückgesetzt', () => {
    for (const v of ['misconception', 'repeatMisconception']) {
      assert.ok(ui.includes(`{${v} && (`), v + ': Block nicht an Eintrag gebunden');
    }
    const at = ui.indexOf('Fehlvorstellung erkannt');
    assert.ok(at > 0);
    const block = ui.slice(at - 700, at + 500);
    assert.ok(block.includes('var(--amber'), 'kein Amber');
    assert.ok(!/var\(--red|#b91c1c|#ff0000/i.test(block), 'Rot im Block');
    // Jede Stelle, die das Feedback leert, leert auch die Fehlvorstellung
    const clears = (re) => (ui.match(re) || []).length;
    assert.ok(clears(/setMisconception\(''\)/g) >= clears(/setFeedback\(null\)/g));
    assert.ok(clears(/setRepeatMisconception\(''\)/g) >= clears(/setRepeatFeedback\(null\)/g));
  });
});
