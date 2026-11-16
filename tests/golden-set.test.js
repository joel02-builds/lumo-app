/**
 * Golden Set (3.2) – Daten, Auswertung und Skript. Kein echter Claude-Aufruf:
 * das Skript läuft gegen einen lokalen Fake-Server.
 *
 *   GS-01  Datensatz: 20 Fälle, eindeutige IDs, Pflichtfelder, Kategorien, 10 im Kurzlauf
 *   GS-02  Datensatz: richtig/Lücke erwarten KEINE Fehlvorstellung, falsch/gemischt eine
 *   GS-03  Auswertung zählt Treffer, verpasst, False Positive, richtig still
 *   GS-04  Auswertung: leere/ungültige Antworten zählen nicht als erkannt
 *   GS-05  Skript ohne --yes ruft NICHTS auf (Trockenlauf)
 *   GS-06  Skript mit --yes: eine Anfrage pro Fall, Kurzlauf = 10, Zusammenfassung stimmt
 *   GS-07  Skript: fehlendes Feld "misconception" wird als Fehler gemeldet, nicht als "keine"
 */
import { it, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { score, hasMisconception, selectItems } from '../scripts/golden-set-lib.mjs';

const data = JSON.parse(readFileSync(new URL('../scripts/golden-set.json', import.meta.url), 'utf8'));
const items = data.items;
const SCRIPT = new URL('../scripts/golden-set-eval.mjs', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

describe('Datensatz', () => {
  it('GS-01 20 Fälle, eindeutige IDs, Pflichtfelder, 10 im Kurzlauf', () => {
    assert.equal(items.length, 20);
    assert.equal(new Set(items.map((i) => i.id)).size, 20);
    for (const i of items) {
      for (const k of ['id', 'kategorie', 'concept', 'explanation', 'question', 'userAnswer']) {
        assert.ok(typeof i[k] === 'string' && i[k].length > 0, `${i.id}: ${k} fehlt`);
      }
      assert.equal(typeof i.expectMisconception, 'boolean', `${i.id}: expectMisconception`);
      assert.ok(i.expectGood === null || typeof i.expectGood === 'boolean', `${i.id}: expectGood`);
      assert.ok(i.userAnswer.length <= 2000 && i.explanation.length <= 2000, `${i.id}: länger als die Server-Validierung erlaubt`);
    }
    assert.equal(selectItems(items, true).length, 10);
    assert.equal(selectItems(items, false).length, 20);
    const cats = new Set(items.map((i) => i.kategorie));
    for (const c of ['richtig', 'falsch', 'teilweise-luecke', 'teilweise-gemischt']) assert.ok(cats.has(c), c);
    // Kurzlauf enthält beide Arten, sonst wäre eine der Kennzahlen nicht berechenbar
    const q = selectItems(items, true);
    assert.ok(q.some((i) => i.expectMisconception) && q.some((i) => !i.expectMisconception));
  });

  it('GS-02 Erwartung passt zur Kategorie', () => {
    for (const i of items) {
      const expected = i.kategorie === 'falsch' || i.kategorie === 'teilweise-gemischt';
      assert.equal(i.expectMisconception, expected, `${i.id} (${i.kategorie})`);
      if (i.kategorie === 'richtig') assert.equal(i.expectGood, true);
      if (i.kategorie === 'falsch') assert.equal(i.expectGood, false);
    }
  });
});

describe('Auswertung', () => {
  const four = [
    { id: 'a', kategorie: 'falsch', expectMisconception: true, expectGood: false },
    { id: 'b', kategorie: 'falsch', expectMisconception: true, expectGood: false },
    { id: 'c', kategorie: 'richtig', expectMisconception: false, expectGood: true },
    { id: 'd', kategorie: 'teilweise-luecke', expectMisconception: false, expectGood: null },
  ];

  it('GS-03 Treffer, verpasst, False Positive, richtig still', () => {
    const r = score(four, {
      a: { isGood: false, misconception: 'Du hast X angenommen.' },
      b: { isGood: false, misconception: '' },
      c: { isGood: false, misconception: 'Erfunden.' },
      d: { isGood: false, misconception: '' },
    });
    assert.deepEqual(
      { tp: r.counts.tp, fn: r.counts.fn, fp: r.counts.fp, tn: r.counts.tn },
      { tp: 1, fn: 1, fp: 1, tn: 1 },
    );
    assert.equal(r.recall, 0.5);
    assert.equal(r.falsePositiveRate, 0.5);
    assert.equal(r.rows.find((x) => x.id === 'c').outcome, 'FALSE POSITIVE');
    // isGood: a ok, b ok, c weicht ab, d hat keine Erwartung → 3 geprüft, 2 ok
    assert.equal(r.counts.goodChecked, 3);
    assert.equal(r.counts.goodOk, 2);
  });

  it('GS-04 leer/ungültig zählt nicht als erkannt; Fehler und nicht gelaufene Fälle zählen nicht', () => {
    assert.equal(hasMisconception(''), false);
    assert.equal(hasMisconception('   '), false);
    assert.equal(hasMisconception(null), false);
    assert.equal(hasMisconception(7), false);
    assert.equal(hasMisconception('Du hast X angenommen.'), true);
    const r = score(four, { a: { error: 'HTTP 500' }, c: { isGood: true, misconception: '' } });
    assert.equal(r.counts.failed, 1);
    assert.equal(r.counts.tn, 1);
    assert.equal(r.counts.positives, 0);
    assert.equal(r.recall, null, 'ohne Positiv-Fälle keine Quote erfinden');
  });
});

describe('Skript', () => {
  let srv, port, hits, mode;
  before(async () => {
    srv = createServer((req, res) => {
      hits++;
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        const { userAnswer } = JSON.parse(body || '{}');
        const it = items.find((x) => x.userAnswer === userAnswer);
        const payload = { isGood: it ? !it.expectMisconception : false };
        if (mode !== 'old') payload.misconception = it?.expectMisconception ? 'Du hast X angenommen. Tatsächlich ist es Y.' : '';
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ data: payload }));
      });
    });
    await new Promise((r) => srv.listen(0, '127.0.0.1', r));
    port = srv.address().port;
  });
  after(() => new Promise((r) => srv.close(r)));

  const run = (args) => new Promise((resolve) => {
    execFile(process.execPath, [SCRIPT, '--base', `http://127.0.0.1:${port}`, '--pause', '0', ...args],
      { env: { ...process.env, LUMO_API_PORT: '1' } },
      (err, stdout) => resolve({ code: err?.code ?? 0, out: stdout }));
  });

  it('GS-05 ohne --yes: Trockenlauf, keine Anfrage', async () => {
    hits = 0; mode = 'new';
    const r = await run([]);
    assert.equal(hits, 0);
    assert.match(r.out, /NICHTS aufgerufen/);
    assert.match(r.out, /20 echte Claude-Aufrufe/);
  });

  it('GS-06 mit --yes: eine Anfrage pro Fall, Kurzlauf = 10', async () => {
    hits = 0; mode = 'new';
    const quick = await run(['--quick', '--yes']);
    assert.equal(hits, 10);
    assert.match(quick.out, /Echte Fehlvorstellungen erkannt: 5 von 5 \(100 %\)/);
    assert.match(quick.out, /False Positives \(erfunden\):\s+0 von 5 \(0 %\)/);
    hits = 0;
    await run(['--yes']);
    assert.equal(hits, 20);
  });

  it('GS-07 Server ohne misconception-Feld → Fehler, nicht "keine Fehlvorstellung"', async () => {
    hits = 0; mode = 'old';
    const r = await run(['--quick', '--yes']);
    assert.match(r.out, /Feld "misconception" fehlt/);
    assert.match(r.out, /Fehlgeschlagene Aufrufe:\s+10/);
    assert.equal(r.code, 1);
  });
});
