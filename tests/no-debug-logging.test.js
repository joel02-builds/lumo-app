/**
 * Temporäres Debug-Logging darf nicht im Server bleiben (IP-Adressen sind personenbezogen)
 *
 *   NDL-01  Kein [debug trust-proxy]-Log in server/
 *   NDL-02  Kein Logging von req.ip / x-forwarded-for in server/ (außer rate-limit-Schlüssel, kein console)
 */
import { it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const files = readdirSync(new URL('../server/', import.meta.url)).filter((n) => n.endsWith('.js') && !n.endsWith('.test.js'));
const src = (n) => readFileSync(new URL('../server/' + n, import.meta.url), 'utf8');

it('NDL-01 kein [debug trust-proxy]-Log', () => {
  const hits = files.filter((n) => src(n).includes('[debug trust-proxy]'));
  assert.deepEqual(hits, []);
});

it('NDL-02 keine console-Zeile mit req.ip oder x-forwarded-for', () => {
  const hits = files.filter((n) => /console\.\w+\([^;]*(req\.ip|x-forwarded-for|req\.ips)/i.test(src(n)));
  assert.deepEqual(hits, []);
});
