#!/usr/bin/env node
/**
 * Golden Set Auswertung für /api/evaluate-card-answer (F024)
 * ─────────────────────────────────────────────────────────────────────────────
 * Schickt die Antworten aus scripts/golden-set.json an einen LAUFENDEN Lumo-Server
 * und zählt, wie oft Lumo eine Fehlvorstellung nennt – richtig und fälschlich.
 *
 * Das kostet echtes Geld (jeder Fall = 1 Claude-Aufruf, ca. 0,5 Cent mit
 * claude-sonnet-4-6). Darum macht das Skript OHNE --yes nur einen Trockenlauf.
 *
 * Benutzung (Server muss laufen, z. B. `npm run dev`, Standard-Port 3001):
 *   node scripts/golden-set-eval.mjs                  Trockenlauf: zeigt Anzahl + Kosten, ruft nichts auf
 *   node scripts/golden-set-eval.mjs --quick --yes    10 Fälle (ca. 5 Cent)
 *   node scripts/golden-set-eval.mjs --yes            alle 20 Fälle (ca. 10 Cent)
 *
 * Optionen:
 *   --base <url>   Server-Adresse (Standard http://localhost:3001; Port aus LUMO_API_PORT, falls gesetzt)
 *   --out <datei>  Ergebnis zusätzlich als JSON speichern
 *   --pause <ms>   Pause zwischen Aufrufen (Standard 1200), schont die Rate-Limits
 *
 * Das Skript liest keine .env und braucht keinen Schlüssel – den hat der Server.
 * Es ändert keine Daten; die API speichert nichts.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { score, fmt, selectItems } from './golden-set-lib.mjs';

const COST_PER_CALL_USD = 0.005; // grobe Schätzung: ~1.100 Tokens rein, ~100 raus

function parseArgs(argv) {
  const a = { yes: false, quick: false, base: null, out: null, pause: 1200 };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--yes') a.yes = true;
    else if (k === '--quick') a.quick = true;
    else if (k === '--base') a.base = argv[++i];
    else if (k === '--out') a.out = argv[++i];
    else if (k === '--pause') a.pause = Number(argv[++i]);
    else { console.error('Unbekannte Option: ' + k); process.exit(2); }
  }
  return a;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const base = (args.base || `http://localhost:${process.env.LUMO_API_PORT || 3001}`).replace(/\/$/, '');
  const data = JSON.parse(readFileSync(new URL('./golden-set.json', import.meta.url), 'utf8'));
  const items = selectItems(data.items, args.quick);

  const cost = (items.length * COST_PER_CALL_USD).toFixed(2);
  console.log(`Golden Set: ${items.length} Fälle ${args.quick ? '(Kurzlauf)' : '(alle)'} → ${items.length} echte Claude-Aufrufe, ca. ${cost} $`);
  console.log(`Server: ${base}`);

  if (!args.yes) {
    console.log('\nTrockenlauf – es wurde NICHTS aufgerufen. Mit --yes wirklich ausführen.');
    return;
  }

  const responses = {};
  for (const [n, it] of items.entries()) {
    try {
      const res = await fetch(base + '/api/evaluate-card-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          concept: it.concept, explanation: it.explanation,
          question: it.question, userAnswer: it.userAnswer,
        }),
        signal: AbortSignal.timeout(65_000),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.data) {
        responses[it.id] = { error: `HTTP ${res.status}` };
      } else if (!('misconception' in body.data)) {
        // Server läuft ohne die F024-Karten-Änderung: nicht als "keine Fehlvorstellung" zählen.
        responses[it.id] = { error: 'Feld "misconception" fehlt – läuft der Server mit der F024-Änderung?' };
      } else {
        responses[it.id] = body.data;
      }
    } catch (err) {
      responses[it.id] = { error: err?.name === 'TimeoutError' ? 'Zeitüberschreitung' : 'Server nicht erreichbar' };
    }
    process.stdout.write(`\r${n + 1}/${items.length}`);
    if (n < items.length - 1) await new Promise((r) => setTimeout(r, args.pause));
  }
  process.stdout.write('\n\n');

  const result = score(items, responses);
  for (const r of result.rows) {
    if (r.fehler) { console.log(`${r.id.padEnd(3)} FEHLER: ${r.fehler}`); continue; }
    const good = r.goodMatch === null ? '' : r.goodMatch ? ' isGood ok' : ' isGood weicht ab';
    console.log(`${r.id.padEnd(3)} ${r.kategorie.padEnd(18)} ${r.outcome.padEnd(14)}${good}`);
    if (r.text) console.log(`      Text: ${r.text}`);
  }

  const c = result.counts;
  console.log('\n── Ergebnis ──');
  console.log(`Echte Fehlvorstellungen erkannt: ${fmt(c.tp, c.positives)}`);
  console.log(`False Positives (erfunden):      ${fmt(c.fp, c.negatives)}`);
  console.log(`isGood wie erwartet:             ${fmt(c.goodOk, c.goodChecked)}`);
  if (c.failed) console.log(`Fehlgeschlagene Aufrufe:         ${c.failed} (nicht mitgezählt)`);
  console.log('\nHinweis: Kleine Stichprobe. Ob die genannten Texte inhaltlich stimmen, muss ein Mensch lesen (Zeilen „Text“).');

  if (args.out) {
    writeFileSync(args.out, JSON.stringify({ date: new Date().toISOString(), base, quick: args.quick, ...result }, null, 2));
    console.log('Gespeichert: ' + args.out);
  }
  // Exit-Code ≠ 0 nur bei technischen Fehlern, nie wegen der Qualität: das Skript misst, es gated nicht.
  if (c.failed) process.exitCode = 1;
}

main();
