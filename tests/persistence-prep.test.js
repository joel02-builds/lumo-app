/**
 * F033 Vorbereitung – Persistenz-Warnung, Persist-Anfrage, render.yaml-Vorlage
 *
 *   PP-01  isVolatileDbDir: /tmp, /var/tmp, Systemtemp → ja; echte Pfade, Prefix-Fallen → nein
 *   PP-02  Produktions-Start mit DB_PATH unter /tmp (echter Start im Kindprozess): Warnzeile
 *   PP-03  Produktions-Start mit nicht flüchtigem DB_PATH: keine Warnung
 *   PP-04  Entwicklung mit flüchtigem Pfad: keine Warnung (dort ist /tmp normal)
 *   PS-01  requestPersistentStorage: ohne API, schon persistent, gewährt, abgelehnt, Fehler
 *   PS-02  nach Ablehnung wird 7 Tage nicht erneut gefragt, danach wieder
 *   PS-03  App.jsx wartet nicht auf die Anfrage (Hydration/Sync dürfen nicht blockieren)
 *   RY-01  render.yaml: aktive Zeilen unverändert, disk/plan nur als Kommentar-Vorlage
 */
import { it, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isVolatileDbDir, VOLATILE_DB_WARNING } from '../server/dbPath.js';

const ROOT = new URL('../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

describe('DB-Pfad', () => {
  it('PP-01 flüchtig oder nicht', () => {
    for (const d of ['/tmp', '/tmp/', '/tmp/lumo', '/var/tmp/x', '/TMP/Lumo']) assert.equal(isVolatileDbDir(d), true, d);
    assert.equal(isVolatileDbDir('C:\\Users\\x\\AppData\\Local\\Temp\\lumo', { tmpdir: 'C:\\Users\\x\\AppData\\Local\\Temp' }), true);
    assert.equal(isVolatileDbDir('/custom/tmpdir/a', { tmpdir: '/custom/tmpdir' }), true);
    for (const d of ['/data', '/data/lumo', '/opt/render/project/src', '/tmpfoo', '/mnt/tmp', '/var/tmpx', 'C:\\data', '', '   ', undefined, null, 42]) {
      assert.equal(isVolatileDbDir(d, { tmpdir: '/custom/tmpdir' }), false, String(d));
    }
    assert.equal(isVolatileDbDir('/x', { tmpdir: '' }), false);
  });

  /** Startet den echten Server-Code (nur Import) mit gegebener Umgebung und gibt die Ausgabe zurück. */
  const boot = (env) => new Promise((resolve) => {
    execFile(process.execPath, ['--input-type=module', '-e', "await import('./server/index.js'); setTimeout(() => process.exit(0), 500);"], {
      cwd: ROOT,
      env: { ...process.env, ANTHROPIC_API_KEY: 'test-key', FRONTEND_URL: 'https://example.test', ...env },
    }, (_e, so, se) => resolve(so + '\n' + se));
  });

  it('PP-02 Produktion mit DB_PATH unter dem Systemtemp → deutliche Warnzeile', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'lumo-pp-'));
    try {
      const out = await boot({ NODE_ENV: 'production', DB_PATH: dir });
      assert.ok(out.includes(VOLATILE_DB_WARNING), 'Warnzeile fehlt:\n' + out);
      assert.match(out, /DB_PATH ist flüchtig, Server-Daten gehen bei Deploy\/Neustart verloren/);
      assert.match(out, /SQLite initialisiert/, 'der Server startet trotzdem (nur Warnung)');
    } finally { try { rmSync(dir, { recursive: true, force: true }); } catch { /* Temp räumt das System */ } }
  });

  it('PP-03 Produktion mit nicht flüchtigem DB_PATH → keine Warnung', async () => {
    const dir = mkdtempSync(join(ROOT, 'lumo-pp-'));   // im Projektordner, nicht unter /tmp bzw. Systemtemp
    try {
      const out = await boot({ NODE_ENV: 'production', DB_PATH: dir });
      assert.ok(!/DB_PATH ist flüchtig/.test(out), 'unerwartete Warnung:\n' + out);
      assert.match(out, /SQLite initialisiert/);
    } finally { try { rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ } }
  });

  it('PP-04 Entwicklung mit Temp-Pfad → keine Warnung', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'lumo-pp-'));
    try {
      const out = await boot({ NODE_ENV: 'development', DB_PATH: dir });
      assert.ok(!/DB_PATH ist flüchtig/.test(out), out);
    } finally { try { rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ } }
  });
});

describe('Persist-Anfrage (Client)', () => {
  const KEY_FLAG = 'lumo_persist_requested';
  const KEY_ASKED = 'lumo_persist_asked_at';
  const DAY = 24 * 60 * 60 * 1000;

  class FakeStorage {
    constructor() { this.m = new Map(); }
    getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
    setItem(k, v) { this.m.set(k, String(v)); }
  }

  /** Setzt navigator.storage / localStorage / Date.now für die Dauer von fn. */
  async function withEnv({ storage, ls = new FakeStorage(), now = 1_000_000 }, fn) {
    const nav = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    const lsd = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    const realNow = Date.now;
    Object.defineProperty(globalThis, 'navigator', { value: { storage }, configurable: true, writable: true });
    Object.defineProperty(globalThis, 'localStorage', { value: ls, configurable: true, writable: true });
    Date.now = () => now.valueOf ? now.valueOf() : now;
    try { return await fn(ls); } finally {
      Date.now = realNow;
      if (nav) Object.defineProperty(globalThis, 'navigator', nav); else delete globalThis.navigator;
      if (lsd) Object.defineProperty(globalThis, 'localStorage', lsd); else delete globalThis.localStorage;
    }
  }

  it('PS-01 ohne API, schon persistent, gewährt, abgelehnt, Fehler', async () => {
    const { requestPersistentStorage } = await import('../src/utils/storage.js');
    let calls;

    // keine API → false, kein Fehler
    await withEnv({ storage: undefined }, async () => assert.equal(await requestPersistentStorage(), false));
    await withEnv({ storage: {} }, async () => assert.equal(await requestPersistentStorage(), false));

    // schon persistent → true, es wird NICHT erneut angefragt (kein Dialog)
    calls = 0;
    await withEnv({ storage: { persisted: async () => true, persist: async () => { calls++; return true; } } }, async (ls) => {
      assert.equal(await requestPersistentStorage(), true);
      assert.equal(calls, 0, 'persist() trotz persisted() === true aufgerufen');
      assert.equal(ls.getItem(KEY_FLAG), '1');
    });

    // nicht persistent, wird gewährt → true, Flag gesetzt
    calls = 0;
    await withEnv({ storage: { persisted: async () => false, persist: async () => { calls++; return true; } } }, async (ls) => {
      assert.equal(await requestPersistentStorage(), true);
      assert.equal(calls, 1);
      assert.equal(ls.getItem(KEY_FLAG), '1');
    });

    // abgelehnt → false, kein Flag, Zeitpunkt gemerkt
    calls = 0;
    await withEnv({ storage: { persisted: async () => false, persist: async () => { calls++; return false; } }, now: 5000 }, async (ls) => {
      assert.equal(await requestPersistentStorage(), false);
      assert.equal(ls.getItem(KEY_FLAG), null);
      assert.equal(ls.getItem(KEY_ASKED), '5000');
    });

    // Fehler in persist() / persisted() / localStorage → false, nie ein Wurf
    await withEnv({ storage: { persisted: async () => false, persist: async () => { throw new Error('gesperrt'); } } }, async () => assert.equal(await requestPersistentStorage(), false));
    await withEnv({ storage: { persisted: async () => { throw new Error('x'); }, persist: async () => true } }, async () => assert.equal(await requestPersistentStorage(), false));
    const brokenLs = { getItem() { throw new Error('gesperrt'); }, setItem() { throw new Error('gesperrt'); } };
    await withEnv({ storage: { persisted: async () => false, persist: async () => true }, ls: brokenLs }, async () => {
      assert.equal(typeof (await requestPersistentStorage()), 'boolean');
    });
  });

  it('PS-02 nach Ablehnung 7 Tage nicht erneut fragen, danach wieder', async () => {
    const { requestPersistentStorage } = await import('../src/utils/storage.js');
    let calls = 0;
    const storage = { persisted: async () => false, persist: async () => { calls++; return false; } };
    const ls = new FakeStorage();
    await withEnv({ storage, ls, now: 10 * DAY }, async () => { await requestPersistentStorage(); });
    assert.equal(calls, 1);
    await withEnv({ storage, ls, now: 10 * DAY + 3 * DAY }, async () => assert.equal(await requestPersistentStorage(), false));
    assert.equal(calls, 1, 'nach 3 Tagen darf nicht erneut gefragt werden');
    await withEnv({ storage, ls, now: 10 * DAY + 7 * DAY }, async () => { await requestPersistentStorage(); });
    assert.equal(calls, 2, 'nach 7 Tagen wieder erlaubt');
  });

  it('PS-03 App.jsx wartet nicht auf die Anfrage, es gibt keinen eigenen Dialog', () => {
    const app = read('../src/App.jsx');
    assert.ok(!/await\s+requestPersistentStorage\(/.test(app), 'App wartet auf requestPersistentStorage()');
    assert.match(app, /requestPersistentStorage\(\)\.catch\(\(\) => \{\}\);/);
    const fn = read('../src/utils/storage.js');
    const body = fn.slice(fn.indexOf('export async function requestPersistentStorage'), fn.indexOf('export async function getStorageStatus'));
    assert.ok(!/alert\(|confirm\(|prompt\(|document\./.test(body), 'eigener Dialog/DOM-Zugriff in der Persist-Anfrage');
  });
});

describe('render.yaml', () => {
  it('RY-01 aktive Zeilen unverändert, Disk nur als Kommentar-Vorlage', () => {
    const lines = read('../render.yaml').split(/\r?\n/);
    const active = lines.filter((l) => l.trim() !== '' && !l.trim().startsWith('#'));
    assert.deepEqual(active.map((l) => l.trim()), [
      'services:', '- type: web', 'name: lumo-app', 'runtime: node', 'buildCommand: npm run build', 'startCommand: node server/index.js',
      'envVars:', '- key: NODE_ENV', 'value: production', '- key: ANTHROPIC_API_KEY', 'sync: false', '- key: FRONTEND_URL', 'sync: false', '- key: DB_PATH', 'sync: false',
    ]);
    const text = lines.join('\n');
    assert.ok(!active.some((l) => /^\s*(disk|plan):/.test(l)), 'disk/plan dürfen nicht aktiv sein');
    for (const s of ['# plan: starter', '# disk:', '#   mountPath: /data', '#   sizeGB: 1', 'docs/RENDER-PERSISTENCE.md']) {
      assert.ok(text.includes(s), `Vorlage enthält "${s}" nicht`);
    }
  });
});
