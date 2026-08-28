import 'dotenv/config';
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
} from './prompts.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODEL = 'claude-sonnet-4-6';
const isProd = process.env.NODE_ENV === 'production';

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
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: userContent }],
    output_config: { format: { type: 'json_schema', schema } },
  });
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

    let textPrompt = `Thema/Titel: ${topic || '(kein Titel angegeben)'}\n${goalContext}`;
    if (materialText && materialText.trim()) {
      textPrompt += `\n\nLernmaterial:\n${materialText}`;
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

const server = app.listen(PORT, () => {
  console.log(`Lumo backend läuft auf http://localhost:${PORT}`);
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    console.warn('WARNUNG: ANTHROPIC_API_KEY ist nicht gesetzt. Bitte .env Datei anlegen (siehe .env.example).');
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
