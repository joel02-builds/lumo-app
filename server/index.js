import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import Anthropic from '@anthropic-ai/sdk';
import {
  initDB,
  createNewUser,
  loadUserState,
  saveUserState,
  deleteUserState,
  updateStreak,
  createSession,
  validateSession,
  revokeSession,
  migrateLegacySession,
  IS_RAILWAY,
  FREE_BLOCK_LIMIT,
  getBlocksAnalyzedTotal,
  incrementBlocksAnalyzed,
} from './db.js';
import {
  MAX_MATERIAL_CHARS,
  MAX_PDF_BYTES_RAW,
  isDocxFile,
  getBase64RawBytes,
  truncateMaterialText,
  processLumoResponse,
  escapeLernmaterialTags,
  validateAnalyzeData,
} from './materialUtils.js';
import {
  getAnalyzeSystem,
  analyzeSchema,
  EXPLAIN_CHAT_SYSTEM_SIMPLE,
  EXPLAIN_CHAT_SYSTEM_DETAILED,
  getExplainChatSystem,
  explainChatSchema,
  UNDERSTANDING_HINT_SYSTEM,
  understandingHintSchema,
  EVALUATE_UNDERSTANDING_SYSTEM,
  evaluateUnderstandingSchema,
  getCardSystem,
  cardSchema,
  EVALUATE_CARD_ANSWER_SYSTEM,
  evaluateCardAnswerSchema,
  getLernzettelSystem,
  lernzettelSchema,
  REEXPLAIN_SYSTEM,
  reexplainSchema,
  TERM_EXPLAIN_SYSTEM,
  termExplainSchema,
  CONCEPT_MAP_SYSTEM,
  conceptMapSchema,
  FLASHCARD_SYSTEM,
  flashcardSchema,
  YOUTUBE_SEARCH_SYSTEM,
  youtubeSearchSchema,
} from './prompts.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODEL = 'claude-sonnet-4-6';

// Kein separates Start-Skript-Tool (z. B. cross-env) mehr nötig, um NODE_ENV zu
// setzen: ohne gesetzten Wert gilt lokal "development" als sicherer Default.
if (!process.env.NODE_ENV) process.env.NODE_ENV = 'development';

// "Sind wir wirklich in Production?" IS_RAILWAY aus db.js importiert —
// keine doppelte Erkennungslogik mehr. db.js prüft die vier dokumentierten
// Railway-Plattformvariablen (Stand Nov 2025, docs.railway.com/variables/reference).
const isProd = process.env.NODE_ENV === 'production' || IS_RAILWAY;

// dotenv nur lokal laden: in Production (z. B. Railway) liefert die Plattform
// Umgebungsvariablen bereits direkt in process.env, bevor der Prozess überhaupt
// startet. dotenv würde einen dort schon gesetzten Wert ohnehin nie überschreiben
// (es füllt nur fehlende Werte auf) – das Laden hier ganz wegzulassen macht aber
// klarer, dass process.env in Production die einzige Quelle der Wahrheit ist.
if (!isProd) {
  await import('dotenv/config');
}

// Diagnose-Logging NACH dem dotenv-Schritt, damit es überall (lokal wie in
// Production) den tatsächlichen Endzustand von process.env zeigt.
console.log('PORT:', process.env.PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);
// Diagnose: Railway-Erkennung über dokumentierte Plattformvariablen
console.log('RAILWAY_ENVIRONMENT_ID:', process.env.RAILWAY_ENVIRONMENT_ID);
console.log('RAILWAY_ENVIRONMENT_NAME:', process.env.RAILWAY_ENVIRONMENT_NAME);
console.log('API KEY vorhanden:', Boolean(process.env.ANTHROPIC_API_KEY)); // R-01: Länge entfernt (unnötig, kein Mehrwert)
// Nur die Namen, keine Werte – ausschließlich in Entwicklung, da die vollständige
// ENV-Key-Liste in Production nicht benötigt wird und unnötige Offenlegung birgt.
// isProd ist bereits in Zeile 74 definiert (NODE_ENV === 'production' || IS_RAILWAY).
if (!isProd) {
  console.log('Verfügbare ENV Keys:', Object.keys(process.env).join(', '));
}

// In Produktion (z. B. Railway) gibt es keinen separaten Frontend-Dev-Server mehr –
// Express ist der einzige Prozess, und die Plattform verlangt, dass er auf dem von
// ihr vergebenen PORT lauscht. Im Dev-Modus ist PORT dagegen unzuverlässig: lokale
// Dev-/Preview-Tools setzen ihn oft schon für den Frontend-Server, was hier zu einer
// Portkollision führt – deshalb dort bewusst LUMO_API_PORT statt PORT.
const PORT = isProd ? process.env.PORT || 3001 : process.env.LUMO_API_PORT || 3001;

const FRIENDLY_ERROR = 'Lumo hat gerade ein kleines Problem. Versuch es gleich nochmal.';
const TIMEOUT_ERROR = 'Lumo braucht einen Moment länger. Warte kurz oder versuch es nochmal.';
const CLAUDE_TIMEOUT_MS = 55000; // knapp unter dem 60s-Timeout des Frontends (H-02)

// DB initialisieren — non-blocking, App läuft auch ohne DB
initDB();

const COOKIE_NAME = 'lumo_uid';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60 * 1000; // 1 Jahr

// ─── Session-Token Regex ──────────────────────────────────────────────────
// Neues Format: 32 Byte hex = 64-char Kleinbuchstaben-String
const SESSION_TOKEN_RE = /^[0-9a-f]{64}$/;
// Legacy-Format: UUID v4 (alte lumo_uid-Werte waren direkt UUIDs)
const LEGACY_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const app = express();

// S-02: HTTP Security Headers via Helmet
// Helmet setzt eine sichere Basis für HTTP-Headers. Die CSP wird nach den
// tatsächlich benötigten Quellen kalibriert (kein Wildcard, kein unsafe-eval
// in Production).
//
// CSP-Quellen analysiert aus:
//   - Google Fonts: fonts.googleapis.com (Stylesheets) + fonts.gstatic.com (Schriften)
//   - YouTube-Embeds: youtube.com/embed/* (YoutubePanel.jsx:67, frame-src)
//   - Service Worker (PWA, Production): worker-src 'self'
//   - Vite-HMR (Development): benötigt eval für ESM-Hot-Module-Replacement
//   - API: 'self' (gleicher Origin in Production; proxy in Dev via Vite)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   isProd
        // Production: kein eval, kein unsafe-inline (Vite-Build hat Content-Hashes)
        // 'self' reicht für den statisch ausgelieferten Bundle
        ? ["'self'"]
        // Dev: Vite-HMR und React-Devtools brauchen 'unsafe-eval' + 'unsafe-inline'
        : ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc:    ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc:     ["'self'", "https://fonts.gstatic.com"],
      imgSrc:      ["'self'", "data:", "blob:", "https:"],
      // YouTube-Embeds aus YoutubePanel.jsx
      frameSrc:    ["https://www.youtube.com", "https://youtube.com"],
      // API-Calls: gleicher Origin (Production) bzw. localhost-proxy (Dev)
      connectSrc:  isProd
        ? ["'self'"]
        : ["'self'", "ws://localhost:*", "http://localhost:*"],
      // Service Worker (PWA in Production), keine Worker in Dev (devOptions.enabled: false)
      workerSrc:   ["'self'", "blob:"],
      objectSrc:   ["'none'"],
      baseUri:     ["'self'"],
      formAction:  ["'self'"],
      // Upgrade-Requests zu HTTPS nur in Production
      ...(isProd ? { upgradeInsecureRequests: [] } : {}),
    },
  },
  // Referrer-Policy: nur Origin senden, keine vollständige URL
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  // X-Frame-Options: DENY (kein Einbetten als iframe, außer youtube.com per CSP)
  frameguard: { action: 'deny' },
  // HSTS: nur in Production mit einem Jahr Laufzeit
  hsts: isProd ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
  // X-Content-Type-Options: nosniff (immer)
  noSniff: true,
  // X-DNS-Prefetch-Control: off (Privacy)
  dnsPrefetchControl: { allow: false },
  // Cross-Origin-Embedder-Policy: deaktiviert (YouTube-Embeds brauchen Ausnahmen)
  crossOriginEmbedderPolicy: false,
}));

// P0-SEC-01: CORS Whitelist statt origin:true (any-origin war ein Sicherheitsproblem)
const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:4173',
].filter(Boolean);

// S-03: CORS Null-Origin absichern
// Zuvor wurde jede Anfrage ohne Origin-Header stillschweigend durchgelassen.
// Das ermöglichte direkten Server-Zugriff von curl, Postman, Server-zu-Server-
// Calls und Sandboxed-iframes (null-origin). Nur /api/health darf ohne Origin
// aufgerufen werden (Uptime-Monitoring, Load-Balancer-Checks).
app.use(cors({
  origin: (origin, callback) => {
    // S-03-FIX: kein implizites Zulassen von Origin-losen Requests mehr.
    // Ohne Origin-Header: CORS-Header werden nicht gesetzt (kein Allow-Origin).
    // Browser-Requests brauchen immer einen Origin-Header → kein Einfluss auf
    // normalen Betrieb. Direktzugriffe ohne Origin werden nicht blockiert —
    // sie erhalten nur keinen Access-Control-Allow-Origin-Header.
    if (!origin) return callback(null, false);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: Origin ${origin} not allowed`));
  },
  credentials: true, // für Cookie-Handling nötig
}));
app.use(cookieParser());
// P-BE-05: Globaler Body-Parser überspringt /api/analyze POST.
// Admission Control muss BEFORE dem Body gelesen wird greifen.
// Der Route-Handler bringt seinen eigenen route-spezifischen Parser mit.
app.use((req, res, next) => {
  if (req.method === 'POST' && req.path === '/api/analyze') return next();
  express.json({ limit: '35mb' })(req, res, next);
});

// ─── Session-Middleware ───────────────────────────────────────────────────
// Validiert Session-Tokens und bindet req.userId.
// Löst Legacy-UUIDs transparent auf (Migration alter lumo_uid-Cookies).
// Erstellt bei Bedarf eine neue anonyme Session.
// Immer vor API-Routen.
app.use('/api/', (req, res, next) => {
  try {
    const cookieVal = req.cookies?.[COOKIE_NAME];
    let userId = null;
    let newToken = null;

    if (cookieVal && SESSION_TOKEN_RE.test(cookieVal)) {
      // ── Neues Format: Session-Token ──────────────────────────────────────
      userId = validateSession(cookieVal);
      if (!userId) {
        // Token unbekannt oder widerrufen → neue anonyme Session
        userId = createNewUser();
        newToken = userId ? createSession(userId) : null;
      }
      // Kein Cookie-Refresh bei gültigem Token (spart unnötige Writes)

    } else if (cookieVal && LEGACY_UUID_RE.test(cookieVal)) {
      // ── Legacy-Format: UUID-Cookie (transparente Migration) ───────────────
      const migrated = migrateLegacySession(cookieVal);
      if (migrated) {
        // Bekannter Legacy-User → neues Token ausstellen
        userId = migrated.userId;
        newToken = migrated.token;
      } else {
        // Unbekannte UUID ODER bereits migrierter User (session_hash ≠ NULL):
        // Kein Zugriff → neue anonyme Session. Verhindert UUID-Injection.
        userId = createNewUser();
        newToken = userId ? createSession(userId) : null;
      }

    } else {
      // ── Kein Cookie oder unbekanntes Format → neue anonyme Session ────────
      userId = createNewUser();
      newToken = userId ? createSession(userId) : null;
    }

    if (newToken) {
      res.cookie(COOKIE_NAME, newToken, {
        maxAge: COOKIE_MAX_AGE,
        httpOnly: true,
        sameSite: isProd ? 'strict' : 'lax',
        secure: isProd,
      });
    }

    req.userId = userId;
  } catch {
    // Middleware nie crashen lassen
  }
  next();
});

// ─────────────────────────────────────────────────────────────────────────────
// Rate Limiting – schützt vor Missbrauch und unkontrollierten API-Kosten
//
// Warum wichtig: Ohne Rate-Limiting könnte jeder, der die URL kennt,
// beliebig viele Anthropic-API-Calls auslösen. Bei einem Beta-Rollout mit
// Studierenden kann das schnell teuer werden.
//
// Strategie: Zwei Stufen
// 1. Globales Limit: max. 200 Requests/15min pro IP — verhindert Scripting
// 2. Analyse-Limit: max. 10 Analysen/Stunde — das teuerste Endpoint
//
// In Production aktiviert; lokal deaktiviert damit Dev-Reload nicht blockiert.
// ─────────────────────────────────────────────────────────────────────────────
if (isProd) {
  // Globales API-Limit
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 Minuten
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Zu viele Anfragen. Bitte warte kurz und versuche es dann nochmal.' },
    skip: (req) => req.path === '/api/health', // Health-Check nie limitieren
  });
  app.use('/api/', globalLimiter);

  // Strengeres Limit für Analyse (teuerster Call: ~4000 Token input)
  const analyzeLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 Stunde
    max: 10, // 10 Analysen/Stunde pro IP – reicht für normalen Gebrauch
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Du hast heute schon viel analysiert! Warte eine Stunde bevor du weitermachst.' },
  });
  app.use('/api/analyze', analyzeLimiter);
}
// ─────────────────────────────────────────────────────────────────────────────

// H-03: maxRetries: 0 — keine automatischen Wiederholungsversuche.
// Standard wären 2 Retries, die bei Verbindungsfehlern bis zu 3 API-Aufrufe
// und entsprechende Kosten verursachen können. Fehler sollen kontrolliert und
// verständlich an den Client gelangen, nicht unkontrolliert wiederholt werden.
let _client = new Anthropic({ timeout: CLAUDE_TIMEOUT_MS, maxRetries: 0 }); // liest ANTHROPIC_API_KEY aus der Umgebung

// Nur für Integrationstests: ermöglicht das Injizieren eines Mock-Clients,
// damit keine echten Anthropic-API-Aufrufe ausgelöst werden.
// In Production niemals aufrufen.
export function __setClientForTesting(c) { _client = c; }

// Nur für Integrationstests: gibt die aktuelle Anzahl aktiver /api/analyze-Anfragen zurück.
// Ermöglicht direkte Slot-Zähler-Assertions ohne White-Box-Zugriff auf Closures.
// In Production niemals aufrufen.
export function __getActiveAnalyzeCountForTesting() { return _activeAnalyzeCount; }

async function askLumo({ system, userContent, schema, maxTokens = 2048, signal: externalSignal } = {}) {
  // H-03: AbortController deckt den vollständigen Anfragelebenszyklus ab:
  // Verbindungsaufbau, Streaming und finalMessage() laufen alle unter einer Deadline.
  // Der SDK-Timeout (timeout: CLAUDE_TIMEOUT_MS) schützt nur die initiale
  // HTTP-Verbindung; dieser setTimeout schützt die Gesamtdauer.
  const abortController = new AbortController();
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    abortController.abort();
  }, CLAUDE_TIMEOUT_MS);

  // Optionalen externen Abbruch-Signal (z. B. Client-Disconnect) weiterleiten.
  // Trennung: timedOut bleibt false, damit Client-Abbrüche keine Timeout-Meldung auslösen.
  if (externalSignal) {
    if (externalSignal.aborted) {
      clearTimeout(timeoutId);
      const e = new Error('client_aborted');
      e.name = 'ClientAbortError';
      throw e;
    }
    externalSignal.addEventListener('abort', () => abortController.abort(), { once: true });
  }

  try {
    // SDK-Dokumentation v0.117.1: RequestOptions.signal?: AbortSignal wird
    // als zweites Argument an stream() übergeben und in MessageStream.ts
    // auf stream.controller.abort() weitergeleitet.
    const stream = _client.messages.stream({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userContent }],
      output_config: { format: { type: 'json_schema', schema } },
    }, { signal: abortController.signal });
    const response = await stream.finalMessage();
    clearTimeout(timeoutId);
    return processLumoResponse(response);
  } catch (err) {
    clearTimeout(timeoutId);
    // Nur wenn unser eigener Timer den Abbruch ausgelöst hat, einen
    // Timeout-Fehler werfen — nicht bei Client-Abbruch oder API-Fehlern.
    if (timedOut) {
      throw new Error('request_timeout');
    }
    throw err;
  }
}

function describeAnthropicError(err) {
  // Anthropic SDK errors carry status/name/error body beyond err.message.
  return {
    message: err?.message,
    name: err?.name,
    status: err?.status,
    type: err?.error?.type || err?.type,
    requestId: err?.requestID || err?.request_id,
    body: err?.error,
  };
}

function isTimeoutError(err) {
  return /timeout|timed out/i.test(err?.name || '') || /timeout|timed out/i.test(err?.message || '');
}

function sendFriendlyError(res, err) {
  const details = describeAnthropicError(err);
  console.error('Lumo API-Fehler:', details);

  let errorMessage = FRIENDLY_ERROR;
  if (isTimeoutError(err)) {
    errorMessage = TIMEOUT_ERROR;
  } else if (err?.message === 'max_tokens_exceeded') {
    // H-02: Claude hat die Antwort wegen max_tokens abgebrochen — JSON unvollständig.
    errorMessage = 'Das Material ist für eine einzelne Analyse zu umfangreich. Bitte teile es in kleinere Abschnitte auf.';
  } else if (err?.message === 'json_parse_error') {
    errorMessage = FRIENDLY_ERROR;
  }

  const payload = { error: errorMessage };
  if (!isProd) {
    // Nur in Entwicklung: exakter Fehlertext fürs Debugging im Browser sichtbar.
    payload.details = details;
  }
  res.status(500).json(payload);
}

// P-BE-05: Concurrency-Limit — max. 3 parallele /api/analyze-Requests pro Node-Prozess.
// Schützt vor OOM-Kill bei simultanen 24-MB-PDF-Uploads auf Railway (512 MB–1 GB RAM).
// Hinweis: Dieses Limit gilt pro Node-Instanz. Bei mehreren Railway-Replicas ist kein
// globaler Koordinations-Mechanismus vorhanden — das ist dokumentiert (finding P-BE-05).
let _activeAnalyzeCount = 0;
const MAX_CONCURRENT_ANALYZE = 3;

app.post('/api/analyze',
  // 1. Admission Control — BEFORE Body wird eingelesen
  (req, res, next) => {
    if (_activeAnalyzeCount >= MAX_CONCURRENT_ANALYZE) {
      return res.status(429).json({
        error: 'Server überlastet – zu viele parallele Analysen aktiv. Bitte kurz warten.',
        retryAfter: 10,
      });
    }
    _activeAnalyzeCount++;
    let _slotReleased = false;
    const _releaseSlot = () => {
      if (!_slotReleased) {
        _slotReleased = true;
        _activeAnalyzeCount--;
      }
    };
    // 'finish': Antwort vollständig gesendet (Normal, Fehler, 403, 400, etc.)
    // 'close': Verbindung vorzeitig getrennt (Client-Abbruch vor finish)
    res.on('finish', _releaseSlot);
    res.on('close', _releaseSlot);
    next();
  },
  // 2. Route-spezifischer Body-Parser — nur nach erfolgreichem Slot-Erwerb
  express.json({ limit: '35mb' }),
  // 3. Eigentlicher Handler
  async (req, res) => {
  // H-03: Browser-Abbruch (Tab schließen, Navigation) bis zur Anthropic-Anfrage weiterleiten.
  // Verhindert, dass ein bereits nutzloser API-Call weiterläuft und Kosten verursacht.
  let clientAborted = false;
  const clientAbortController = new AbortController();
  // H-03: req.on('close') feuert in Node.js v22 bereits dann, wenn der
  // Request-Body vollständig gelesen wurde (IncomingMessage-Stream-Ende) –
  // nicht erst bei einem echten TCP-Abbruch. Das Ereignis feuert zudem nur
  // einmal; ein späterer echter Socket-Abbruch bleibt danach unbemerkt.
  // Lösung: req.socket.on('close') hört direkt auf das TCP-Socket-Ereignis,
  // das ausschließlich feuert, wenn die Verbindung wirklich getrennt wird.
  const onClientClose = () => {
    clientAborted = true;
    clientAbortController.abort();
  };
  req.socket?.on('close', onClientClose);

  // S-05: Dateianzahl-Limit
  const MAX_FILES = 5;

  try {
    const { topic, materialText, fileBase64, fileMediaType, files: filesArray, goalType, goalDate, sprintMode } = req.body || {};

    // S-07: Free-Block-Limit serverseitig prüfen
    // Lese den server-seitigen Zähler (nicht den Client-bereitgestellten).
    // Bei DB-Ausfall (getBlocksAnalyzedTotal gibt 0 zurück) → Analyse erlaubt
    // (fail-open, da kein Payment-Backend dahintersteht).
    const currentBlocksTotal = getBlocksAnalyzedTotal(req.userId);
    if (currentBlocksTotal >= FREE_BLOCK_LIMIT) {
      return res.status(403).json({
        error: 'Du hast dein kostenloses Analyse-Limit erreicht. Upgrade für unbegrenzte Analysen.',
        limitReached: true,
        blocksAnalyzedTotal: currentBlocksTotal,
        limit: FREE_BLOCK_LIMIT,
      });
    }

    const goalContext =
      goalType === 'exam'
        ? `Der Nutzer lernt für eine Prüfung${goalDate ? ` am ${goalDate}` : ''}.`
        : goalType === 'homework'
          ? `Der Nutzer arbeitet an einer Hausarbeit${goalDate ? ` mit Abgabe am ${goalDate}` : ''}.`
          : 'Der Nutzer möchte das Thema einfach verstehen, ohne festen Termin.';

    const userContent = [];

    // Multi-File: neues `files`-Array (Array von { base64, mediaType, name })
    // Backward-compatible: Einzeldatei über fileBase64/fileMediaType weiterhin unterstützt
    const filesToProcess = filesArray?.length
      ? filesArray
      : fileBase64 ? [{ base64: fileBase64, mediaType: fileMediaType }] : [];

    // S-05: Dateianzahl-Limit serverseitig prüfen (unabhängig von Client-Validierung)
    if (filesToProcess.length > MAX_FILES) {
      return res.status(400).json({
        error: `Zu viele Dateien (max. ${MAX_FILES}). Bitte wähle weniger Dateien aus.`,
      });
    }

    // H-01b: DOCX serverseitig ablehnen — Binärdaten als materialText würden
    // zu garbage-Text führen. Nutzer sollen als PDF exportieren oder Text
    // direkt einfügen. Diese Prüfung verhindert auch das Umgehen der
    // Frontend-Validierung.
    const docxFile = filesToProcess.find(isDocxFile);
    if (docxFile) {
      return res.status(400).json({
        error: 'DOCX-Dateien werden nicht unterstützt. Bitte exportiere die Datei als PDF oder füge den Text direkt ein.',
      });
    }

    for (const f of filesToProcess) {
      if (f.base64 && f.mediaType === 'application/pdf') {
        // H-02/H-05: PDF-Größe vor Anthropic-Aufruf prüfen.
        // Anthropic akzeptiert PDFs bis ca. 24 MB Rohdaten (≈ 32 MB base64).
        const rawBytes = getBase64RawBytes(f.base64);
        if (rawBytes > MAX_PDF_BYTES_RAW) {
          const mb = (rawBytes / 1024 / 1024).toFixed(1);
          return res.status(400).json({
            error: `PDF "${f.name || 'Datei'}" ist zu groß (${mb} MB, max. 24 MB). Bitte komprimiere die Datei oder teile sie auf.`,
          });
        }
        userContent.push({
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: f.base64 },
        });
      }
    }

    // H-01a: Textlimit auf 32.000 Zeichen erhöht (importiert aus materialUtils.js).
    // Lumo läuft auf Railway — kein 30s-Hard-Limit mehr. Ursprüngliche Länge
    // vor dem Kürzen für serverseitiges Logging erhalten.
    const originalMaterialLength = materialText?.length ?? 0;
    const { text: trimmedMaterialText, truncated: materialTruncated } =
      truncateMaterialText(materialText) || { text: materialText, truncated: false };

    if (materialTruncated) {
      console.log(
        `[analyze] Materialtext gekürzt: ${originalMaterialLength} → ${MAX_MATERIAL_CHARS} Zeichen` +
        ` (${Math.round(MAX_MATERIAL_CHARS / originalMaterialLength * 100)}% verarbeitet)`
      );
    }

    const hasPdfFile = filesToProcess.some(f => f.base64 && f.mediaType === 'application/pdf');
    let textPrompt = `Thema/Titel: ${topic || '(kein Titel angegeben)'}\n${goalContext}`;
    if (trimmedMaterialText && trimmedMaterialText.trim()) {
      // S-12: Lernmaterial in XML-Tags einschließen, um die Datengrenze zwischen
      // vertrauenswürdigen System-Anweisungen und nicht-vertrauenswürdigem Nutzermaterial
      // explizit zu markieren. Das System-Prompt referenziert diese Tags.
      //
      // S-12 (Härtung): Strukturell bedeutsame Tags im Materialinhalt escapen,
      // damit ein Materialtext der </lernmaterial> enthält nicht die Tag-Grenze
      // aufbrechen kann. Legitimer Lerninhalt – auch mit Anweisungsformulierungen –
      // wird nicht abgelehnt, sondern nur die zwei konkreten Tags ersetzt.
      const escapedMaterialText = escapeLernmaterialTags(trimmedMaterialText);
      textPrompt += `\n\n<lernmaterial>\n${escapedMaterialText}\n</lernmaterial>`;
    } else if (!hasPdfFile) {
      textPrompt += `\n\nEs wurde kein Material hochgeladen. Erstelle die Lernblöcke direkt zum genannten Thema, so wie es üblicherweise in diesem Fachgebiet unterrichtet wird.`;
    }
    userContent.push({ type: 'text', text: textPrompt });

    const data = await askLumo({
      system: getAnalyzeSystem(goalType, Boolean(sprintMode)),
      userContent,
      schema: analyzeSchema,
      maxTokens: 8000,
      signal: clientAbortController.signal,  // H-03: Client-Abbruch weiterleiten
    });
    req.socket?.off('close', onClientClose);

    // S-12d: Minimale Strukturvalidierung als Defense-in-Depth.
    // Primäre Schutzmaßnahme ist das API-Schema-Enforcement (output_config).
    // validateAnalyzeData() fängt edge-cases ab (leere blocks[], fehlende
    // Pflichtfelder), die das JSON-Schema theoretisch durchlassen könnte.
    // Wirft bei Fehler → catch-Block → sendFriendlyError → 500 ohne Details.
    validateAnalyzeData(data);

    // S-07: Erfolgreiche Analyse → Server-Zähler inkrementieren
    // Zählt die tatsächlich zurückgegebenen Blöcke, nicht eine vorab-Schätzung.
    // Bei DB-Fehler (incrementBlocksAnalyzed gibt -1) → stille Warnung, kein
    // Block für den Client (Fail-Open-Strategie, da kein Payment-Backend).
    const blockCount = Array.isArray(data?.blocks) ? data.blocks.length : 0;
    if (blockCount > 0) {
      const newTotal = incrementBlocksAnalyzed(req.userId, blockCount);
      if (newTotal < 0) {
        console.warn('[analyze] S-07: incrementBlocksAnalyzed fehlgeschlagen (DB offline?)');
      }
    }

    res.json({ data });
  } catch (err) {
    req.socket?.off('close', onClientClose);
    // Keine Antwort senden wenn der Client die Verbindung bereits getrennt hat.
    if (!clientAborted && !res.headersSent) {
      sendFriendlyError(res, err);
    }
  }
  } // end async handler
); // end app.post('/api/analyze')

// S-04: Chat-History-Limits
// Unbegrenzte History → unbeschränkte Anthropic-Token-Kosten + mögliche Injections.
// Strategie: Harte Limits, klare Fehlermeldungen, keine stille Kürzung.
const MAX_HISTORY_MESSAGES = 20;   // Max. Nachrichten (Hin + Rück)
const MAX_MESSAGE_CHARS    = 2000; // Max. Zeichen pro Nachricht
const MAX_HISTORY_TOTAL_CHARS = MAX_HISTORY_MESSAGES * MAX_MESSAGE_CHARS; // 40.000

app.post('/api/explain-chat', async (req, res) => {
  try {
    const { blockTitle, blockContent, difficulty, depth, history } = req.body || {};
    const system = getExplainChatSystem(depth, difficulty);

    // S-04: History-Validierung — Anzahl und Einzelgröße prüfen
    const rawHistory = Array.isArray(history) ? history : [];

    if (rawHistory.length > MAX_HISTORY_MESSAGES) {
      return res.status(400).json({
        error: `Der Chat-Verlauf ist zu lang (max. ${MAX_HISTORY_MESSAGES} Nachrichten).`,
      });
    }

    const oversizedMsg = rawHistory.find(
      (m) => typeof m.text === 'string' && m.text.length > MAX_MESSAGE_CHARS
    );
    if (oversizedMsg) {
      return res.status(400).json({
        error: `Eine Chat-Nachricht ist zu lang (max. ${MAX_MESSAGE_CHARS} Zeichen).`,
      });
    }

    // Gesamtgröße als zusätzliche Absicherung (z. B. viele Nachrichten nahe am Limit)
    const totalChars = rawHistory.reduce((sum, m) => sum + (m.text?.length || 0), 0);
    if (totalChars > MAX_HISTORY_TOTAL_CHARS) {
      return res.status(400).json({
        error: 'Der gesamte Chat-Verlauf ist zu groß.',
      });
    }

    const contextBlock = `Block-Titel: ${blockTitle}\nSchwierigkeit: ${difficulty}\nInhalt:\n${blockContent}`;
    const transcript = rawHistory
      .map((m) => `${m.role === 'user' ? 'Nutzer' : 'Lumo'}: ${m.text}`)
      .join('\n');

    const userContent = transcript
      ? `${contextBlock}\n\nBisheriger Chat-Verlauf:\n${transcript}\n\nGib jetzt deine Antwort auf die letzte Nutzer-Nachricht.`
      : `${contextBlock}\n\nGib jetzt deine Eröffnungserklärung.`;

    const data = await askLumo({ system, userContent, schema: explainChatSchema, maxTokens: 768 });
    res.json({ data });
  } catch (err) {
    sendFriendlyError(res, err);
  }
});

app.post('/api/understanding-hint', async (req, res) => {
  try {
    const { blockTitle, blockContent } = req.body || {};
    const userContent = `Block-Titel: ${blockTitle}\nInhalt:\n${blockContent}`;
    const data = await askLumo({
      system: UNDERSTANDING_HINT_SYSTEM,
      userContent,
      schema: understandingHintSchema,
      maxTokens: 256,
    });
    res.json({ data });
  } catch (err) {
    sendFriendlyError(res, err);
  }
});

app.post('/api/evaluate-understanding', async (req, res) => {
  try {
    const { blockTitle, blockContent, userExplanation } = req.body || {};
    const userContent = `Block-Titel: ${blockTitle}\nInhalt des Blocks:\n${blockContent}\n\nErklärung des Nutzers in eigenen Worten:\n"${userExplanation}"`;
    const data = await askLumo({
      system: EVALUATE_UNDERSTANDING_SYSTEM,
      userContent,
      schema: evaluateUnderstandingSchema,
      maxTokens: 1024,
    });
    res.json({ data });
  } catch (err) {
    sendFriendlyError(res, err);
  }
});

app.post('/api/generate-cards', async (req, res) => {
  try {
    const { blockTitle, blockContent, difficulty, goalType, mood, learningStyle } = req.body || {};
    const data = await askLumo({
      system: getCardSystem(goalType, mood, learningStyle),
      userContent: `Block: ${blockTitle}\nSchwierigkeit: ${difficulty}\nInhalt: ${blockContent}`,
      schema: cardSchema,
      maxTokens: 1500,
    });
    res.json({ data });
  } catch (err) {
    sendFriendlyError(res, err);
  }
});

app.post('/api/evaluate-card-answer', async (req, res) => {
  try {
    const { concept, explanation, question, userAnswer } = req.body || {};
    const data = await askLumo({
      system: EVALUATE_CARD_ANSWER_SYSTEM,
      userContent: `Konzept: ${concept}\nErklärung: ${concept} bedeutet: ${explanation}\nFrage: ${question}\nAntwort des Nutzers: ${userAnswer}`,
      schema: evaluateCardAnswerSchema,
      maxTokens: 200,
    });
    res.json({ data });
  } catch (err) {
    sendFriendlyError(res, err);
  }
});

app.post('/api/generate-lernzettel', async (req, res) => {
  const { blockTitle, blockContent, cards, goalType } = req.body || {};
  try {
    const data = await askLumo({
      system: getLernzettelSystem(goalType),
      userContent: `Block: ${blockTitle}\nInhalt: ${blockContent}\nGelernte Konzepte: ${cards?.map((c) => c.concept + ': ' + c.explanation).join('\n') || ''}`,
      schema: lernzettelSchema,
      maxTokens: 800,
    });
    res.json({ data });
  } catch (err) {
    sendFriendlyError(res, err);
  }
});

app.post('/api/reexplain', async (req, res) => {
  const { concept, originalExplanation, blockTitle } = req.body || {};
  try {
    const data = await askLumo({
      system: REEXPLAIN_SYSTEM,
      userContent: `Block: ${blockTitle}\nKonzept: ${concept}\nUrsprüngliche Erklärung: ${originalExplanation}`,
      schema: reexplainSchema,
      maxTokens: 300,
    });
    res.json({ data });
  } catch (err) {
    sendFriendlyError(res, err);
  }
});

app.post('/api/explain-term', async (req, res) => {
  const { term, blockTitle, blockContext } = req.body || {};
  try {
    const data = await askLumo({
      system: TERM_EXPLAIN_SYSTEM,
      userContent: `Block: ${blockTitle}\nKontext: ${blockContext}\nBegriff: ${term}`,
      schema: termExplainSchema,
      maxTokens: 150,
    });
    res.json({ data });
  } catch (err) {
    sendFriendlyError(res, err);
  }
});

app.post('/api/generate-concept-map', async (req, res) => {
  const { blockTitle, blockContent, cards } = req.body || {};
  try {
    const data = await askLumo({
      system: CONCEPT_MAP_SYSTEM,
      userContent: `Block: ${blockTitle}\nKernkonzepte: ${cards?.map((c) => c.concept).join(', ') || ''}\nInhalt: ${blockContent}`,
      schema: conceptMapSchema,
      maxTokens: 600,
    });
    res.json({ data });
  } catch (err) {
    sendFriendlyError(res, err);
  }
});

app.post('/api/generate-flashcards', async (req, res) => {
  const { blockTitle, uncertainConcepts, blockContent } = req.body || {};
  try {
    const data = await askLumo({
      system: FLASHCARD_SYSTEM,
      userContent: `Block: ${blockTitle}\nNoch unsichere Konzepte:\n${(uncertainConcepts || []).map((c, i) => `${i + 1}. ${c}`).join('\n')}\nKontext: ${blockContent?.slice(0, 1000) || ''}`,
      schema: flashcardSchema,
      maxTokens: 1200,
    });
    res.json({ data });
  } catch (err) {
    sendFriendlyError(res, err);
  }
});

app.post('/api/youtube-videos', async (req, res) => {
  const { concept, blockTitle } = req.body || {};
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    // Fallback ohne API Key: direkte Suche
    const query = encodeURIComponent(`${concept} ${blockTitle} einfach erklärt`);
    return res.json({
      data: {
        fallback: true,
        searchUrl: `https://www.youtube.com/results?search_query=${query}`,
        query: `${concept} einfach erklärt`,
      }
    });
  }

  try {
    // Zuerst Lumo nach optimaler Suchanfrage fragen
    let searchQuery = `${concept} einfach erklärt`;
    try {
      const queryData = await askLumo({
        system: YOUTUBE_SEARCH_SYSTEM,
        userContent: `Konzept: ${concept}\nBlock: ${blockTitle}`,
        schema: youtubeSearchSchema,
        maxTokens: 100,
      });
      searchQuery = queryData.query;
    } catch {}

    // YouTube Data API v3
    const ytUrl = `https://www.googleapis.com/youtube/v3/search?` +
      `part=snippet&q=${encodeURIComponent(searchQuery)}&` +
      `type=video&maxResults=3&` +
      `videoEmbeddable=true&` +
      `relevanceLanguage=de&` +
      `key=${apiKey}`;

    const response = await fetch(ytUrl);
    const ytData = await response.json();

    if (!response.ok || !ytData.items?.length) {
      const query = encodeURIComponent(searchQuery);
      return res.json({
        data: {
          fallback: true,
          searchUrl: `https://www.youtube.com/results?search_query=${query}`,
          query: searchQuery,
        }
      });
    }

    const videos = ytData.items.map(item => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      channel: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails?.medium?.url,
      description: item.snippet.description?.slice(0, 100),
    }));

    res.json({ data: { videos, query: searchQuery, fallback: false } });
  } catch (err) {
    sendFriendlyError(res, err);
  }
});

// ─── Persistent State Endpoints ──────────────────────────────────────────

/**
 * GET /api/state — Lädt den gespeicherten State für diesen User.
 * Gibt { state: null } wenn kein State vorhanden (Neuer User).
 *
 * S-07: blocksAnalyzedTotal wird aus dem server-seitigen Zähler (users-Tabelle)
 * überschrieben, nicht aus dem gespeicherten State-JSON. Damit ist der Wert
 * unveränderbar für den Client und spiegelt die tatsächliche Nutzung wider.
 */
app.get('/api/state', (req, res) => {
  try {
    const state = loadUserState(req.userId);
    // S-07: Server-seitigen Zähler in den State einmischen (autoritativer Wert)
    const serverBlocksTotal = getBlocksAnalyzedTotal(req.userId);
    const responseState = state
      ? { ...state, blocksAnalyzedTotal: serverBlocksTotal }
      : null;
    res.json({ state: responseState }); // S-08: userId nie in API-Antworten exponieren
  } catch (err) {
    console.error('[State] Load-Fehler:', err.message);
    res.json({ state: null });
  }
});

// S-06: State-Schema-Validierung
// Maximale Payload-Größe (als String, da JSON.stringify für die Größenprüfung):
const MAX_STATE_JSON_BYTES = 500 * 1024; // 500 KB
const MAX_STATE_DEPTH = 10;              // Max. Verschachtelungstiefe

/**
 * Prüft rekursiv die Verschachtelungstiefe eines Objekts.
 * @param {unknown} val
 * @param {number} maxDepth
 * @param {number} [current=0]
 * @returns {boolean} true wenn Tiefe überschritten
 */
function isTooDeep(val, maxDepth, current = 0) {
  if (current > maxDepth) return true;
  if (val && typeof val === 'object' && !Array.isArray(val)) {
    return Object.values(val).some((v) => isTooDeep(v, maxDepth, current + 1));
  }
  if (Array.isArray(val)) {
    return val.some((v) => isTooDeep(v, maxDepth, current + 1));
  }
  return false;
}

/**
 * Prüft auf Prototype-Pollution-Schlüssel (__proto__, constructor, prototype).
 * Nur die oberste Ebene muss geprüft werden — JSON.parse erlaubt __proto__
 * zwar als String-Key, aber das V8-Parsing via express.json() normalisiert ihn
 * bereits. Zusätzliche Prüfung als Defense-in-Depth.
 * @param {object} obj
 * @returns {boolean} true wenn gefährliche Keys enthalten
 */
function hasDangerousKeys(obj) {
  if (!obj || typeof obj !== 'object') return false;
  const dangerousKeys = new Set(['__proto__', 'constructor', 'prototype']);
  function check(val, depth = 0) {
    if (depth > 5 || !val || typeof val !== 'object') return false;
    for (const key of Object.keys(val)) {
      if (dangerousKeys.has(key)) return true;
      if (typeof val[key] === 'object' && check(val[key], depth + 1)) return true;
    }
    return false;
  }
  return check(obj);
}

/**
 * POST /api/state — Speichert den State für diesen User.
 * Body: { state: { ... } }
 */
app.post('/api/state', (req, res) => {
  try {
    const { state } = req.body || {};

    // S-06: Basis-Typ-Check
    if (!state || typeof state !== 'object' || Array.isArray(state)) {
      return res.status(400).json({ error: 'Ungültiger State: erwartet ein Objekt.' });
    }

    // S-06: Payload-Größe prüfen (JSON-Serialisierung als Proxy für Speicherbedarf)
    const stateJson = JSON.stringify(state);
    if (stateJson.length > MAX_STATE_JSON_BYTES) {
      return res.status(400).json({
        error: `State zu groß (${Math.round(stateJson.length / 1024)} KB, max. ${MAX_STATE_JSON_BYTES / 1024} KB).`,
      });
    }

    // S-06: Tiefencheck gegen rekursive/verschachtelte Payload-Bomben
    if (isTooDeep(state, MAX_STATE_DEPTH)) {
      return res.status(400).json({ error: 'State-Verschachtelung zu tief.' });
    }

    // S-06: Prototype-Pollution-Schutz
    if (hasDangerousKeys(state)) {
      return res.status(400).json({ error: 'Ungültige Schlüssel im State.' });
    }

    // S-07: blocks_analyzed_total aus dem Client-State entfernen.
    // Der Server pflegt diesen Wert selbst (users.blocks_analyzed_total).
    // Client darf ihn nicht überschreiben — das wäre das primäre Angriffsvektor.
    const { blocksAnalyzedTotal: _stripped, ...sanitizedState } = state;

    const ok = saveUserState(req.userId, sanitizedState);
    res.json({ ok }); // S-08: userId nie in API-Antworten exponieren
  } catch (err) {
    console.error('[State] Save-Fehler:', err.message);
    res.json({ ok: false });
  }
});

/**
 * DELETE /api/state — Löscht den State (Nutzer-Reset).
 */
app.delete('/api/state', (req, res) => {
  try {
    deleteUserState(req.userId);
    revokeSession(req.userId); // Session serverseitig ungültig machen (S-00/S-01)
    res.clearCookie(COOKIE_NAME);
    res.json({ ok: true });
  } catch {
    res.json({ ok: false });
  }
});

/**
 * POST /api/state/streak — Aktualisiert den Streak nach einer Session.
 */
app.post('/api/state/streak', (req, res) => {
  try {
    const streak = updateStreak(req.userId);
    res.json({ streak });
  } catch {
    res.json({ streak: null });
  }
});

app.get('/api/health', (req, res) => {
  // S-10: Keine internen Konfigurationsdetails (z.B. hasApiKey) in öffentlich
  // erreichbarer Response. Der Endpunkt dient ausschließlich als Liveness-Probe
  // für Railway-Monitoring und als Keep-Alive-Ping vom Frontend (keepAlive.js).
  // Kein Consumer liest den Response-Body – nur HTTP 200 zählt.
  res.json({ ok: true });
});

// S-11: Globaler JSON-Parse-Fehler-Handler
// Express' Default-Handler gibt bei ungültigem JSON eine HTML-Fehlerseite mit
// Stack-Trace und internen Pfaden zurück. Dieser Handler fängt entity.parse.failed-
// Fehler (z.B. malformed request body) ab und liefert stattdessen eine saubere
// JSON-400-Antwort ohne interne Details – in Produktion wie in Entwicklung.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Ungültige Anfrage: Fehlerhaftes JSON.' });
  }
  // Alle anderen Fehler: Standard-Express-Behandlung
  res.status(err.status || 500).json({ error: 'Interner Serverfehler.' });
});

if (isProd) {
  // Production: kein separater Vite-Dev-Server mehr – Express liefert den
  // fertigen Frontend-Build direkt aus (kein CORS-Problem, da alles vom selben
  // Origin kommt). Muss NACH den /api-Routen stehen, damit die nicht vom
  // Catch-all verschluckt werden.
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  // Middleware statt app.get('*', ...): Express 5s path-to-regexp verlangt für
  // Wildcard-Routen einen benannten Parameter (z. B. '/*splat') und wirft sonst
  // beim Start. Ein pfadloses app.use greift ohnehin erst, wenn nichts vorher
  // gematcht hat, und ist dadurch unabhängig von der jeweiligen Express-Version.
  app.use((req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('Lumo backend läuft.');
  });
}

// Explizit auf '0.0.0.0' statt nur dem Default (127.0.0.1) binden: Railways
// externer Traffic-Router leitet Requests an alle Interfaces weiter, nicht nur
// an localhost – ohne dieses Argument bleibt die App von außen unerreichbar,
// auch wenn sie lokal auf dem richtigen PORT lauscht.
const HOST = '0.0.0.0';

// H-03: app exportieren, damit Integrationstests den Server selbst starten können
// ohne dieses Modul als Skript auszuführen.
export { app };

// Server nur starten wenn dieses Modul direkt aufgerufen wird (nicht bei import).
// path.resolve() normalisiert relative process.argv[1]-Pfade sicher.
const isMain = process.argv[1] ? path.resolve(process.argv[1]) === __filename : false;
if (isMain) {
  const server = app.listen(PORT, HOST, () => {
    console.log(`Lumo backend läuft auf http://${HOST}:${PORT}`);

    // AUDIT-D-01: In Produktion muss FRONTEND_URL gesetzt sein.
    // Fehlt sie, enthält ALLOWED_ORIGINS nur Localhost-Origins – jeder
    // Browser-Request von der Produktions-URL scheitert mit CORS-Fehler,
    // der Server startet aber ohne Fehlermeldung.
    if (isProd && !process.env.FRONTEND_URL) {
      console.warn('WARNUNG: FRONTEND_URL ist nicht gesetzt.');
      console.warn('In Produktion werden alle Browser-Requests abgelehnt (CORS).');
      console.warn('Bitte FRONTEND_URL im Railway-Dashboard setzen (z. B. https://lumo-app.up.railway.app).');
    }

    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) {
      const hint = isProd
        ? 'Prüfe im Dashboard deiner Hosting-Plattform (z. B. Render → "Environment", Railway → "Variables"), ob ANTHROPIC_API_KEY dort wirklich gesetzt ist (Name exakt, kein Leerzeichen, Wert nicht leer) und ob seitdem neu deployed wurde.'
        : 'Bitte .env Datei anlegen (siehe .env.example).';
      console.warn(`WARNUNG: ANTHROPIC_API_KEY ist nicht gesetzt. ${hint}`);
    } else {
      console.log('ANTHROPIC_API_KEY geladen.');
    }
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(
        `FEHLER: Port ${PORT} ist bereits belegt. Läuft noch ein alter "npm run dev"-Prozess? Beende ihn und starte neu.`
      );
      process.exit(1);
    }
    throw err;
  });
}
