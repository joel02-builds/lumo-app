/**
 * Lumo Persistent Storage — IndexedDB-first, localStorage-Fallback
 *
 * Architektur:
 * ─────────────────────────────────────────────────────────────────
 * Primärer Layer: IndexedDB (haltbar, 50-80% Disk, nicht vom 7-Tage-Timer
 *                 betroffen, kann mit storage.persist() geschützt werden)
 * Fallback-Layer: localStorage (5MB, 7-Tage-Safari-Regel, Sync)
 *
 * Beim ersten Load: wenn IndexedDB leer, Migration aus localStorage
 * Bei jedem Save:   zuerst IDB, dann localStorage als Sicherheitskopie
 *
 * Eviction-Schutz:
 * navigator.storage.persist() muss einmal aufgerufen werden. Bei Erlaubnis
 * wird der Ursprung gegen automatische Eviction geschützt.
 *
 * Daten-Schema: lumo_v2 (IDB) / lumo_project (localStorage legacy)
 */

const IDB_NAME = 'lumo_db';
const IDB_VERSION = 1;
const IDB_STORE = 'state';
const IDB_KEY = 'lumo_v2';
const LS_KEY = 'lumo_project';
const LS_PERSIST_FLAG = 'lumo_persist_requested';

// ─── IndexedDB Grundoperationen ───────────────────────────────────────────

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function idbGet(key) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(key);
      req.onsuccess = (e) => resolve(e.target.result ?? null);
      req.onerror = (e) => reject(e.target.error);
    });
  } catch {
    return null;
  }
}

async function idbSet(key, value) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const req = tx.objectStore(IDB_STORE).put(value, key);
      req.onsuccess = () => resolve(true);
      req.onerror = (e) => reject(e.target.error);
    });
  } catch {
    return false;
  }
}

async function idbDelete(key) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const req = tx.objectStore(IDB_STORE).delete(key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

// ─── Storage-Persist-Request ──────────────────────────────────────────────

/**
 * Fragt einmal den Browser um persistenten Speicher. Bei Erlaubnis werden
 * Daten nicht mehr automatisch evicted. Safari iOS benötigt PWA-Installation.
 *
 * Wird nur einmal pro Gerät aufgerufen (Flag in localStorage).
 */
export async function requestPersistentStorage() {
  if (!navigator.storage?.persist) return false;
  if (typeof localStorage !== 'undefined') {
    try {
      if (localStorage.getItem(LS_PERSIST_FLAG)) return true;
    } catch { /* ignore */ }
  }
  try {
    const granted = await navigator.storage.persist();
    if (granted) {
      try { localStorage.setItem(LS_PERSIST_FLAG, '1'); } catch { /* ignore */ }
    }
    return granted;
  } catch {
    return false;
  }
}

/**
 * Gibt aktuellen Storage-Status zurück:
 * { layer: 'idb'|'localStorage'|'none', persisted: bool, usageBytes, quotaBytes }
 */
export async function getStorageStatus() {
  const status = { layer: 'none', persisted: false, usageBytes: 0, quotaBytes: 0 };
  try {
    if (navigator.storage?.estimate) {
      const est = await navigator.storage.estimate();
      status.usageBytes = est.usage || 0;
      status.quotaBytes = est.quota || 0;
    }
    if (navigator.storage?.persisted) {
      status.persisted = await navigator.storage.persisted();
    }
  } catch { /* ignore */ }

  // Welcher Layer ist aktiv?
  try {
    const idbData = await idbGet(IDB_KEY);
    if (idbData) {
      status.layer = 'idb';
      return status;
    }
  } catch { /* ignore */ }
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem(LS_KEY)) {
      status.layer = 'localStorage';
      return status;
    }
  } catch { /* ignore */ }
  return status;
}

// ─── Migration: localStorage → IndexedDB ─────────────────────────────────

async function migrateFromLocalStorage() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data) return null;
    // Migration: Daten in IDB schreiben
    await idbSet(IDB_KEY, { ...data, _migratedAt: new Date().toISOString() });
    return data;
  } catch {
    return null;
  }
}

// ─── Öffentliche API ───────────────────────────────────────────────────────

/**
 * Lädt den gespeicherten Projektstand.
 * Reihenfolge: IDB → localStorage-Migration → null
 */
export async function loadProjectAsync() {
  // 1. IDB versuchen
  let data = null;
  try {
    data = await idbGet(IDB_KEY);
  } catch { /* IDB nicht verfügbar */ }

  // 2. Wenn IDB leer: aus localStorage migrieren
  if (!data) {
    data = await migrateFromLocalStorage();
  }

  if (!data) return null;

  const hasActiveBlocks = Array.isArray(data.blocks) && data.blocks.length > 0;
  const hasSavedProjects = Array.isArray(data.projects) && data.projects.length > 0;
  if (!hasActiveBlocks && !hasSavedProjects) return null;

  return data;
}

/**
 * Synchroner Load für useReducer-Init (nur localStorage, IDB ist async).
 * Nach dem ersten Render wird loadProjectAsync() aufgerufen und state ggf. aktualisiert.
 */
export function loadProjectSync() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data) return null;
    const hasActiveBlocks = Array.isArray(data.blocks) && data.blocks.length > 0;
    const hasSavedProjects = Array.isArray(data.projects) && data.projects.length > 0;
    if (!hasActiveBlocks && !hasSavedProjects) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Speichert den aktuellen Projektstand in IDB + localStorage.
 * Beide Layer werden beschrieben (defense in depth).
 */
export async function saveProjectAsync(data) {
  // IDB (primär)
  const idbOk = await idbSet(IDB_KEY, data);

  // localStorage (Fallback/Sicherheitskopie)
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch {
    // QuotaExceededError oder privater Modus — ignorieren
  }

  return idbOk;
}

/**
 * Synchroner Save für sofortige localStorage-Konsistenz
 * (wird von App.jsx in useEffect aufgerufen, async Save läuft parallel).
 */
export function saveProjectSync(data) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}

/**
 * Löscht alle Projektdaten aus beiden Layern.
 */
export async function clearProjectAsync() {
  await idbDelete(IDB_KEY);
  try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
  try { localStorage.removeItem(LS_PERSIST_FLAG); } catch { /* ignore */ }
}

// ─── Export / Import ──────────────────────────────────────────────────────

/**
 * Exportiert alle Lumo-Daten als JSON-Datei (Download im Browser).
 * Vollständiges Backup: Projekte, Blöcke, Karteikarten, Streaks, alles.
 */
export async function exportAllData() {
  const data = await idbGet(IDB_KEY) || (() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  })();

  if (!data) throw new Error('Keine Daten zum Exportieren gefunden.');

  // Streak separat hinzufügen
  let streak = null;
  try {
    const raw = localStorage.getItem('lumo_streak');
    if (raw) streak = JSON.parse(raw);
  } catch { /* ignore */ }

  const exportData = {
    _lumoExport: true,
    _version: 2,
    _exportedAt: new Date().toISOString(),
    _appVersion: '1.0',
    projectData: data,
    streak,
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const date = new Date().toISOString().split('T')[0];
  a.download = `lumo-backup-${date}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Importiert eine zuvor exportierte Lumo-Backup-Datei.
 * Gibt den importierten Projekt-Stand zurück (muss in App-State übernommen werden).
 */
export async function importFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const raw = JSON.parse(e.target.result);
        if (!raw._lumoExport) {
          reject(new Error('Keine gültige Lumo-Backup-Datei.'));
          return;
        }
        const data = raw.projectData;
        if (!data) {
          reject(new Error('Backup enthält keine Projektdaten.'));
          return;
        }
        await saveProjectAsync(data);
        if (raw.streak) {
          try { localStorage.setItem('lumo_streak', JSON.stringify(raw.streak)); } catch { /* ignore */ }
        }
        resolve(data);
      } catch (err) {
        reject(new Error('Backup-Datei konnte nicht gelesen werden: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('Datei konnte nicht geöffnet werden.'));
    reader.readAsText(file);
  });
}

// ─── Legacy-Kompatibilität ────────────────────────────────────────────────
// Alte sync-Aufrufe in App.jsx und anderswo bleiben funktionsfähig.
// Neue async-Aufrufe kommen schrittweise hinzu.

export const loadProject = loadProjectSync;
export const saveProject = saveProjectSync;
export function clearProject() {
  try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
  idbDelete(IDB_KEY).catch(() => {});
}
