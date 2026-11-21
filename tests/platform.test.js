/**
 * isIOS erkennt auch iPadOS 13+
 *
 *   PL-01  iPhone, iPod, iPad (alt), iPadOS 13+ (Mac-Kennung + Touch) → true
 *   PL-02  Echter Mac, Windows (auch mit Touchscreen), Android, Linux, leere Werte → false
 *   PL-03  Windows-Phone-Merkmal MSStream schließt weiterhin aus
 *   PL-04  Beleg: die alte Prüfung (nur User-Agent) erkannte iPadOS 13+ nicht
 *   PL-05  InstallBanner nutzt die gemeinsame Funktion, keine eigene Kopie mehr
 */
import { it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isIOS } from '../src/utils/platform.js';

const UA = {
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  ipod: 'Mozilla/5.0 (iPod touch; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 Version/15.0 Mobile/15E148 Safari/604.1',
  ipadOld: 'Mozilla/5.0 (iPad; CPU OS 12_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1.2 Mobile/15E148 Safari/604.1',
  // iPadOS 13+ im Standardmodus: gibt sich als Mac aus
  ipadOS13: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  win: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36',
  linux: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
};

it('PL-01 iPhone, iPod, iPad, iPadOS 13+ → true', () => {
  assert.equal(isIOS({ userAgent: UA.iphone, platform: 'iPhone', maxTouchPoints: 5 }), true);
  assert.equal(isIOS({ userAgent: UA.ipod, platform: 'iPod', maxTouchPoints: 5 }), true);
  assert.equal(isIOS({ userAgent: UA.ipadOld, platform: 'iPad', maxTouchPoints: 5 }), true);
  assert.equal(isIOS({ userAgent: UA.ipadOS13, platform: 'MacIntel', maxTouchPoints: 5 }), true, 'iPadOS 13+');
  assert.equal(isIOS({ userAgent: UA.ipadOS13, platform: 'MacIntel', maxTouchPoints: 2 }), true);
});

it('PL-02 Mac, Windows, Android, Linux, leere Werte → false', () => {
  assert.equal(isIOS({ userAgent: UA.mac, platform: 'MacIntel', maxTouchPoints: 0 }), false, 'echter Mac');
  assert.equal(isIOS({ userAgent: UA.mac, platform: 'MacIntel', maxTouchPoints: 1 }), false, 'genau 1 Berührungspunkt reicht nicht');
  assert.equal(isIOS({ userAgent: UA.win, platform: 'Win32', maxTouchPoints: 10 }), false, 'Windows mit Touchscreen');
  assert.equal(isIOS({ userAgent: UA.android, platform: 'Linux armv8l', maxTouchPoints: 5 }), false);
  assert.equal(isIOS({ userAgent: UA.linux, platform: 'Linux x86_64', maxTouchPoints: 0 }), false);
  assert.equal(isIOS({ userAgent: '', platform: '', maxTouchPoints: 0 }), false);
  assert.equal(isIOS({ userAgent: undefined, platform: undefined, maxTouchPoints: undefined }), false);
  assert.equal(isIOS({ userAgent: UA.mac, platform: 'MacIntel', maxTouchPoints: 'x' }), false);
});

it('PL-03 MSStream schließt weiterhin aus', () => {
  assert.equal(isIOS({ userAgent: UA.iphone, platform: 'iPhone', maxTouchPoints: 5, msStream: {} }), false);
  assert.equal(isIOS({ userAgent: UA.ipadOS13, platform: 'MacIntel', maxTouchPoints: 5, msStream: {} }), false);
});

it('PL-04 Beleg: die alte Prüfung (nur User-Agent) erkannte iPadOS 13+ nicht', () => {
  const alt = (ua) => /iphone|ipad|ipod/i.test(ua);
  assert.equal(alt(UA.ipadOS13), false, 'so fiel das iPad durch');
  assert.equal(alt(UA.iphone), true);
  assert.equal(isIOS({ userAgent: UA.ipadOS13, platform: 'MacIntel', maxTouchPoints: 5 }), true);
});

it('PL-05 InstallBanner nutzt die gemeinsame Funktion', () => {
  const src = readFileSync(new URL('../src/components/InstallBanner.jsx', import.meta.url), 'utf8');
  assert.match(src, /import \{ isIOS \} from '\.\.\/utils\/platform\.js';/);
  assert.ok(!/function isIOS\(/.test(src), 'eigene Kopie von isIOS ist noch da');
});
