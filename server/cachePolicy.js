/**
 * Cache-Control für die ausgelieferte Seite (Produktion)
 * ─────────────────────────────────────────────────────────────────────────────
 * - Dateien unter /assets/ haben einen Content-Hash im Namen (Vite: name-HASH.ext, Hash 8 Zeichen aus
 *   A–Z a–z 0–9 _ -). Unter demselben Namen ändert sich der Inhalt nie → ein Jahr, immutable.
 * - index.html, sw.js, manifest.json (und registerSW.js, falls vorhanden) müssen bei jedem Gebrauch beim
 *   Server nachgefragt werden (no-cache = speichern erlaubt, aber vor jeder Nutzung per ETag prüfen), sonst
 *   sehen Browser neue Versionen (PWA-Update-Banner, neue Chunk-Namen) nicht.
 * - Alles andere: unverändert (Express-Standard).
 *
 * Komprimierung ist hier bewusst nicht Thema.
 */
export const IMMUTABLE_CACHE = 'public, max-age=31536000, immutable';
export const REVALIDATE_CACHE = 'no-cache';

const HASHED_ASSET = /^\/assets\/[^/]+-[A-Za-z0-9_-]{8}\.[A-Za-z0-9]+$/;
const ALWAYS_REVALIDATE = new Set(['/index.html', '/sw.js', '/manifest.json', '/registerSW.js']);

/** @param {unknown} urlPath URL-Pfad ab der Wurzel, z. B. "/assets/index-O1NtWmUS.js" @returns {string|null} null = nichts setzen */
export function cacheControlFor(urlPath) {
  if (typeof urlPath !== 'string') return null;
  if (HASHED_ASSET.test(urlPath)) return IMMUTABLE_CACHE;
  if (ALWAYS_REVALIDATE.has(urlPath)) return REVALIDATE_CACHE;
  return null;
}
