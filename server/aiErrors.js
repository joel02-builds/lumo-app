/**
 * Fehlerklassen der KI-Aufrufe → passende Nutzermeldung
 * ─────────────────────────────────────────────────────────────────────────────
 * Vorher: Alles außer Timeout und max_tokens wurde zur selben Meldung ("kleines Problem"),
 * und max_tokens hieß "Material zu umfangreich" – obwohl die Ausgabe der Analyse nicht von
 * der Eingabegröße abhängt (sie ist durch den Prompt begrenzt). Ein wirklich zu großes
 * Material (Anthropic antwortet dann mit 400/413) bekam dagegen nur die generische Meldung.
 *
 * Klassen:
 *   input_too_long   Eingabe zu groß (400 "prompt is too long", 413, zu viele PDF-Seiten)
 *   output_too_long  Claude hat zu viel geschrieben (stop_reason max_tokens) – kein Nutzerfehler
 *   overloaded       429 / 529 / rate_limit / overloaded
 *   config           401 / 403 / 404 (Schlüssel, Rechte, Modellname) – Betreiberproblem
 *   timeout          unser 55-s-Timer oder SDK-Timeout
 *   parse            leere oder nicht lesbare Antwort
 *   other            alles andere
 *
 * Die Zuordnung liest nur technische Felder (status, name, Fehlertyp, Meldung der API) –
 * keine Nutzerinhalte.
 */

export const FRIENDLY_ERROR = 'Lumo hat gerade ein kleines Problem. Versuch es gleich nochmal.';
export const TIMEOUT_ERROR = 'Lumo braucht einen Moment länger. Warte kurz oder versuch es nochmal.';
export const INPUT_TOO_LONG_ERROR = 'Das Material ist zu umfangreich. Teile es in kleinere Abschnitte auf.';
export const OUTPUT_TOO_LONG_ERROR = 'Lumo hat zu viel auf einmal geschrieben. Versuch es noch einmal.';
export const OVERLOADED_ERROR = 'Gerade ist viel los. Versuch es in ein paar Sekunden noch einmal.';

// Nur Meldungen, die wirklich "Eingabe zu groß" bedeuten. Andere 400er (z. B. Schemafehler)
// sind KEIN Materialproblem und bleiben generisch.
const INPUT_TOO_LONG_RE = /prompt is too long|too long|too large|maximum of \d+ (pdf )?pages|exceeds? the (maximum|limit)|too many (tokens|pages)|request_too_large/i;
const TIMEOUT_RE = /timeout|timed out/i;

/** Meldungstext der Anthropic-API (aus err.message und dem Fehlerkörper), nur zum Zuordnen. */
function apiText(err) {
  const body = err?.error?.error?.message ?? err?.error?.message ?? '';
  return `${err?.message ?? ''} ${body}`;
}

/** @returns {'input_too_long'|'output_too_long'|'overloaded'|'config'|'timeout'|'parse'|'other'} */
export function classifyAiError(err) {
  if (!err) return 'other';
  if (err.message === 'max_tokens_exceeded') return 'output_too_long';
  if (TIMEOUT_RE.test(err.name || '') || TIMEOUT_RE.test(err.message || '')) return 'timeout';
  if (err.message === 'json_parse_error' || err.message === 'empty_response') return 'parse';

  const status = err.status;
  const type = err?.error?.error?.type ?? err?.error?.type ?? '';
  if (status === 413) return 'input_too_long';
  if (status === 400 && INPUT_TOO_LONG_RE.test(apiText(err))) return 'input_too_long';
  if (status === 429 || status === 529 || type === 'overloaded_error' || type === 'rate_limit_error') return 'overloaded';
  if (status === 401 || status === 403 || status === 404) return 'config';
  return 'other';
}

/**
 * Nutzermeldung zur Klasse. Konfigurationsfehler werden nur in Entwicklung konkret benannt;
 * in Produktion bleibt es generisch (keine Hinweise auf Schlüssel, Modell oder Infrastruktur).
 */
export function userMessageFor(klass, err, { isProd }) {
  switch (klass) {
    case 'input_too_long': return INPUT_TOO_LONG_ERROR;
    case 'output_too_long': return OUTPUT_TOO_LONG_ERROR;
    case 'overloaded': return OVERLOADED_ERROR;
    case 'timeout': return TIMEOUT_ERROR;
    case 'config': {
      if (isProd) return FRIENDLY_ERROR;
      const s = err?.status;
      if (s === 401) return 'Konfigurationsproblem (HTTP 401): Anthropic lehnt den API-Schlüssel ab. Prüfe ANTHROPIC_API_KEY (auch eine in der Umgebung schon gesetzte Variable überschreibt die .env nicht).';
      if (s === 403) return 'Konfigurationsproblem (HTTP 403): Zugriff verweigert. Prüfe die Berechtigungen des API-Schlüssels.';
      return 'Konfigurationsproblem (HTTP 404): Modell oder Endpunkt nicht gefunden. Prüfe MODEL in server/index.js und ANTHROPIC_BASE_URL.';
    }
    default: return FRIENDLY_ERROR;
  }
}
