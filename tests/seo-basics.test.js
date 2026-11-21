/**
 * F022 — meta-description und robots.txt
 *
 *   SE-01  index.html hat eine <meta name="description"> (50–160 Zeichen, Deutsch)
 *   SE-02  public/robots.txt ist Klartext-Direktiven, kein HTML, sperrt /api/
 */
import { it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

it('SE-01 meta description vorhanden und sinnvoll lang', () => {
  const html = read('../index.html');
  const m = html.match(/<meta\s+name="description"\s+content="([^"]+)"/);
  assert.ok(m, 'keine <meta name="description">');
  assert.ok(m[1].length >= 50 && m[1].length <= 160, `Länge ${m[1].length} außerhalb 50–160`);
  assert.equal((html.match(/name="description"/g) || []).length, 1, 'mehr als eine description');
  assert.match(m[1], /Lumo/);
});

it('SE-02 robots.txt ist gültiger Klartext ohne HTML', () => {
  const txt = read('../public/robots.txt');
  assert.ok(!/[<>]/.test(txt), 'enthält HTML-Zeichen');
  const lines = txt.split(/\r?\n/).filter(Boolean);
  assert.ok(lines.every((l) => /^(User-agent|Allow|Disallow|Sitemap): ?\S*/.test(l)), 'ungültige Zeile: ' + lines.join(' | '));
  assert.ok(lines.includes('User-agent: *'));
  assert.ok(lines.includes('Disallow: /api/'));
});
