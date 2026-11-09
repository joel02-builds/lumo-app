/**
 * Leichtgewichtiger Schema-Validator für API-Request-Bodies.
 * ─────────────────────────────────────────────────────────────────────────────
 * Bewusst ohne externe Abhängigkeit (kein zod) — identische Semantik,
 * aber nur ~60 Zeilen Eigencode, keine zusätzliche npm-Abhängigkeit.
 *
 * Jedes Feld wird durch einen Descriptor beschrieben:
 *   required:  boolean  — Feld muss vorhanden und nicht null/undefined sein
 *   type:      'string' | 'array'
 *   nonEmpty:  boolean  — String darf nach trim() nicht leer sein
 *   maxLength: number   — Maximale String-Länge (Zeichen, nicht Bytes)
 *
 * Rückgabe: { ok: true } oder { ok: false, error: string }
 *
 * Verwendung:
 *   const v = validate(GENERATE_CARDS_REQ, req.body);
 *   if (!v.ok) return res.status(400).json({ error: v.error });
 */

/**
 * @typedef {{ required?: boolean, type: 'string'|'array', nonEmpty?: boolean, maxLength?: number }} FieldRule
 * @typedef {Record<string, FieldRule>} Schema
 * @typedef {{ ok: true } | { ok: false, error: string }} ValidationResult
 */

/**
 * Validiert `body` anhand von `schema`.
 * @param {Schema} schema
 * @param {unknown} body
 * @returns {ValidationResult}
 */
export function validate(schema, body) {
  for (const [field, rules] of Object.entries(schema)) {
    const val = body?.[field];
    const isAbsent = val === undefined || val === null;

    if (rules.required && isAbsent) {
      return { ok: false, error: `Pflichtfeld fehlt: "${field}".` };
    }
    if (isAbsent) continue;

    if (rules.type === 'string') {
      if (typeof val !== 'string') {
        return { ok: false, error: `"${field}" muss ein Text sein.` };
      }
      if (rules.nonEmpty && val.trim() === '') {
        return { ok: false, error: `"${field}" darf nicht leer sein.` };
      }
      if (rules.maxLength !== undefined && val.length > rules.maxLength) {
        return { ok: false, error: `"${field}" ist zu lang (max. ${rules.maxLength} Zeichen).` };
      }
    }

    if (rules.type === 'array' && !Array.isArray(val)) {
      return { ok: false, error: `"${field}" muss ein Array sein.` };
    }
  }
  return { ok: true };
}

// ─── Route-Schemas ──────────────────────────────────────────────────────────
// Naming: <ROUTE_NAME>_REQ — beschreibt die erlaubte Request-Struktur.
// Diese Schemas werden in index.js importiert und vor jedem Claude-Aufruf
// geprüft. Beim Verstoß → 400 mit deutschsprachiger Fehlermeldung, kein
// weiterer Code läuft, Claude wird nie aufgerufen.

/** POST /api/analyze */
export const ANALYZE_REQ = {
  topic: { type: 'string', required: true, nonEmpty: true, maxLength: 500 },
  // materialText, files, fileBase64 etc. werden in der Route selbst geprüft.
};

/** POST /api/explain-chat */
export const EXPLAIN_CHAT_REQ = {
  blockTitle:   { type: 'string', required: true, nonEmpty: true, maxLength: 500 },
  blockContent: { type: 'string', required: true, nonEmpty: true, maxLength: 20000 },
  difficulty:   { type: 'string', maxLength: 100 },
  depth:        { type: 'string', maxLength: 100 },
  // history wird durch bestehende S-04-Logik validiert (max 20 Nachrichten, max 2000 Zeichen je Nachricht)
};

/** POST /api/understanding-hint */
export const UNDERSTANDING_HINT_REQ = {
  blockTitle:   { type: 'string', required: true, nonEmpty: true, maxLength: 500 },
  blockContent: { type: 'string', required: true, nonEmpty: true, maxLength: 20000 },
};

/** POST /api/evaluate-understanding */
export const EVALUATE_UNDERSTANDING_REQ = {
  blockTitle:      { type: 'string', required: true, nonEmpty: true, maxLength: 500 },
  blockContent:    { type: 'string', required: true, nonEmpty: true, maxLength: 20000 },
  userExplanation: { type: 'string', required: true, nonEmpty: true, maxLength: 2000 },
};

/** POST /api/generate-cards */
export const GENERATE_CARDS_REQ = {
  blockTitle:    { type: 'string', required: true, nonEmpty: true, maxLength: 500 },
  blockContent:  { type: 'string', required: true, nonEmpty: true, maxLength: 20000 },
  difficulty:    { type: 'string', maxLength: 100 },
  goalType:      { type: 'string', maxLength: 100 },
  mood:          { type: 'string', maxLength: 100 },
  learningStyle: { type: 'string', maxLength: 100 },
};

/** POST /api/evaluate-card-answer */
export const EVALUATE_CARD_ANSWER_REQ = {
  concept:     { type: 'string', required: true, nonEmpty: true, maxLength: 500 },
  explanation: { type: 'string', required: true, nonEmpty: true, maxLength: 2000 },
  question:    { type: 'string', required: true, nonEmpty: true, maxLength: 1000 },
  userAnswer:  { type: 'string', required: true, nonEmpty: true, maxLength: 2000 },
};

/** POST /api/generate-lernzettel */
export const GENERATE_LERNZETTEL_REQ = {
  blockTitle:   { type: 'string', required: true, nonEmpty: true, maxLength: 500 },
  blockContent: { type: 'string', required: true, nonEmpty: true, maxLength: 20000 },
  goalType:     { type: 'string', maxLength: 100 },
  cards:        { type: 'array' },
};

/** POST /api/reexplain */
export const REEXPLAIN_REQ = {
  concept:             { type: 'string', required: true, nonEmpty: true, maxLength: 500 },
  originalExplanation: { type: 'string', required: true, nonEmpty: true, maxLength: 2000 },
  blockTitle:          { type: 'string', maxLength: 500 },
};

/** POST /api/explain-term */
export const EXPLAIN_TERM_REQ = {
  term:         { type: 'string', required: true, nonEmpty: true, maxLength: 500 },
  blockTitle:   { type: 'string', maxLength: 500 },
  blockContext: { type: 'string', maxLength: 5000 },
};

/** POST /api/generate-concept-map */
export const GENERATE_CONCEPT_MAP_REQ = {
  blockTitle:   { type: 'string', required: true, nonEmpty: true, maxLength: 500 },
  blockContent: { type: 'string', required: true, nonEmpty: true, maxLength: 20000 },
  cards:        { type: 'array' },
};

/** POST /api/generate-flashcards */
export const GENERATE_FLASHCARDS_REQ = {
  blockTitle:        { type: 'string', required: true, nonEmpty: true, maxLength: 500 },
  blockContent:      { type: 'string', maxLength: 20000 },
  uncertainConcepts: { type: 'array' },
};

/** POST /api/youtube-videos */
export const YOUTUBE_VIDEOS_REQ = {
  concept:    { type: 'string', required: true, nonEmpty: true, maxLength: 500 },
  blockTitle: { type: 'string', maxLength: 500 },
};
