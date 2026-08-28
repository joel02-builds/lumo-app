# Lumo

KI-gestützter Lernbegleiter für neurodivergente Studierende (ADHS-freundlich).

## Setup (lokal)

1. Abhängigkeiten installieren:
   ```bash
   npm install
   ```
2. API-Key hinterlegen:
   ```bash
   cp .env.example .env
   ```
   Öffne `.env` und trage deinen eigenen `ANTHROPIC_API_KEY` ein. Der Key wird **nur serverseitig** verwendet (`server/index.js`) und niemals an den Browser ausgeliefert.
3. Frontend + Backend zusammen starten:
   ```bash
   npm run dev
   ```
   Frontend läuft auf `http://localhost:5173`, das Backend auf `http://localhost:3001` (Vite proxyt `/api` automatisch dorthin).

## Architektur

- **Frontend** (`src/`): React SPA, State ausschließlich über `useReducer`/`useState` plus `localStorage` für Projekt-Fortschritt und Notizen – keine Datenbank, kein Login.
- **Backend** (`server/`): Minimaler Express-Proxy zu Claude (`claude-sonnet-4-6`). Hält den API-Key serverseitig und erzwingt strukturierte JSON-Antworten (`output_config.format`) für jede Aufgabe (Material-Analyse, Chat-Erklärung, Verständnis-Hinweis, Verständnis-Bewertung).

## Design-Prinzipien

Dunkler Hintergrund, ein warmer Goldakzent, große Schrift (≥18px), maximal ein aktionsforderndes Element pro Bildschirm, kurze Textabschnitte, warme statt technische Fehlermeldungen. Details siehe `server/prompts.js` (System-Prompts) und `src/styles/`.

## Deployment (Railway.app)

Production-Modus: **ein einziger Prozess** – Express liefert sowohl die API als auch den fertigen Frontend-Build aus (`dist/`) über denselben Origin. Dadurch gibt es kein CORS-Problem und keinen zweiten Server, der separat konfiguriert werden müsste.

1. **Repo vorbereiten** (falls noch nicht geschehen): Projekt in ein Git-Repository packen und auf GitHub pushen.
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```
   `.env` wird durch `.gitignore` automatisch ausgeschlossen – der API-Key landet nie im Repo.
2. **Neues Projekt auf [railway.app](https://railway.app)**: "New Project" → "Deploy from GitHub repo" → dieses Repo auswählen.
3. **Umgebungsvariable setzen**: im Railway-Dashboard unter "Variables":
   - `ANTHROPIC_API_KEY` = dein Anthropic-Key
   
   `PORT` und `NODE_ENV` müssen **nicht** manuell gesetzt werden – Railway vergibt `PORT` automatisch, und `npm start` setzt `NODE_ENV=production` selbst.
4. **Build & Start**: Railway erkennt `railway.json` und nutzt Nixpacks automatisch:
   - Build: `npm run build` (baut den Vite-Frontend nach `dist/`)
   - Start: `npm start` (startet Express im Production-Modus, liest `PORT` aus der Railway-Umgebung, serviert `dist/` statisch und beantwortet `/api/*`)
5. Railway vergibt eine öffentliche URL (unter "Settings" → "Networking" → "Generate Domain") – fertig.

**Lokal die Production-Variante testen**, bevor du deployst:
```bash
npm run build
npm start
```
Öffne `http://localhost:3001` (nicht 5173 – dort läuft im Production-Modus kein separater Vite-Server mehr).
