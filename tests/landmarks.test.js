/**
 * F017 — Landmarks (Quelltext-Schutz vor Rückfall)
 * Die Wirkung (keine Layout-Änderung, Skip-Link nur bei Tab sichtbar) wurde im
 * Browser gemessen; diese Tests halten die Struktur fest.
 *
 *   LM-01  App.jsx: <main id="main-content"> für Screens und Legal-Ansicht, Ziel des Skip-Links
 *   LM-02  App.jsx: <nav> mit aria-label um die Wordmark, Skip-Link vor allem anderen
 *   LM-03  main erzwingt keine Layout-Änderung: Höhe 100 % wie #root, kein Padding/Margin
 *   LM-04  .skip-link: Tokens, Text auf Gold #1a1206, kein opacity, nur bei Fokus sichtbar
 */
import { it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const app = read('../src/App.jsx');
const css = read('../src/styles/app.css');

it('LM-01 <main id="main-content"> für Screens und Legal', () => {
  const mains = app.match(/<main id="main-content"/g) || [];
  assert.equal(mains.length, 2, 'erwartet: Screens + Legal');
  assert.equal((app.match(/<\/main>/g) || []).length, 2);
  assert.ok(app.includes('tabIndex={-1}'), 'main braucht tabIndex -1 als Sprungziel');
});

it('LM-02 <nav> um die Wordmark, Skip-Link kommt zuerst', () => {
  assert.match(app, /<nav aria-label="[^"]+"[^>]*>\s*<LumoWordmark/);
  assert.ok(app.includes('href="#main-content" className="skip-link"'));
  assert.ok(app.indexOf('className="skip-link"') < app.indexOf('<UpdatePrompt />'));
});

it('LM-03 main verändert das Layout nicht', () => {
  const m = app.match(/const LANDMARK_MAIN_STYLE = (\{[^}]*\});/);
  assert.ok(m, 'LANDMARK_MAIN_STYLE fehlt');
  assert.ok(/height: '100%'/.test(m[1]));
  assert.ok(!/padding|margin|display|position|overflow/.test(m[1]), 'zusätzliche Layout-Eigenschaft: ' + m[1]);
});

it('LM-04 Skip-Link nutzt Tokens, kein opacity, nur bei Fokus sichtbar', () => {
  const i = css.indexOf('.skip-link {');
  assert.ok(i >= 0);
  const block = css.slice(i, css.indexOf('/* ---------- Offline-Hinweis', i));
  assert.ok(block.includes('background: var(--gold)'));
  assert.ok(block.includes('color: #1a1206'));
  assert.ok(!/opacity/.test(block));
  assert.ok(/\.skip-link:focus/.test(block) && /translateY\(0\)/.test(block));
  assert.ok(!/#D4A843|rgba\(212/i.test(block), 'hartkodiertes Gold');
});
