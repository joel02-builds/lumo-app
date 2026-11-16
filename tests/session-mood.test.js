/**
 * Session-Mood-Tests
 * ─────────────────────────────────────────────────────────────────────────────
 * Verifiziert, dass die Stimmung aus dem FocusRitual beim Karten-Prompt ankommt.
 *
 * Hintergrund: FocusRitualPhase sendet focused | tired | stressed | overwhelmed
 * (plus 'good' beim Überspringen), getCardSystem() reagiert aber nur auf
 * bad | okay und behandelt alles andere als "fit und motiviert".
 * toSessionMood() übersetzt zwischen beiden Seiten.
 *
 *   SM-01  Jede Ritual-Stimmung wird auf good | okay | bad abgebildet
 *   SM-02  müde / überfordert → reduzierter Prompt (2-3 Karten)
 *   SM-03  gestresst → mittlerer Prompt (3-4 Karten)
 *   SM-04  fokussiert / übersprungen → voller Prompt (4-5 Karten)
 *   SM-05  Unbekannter Wert → null (kein falscher Zweig)
 */
import { it, describe } from 'node:test';
import assert from 'node:assert/strict';
import { toSessionMood } from '../src/utils/sessionMood.js';
import { getCardSystem } from '../server/prompts.js';

const RITUAL_MOODS = ['focused', 'tired', 'stressed', 'overwhelmed', 'good'];

describe('Session-Mood: Ritual → Karten-Prompt', () => {
  it('SM-01 bildet jede Ritual-Stimmung auf good | okay | bad ab', () => {
    for (const mood of RITUAL_MOODS) {
      assert.ok(['good', 'okay', 'bad'].includes(toSessionMood(mood)), `kein Mapping für "${mood}"`);
    }
  });

  it('SM-02 müde und überfordert bekommen den reduzierten Prompt', () => {
    for (const mood of ['tired', 'overwhelmed']) {
      const system = getCardSystem('understand', toSessionMood(mood), null);
      assert.match(system, /Erstelle nur 2-3 Karten/, `"${mood}" landet nicht im schonenden Zweig`);
      assert.doesNotMatch(system, /fit und motiviert/);
    }
  });

  it('SM-03 gestresst bekommt den mittleren Prompt', () => {
    const system = getCardSystem('understand', toSessionMood('stressed'), null);
    assert.match(system, /Erstelle 3-4 Karten/);
    assert.doesNotMatch(system, /fit und motiviert/);
  });

  it('SM-04 fokussiert und übersprungen bekommen den vollen Prompt', () => {
    for (const mood of ['focused', 'good']) {
      const system = getCardSystem('understand', toSessionMood(mood), null);
      assert.match(system, /fit und motiviert/);
    }
  });

  it('SM-05 unbekannter Wert ergibt null', () => {
    assert.equal(toSessionMood('irgendwas'), null);
    assert.equal(toSessionMood(null), null);
  });
});
