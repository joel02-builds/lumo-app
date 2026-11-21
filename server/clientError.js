/**
 * Client-Fehler-Meldungen bereinigen (F016)
 * ─────────────────────────────────────────────────────────────────────────────
 * Der Client meldet Fehler (ErrorBoundary, window.onerror, unhandledrejection) an
 * POST /api/client-error. Das ist ein EIGENES, minimales Log ohne Drittanbieter.
 *
 * Datenschutz-Grundsatz: nur Typ, Screen-Name und eine gekürzte technische Meldung.
 * Keine Nutzerinhalte, kein Stack, keine IP, keine Nutzer-Kennung, kein User-Agent.
 * Die Bereinigung ist ein Bestmöglich-Filter, kein Beweis der Inhaltsfreiheit:
 * Fehlermeldungen des Browsers sind technisch, können aber gelegentlich Textstücke
 * zitieren – deshalb wird alles in Anführungszeichen, jede E-Mail-Adresse und jede
 * URL entfernt, und die Meldung ist auf 200 Zeichen begrenzt.
 *
 * Log-Injection: Steuerzeichen (inkl. Zeilenumbrüche, ESC, U+2028/2029) werden zu
 * Leerzeichen; geschrieben wird ein JSON-String in genau EINER Zeile.
 */

export const CLIENT_ERROR_TYPES = ['boundary', 'error', 'unhandledrejection'];
export const MAX_CLIENT_ERROR_MESSAGE = 200;

const SCREEN_RE = /^[a-z][a-z0-9-]{0,39}$/;
const CONTROL_RE = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g;
// Text in "…", '…' oder `…` inkl. maskierter Zeichen. Ein Apostroph direkt nach einem Wort
// (can't) öffnet kein Zitat.
const QUOTED_RE = /(^|[^\w])("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g;
const EMAIL_RE = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
const URL_RE = /\bhttps?:\/\/\S+/gi;

/** Gleiche Regeln wie im Client (src/utils/errorReport.js) – der Server vertraut dem Client nicht. */
export function scrubMessage(text) {
  return String(text)
    .replace(CONTROL_RE, ' ')
    .replace(QUOTED_RE, '$1…')
    .replace(EMAIL_RE, '…')
    .replace(URL_RE, '…')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_CLIENT_ERROR_MESSAGE);
}

/**
 * @param {unknown} body
 * @returns {{ type: string, screen: string, message: string } | null}  null = unbrauchbar
 */
export function sanitizeClientError(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  if (!CLIENT_ERROR_TYPES.includes(body.type)) return null;
  if (typeof body.message !== 'string') return null;
  const message = scrubMessage(body.message);
  if (!message) return null;
  const screen = typeof body.screen === 'string' && SCREEN_RE.test(body.screen) ? body.screen : 'unknown';
  // Nur diese drei Felder werden übernommen – alles andere (stack, …) wird ignoriert.
  return { type: body.type, screen, message };
}
