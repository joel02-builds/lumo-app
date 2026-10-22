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
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// In Production: persistenter Pfad (Railway Volume oder /data)
// Lokal: im Server-Ordner selbst
const DB_DIR = process.env.DB_PATH || __dirname;
const DB_FILE = path.join(DB_DIR, 'lumo.db');

let db;

export function initDB() {
  try {
    db = new Database(DB_FILE);
    db.pragma('journal_mode = WAL'); // bessere Concurrent-Read-Performance
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

    console.log('[DB] SQLite initialisiert:', DB_FILE);
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

export { db };
