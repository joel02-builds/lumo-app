/**
 * Lumo Persistent State — SQLite via better-sqlite3
 *
 * Warum SQLite und nicht PostgreSQL/Supabase?
 * ────────────────────────────────────────────
 * • Lumo ist solo-deployed auf Railway (single process)
 * • SQLite auf einer SSD hat ~50k writes/sec — mehr als genug
 * • Kein externer DB-Dienst = keine weiteren Kosten, kein Cold-Start-Problem
 * • better-sqlite3 ist synchron = einfacherer Code, kein async/await-Stack
 *
 * Datenmodell:
 * ────────────
 * users        — anonyme User-IDs (UUID), erstellt beim ersten Besuch
 * user_state   — JSON-Blob mit dem vollständigen App-State pro User
 *
 * Datenschutz:
 * ────────────
 * Es werden KEINE personenbezogenen Daten gespeichert.
 * user_id = zufälliger UUID, nie verknüpft mit Email/Name/IP.
 * Das Material (PDF/Text) wird NICHT gespeichert — nur der analysierte State.
 */

import Database from 'better-sqlite3';
import { accessSync, constants } from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Erkennt Railway-Deployment zuverlässig auch ohne NODE_ENV=production.
// Railway setzt vor Prozessstart mehrere RAILWAY_*-Plattformvariablen – alle
// vor dotenv verfügbar, daher sicher auf Modul-Ebene auswertbar.
//
// Dokumentierte Railway-Variablen (Stand Nov 2025, docs.railway.com/variables/reference):
//   RAILWAY_ENVIRONMENT_ID   — UUID des Environments (z. B. "abc123…")
//   RAILWAY_ENVIRONMENT_NAME — lesbarer Name     (z. B. "production")
//   RAILWAY_SERVICE_ID       — UUID des Service
//   RAILWAY_PROJECT_ID       — UUID des Projekts
//
// RAILWAY_ENVIRONMENT ist in der aktuellen Railway-Dokumentation nicht gelistet
// und wurde deshalb durch die vier dokumentierten Variablen ersetzt.
// Mindestens eine davon ist auf jedem Railway-Deployment immer gesetzt.
const IS_RAILWAY = Boolean(
  process.env.RAILWAY_ENVIRONMENT_ID ||
  process.env.RAILWAY_ENVIRONMENT_NAME ||
  process.env.RAILWAY_SERVICE_ID ||
  process.env.RAILWAY_PROJECT_ID
);

// Fasst beide Produktionssignale zusammen: Railway-Plattform ODER NODE_ENV=production.
// Wird für Sicherheitsschranken genutzt, die in JEDER Produktionsumgebung greifen müssen,
// nicht nur auf Railway (z. B. non-Railway-Hosting wie Render, Fly, eigener VPS).
const IS_PRODUCTION = IS_RAILWAY || process.env.NODE_ENV === 'production';

let db;

export function initDB() {
  // ── 1. DB-Verzeichnis auflösen ────────────────────────────────────────────
  // Pfad-Priorität: expliziter Override › Railway-Volume-Auto-Variable › lokales Dev
  //
  // DB_PATH und RAILWAY_VOLUME_MOUNT_PATH werden hier (nach dem dotenv-Load in
  // server/index.js) ausgewertet, nicht auf Modul-Ebene – damit lokale .env-
  // Overrides greifen, auch wenn db.js vor dem dotenv-Import geladen wird.
  const dbDir = process.env.DB_PATH
    || process.env.RAILWAY_VOLUME_MOUNT_PATH
    || __dirname;
  const dbFile = path.join(dbDir, 'lumo.db');

  // ── 2. Sicherheitsprüfung: kein stiller Fallback auf ephemeres Verzeichnis ─
  // In JEDER Produktionsumgebung muss ein persistenter DB-Pfad konfiguriert sein.
  // Ohne ihn läge die DB im flüchtigen Container-Dateisystem – jeder Deploy löscht
  // alle Nutzerdaten. Harter Abbruch statt stillem Fallback auf __dirname.
  if (IS_PRODUCTION && !process.env.DB_PATH && !process.env.RAILWAY_VOLUME_MOUNT_PATH) {
    if (IS_RAILWAY) {
      console.error('[DB] FATAL: Kein persistentes Volume konfiguriert.');
      console.error('[DB] Auf Railway muss ein Volume gemountet sein, damit Nutzerdaten');
      console.error('[DB] Deploys überleben. Anleitung:');
      console.error('[DB]   Railway Dashboard → Service → "Add Volume" → Mount Path: /data');
      console.error('[DB] Nach dem Mounten setzt Railway RAILWAY_VOLUME_MOUNT_PATH automatisch.');
    } else {
      console.error('[DB] FATAL: Kein persistenter Datenbankpfad konfiguriert.');
      console.error('[DB] In Produktionsumgebungen (NODE_ENV=production) muss DB_PATH');
      console.error('[DB] auf ein persistentes Verzeichnis gesetzt sein, das Deploys überlebt.');
      console.error('[DB] Beispiel: DB_PATH=/data');
    }
    process.exit(1);
  }

  // ── 3. Verzeichnis-Prüfung: existiert und ist beschreibbar? ───────────────
  try {
    accessSync(dbDir, constants.W_OK);
  } catch (dirErr) {
    console.error(`[DB] FATAL: Datenbankverzeichnis nicht zugänglich (${dirErr.code}).`);
    console.error('[DB] Das Verzeichnis muss existieren und vom Prozess beschreibbar sein.');
    if (IS_PRODUCTION) {
      // In Produktion (Railway oder NODE_ENV=production) gibt es keinen Fallback.
      process.exit(1);
    }
    // Lokal: graceful degradation, App läuft mit localStorage-only Fallback weiter.
    return false;
  }

  // ── 4. Datenbank öffnen ───────────────────────────────────────────────────
  try {
    db = new Database(dbFile);

    // WAL-Modus: bessere Concurrent-Read-Performance.
    // WAL-Dateien (.db-shm, .db-wal) liegen automatisch im selben Verzeichnis
    // wie die Hauptdatei – auf einem Railway-Volume sind alle drei persistent
    // und überleben Deploys.
    //
    // ⚠️  SQLite + mehrere Server-Instanzen:
    //     SQLite erlaubt beliebig viele gleichzeitige Leser, aber nur einen
    //     Writer pro Prozess. Railway-Volumes können nicht von mehreren Replikas
    //     gleichzeitig gemountet werden (Railway-Doku: "Replicas can't be used
    //     with volumes"). Lumo nutzt genau eine Instanz → kein Multi-Writer-
    //     Problem. Sollte Lumo je horizontal skaliert werden, muss die Persistenz
    //     auf PostgreSQL oder einen externen Key-Value-Store migriert werden.
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL'); // sicherer als OFF, schneller als FULL

    db.exec(`
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
    `);

    console.log('[DB] SQLite initialisiert:', dbFile);
    console.log('[DB] Persistenz:', IS_RAILWAY ? 'Railway Volume ✓' : IS_PRODUCTION ? 'Produktion (DB_PATH) ✓' : 'lokal (Entwicklung)');
    return true;
  } catch (err) {
    console.error('[DB] Fehler beim Initialisieren:', err.message);
    // Nicht crashen — App läuft weiter mit localStorage-only Fallback
    return false;
  }
}

// ─── User-Verwaltung ──────────────────────────────────────────────────────

/**
 * Gibt vorhandene User-ID zurück oder erstellt neue.
 */
export function getOrCreateUser(userId) {
  if (!db) return null;
  try {
    const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    if (existing) {
      db.prepare("UPDATE users SET last_seen = datetime('now') WHERE id = ?").run(userId);
      return userId;
    }
    // Neue ID erstellen (entweder übergebene oder frische UUID)
    const newId = userId || randomUUID();
    db.prepare("INSERT INTO users (id) VALUES (?)").run(newId);
    return newId;
  } catch (err) {
    console.error('[DB] getOrCreateUser Fehler:', err.message);
    return null;
  }
}

export function createNewUser() {
  if (!db) return null;
  try {
    const id = randomUUID();
    db.prepare("INSERT INTO users (id) VALUES (?)").run(id);
    return id;
  } catch (err) {
    console.error('[DB] createNewUser Fehler:', err.message);
    return null;
  }
}

// ─── State-Verwaltung ─────────────────────────────────────────────────────

/**
 * Lädt den gespeicherten State eines Users.
 * Gibt null zurück wenn kein State vorhanden.
 */
export function loadUserState(userId) {
  if (!db || !userId) return null;
  try {
    const row = db.prepare('SELECT state_json FROM user_state WHERE user_id = ?').get(userId);
    if (!row) return null;
    return JSON.parse(row.state_json);
  } catch (err) {
    console.error('[DB] loadUserState Fehler:', err.message);
    return null;
  }
}

/**
 * Speichert den State eines Users.
 * Upsert: erstellt oder überschreibt.
 */
export function saveUserState(userId, state) {
  if (!db || !userId) return false;
  try {
    // Materialdaten NICHT persistieren (zu groß, nicht nötig nach Analyse)
    const { fileBase64, materialText, ...safeState } = state;

    db.prepare(`
      INSERT INTO user_state (user_id, state_json, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET
        state_json = excluded.state_json,
        updated_at = datetime('now')
    `).run(userId, JSON.stringify(safeState));
    return true;
  } catch (err) {
    console.error('[DB] saveUserState Fehler:', err.message);
    return false;
  }
}

/**
 * Löscht den State eines Users (Reset-Funktion).
 */
export function deleteUserState(userId) {
  if (!db || !userId) return false;
  try {
    db.prepare('DELETE FROM user_state WHERE user_id = ?').run(userId);
    return true;
  } catch (err) {
    console.error('[DB] deleteUserState Fehler:', err.message);
    return false;
  }
}

/**
 * Streak-Update: wird nach jeder abgeschlossenen Session aufgerufen.
 * Streak ist in state_json eingebettet, kein separates Feld nötig.
 */
export function updateStreak(userId) {
  if (!db || !userId) return null;
  try {
    const state = loadUserState(userId);
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    const streak = state?.streak || { days: 0, lastDate: null };

    if (streak.lastDate === today) {
      // Bereits heute gelernt — kein Update
      return streak;
    }

    const newStreak = {
      days: streak.lastDate === yesterday ? (streak.days || 0) + 1 : 1,
      lastDate: today,
    };

    // Streak in State mergen
    const newState = { ...(state || {}), streak: newStreak };
    saveUserState(userId, newState);
    return newStreak;
  } catch (err) {
    console.error('[DB] updateStreak Fehler:', err.message);
    return null;
  }
}

export { db, IS_RAILWAY };
