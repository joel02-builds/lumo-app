/**
 * LumoMascot: Zahlenwerte für size sind Pixel (Quelltext-Schutz)
 * Früher fiel size={34} still auf 120 px zurück und wurde im 34-px-Kreis des
 * Onboarding-Karten-Headers abgeschnitten.
 */
import { it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

it('MS-01 LumoMascot behandelt numerische size als Pixel', () => {
  const src = readFileSync(new URL('../src/components/LumoMascot.jsx', import.meta.url), 'utf8');
  assert.match(src, /typeof size === 'number'\s*\?\s*size/);
});
