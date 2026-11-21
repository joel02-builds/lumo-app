/**
 * Client-Fehler an das eigene Server-Log melden (F016)
 * ─────────────────────────────────────────────────────────────────────────────
 * Warum: Fehler im Browser sah bisher nur der Nutzer in der Konsole. Jetzt landet je
 * Fehler eine kurze Zeile im Server-Log (POST /api/client-error).
 *
 * Datenschutz: gesendet werden NUR Typ, Screen-Name und eine gekürzte Meldung. Kein Stack,
 * keine Nutzerinhalte (Text in Anführungszeichen, E-Mail-Adressen und URLs werden vorher
 * entfernt), keine Cookies (credentials: 'omit'), keine Kennung. Pro Seitenaufruf höchstens
 * 5 Meldungen, gleiche Meldung nur einmal – ein Fehler in einer Schleife flutet das Log nicht.
 * Schlägt das Melden selbst fehl, passiert nichts (kein Folgefehler, keine Anzeige).
 */

const MAX_REPORTS_PER_PAGE = 5;
const MAX_MESSAGE = 200;
const SCREEN_RE = /^[a-z][a-z0-9-]{0,39}$/;

let sent = 0;
let screenName = 'unknown';
let installed = false;
const seen = new Set();

/** Aktuellen Screen-Namen merken (App.jsx ruft das bei jedem Screen-Wechsel auf). */
export function setReportScreen(name) {
  screenName = typeof name === 'string' && SCREEN_RE.test(name) ? name : 'unknown';
}

/** Gleiche Regeln wie serverseitig (server/clientError.js). */
export function scrubMessage(text) {
  return String(text)
    .replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g, ' ')
    .replace(/(^|[^\w])("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g, '$1…')
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, '…')
    .replace(/\bhttps?:\/\/\S+/gi, '…')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_MESSAGE);
}

/**
 * @param {'boundary'|'error'|'unhandledrejection'} type
 * @param {unknown} error  Error-Objekt, String oder irgendetwas anderes
 */
export function reportClientError(type, error) {
  try {
    if (sent >= MAX_REPORTS_PER_PAGE) return;
    const raw = error && typeof error === 'object' && 'message' in error ? error.message : error;
    const message = scrubMessage(raw ?? '');
    if (!message) return;
    const key = `${type}|${screenName}|${message}`;
    if (seen.has(key)) return;
    seen.add(key);
    sent++;
    const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) || '';
    fetch(`${base}/api/client-error`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, screen: screenName, message }),
      credentials: 'omit',
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* Melden darf nie selbst einen Fehler auslösen */
  }
}

/** window.onerror und unhandledrejection einmalig anschließen. */
export function installGlobalErrorHandlers() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  window.addEventListener('error', (e) => reportClientError('error', e.error ?? e.message));
  window.addEventListener('unhandledrejection', (e) => reportClientError('unhandledrejection', e.reason));
}

/** Nur für Tests: Zähler und Merkliste zurücksetzen. */
export function __resetReportStateForTesting() {
  sent = 0;
  seen.clear();
  screenName = 'unknown';
  installed = false;
}
