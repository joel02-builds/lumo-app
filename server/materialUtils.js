/**
 * Reine Validierungs-Hilfsfunktionen für die Materialverarbeitung.
 * Exportiert für Unit-Tests in tests/material-processing.test.js.
 *
 * H-01 Umsetzung: Materialverarbeitung vollständig und zuverlässig machen.
 */

/**
 * Maximale Zeichenzahl, die an Claude weitergegeben wird.
 *
 * Erhöht von 8.000 auf 32.000: Lumo läuft auf Railway (kein 30s-Hard-Limit mehr),
 * typisches Studienmaterial umfasst 15–25 Seiten dichten Text (≈ 12.000–24.000
 * Zeichen). 32.000 Zeichen decken das zuverlässig ab, ohne Chunking zu erfordern.
 */
export const MAX_MATERIAL_CHARS = 32000;

/**
 * Anthropic API: PDF-Limit ca. 24 MB Rohdaten (≈ 32 MB base64-kodiert).
 * Quelle: Anthropic Vision-Dokumentation (Stand Nov 2025, "up to 32MB base64").
 * Wir rechnen konservativ mit 24 MB raw, um Randwertproblemen vorzubeugen.
 */
export const MAX_PDF_BYTES_RAW = 24 * 1024 * 1024; // 24 MB

export const DOCX_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/**
 * Gibt true zurück, wenn die Datei ein DOCX-Dokument ist.
 * Prüft MIME-Type und Dateiendung unabhängig voneinander.
 *
 * @param {{ mediaType?: string, name?: string }} file
 * @returns {boolean}
 */
export function isDocxFile(file) {
  if (!file) return false;
  return (
    file.mediaType === DOCX_MIME_TYPE ||
    (typeof file.name === 'string' && /\.docx$/i.test(file.name))
  );
}

/**
 * Berechnet die ungefähre Rohgröße eines base64-kodierten Strings in Bytes.
 * base64: 4 Zeichen = 3 Bytes, Padding-Zeichen (=) werden abgezogen.
 *
 * @param {string} base64String
 * @returns {number} Rohgröße in Bytes
 */
export function getBase64RawBytes(base64String) {
  if (typeof base64String !== 'string' || base64String.length === 0) return 0;
  const paddingChars = (base64String.match(/=+$/) || [''])[0].length;
  return Math.floor(base64String.length * 0.75) - paddingChars;
}

/**
 * Kürzt Materialtext auf MAX_MATERIAL_CHARS Zeichen.
 * Gibt Objekt mit gekürztem Text, Flag und ursprünglicher Länge zurück.
 *
 * @param {string|null|undefined} text
 * @returns {{ text: string, truncated: boolean, originalLength: number }}
 */
export function truncateMaterialText(text) {
  if (!text || typeof text !== 'string') {
    return { text: text ?? '', truncated: false, originalLength: 0 };
  }
  const originalLength = text.length;
  if (originalLength <= MAX_MATERIAL_CHARS) {
    return { text, truncated: false, originalLength };
  }
  return {
    text: `${text.slice(0, MAX_MATERIAL_CHARS)}\n[...gekürzt...]`,
    truncated: true,
    originalLength,
  };
}

/**
 * Escaped </lernmaterial> und <lernmaterial> im Materialtext, um XML-Tag-Injection
 * zu verhindern.
 *
 * Problem: Wenn der Materialtext selbst </lernmaterial> enthält, würde der
 * Closing-Tag früher als erwartet auftreten und dem Modell Injections nach dem
 * Tag ermöglichen – z.B. gefälschte Systemanweisungen.
 *
 * Lösung: Ersetze strukturell bedeutsame Tags durch HTML-Entity-kodierte
 * Varianten. Claude verarbeitet den Text semantisch – die Ersetzung ist für
 * das Modell transparent und beeinträchtigt keine legitimen Lerninhalte.
 *
 * Ausschließlich auf das bekannte Tag-Paar zielend – keine Blockliste.
 * Normaler Lerninhalt (auch mit "ignore previous instructions") wird NICHT
 * verändert oder abgelehnt.
 *
 * @param {string|null|undefined} text
 * @returns {string}
 */
export function escapeLernmaterialTags(text) {
  if (typeof text !== 'string') return text ?? '';
  return text
    .replace(/<\/lernmaterial>/gi, '&lt;/lernmaterial>')
    .replace(/<lernmaterial>/gi, '&lt;lernmaterial>');
}

/**
 * Minimale Strukturvalidierung der geparsten analyzeSchema-Antwort.
 *
 * Primärer Schutz ist das API-Schema-Enforcement via output_config.
 * Diese Funktion fängt edge-cases ab, die das JSON-Schema theoretisch
 * durchlassen könnte:
 *   - Leere blocks-Arrays (Schema erlaubt [], 0 Blöcke wären unbrauchbar)
 *   - Fehlende oder leere Pflichtstring-Felder
 *   - Nicht-Objekt-Werte nach JSON.parse (z.B. null, Array)
 *
 * Wirft Error bei ungültiger Struktur – der äußere catch-Block der Route
 * ruft sendFriendlyError auf (kein interner Detail-Leak in Production).
 *
 * @param {unknown} data — Rückgabewert von processLumoResponse()
 * @returns {void}
 * @throws {Error}
 */
export function validateAnalyzeData(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('invalid_response_structure: kein gültiges Objekt');
  }
  if (!Array.isArray(data.blocks) || data.blocks.length === 0) {
    throw new Error('invalid_response_structure: blocks fehlt oder leer');
  }
  if (typeof data.subject !== 'string' || data.subject.length === 0) {
    throw new Error('invalid_response_structure: subject fehlt oder leer');
  }
  for (let i = 0; i < data.blocks.length; i++) {
    const block = data.blocks[i];
    if (!block || typeof block !== 'object') {
      throw new Error(`invalid_response_structure: Block ${i} ist kein Objekt`);
    }
    if (typeof block.title !== 'string' || block.title.length === 0) {
      throw new Error(`invalid_response_structure: Block ${i} – title fehlt oder leer`);
    }
    if (typeof block.content !== 'string' || block.content.length === 0) {
      throw new Error(`invalid_response_structure: Block ${i} – content fehlt oder leer`);
    }
  }
}

/**
 * Verarbeitet die Claude-Antwort nach stream.finalMessage():
 * - Prüft stop_reason (max_tokens → unvollständige JSON-Antwort)
 * - Extrahiert den Text-Block
 * - Parst JSON sicher
 *
 * Wirft spezifische Fehlercodes für bekannte Problemfälle:
 * - 'max_tokens_exceeded' → Antwort wurde abgeschnitten
 * - 'empty_response'     → Kein Text-Block in der Antwort
 * - 'json_parse_error'   → JSON konnte nicht geparst werden
 *
 * @param {{ stop_reason?: string, content?: Array<{type: string, text?: string}> }} response
 * @returns {unknown} Geparstes JSON-Objekt
 * @throws {Error}
 */
export function processLumoResponse(response) {
  if (!response) throw new Error('empty_response');

  // H-02: stop_reason prüfen — bei max_tokens ist die JSON-Antwort unvollständig
  // und JSON.parse() würde mit einem kryptischen Fehler scheitern.
  if (response.stop_reason === 'max_tokens') {
    throw new Error('max_tokens_exceeded');
  }

  const textBlock = response.content?.find((b) => b.type === 'text');
  if (!textBlock || !textBlock.text) throw new Error('empty_response');

  try {
    return JSON.parse(textBlock.text);
  } catch {
    throw new Error('json_parse_error');
  }
}
