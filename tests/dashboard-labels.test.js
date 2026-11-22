/**
 * WCAG 2.5.3 „Label in Name" + dekorative Bilder
 *
 *   DL-01  Block-Knöpfe im Dashboard haben kein aria-label (Name = sichtbarer Text)
 *   DL-02  Karteikarten-/Lernstand-Knopf: kein aria-label, das den sichtbaren Text verfehlt
 *   DL-03  Wordmark-Bild ist dekorativ (alt=""), der Name „lumo" steht schon als Text daneben
 */
import { it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const dash = read('src/screens/dashboard/DashboardScreen.jsx');

it('DL-01 Block-Knopf ohne abweichendes aria-label', () => {
  assert.doesNotMatch(dash, /aria-label=\{`\$\{b\.title\} – /);
});

it('DL-02 Karten- und Lernstand-Knopf ohne abweichendes aria-label', () => {
  assert.doesNotMatch(dash, /aria-label=\{dueCount > 0 \? `\$\{dueCount\} Karteikarten heute fällig/);
  assert.doesNotMatch(dash, /aria-label=\{weakCount > 0 \?/);
});

it('DL-03 Wordmark-Bild dekorativ', () => {
  const w = read('src/components/LumoWordmark.jsx');
  assert.match(w, /<img[^>]*alt=""/s);
  assert.doesNotMatch(w, /alt="Lumo"/);
});
