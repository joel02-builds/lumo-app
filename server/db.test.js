/**
 * db.test.js — Tests für Railway-Erkennung, IS_PRODUCTION-Schranken und initDB()-Verhalten
 *
 * Zwei Teststufen:
 *
 *   A) Unit-Tests (Gruppen 1-3): testen IS_RAILWAY- und IS_PRODUCTION-Logik
 *      durch lokale Spiegelung (computeIsRailway / computeIsProduction), ohne
 *      das ESM-Modul zu importieren (das würde process.exit() riskieren).
 *
 *   B) Integration-Tests (Gruppe 4): spawnen einen echten Kindprozess,
 *      der initDB() aus db.js direkt aufruft. Testet das tatsächliche Verhalten,
 *      nicht eine Simulation — überbrückt die ESM-Modul-Cache-Grenze.
 *
 * Ausführung: node --test server/db.test.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, chmodSync, rmSync, accessSync, constants, writeFileSync, unlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

/**
 * Setzt genau die angegebenen Umgebungsvariablen und räumt alle anderen
 * Railway-Variablen, DB-bezogenen Variablen und NODE_ENV auf.
 * Gibt eine Restore-Funktion zurück.
 *
 * WICHTIG: NODE_ENV ist explizit enthalten, damit Produktion-Tests
 * nicht in andere Tests hineinlecken (Isolation-Anforderung).
 */
function withEnv(vars) {
  const RAILWAY_VARS = [
    'RAILWAY_ENVIRONMENT_ID',
    'RAILWAY_ENVIRONMENT_NAME',
    'RAILWAY_SERVICE_ID',
    'RAILWAY_PROJECT_ID',
    'RAILWAY_VOLUME_MOUNT_PATH',
  ];
  const OTHER_VARS = ['DB_PATH', 'NODE_ENV'];

  // Originalwerte merken
  const saved = {};
  for (const k of [...RAILWAY_VARS, ...OTHER_VARS]) {
    saved[k] = process.env[k];
    delete process.env[k];
  }

  // Neue Werte setzen
  for (const [k, v] of Object.entries(vars)) {
    if (v === undefined) {
      delete process.env[k];
    } else {
      process.env[k] = v;
    }
  }

  return function restore() {
    for (const k of [...RAILWAY_VARS, ...OTHER_VARS]) {
      if (saved[k] === undefined) {
        delete process.env[k];
      } else {
        process.env[k] = saved[k];
      }
    }
  };
}

/**
 * Spiegelt IS_RAILWAY-Logik aus db.js — testet die Logik isoliert,
 * ohne das Modul zu importieren (das würde process.exit() riskieren).
 */
function computeIsRailway() {
  return Boolean(
    process.env.RAILWAY_ENVIRONMENT_ID ||
    process.env.RAILWAY_ENVIRONMENT_NAME ||
    process.env.RAILWAY_SERVICE_ID ||
    process.env.RAILWAY_PROJECT_ID
  );
}

/**
 * Spiegelt IS_PRODUCTION-Logik aus db.js.
 */
function computeIsProduction() {
  return computeIsRailway() || process.env.NODE_ENV === 'production';
}

/**
 * Führt initDB() in einem separaten Kindprozess aus.
 * Jeder Test bekommt einen frischen Prozess ohne ESM-Modul-Cache-Verschmutzung.
 * Railway-Variablen und DB_PATH werden als env übergeben.
 *
 * Exit codes:
 *   0 = initDB() hat true zurückgegeben (DB erfolgreich initialisiert)
 *   1 = initDB() hat process.exit(1) aufgerufen (FATAL guard ausgelöst)
 *   2 = initDB() hat false zurückgegeben (graceful degradation)
 *
 * @param {object} env - Umgebungsvariablen für den Kindprozess
 * @returns {{ status: number|null, stdout: string, stderr: string }}
 */
function spawnInitDB(env) {
  // Absoluter Pfad, damit './db.js' unabhängig vom Skript-Verzeichnis auflöst
  const dbJsPath = JSON.stringify(path.join(__dirname, 'db.js'));
  const script = `
import { initDB } from ${dbJsPath};
const result = initDB();
// result===true: erfolgreich; result===false: graceful fallback
process.exit(result === true ? 0 : 2);
`;
  const scriptPath = path.join(tmpdir(), `lumo-initdb-it-${Date.now()}-${Math.random().toString(36).slice(2)}.mjs`);
  writeFileSync(scriptPath, script, 'utf8');

  const result = spawnSync(
    process.execPath,
    [scriptPath],
    {
      env: {
        // Minimal-PATH damit Node.js und npm-Binaries gefunden werden
        PATH: process.env.PATH || '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
        // Weitergabe der NODE_PATH falls gesetzt (für modul-resolution)
        ...(process.env.NODE_PATH ? { NODE_PATH: process.env.NODE_PATH } : {}),
        // Testspezifische Variablen
        ...env,
      },
      cwd: __dirname, // server/ — damit node_modules-Auflösung stimmt
      timeout: 15000,
      encoding: 'utf8',
    }
  );

  try { unlinkSync(scriptPath); } catch { /* ignorieren */ }
  return result;
}

// ─── 1. Railway-Erkennung: einzelne Variablen ─────────────────────────────

describe('Railway-Erkennung (IS_RAILWAY)', () => {
  it('erkennt Railway über RAILWAY_ENVIRONMENT_ID', () => {
    const restore = withEnv({ RAILWAY_ENVIRONMENT_ID: 'abc-123-uuid' });
    assert.equal(computeIsRailway(), true);
    restore();
  });

  it('erkennt Railway über RAILWAY_ENVIRONMENT_NAME', () => {
    const restore = withEnv({ RAILWAY_ENVIRONMENT_NAME: 'production' });
    assert.equal(computeIsRailway(), true);
    restore();
  });

  it('erkennt Railway über RAILWAY_SERVICE_ID', () => {
    const restore = withEnv({ RAILWAY_SERVICE_ID: 'svc-xyz-789' });
    assert.equal(computeIsRailway(), true);
    restore();
  });

  it('erkennt Railway über RAILWAY_PROJECT_ID', () => {
    const restore = withEnv({ RAILWAY_PROJECT_ID: 'proj-abc-456' });
    assert.equal(computeIsRailway(), true);
    restore();
  });

  it('erkennt Railway wenn mehrere Variablen gleichzeitig gesetzt sind', () => {
    const restore = withEnv({
      RAILWAY_ENVIRONMENT_ID: 'env-id',
      RAILWAY_ENVIRONMENT_NAME: 'production',
      RAILWAY_SERVICE_ID: 'svc-id',
      RAILWAY_PROJECT_ID: 'proj-id',
    });
    assert.equal(computeIsRailway(), true);
    restore();
  });

  it('erkennt NICHT Railway wenn keine Variable gesetzt ist', () => {
    const restore = withEnv({});
    assert.equal(computeIsRailway(), false);
    restore();
  });

  it('RAILWAY_ENVIRONMENT (undokumentiert/alt) allein führt nicht zu IS_RAILWAY=true', () => {
    const restore = withEnv({});
    // Nur die alte Variable setzen — simuliert den Bug-Zustand vor dem Fix
    process.env.RAILWAY_ENVIRONMENT = 'production';
    assert.equal(computeIsRailway(), false, 'IS_RAILWAY muss false sein wenn nur RAILWAY_ENVIRONMENT gesetzt ist');
    delete process.env.RAILWAY_ENVIRONMENT;
    restore();
  });
});

// ─── 2. IS_PRODUCTION: Kombinationslogik ─────────────────────────────────────

describe('IS_PRODUCTION (Railway ODER NODE_ENV=production)', () => {
  it('ist true wenn Railway-Vars gesetzt (auch ohne NODE_ENV=production)', () => {
    const restore = withEnv({ RAILWAY_ENVIRONMENT_ID: 'env-id' });
    assert.equal(computeIsProduction(), true);
    restore();
  });

  it('ist true wenn NODE_ENV=production (auch ohne Railway-Vars)', () => {
    const restore = withEnv({ NODE_ENV: 'production' });
    assert.equal(computeIsProduction(), true);
    restore();
  });

  it('ist true wenn sowohl Railway-Vars als auch NODE_ENV=production gesetzt sind', () => {
    const restore = withEnv({ RAILWAY_ENVIRONMENT_ID: 'env-id', NODE_ENV: 'production' });
    assert.equal(computeIsProduction(), true);
    restore();
  });

  it('ist false im lokalen Betrieb (kein Railway, kein NODE_ENV=production)', () => {
    const restore = withEnv({ NODE_ENV: 'development' });
    assert.equal(computeIsProduction(), false);
    restore();
  });

  it('ist false wenn NODE_ENV=test', () => {
    const restore = withEnv({ NODE_ENV: 'test' });
    assert.equal(computeIsProduction(), false);
    restore();
  });
});

// ─── 3. initDB()-Sicherheitsschranken (simuliert) ────────────────────────────

describe('initDB()-Sicherheitsschranken (Simulation)', () => {

  // ── 3a. Railway ohne Volume → process.exit(1) ──────────────────────────

  it('beendet den Prozess wenn Railway erkannt aber weder DB_PATH noch RAILWAY_VOLUME_MOUNT_PATH gesetzt', () => {
    const restore = withEnv({ RAILWAY_ENVIRONMENT_ID: 'env-id' });

    const origExit = process.exit;
    let exitCode = null;
    process.exit = (code) => { exitCode = code; throw new Error(`process.exit(${code})`); };

    try {
      const IS_RAILWAY = computeIsRailway();
      const IS_PRODUCTION = computeIsProduction();
      if (IS_PRODUCTION && !process.env.DB_PATH && !process.env.RAILWAY_VOLUME_MOUNT_PATH) {
        process.exit(1);
      }
    } catch {}

    process.exit = origExit;
    restore();

    assert.equal(exitCode, 1, 'process.exit(1) muss gefeuert werden');
  });

  // ── 3b. Railway + leerer RAILWAY_VOLUME_MOUNT_PATH → process.exit(1) ──

  it('beendet den Prozess wenn RAILWAY_VOLUME_MOUNT_PATH leer ist', () => {
    const restore = withEnv({
      RAILWAY_ENVIRONMENT_ID: 'env-id',
      RAILWAY_VOLUME_MOUNT_PATH: '',   // leerer String ist falsy
    });

    const origExit = process.exit;
    let exitCode = null;
    process.exit = (code) => { exitCode = code; throw new Error(`process.exit(${code})`); };

    try {
      const IS_PRODUCTION = computeIsProduction();
      if (IS_PRODUCTION && !process.env.DB_PATH && !process.env.RAILWAY_VOLUME_MOUNT_PATH) {
        process.exit(1);
      }
    } catch {}

    process.exit = origExit;
    restore();

    assert.equal(exitCode, 1, 'Leerer RAILWAY_VOLUME_MOUNT_PATH muss process.exit(1) auslösen');
  });

  // ── 3c. Railway + nicht beschreibbares Verzeichnis → process.exit(1) ───

  it('beendet den Prozess wenn das Volume-Verzeichnis nicht existiert (ENOENT)', () => {
    // Hinweis: chmod 444 (EACCES) ist in diesem Container nicht testbar, weil
    // der Prozess als root läuft – root ignoriert Dateirechte. Stattdessen
    // wird ein nicht existierendes Verzeichnis geprüft, das denselben
    // Codepfad auslöst (accessSync wirft → IS_PRODUCTION → process.exit(1)).
    const nonExistentDir = path.join(tmpdir(), `lumo-nonexistent-${Date.now()}`);

    const restore = withEnv({
      RAILWAY_ENVIRONMENT_ID: 'env-id',
      RAILWAY_VOLUME_MOUNT_PATH: nonExistentDir,
    });

    const origExit = process.exit;
    let exitCode = null;
    process.exit = (code) => { exitCode = code; throw new Error(`process.exit(${code})`); };

    try {
      const IS_PRODUCTION = computeIsProduction();
      const dbDir = process.env.DB_PATH || process.env.RAILWAY_VOLUME_MOUNT_PATH || '';
      try {
        accessSync(dbDir, constants.W_OK);
      } catch {
        if (IS_PRODUCTION) process.exit(1);
      }
    } catch {}

    process.exit = origExit;
    restore();

    assert.equal(exitCode, 1, 'Nicht zugängliches Volume-Verzeichnis (ENOENT) muss process.exit(1) auslösen');
  });

  // ── 3d. Railway + gültiger Volume-Pfad → kein Exit ──────────────────────

  it('startet normal wenn Railway erkannt und RAILWAY_VOLUME_MOUNT_PATH beschreibbar ist', () => {
    const tmpDir = mkdtempSync(path.join(tmpdir(), 'lumo-test-writable-'));
    const restore = withEnv({
      RAILWAY_ENVIRONMENT_ID: 'env-id',
      RAILWAY_VOLUME_MOUNT_PATH: tmpDir,
    });

    const origExit = process.exit;
    let exitCalled = false;
    process.exit = () => { exitCalled = true; throw new Error('process.exit called'); };

    let passed = false;
    try {
      const IS_PRODUCTION = computeIsProduction();
      if (IS_PRODUCTION && !process.env.DB_PATH && !process.env.RAILWAY_VOLUME_MOUNT_PATH) {
        process.exit(1);
      }
      accessSync(tmpDir, constants.W_OK);
      passed = true;
    } catch {}

    process.exit = origExit;
    rmSync(tmpDir, { recursive: true });
    restore();

    assert.equal(exitCalled, false, 'process.exit darf nicht aufgerufen werden');
    assert.equal(passed, true, 'accessSync muss erfolgreich sein');
  });

  // ── 3e. Lokal ohne Volume → kein Exit, graceful fallback ─────────────────

  it('startet lokal normal ohne jede Volume-Konfiguration', () => {
    const restore = withEnv({ NODE_ENV: 'development' });

    const origExit = process.exit;
    let exitCalled = false;
    process.exit = () => { exitCalled = true; };

    const IS_PRODUCTION = computeIsProduction();
    if (IS_PRODUCTION && !process.env.DB_PATH && !process.env.RAILWAY_VOLUME_MOUNT_PATH) {
      process.exit(1);
    }

    process.exit = origExit;
    restore();

    assert.equal(IS_PRODUCTION, false, 'IS_PRODUCTION muss lokal false sein');
    assert.equal(exitCalled, false, 'process.exit darf lokal nicht aufgerufen werden');
  });

  // ── 3f. NODE_ENV=production ohne Railway und ohne DB_PATH → EXIT (neuer Bug-Fix)

  it('beendet den Prozess wenn NODE_ENV=production ohne Railway-Vars und ohne DB_PATH', () => {
    const restore = withEnv({ NODE_ENV: 'production' }); // kein DB_PATH, kein Railway

    const origExit = process.exit;
    let exitCode = null;
    process.exit = (code) => { exitCode = code; throw new Error(`process.exit(${code})`); };

    try {
      const IS_PRODUCTION = computeIsProduction();
      if (IS_PRODUCTION && !process.env.DB_PATH && !process.env.RAILWAY_VOLUME_MOUNT_PATH) {
        process.exit(1);
      }
    } catch {}

    process.exit = origExit;
    restore();

    assert.equal(exitCode, 1, 'NODE_ENV=production ohne DB_PATH muss process.exit(1) auslösen');
  });

  // ── 3g. NODE_ENV=production + DB_PATH → kein Exit ────────────────────────

  it('startet normal wenn NODE_ENV=production und DB_PATH auf beschreibbares Verzeichnis zeigt', () => {
    const tmpDir = mkdtempSync(path.join(tmpdir(), 'lumo-test-prod-'));
    const restore = withEnv({ NODE_ENV: 'production', DB_PATH: tmpDir });

    const origExit = process.exit;
    let exitCalled = false;
    process.exit = () => { exitCalled = true; };

    const IS_PRODUCTION = computeIsProduction();
    if (IS_PRODUCTION && !process.env.DB_PATH && !process.env.RAILWAY_VOLUME_MOUNT_PATH) {
      process.exit(1);
    }

    process.exit = origExit;
    rmSync(tmpDir, { recursive: true });
    restore();

    assert.equal(exitCalled, false, 'process.exit darf nicht aufgerufen werden wenn DB_PATH gesetzt ist');
  });

  // ── 3h. DB_PATH als expliziter Override → kein Exit auch auf Railway ─────

  it('akzeptiert DB_PATH als Override auf Railway ohne Volume', () => {
    const tmpDir = mkdtempSync(path.join(tmpdir(), 'lumo-test-dbpath-'));
    const restore = withEnv({
      RAILWAY_ENVIRONMENT_ID: 'env-id',
      DB_PATH: tmpDir,
      // kein RAILWAY_VOLUME_MOUNT_PATH
    });

    const origExit = process.exit;
    let exitCalled = false;
    process.exit = () => { exitCalled = true; };

    const IS_PRODUCTION = computeIsProduction();
    if (IS_PRODUCTION && !process.env.DB_PATH && !process.env.RAILWAY_VOLUME_MOUNT_PATH) {
      process.exit(1);
    }

    process.exit = origExit;
    rmSync(tmpDir, { recursive: true });
    restore();

    assert.equal(exitCalled, false, 'process.exit darf nicht aufgerufen werden wenn DB_PATH gesetzt ist');
  });
});

// ─── 4. Integration: initDB() im echten Kindprozess ──────────────────────────
//
// Diese Tests spawnen einen echten Node.js-Kindprozess, der initDB() aus db.js
// direkt importiert und ausführt. Das überbrückt die ESM-Modul-Cache-Grenze:
// IS_RAILWAY und IS_PRODUCTION werden im Kindprozess mit den gesetzten
// Umgebungsvariablen neu berechnet — nicht als Simulation, sondern als echter Modulaufruf.
//
// Exit codes aus dem Kindprozess:
//   0 = initDB() → true    (DB erfolgreich geöffnet)
//   1 = process.exit(1)    (FATAL-Guard ausgelöst, kein DB geöffnet)
//   2 = initDB() → false   (graceful degradation)

describe('Integration: initDB() im Kindprozess (echter Modulaufruf)', () => {

  // ── 4a. Railway + gültiges Volume → Erfolg (exit 0) ─────────────────────

  it('Railway mit gültigem Volume-Pfad: initDB() gibt true zurück (exit 0)', () => {
    const tmpDir = mkdtempSync(path.join(tmpdir(), 'lumo-it-volume-'));
    const result = spawnInitDB({
      RAILWAY_ENVIRONMENT_ID: 'env-id-test',
      RAILWAY_VOLUME_MOUNT_PATH: tmpDir,
    });
    rmSync(tmpDir, { recursive: true, force: true });

    assert.equal(result.status, 0,
      `Erwartet exit 0, bekam ${result.status}.\nstderr: ${result.stderr}`);
  });

  // ── 4b. Railway ohne Volume → FATAL exit 1 ───────────────────────────────

  it('Railway ohne Volume: initDB() löst FATAL Guard aus (exit 1)', () => {
    const result = spawnInitDB({
      RAILWAY_ENVIRONMENT_ID: 'env-id-test',
      // kein RAILWAY_VOLUME_MOUNT_PATH, kein DB_PATH
    });

    assert.equal(result.status, 1,
      `Erwartet exit 1, bekam ${result.status}.\nstderr: ${result.stderr}`);
  });

  // ── 4c. NODE_ENV=production + DB_PATH → Erfolg (exit 0) ─────────────────

  it('Produktion außerhalb Railway mit DB_PATH: initDB() gibt true zurück (exit 0)', () => {
    const tmpDir = mkdtempSync(path.join(tmpdir(), 'lumo-it-prod-'));
    const result = spawnInitDB({
      NODE_ENV: 'production',
      DB_PATH: tmpDir,
    });
    rmSync(tmpDir, { recursive: true, force: true });

    assert.equal(result.status, 0,
      `Erwartet exit 0, bekam ${result.status}.\nstderr: ${result.stderr}`);
  });

  // ── 4d. NODE_ENV=production ohne DB_PATH → FATAL exit 1 (neu durch Bug-Fix)

  it('Produktion außerhalb Railway ohne DB_PATH: FATAL Guard greift jetzt (exit 1)', () => {
    const result = spawnInitDB({
      NODE_ENV: 'production',
      // kein DB_PATH, kein RAILWAY_VOLUME_MOUNT_PATH, kein RAILWAY_*
    });

    assert.equal(result.status, 1,
      `Erwartet exit 1 (FATAL Guard), bekam ${result.status}.\nstderr: ${result.stderr}`);
  });

  // ── 4e. Lokale Entwicklung mit DB_PATH → Erfolg (exit 0) ─────────────────

  it('Lokale Entwicklung mit explizitem DB_PATH: initDB() gibt true zurück (exit 0)', () => {
    const tmpDir = mkdtempSync(path.join(tmpdir(), 'lumo-it-dev-'));
    const result = spawnInitDB({
      NODE_ENV: 'development',
      DB_PATH: tmpDir,
    });
    rmSync(tmpDir, { recursive: true, force: true });

    assert.equal(result.status, 0,
      `Erwartet exit 0, bekam ${result.status}.\nstderr: ${result.stderr}`);
  });

  // ── 4f. Railway + DB_PATH (Override) → Erfolg (exit 0) ──────────────────

  it('Railway mit DB_PATH als Override: initDB() gibt true zurück (exit 0)', () => {
    const tmpDir = mkdtempSync(path.join(tmpdir(), 'lumo-it-railway-dbpath-'));
    const result = spawnInitDB({
      RAILWAY_ENVIRONMENT_ID: 'env-id-test',
      DB_PATH: tmpDir,
      // kein RAILWAY_VOLUME_MOUNT_PATH → DB_PATH hat Vorrang
    });
    rmSync(tmpDir, { recursive: true, force: true });

    assert.equal(result.status, 0,
      `Erwartet exit 0, bekam ${result.status}.\nstderr: ${result.stderr}`);
  });

});

// ─── 5. Migrations-Tests ──────────────────────────────────────────────────────
//
// Testen den PRAGMA-user_version-basierten Migrationsmechanismus direkt.
// Jeder Test bekommt ein isoliertes temporäres Verzeichnis und einen
// frischen Kindprozess (keine ESM-Modul-Cache-Verschmutzung).
//
// Kindprozess Exit-Codes (zusätzlich zu den Codes aus Gruppe 4):
//   0 = Test bestanden
//   2 = initDB() → false (Fehler oder graceful abort)
//   3..9 = testspezifische Prüfung fehlgeschlagen (stderr nennt Grund)

/**
 * Führt ein beliebiges ESM-Script in einem separaten Kindprozess aus.
 * @param {object} env - Umgebungsvariablen für den Kindprozess
 * @param {string} code - ESM-JavaScript-Code
 */
function spawnScript(env, code) {
  // Skript ins Projektverzeichnis schreiben (nicht /tmp), damit ESM
  // 'better-sqlite3' und andere lokale Pakete über node_modules auflösen kann.
  const scriptPath = path.join(__dirname, `_lumo-mig-test-${Date.now()}-${Math.random().toString(36).slice(2)}.mjs`);
  writeFileSync(scriptPath, code, 'utf8');
  const result = spawnSync(
    process.execPath,
    [scriptPath],
    {
      env: {
        PATH: process.env.PATH || '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
        ...(process.env.NODE_PATH ? { NODE_PATH: process.env.NODE_PATH } : {}),
        ...env,
      },
      cwd: __dirname,
      timeout: 15000,
      encoding: 'utf8',
    }
  );
  try { unlinkSync(scriptPath); } catch { /* ignorieren */ }
  return result;
}

const DB_JS = JSON.stringify(path.join(__dirname, 'db.js'));

// ── 5a. Neue Datenbank → Version 4 + beide Tabellen ─────────────────────────

describe('Migrations S5a: Neue Datenbank', () => {
  it('erhält aktuelle Schema-Version und beide Tabellen nach initDB()', () => {
    const tmpDir = mkdtempSync(path.join(tmpdir(), 'lumo-mig-s5a-'));
    // S5a: erwartet SCHEMA_VERSION = 4 (Migration 0→1→2→3→4)
    const EXPECTED_VERSION = 4;
    const result = spawnScript({ DB_PATH: tmpDir, NODE_ENV: 'development' }, `
import { initDB } from ${DB_JS};
import Database from 'better-sqlite3';
import p from 'path';
const ok = initDB();
if (!ok) { console.error('initDB() returned false'); process.exit(2); }
// Zweite Verbindung zur selben Datei (WAL-Modus erlaubt das) – liest Schema
const reader = new Database(p.join(${JSON.stringify(tmpDir)}, 'lumo.db'), { readonly: true });
const version = reader.pragma('user_version', { simple: true });
if (version !== ${EXPECTED_VERSION}) { console.error('user_version:', version); process.exit(3); }
const tables = reader.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(r => r.name);
if (!tables.includes('users'))      { console.error('Fehlende Tabelle: users; vorhanden:', tables); process.exit(4); }
if (!tables.includes('user_state')) { console.error('Fehlende Tabelle: user_state; vorhanden:', tables); process.exit(5); }
// S-07: blocks_analyzed_total-Spalte prüfen (Migration 3→4)
const cols = reader.pragma('table_info(users)').map(c => c.name);
if (!cols.includes('blocks_analyzed_total')) { console.error('Spalte blocks_analyzed_total fehlt; Spalten:', cols); process.exit(6); }
reader.close();
process.exit(0);
`);
    rmSync(tmpDir, { recursive: true, force: true });
    assert.equal(result.status, 0,
      `S5a fehlgeschlagen (exit ${result.status}).\nstdout: ${result.stdout}\nstderr: ${result.stderr}`);
  });
});

// ── 5b. Bestehende DB ohne Versionsinfo → Daten erhalten ────────────────────

describe('Migrations S5b: Bestehende DB ohne Versionsinfo', () => {
  it('behält vorhandene User-Daten nach Migration (user_version 0 → 4)', async () => {
    const tmpDir = mkdtempSync(path.join(tmpdir(), 'lumo-mig-s5b-'));
    const dbFile = path.join(tmpDir, 'lumo.db');

    // Vorarbeit: DB manuell anlegen wie vor dem Migrations-Mechanismus.
    // user_version bleibt 0 (Default), Tabellen + Testdaten einfügen.
    {
      const Database = (await import('better-sqlite3')).default;
      const pre = new Database(dbFile);
      pre.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          last_seen TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS user_state (
          user_id TEXT PRIMARY KEY,
          state_json TEXT NOT NULL,
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (user_id) REFERENCES users(id)
        );
        INSERT INTO users (id) VALUES ('test-user-keep');
        INSERT INTO user_state (user_id, state_json) VALUES ('test-user-keep', '{"streak":{"days":7}}');
      `);
      pre.close();
    }

    const result = spawnScript({ DB_PATH: tmpDir, NODE_ENV: 'development' }, `
import { initDB } from ${DB_JS};
import Database from 'better-sqlite3';
import p from 'path';
const ok = initDB();
if (!ok) { console.error('initDB() returned false'); process.exit(2); }
const reader = new Database(p.join(${JSON.stringify(tmpDir)}, 'lumo.db'), { readonly: true });
const version = reader.pragma('user_version', { simple: true });
if (version !== 4) { console.error('user_version:', version); process.exit(3); }
const user = reader.prepare("SELECT id FROM users WHERE id = 'test-user-keep'").get();
if (!user) { console.error('Testdaten fehlen nach Migration'); process.exit(4); }
const state = reader.prepare("SELECT state_json FROM user_state WHERE user_id = 'test-user-keep'").get();
if (!state) { console.error('user_state-Eintrag fehlt nach Migration'); process.exit(5); }
if (!state.state_json.includes('7')) { console.error('state_json verändert:', state.state_json); process.exit(6); }
reader.close();
process.exit(0);
`);
    rmSync(tmpDir, { recursive: true, force: true });
    assert.equal(result.status, 0,
      `S5b fehlgeschlagen (exit ${result.status}).\nstdout: ${result.stdout}\nstderr: ${result.stderr}`);
  });
});

// ── 5c. Erneuter Start → keine Migration erneut ──────────────────────────────

describe('Migrations S5c: Erneuter Start', () => {
  it('führt keine Migration erneut aus wenn user_version bereits aktuell ist', () => {
    const tmpDir = mkdtempSync(path.join(tmpdir(), 'lumo-mig-s5c-'));

    // Erster Lauf: Migration 0 → 1
    const first = spawnScript({ DB_PATH: tmpDir, NODE_ENV: 'development' }, `
import { initDB } from ${DB_JS};
const ok = initDB();
process.exit(ok ? 0 : 2);
`);
    assert.equal(first.status, 0, `Erster Lauf fehlgeschlagen.\nstderr: ${first.stderr}`);

    // Zweiter Lauf: kein Fehler, Version bleibt 4
    const second = spawnScript({ DB_PATH: tmpDir, NODE_ENV: 'development' }, `
import { initDB } from ${DB_JS};
import Database from 'better-sqlite3';
import p from 'path';
const ok = initDB();
if (!ok) { console.error('Zweiter initDB() returned false'); process.exit(2); }
const reader = new Database(p.join(${JSON.stringify(tmpDir)}, 'lumo.db'), { readonly: true });
const version = reader.pragma('user_version', { simple: true });
reader.close();
if (version !== 4) { console.error('user_version nach zweitem Lauf:', version); process.exit(3); }
process.exit(0);
`);
    rmSync(tmpDir, { recursive: true, force: true });
    assert.equal(second.status, 0,
      `S5c fehlgeschlagen (exit ${second.status}).\nstdout: ${second.stdout}\nstderr: ${second.stderr}`);
  });
});

// ── 5d. Fehler in Migration → Rollback ───────────────────────────────────────
//
// Testet das Transaktions-Rollback direkt mit better-sqlite3, ohne db.js-Modul-
// Komplexität. Simuliert eine fehlerhafte Migration, prüft dass kein SQL und
// kein user_version-Bump persistent werden.

describe('Migrations S5d: Fehler in Migration → Rollback', () => {
  it('SQL-Änderung und Versions-Bump werden vollständig zurückgerollt', () => {
    const tmpDir = mkdtempSync(path.join(tmpdir(), 'lumo-mig-s5d-'));
    const result = spawnScript({ NODE_ENV: 'development' }, `
import Database from 'better-sqlite3';
import p from 'path';
const dbFile = p.join(${JSON.stringify(tmpDir)}, 'rollback-test.db');
const db = new Database(dbFile);
db.pragma('journal_mode = WAL');

// Ausgangszustand: user_version = 0, keine Tabelle 'migration_test'
const before = db.pragma('user_version', { simple: true });
if (before !== 0) { console.error('Ausgangszustand user_version nicht 0:', before); process.exit(3); }

// Fehlerhafte Migration: Tabelle anlegen + Fehler + user_version-Bump
// Das Ganze in einer Transaktion — bei Fehler alles zurückrollen
const failingMigration = db.transaction(() => {
  db.exec("CREATE TABLE migration_test (id TEXT PRIMARY KEY)");
  db.pragma('user_version = 1');
  throw new Error('Deliberater Migrationsfehler');
});
try {
  failingMigration();
} catch {
  // Erwarteter Fehler — Rollback muss passiert sein
}

// Prüfen: weder Tabelle noch Versionsänderung dürfen persistent sein
const afterVersion = db.pragma('user_version', { simple: true });
if (afterVersion !== 0) { console.error('user_version wurde nicht zurückgerollt:', afterVersion); process.exit(4); }
const table = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='migration_test'").get();
if (table) { console.error('migration_test-Tabelle wurde nicht zurückgerollt'); process.exit(5); }
db.close();
process.exit(0);
`);
    rmSync(tmpDir, { recursive: true, force: true });
    assert.equal(result.status, 0,
      `S5d fehlgeschlagen (exit ${result.status}).\nstdout: ${result.stdout}\nstderr: ${result.stderr}`);
  });
});

// ── 5e. DB mit höherer Version → Abbruch ─────────────────────────────────────

describe('Migrations S5e: Datenbank-Version > SCHEMA_VERSION', () => {
  it('initDB() bricht ab und gibt false zurück wenn DB-Version zu hoch', async () => {
    const tmpDir = mkdtempSync(path.join(tmpdir(), 'lumo-mig-s5e-'));
    const dbFile = path.join(tmpDir, 'lumo.db');

    // DB mit user_version=999 vorbereiten (höher als SCHEMA_VERSION=1)
    {
      const Database = (await import('better-sqlite3')).default;
      const pre = new Database(dbFile);
      pre.pragma('user_version = 999');
      pre.close();
    }

    const result = spawnScript({ DB_PATH: tmpDir, NODE_ENV: 'development' }, `
import { initDB } from ${DB_JS};
const ok = initDB();
// initDB() muss false zurückgeben (Migrations-Fehler → catch-Block)
// Exit 2 = initDB() false = erwartetes Verhalten
process.exit(ok ? 0 : 2);
`);
    // Prüfe: user_version muss unverändert 999 sein (keine Herabsetzung)
    const Database = (await import('better-sqlite3')).default;
    const check = new Database(dbFile, { readonly: true });
    const version = check.pragma('user_version', { simple: true });
    check.close();
    rmSync(tmpDir, { recursive: true, force: true });

    assert.equal(result.status, 2,
      `S5e: Erwartet exit 2 (initDB false), bekam ${result.status}.\nstderr: ${result.stderr}`);
    assert.equal(version, 999, `S5e: user_version wurde auf ${version} verändert (darf nicht)`);
    // Fehlermeldung muss im stderr-Output des Kindprozesses erscheinen
    assert.ok(result.stderr.includes('FATAL') || result.stderr.includes('neuer') || result.stderr.includes('999'),
      `S5e: Kein verständlicher Fehlerhinweis in stderr:\n${result.stderr}`);
  });
});

// ── 5f. Foreign-Key-Constraint durchgesetzt ───────────────────────────────────

describe('Migrations S5f: Foreign-Key-Enforcement', () => {
  it('wirft bei INSERT in user_state mit nicht-existierender user_id', () => {
    const tmpDir = mkdtempSync(path.join(tmpdir(), 'lumo-mig-s5f-'));
    const result = spawnScript({ DB_PATH: tmpDir, NODE_ENV: 'development' }, `
import { initDB, db } from ${DB_JS};
const ok = initDB();
if (!ok) { console.error('initDB() returned false'); process.exit(2); }
// db hat foreign_keys=ON durch initDB(). INSERT mit nicht-existierender user_id
// muss einen FOREIGN KEY constraint Fehler werfen.
let threw = false;
try {
  db.prepare("INSERT INTO user_state (user_id, state_json) VALUES (?, ?)").run('nonexistent-user-id', '{}');
} catch (err) {
  if (err.message.toLowerCase().includes('foreign key')) {
    threw = true;
  } else {
    console.error('Falscher Fehler:', err.message);
    process.exit(3);
  }
}
if (!threw) {
  console.error('FK-Constraint wurde NICHT durchgesetzt – foreign_keys=ON fehlt oder unwirksam');
  process.exit(4);
}
process.exit(0);
`);
    rmSync(tmpDir, { recursive: true, force: true });
    assert.equal(result.status, 0,
      `S5f fehlgeschlagen (exit ${result.status}).\nstdout: ${result.stdout}\nstderr: ${result.stderr}`);
  });
});

// ── 5g. Vorhandene Daten bleiben nach Migration unverändert ──────────────────

describe('Migrations S5g: Datenintegrität', () => {
  it('state_json bleibt nach Migration identisch erhalten', async () => {
    const tmpDir = mkdtempSync(path.join(tmpdir(), 'lumo-mig-s5g-'));
    const dbFile = path.join(tmpDir, 'lumo.db');
    const originalState = JSON.stringify({ streak: { days: 42, lastDate: '2026-11-03' }, flashcards: [{ id: 'c1' }] });

    // Vorarbeit: DB mit user_version=0 und einem vollständigen State
    {
      const Database = (await import('better-sqlite3')).default;
      const pre = new Database(dbFile);
      pre.exec(`
        CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, created_at TEXT NOT NULL DEFAULT (datetime('now')), last_seen TEXT NOT NULL DEFAULT (datetime('now')));
        CREATE TABLE IF NOT EXISTS user_state (user_id TEXT PRIMARY KEY, state_json TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT (datetime('now')), FOREIGN KEY (user_id) REFERENCES users(id));
      `);
      pre.prepare("INSERT INTO users (id) VALUES (?)").run('integrity-test-user');
      pre.prepare("INSERT INTO user_state (user_id, state_json) VALUES (?, ?)").run('integrity-test-user', originalState);
      pre.close();
    }

    const result = spawnScript({ DB_PATH: tmpDir, NODE_ENV: 'development' }, `
import { initDB } from ${DB_JS};
import Database from 'better-sqlite3';
import p from 'path';
const ok = initDB();
if (!ok) { console.error('initDB() returned false'); process.exit(2); }
const reader = new Database(p.join(${JSON.stringify(tmpDir)}, 'lumo.db'), { readonly: true });
const row = reader.prepare("SELECT state_json FROM user_state WHERE user_id = 'integrity-test-user'").get();
reader.close();
if (!row) { console.error('Eintrag fehlt nach Migration'); process.exit(3); }
const expected = ${JSON.stringify(originalState)};
if (row.state_json !== expected) {
  console.error('state_json verändert:\\nErwartet:', expected, '\\nGefunden:', row.state_json);
  process.exit(4);
}
process.exit(0);
`);
    rmSync(tmpDir, { recursive: true, force: true });
    assert.equal(result.status, 0,
      `S5g fehlgeschlagen (exit ${result.status}).\nstdout: ${result.stdout}\nstderr: ${result.stderr}`);
  });
});

// ─── 6. AUDIT-E-03: Produktionsverhalten bei Initialisierungsfehlern ─────────
//
// Stellt sicher, dass initDB() in Produktion (IS_PRODUCTION === true) beim
// Auftreten eines Fehlers innerhalb des try-Blocks process.exit(1) aufruft
// und nicht stillschweigend mit return false weiterläuft.
//
// In Entwicklung (NODE_ENV nicht production, kein Railway) muss das bisherige
// Fallback-Verhalten (return false → localStorage-only) unverändert bleiben.
//
// Simulationsstrategie für den try-Block-Fehler:
//   'lumo.db' wird als Verzeichnis statt Datei angelegt → new Database() schlägt fehl.
//   Das ist der zuverlässigste Weg, den try-Block zum Werfen zu bringen, ohne
//   interne Migrationsdetails zu manipulieren.

// ── E03a. Produktion + DB-Öffnungsfehler → process.exit(1) ──────────────────

describe('AUDIT-E-03a: Produktion + DB-Initialisierungsfehler', () => {
  it('beendet Prozess mit exit 1 wenn new Database() in Produktion fehlschlägt', () => {
    const tmpDir = mkdtempSync(path.join(tmpdir(), 'lumo-e03a-'));
    // 'lumo.db' als Verzeichnis anlegen → new Database() schlägt fehl
    mkdirSync(path.join(tmpDir, 'lumo.db'));

    const result = spawnScript({ DB_PATH: tmpDir, NODE_ENV: 'production' }, `
import { initDB } from ${DB_JS};
const ok = initDB();
// Sollte nie hier ankommen — in Produktion muss process.exit(1) aufgerufen werden
process.exit(ok ? 0 : 2);
`);
    rmSync(tmpDir, { recursive: true, force: true });
    assert.equal(result.status, 1,
      `E03a: Erwartet exit 1, bekam ${result.status}.\nstdout: ${result.stdout}\nstderr: ${result.stderr}`);
    assert.ok(
      result.stderr.includes('Fehler beim Initialisieren') || result.stderr.includes('Kontrollierter Abbruch'),
      `E03a: Kein FATAL-Hinweis in stderr:\n${result.stderr}`
    );
  });
});

// ── E03b. Produktion + user_version > SCHEMA_VERSION → process.exit(1) ───────

describe('AUDIT-E-03b: Produktion + user_version > SCHEMA_VERSION', () => {
  it('beendet Prozess mit exit 1 wenn DB-Version zu hoch in Produktion', async () => {
    const tmpDir = mkdtempSync(path.join(tmpdir(), 'lumo-e03b-'));
    const dbFile = path.join(tmpDir, 'lumo.db');
    {
      const Database = (await import('better-sqlite3')).default;
      const pre = new Database(dbFile);
      pre.pragma('user_version = 999');
      pre.close();
    }

    const result = spawnScript({ DB_PATH: tmpDir, NODE_ENV: 'production' }, `
import { initDB } from ${DB_JS};
const ok = initDB();
process.exit(ok ? 0 : 2);
`);
    rmSync(tmpDir, { recursive: true, force: true });
    assert.equal(result.status, 1,
      `E03b: Erwartet exit 1, bekam ${result.status}.\nstdout: ${result.stdout}\nstderr: ${result.stderr}`);
    assert.ok(
      result.stderr.includes('FATAL') || result.stderr.includes('Kontrollierter Abbruch'),
      `E03b: Kein Fehlerhinweis in stderr:\n${result.stderr}`
    );
  });
});

// ── E03c. Produktion + nicht zugänglicher DB-Pfad → process.exit(1) ──────────
//
// Hinweis: chmodSync funktioniert in dieser Testumgebung nicht als Simulation,
// da der Prozess als root läuft (root ignoriert Schreibrechtsbits auf Verzeichnissen).
// Stattdessen: nicht-existierender Pfad → accessSync wirft ENOENT → gleicher Code-Pfad.
// Das ist eine valide Simulation der Verzweigung accessSync-Fehler → IS_PRODUCTION → exit(1).

describe('AUDIT-E-03c: Produktion + nicht zugänglicher DB-Pfad', () => {
  it('beendet Prozess mit exit 1 wenn DB_PATH nicht zugänglich ist in Produktion', () => {
    const nonExistentDir = path.join(tmpdir(), `lumo-e03c-nonexistent-${Date.now()}`);
    // Sicherstellen, dass das Verzeichnis nicht existiert
    rmSync(nonExistentDir, { recursive: true, force: true });

    const result = spawnScript({ DB_PATH: nonExistentDir, NODE_ENV: 'production' }, `
import { initDB } from ${DB_JS};
const ok = initDB();
process.exit(ok ? 0 : 2);
`);
    assert.equal(result.status, 1,
      `E03c: Erwartet exit 1, bekam ${result.status}.\nstdout: ${result.stdout}\nstderr: ${result.stderr}`);
    assert.ok(
      result.stderr.includes('FATAL') || result.stderr.includes('nicht zugänglich'),
      `E03c: Kein Fehlerhinweis in stderr:\n${result.stderr}`
    );
  });
});

// ── E03d. Entwicklung + DB-Öffnungsfehler → return false (kein Crash) ────────

describe('AUDIT-E-03d: Entwicklung + DB-Initialisierungsfehler', () => {
  it('gibt false zurück (kein Prozessabbruch) wenn new Database() in Entwicklung fehlschlägt', () => {
    const tmpDir = mkdtempSync(path.join(tmpdir(), 'lumo-e03d-'));
    // Gleiche Fehlersimulation wie E03a, aber ohne IS_PRODUCTION
    mkdirSync(path.join(tmpDir, 'lumo.db'));

    const result = spawnScript({ DB_PATH: tmpDir, NODE_ENV: 'development' }, `
import { initDB } from ${DB_JS};
const ok = initDB();
// In Entwicklung: false zurückgegeben (graceful degradation), kein process.exit(1)
process.exit(ok ? 0 : 2);
`);
    rmSync(tmpDir, { recursive: true, force: true });
    assert.equal(result.status, 2,
      `E03d: Erwartet exit 2 (initDB false, kein Crash), bekam ${result.status}.\nstdout: ${result.stdout}\nstderr: ${result.stderr}`);
  });
});

// ── E03e. Erfolgreiche Initialisierung in Produktion → unverändert ────────────

describe('AUDIT-E-03e: Erfolgreiche Initialisierung in Produktion', () => {
  it('gibt true zurück und beendet sich mit exit 0 bei erfolgreicher DB-Initialisierung', () => {
    const tmpDir = mkdtempSync(path.join(tmpdir(), 'lumo-e03e-'));

    const result = spawnScript({ DB_PATH: tmpDir, NODE_ENV: 'production' }, `
import { initDB } from ${DB_JS};
const ok = initDB();
process.exit(ok ? 0 : 2);
`);
    rmSync(tmpDir, { recursive: true, force: true });
    assert.equal(result.status, 0,
      `E03e: Erwartet exit 0 (Erfolg), bekam ${result.status}.\nstdout: ${result.stdout}\nstderr: ${result.stderr}`);
  });
});
