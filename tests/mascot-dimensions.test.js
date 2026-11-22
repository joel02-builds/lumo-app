/**
 * Maskottchen-Bilder in Anzeigegröße (vorher 1254 px, 658 KiB für 5 Bilder; Lighthouse „Bilder richtig dimensionieren")
 * Größte Darstellung: 160 CSS-px (Block-Abschluss, size="large"). 1x = 160 px, 2x = 320 px.
 *
 *   MD-01  lumo-*.webp ist höchstens 160 px breit, lumo-*@2x.webp höchstens 320 px (und mind. 2x so breit)
 *   MD-02  Jedes 1x-Bild hat eine @2x-Variante
 *   MD-03  Alle <img> mit Maskottchen im Quelltext haben ein srcSet mit 2x-Variante
 *   MD-04  Die fünf Bilder zusammen (1x + 2x) bleiben unter 150 KiB
 */
import { it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const dir = new URL('public/mascot/', root);
const files = readdirSync(dir).filter((n) => /^lumo-.*\.webp$/.test(n));

// Breite aus dem WebP-Header (VP8X: 24 Bit ab Byte 24, VP8L: 14 Bit ab Byte 21, VP8: 16 Bit ab Byte 26)
function webpWidth(buf) {
  assert.equal(buf.toString('ascii', 0, 4), 'RIFF');
  const kind = buf.toString('ascii', 12, 16);
  if (kind === 'VP8X') return 1 + buf.readUIntLE(24, 3);
  if (kind === 'VP8L') return 1 + (buf.readUInt32LE(21) & 0x3fff);
  if (kind === 'VP8 ') return buf.readUInt16LE(26) & 0x3fff;
  throw new Error('unbekanntes WebP: ' + kind);
}
const width = (n) => webpWidth(readFileSync(new URL(n, dir)));

it('MD-01 Breiten: 1x ≤ 160, 2x ≤ 320', () => {
  const ones = files.filter((n) => !n.includes('@2x'));
  assert.ok(ones.length >= 5);
  for (const n of ones) {
    assert.ok(width(n) <= 160, `${n}: ${width(n)} px`);
    const w2 = width(n.replace('.webp', '@2x.webp'));
    assert.ok(w2 <= 320 && w2 >= 2 * width(n), `${n} @2x: ${w2} px`);
  }
});

it('MD-02 jedes 1x-Bild hat eine @2x-Variante', () => {
  for (const n of files.filter((f) => !f.includes('@2x'))) {
    assert.ok(files.includes(n.replace('.webp', '@2x.webp')), n + ' ohne @2x');
  }
});

it('MD-03 <img>-Tags mit Maskottchen haben srcSet', () => {
  const list = [
    'src/components/LumoMascot.jsx',
    'src/components/LumoWordmark.jsx',
    'src/main.jsx',
    'src/screens/session/BlockCompletePhase.jsx',
  ];
  for (const f of list) {
    const s = readFileSync(new URL(f, root), 'utf8');
    assert.match(s, /srcSet=/, f);
    assert.match(s, /@2x\.webp/, f);
  }
});

it('MD-04 Gesamtgröße der fünf Maskottchen unter 150 KiB', () => {
  const total = files.reduce((a, n) => a + statSync(new URL(n, dir)).size, 0);
  assert.ok(total < 150 * 1024, `${(total / 1024).toFixed(1)} KiB`);
});
