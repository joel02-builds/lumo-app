/**
 * Server-State-Sync für Lumo
 * ────────────────────────────────────────────────────────────────────────────
 * Synchronisiert den App-State mit dem Server (SQLite via Cookie-basierte
 * anonyme User-ID). Funktioniert als zusätzlicher Layer über IndexedDB/localStorage.
 *
 * Strategie: "Local First, Server Second"
 * ─────────────────────────────────────────
 * 1. App startet sofort aus IndexedDB (< 5ms, keine Netzwerklatenz)
 * 2. Server-State wird async geladen und mit lokalem State gemergt
 * 3. Der neuere/vollständigere State gewinnt (timestamp-basiert)
 * 4. Änderungen werden debounced zum Server gespeichert
 *
 * Warum nicht nur Server?
 * ────────────────────────
 * ADHS-Nutzer haben schlechte Internetz-Toleranz (Barkley 2011: geringe
 * Frustrationstoleranz). Offline-First ist nicht optional.
 *
 * Datenschutz:
 * ─────────────
 * • user_id = anonymer UUID (Cookie, kein Auth nötig)
 * • Kein Material/Text wird gespeichert (nur analysierter State)
 * • DSGVO-konform: kein personenbezogenes Datum
 */

const SYNC_DEBOUNCE_MS = 2000; // 2s debounce — nicht bei jedem Keystroke speichern
const BASE_URL = import.meta.env.VITE_API_URL || '';

let syncTimer = null;
let lastSyncedAt = null;

// ─── Server-Kommunikation ─────────────────────────────────────────────────

async function fetchWithCookies(path, options = {}) {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      credentials: 'include', // Cookie bei jedem Request mitsenden
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null; // Netzwerkfehler = stillschweigend ignorieren
  }
}

/**
 * Lädt den Server-State für diesen User.
 * Gibt { state, userId } oder null bei Fehler/Offline zurück.
 */
export async function loadServerState() {
  const result = await fetchWithCookies('/api/state');
  return result;
}

/**
 * Speichert den State zum Server (debounced).
 * Wird bei jedem State-Update aufgerufen.
 */
export function scheduleSyncToServer(state) {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(async () => {
    await syncToServer(state);
  }, SYNC_DEBOUNCE_MS);
}

export async function syncToServer(state) {
  // Materialdaten nicht senden (zu groß)
  const { fileBase64, materialText, ...syncState } = state;

  const result = await fetchWithCookies('/api/state', {
    method: 'POST',
    body: JSON.stringify({ state: syncState }),
  });

  if (result?.ok) {
    lastSyncedAt = Date.now();
  }
  return result?.ok || false;
}

/**
 * Aktualisiert den Streak nach einer abgeschlossenen Session.
 */
export async function syncStreak() {
  const result = await fetchWithCookies('/api/state/streak', {
    method: 'POST',
  });
  return result?.streak || null;
}

/**
 * Löscht alle Server-Daten (Reset).
 */
export async function deleteServerState() {
  return await fetchWithCookies('/api/state', { method: 'DELETE' });
}

// ─── State-Merge-Logik ────────────────────────────────────────────────────

/**
 * Mergt lokalen und Server-State — neuerer gewinnt.
 * Strategie: Zählt abgeschlossene Blöcke als Fortschritts-Signal.
 *
 * Warum keine pure timestamp-Strategie?
 * → Timestamps können falsch sein (Uhrzeitwechsel, andere Zeitzone).
 * → Fortschritt (Blöcke abgeschlossen) ist robuster.
 */
export function mergeStates(localState, serverState) {
  if (!serverState) return localState;
  if (!localState) return serverState;

  const localProgress = countProgress(localState);
  const serverProgress = countProgress(serverState);

  // Server hat mehr Fortschritt (anderes Gerät) → Server-State bevorzugen
  if (serverProgress > localProgress) {
    console.log('[Sync] Server-State hat mehr Fortschritt — Server gewinnt');
    return serverState;
  }

  // Lokal hat mehr Fortschritt → Lokal-State, aber Server-Streak mergen
  if (localProgress > serverProgress) {
    console.log('[Sync] Lokaler State hat mehr Fortschritt — Lokal gewinnt');
    // Server-Streak-Daten mergen falls vorhanden
    return {
      ...localState,
      streak: mergeStreak(localState.streak, serverState.streak),
    };
  }

  // Gleicher Fortschritt → Lokal bevorzugen (frischer)
  return {
    ...localState,
    streak: mergeStreak(localState.streak, serverState.streak),
  };
}

function countProgress(state) {
  if (!state) return 0;
  let count = 0;
  // Aktiver Block-Fortschritt
  if (Array.isArray(state.blocks)) {
    count += state.blocks.filter(b => b.status === 'completed').length * 10;
    count += state.blocks.filter(b => b.confidence === 'sicher').length * 5;
  }
  // Alle Projekte
  if (Array.isArray(state.projects)) {
    state.projects.forEach(p => {
      if (Array.isArray(p.blocks)) {
        count += p.blocks.filter(b => b.status === 'completed').length * 10;
      }
    });
  }
  // Gesamtzähler
  count += (state.blocksAnalyzedTotal || 0) * 3;
  count += (state.sessionsTotal || 0) * 2;
  return count;
}

function mergeStreak(localStreak, serverStreak) {
  if (!localStreak && !serverStreak) return undefined;
  if (!localStreak) return serverStreak;
  if (!serverStreak) return localStreak;
  // Höherer Streak gewinnt
  return (localStreak.days || 0) >= (serverStreak.days || 0) ? localStreak : serverStreak;
}

export function getLastSyncedAt() {
  return lastSyncedAt;
}
