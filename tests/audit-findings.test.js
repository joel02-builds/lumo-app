/**
 * audit/findings.json: Status und Belege müssen zusammenpassen
 *
 *   AF-01  F001–F036 vorhanden, gültige Status
 *   AF-02  FIXED und ACCEPTED haben einen Nachweis (fix_nachweis)
 */
import { it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const all = JSON.parse(readFileSync(new URL('../audit/findings.json', import.meta.url), 'utf8'));

it('AF-01 36 Findings, gültige Status', () => {
  assert.equal(all.length, 36);
  all.forEach((x, i) => assert.equal(x.id, 'F' + String(i + 1).padStart(3, '0')));
  for (const x of all) assert.ok(['FIXED', 'ACCEPTED', 'CONFIRMED', 'PLAUSIBLE'].includes(x.status), x.id + ': ' + x.status);
});

it('AF-02 FIXED/ACCEPTED mit Nachweis', () => {
  const bad = all.filter((x) => ['FIXED', 'ACCEPTED'].includes(x.status) && !String(x.fix_nachweis || '').trim()).map((x) => x.id);
  assert.deepEqual(bad, []);
});
