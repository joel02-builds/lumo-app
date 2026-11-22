/**
 * CLS auf der Onboarding-Startseite (Lighthouse mobile: 0,189 → < 0,1)
 * Ursache war der Cookie-Banner: Er meldete seine Höhe (--cookie-banner-h) erst beim
 * Einblenden nach 1,8 s, dabei schrumpfte .ob-screen und der untere Inhalt sprang um die
 * Bannerhöhe nach oben (Layout-Shift 0,186).
 *
 *   CLS-01  Höhe wird in useLayoutEffect (vor dem ersten Paint) gemeldet
 *   CLS-02  Der Effekt hängt nicht von `visible` ab (sonst wieder erst nach 1,8 s)
 *   CLS-03  .ob-screen und Feedback-Tab nutzen weiterhin --cookie-banner-h
 */
import { it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const cc = read('src/components/CookieConsent.jsx');

it('CLS-01 Höhe vor dem ersten Paint melden', () => {
  assert.match(cc, /useLayoutEffect\(\(\) => \{[\s\S]*?--cookie-banner-h/);
});

it('CLS-02 Effekt unabhängig von visible', () => {
  const block = cc.match(/useLayoutEffect\(\(\) => \{[\s\S]*?\n  \}, \[(.*?)\]\);/);
  assert.ok(block, 'useLayoutEffect-Block nicht gefunden');
  assert.equal(block[1].trim(), '');
  assert.doesNotMatch(block[0], /!visible/);
});

it('CLS-03 Verbraucher der Variable unverändert', () => {
  assert.match(read('src/screens/onboarding/OnboardingScreen1.jsx'), /bottom: var\(--cookie-banner-h, 0px\)/);
  assert.match(read('src/components/BetaFeedbackButton.jsx'), /var\(--cookie-banner-h, 0px\)/);
});
