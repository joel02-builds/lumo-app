/**
 * Input-Validation-Tests — F001 + F002
 * ─────────────────────────────────────────────────────────────────────────────
 * Verifiziert, dass jede KI-Route:
 *   1. Bei leerem Body → 400 zurückgibt (IV-xx-empty)
 *   2. Bei falschem Typ  → 400 zurückgibt (IV-xx-type)
 *   3. Bei zu langem Feld → 400 zurückgibt (IV-xx-long)
 *   4. Bei gültigem Body  → Claude aufgerufen wird (IV-xx-valid)
 *   5. Body > 100 KB (Nicht-/api/analyze) → 413 (IV-bodylimit)
 *
 * Strategie: Mock-Client ersetzte den echten Anthropic-Client per
 * __setClientForTesting(). callCount belegt, ob Claude tatsächlich
 * aufgerufen wurde oder nicht.
 *
 * Test-Naming: IV-<route-kürzel>-<fall>
 *   IV-analyze, IV-chat, IV-uh (understanding-hint), IV-eu (evaluate-understanding)
 *   IV-gc (generate-cards), IV-eca (evaluate-card-answer),
 *   IV-gl (generate-lernzettel), IV-re (reexplain), IV-et (explain-term),
 *   IV-cm (generate-concept-map), IV-gf (generate-flashcards), IV-yt (youtube-videos)
 *   IV-bodylimit
 */

import { it, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';

// ─── Mock-Client ──────────────────────────────────────────────────────────────
// Zählt, wie oft Claude aufgerufen wurde. Bei gültigen Anfragen ruft der
// Server askLumo() → _client.messages.stream() auf. Dieser Mock gibt
// ein minimales Antwort-Objekt zurück, das processLumoResponse() übersteht.

let mockCallCount = 0;

const mockClient = {
  messages: {
    stream(_params, _opts) {
      mockCallCount++;
      return {
        async finalMessage() {
          return {
            stop_reason: 'end_turn',
            content: [{
              type: 'text',
              // Minimale gültige JSON-Antwort, die processLumoResponse() parst.
              // Keine echten Felder — kein validateAnalyzeData — daher safe.
              text: JSON.stringify({
                explanation: 'mock',
                isGood: false,
                feedback: 'mock',
                query: 'mock',
                cards: [],
                blocks: [{ title: 'Mock', content: 'mock', subject: 'mock' }],
                subject: 'mock',
              }),
            }],
          };
        }
      };
    }
  }
};

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

let app, server, port, setClientFn;

function post(path, body, extraHeaders = {}) {
  const bodyStr = JSON.stringify(body);
  return fetch(`http://127.0.0.1:${port}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
    body: bodyStr,
  });
}

async function startServer() {
  process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'test-key-iv';
  process.env.NODE_ENV = 'test';
  const mod = await import('../server/index.js');
  app = mod.app;
  setClientFn = mod.__setClientForTesting;

  if (typeof setClientFn !== 'function') {
    throw new Error('__setClientForTesting nicht exportiert — Tests können Mock nicht injizieren.');
  }
  setClientFn(mockClient);

  return new Promise(resolve => {
    server = createServer(app);
    server.listen(0, '127.0.0.1', () => {
      port = server.address().port;
      resolve();
    });
  });
}

function stopServer() {
  return new Promise(resolve => server.close(resolve));
}

// ─── Setup ───────────────────────────────────────────────────────────────────

before(async () => { await startServer(); });
after(async () => { await stopServer(); });
beforeEach(() => { mockCallCount = 0; });

// ─── Hilfsmakros ─────────────────────────────────────────────────────────────

/**
 * Prüft: leerer Body → 400, Claude NICHT aufgerufen.
 */
async function expectEmptyBody400(route) {
  const res = await post(route, {});
  assert.equal(res.status, 400, `${route}: leerer Body sollte 400 liefern`);
  assert.equal(mockCallCount, 0, `${route}: leerer Body darf Claude nicht aufrufen`);
}

/**
 * Prüft: gültiger Body → kein 400 / 413 (Claude wird aufgerufen oder
 * es gibt einen 429/500 — alles außer 400/413 ist ok, da hier keine
 * echte API hinter dem Mock steckt und validateAnalyzeData() ggf. wirft).
 */
async function expectValidBodyCallsClaude(route, validBody) {
  const res = await post(route, validBody);
  // 400/413 sind Validierungsfehler → wären ein Bug
  assert.notEqual(res.status, 400, `${route}: gültiger Body darf nicht 400 liefern`);
  assert.notEqual(res.status, 413, `${route}: gültiger Body darf nicht 413 liefern`);
  // Claude muss aufgerufen worden sein (es sei denn, die Route hat
  // eigene Kurzschluss-Logik — z.B. youtube ohne API-Key)
  if (route !== '/api/youtube-videos') {
    assert.ok(mockCallCount >= 1, `${route}: gültiger Body muss Claude aufrufen (mockCallCount=${mockCallCount})`);
  }
}

// ─── /api/analyze ────────────────────────────────────────────────────────────

describe('/api/analyze', () => {
  it('IV-analyze-empty: leerer Body → 400, Claude nicht aufgerufen', async () => {
    await expectEmptyBody400('/api/analyze');
  });

  it('IV-analyze-type: topic als Zahl → 400', async () => {
    const res = await post('/api/analyze', { topic: 42 });
    assert.equal(res.status, 400);
    assert.equal(mockCallCount, 0);
  });

  it('IV-analyze-long: topic > 500 Zeichen → 400', async () => {
    const res = await post('/api/analyze', { topic: 'x'.repeat(501) });
    assert.equal(res.status, 400);
    assert.equal(mockCallCount, 0);
  });

  it('IV-analyze-valid: gültiger Body → Claude aufgerufen', async () => {
    await expectValidBodyCallsClaude('/api/analyze', { topic: 'Photosynthese' });
  });
});

// ─── /api/explain-chat ───────────────────────────────────────────────────────

describe('/api/explain-chat', () => {
  const valid = { blockTitle: 'Osmose', blockContent: 'Osmose ist ein Diffusionsprozess.' };

  it('IV-chat-empty: leerer Body → 400', async () => {
    await expectEmptyBody400('/api/explain-chat');
  });

  it('IV-chat-type: blockTitle als Zahl → 400', async () => {
    const res = await post('/api/explain-chat', { blockTitle: 123, blockContent: 'x' });
    assert.equal(res.status, 400);
    assert.equal(mockCallCount, 0);
  });

  it('IV-chat-long: blockContent > 20000 Zeichen → 400', async () => {
    const res = await post('/api/explain-chat', { ...valid, blockContent: 'x'.repeat(20001) });
    assert.equal(res.status, 400);
    assert.equal(mockCallCount, 0);
  });

  it('IV-chat-valid: gültiger Body → Claude aufgerufen', async () => {
    await expectValidBodyCallsClaude('/api/explain-chat', valid);
  });
});

// ─── /api/understanding-hint ─────────────────────────────────────────────────

describe('/api/understanding-hint', () => {
  const valid = { blockTitle: 'Mitose', blockContent: 'Mitose ist Zellteilung.' };

  it('IV-uh-empty: leerer Body → 400', async () => {
    await expectEmptyBody400('/api/understanding-hint');
  });

  it('IV-uh-type: blockContent als Array → 400', async () => {
    const res = await post('/api/understanding-hint', { blockTitle: 'Mitose', blockContent: ['falsch'] });
    assert.equal(res.status, 400);
    assert.equal(mockCallCount, 0);
  });

  it('IV-uh-long: blockTitle > 500 Zeichen → 400', async () => {
    const res = await post('/api/understanding-hint', { ...valid, blockTitle: 'x'.repeat(501) });
    assert.equal(res.status, 400);
    assert.equal(mockCallCount, 0);
  });

  it('IV-uh-valid: gültiger Body → Claude aufgerufen', async () => {
    await expectValidBodyCallsClaude('/api/understanding-hint', valid);
  });
});

// ─── /api/evaluate-understanding ─────────────────────────────────────────────

describe('/api/evaluate-understanding', () => {
  const valid = { blockTitle: 'ATP', blockContent: 'ATP ist Energiewährung.', userExplanation: 'ATP liefert Energie.' };

  it('IV-eu-empty: leerer Body → 400', async () => {
    await expectEmptyBody400('/api/evaluate-understanding');
  });

  it('IV-eu-type: userExplanation als Zahl → 400', async () => {
    const res = await post('/api/evaluate-understanding', { ...valid, userExplanation: 99 });
    assert.equal(res.status, 400);
    assert.equal(mockCallCount, 0);
  });

  it('IV-eu-long: userExplanation > 2000 Zeichen → 400', async () => {
    const res = await post('/api/evaluate-understanding', { ...valid, userExplanation: 'x'.repeat(2001) });
    assert.equal(res.status, 400);
    assert.equal(mockCallCount, 0);
  });

  it('IV-eu-valid: gültiger Body → Claude aufgerufen', async () => {
    await expectValidBodyCallsClaude('/api/evaluate-understanding', valid);
  });
});

// ─── /api/generate-cards ─────────────────────────────────────────────────────

describe('/api/generate-cards', () => {
  const valid = { blockTitle: 'Fotosynthese', blockContent: 'Lichtreaktion und Dunkelreaktion.' };

  it('IV-gc-empty: leerer Body → 400', async () => {
    await expectEmptyBody400('/api/generate-cards');
  });

  it('IV-gc-type: blockContent als Objekt → 400', async () => {
    const res = await post('/api/generate-cards', { blockTitle: 'x', blockContent: {} });
    assert.equal(res.status, 400);
    assert.equal(mockCallCount, 0);
  });

  it('IV-gc-long: blockContent > 20000 Zeichen → 400', async () => {
    const res = await post('/api/generate-cards', { ...valid, blockContent: 'x'.repeat(20001) });
    assert.equal(res.status, 400);
    assert.equal(mockCallCount, 0);
  });

  it('IV-gc-valid: gültiger Body → Claude aufgerufen', async () => {
    await expectValidBodyCallsClaude('/api/generate-cards', valid);
  });
});

// ─── /api/evaluate-card-answer ───────────────────────────────────────────────

describe('/api/evaluate-card-answer', () => {
  const valid = { concept: 'Osmose', explanation: 'Diffusion durch Membran.', question: 'Was ist Osmose?', userAnswer: 'Wasser durch Membran.' };

  it('IV-eca-empty: leerer Body → 400', async () => {
    await expectEmptyBody400('/api/evaluate-card-answer');
  });

  it('IV-eca-type: userAnswer als Zahl → 400', async () => {
    const res = await post('/api/evaluate-card-answer', { ...valid, userAnswer: 42 });
    assert.equal(res.status, 400);
    assert.equal(mockCallCount, 0);
  });

  it('IV-eca-long: concept > 500 Zeichen → 400', async () => {
    const res = await post('/api/evaluate-card-answer', { ...valid, concept: 'x'.repeat(501) });
    assert.equal(res.status, 400);
    assert.equal(mockCallCount, 0);
  });

  it('IV-eca-valid: gültiger Body → Claude aufgerufen', async () => {
    await expectValidBodyCallsClaude('/api/evaluate-card-answer', valid);
  });
});

// ─── /api/generate-lernzettel ────────────────────────────────────────────────

describe('/api/generate-lernzettel', () => {
  const valid = { blockTitle: 'Zellmembran', blockContent: 'Phospholipid-Doppelschicht.' };

  it('IV-gl-empty: leerer Body → 400', async () => {
    await expectEmptyBody400('/api/generate-lernzettel');
  });

  it('IV-gl-type: cards als String → 400', async () => {
    const res = await post('/api/generate-lernzettel', { ...valid, cards: 'falsch' });
    assert.equal(res.status, 400);
    assert.equal(mockCallCount, 0);
  });

  it('IV-gl-long: blockTitle > 500 Zeichen → 400', async () => {
    const res = await post('/api/generate-lernzettel', { ...valid, blockTitle: 'x'.repeat(501) });
    assert.equal(res.status, 400);
    assert.equal(mockCallCount, 0);
  });

  it('IV-gl-valid: gültiger Body → Claude aufgerufen', async () => {
    await expectValidBodyCallsClaude('/api/generate-lernzettel', valid);
  });
});

// ─── /api/reexplain ──────────────────────────────────────────────────────────

describe('/api/reexplain', () => {
  const valid = { concept: 'Enzym', originalExplanation: 'Biologischer Katalysator.' };

  it('IV-re-empty: leerer Body → 400', async () => {
    await expectEmptyBody400('/api/reexplain');
  });

  it('IV-re-type: concept als Boolean → 400', async () => {
    const res = await post('/api/reexplain', { concept: true, originalExplanation: 'x' });
    assert.equal(res.status, 400);
    assert.equal(mockCallCount, 0);
  });

  it('IV-re-long: originalExplanation > 2000 Zeichen → 400', async () => {
    const res = await post('/api/reexplain', { ...valid, originalExplanation: 'x'.repeat(2001) });
    assert.equal(res.status, 400);
    assert.equal(mockCallCount, 0);
  });

  it('IV-re-valid: gültiger Body → Claude aufgerufen', async () => {
    await expectValidBodyCallsClaude('/api/reexplain', valid);
  });
});

// ─── /api/explain-term ───────────────────────────────────────────────────────

describe('/api/explain-term', () => {
  const valid = { term: 'Homöostase' };

  it('IV-et-empty: leerer Body → 400', async () => {
    await expectEmptyBody400('/api/explain-term');
  });

  it('IV-et-type: term als Array → 400', async () => {
    const res = await post('/api/explain-term', { term: ['falsch'] });
    assert.equal(res.status, 400);
    assert.equal(mockCallCount, 0);
  });

  it('IV-et-long: term > 500 Zeichen → 400', async () => {
    const res = await post('/api/explain-term', { term: 'x'.repeat(501) });
    assert.equal(res.status, 400);
    assert.equal(mockCallCount, 0);
  });

  it('IV-et-valid: gültiger Body → Claude aufgerufen', async () => {
    await expectValidBodyCallsClaude('/api/explain-term', valid);
  });
});

// ─── /api/generate-concept-map ───────────────────────────────────────────────

describe('/api/generate-concept-map', () => {
  const valid = { blockTitle: 'Krebs-Zyklus', blockContent: 'Citratzyklus im Mitochondrium.' };

  it('IV-cm-empty: leerer Body → 400', async () => {
    await expectEmptyBody400('/api/generate-concept-map');
  });

  it('IV-cm-type: cards als Zahl → 400', async () => {
    const res = await post('/api/generate-concept-map', { ...valid, cards: 7 });
    assert.equal(res.status, 400);
    assert.equal(mockCallCount, 0);
  });

  it('IV-cm-long: blockContent > 20000 Zeichen → 400', async () => {
    const res = await post('/api/generate-concept-map', { ...valid, blockContent: 'x'.repeat(20001) });
    assert.equal(res.status, 400);
    assert.equal(mockCallCount, 0);
  });

  it('IV-cm-valid: gültiger Body → Claude aufgerufen', async () => {
    await expectValidBodyCallsClaude('/api/generate-concept-map', valid);
  });
});

// ─── /api/generate-flashcards ────────────────────────────────────────────────

describe('/api/generate-flashcards', () => {
  const valid = { blockTitle: 'DNA-Replikation' };

  it('IV-gf-empty: leerer Body → 400', async () => {
    await expectEmptyBody400('/api/generate-flashcards');
  });

  it('IV-gf-type: uncertainConcepts als String → 400', async () => {
    const res = await post('/api/generate-flashcards', { blockTitle: 'x', uncertainConcepts: 'falsch' });
    assert.equal(res.status, 400);
    assert.equal(mockCallCount, 0);
  });

  it('IV-gf-long: blockTitle > 500 Zeichen → 400', async () => {
    const res = await post('/api/generate-flashcards', { blockTitle: 'x'.repeat(501) });
    assert.equal(res.status, 400);
    assert.equal(mockCallCount, 0);
  });

  it('IV-gf-valid: gültiger Body → Claude aufgerufen', async () => {
    await expectValidBodyCallsClaude('/api/generate-flashcards', valid);
  });
});

// ─── /api/youtube-videos ─────────────────────────────────────────────────────

describe('/api/youtube-videos', () => {
  const valid = { concept: 'Mitose' };

  it('IV-yt-empty: leerer Body → 400', async () => {
    await expectEmptyBody400('/api/youtube-videos');
  });

  it('IV-yt-type: concept als Zahl → 400', async () => {
    const res = await post('/api/youtube-videos', { concept: 123 });
    assert.equal(res.status, 400);
    assert.equal(mockCallCount, 0);
  });

  it('IV-yt-long: concept > 500 Zeichen → 400', async () => {
    const res = await post('/api/youtube-videos', { concept: 'x'.repeat(501) });
    assert.equal(res.status, 400);
    assert.equal(mockCallCount, 0);
  });

  it('IV-yt-valid: gültiger Body → kein 400/413 (Fallback ohne API-Key erwartet)', async () => {
    const res = await post('/api/youtube-videos', valid);
    assert.notEqual(res.status, 400);
    assert.notEqual(res.status, 413);
  });
});

// ─── Body-Limit ──────────────────────────────────────────────────────────────

describe('Body-Limit: > 100 KB → 413 (Nicht-/api/analyze-Route)', () => {
  it('IV-bodylimit: 101 KB Body an /api/generate-cards → 413', async () => {
    // 101 KB JSON: gültiger JSON-Body, aber zu groß.
    // "blockContent" füllt auf > 102400 Bytes auf.
    const bigBody = JSON.stringify({
      blockTitle: 'x',
      blockContent: 'x'.repeat(102400),
    });
    const res = await fetch(`http://127.0.0.1:${port}/api/generate-cards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: bigBody,
    });
    assert.equal(res.status, 413,
      `Erwartet 413 für Body > 100KB, erhalten: ${res.status}`);
    assert.equal(mockCallCount, 0, 'Bei 413 darf Claude nicht aufgerufen werden');
  });
});
