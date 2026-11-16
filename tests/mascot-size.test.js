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

// 3.0 – LumoMascot kennt kein style-Prop; ein übergebenes wird still ignoriert.
it('MS-02 kein ignoriertes style-Prop an <LumoMascot>', async () => {
  const { readdirSync, statSync } = await import('node:fs');
  const root = new URL('../src/', import.meta.url);
  const walk = (u, out = []) => {
    for (const n of readdirSync(u)) {
      const c = new URL(n + (statSync(new URL(n, u)).isDirectory() ? '/' : ''), u);
      if (statSync(c).isDirectory()) walk(c, out); else if (n.endsWith('.jsx')) out.push(c);
    }
    return out;
  };
  const bad = walk(root).filter((f) => /<LumoMascot\b[^>]*\bstyle=/.test(readFileSync(f, 'utf8')));
  assert.deepEqual(bad.map(String), []);
});
