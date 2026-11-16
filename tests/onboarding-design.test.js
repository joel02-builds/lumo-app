/**
 * Onboarding-Design (Phase 2.4)
 * ─────────────────────────────────────────────────────────────────────────────
 * Quelltext-Schutz vor Rückfall. Die Wirkung selbst (Start-Button über dem
 * Cookie-Banner, keine roten Zettel) wurde im Browser gemessen und gesehen.
 *
 *   OD-01  Onboarding hat kein Rot (Zettel, Kachel, Fehlertext)
 *   OD-02  Cookie-Banner meldet seine Höhe, Onboarding und Feedback-Lasche nutzen sie
 *   OD-03  Jeder verwendete Icon-Name existiert in Icon.jsx
 */
import { it, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';

const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

describe('Onboarding', () => {
  const ob = read('../src/screens/onboarding/OnboardingScreen1.jsx');

  it('OD-01 kein Rot im Onboarding', () => {
    assert.ok(!/ob-ftab red/.test(ob), 'roter Zettel');
    assert.ok(!/220,\s*60,\s*60/.test(ob), 'rgba(220,60,60) – Rot');
    assert.ok(!/#F5A0A0/i.test(ob), '#F5A0A0 – Rosa-Rot');
    assert.ok(!/#E05050/i.test(ob), '#E05050 – Rot');
  });

  it('OD-02 Cookie-Banner reserviert Platz', () => {
    assert.ok(read('../src/components/CookieConsent.jsx').includes('--cookie-banner-h'));
    assert.ok(ob.includes('var(--cookie-banner-h'));
    assert.ok(read('../src/components/BetaFeedbackButton.jsx').includes('var(--cookie-banner-h'));
  });
});

describe('Icons', () => {
  const iconSrc = read('../src/components/Icon.jsx');
  const known = new Set([...iconSrc.matchAll(/^\s{2}([a-zA-Z]+):\s*'/gm)].map((m) => m[1]));

  function walk(dir, out = []) {
    for (const name of readdirSync(dir)) {
      const p = dir + '/' + name;
      if (statSync(p).isDirectory()) walk(p, out);
      else if (name.endsWith('.jsx')) out.push(p);
    }
    return out;
  }

  it('OD-03 jeder verwendete Icon-Name existiert', () => {
    assert.ok(known.size >= 15, 'Icon.jsx nicht gelesen');
    const dir = new URL('../src/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
    const used = new Set();
    for (const f of walk(dir)) {
      const s = readFileSync(f, 'utf8');
      for (const m of s.matchAll(/<Icon\s+name="([a-zA-Z]+)"/g)) used.add(m[1]);
      for (const m of s.matchAll(/<Icon\s+name=\{[^}]*\}/g)) {
        for (const q of m[0].matchAll(/'([a-zA-Z]+)'/g)) used.add(q[1]);
      }
      for (const m of s.matchAll(/\bicon:\s*'([a-zA-Z]+)'/g)) used.add(m[1]);
    }
    assert.ok(used.size >= 10, 'zu wenige Icon-Verwendungen gefunden: ' + [...used]);
    const missing = [...used].filter((n) => !known.has(n));
    assert.deepEqual(missing, [], 'unbekannte Icons: ' + missing.join(', '));
  });
});
