import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import {
  ANALYZE_SYSTEM,
  analyzeSchema,
  EXPLAIN_CHAT_SYSTEM_SIMPLE,
  EXPLAIN_CHAT_SYSTEM_DETAILED,
  explainChatSchema,
  UNDERSTANDING_HINT_SYSTEM,
  understandingHintSchema,
  EVALUATE_UNDERSTANDING_SYSTEM,
  evaluateUnderstandingSchema,
  CARD_SYSTEM,
  cardSchema,
  EVALUATE_CARD_ANSWER_SYSTEM,
  evaluateCardAnswerSchema,
  LERNZETTEL_SYSTEM,
  lernzettelSchema,
} from './prompts.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODEL = 'claude-sonnet-4-6';

// Kein separates Start-Skript-Tool (z. B. cross-env) mehr nötig, um NODE_ENV zu
// setzen: ohne gesetzten Wert gilt lokal "development" als sicherer Default.
if (!process.env.NODE_ENV) process.env.NODE_ENV = 'development';

// "Sind wir wirklich in Production?" NICHT nur an NODE_ENV festmachen – Railway
// setzt zusätzlich eigene RAILWAY_*-Variablen (z. B. RAILWAY_ENVIRONMENT) für
// JEDE Deployment – das ist ein zweites, von NODE_ENV unabhängiges Signal.
const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.RAILWAY_ENVIRONMENT);

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
console.log('RAILWAY_ENVIRONMENT:', process.env.RAILWAY_ENVIRONMENT);
console.log('API KEY vorhanden:', Boolean(process.env.ANTHROPIC_API_KEY));
console.log('API KEY Länge:', process.env.ANTHROPIC_API_KEY?.length || 0);
// Nur die Namen, keine Werte – zeigt, ob ANTHROPIC_API_KEY überhaupt in der
// Umgebung ankommt, unabhängig von jeder eigenen Lese-Logik hier im Code.
console.log('Verfügbare ENV Keys:', Object.keys(process.env).join(', '));

// In Produktion (z. B. Railway) gibt es keinen separaten Frontend-Dev-Server mehr –
// Express ist der einzige Prozess, und die Plattform verlangt, dass er auf dem von
// ihr vergebenen PORT lauscht. Im Dev-Modus ist PORT dagegen unzuverlässig: lokale
// Dev-/Preview-Tools setzen ihn oft schon für den Frontend-Server, was hier zu einer
// Portkollision führt – deshalb dort bewusst LUMO_API_PORT statt PORT.
const PORT = isProd ? process.env.PORT || 3001 : process.env.LUMO_API_PORT || 3001;

const FRIENDLY_ERROR = 'Lumo hat gerade ein kleines Problem. Versuch es gleich nochmal.';
const TIMEOUT_ERROR = 'Lumo braucht einen Moment länger. Warte kurz oder versuch es nochmal.';
const CLAUDE_TIMEOUT_MS = 28000; // knapp unter dem 30s-Timeout des Frontends

const app = express();
app.use(cors());
app.use(express.json({ limit: '35mb' }));

const client = new Anthropic({ timeout: CLAUDE_TIMEOUT_MS }); // liest ANTHROPIC_API_KEY aus der Umgebung

async function askLumo({ system, userContent, schema, maxTokens = 2048 }) {
  // Streaming statt einem einzelnen create()-Call: Claude sendet laufend Chunks,
  // wodurch der SDK-eigene Timeout an fortlaufender Aktivität hängt statt an
  // einer einzigen starren Gesamt-Deadline – bei längeren Antworten (z. B. viele
  // Lernblöcke) ist das deutlich robuster gegen vorzeitige Timeouts.
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: userContent }],
    output_config: { format: { type: 'json_schema', schema } },
  });
  const response = await stream.finalMessage();
  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || !textBlock.text) throw new Error('empty_response');
  return JSON.parse(textBlock.text);
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
  const payload = { error: isTimeoutError(err) ? TIMEOUT_ERROR : FRIENDLY_ERROR };
  if (!isProd) {
    // Nur in Entwicklung: exakter Fehlertext fürs Debugging im Browser sichtbar.
    payload.details = details;
  }
  res.status(500).json(payload);
}

app.post('/api/analyze', async (req, res) => {
  try {
    const { topic, materialText, fileBase64, fileMediaType, goalType, goalDate } = req.body || {};

    const goalContext =
      goalType === 'exam'
        ? `Der Nutzer lernt für eine Prüfung${goalDate ? ` am ${goalDate}` : ''}.`
        : goalType === 'homework'
          ? `Der Nutzer arbeitet an einer Hausarbeit${goalDate ? ` mit Abgabe am ${goalDate}` : ''}.`
          : 'Der Nutzer möchte das Thema einfach verstehen, ohne festen Termin.';

    const userContent = [];
    if (fileBase64 && fileMediaType === 'application/pdf') {
      userContent.push({
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: fileBase64 },
      });
    }

    // Begrenzt auf 8000 Zeichen: Render's kostenloser Plan killt Requests nach
    // 30s, und Claude braucht bei sehr großem Rohmaterial spürbar länger als
    // bei einer kompakten Zusammenfassung – die Kürzung hält die Antwortzeit
    // zuverlässig im Rahmen, statt nur das Timeout-Limit zu verschieben.
    const MAX_MATERIAL_CHARS = 8000;
    const trimmedMaterialText =
      materialText && materialText.length > MAX_MATERIAL_CHARS
        ? `${materialText.slice(0, MAX_MATERIAL_CHARS)}\n[...gekürzt...]`
        : materialText;

    let textPrompt = `Thema/Titel: ${topic || '(kein Titel angegeben)'}\n${goalContext}`;
    if (trimmedMaterialText && trimmedMaterialText.trim()) {
      textPrompt += `\n\nLernmaterial:\n${trimmedMaterialText}`;
    } else if (!fileBase64) {
      textPrompt += `\n\nEs wurde kein Material hochgeladen. Erstelle die Lernblöcke direkt zum genannten Thema, so wie es üblicherweise in diesem Fachgebiet unterrichtet wird.`;
    }
    userContent.push({ type: 'text', text: textPrompt });

    const data = await askLumo({
      system: ANALYZE_SYSTEM,
      userContent,
      schema: analyzeSchema,
      maxTokens: 8000,
    });
    res.json({ data });
  } catch (err) {
    sendFriendlyError(res, err);
  }
});

app.post('/api/explain-chat', async (req, res) => {
  try {
    const { blockTitle, blockContent, difficulty, depth, history } = req.body || {};
    const system = depth === 'detailed' ? EXPLAIN_CHAT_SYSTEM_DETAILED : EXPLAIN_CHAT_SYSTEM_SIMPLE;

    const contextBlock = `Block-Titel: ${blockTitle}\nSchwierigkeit: ${difficulty}\nInhalt:\n${blockContent}`;
    const transcript = (history || [])
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
    const { blockTitle, blockContent, difficulty } = req.body || {};
    const data = await askLumo({
      system: CARD_SYSTEM,
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
  const { blockTitle, blockContent, cards } = req.body || {};
  try {
    const data = await askLumo({
      system: LERNZETTEL_SYSTEM,
      userContent: `Block: ${blockTitle}\nInhalt: ${blockContent}\nGelernte Konzepte: ${cards?.map((c) => c.concept + ': ' + c.explanation).join('\n') || ''}`,
      schema: lernzettelSchema,
      maxTokens: 800,
    });
    res.json({ data });
  } catch (err) {
    sendFriendlyError(res, err);
  }
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, hasApiKey: Boolean(process.env.ANTHROPIC_API_KEY) });
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
const server = app.listen(PORT, HOST, () => {
  console.log(`Lumo backend läuft auf http://${HOST}:${PORT}`);
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    const hint = isProd
      ? 'Prüfe im Dashboard deiner Hosting-Plattform (z. B. Render → "Environment", Railway → "Variables"), ob ANTHROPIC_API_KEY dort wirklich gesetzt ist (Name exakt, kein Leerzeichen, Wert nicht leer) und ob seitdem neu deployed wurde.'
      : 'Bitte .env Datei anlegen (siehe .env.example).';
    console.warn(`WARNUNG: ANTHROPIC_API_KEY ist nicht gesetzt. ${hint}`);
  } else {
    // Nur die ersten 10 Zeichen (reines Präfix wie "sk-ant-api", kein Geheimnisanteil).
    console.log(`ANTHROPIC_API_KEY geladen, Präfix: ${key.slice(0, 10)}... (Länge: ${key.length})`);
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
