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
import { randomUUID, randomBytes, createHash } from 'crypto';

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

// ─── Schema-Migrationen ───────────────────────────────────────────────────
//
// Versionierung über SQLite PRAGMA user_version (32-bit Integer im DB-Header).
// Kein externes Tool, keine neue Dependency — nur better-sqlite3 + plain JS.
//
// Regeln:
//   • Jede Migration läuft in einer eigenen db.transaction()-Transaktion.
//   • SQL-Änderungen und PRAGMA user_version-Erhöhung sind atomar.
//   • Fehlgeschlagene Migration → Rollback → Version bleibt → nächster Start
//     wiederholt sie.
//   • Bereits angewendete Migrationen werden nicht erneut ausgeführt.
//   • DB-Version > SCHEMA_VERSION → Abbruch (neues Schema, altes Binary).
//
// Migration hinzufügen:
//   1. SCHEMA_VERSION um 1 erhöhen.
//   2. Neue Funktion ans Ende von MIGRATIONS hängen.
//      Signatur: (db) => { /* DDL/DML hier */ }

const SCHEMA_VERSION = 4;

const MIGRATIONS = [
  // Migration 0 → 1: Initiales Schema
  // CREATE TABLE IF NOT EXISTS stellt sicher, dass bestehende Datenbanken
  // (user_version = 0 aus der Zeit vor dem Migrations-Mechanismus) ihre
  // Daten und Tabellen vollständig behalten.
  (db) => {
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
  },

  // Migration 1 → 2: Session-Token-Architektur (S-00/S-01 Fix)
  //
  // Trennt Session-Token (Authentifizierungsnachweis, im Browser) von der
  // internen User-ID (Identifikator, nur serverseitig).
  //
  // session_hash: SHA-256-Hash des Klartext-Tokens (nie das Token selbst).
  // UNIQUE WHERE NOT NULL: erlaubt mehrere NULL-Werte (noch nicht migrierte
  // oder ausgeloggte Nutzer), erzwingt aber Eindeutigkeit für aktive Sessions.
  // Partial indexes werden von SQLite seit 3.8.0 unterstützt (aktuell: 3.49+).
  (db) => {
    db.exec(`ALTER TABLE users ADD COLUMN session_hash TEXT DEFAULT NULL;`);
    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_session_hash
        ON users(session_hash) WHERE session_hash IS NOT NULL;
    `);
  },

  // Migration 2 → 3: Serverseitiger Session-Ablauf (expires_at)
  //
  // Ohne einen serverseitigen Ablaufzeitpunkt ist ein gestohlenes Token unbegrenzt
  // gültig — die einzige Ablaufbegrenzung wäre das Browser-Cookie (1 Jahr), das der
  // Browser kontrolliert. Mit expires_at wird Gültigkeit serverseitig erzwungen.
  //
  // Bestehende aktive Sessions (session_hash IS NOT NULL) erhalten rückwirkend
  // einen Ablauf von 1 Jahr ab Migrationsausführung. Neue Sessions setzen expires_at
  // explizit in createSession() und migrateLegacySession().
  //
  // expires_at = NULL ist nach dieser Migration nur für ausgeloggte/nicht-migrierte
  // Nutzer möglich (session_hash IS NULL). validateSession() behandelt NULL-expires_at
  // bei aktiven Sessions als "kein Ablauf" (Backward-Compat-Schutzschicht).
  (db) => {
    db.exec(`ALTER TABLE users ADD COLUMN expires_at TEXT DEFAULT NULL;`);
    // Bestehende aktive Sessions: 1 Jahr ab Migrationszeitpunkt
    db.exec(`UPDATE users SET expires_at = datetime('now', '+1 year') WHERE session_hash IS NOT NULL;`);
  },

  // Migration 3 → 4: Serverseitiger Nutzungszähler für Free-Block-Limit (S-07)
  //
  // Warum: Der bisherige blocksAnalyzedTotal-Zähler lebte ausschließlich im Client-
  // State. Ein Angreifer konnte das Limit umgehen, indem er POST /api/state mit
  // blocksAnalyzedTotal: 0 aufrief oder den Wert im Cookie manipulierte.
  //
  // Lösung: Eigenständige Spalte blocks_analyzed_total in der users-Tabelle.
  // Server inkrementiert sie nach jeder erfolgreichen Analyse. Clients können
  // diesen Wert nicht überschreiben (wird bei POST /api/state ignoriert).
  //
  // Bestehende Nutzer starten mit 0 — sie behalten ihr Limit-Reset, da sie
  // vor dieser Schutzmassnahme analysiert haben. Produktionsentscheidung:
  // Fairness für Bestandsnutzer > exakte Rückverfolgung bisheriger Nutzung.
  (db) => {
    db.exec(`ALTER TABLE users ADD COLUMN blocks_analyzed_total INTEGER NOT NULL DEFAULT 0;`);
  },
];

/**
 * Führt alle ausstehenden Migrationen aus.
 * Jede Migration ist atomar: SQL + PRAGMA user_version in einer Transaktion.
 * Wirft bei DB-Version > SCHEMA_VERSION (inkompatibles Schema).
 *
 * @param {import('better-sqlite3').Database} database
 */
function runMigrations(database) {
  const current = database.pragma('user_version', { simple: true });

  if (current > SCHEMA_VERSION) {
    throw new Error(
      `[DB] FATAL: Datenbankversion ${current} ist neuer als die unterstützte Version ${SCHEMA_VERSION}. ` +
      `Bitte aktualisiere die App auf eine kompatible Version oder stelle ein Backup wieder her.`
    );
  }

  if (current === SCHEMA_VERSION) {
    console.log(`[DB] Schema auf Version ${SCHEMA_VERSION} – keine Migration nötig.`);
    return;
  }

  for (let v = current; v < SCHEMA_VERSION; v++) {
    const migrate = database.transaction(() => {
      MIGRATIONS[v](database);
      database.pragma(`user_version = ${v + 1}`);
    });
    migrate(); // bei Fehler: vollständiger Rollback, Version bleibt
    console.log(`[DB] Migration ${v} → ${v + 1} erfolgreich.`);
  }
}

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

    // Foreign-Key-Enforcement: SQLite deaktiviert FK-Checks standardmäßig.
    // Muss pro Verbindung aktiviert werden, vor Migrations-Transaktionen.
    db.pragma('foreign_keys = ON');

    // ── 5. Schema-Migrationen ─────────────────────────────────────────────
    runMigrations(db);

    console.log('[DB] SQLite initialisiert:', dbFile);
    console.log('[DB] Persistenz:', IS_RAILWAY ? 'Railway Volume ✓' : IS_PRODUCTION ? 'Produktion (DB_PATH) ✓' : 'lokal (Entwicklung)');
    return true;
  } catch (err) {
    console.error('[DB] Fehler beim Initialisieren:', err.message);
    if (IS_PRODUCTION) {
      // In Produktion gibt es keinen sicheren Fallback: Daten würden ohne
      // Datenbank weder gelesen noch geschrieben. Kontrollierter Abbruch statt
      // stillschweigendem Weiterlaufen ohne Persistenz.
      console.error('[DB] Produktion: Kontrollierter Abbruch – Datenbank nicht initialisierbar.');
      process.exit(1);
    }
    // Lokal/Entwicklung: graceful degradation, App läuft mit localStorage-only Fallback weiter.
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
      // P-BE-04: Throttle last_seen auf max. einmal pro 60 Sekunden (WAL-Schreiblast)
      db.prepare(
        "UPDATE users SET last_seen = datetime('now') WHERE id = ? AND (last_seen IS NULL OR last_seen <= datetime('now', '-60 seconds'))"
      ).run(userId);
      return userId;
    }
    // S-01-Fix: Niemals eine vom Client übergebene ID als neue User-ID akzeptieren.
    // Eine unbekannte userId wird ignoriert — immer frische UUID generieren.
    const newId = randomUUID();
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

// ─── Session-Verwaltung ──────────────────────────────────────────────────────
//
// Token-Design:
//   Klartext-Token: crypto.randomBytes(32).toString('hex') → 64-char hex, 256-bit Entropie
//   Gespeicherter Wert: SHA-256(token) → 64-char hex (nie der Klartext)
//   Cookie-Wert: Klartext-Token (httpOnly, sameSite)
//
// Format-Erkennung im Cookie:
//   /^[0-9a-f]{64}$/  → neues Session-Token  → validateSession()
//   UUID-Muster       → Legacy-Cookie         → migrateLegacySession()
//
// Token-Rotation: nicht implementiert (anonymes System, lange Session-Laufzeit
// ist akzeptabel). Mögliche Verbesserung: Rotation bei Login/kritischen Aktionen.
//
// Session-Widerruf: revokeSession() setzt session_hash = NULL.
//   Bereits ausgestellte Token sind danach ungültig (Hash-Lookup findet nichts).

/**
 * Erzeugt ein kryptographisch sicheres Session-Token (intern).
 * 256-bit Entropie via CSPRNG. Wird NICHT gespeichert — nur der Hash davon.
 */
function generateSessionToken() {
  return randomBytes(32).toString('hex'); // 64-char hex
}

/**
 * Berechnet den SHA-256-Hash eines Tokens (intern).
 * Nur dieser Hash landet in SQLite — nie das Klartext-Token.
 */
function hashSessionToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Erstellt eine neue Session für einen bestehenden User.
 * Speichert nur den Hash des Tokens in der DB.
 * Gibt das Klartext-Token zurück (für das Cookie).
 *
 * @param {string} userId — interne User-ID
 * @returns {string|null} Klartext-Token oder null bei Fehler
 */
export function createSession(userId) {
  if (!db || !userId) return null;
  try {
    const token = generateSessionToken();
    const hash = hashSessionToken(token);
    db.prepare(
      "UPDATE users SET session_hash = ?, expires_at = datetime('now', '+1 year') WHERE id = ?"
    ).run(hash, userId);
    return token;
  } catch (err) {
    console.error('[DB] createSession Fehler:', err.message);
    return null;
  }
}

/**
 * Validiert ein Session-Token und gibt die zugehörige interne User-ID zurück.
 * Aktualisiert last_seen bei gültigem Token.
 *
 * @param {string} token — Klartext-Token aus dem Cookie
 * @returns {string|null} interne User-ID oder null bei ungültigem Token
 */
export function validateSession(token) {
  if (!db || !token) return null;
  try {
    const hash = hashSessionToken(token);
    // Ablaufprüfung direkt in SQL: is_expired = 1 wenn expires_at gesetzt UND in der Vergangenheit.
    // expires_at IS NULL wird als "kein Ablauf" behandelt (Backward-Compat-Schutzschicht für
    // Rows die vor Migration 2→3 angelegt wurden und keine expires_at haben).
    const user = db.prepare(`
      SELECT id,
             (expires_at IS NOT NULL AND expires_at <= datetime('now')) AS is_expired
      FROM users WHERE session_hash = ?
    `).get(hash);
    if (!user) return null;
    if (user.is_expired) {
      // Abgelaufene Session: Hash + Ablaufdatum löschen → Token sofort ungültig
      db.prepare('UPDATE users SET session_hash = NULL, expires_at = NULL WHERE id = ?').run(user.id);
      return null;
    }
    // P-BE-04: Throttle last_seen auf max. einmal pro 60 Sekunden (WAL-Schreiblast)
    db.prepare(
      "UPDATE users SET last_seen = datetime('now') WHERE id = ? AND (last_seen IS NULL OR last_seen <= datetime('now', '-60 seconds'))"
    ).run(user.id);
    return user.id;
  } catch (err) {
    console.error('[DB] validateSession Fehler:', err.message);
    return null;
  }
}

/**
 * Widerruft die Session eines Users.
 * Setzt session_hash = NULL — bestehende Token sind danach sofort ungültig.
 *
 * @param {string} userId — interne User-ID
 * @returns {boolean}
 */
export function revokeSession(userId) {
  if (!db || !userId) return false;
  try {
    db.prepare('UPDATE users SET session_hash = NULL, expires_at = NULL WHERE id = ?').run(userId);
    return true;
  } catch (err) {
    console.error('[DB] revokeSession Fehler:', err.message);
    return false;
  }
}

/**
 * Migriert einen Legacy-User (UUID-Cookie) auf die neue Session-Architektur.
 *
 * Migration ist nur einmalig: sobald ein User einen session_hash hat (entweder
 * bereits migriert oder neu angelegt), gilt die UUID nicht mehr als Credential.
 * Das verhindert UUID-Injection auf neue User und Replay nach Logout.
 *
 * Transaktionssicher: parallele Requests mit derselben Legacy-UUID führen nicht
 * zu Datenbankkorruption (einer migriert, der andere erhält null → neue Session).
 *
 * @param {string} legacyUUID — UUID aus dem alten lumo_uid-Cookie
 * @returns {{ userId: string, token: string }|null}
 */
export function migrateLegacySession(legacyUUID) {
  if (!db || !legacyUUID) return null;
  try {
    return db.transaction(() => {
      const user = db.prepare('SELECT id, session_hash FROM users WHERE id = ?').get(legacyUUID);
      if (!user) return null; // Unbekannte UUID → nicht migrieren

      // Bereits migriert oder neu angelegter User: UUID gilt nicht mehr als Credential.
      // Verhindert auch UUID-Injection: neue User haben immer session_hash ≠ NULL.
      if (user.session_hash !== null) return null;

      const token = generateSessionToken();
      const hash = hashSessionToken(token);
      db.prepare(
        "UPDATE users SET session_hash = ?, expires_at = datetime('now', '+1 year') WHERE id = ?"
      ).run(hash, legacyUUID);
      return { userId: user.id, token };
    })();
  } catch (err) {
    console.error('[DB] migrateLegacySession Fehler:', err.message);
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

// ─── Free-Block-Limit (S-07) ──────────────────────────────────────────────
//
// Server-seitiger Zähler für analysierte Blöcke. Unabhängig vom Client-State:
// der Client kann diesen Wert nicht durch POST /api/state reduzieren.
//
// Atomizität: SQLite ist single-threaded (WAL-Modus erlaubt gleichzeitige Leser,
// aber nur einen Writer gleichzeitig). Das UPDATE ist atomar — Race Conditions
// bei parallelen Requests sind durch SQLite's Serialisierung ausgeschlossen.
// Dennoch gilt: bei sehr vielen gleichzeitigen Requests (edge case) könnte das
// Limit um bis zu MAX_BLOCKS_PER_ANALYSIS überschritten werden, da CHECK und
// INCREMENT nicht in derselben Transaktion wie der API-Call liegen können.
// Akzeptiertes Restrisiko für ein Freemium-Kontext ohne Payment-Backend.

export const FREE_BLOCK_LIMIT = 20; // zentrale Definition (S-07)

/**
 * Gibt die serverseitig gespeicherte Gesamtanzahl analysierter Blöcke zurück.
 * @param {string} userId
 * @returns {number} 0 wenn kein User oder DB offline
 */
export function getBlocksAnalyzedTotal(userId) {
  if (!db || !userId) return 0;
  try {
    const row = db.prepare('SELECT blocks_analyzed_total FROM users WHERE id = ?').get(userId);
    return row?.blocks_analyzed_total ?? 0;
  } catch (err) {
    console.error('[DB] getBlocksAnalyzedTotal Fehler:', err.message);
    return 0;
  }
}

/**
 * Inkrementiert blocks_analyzed_total um `count` Blöcke.
 * Darf nur nach einer erfolgreichen Analyse aufgerufen werden.
 * Atomar via SQLite-UPDATE (kein separates SELECT+UPDATE nötig).
 *
 * @param {string} userId
 * @param {number} count — Anzahl der neu analysierten Blöcke
 * @returns {number} neuer Gesamtzähler oder -1 bei Fehler
 */
export function incrementBlocksAnalyzed(userId, count) {
  if (!db || !userId || count <= 0) return -1;
  try {
    // P-DB-03: UPDATE...RETURNING (SQLite ≥ 3.35.0) – eine atomare Operation statt zwei
    // Liefert undefined wenn userId nicht existiert → ?? -1 erhält bisheriges Fehlerverhalten
    const row = db.prepare(
      'UPDATE users SET blocks_analyzed_total = blocks_analyzed_total + ? WHERE id = ? RETURNING blocks_analyzed_total'
    ).get(count, userId);
    return row?.blocks_analyzed_total ?? -1;
  } catch (err) {
    console.error('[DB] incrementBlocksAnalyzed Fehler:', err.message);
    return -1;
  }
}

export { db, IS_RAILWAY };
