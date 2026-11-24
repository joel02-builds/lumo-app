/**
 * Datenschutztext: nur Aussagen, die der Code belegt (rechtlich zu prüfen, keine Rechtsberatung)
 *
 *   PT-01  Falsche Aussagen sind weg („keine Lernmaterialien auf dem Server", „lumo-app.de" als Anbieter, „anonymisiert", „7 Tage")
 *   PT-02  Jede im Text genannte Sync-Angabe steht im Snapshot (App.jsx buildSnapshot); Material und Antworten nicht
 *   PT-03  Server entfernt Material beim Speichern (fileBase64, materialText)
 *   PT-04  Empfänger Cloudflare, YouTube, Anthropic stehen im Text; YouTube-Embed nur über youtube-nocookie
 *   PT-05  Spracheingabe-Absatz vorhanden, ohne Browser-Details (Safari/Edge/Chrome/Apple/Google)
 *   PT-06  Rechte: Art. 20, 21, 77, Widerruf; Serverdaten löschen existiert in den Einstellungen
 *   PT-07  Keine Platzhalter („TODO", „[…prüfen]") in der App
 *   PT-08  Entscheidungsliste existiert mit den offenen Punkten
 */
import { it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const legal = read('src/screens/LegalScreen.jsx');
const app = read('src/App.jsx');
const text = legal.replace(/\s+/g, ' ');

it('PT-01 falsche Aussagen entfernt', () => {
  assert.doesNotMatch(text, /keine<\/em> deiner Lernmaterialien/);
  assert.doesNotMatch(text, /lumo-app\.de/);
  assert.doesNotMatch(text, /anonymisierten Lernstand/);
  assert.doesNotMatch(text, /max\. 7 Tage/);
  assert.doesNotMatch(text, /UUID/);
});

it('PT-02 Sync-Angaben stimmen mit dem Snapshot überein', () => {
  const snap = app.slice(app.indexOf('function buildSnapshot'), app.indexOf('export default function App'));
  for (const key of ['projectName', 'materialName', 'goalType', 'goalDate', 'learningStyle', 'subjectColor', 'subjectHistory', 'blocks', 'flashcards', 'examResult', 'sessionsTotal', 'blocksAnalyzedTotal']) {
    assert.ok(snap.includes(key + ':'), key + ' fehlt im Snapshot');
  }
  assert.doesNotMatch(snap, /materialText|fileBase64/);
  for (const phrase of ['Projektname', 'Dateiname', 'Kurzfassung', 'Karteikarten', 'Prüfungsergebnis', 'Streak']) {
    assert.ok(text.includes(phrase), phrase + ' fehlt im Text');
  }
  assert.match(text, /<strong[^>]*>Nicht<\/strong> auf den Server gelangen der Text oder die Datei/);
});

it('PT-03 Server entfernt Material', () => {
  const db = read('server/db.js');
  assert.match(db, /const \{ fileBase64, materialText, \.\.\.safeState \} = state;/);
});

it('PT-04 Empfänger im Text, Embed nur nocookie', () => {
  assert.match(text, /Cloudflare:<\/strong> Vor unserem Server/);
  assert.match(text, /YouTube \(Google\):/);
  assert.match(text, /youtube-nocookie\.com/);
  assert.match(text, /API von Anthropic/);
  const yt = read('src/components/YoutubePanel.jsx');
  assert.match(yt, /https:\/\/www\.youtube-nocookie\.com\/embed\//);
  assert.doesNotMatch(yt, /https:\/\/www\.youtube\.com\/embed\//);
});

it('PT-05 Spracheingabe ohne ungeprüfte Browser-Details', () => {
  const i = text.indexOf('Spracheingabe (optional)');
  assert.ok(i > -1);
  const block = text.slice(i, text.indexOf('</p>', i));
  assert.match(block, /Lumo erhält nur den erkannten Text/);
  assert.match(block, /tippe deine Antwort einfach/);
  assert.doesNotMatch(block, /Safari|Edge|Chrome|Apple|Google|Firefox/);
});

it('PT-06 Betroffenenrechte', () => {
  for (const art of ['Art. 20 DSGVO', 'Art. 21 DSGVO', 'Art. 77 DSGVO']) assert.ok(text.includes(art), art);
  assert.match(text, /Einwilligung widerrufen/);
  assert.match(text, /Backup exportieren/);
  const settings = read('src/screens/SettingsScreen.jsx');
  assert.match(settings, /Backup exportieren/);
  assert.match(settings, /deleteServerState/);
});

it('PT-07 keine Platzhalter in der App', () => {
  assert.doesNotMatch(legal, /TODO|\[[^\]]*prüfen\]/);
});

it('PT-08 Entscheidungsliste vorhanden', () => {
  const doc = read('docs/ENTWURF-datenschutz-F006-F007.md');
  assert.match(doc, /keine Rechtsberatung/);
  for (const topic of ['Art. 6', 'TDDDG', 'DPA', 'Speicherdauer|Aufbewahrung', 'Art. 9', 'Server-Region|Region', '7 Tage']) {
    assert.match(doc, new RegExp(topic), topic);
  }
});
