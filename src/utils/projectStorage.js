/**
 * projectStorage.js — Re-Export-Layer für Rückwärtskompatibilität
 *
 * Alle Aufrufe in der App, die `loadProject`, `saveProject`, `clearProject`
 * importieren, funktionieren weiterhin identisch. Intern wird jetzt aber
 * das neue storage.js verwendet (IndexedDB primary + localStorage Fallback).
 *
 * NEU verfügbare Exporte für schrittweise Migration:
 *   loadProjectAsync  — IDB-first, Promise
 *   saveProjectAsync  — speichert in IDB + localStorage
 *   clearProjectAsync — löscht beide Layer
 *   exportAllData     — JSON-Backup-Download
 *   importFromFile    — JSON-Backup importieren
 *   getStorageStatus  — { layer, persisted, usageBytes, quotaBytes }
 *   requestPersistentStorage — navigator.storage.persist() einmalig
 */

export {
  loadProjectSync    as loadProject,
  saveProjectSync    as saveProject,
  clearProject,
  loadProjectAsync,
  saveProjectAsync,
  clearProjectAsync,
  exportAllData,
  importFromFile,
  getStorageStatus,
  requestPersistentStorage,
} from './storage.js';
