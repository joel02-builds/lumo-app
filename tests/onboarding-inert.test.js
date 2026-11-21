/**
 * Phase 5.1 — nicht aktive Onboarding-Screens sind inert
 * Vorher: alle 5 Screens im DOM, die inaktiven nur unsichtbar (opacity 0, pointer-events
 * none) – ihre Buttons waren per Tab erreichbar und für Screenreader lesbar (im Browser
 * gemessen: 16 von 22 tabbaren Elementen lagen in inaktiven Screens).
 *
 *   OI-01  Gerendert: genau ein Screen ohne inert/aria-hidden, die anderen vier mit beidem
 *   OI-02  Quelltext: alle fünf Screens nutzen hiddenProps (kein Screen vergessen)
 */
import { it, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/screens/onboarding/OnboardingScreen1.jsx', import.meta.url), 'utf8');

describe('Onboarding inert', () => {
  it('OI-02 alle fünf Screens nutzen hiddenProps', () => {
    for (const id of ['s0', 's1', 's2', 's3', 'form']) {
      assert.ok(
        src.includes(`id="ob-${id}" className={\`ob-screen \${isActive('${id}')}\`} {...hiddenProps('${id}')}`),
        `Screen ${id} ohne hiddenProps`,
      );
    }
    assert.match(src, /'aria-hidden': true, inert: ''/);
  });

  it('OI-01 gerendert: nur der aktive Screen ist nicht inert', async () => {
    let html;
    try {
      const React = (await import('react')).default;
      const { renderToStaticMarkup } = await import('react-dom/server');
      // JSX lässt sich ohne Build nicht importieren – deshalb nur der Teil, der ohne Browser läuft:
      // das hiddenProps-Verhalten selbst, aus dem Quelltext herausgelöst und ausgeführt.
      const m = src.match(/const hiddenProps = (\(p\) => [^;]+);/);
      assert.ok(m, 'hiddenProps nicht gefunden');
      const phase = 's1';
      const hiddenProps = new Function('phase', `return ${m[1]};`)(phase);
      html = renderToStaticMarkup(
        React.createElement('div', null,
          ...['s0', 's1', 's2', 's3', 'form'].map((id) =>
            React.createElement('div', { key: id, id: 'ob-' + id, ...hiddenProps(id) }),
          ),
        ),
      );
    } catch (e) {
      assert.fail('Render fehlgeschlagen: ' + e.message);
    }
    const divs = [...html.matchAll(/<div id="ob-([a-z0-9]+)"([^>]*)>/g)];
    assert.equal(divs.length, 5);
    for (const [, id, attrs] of divs) {
      if (id === 's1') assert.ok(!/inert|aria-hidden/.test(attrs), 'aktiver Screen darf nicht inert sein: ' + attrs);
      else {
        assert.ok(/inert=""/.test(attrs), id + ' ohne inert: ' + attrs);
        assert.ok(/aria-hidden="true"/.test(attrs), id + ' ohne aria-hidden: ' + attrs);
      }
    }
  });
});
