/**
 * Liegt das DB-Verzeichnis im flüchtigen Temp-Bereich? (F033)
 * ─────────────────────────────────────────────────────────────────────────────
 * Auf Render Free ist das Dateisystem flüchtig. Steht DB_PATH auf /tmp (der Wert, mit dem der
 * Server in Produktion überhaupt startet), gehen alle Server-Stände bei jedem Deploy und Neustart
 * verloren. Der Server warnt dann beim Start deutlich (server/db.js, initDB).
 *
 * Bewusst eng: nur /tmp, /var/tmp und das Temp-Verzeichnis des Systems. Andere flüchtige Orte
 * (z. B. das Projektverzeichnis eines Hosters) erkennt die Prüfung nicht.
 */
import os from 'node:os';

const norm = (p) => String(p).replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
const isUnder = (p, base) => p === base || p.startsWith(base + '/');

/**
 * @param {unknown} dir  das aufgelöste DB-Verzeichnis
 * @param {{ tmpdir?: string }} [opts]  tmpdir nur für Tests überschreibbar
 */
export function isVolatileDbDir(dir, { tmpdir = os.tmpdir() } = {}) {
  if (typeof dir !== 'string' || dir.trim() === '') return false;
  const d = norm(dir);
  if (isUnder(d, '/tmp') || isUnder(d, '/var/tmp')) return true;
  const t = tmpdir ? norm(tmpdir) : '';
  return t !== '' && isUnder(d, t);
}

export const VOLATILE_DB_WARNING =
  '[DB] WARNUNG: DB_PATH ist flüchtig, Server-Daten gehen bei Deploy/Neustart verloren. ' +
  'Persistent Disk mounten und DB_PATH darauf setzen (docs/RENDER-PERSISTENCE.md).';
