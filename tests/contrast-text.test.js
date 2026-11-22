/**
 * WCAG 1.4.3 – Kontrast kleiner Texte (axe color-contrast)
 *
 *   CT-01  Onboarding-Formular: .ob-drop-sub, .ob-demo-link, .ob-file-remove, Wörter-Zähler ≥ 4,5:1
 *          (Text-Alpha auf dem hellsten Onboarding-Hintergrund #0e0c09 gerechnet)
 *   CT-02  Dashboard „~N Min": kein opacity auf dem Text (Kontrast stapelt sich mit dem Elternteil)
 */
import { it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const blend = (fg, a, bg) => fg.map((v, i) => Math.round(v * a + bg[i] * (1 - a)));
const BG = [0x0e, 0x0c, 0x09];
const FG = [240, 234, 224];

const ob = read('src/screens/onboarding/OnboardingScreen1.jsx');

it('CT-01 Onboarding-Formular-Texte ≥ 4,5:1', () => {
  const alphaOf = (re) => {
    const m = ob.match(re);
    assert.ok(m, 'Stelle nicht gefunden: ' + re);
    return parseFloat(m[1]);
  };
  const found = {
    'ob-drop-sub': alphaOf(/\.ob-drop-sub \{[^}]*color: rgba\(240,234,224,([\d.]+)\)/),
    'ob-file-remove': alphaOf(/\.ob-file-remove \{[^}]*color: rgba\(240,234,224,([\d.]+)\)/),
    'ob-demo-link': alphaOf(/\.ob-demo-link \{[^}]*color: rgba\(240,234,224,([\d.]+)\)/),
    'Wörter-Zähler': alphaOf(/color: 'rgba\(240,234,224,([\d.]+)\)', marginTop: '4px', textAlign: 'right'/),
  };
  for (const [name, a] of Object.entries(found)) {
    const r = ratio(blend(FG, a, BG), BG);
    assert.ok(r >= 4.5, `${name}: ${r.toFixed(2)}:1 < 4,5:1`);
  }
});

it('CT-02 Dashboard „~N Min" ohne opacity', () => {
  const d = read('src/screens/dashboard/DashboardScreen.jsx');
  const m = d.match(/<span style=\{\{[^}]*\}\}>\s*~\{b\.estimatedMinutes\} Min/);
  assert.ok(m, '„~N Min"-Span nicht gefunden');
  assert.doesNotMatch(m[0], /opacity/);
});
