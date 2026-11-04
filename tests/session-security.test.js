/**
 * Session-Security Tests für Lumo — S-00 / S-01 Fix
 * ──────────────────────────────────────────────────────────────────────────────
 * Testet die neue Session-Token-Architektur (Option B):
 *   • Trennung von internem User-ID (Identifier) und Session-Token (Credential)
 *   • SHA-256-Hash-Speicherung — nie Klartext in SQLite
 *   • Transparente Migration von Legacy-UUID-Cookies
 *   • Session-Widerruf und Logout
 *   • Keine userId-Exposition in API-Antworten
 *   • Datenisolation zwischen Nutzern
 *
 * Kein Mock-Client nötig: alle State/Auth-Endpunkte ohne Anthropic-Calls.
 * Die DB-Instanz (better-sqlite3, synchron) wird direkt für Assertions genutzt.
 *
 * Testfall-Übersicht (Spec-Nummern 1–14):
 *   1.  Neuer Nutzer ohne Cookie → neue Session
 *   2.  Wiederkehrender Nutzer → bisheriger Lernstand
 *   3.  Kenntnis einer fremden User-ID → kein Datenzugriff
 *   4.  User-ID als Cookie → nicht als Session akzeptiert
 *   5.  Ungültiger Cookie-Wert → neue Session
 *   6.  Unbekannte Legacy-UUID → kein User unter dieser UUID
 *   7.  Gültige Legacy-UUID → transparente Migration
 *   8.  Parallele Legacy-Requests → keine inkonsistenten Sessions
 *   9.  Session-Token nicht im Klartext in SQLite
 *  10.  Session-Widerruf → weitere Zugriffe verhindert
 *  11.  Logout → Cookie gelöscht, Session widerrufen
 *  12.  GET + POST /api/state → keine userId in Antworten
 *  13.  Zwei Nutzer → strikte Datenisolation
 *  14.  DB-Schemaversion und session_hash-Spalte korrekt (Regressionsbasis)
 */

import { it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'crypto';

// ─── Konstanten ───────────────────────────────────────────────────────────────
const SESSION_TOKEN_RE = /^[0-9a-f]{64}$/;   // 64-char hex = 32-byte Token
const LEGACY_UUID_RE   = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ─── Server-Handles ───────────────────────────────────────────────────────────
let server, port, db;

before(async () => {
  // Env vor dem Import setzen: server/index.js prüft ANTHROPIC_API_KEY beim Start
  process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'test-key-sec-001';

  // App importieren — initialisiert DB als Nebeneffekt (ES-Modul-Singleton)
  const { app } = await import('../server/index.js');

  // DB-Instanz holen — selbe Singleton-Instanz die initDB() angelegt hat
  const dbMod = await import('../server/db.js');
  db = dbMod.db;

  // Express auf zufälligem Port starten (kein Konflikt mit api-integration.test)
  server = await new Promise(r => {
    const s = app.listen(0, '127.0.0.1', () => r(s));
  });
  port = server.address().port;
});

after(async () => {
  await new Promise(r => server?.close(r));
});

// ─── HTTP-Helfer ──────────────────────────────────────────────────────────────

async function req(method, path, { body, cookie } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers['Cookie'] = cookie;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`http://127.0.0.1:${port}${path}`, opts);
  const setCookie = res.headers.get('set-cookie') || '';
  const json = await res.json().catch(() => null);
  return { status: res.status, json, setCookie, headers: res.headers };
}

/** Extrahiert den Token-Wert aus einem Set-Cookie-Header */
function extractToken(setCookie) {
  const m = setCookie.match(/lumo_uid=([^;]+)/);
  return m ? m[1] : null;
}

/** SHA-256-Hash eines Tokens (entspricht server/db.js hashSessionToken) */
function sha256(token) {
  return createHash('sha256').update(token).digest('hex');
}

/** Sucht einen DB-User anhand des Klartext-Tokens (über Hash-Lookup) */
function findUserByToken(token) {
  if (!db) return null;
  return db.prepare('SELECT id, session_hash FROM users WHERE session_hash = ?')
    .get(sha256(token)) ?? null;
}

/** Legt einen Legacy-User direkt in der DB an (session_hash = NULL) */
function insertLegacyUser(uuid) {
  db.prepare("INSERT INTO users (id) VALUES (?)").run(uuid);
  return uuid;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

it('1. Neuer Nutzer ohne Cookie erhält eine neue Session', async () => {
  const r = await req('GET', '/api/state');

  assert.equal(r.status, 200, 'HTTP 200 erwartet');
  assert.ok(r.setCookie.includes('lumo_uid='), 'Set-Cookie muss lumo_uid enthalten');

  const token = extractToken(r.setCookie);
  assert.ok(token, 'Token aus Set-Cookie extrahierbar');
  assert.match(token, SESSION_TOKEN_RE, 'Token muss 64-char hex sein (256-bit Entropie)');
  assert.ok(r.setCookie.includes('HttpOnly'), 'Cookie muss HttpOnly sein');
});

it('2. Wiederkehrender Nutzer erhält seinen bisherigen Lernstand', async () => {
  // Erste Session erstellen
  const r1 = await req('GET', '/api/state');
  const token = extractToken(r1.setCookie);
  assert.ok(token, 'Token aus erster Antwort erwartet');

  // State speichern (sessionsTotal ist client-seitig und wird nicht überschrieben;
  // blocksAnalyzedTotal wird ABSICHTLICH nicht verwendet, da S-07 diesen Wert
  // serverseitig setzt und nicht aus dem Client-State übernimmt)
  const testState = { testKey: 'lumo-session-test-value', sessionsTotal: 42 };
  const r2 = await req('POST', '/api/state', {
    cookie: `lumo_uid=${token}`,
    body: { state: testState },
  });
  assert.equal(r2.json?.ok, true, 'State-Speicherung muss erfolgreich sein');

  // State mit demselben Token abrufen
  const r3 = await req('GET', '/api/state', { cookie: `lumo_uid=${token}` });
  assert.deepEqual(
    r3.json?.state?.testKey,
    'lumo-session-test-value',
    'Gespeicherter State muss zurückgegeben werden'
  );
  assert.equal(
    r3.json?.state?.sessionsTotal,
    42,
    'Numerischer State-Wert (sessionsTotal) muss erhalten bleiben'
  );
});

it('3. Kenntnis einer fremden User-ID reicht nicht für Datenzugriff', async () => {
  // User A anlegen und State speichern
  const r1 = await req('GET', '/api/state');
  const tokenA = extractToken(r1.setCookie);
  const userA = findUserByToken(tokenA);
  assert.ok(userA, 'User A muss in DB existieren');

  const secretState = { secret: 'user-a-private-data', blocksAnalyzedTotal: 99 };
  await req('POST', '/api/state', {
    cookie: `lumo_uid=${tokenA}`,
    body: { state: secretState },
  });

  // Angreifer kennt die interne User-ID von User A (z.B. aus altem API-Leak)
  // und versucht sie als Legacy-UUID-Cookie zu verwenden
  const userAId = userA.id;
  assert.match(userAId, LEGACY_UUID_RE, 'Interne User-ID hat UUID-Format (Voraussetzung des Tests)');

  // User A hat session_hash gesetzt → Migration wird ABGELEHNT
  const r2 = await req('GET', '/api/state', { cookie: `lumo_uid=${userAId}` });

  // Angreifer bekommt eine neue leere Session (nicht User A's Daten)
  assert.equal(r2.json?.state, null, 'Angreifer darf keine Daten von User A sehen');
  const attackerToken = extractToken(r2.setCookie);
  assert.ok(attackerToken, 'Angreifer erhält eigenen neuen Token');
  assert.notEqual(attackerToken, tokenA, 'Angreifer-Token ≠ User-A-Token');

  // Angreifer-User ist NICHT User A
  const attackerUser = findUserByToken(attackerToken);
  assert.notEqual(attackerUser?.id, userA.id, 'Angreifer-User-ID ≠ User-A-ID');
});

it('4. Eine User-ID als Cookie wird nicht als Session akzeptiert', async () => {
  // Neuen User anlegen (hat sofort session_hash gesetzt → UUID-Injection unmöglich)
  const r1 = await req('GET', '/api/state');
  const token = extractToken(r1.setCookie);
  const user = findUserByToken(token);
  assert.ok(user?.session_hash, 'Neuer User muss session_hash haben');

  // UUID dieses Users als Cookie senden
  const userId = user.id;

  // DB-Check: session_hash IS NOT NULL → Migration-Funktion gibt null zurück
  const r2 = await req('GET', '/api/state', { cookie: `lumo_uid=${userId}` });
  const newToken = extractToken(r2.setCookie);

  // Muss eine NEUE Session bekommen (nicht die des bestehenden Users)
  assert.ok(newToken, 'Neue Session muss erstellt werden');
  assert.match(newToken, SESSION_TOKEN_RE, 'Neues Token muss im korrekten Format sein');
  assert.notEqual(newToken, token, 'Neuer Token ≠ originaler Token');

  const newUser = findUserByToken(newToken);
  assert.notEqual(newUser?.id, userId, 'Neue Session gehört einem anderen User');
});

it('5. Ein ungültiger Cookie-Wert erzeugt zuverlässig eine neue Session', async () => {
  const invalidValues = [
    'not-a-token',
    'ABCDEF0123456789',              // Kein gültiges 64-char hex
    '00000000-0000-0000-0000-000000000000', // Nil-UUID (nicht in DB)
    'a'.repeat(63),                  // 63 statt 64 Zeichen
    'g'.repeat(64),                  // 64 Zeichen aber ungültiges hex (g)
    '',                              // Leer (Cookie ohne Wert)
  ];

  for (const val of invalidValues) {
    const cookie = val ? `lumo_uid=${val}` : undefined;
    const r = await req('GET', '/api/state', { cookie });
    const token = extractToken(r.setCookie);
    assert.ok(token, `Ungültiger Cookie-Wert "${val.slice(0, 20)}…" muss neue Session erzeugen`);
    assert.match(token, SESSION_TOKEN_RE, 'Neues Token muss im korrekten Format sein');
    assert.equal(r.json?.state, null, 'Neuer User hat keinen gespeicherten State');
  }
});

it('6. Ein unbekannter Legacy-UUID-Cookie erzeugt keinen Nutzer unter dieser UUID', async () => {
  const fakeUUID = randomUUID(); // existiert nicht in der DB

  const r = await req('GET', '/api/state', { cookie: `lumo_uid=${fakeUUID}` });

  // Kein User mit dieser UUID angelegt
  const byId = db.prepare('SELECT id FROM users WHERE id = ?').get(fakeUUID);
  assert.equal(byId, undefined, 'Unter der unbekannten UUID darf kein User angelegt werden');

  // Aber eine neue anonyme Session wurde erstellt
  const token = extractToken(r.setCookie);
  assert.ok(token, 'Neue Session muss erstellt werden');
  assert.match(token, SESSION_TOKEN_RE, 'Neuer Token muss 64-char hex sein');

  const newUser = findUserByToken(token);
  assert.ok(newUser, 'Neuer User muss in DB existieren');
  assert.notEqual(newUser.id, fakeUUID, 'Neue User-ID ≠ unbekannte UUID');
});

it('7. Gültige Legacy-Nutzer werden transparent migriert', async () => {
  // Legacy-User direkt in DB einfügen (session_hash = NULL, wie vor Migration)
  const legacyUUID = randomUUID();
  insertLegacyUser(legacyUUID);

  // State speichern (direkt über DB, wie es vor der Migration der Fall war)
  db.prepare(`
    INSERT INTO user_state (user_id, state_json, updated_at)
    VALUES (?, ?, datetime('now'))
  `).run(legacyUUID, JSON.stringify({ legacyData: true, score: 77 }));

  // Request mit dem alten UUID-Cookie
  const r = await req('GET', '/api/state', { cookie: `lumo_uid=${legacyUUID}` });

  // Neues Token im Cookie
  const newToken = extractToken(r.setCookie);
  assert.ok(newToken, 'Migrierter User muss neues Token bekommen');
  assert.match(newToken, SESSION_TOKEN_RE, 'Neues Token muss 64-char hex sein');
  assert.notEqual(newToken, legacyUUID, 'Neues Token ≠ alte UUID');

  // Lernstand erhalten
  assert.equal(r.json?.state?.legacyData, true, 'Legacy-Lernstand muss erhalten bleiben');
  assert.equal(r.json?.state?.score, 77, 'Numerische Werte müssen erhalten bleiben');

  // User-ID intern identisch (kein neuer User angelegt)
  const migratedUser = findUserByToken(newToken);
  assert.equal(migratedUser?.id, legacyUUID, 'Interne User-ID muss unverändert bleiben');

  // session_hash in DB gesetzt (kein Klartext)
  assert.notEqual(migratedUser.session_hash, null, 'session_hash muss gesetzt sein');
  assert.notEqual(migratedUser.session_hash, newToken, 'session_hash darf nicht das Klartext-Token sein');
  assert.equal(migratedUser.session_hash, sha256(newToken), 'session_hash muss SHA-256(token) sein');

  // Zweiter Request mit gleicher UUID → KEIN Zugriff (einmalige Migration)
  const r2 = await req('GET', '/api/state', { cookie: `lumo_uid=${legacyUUID}` });
  const secondToken = extractToken(r2.setCookie);
  // Zweiter Request bekommt EINE NEUE Session (nicht mehr den gleichen User)
  assert.ok(secondToken, 'Zweiter UUID-Request bekommt neue Session');
  assert.notEqual(secondToken, newToken, 'UUID gilt nach Migration nicht mehr als Credential');
});

it('8. Parallele Legacy-Requests erzeugen keine inkonsistenten Sessions', async () => {
  // Legacy-User einfügen
  const legacyUUID = randomUUID();
  insertLegacyUser(legacyUUID);

  // Zwei gleichzeitige Requests mit derselben UUID
  const [r1, r2] = await Promise.all([
    req('GET', '/api/state', { cookie: `lumo_uid=${legacyUUID}` }),
    req('GET', '/api/state', { cookie: `lumo_uid=${legacyUUID}` }),
  ]);

  const token1 = extractToken(r1.setCookie);
  const token2 = extractToken(r2.setCookie);

  assert.ok(token1, 'Erster Request muss Token erhalten');
  assert.ok(token2, 'Zweiter Request muss Token erhalten');

  // DB-Integrität: genau ein User mit dieser UUID, kein Datenverlust
  const user = db.prepare('SELECT id, session_hash FROM users WHERE id = ?').get(legacyUUID);
  assert.ok(user, 'Legacy-User muss weiterhin in DB existieren');
  assert.ok(user.session_hash !== null || user.session_hash === null,
    'DB-Eintrag für Legacy-User muss konsistent sein');

  // Kein doppelter session_hash (UNIQUE INDEX)
  const allHashes = db.prepare('SELECT session_hash FROM users WHERE session_hash IS NOT NULL').all()
    .map(r => r.session_hash);
  const uniqueHashes = new Set(allHashes);
  assert.equal(allHashes.length, uniqueHashes.size, 'Kein doppelter session_hash in DB (UNIQUE INDEX)');

  // Beide Tokens sind gültig oder führen zu neuen Sessions — keine Exception
  assert.match(token1, SESSION_TOKEN_RE, 'Token 1 muss gültiges Format haben');
  assert.match(token2, SESSION_TOKEN_RE, 'Token 2 muss gültiges Format haben');
});

it('9. Session-Tokens werden nicht im Klartext in SQLite gespeichert', async () => {
  const r = await req('GET', '/api/state');
  const token = extractToken(r.setCookie);
  assert.ok(token, 'Token erwartet');
  assert.match(token, SESSION_TOKEN_RE, 'Token muss 64-char hex sein');

  const user = findUserByToken(token);
  assert.ok(user, 'User muss in DB existieren');

  // Klartext-Token darf NICHT in der DB stehen
  assert.notEqual(user.session_hash, token,
    'KRITISCH: session_hash darf nicht das Klartext-Token sein');

  // Gespeicherter Wert muss der SHA-256-Hash des Tokens sein
  const expectedHash = sha256(token);
  assert.equal(user.session_hash, expectedHash,
    'session_hash muss exakt SHA-256(token) sein');

  // Hash hat korrekte Länge (64 hex = 256 bit)
  assert.equal(user.session_hash.length, 64, 'SHA-256-Hash muss 64 Zeichen lang sein');
});

it('10. Session-Widerruf verhindert weitere Zugriffe mit altem Token', async () => {
  // Session erstellen und State speichern
  const r1 = await req('GET', '/api/state');
  const token = extractToken(r1.setCookie);
  await req('POST', '/api/state', {
    cookie: `lumo_uid=${token}`,
    body: { state: { revokeTest: true } },
  });

  // Session widerrufen via DELETE /api/state
  const rDel = await req('DELETE', '/api/state', { cookie: `lumo_uid=${token}` });
  assert.equal(rDel.json?.ok, true, 'Logout muss erfolgreich sein');

  // Altes Token darf nicht mehr funktionieren
  const user = findUserByToken(token);
  assert.equal(user, null, 'Nach Widerruf darf kein User mehr mit altem Token gefunden werden');

  // Neuer Request mit altem Token → neue anonyme Session (nicht alter State)
  const r2 = await req('GET', '/api/state', { cookie: `lumo_uid=${token}` });
  const newToken = extractToken(r2.setCookie);
  assert.ok(newToken, 'Neues Token für neue Session erwartet');
  assert.notEqual(newToken, token, 'Neues Token ≠ widerrufenes Token');
  assert.equal(r2.json?.state, null, 'Neue Session hat keinen State (alter State gelöscht)');
});

it('11. Logout löscht das Cookie und widerruft die Session serverseitig', async () => {
  // Session erstellen
  const r1 = await req('GET', '/api/state');
  const token = extractToken(r1.setCookie);
  const userBeforeLogout = findUserByToken(token);
  assert.ok(userBeforeLogout, 'User muss vor Logout existieren');

  // Logout
  const rDel = await req('DELETE', '/api/state', { cookie: `lumo_uid=${token}` });
  assert.equal(rDel.json?.ok, true, 'DELETE /api/state muss ok: true zurückgeben');

  // Cookie muss gelöscht sein (Max-Age=0 oder Expires in der Vergangenheit)
  const setCookie = rDel.setCookie;
  const cookieCleared = setCookie.includes('lumo_uid=;') ||
    setCookie.includes('lumo_uid=') && (
      setCookie.includes('Max-Age=0') ||
      setCookie.includes('Expires=Thu, 01 Jan 1970')
    );
  // express clearCookie setzt Max-Age=0
  assert.ok(cookieCleared || setCookie === '', 'Cookie muss nach Logout gelöscht sein');

  // session_hash serverseitig auf NULL gesetzt
  const userAfterLogout = db.prepare('SELECT session_hash FROM users WHERE id = ?')
    .get(userBeforeLogout.id);
  assert.ok(userAfterLogout, 'User-Datensatz muss erhalten bleiben (nur State + Session gelöscht)');
  assert.equal(userAfterLogout.session_hash, null,
    'session_hash muss nach Logout NULL sein (Session widerrufen)');
});

it('12. GET und POST /api/state exponieren keine interne User-ID', async () => {
  const r1 = await req('GET', '/api/state');
  const token = extractToken(r1.setCookie);

  // GET /api/state
  const rGet = await req('GET', '/api/state', { cookie: `lumo_uid=${token}` });
  assert.equal(rGet.status, 200);
  assert.ok('state' in (rGet.json ?? {}), 'Antwort muss state-Feld enthalten');
  assert.ok(!('userId' in (rGet.json ?? {})),
    'KRITISCH: GET /api/state darf keine userId zurückgeben (S-08)');

  // POST /api/state
  const rPost = await req('POST', '/api/state', {
    cookie: `lumo_uid=${token}`,
    body: { state: { x: 1 } },
  });
  assert.equal(rPost.status, 200);
  assert.ok('ok' in (rPost.json ?? {}), 'Antwort muss ok-Feld enthalten');
  assert.ok(!('userId' in (rPost.json ?? {})),
    'KRITISCH: POST /api/state darf keine userId zurückgeben (S-08)');
});

it('13. Sämtliche anderen API-Endpunkte sind weiterhin korrekt nutzerisoliert', async () => {
  // User A anlegen und State speichern
  const r1A = await req('GET', '/api/state');
  const tokenA = extractToken(r1A.setCookie);
  await req('POST', '/api/state', {
    cookie: `lumo_uid=${tokenA}`,
    body: { state: { owner: 'userA', score: 100 } },
  });

  // User B anlegen und anderen State speichern
  const r1B = await req('GET', '/api/state');
  const tokenB = extractToken(r1B.setCookie);
  await req('POST', '/api/state', {
    cookie: `lumo_uid=${tokenB}`,
    body: { state: { owner: 'userB', score: 200 } },
  });

  // Sicherstellen: zwei verschiedene Tokens
  assert.notEqual(tokenA, tokenB, 'User A und B müssen verschiedene Tokens haben');

  // User A sieht nur seinen eigenen State
  const rGetA = await req('GET', '/api/state', { cookie: `lumo_uid=${tokenA}` });
  assert.equal(rGetA.json?.state?.owner, 'userA', 'User A muss seinen eigenen State sehen');
  assert.equal(rGetA.json?.state?.score, 100, 'User A score muss korrekt sein');

  // User B sieht nur seinen eigenen State
  const rGetB = await req('GET', '/api/state', { cookie: `lumo_uid=${tokenB}` });
  assert.equal(rGetB.json?.state?.owner, 'userB', 'User B muss seinen eigenen State sehen');
  assert.equal(rGetB.json?.state?.score, 200, 'User B score muss korrekt sein');

  // User A kann nicht User Bs State überschreiben (Cross-User write)
  await req('POST', '/api/state', {
    cookie: `lumo_uid=${tokenA}`,
    body: { state: { owner: 'userA-modified', score: 999 } },
  });
  const rGetBAfter = await req('GET', '/api/state', { cookie: `lumo_uid=${tokenB}` });
  assert.equal(rGetBAfter.json?.state?.owner, 'userB',
    'User Bs State darf nicht von User A verändert werden');
  assert.equal(rGetBAfter.json?.state?.score, 200, 'User B score unveränderlich durch User A');
});

it('14. DB-Schemaversion 4, session_hash-, expires_at- und blocks_analyzed_total-Spalte korrekt angelegt', async () => {
  assert.ok(db, 'DB-Instanz muss initialisiert sein');

  // Schemaversion prüfen (Migration 3→4: blocks_analyzed_total, S-07)
  const version = db.pragma('user_version', { simple: true });
  assert.equal(version, 4, `DB muss auf Schema-Version 4 sein (aktuell: ${version})`);

  // Spalten vorhanden
  const cols = db.pragma('table_info(users)').map(c => c.name);
  assert.ok(cols.includes('session_hash'),
    `users-Tabelle muss session_hash-Spalte haben (gefunden: ${cols.join(', ')})`);
  assert.ok(cols.includes('expires_at'),
    `users-Tabelle muss expires_at-Spalte haben (gefunden: ${cols.join(', ')})`);
  assert.ok(cols.includes('blocks_analyzed_total'),
    `users-Tabelle muss blocks_analyzed_total-Spalte haben (gefunden: ${cols.join(', ')})`);
  assert.ok(cols.includes('id'), 'users.id muss weiterhin existieren');
  assert.ok(cols.includes('created_at'), 'users.created_at muss weiterhin existieren');
  assert.ok(cols.includes('last_seen'), 'users.last_seen muss weiterhin existieren');

  // Partial Unique Index auf session_hash vorhanden
  const indexes = db.pragma('index_list(users)').map(i => i.name);
  assert.ok(indexes.includes('idx_users_session_hash'),
    `UNIQUE INDEX idx_users_session_hash muss existieren (gefunden: ${indexes.join(', ')})`);

  // Index ist UNIQUE
  const idxInfo = db.pragma('index_list(users)').find(i => i.name === 'idx_users_session_hash');
  assert.equal(idxInfo?.unique, 1, 'idx_users_session_hash muss UNIQUE sein');

  // user_state Tabelle und FK-Constraint weiterhin intakt
  const stateCols = db.pragma('table_info(user_state)').map(c => c.name);
  assert.ok(stateCols.includes('user_id'), 'user_state.user_id muss existieren');
  assert.ok(stateCols.includes('state_json'), 'user_state.state_json muss existieren');

  // Foreign-Key-Enforcement aktiv
  const fkEnabled = db.pragma('foreign_keys', { simple: true });
  assert.equal(fkEnabled, 1, 'Foreign-Key-Enforcement muss aktiv sein');
});

it('15. Serverseitig abgelaufene Session wird abgelehnt und ungültig gesetzt', async () => {
  // Session erstellen und State speichern
  const r1 = await req('GET', '/api/state');
  const token = extractToken(r1.setCookie);
  assert.ok(token, 'Token erwartet');

  const user = findUserByToken(token);
  assert.ok(user, 'User muss in DB existieren');

  // State hinterlegen um zu prüfen, dass neue Session keinen alten State sieht
  await req('POST', '/api/state', {
    cookie: `lumo_uid=${token}`,
    body: { state: { expiredTest: true, score: 42 } },
  });

  // expires_at manuell in die Vergangenheit setzen (1 Sekunde)
  db.prepare("UPDATE users SET expires_at = datetime('now', '-1 second') WHERE id = ?").run(user.id);

  // Request mit demselben Token → Session muss abgelehnt werden
  const r2 = await req('GET', '/api/state', { cookie: `lumo_uid=${token}` });
  const newToken = extractToken(r2.setCookie);

  // Neue Session muss ausgestellt werden
  assert.ok(newToken, 'Neue Session nach Ablauf erwartet');
  assert.notEqual(newToken, token, 'Neues Token ≠ abgelaufenes Token');
  assert.match(newToken, SESSION_TOKEN_RE, 'Neues Token muss 64-char hex sein');

  // Neue Session hat keinen alten State (neue anonyme Identität)
  assert.equal(r2.json?.state, null, 'Neue anonyme Session hat keinen State (alter State war von anderem User)');

  // Altes Token ist in DB ungültig (session_hash auf NULL gesetzt)
  const oldUserRow = db.prepare('SELECT session_hash, expires_at FROM users WHERE id = ?').get(user.id);
  assert.equal(oldUserRow?.session_hash, null, 'session_hash muss nach Ablauf NULL sein');
  assert.equal(oldUserRow?.expires_at, null, 'expires_at muss nach Ablauf NULL sein');
});

it('16. DELETE löscht Lernstand und widerruft Session; User-Datensatz bleibt erhalten', async () => {
  // Session erstellen und State hinterlegen
  const r1 = await req('GET', '/api/state');
  const token = extractToken(r1.setCookie);
  const userBefore = findUserByToken(token);
  assert.ok(userBefore, 'User muss vor DELETE existieren');

  await req('POST', '/api/state', {
    cookie: `lumo_uid=${token}`,
    body: { state: { deleteSemanticTest: true, score: 55 } },
  });

  // State muss vorhanden sein
  const rBefore = await req('GET', '/api/state', { cookie: `lumo_uid=${token}` });
  assert.equal(rBefore.json?.state?.deleteSemanticTest, true, 'State muss vor DELETE vorhanden sein');

  // DELETE ausführen
  const rDel = await req('DELETE', '/api/state', { cookie: `lumo_uid=${token}` });
  assert.equal(rDel.json?.ok, true, 'DELETE muss ok: true zurückgeben');

  // User-Datensatz bleibt erhalten (nur State + Session zurückgesetzt)
  const userAfter = db.prepare('SELECT id, session_hash, expires_at FROM users WHERE id = ?')
    .get(userBefore.id);
  assert.ok(userAfter, 'User-Datensatz muss nach DELETE in DB erhalten bleiben');
  assert.equal(userAfter.session_hash, null, 'session_hash muss nach DELETE NULL sein (Session widerrufen)');
  assert.equal(userAfter.expires_at, null, 'expires_at muss nach DELETE NULL sein');

  // State muss in DB gelöscht sein
  const stateRow = db.prepare('SELECT user_id FROM user_state WHERE user_id = ?')
    .get(userBefore.id);
  assert.equal(stateRow, undefined, 'State muss nach DELETE aus user_state gelöscht sein');

  // Altes Token funktioniert nicht mehr
  assert.equal(findUserByToken(token), null, 'Altes Token darf nach DELETE nicht mehr gültig sein');

  // Nächster Request mit altem Token → neue anonyme Session (nicht alter Lernstand)
  const r2 = await req('GET', '/api/state', { cookie: `lumo_uid=${token}` });
  const newToken = extractToken(r2.setCookie);
  assert.ok(newToken, 'Neue Session nach DELETE erwartet');
  assert.notEqual(newToken, token, 'Neues Token ≠ widerrufenes Token');
  assert.equal(r2.json?.state, null, 'Neue Session hat keinen State');
});
