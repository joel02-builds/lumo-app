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
import { mkdtempSync, rmSync, accessSync, constants, writeFileSync, unlinkSync } from 'node:fs';
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
