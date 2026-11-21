/**
 * Nicht mehr ladbare Code-Chunks nach einem Deploy (lazy-Screens)
 * ─────────────────────────────────────────────────────────────────────────────
 * Problem: Ein offener Tab kennt nur die Dateinamen der alten Version (index-ABC.js lädt
 * später z. B. LegalScreen-XYZ.js nach). Nach einem Deploy gibt es diese Datei nicht mehr →
 * "Failed to fetch dynamically imported module". Das fing der ErrorBoundary zwar ab (kein
 * leerer Bildschirm), zeigte aber "Etwas ist schiefgelaufen" – für etwas, das kein Fehler
 * der App ist.
 *
 * Jetzt: Chunk-Ladefehler werden erkannt. Der Tab lädt EINMAL selbst neu (der Stand liegt
 * synchron in localStorage, es geht nichts verloren); passiert es innerhalb einer Minute
 * noch einmal, lädt er nicht erneut (keine Endlosschleife), sondern zeigt "Neue Version,
 * bitte neu laden".
 */

// Chrome/Edge, Firefox, Safari, Webpack-Stil. Bewusst nur die Meldungstexte der Ladefehler.
const CHUNK_ERROR_RE = /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Loading chunk [\w-]+ failed|ChunkLoadError|Unable to preload CSS/i;

export const RELOAD_FLAG_KEY = 'lumo_chunk_reload_at';
export const RELOAD_COOLDOWN_MS = 60 * 1000;

/** Ist `err` ein Fehler beim Nachladen eines Code-Chunks? */
export function isChunkLoadError(err) {
  if (!err) return false;
  return CHUNK_ERROR_RE.test(`${err.name ?? ''} ${err.message ?? ''}`);
}

/**
 * Darf der Tab jetzt automatisch neu laden? Ja, höchstens einmal pro Minute und Tab
 * (sessionStorage überlebt das Neuladen). Ist der Speicher nicht benutzbar → nein
 * (lieber der Hinweis mit Knopf als eine mögliche Schleife).
 * Merkt sich den Zeitpunkt, wenn sie "ja" sagt.
 */
export function shouldAutoReload({ storage, now = Date.now() } = {}) {
  try {
    const s = storage ?? globalThis.sessionStorage;
    const last = Number(s.getItem(RELOAD_FLAG_KEY));
    if (Number.isFinite(last) && last > 0 && now - last < RELOAD_COOLDOWN_MS) return false;
    s.setItem(RELOAD_FLAG_KEY, String(now));
    return true;
  } catch {
    return false;
  }
}
