/**
 * F010 — Maskable-Icon mit Safe Zone
 * Android schneidet maskable Icons mit einer Maske (z. B. Kreis) zu. Sicher sichtbar ist nur der innere
 * Kreis mit 80 % Durchmesser. Vorher zeigte das Manifest dasselbe Icon (icon-512.png) als "maskable",
 * dessen "LUMO"-Schrift weit außerhalb dieses Kreises lag.
 *
 *   MI-01  Manifest: dedizierte maskable-Icons (192, 512), bestehende "any"-Icons bleiben
 *   MI-02  Dateien existieren, haben die angegebene Größe und sind PNG
 *   MI-03  Safe Zone: kein Motiv-Pixel außerhalb des Kreises mit Radius 0,4 × Kantenlänge
 *   MI-04  Das Motiv ist nicht winzig (≥ 60 % Radius der Safe Zone), das Icon ist nicht leer
 *   MI-05  Das alte Quell-Icon ragt über die Safe Zone hinaus (Beleg, dass der Test etwas prüft)
 */
import { it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

const pub = (p) => new URL('../public/' + p, import.meta.url);

/** Minimaler PNG-Dekoder (8 Bit, RGB/RGBA, nicht interlaced) – genug für diese Icons. */
function decodePng(buf) {
  assert.deepEqual([...buf.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], 'keine PNG-Datei');
  let p = 8, ihdr, idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8);
    if (type === 'IHDR') ihdr = { w: buf.readUInt32BE(p + 8), h: buf.readUInt32BE(p + 12), depth: buf[p + 16], ct: buf[p + 17], il: buf[p + 20] };
    if (type === 'IDAT') idat.push(buf.subarray(p + 8, p + 8 + len));
    p += 12 + len;
  }
  assert.equal(ihdr.depth, 8); assert.equal(ihdr.il, 0);
  const bpp = ihdr.ct === 2 ? 3 : ihdr.ct === 6 ? 4 : assert.fail('Farbtyp ' + ihdr.ct + ' nicht unterstützt');
  const raw = inflateSync(Buffer.concat(idat));
  const stride = ihdr.w * bpp, out = Buffer.alloc(ihdr.h * stride);
  for (let y = 0; y < ihdr.h; y++) {
    const f = raw[y * (stride + 1)], line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[y * stride + x - bpp] : 0;
      const b = y > 0 ? out[(y - 1) * stride + x] : 0;
      const c = x >= bpp && y > 0 ? out[(y - 1) * stride + x - bpp] : 0;
      let v = line[x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      out[y * stride + x] = v & 255;
    }
  }
  return { ...ihdr, bpp, data: out };
}

/** Größter Abstand eines Motiv-Pixels (Abweichung vom Hintergrund > 10) zur Bildmitte. */
function contentRadius(img) {
  const { w, h, bpp, data } = img;
  const bg = [data[0], data[1], data[2]];
  const cx = (w - 1) / 2, cy = (h - 1) / 2;
  let r = 0, n = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * bpp;
      if (Math.max(Math.abs(data[i] - bg[0]), Math.abs(data[i + 1] - bg[1]), Math.abs(data[i + 2] - bg[2])) > 10) {
        n++;
        r = Math.max(r, Math.hypot(x - cx, y - cy));
      }
    }
  }
  return { r, n };
}

const manifest = JSON.parse(readFileSync(pub('manifest.json'), 'utf8'));

it('MI-01 dedizierte maskable-Icons, "any"-Icons bleiben', () => {
  const maskable = manifest.icons.filter((i) => i.purpose === 'maskable');
  assert.deepEqual(maskable.map((i) => [i.src, i.sizes]).sort(), [['/icon-maskable-192.png', '192x192'], ['/icon-maskable-512.png', '512x512']]);
  assert.ok(!maskable.some((i) => /\/icon-(192|512)\.png$/.test(i.src)), 'maskable darf nicht auf die any-Icons zeigen');
  const any = manifest.icons.filter((i) => !i.purpose || i.purpose === 'any');
  assert.deepEqual(any.map((i) => i.src).sort(), ['/icon-192.png', '/icon-512.png']);
  for (const i of manifest.icons) assert.equal(i.type, 'image/png');
});

it('MI-02 Dateien vorhanden, richtige Größe, PNG', () => {
  for (const i of manifest.icons) {
    const png = decodePng(readFileSync(pub(i.src.slice(1))));
    const [w, h] = i.sizes.split('x').map(Number);
    assert.deepEqual([png.w, png.h], [w, h], i.src);
  }
});

it('MI-03 Safe Zone: Motiv liegt im Kreis mit 80 % Durchmesser', () => {
  for (const size of [192, 512]) {
    const png = decodePng(readFileSync(pub(`icon-maskable-${size}.png`)));
    const { r } = contentRadius(png);
    assert.ok(r <= 0.4 * size + 1, `${size}px: Motiv reicht bis ${r.toFixed(1)}px, Safe Zone endet bei ${(0.4 * size).toFixed(1)}px`);
  }
});

it('MI-04 Motiv nicht winzig, Icon nicht leer', () => {
  for (const size of [192, 512]) {
    const png = decodePng(readFileSync(pub(`icon-maskable-${size}.png`)));
    const { r, n } = contentRadius(png);
    assert.ok(r >= 0.4 * size * 0.6, `${size}px: Motiv zu klein (${r.toFixed(1)}px)`);
    assert.ok(n > size * size * 0.3, `${size}px: zu wenig Motiv-Pixel (${n})`);
  }
});

it('MI-05 Beleg: das normale 512er-Icon ragt über die Safe Zone hinaus', () => {
  const { r } = contentRadius(decodePng(readFileSync(pub('icon-512.png'))));
  assert.ok(r > 0.4 * 512 + 10, `Quell-Icon reicht nur bis ${r.toFixed(1)}px – Test würde nichts belegen`);
});
