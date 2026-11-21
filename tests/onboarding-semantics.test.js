/**
 * Onboarding-Startseite: echte Überschrift, ausreichend großes Klickziel
 * Die Wirkung (gleiches Aussehen, keine Layout-Verschiebung) wurde im Browser vorher/nachher bei 375 und
 * 1024 px gemessen; diese Tests halten die Struktur fest.
 *
 *   OS-01  Die Headline ist ein <h1> (kein <div> mehr), genau eines auf der Startseite
 *   OS-02  Die Schriftgröße der Headline ist gegen "h1 { font-size: 22px !important }" (unter 600 px) abgesichert
 *   OS-03  Datenschutz-Link im Cookie-Banner: Trefferfläche ≥ 24 px hoch, Layout bleibt (negativer Margin = Padding)
 */
import { it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const ob = read('../src/screens/onboarding/OnboardingScreen1.jsx');

it('OS-01 Headline als <h1>', () => {
  assert.match(ob, /<h1 className="ob-s0-head">Kopf voll\./);
  assert.ok(!/<div className="ob-s0-head"/.test(ob), 'es gibt noch ein <div class="ob-s0-head">');
  assert.equal((ob.match(/<h1\s+className=/g) || []).length, 1, 'genau ein <h1>-Element in OnboardingScreen1 erwartet');
});

it('OS-02 Schriftgröße gegen die globale Mobil-Regel abgesichert', () => {
  const css = read('../src/styles/index.css');
  assert.match(css, /h1\s*\{\s*font-size:\s*22px\s*!important;/, 'die globale Mobil-Regel existiert nicht mehr – Absicherung prüfen');
  const rule = ob.match(/\.ob-s0-head\s*\{([\s\S]*?)\n\s*\}/)[1];
  assert.match(rule, /font-size:\s*clamp\(34px, 9\.5vw, 50px\)\s*!important;/, '.ob-s0-head braucht font-size … !important');
  // Aussehen sonst unverändert (Werte der alten .ob-s0-head-Regel)
  for (const s of ["font-family: 'Instrument Serif'", 'font-style: italic', 'font-weight: 400', 'line-height: 1.06', 'letter-spacing: -.026em', 'margin-bottom: 12px']) {
    assert.ok(rule.includes(s), `Stil "${s}" fehlt`);
  }
});

it('OS-03 Datenschutz-Link: Klickziel ≥ 24 px, Banner nicht höher', () => {
  const src = read('../src/components/CookieConsent.jsx');
  const i = src.indexOf('Datenschutzerklärung');
  const block = src.slice(src.lastIndexOf('<span', i), i);
  const style = block.match(/style=\{\{([^}]*)\}\}/)[1];
  const pad = style.match(/padding:\s*'(\d+)px (\d+)px'/);
  const mar = style.match(/margin:\s*'-(\d+)px -(\d+)px'/);
  assert.ok(pad && mar, 'padding/margin fehlen');
  assert.deepEqual([pad[1], pad[2]], [mar[1], mar[2]], 'negativer Margin muss dem Padding entsprechen (sonst wächst das Layout)');
  assert.match(style, /display:\s*'inline-block'/);
  const textLine = 14; // gemessen: 11 px Schrift in der Banner-Zeile
  assert.ok(textLine + 2 * Number(pad[1]) >= 24, `Trefferfläche nur ${textLine + 2 * Number(pad[1])} px hoch`);
  assert.ok(block.includes('role="button"') && block.includes('tabIndex={0}'), 'Bedienbarkeit per Tastatur muss bleiben');
});
