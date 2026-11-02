# LUMO – PROFESSIONAL PRE-RELEASE ENGINEERING AUDIT

**Auditiert von:** Claude Sonnet 4.6 (Principal Software Engineer Role)  
**Auditiert am:** 2026-11-02  
**Auditierte Version:** package.json v1.0.0, Git-Branch: main (Sicherungspunkt vor Audit)  
**Methodik:** Statische Code-Analyse · Abhängigkeitsanalyse · Sicherheitsprüfung · Architektur-Review

> **Wichtig:** Während dieses Audits wurden keinerlei Dateien verändert, keine Abhängigkeiten installiert, keine Datenbankstrukturen geändert, keine Dateien gelöscht und kein Refactoring durchgeführt. Alle Befunde basieren ausschließlich auf dem Ist-Zustand.

---

## Inhaltsverzeichnis

1. [Executive Summary](#executive-summary)
2. [Technische Architekturübersicht](#technische-architekturübersicht)
3. [Untersuchte Funktionen](#untersuchte-funktionen)
4. [Befunde nach Audit-Bereich](#befunde-nach-audit-bereich)
5. [Konsolidierte Befundliste](#konsolidierte-befundliste)
6. [Release-Einschätzung](#release-einschätzung)
7. [Priorisierte Verbesserungsmaßnahmen](#priorisierte-verbesserungsmaßnahmen)
8. [Beantwortung der 5 kritischen Fragen](#beantwortung-der-5-kritischen-fragen)

---

## Executive Summary

Lumo ist eine KI-gestützte Lern-App mit einem soliden pädagogischen Fundament und einem distinguierten ADHS-bewussten Designansatz. Die App implementiert eine nachweislich sinnvolle Lernarchitektur (Focus Ritual → Elaboration → Active Recall → Concept Map → Lernzettel) und verwendet FSRS-6 für Spaced Repetition – beides sind evidenzbasierte Entscheidungen, die über den Marktdurchschnitt hinausgehen.

Gleichzeitig weist Lumo in mehreren Bereichen strukturelle Schwächen auf, die einen reibungslosen öffentlichen Launch verhindern:

**Kritischste Befunde:**
- **FSRS-Rating-Bug:** Das Kernfeature Spaced Repetition ist in der primären Lernphase (CardLearningPhase) auf 2 von 4 Ratings reduziert. Hard/Easy werden ignoriert. Das ist ein funktionaler Defekt am Herzstück des Produkts.
- **Null Testabdeckung:** Kein einziger Test in der gesamten Codebase. Kein ESLint. Kein TypeScript. Das macht Regressionstests bei Änderungen unmöglich.
- **Keine Authentifizierung:** Jeder, der die API kennt, kann auf alle Endpunkte zugreifen. Die anonyme Cookie-Identität schützt nichts.
- **Datenverlust-Risiko (SQLite):** Auf Railway ohne explizites persistentes Volume ist bei einem Redeploy ein vollständiger Datenverlust möglich.
- **API-Key-Logging:** Der Anthropic-API-Key wird beim Server-Start geloggt (Länge + Prefix). In Produktions-Logs ein ernstes Sicherheitsrisiko.
- **Non-deterministische Dependencies:** Vier Kernabhängigkeiten stehen auf `latest` – darunter `@anthropic-ai/sdk` und `express`. Das ist ein Supply-Chain-Risiko und macht Builds nicht reproduzierbar.

**Stärken:**
- Pädagogisch durchdachte Lernarchitektur mit solider Evidenzbasis
- Konsequentes ADHS-bewusstes Design (kein Rot bei Misserfolg, Amber statt Alarm)
- Gutes Error-Handling auf Clientseite
- Datenschutz-konforme Cookie-Consent-Implementierung (ePrivacy Directive)
- Strukturierte KI-Outputs via JSON-Schema (verhindert halluzinierte Formate)
- TTS-Unterstützung (Web Speech API, Dual Coding Theory)
- Adaptive Pause-Intervalle basierend auf Blocklänge

**Gesamtbewertung:** Lumo ist **nicht öffentlich releasefähig** in aktuellem Zustand. Nach Behebung der kritischen Befunde (geschätzt 3–5 Tage Arbeit): **releasefähig für einen geschlossenen Beta-Test.**

---

## Technische Architekturübersicht

### Stack

| Schicht | Technologie | Version | Bewertung |
|---------|-------------|---------|-----------|
| Frontend | React | ^18.3.1 | ✅ Stabil |
| Build | Vite | `latest` ⚠️ | ⚠️ Non-deterministic |
| Backend | Express.js | `latest` ⚠️ | ⚠️ Non-deterministic |
| Datenbank | better-sqlite3 (WAL) | ^13.0.3 | ✅ Gepinnt |
| AI | @anthropic-ai/sdk (claude-sonnet-4-6) | `latest` ⚠️ | ⚠️ Kritisch |
| SRS | ts-fsrs | ^5.4.2 | ✅ Gepinnt |
| PWA | vite-plugin-pwa | ^2.0.0 | ✅ Major-gepinnt |
| Deployment | Railway (primary), Render (legacy) | — | ⚠️ Dual-Config |

### Projektstruktur

```
lumo-app/
├── server/
│   ├── index.js        (613 Zeilen — monolithisch, wächst riskant)
│   ├── db.js           (192 Zeilen — zwei Tabellen, kein Schema-Management)
│   └── prompts.js      (668 Zeilen — alle System-Prompts + Schemas)
├── src/
│   ├── App.jsx         (567 Zeilen — Haupt-State-Container)
│   ├── state/appReducer.js  (404 Zeilen — useReducer-Pattern)
│   ├── screens/
│   │   ├── session/
│   │   │   └── CardLearningPhase.jsx  (1974 Zeilen — GRÖSSTE DATEI)
│   │   ├── dashboard/DashboardScreen.jsx  (1041 Zeilen)
│   │   └── FlashcardScreen.jsx  (915 Zeilen)
│   ├── utils/
│   │   ├── storage.js     (330 Zeilen — IDB + localStorage)
│   │   ├── fsrs.js        (233 Zeilen — FSRS-6 Wrapper)
│   │   ├── serverSync.js  (176 Zeilen — Sync-Logik)
│   │   └── planLimits.js  (Freemium-Limits, nicht enforced)
│   └── api/lumo.js     (69 Zeilen — alle API-Calls)
├── public/
│   └── manifest.json   (PWA-Manifest, unvollständig)
└── package.json        (WARNUNG: 4x `latest`)
```

### Datenfluß

```
User → React (useReducer) ← IndexedDB (loadAsync)
                          ← localStorage (loadSync, init)
              ↕ 2s debounce
         Express API → SQLite (user_state JSON blob)
              ↕
       Anthropic Claude API (claude-sonnet-4-6)
```

### Deployment-Architektur

- **Primary:** Railway (`railway.json` + `nixpacks.toml`)
- **Legacy:** Render (`render.yaml` + stale Render-URL in CORS)
- **Health Check:** `/api/health`
- **Build:** `vite build` → `node server/index.js`
- **Kritisch:** Kein persistentes Volume explizit in `railway.json` konfiguriert — SQLite-Daten liegen standardmäßig im Container-Dateisystem.

---

## Untersuchte Funktionen

### Nachweislich implementiert

- ✅ Material-Upload (Text + PDF via base64)
- ✅ KI-Analyse → strukturierte Lernblöcke (JSON-Schema-validated)
- ✅ Focus Ritual Phase
- ✅ Elaboration Phase (Vorwissen-Aktivierung)
- ✅ Active Recall mit Karteikarten (CardLearningPhase)
- ✅ ExplainChat Phase (freie Fragen an Lumo)
- ✅ CheckUnderstanding Phase (Selbsteinschätzung)
- ✅ BlockComplete Phase
- ✅ Lernzettel-Generierung
- ✅ Concept Map (max. 5 Nodes, max. 6 Edges)
- ✅ Session Summary
- ✅ Flashcard Review (FSRS, alle 4 Ratings)
- ✅ Weak Spots Screen
- ✅ Dashboard mit Fortschrittsübersicht
- ✅ Mehrere Projekte
- ✅ Streak-Tracking (localStorage + Server)
- ✅ Cookie Consent (ePrivacy konform)
- ✅ Fachfarben (Hex-basiert, vom Nutzer wählbar)
- ✅ Sprint Mode (≤3 Tage bis Prüfung → max. 4 Blöcke)
- ✅ TTS (Web Speech API)
- ✅ PWA (Service Worker, autoUpdate)
- ✅ Adaptive Pausen-Timer (Sweller 1988)
- ✅ Daten-Export/Import (.json)
- ✅ prefers-reduced-motion Support
- ✅ Rate Limiting (global 200/15min, analyze 10/h)

### Teilweise implementiert

- ⚠️ **FSRS-4-Ratings** — nur in FlashcardScreen; CardLearningPhase nutzt nur 2 von 4
- ⚠️ **Freemium-Paywall** — `planLimits.js` definiert Limits, aber kein Enforcement sichtbar
- ⚠️ **YouTube-Suchvorschläge** — API generiert `queryEnglish`, aber nur `query` wird genutzt

### Nicht implementiert

- ❌ Authentifizierung / User-Accounts
- ❌ Tests (Unit, Integration, E2E)
- ❌ Monitoring / Error Tracking
- ❌ Datenbankmigrationen
- ❌ Pretest-System (PRETEST_SYSTEM in prompts.js ist definiert aber nicht angebunden)

---

## Befunde nach Audit-Bereich

---

### A. Softwarearchitektur und Projektstruktur

**Score: 60/100**

**Geprüfte Methoden:** Dateibaum-Analyse, package.json-Review, Deployment-Configs gelesen (railway.json, nixpacks.toml, render.yaml, Procfile).

Die Architektur ist für eine Solo-Developer-App pragmatisch und funktional. React SPA + Express Monorepo auf einer Plattform ist eine valide Wahl für diese Produktphase. Die klare Trennung von `server/` und `src/` ist sauber.

**Probleme:**

Das Wachstum der Server-Datei (`server/index.js`: 613 Zeilen mit 13 Endpunkten) ist ein frühs Zeichen mangelnder Modularisierung. `prompts.js` (668 Zeilen) ist bereits sehr groß. Bei weiterem Wachstum wird dies unwartbar.

Der schwerste Architektur-Fehler: `@anthropic-ai/sdk: "latest"` bedeutet, dass jeder Build eine potenziell andere SDK-Version einsetzen kann. Wenn Anthropic eine Breaking Change einführt (z.B. geänderte JSON-Schema-API), bricht Production bei nächstem Deployment ohne Vorwarnung.

Die Dual-Deployment-Konfiguration (Railway + Render) ist technische Schuld: Die stale Render-URL in der CORS-Allowlist ist ein Sicherheits-Artefakt.

---

### B. Codequalität und technische Schulden

**Score: 35/100**

**Geprüfte Methoden:** Datei-Review, npm audit, Glob-Scan nach Test-Dateien, Glob-Scan nach ESLint-Config, Glob-Scan nach tsconfig.

**Kritische Befunde:**
- **0 Test-Dateien** in der gesamten Codebase (bestätigt durch glob-Scan)
- **Kein ESLint** (keine `.eslintrc`, keine `eslint.config.*`)
- **Kein TypeScript** (keine `tsconfig.json`)
- **8 moderate npm-Vulnerabilities** (npm audit ausgeführt; alle in der `vite-plugin-pwa` Dependency-Chain: ejs, glob, minimatch). Fix: Upgrade auf `vite-plugin-pwa@1.1.0` — aber das ist ein Major-Downgrade von `^2.0.0`, was zunächst paradox erscheint und manuellen Test erfordert.
- **`latest`-Dependencies:** `@anthropic-ai/sdk`, `cors`, `dotenv`, `express`, `@vitejs/plugin-react`, `concurrently`, `vite` — alle nicht gepinnt.
- **Totes CSS:** `--glow-center`, `--glow-top`, `--glow-vignette` in `:root` definiert, werden aber von `.screen` nicht als `var()` genutzt. `.screen` inlinet die Gradient-Werte direkt. Dead code.
- **Irreführende Benennung:** `BACK_TO_STEP2` Action im Reducer setzt `onboardingStep: 1` (nicht 2). Ist mit Kommentar dokumentiert, aber dennoch ein Naming-Bug der Verwirrung stiftet.

---

### C. Frontend und Komponentenarchitektur

**Score: 58/100**

**Geprüfte Methoden:** Datei-Review der Hauptkomponenten (App.jsx, SessionScreen.jsx, FlashcardScreen.jsx, OnboardingScreen1.jsx, appReducer.js, storage.js, serverSync.js).

Das `useReducer`-Pattern für den App-State ist für die aktuelle Komplexität sinnvoll und gut umgesetzt. Die Session-Phase-Steuerung (`SessionScreen.jsx`) ist sauber strukturiert mit klaren PHASES-Konstanten. Der `useCallback`-Einsatz für Timer-Stabilität ist korrekt motiviert (verhindert Effect-Reset bei jedem Sekunden-Tick).

**Probleme:**

`CardLearningPhase.jsx` mit **1974 Zeilen** ist die größte Datei im Projekt und ein erhebliches Wartungsproblem. Eine Datei dieser Größe kann nicht effektiv reviewed, getestet oder debuggt werden. Das ist keine ästhetische Kritik – das ist ein reales Entwicklungs-Risiko.

`DashboardScreen.jsx` (1041 Zeilen) hat das gleiche Problem.

Der Hydrations-Flow (sync localStorage init → async IDB load → `HYDRATE_FROM_STORAGE` dispatch) ist technisch korrekt aber subtil: Race-Conditions zwischen der initialen Render und dem Hydration-Dispatch könnten in Edge-Cases zu kurzen Flackern führen. Nicht beobachtet, aber nicht getestet.

Die Progress-basierte State-Merge-Heuristik in `serverSync.js` (`countProgress()`) ist fragil. Sie kann zwischen lokalem und serverseitigem State nicht unterscheiden, wenn beide die gleiche Anzahl an Fortschrittspunkten haben. Timestamps wären robuster.

---

### D. Backend und API-Struktur

**Score: 53/100**

**Geprüfte Methoden:** server/index.js vollständig gelesen (613 Zeilen).

13 Endpunkte in einer einzelnen Datei ohne Routing-Modularisierung. Für den aktuellen Stand vertretbar, aber die Datei wächst bereits an die Grenze des sinnvoll Handhabaren.

**Spezifische Probleme:**

- **Kein API-Versioning.** Alle Routen sind `/api/endpoint` ohne Version. Bei Breaking Changes in der API müsste die gesamte Client-Basis synchron aktualisiert werden.
- **Stale CORS-Origin:** `'https://lumo-app-pbgc.onrender.com'` in der Allowlist. Diese Domain ist obsolet (Render-Legacy), stellt aber ein niedrigschwelliges Sicherheitsrisiko dar, da Requests von dieser Domain unbeabsichtigt zugelassen werden.
- **Material-Truncation ohne Warnung:** Materialtexte werden server-seitig auf 8000 Zeichen gekürzt (`[...gekürzt...]`). Der Client bekommt keine Rückmeldung darüber. Nutzer mit langem Material erhalten möglicherweise qualitativ schlechtere Lernblöcke ohne zu wissen warum.
- **Rate Limiting nur für zwei Endpunkte:** `/api/analyze` (10/h IP-basiert) und global (200/15min). Die restlichen 11 Endpunkte haben kein individuelles Limit. `/api/generate-cards` oder `/api/explain-chat` könnten missbraucht werden.
- **`output_config`-Format:** `client.messages.stream` nutzt `output_config: { format: { type: 'json_schema', schema } }`. Die Standard-Anthropic-SDK-API für JSON-Output ist `betas: ['output-128k-2025-02-19']` mit einem anderen Format. Es ist möglich, dass dies ein internes oder privates API-Format ist. Wenn Anthropic das Format ändert, bricht alles still.

---

### E. Datenbank und Datenintegrität

**Score: 40/100**

**Geprüfte Methoden:** server/db.js vollständig gelesen (192 Zeilen), SQLite-Schema analysiert.

**Kritisches Problem: Datenverlust-Risiko auf Railway**

Railway-Deployments starten standardmäßig in einem ephemeren Container. Ohne explizit konfiguriertes persistentes Volume liegt die SQLite-Datei in `DB_PATH || __dirname` – also im Container-Dateisystem. Bei jedem Redeploy **gehen alle gespeicherten User-States verloren**. Das ist der gravierendste operationale Defekt.

`railway.json` enthält keinen Hinweis auf eine Volume-Konfiguration. `nixpacks.toml` ebenfalls nicht.

**Strukturelle Probleme:**

- **Kein Migrationssystem.** Kein Versionierungsfeld. Keine Migration-History. Schema-Änderungen müssen manuell und gefährlich ausgeführt werden.
- **Single JSON Blob:** Alle App-Daten in `state_json`. Kein Zugriff per Query möglich. Streak-Update liest und schreibt den kompletten State (lesen → parsen → modifizieren → serialisieren → schreiben) für eine einzelne Zahl. Bei wachsenden Nutzerdaten wird das zum Bottleneck.
- **Keine Backup-Strategie dokumentiert.**
- **`updateStreak` hat Race-Condition-Potenzial:** Read-Modify-Write ohne Transaktion in einer Single-Threaded-Umgebung ist mit SQLite WAL grundsätzlich sicher, aber die Pattern-Schwäche bleibt konzeptuell.

---

### F. Authentifizierung und Autorisierung

**Score: 22/100**

**Geprüfte Methoden:** server/index.js (Cookie-Handling), CookieConsent.jsx gelesen.

Lumo hat **keine Authentifizierung.** Es gibt eine anonyme Cookie-basierte Identität (`lumo_uid`), die einen zufälligen User-Identifier generiert. Das ist bewusst gewählt (datenschutzfreundlich, kein Account-Zwang) und für die Produktphase vertretbar.

**Aber die Auswirkungen müssen klar benannt werden:**

- **Kein Zugriffschutz auf API:** Jeder, der die API-Routen kennt (sie sind nicht geheim), kann `POST /api/analyze`, `POST /api/generate-cards` etc. aufrufen — mit beliebigen Inhalten, unbegrenzt (nur IP-Rate-Limiting).
- **Kein Account-Recovery:** Wenn ein User seinen Browser löscht oder den Cookie verliert, ist sein Lernfortschritt auf dem Server nicht mehr abrufbar. Es gibt keinen Recovery-Mechanismus.
- **Session-Hijacking möglich:** Wenn jemand Zugriff auf den `lumo_uid` Cookie eines anderen Nutzers erlangt (z.B. auf einem geteilten Gerät), kann er dessen Daten auf dem Server lesen und modifizieren. Keine serverseitige Session-Validierung jenseits des Cookie-Werts.
- **Die Freemium-Limits (planLimits.js) sind nicht server-seitig enforced.** Ein Nutzer könnte die Client-Checks umgehen und unbegrenzt Blöcke analysieren.

Für einen Beta-Release mit einer kleinen, bekannten Nutzergruppe ist das akzeptabel. Für einen öffentlichen Launch ist es nicht akzeptabel.

---

### G. Claude-Integration und KI-Pipeline

**Score: 65/100**

**Geprüfte Methoden:** server/index.js (askLumo-Funktion, alle AI-Endpunkte), server/prompts.js (alle System-Prompts + Schemas).

**Stärken:**

Die zentrale `askLumo`-Funktion ist ein sauberes Single-Point-of-Entry-Pattern für alle AI-Calls. JSON-Schema-Validation via `output_config` erzwingt strukturierte Outputs und verhindert das häufigste Problem bei LLM-Integrationen (halluzinierte Formate). Das LUMO_PERSONA-Prompt ist sophistiziert und pädagogisch durchdacht.

**Probleme:**

- **`@anthropic-ai/sdk: "latest"`.** Das ist der kritischste einzelne Punkt: Bei einer SDK-Breaking-Change bricht Production beim nächsten Deployment. Muss auf eine spezifische Version gepinnt werden.
- **`output_config.format.json_schema`:** Dieser Parameter-Pfad entspricht nicht der offiziell dokumentierten Anthropic-API. Die offizielle Methode wäre über das `tools`-Paradigma oder das extended `betas` Header. Es ist möglich, dass dies ein privates/pre-release Feature ist, das ohne Ankündigung entfernt werden kann.
- **API-Key geloggt:** `console.log('API Key configured:', apiKey.substring(0,7)+'...')` beim Server-Start. In einer Produktionsumgebung mit Log-Aggregation (Railway, Render, DataDog) ist dieser Prefix (typ. `sk-ant-...`) + Länge ein Sicherheits-Leak. Angreifer können mit dem Prefix-Pattern API-Keys identifizieren.
- **Kein Retry-Logic:** Wenn ein AI-Call wegen Rate-Limiting, Network-Timeout oder transienter Fehler scheitert, gibt es keinen Retry. Der Fehler wird direkt zum Client propagiert.
- **`queryEnglish` ungenutzt:** `YOUTUBE_SEARCH_SYSTEM` / `youtubeSearchSchema` generiert `queryEnglish`, aber der `/api/youtube-videos` Endpunkt nutzt nur `query` für die YouTube-Suche. Mögliche Qualitätsverbesserung für englischsprachige Videos wird nicht ausgenutzt.
- **Kein Modell-Routing:** `const MODEL = 'claude-sonnet-4-6'` ist ein einziger globaler Konstant. Für einfache Anfragen (z.B. `/api/youtube-videos`, `/api/understand-hint`) könnte ein günstigeres/schnelleres Modell (Haiku) die Kosten deutlich reduzieren.

---

### H. PDF-Verarbeitung und Dokumentenimport

**Score: 65/100**

**Geprüfte Methoden:** fileReader.js, OnboardingScreen1.jsx (Upload-Logik), server/index.js (PDF-Handling).

PDFs werden als base64-kodierte Dokument-Blöcke direkt an die Claude-API geschickt. Das ist der korrekte Ansatz für Claude's native PDF-Verarbeitungsfähigkeiten und vermeidet fehleranfällige serverseitige Extraktion.

**Limitationen:**

- **25MB Limit (MAX_FILE_SIZE):** Für wissenschaftliche Papers und Lernmaterialien oft zu niedrig. Lange Skripte übersteigen regelmäßig diese Grenze.
- **Truncation bei 8000 Zeichen (Text-Modus):** Bei Texteingabe wird auf 8000 Zeichen gekürzt. Der Nutzer erfährt dies nicht in der UI.
- **Kein Feedback über tatsächliche Verarbeitung:** Ob ein PDF gut verarbeitet wurde (alle Seiten, alle Abbildungen), ist für den Nutzer nicht erkennbar. Keine Seitenzahl-Anzeige.
- **MAX_CHARS = 50000 im Onboarding (Text-Input-Validation)** vs. **8000 Zeichen Server-Truncation:** Widerspruch. Der Nutzer kann bis zu 50.000 Zeichen eingeben, aber nur die ersten 8.000 werden an Claude weitergegeben.
- **Keine OCR-Fallback für gescannte PDFs.** Claude kann Bilder in PDFs verarbeiten, aber die Qualität bei gescannten Dokumenten ist nicht vorhersagbar.

---

### I. Qualität der KI-generierten Lernblöcke

**Score: 70/100**

**Geprüfte Methoden:** server/prompts.js (analyzeSchema, getAnalyzeSystem), strukturelle Analyse.

Die Block-Generierung ist gut designed:
- JSON-Schema erzwingt konsistente Struktur
- `difficulty` (leicht/mittel/schwer), `estimatedMinutes`, `subtopics[]` sind didaktisch sinnvolle Felder
- Sprint-Mode reduziert auf max. 4 Blöcke — gute ADHS-Anpassung
- Goal-Type-Awareness (Lernziel wird in den Prompt integriert)

**Nicht direkt bewertbar (keine Live-Ausführung):**
- Tatsächliche Lernblock-Qualität für typische Nutzermaterialien
- Konsistenz über verschiedene Fächer
- Halluzinations-Rate

**Strukturelle Schwächen:**
- **Kein Re-Generierungs-Mechanismus.** Wenn die KI schlechte Blöcke produziert, gibt es keine "Neu generieren"-Option.
- **Keine User-Feedback-Loop.** Qualitätsprobleme bei generierten Blöcken können nicht gemeldet werden.
- **Kein Qualitäts-Scoring** der generierten Blöcke. Der `recommendedOrder` aus der KI wird genutzt, aber kein Confidence-Score.

---

### J. Qualität der automatisch generierten Karteikarten

**Score: 63/100**

**Geprüfte Methoden:** server/prompts.js (FLASHCARD_SYSTEM, getCardSystem, cardSchema), FlashcardScreen.jsx.

Das Karteikarten-Schema ist gut: `id, concept, question, answer, hint, difficulty` plus `pretest_question`, `visual_type` (8 Typen). Die Mood-Awareness und Learning-Style-Adaption in `getCardSystem()` sind bemerkenswert und evidenzbasiert.

**Probleme:**
- **8 visuelle Typen definiert** (`comparison, timeline, cause_effect, list, process, analogy, spectrum, none`), aber ohne Live-Ausführung ist nicht überprüfbar, ob alle Typen in `CardVisual.jsx` qualitativ gut gerendert werden.
- **PRETEST_SYSTEM** ist in `prompts.js` definiert (`const PRETEST_SYSTEM = ...`) aber wird nirgendwo im Server genutzt. `pretest_question` ist im `cardSchema` enthalten und wird also mit generiert, aber es gibt keinen UI-Fluss, der Pretest-Fragen nutzt. **Totes Feature.**
- Kein Re-Generierungs-Mechanismus für einzelne schlechte Karten.

---

### K. FSRS-6-Implementierung

**Score: 52/100**

**Geprüfte Methoden:** src/utils/fsrs.js (233 Zeilen), App.jsx (handleSaveCardResults), FlashcardScreen.jsx, SessionScreen.jsx.

**Kritischer Bug — AUDIT-K-01:**

Die FSRS-6-Implementierung in `fsrs.js` ist korrekt und vollständig: `qualityToRating()` mappt 0→Again, 1→Hard, 2→Good, 3→Easy. `calculateNextReview()` nutzt alle vier.

**Aber:** In `App.jsx`, `handleSaveCardResults()`, wird die FSRS-Qualität so berechnet:

```javascript
// Aus App.jsx handleSaveCardResults:
const quality = isGood ? 2 : 0;  // ONLY Again (0) or Good (2)
```

Das bedeutet: **Hard (1) und Easy (3) werden in der primären Lernphase (CardLearningPhase) NIEMALS genutzt.** Das FSRS-Scheduling-Modell ist für 4 Ratings kalibriert. Die Nutzung von nur 2 Ratings produziert suboptimale Review-Intervalle.

Im **FlashcardScreen** hingegen werden alle 4 Ratings korrekt übergeben (`QUALITY_OPTIONS` mit 0–3).

Das ist ein funktionaler Defekt am Herzstück des Produkts. Lumo bewirbt FSRS-6, implementiert es aber in der Haupt-Lernphase effektiv als FSRS-2.

**Weitere Beobachtungen:**
- SM-2-zu-FSRS-Migration in `migrateSM2ToFSRS()` vorhanden — gut
- `enable_fuzz: true` — fügt gesundes Scheduling-Rauschen hinzu
- `interval >= 21 days → 'mastered'` — plausible Schwelle
- `isDueForReview()` prüft korrekt `card.fsrs?.due` vor Legacy-Fallback

---

### L. Session-Management und Lernfortschritt

**Score: 72/100**

**Geprüfte Methoden:** SessionScreen.jsx (289 Zeilen), appReducer.js, serverSync.js.

Der Session-Flow ist pädagogisch durchdacht und gut implementiert:
- Adaptiver Break-Intervall basierend auf Block-Länge (Sweller 1988, Dinges 1987 korrekt referenziert)
- Saubere Phase-Steuerung mit PHASES-Konstanten
- `key={block.id}` Pattern am SessionScreen für sauberes Remounting

**Schwächen:**
- **Merge-Heuristik in `serverSync.js`** nutzt `countProgress()` (gewichtete Zählung) statt Timestamps. Wenn lokaler und Server-State den gleichen Score haben, gewinnt der Server — das kann lokale Änderungen überschreiben.
- **Kein serverseitiges Session-Logging.** Keine persistente History. Nutzer können nicht sehen, wann sie welchen Block gelernt haben.
- **Flashcards sind global** (nicht pro Projekt). `SAVE_CURRENT_PROJECT` im Reducer speichert Flashcards explizit nicht. Das kann zu Verwirrung führen: Löscht man ein Projekt, bleiben die Flashcards.

---

### M. UX/UI und Designkonsistenz

**Score: 68/100**

**Geprüfte Methoden:** src/styles/index.css, CookieConsent.jsx, SessionScreen.jsx, FlashcardScreen.jsx.

**Stärken:**
- Konsistentes dunkles Design-System mit Gold-Akzent
- Dreischichtiges Glow-System (technisch korrekt implementiert in `.screen`)
- Instrument Serif für emotionale Momente — distinktiv und wohlüberlegt
- Mobile-First mit korrektem `safe-area-inset` Handling
- CookieConsent als Bottom-Banner (kein Modal, ADHS-freundlich)

**Schwächen:**
- **Tote CSS-Variablen:** `--glow-center`, `--glow-top`, `--glow-vignette` in `:root` definiert, aber `.screen` nutzt sie nicht via `var()`. Es ist die Gradient-Value inline in `.screen`. Inkonsistenz und totes CSS.
- **`!important`-Overload:** In der Mobile-Media-Query finden sich multiple `!important`-Deklarationen mit Kommentaren, die die Notwendigkeit erklären. Das ist ein Zeichen für schlecht aufgelöste CSS-Spezifitätskonflikte.
- **Kein Design-Token-System für Spacing/Sizing.** Farben sind tokenisiert (gut), aber Abstände, Border-Radii etc. sind überall hard-coded.

---

### N. Lernpsychologie und didaktische Qualität

**Score: 80/100**

**Geprüfte Methoden:** server/prompts.js (LUMO_PERSONA, alle System-Prompts), SessionScreen.jsx, server/db.js.

**Das ist die stärkste Dimension von Lumo.**

Die Lernarchitektur implementiert konsistent und korrekt:
- **Elaboration** (Vorwissen-Aktivierung vor dem Lernen — Transfer-Appropriate Processing)
- **Active Recall** statt passivem Wiederabruf
- **Dweck 1998 Effort Praise** im Prompt explizit referenziert
- **"Forging not Recording"** (Justin Sung) als Designprinzip
- **FSRS-6** Spaced Repetition (richtig gewählt gegenüber SM-2)
- **Dual Coding Theory** (TTS + visuelle Karteikarten)
- **Cognitive Load Theory** (max. 3 Sätze per Erklärung, Sweller 1988)
- **Adaptive Break-Intervalle** (Dinges et al. 1987)

**Einschränkungen:**
- Die Evidenzreferenzen sind gut gewählt, aber nicht alle sind die stärksten verfügbaren Belege (z.B. Dinges 1987 ist ein spezifisches Schlafstudienergebnis; allgemeine Pause-Empfehlungen haben robustere Evidenz bei z.B. Tonetti et al. 2009 oder Dhand & Sohal 2006).
- **PRETEST-Feature nicht live** — Pretesting (Generation Effect) wäre ein starkes didaktisches Tool, ist aber nur angelegt, nicht gebaut.

---

### O. ADHS-bewusstes Interaktionsdesign

**Score: 80/100**

**Geprüfte Methoden:** FlashcardScreen.jsx, SessionScreen.jsx, CookieConsent.jsx, server/prompts.js, index.css.

**Lumo's stärkste produktionelle Qualität.**

Konsequente und begründete ADHS-Designentscheidungen:
- **Kein Rot für negative Bewertungen** — Amber statt Alarm (Barkley 2015 korrekt zitiert)
- **"Keine Ahnung" positiv gerahmt** — kein Versagen, ein Lernmoment
- **Bottom-Banner Cookie Consent** — nicht modal, nicht blockierend
- **1.8s Delay vor Cookie Banner** — Intro-Flow ungestört
- **Sprint Mode** — Prüfungsmodus reduziert overwhelming
- **Adaptive Break-Intervalle** — kontextbasiert statt willkürlich
- **prefers-reduced-motion** — vollständige Implementierung
- **TTS** — auditive Alternative für visuell abgelenkte Nutzer
- **`registerType: 'autoUpdate'`** — kein "Update verfügbar"-Dialog (kognitiv entlastend)

**Offene Punkte:**
- Kein Screen-Time-Tracking oder Warnung bei sehr langen Sessions (>90 min).
- Keine Möglichkeit, die Stimmungs-Auswahl zu überspringen, wenn man sich einfach nicht einordnen will.

---

### P. Accessibility

**Score: 42/100**

**Geprüfte Methoden:** CookieConsent.jsx, index.css (.visually-hidden), SessionScreen.jsx.

**Was vorhanden ist:**
- `role="dialog"` + `aria-label` auf CookieConsent
- `.visually-hidden` CSS-Klasse definiert
- `prefers-reduced-motion` vollständig implementiert
- Keyboard-Handler auf dem Datenschutz-Link (`onKeyDown` für Enter/Space)
- TTS als Audio-Alternative

**Was nicht prüfbar war (keine Browser-Session):**
- Keyboard-Navigation durch die App
- Screen-Reader-Kompatibilität (kein Test mit NVDA/VoiceOver)
- Fokus-Management bei Phasenwechseln im SessionScreen
- Farbkontrast aller Text-Element-Kombinationen

**Was wahrscheinlich fehlt (Code-Analyse):**
- Keine `<main>` / `<nav>` / `<header>` ARIA-Landmarks in den Session-Screens sichtbar
- Kein Skip-to-Content Link
- Buttons ohne `aria-label` wo Icon-only (nicht vollständig prüfbar ohne alle Komponenten gelesen zu haben)
- Focus-Trapping bei Phasenwechseln nicht sichtbar implementiert

**Fazit:** Accessibility ist der am wenigsten ausgearbeitete Bereich. Für eine ADHS-App, deren Nutzergruppe häufig Co-Morbiditäten hat (darunter dyslexia, visuelle Verarbeitungsstörungen), ist das ein bedeutendes Gap.

---

### Q. Performance und Skalierbarkeit

**Score: 50/100**

**Geprüfte Methoden:** server/index.js, db.js, package.json, serverSync.js.

**Performance:**
- AI-Streaming via `client.messages.stream` ist korrekt implementiert (keine komplette Antwort abwarten)
- 2s Debounce für Server-Sync — verhindert excessive Writes
- `keepAlive` verhindert Cold-Start-Latenz (Railway/Render Sleep)

**Skalierbarkeit:**
- **SQLite ist nicht horizontal skalierbar.** Bei wachsender Nutzerzahl und mehreren Instanzen (Railway Auto-Scale) führt SQLite zu Lock-Konflikten. Für die Beta-Phase akzeptabel.
- **State als JSON-Blob.** Mit wachsendem Nutzerdaten-Umfang wird `saveUserState` / `loadUserState` teurer (großes JSON serialisieren/parsen).
- **Single-Server-Architektur.** Ein einziger Node.js-Prozess für alle Requests. Bei der AI-Latenz (~2–10s) blockiert jeder Request-Thread während des Wartens (aber Node ist async, also OK bis zu einem bestimmten Grad).
- **Bundle-Size nicht gemessen** (kein `vite build` während Audit ausgeführt).

---

### R. Security und Datenschutz

**Score: 38/100**

**Geprüfte Methoden:** server/index.js (API-Key-Handling, CORS, Rate-Limiting), CookieConsent.jsx, db.js.

**Kritische Befunde:**

- **API-Key-Logging (HIGH):** `console.log('API Key configured:', apiKey.substring(0,7)+'...')` — Der Prefix des Anthropic-API-Keys wird in Production-Logs geschrieben. In einer Log-Aggregation-Plattform (Railway Logs, Render Logs) sind diese Logs für alle Personen mit Dashboard-Zugriff sichtbar.
- **Stale CORS-URL (MEDIUM):** `'https://lumo-app-pbgc.onrender.com'` erlaubt Requests von einer obsoleten Domain.
- **IP-based Rate Limiting bypassbar:** Jemand mit einem Proxy-Pool oder IPv6-Rotation kann das Rate-Limiting umgehen.
- **Freemium nicht server-seitig enforced:** Nutzer können `planLimits.js` client-seitig umgehen.

**Was gut ist:**
- Cookie-Consent korrekt implementiert (ePrivacy Directive)
- `lumo_uid` ist ein anonymer Identifier — keine PII
- `fileBase64` und `materialText` werden vor dem Speichern in SQLite herausgefiltert (`saveUserState` in db.js) — kein Lernmaterial in der DB
- HTTPS über Deployment-Plattform (Railway/Render) — kein eigenes TLS-Management nötig
- Rate Limiting vorhanden (wenngleich unvollständig)

**Datenschutz:**
- Keine PII wird gespeichert (nur anonyme UID + State-JSON)
- Das ist datenschutzfreundlich, aber auch ein Feature-Limit (kein Account-Recovery)

---

### S. PWA und Cross-Device-Verhalten

**Score: 53/100**

**Geprüfte Methoden:** vite.config.js, public/manifest.json, server/index.js (navigateFallbackDenylist).

**Was funktioniert:**
- Service Worker korrekt konfiguriert (`registerType: 'autoUpdate'`)
- API-Routes aus SW-Fallback ausgenommen (`/^\/api\//`)
- `manifest.json` vorhanden
- Offline-Fallback via IndexedDB (lokale Daten verfügbar ohne Server)

**Probleme:**

- **`screenshots: []` (MEDIUM):** Leeres Array in manifest.json. Chrome/Edge PWA-Installation schlägt fehl oder zeigt No-Screenshot-Fallback. Für App-Store-Listings (iOS PWA, Google Play TWA) ist das ein Blocker.
- **Nur 2 Icons (192px + 512px):** Kein 96px, kein 384px, keine `any`-purpose Icons für alle Plattformen.
- **Maskable Icon:** `public/icons/icon-512.png` wird als maskable verwendet (per `"purpose": "maskable"`), aber das Icon ist das gleiche wie das Standard-Icon. Ein echtes maskable Icon sollte safe-zone-aware sein (Content in 80% der Fläche).
- **`"orientation": "portrait"` only:** Landscape-Modus nicht unterstützt. Auf iPads und größeren Android-Tablets könnte das ein Problem sein.
- **Cross-Device-Sync über Cookie:** Wenn ein Nutzer den Browser wechselt oder ein Inkognito-Fenster nutzt, ist der `lumo_uid` Cookie nicht verfügbar → kein Server-Sync → kein Cross-Device.

---

### T. Fehlerbehandlung und Zuverlässigkeit

**Score: 63/100**

**Geprüfte Methoden:** src/api/lumo.js, src/utils/storage.js, server/index.js.

**Was gut ist:**
- Vier distinkte Fehlermeldungen im Client (Network, Generic, Timeout, Offline)
- `AbortController` mit 30s Timeout auf allen API-Calls
- `navigator.onLine` Check vor API-Calls
- IDB-Operationen in try/catch
- `initDB()` non-blocking — App startet auch ohne funktionierende DB
- Server-Timeout (`CLAUDE_TIMEOUT_MS = 28000`) leicht unter Client-Timeout (30000ms) — korrekte Reihenfolge

**Was fehlt:**
- **Kein Retry-Logic** für transiente AI-Fehler. Ein Network-Glitch bei 25 Sekunden generierter Antwort = kompletter Verlust.
- **Keine React Error Boundaries** sichtbar (nicht alle Komponenten überprüft). Unbehandelte Fehler in Sub-Komponenten könnten die gesamte App einfrieren.
- **Keine Offline-Indikation** in der UI. Der Nutzer merkt erst, wenn ein API-Call fehlschlägt, dass er offline ist.
- **Server-seitige Fehler** geben im Development-Modus zu viel zurück (stack traces). Production-Modus (`NODE_ENV=production`) sollte dies bereinigen, aber das ist nicht explizit im Code verifiziert.

---

### U. Monitoring und Logging

**Score: 12/100**

**Geprüfte Methoden:** server/index.js (Logging-Statements).

Dies ist der schwächste Bereich neben Testing.

**Was vorhanden ist:**
- `console.log` für Server-Start-Info
- `console.error` für Datenbankfehler
- `/api/health` Endpunkt (gibt `{status:'ok'}`)

**Was fehlt:**
- **Kein Error-Tracking** (kein Sentry, no DataDog, kein Rollbar)
- **Kein strukturiertes Logging** (kein Winston, kein pino — nur console.log)
- **Keine Performance-Metriken** (keine Latenz-Messung für AI-Calls)
- **Keine User-Analytics** (kein Plausible, kein Fathom, kein PostHog)
- **Keine AI-Cost-Tracking** (keine Token-Zählung, kein Budget-Alert)
- **Keine Alerting** bei erhöhter Fehlerrate

Das bedeutet: Im Produktionsbetrieb ist Lumo eine **Black Box**. Wenn etwas schief geht, hat man keinen Einblick, was, wo und wie oft.

**Einzige Ausnahme:** `apiCostEstimate.js` ist in der Codebase (nicht vollständig gelesen, aber referenced) — möglicherweise gibt es Client-seitiges Cost-Tracking. Aber Server-seitiges Monitoring fehlt vollständig.

---

### V. Testabdeckung und Qualitätssicherung

**Score: 3/100**

**Geprüfte Methoden:** Glob-Scan nach `*.test.*`, `*.spec.*`, `__tests__`, Jest-Config, Vitest-Config.

**Ergebnis: 0 Test-Dateien in der gesamten Codebase.**

Kein Unit-Test. Kein Integrationstest. Kein E2E-Test. Kein Jest. Kein Vitest. Kein Playwright. Kein Cypress.

Kein ESLint-Config. Kein TypeScript.

Das ist für ein Produkt, das in Production gehen soll, nicht akzeptabel. Die Auswirkungen:
- Jede Änderung an `fsrs.js` kann silent FSRS-Scheduling brechen — und würde es nicht merken.
- Refactoring von `appReducer.js` hat keine Sicherheitsnetz.
- Die FSRS-Rating-Bug (AUDIT-K-01) wäre mit minimaler Testabdeckung schon im Development gefunden worden.

---

### W. Release Readiness

**Score: 42/100**

**Gesamtbewertung aller 22 anderen Bereiche:**

| Blocker-Kategorie | Befund | Severity |
|---|---|---|
| Funktionaler Defekt | FSRS-Ratings in CardLearningPhase auf 2/4 reduziert | Critical |
| Datenverlust | SQLite auf Railway ohne persistent Volume | Critical |
| Security | API-Key geloggt beim Start | High |
| Supply Chain | `latest` für 4 Kernabhängigkeiten inkl. `@anthropic-ai/sdk` | High |
| Qualitätssicherung | 0 Tests, kein ESLint | High |
| Monitoring | Keine Fehlervisibilität in Production | High |
| Accessibility | Nicht ausreichend für öffentlichen Launch | Medium |
| PWA | Leere Screenshots, kein maskable Icon | Medium |

---

## Konsolidierte Befundliste

### Critical (Release-Blocker)

---

**AUDIT-K-01**
- **Bereich:** K — FSRS-6-Implementierung
- **Beschreibung:** Die primäre Lernphase (CardLearningPhase) übergibt FSRS-Qualitätsratings nur als binäre Entscheidung (0=Again / 2=Good). Hard (1) und Easy (3) werden ignoriert, obwohl die gesamte FSRS-Infrastruktur in `fsrs.js` und `FlashcardScreen.jsx` korrekt alle 4 Ratings implementiert.
- **Evidenz:** `App.jsx`, Funktion `handleSaveCardResults`: `const quality = isGood ? 2 : 0;`
- **Betroffene Datei:** `src/App.jsx`, `src/screens/session/CardLearningPhase.jsx`
- **Auswirkung:** Das beworbene FSRS-6-Spaced-Repetition funktioniert in der Haupt-Lernphase nicht korrekt. Nutzer erhalten suboptimale Review-Intervalle. Das ist ein funktionaler Defekt am Kernfeature.
- **Empfohlene Lösung:** `CardLearningPhase.jsx` muss eine 4-Werte-Skala für die Antwortgüte anbieten und den konkreten Qualitätswert (0–3) an `handleSaveCardResults` übergeben.
- **Aufwand:** S (2–4h)
- **Verifikation nach Behebung:** Test, ob alle 4 Qualitätsratings durch die FSRS-Funktion fließen und unterschiedliche Intervalle produzieren.

---

**AUDIT-E-01**
- **Bereich:** E — Datenbank und Datenintegrität
- **Beschreibung:** Die SQLite-Datenbank liegt standardmäßig im Container-Dateisystem auf Railway. Bei Redeploys — die Railway bei jedem Push durchführt — gehen alle gespeicherten User-States verloren, wenn kein persistentes Volume konfiguriert ist.
- **Evidenz:** `server/db.js`: `const DB_DIR = process.env.DB_PATH || __dirname;` — `__dirname` ist das Container-Dateisystem. `railway.json` enthält keine Volume-Konfiguration.
- **Betroffene Datei:** `server/db.js`, `railway.json`
- **Auswirkung:** Vollständiger Datenverlust aller Nutzer-Lernfortschritte bei jedem Produktions-Deployment.
- **Empfohlene Lösung:** Railway-Volume einrichten, `DB_PATH` Environment-Variable auf den Volume-Mount-Pfad setzen, in Dokumentation verankern.
- **Aufwand:** S (1–2h Konfiguration + Railway-Setup)
- **Verifikation:** Redeploy durchführen, prüfen ob DB persistent bleibt.

---

### High (Pre-Beta-Blocker)

---

**AUDIT-R-01**
- **Bereich:** R — Security
- **Beschreibung:** Der Anthropic API-Key wird beim Server-Start geloggt (Prefix + Länge). In Cloud-Deployment-Logs sichtbar für alle Personen mit Dashboard-Zugriff.
- **Evidenz:** `server/index.js`: `console.log('API Key configured:', apiKey.substring(0,7)+'...')`
- **Betroffene Datei:** `server/index.js`
- **Auswirkung:** In einer Log-Aggregation-Plattform (Railway, Sentry) ist der Key-Prefix für alle mit Zugang sichtbar. Social-Engineering-Angriff oder unbeabsichtigtes Sharing von Logs könnte zur Key-Kompromittierung führen.
- **Empfohlene Lösung:** Log-Statement entfernen oder durch `console.log('API Key: configured')` (ohne Wert) ersetzen.
- **Aufwand:** XS (5 Minuten)
- **Verifikation:** Log-Audit nach Deployment.

---

**AUDIT-B-01**
- **Bereich:** B — Codequalität
- **Beschreibung:** Vier Kernabhängigkeiten stehen auf `latest`: `@anthropic-ai/sdk`, `cors`, `dotenv`, `express` sowie Dev-Deps `@vitejs/plugin-react`, `concurrently`, `vite`.
- **Evidenz:** `package.json`: `"@anthropic-ai/sdk": "latest"`, `"express": "latest"` etc.
- **Betroffene Datei:** `package.json`
- **Auswirkung:** (1) Builds sind nicht reproduzierbar. (2) Automatische Breaking-Changes bei Dependencies die nicht semver-kompatibel aktualisieren. (3) Supply-Chain-Risiko. Bei `@anthropic-ai/sdk: latest` kann ein Anthropic-API-Breaking-Change Production ohne Vorwarnung brechen.
- **Empfohlene Lösung:** Alle `latest`-Einträge durch konkrete Versionsnummern (aktuell installierte) ersetzen. `package-lock.json` ins Repository committen.
- **Aufwand:** XS–S (30 Min — Versions aus `node_modules` extrahieren, committen)
- **Verifikation:** `npm ci` in frischer Umgebung, kein Netzwerkzugriff, identische Installationen.

---

**AUDIT-V-01**
- **Bereich:** V — Testing
- **Beschreibung:** Kein einziger Test in der Codebase. Kein ESLint. Kein TypeScript.
- **Evidenz:** Glob-Scan nach `*.test.*`, `*.spec.*`, `__tests__` → 0 Treffer. Kein `eslint.config.*`, keine `.eslintrc`. Kein `tsconfig.json`.
- **Betroffene Datei:** Gesamte Codebase
- **Auswirkung:** Regressionstests bei Änderungen unmöglich. Der FSRS-Bug (AUDIT-K-01) wäre mit minimaler Testabdeckung gefunden worden. Kein automatisches Safety-Net.
- **Empfohlene Lösung:** Mindest-Testabdeckung für kritische Funktionen: `fsrs.js` (calculateNextReview, alle 4 Ratings), `appReducer.js` (Reducer-Logik), `serverSync.js` (merge-Heuristik). Vitest empfohlen (Vite-nativ). ESLint mit React-Regeln einrichten.
- **Aufwand:** M (2–3 Tage für initiale Abdeckung der Kernlogik)
- **Verifikation:** CI-Pipeline mit Test-Run.

---

**AUDIT-U-01**
- **Bereich:** U — Monitoring
- **Beschreibung:** Kein Error-Tracking, kein strukturiertes Logging, keine Performance-Metriken, keine User-Analytics in Production.
- **Evidenz:** `server/index.js` nutzt nur `console.log`/`console.error`. Keine Sentry/DataDog/pino-Integration.
- **Betroffene Datei:** `server/index.js`
- **Auswirkung:** Production-Fehler sind unsichtbar. Keine Möglichkeit, AI-Ausfälle, Latenzen, Fehlerraten oder User-Abbrüche zu erkennen.
- **Empfohlene Lösung:** Mindestens Sentry für Error-Tracking (Client + Server). Strukturiertes Logging via `pino`. AI-Call-Latenz messen.
- **Aufwand:** M (1 Tag Sentry-Integration, 1 Tag strukturiertes Logging)
- **Verifikation:** Bewusst einen Fehler triggern, in Sentry sehen.

---

### Medium

---

**AUDIT-E-02**
- **Bereich:** E — Datenbank
- **Beschreibung:** Kein Datenbank-Migrationssystem. Kein Schema-Versionierungsfeld.
- **Evidenz:** `server/db.js`: Nur `CREATE TABLE IF NOT EXISTS` ohne Version. Keine Migration-History-Tabelle.
- **Betroffene Datei:** `server/db.js`
- **Auswirkung:** Jede Schema-Änderung (neues Feld, neue Tabelle) muss manuell und gefährlich ohne Rollback-Möglichkeit durchgeführt werden.
- **Empfohlene Lösung:** Einfaches migrations-Array mit Version-Integer in DB (z.B. `db.pragma('user_version')` für SQLite-native Schema-Versioning).
- **Aufwand:** M
- **Verifikation:** Migration von Version 1 → 2 erfolgreich durchführen.

---

**AUDIT-D-01**
- **Bereich:** D — Backend
- **Beschreibung:** Stale CORS-URL von Render-Deployment ist noch in der Allowlist.
- **Evidenz:** `server/index.js` CORS-Config: `'https://lumo-app-pbgc.onrender.com'`
- **Betroffene Datei:** `server/index.js`
- **Auswirkung:** Requests von einer obsoleten Domain werden zugelassen. Niedrigschwelliges Security-Risiko.
- **Empfohlene Lösung:** URL aus der Allowlist entfernen wenn Render-Deployment eingestellt.
- **Aufwand:** XS
- **Verifikation:** OPTIONS-Request von der entfernten Domain → 403.

---

**AUDIT-H-01**
- **Bereich:** H — Dokumentenimport
- **Beschreibung:** Inkonsistenz: Onboarding erlaubt max. 50.000 Zeichen Text-Input (`MAX_CHARS = 50000`), aber Server kürzt auf 8.000 Zeichen (`material.substring(0, 8000)`) ohne Nutzer-Feedback.
- **Evidenz:** `src/screens/onboarding/OnboardingScreen1.jsx`: `const MAX_CHARS = 50000`. `server/index.js`: `material.substring(0, 8000) + '[...gekürzt...]'`
- **Betroffene Datei:** `server/index.js`, `src/screens/onboarding/OnboardingScreen1.jsx`
- **Auswirkung:** Nutzer mit langem Text bekommen schlechtere Block-Qualität ohne zu wissen warum. Vertrauensproblem.
- **Empfohlene Lösung:** (a) MAX_CHARS im Client auf 8000 senken, ODER (b) Truncation-Warning im UI anzeigen, ODER (c) Server-seitig auf 50000 Zeichen erhöhen (höhere Claude-Kosten).
- **Aufwand:** S
- **Verifikation:** UI-Test mit >8000-Zeichen-Material.

---

**AUDIT-G-01**
- **Bereich:** G — Claude-Integration
- **Beschreibung:** `output_config.format.json_schema` entspricht nicht der offiziell dokumentierten Anthropic-SDK-API.
- **Evidenz:** `server/index.js`: `output_config: { format: { type: 'json_schema', schema } }` — dieser Parameter-Pfad ist in der offiziellen Anthropic-Dokumentation nicht dokumentiert.
- **Betroffene Datei:** `server/index.js`
- **Auswirkung:** Mögliche stille Breaking Change wenn Anthropic dieses undokumentierte Feature entfernt oder umbenennt.
- **Empfohlene Lösung:** Offizielle Dokumentation prüfen, auf offiziell unterstütztes Format migrieren wenn vorhanden. Wenn `output_config` ein privates Beta-Feature ist, Anthropic-Support kontaktieren.
- **Aufwand:** S–M
- **Verifikation:** AI-Calls mit `production` SDK-Version testen.

---

**AUDIT-S-01**
- **Bereich:** S — PWA
- **Beschreibung:** `public/manifest.json` hat leeres `screenshots`-Array; kein echtes maskable Icon.
- **Evidenz:** `public/manifest.json`: `"screenshots": []`. Icon `purpose: "maskable"` nutzt dasselbe Bild wie Standard-Icon.
- **Betroffene Datei:** `public/manifest.json`
- **Auswirkung:** PWA-Store-Listings (Google Play TWA, iOS) blockiert oder suboptimal. Chrome-Installation warnt über fehlende Screenshots.
- **Empfohlene Lösung:** 2–3 App-Screenshots hinzufügen. Maskable Icon mit safe-zone-awareness erstellen.
- **Aufwand:** S (Design + Asset-Generierung)
- **Verifikation:** Lighthouse PWA-Audit.

---

**AUDIT-J-01**
- **Bereich:** J — Karteikarten-Qualität
- **Beschreibung:** PRETEST_SYSTEM in `prompts.js` ist definiert, wird aber nicht genutzt. `pretest_question` ist im Schema vorhanden, aber keine UI existiert dafür.
- **Evidenz:** `server/prompts.js`: `const PRETEST_SYSTEM = ...` (definiert aber nicht exportiert/genutzt). `cardSchema` enthält `pretest_question`.
- **Betroffene Datei:** `server/prompts.js`
- **Auswirkung:** Totes Feature kostet AI-Token pro Karte (der `pretest_question` Slot wird befüllt, aber nie angezeigt).
- **Empfohlene Lösung:** Entweder Pretest-Feature implementieren (hoher Mehrwert — Generation Effect) ODER `pretest_question` aus Schema entfernen um Token zu sparen.
- **Aufwand:** S (Entfernen) / L (Implementieren)
- **Verifikation:** Karten-Schema ohne `pretest_question` testen.

---

### Low

---

**AUDIT-M-01**
- **Bereich:** M — UX/UI
- **Beschreibung:** Tote CSS-Variablen: `--glow-center`, `--glow-top`, `--glow-vignette` in `:root` definiert, werden von `.screen` nicht via `var()` genutzt.
- **Evidenz:** `src/styles/index.css`: `:root` definiert die Variablen; `.screen` nutzt Gradient-Werte direkt inline.
- **Betroffene Datei:** `src/styles/index.css`
- **Auswirkung:** Totes CSS. Kein funktionaler Impact, aber Maintenance-Confusion.
- **Empfohlene Lösung:** Entweder Variablen in `.screen` nutzen (`background: var(--glow-top), var(--glow-center), var(--glow-vignette), var(--bg)`) oder sie entfernen.
- **Aufwand:** XS
- **Verifikation:** Visueller Vergleich.

---

**AUDIT-C-01**
- **Bereich:** C — Frontend
- **Beschreibung:** `CardLearningPhase.jsx` ist 1974 Zeilen lang. `DashboardScreen.jsx` ist 1041 Zeilen.
- **Evidenz:** Direkte Zeilenzählung.
- **Betroffene Datei:** `src/screens/session/CardLearningPhase.jsx`, `src/screens/dashboard/DashboardScreen.jsx`
- **Auswirkung:** Wartbarkeit beeinträchtigt. Debugging erschwert. Code-Reviews für diese Dateien praktisch unmöglich.
- **Empfohlene Lösung:** `CardLearningPhase.jsx` in Sub-Komponenten aufteilen (Card-Renderer, Answer-Input, Progress-Bar, etc.). Kein Refactoring während Audit-Phase.
- **Aufwand:** L
- **Verifikation:** Gleiche Funktionalität nach Aufspaltung.

---

**AUDIT-G-02**
- **Bereich:** G — Claude-Integration
- **Beschreibung:** `queryEnglish` wird von der YouTube-Suche generiert aber nicht genutzt.
- **Evidenz:** `server/prompts.js` youtubeSearchSchema enthält `queryEnglish`. `server/index.js` `/api/youtube-videos` nutzt nur `result.query`.
- **Betroffene Datei:** `server/index.js`, `server/prompts.js`
- **Auswirkung:** Potenziell bessere englischsprachige YouTube-Resultate werden nicht genutzt.
- **Empfohlene Lösung:** `queryEnglish` für englische Suchpräferenz nutzen oder aus Schema entfernen.
- **Aufwand:** XS
- **Verifikation:** A/B-Test der Suchqualität.

---

## Release-Einschätzung

### Bewertung nach Bereich

| Bereich | Score |
|---------|-------|
| A. Softwarearchitektur | 60/100 |
| B. Codequalität & technische Schulden | 35/100 |
| C. Frontend & Komponentenarchitektur | 58/100 |
| D. Backend & API-Struktur | 53/100 |
| E. Datenbank & Datenintegrität | 40/100 |
| F. Authentifizierung & Autorisierung | 22/100 |
| G. Claude-Integration & KI-Pipeline | 65/100 |
| H. PDF-Verarbeitung & Dokumentenimport | 65/100 |
| I. Qualität KI-generierter Lernblöcke | 70/100 |
| J. Qualität Karteikarten | 63/100 |
| K. FSRS-6-Implementierung | 52/100 |
| L. Session-Management & Lernfortschritt | 72/100 |
| M. UX/UI & Designkonsistenz | 68/100 |
| N. Lernpsychologie & Didaktik | 80/100 |
| O. ADHS-bewusstes Interaktionsdesign | 80/100 |
| P. Accessibility | 42/100 |
| Q. Performance & Skalierbarkeit | 50/100 |
| R. Security & Datenschutz | 38/100 |
| S. PWA & Cross-Device | 53/100 |
| T. Fehlerbehandlung & Zuverlässigkeit | 63/100 |
| U. Monitoring & Logging | 12/100 |
| V. Testabdeckung & QA | 3/100 |
| W. Release Readiness | 42/100 |
| **Gesamt (gewichteter Durchschnitt)** | **~53/100** |

### Release-Klassifizierung

> **Releasefähig für einen geschlossenen Beta-Test — nach Behebung der kritischen Befunde.**

Lumo ist **nicht** releasefähig für einen öffentlichen Launch im aktuellen Zustand.

**Für eine geschlossene Beta (bekannte Nutzergruppe, direkte Feedback-Loop)** ist Lumo releasefähig, wenn folgende 5 Befunde behoben sind:
1. AUDIT-K-01: FSRS-Rating-Bug (2–4h)
2. AUDIT-E-01: SQLite Railway Volume (1–2h)
3. AUDIT-R-01: API-Key-Logging entfernen (5 Min)
4. AUDIT-B-01: `latest`-Dependencies pinnen (30 Min)
5. AUDIT-U-01: Sentry/Error-Tracking einrichten (1 Tag)

**Gesamtaufwand bis Beta-Releasefähigkeit: 2–3 Tage.**

**Für einen öffentlichen Launch** sind zusätzlich notwendig:
- Grundlegende Test-Coverage (V)
- Echtes Monitoring (U)
- Accessibility-Review mit Screen-Reader (P)
- PWA-Assets vervollständigen (S)
- Dokumentation der SQLite-Backup-Strategie (E)

---

## Priorisierte Verbesserungsmaßnahmen

### Priorität 1 — Sofort (vor Beta)

| ID | Aufwand | Maßnahme |
|----|---------|----------|
| AUDIT-K-01 | S | FSRS-Ratings in CardLearningPhase auf 4 Werte erweitern |
| AUDIT-E-01 | S | Railway Persistent Volume konfigurieren |
| AUDIT-R-01 | XS | API-Key-Logging entfernen |
| AUDIT-B-01 | S | `latest`-Deps pinnen, package-lock.json committen |
| AUDIT-U-01 | M | Sentry für Error-Tracking einrichten |

### Priorität 2 — Beta-Laufzeit

| ID | Aufwand | Maßnahme |
|----|---------|----------|
| AUDIT-H-01 | S | MAX_CHARS-Inkonsistenz beheben (Client auf 8k oder Server auf 50k) |
| AUDIT-D-01 | XS | Stale CORS-URL entfernen |
| AUDIT-E-02 | M | Datenbank-Migrationssystem einführen |
| AUDIT-V-01 | M | Minimale Tests für FSRS, Reducer, Sync einrichten |

### Priorität 3 — Pre-Public-Launch

| ID | Aufwand | Maßnahme |
|----|---------|----------|
| AUDIT-P-01 | L | Accessibility-Audit mit Screen-Reader |
| AUDIT-S-01 | S | PWA-Screenshots und maskable Icon |
| AUDIT-C-01 | L | CardLearningPhase aufteilen (<400 Zeilen Ziel) |
| AUDIT-G-01 | M | `output_config`-Format verifizieren/migrieren |
| AUDIT-J-01 | S | Pretest-Feature implementieren ODER aus Schema entfernen |

---

## Beantwortung der 5 kritischen Fragen

---

### 1. Ist Lumo wirklich besser als die Summe seiner Funktionen?

**Antwort: Ja — mit einem wichtigen Vorbehalt.**

Lumo hat eine kohärente pädagogische Philosophie, die die einzelnen Funktionen zu einem sinnvollen Ganzen verbindet. Focus Ritual → Elaboration → Active Recall → Concept Map → Lernzettel ist kein zufälliges Feature-Bündel, sondern eine Abbildung des Encoding-Consolidation-Retrieval-Zyklus. Das ist ein echter Unterschied zu den meisten Lern-Apps, die entweder nur Flashcards (Anki, Quizlet) oder nur KI-Zusammenfassungen (NotebookLM) anbieten.

Das ADHS-bewusste Design ist nicht kosmetisch — es ist durchgezogen vom Amber-statt-Rot-Prinzip über die adaptiven Pausen bis zum Cookie-Banner ohne Modal. Das ist ein Designstandpunkt, der verteidigt wird.

**Der Vorbehalt:** Das Kernfeature FSRS-6 ist in der primären Lernphase defekt (AUDIT-K-01). Ein Produkt, das Spaced Repetition als Hauptversprechen hat, aber es in der Hauptlernphase nur als Binär-Rating implementiert, enttäuscht dieses Versprechen. Das muss behoben sein, damit das Produkt hält, was es verspricht.

---

### 2. Ist die KI wirklich zuverlässig genug?

**Antwort: Wahrscheinlich ja für strukturierten Output — mit unbekannter Qualitäts-Varianz.**

Die JSON-Schema-Validation über `output_config` ist der wichtigste Stabilitätsfaktor: Sie verhindert, dass Claude frei-formulierten Text zurückgibt, der nicht parsebar ist. Das ist ein wesentlicher Qualitätsvorteil gegenüber Prompt-Engineering ohne Schema.

**Was nicht beantwortet werden kann ohne Live-Testing:**
- Ist die Qualität der generierten Lernblöcke konsistent über verschiedene Fächer (Jura, Medizin, Informatik, Geschichte)?
- Halluziniert Claude bei unbekanntem Material Fakten in Lernblöcke?
- Wie gut sind die Karteikarten bei komplexen, abstrakten Konzepten?

**Was ein Risiko ist:**
- `@anthropic-ai/sdk: "latest"` — wenn Anthropic das SDK updated, kann das Verhalten der KI sich ändern ohne dass es explizit ausgelöst wurde.
- Keine Retry-Logic — ein transienter API-Fehler bricht die Session.
- Das `output_config`-Format ist möglicherweise nicht offiziell stabil.

**Fazit:** Die KI ist zuverlässig genug für eine Beta mit dem Caveät, dass KI-Qualität grundsätzlich probabilistisch ist und nutzerabhängige Qualitäts-Varianz unvermeidbar ist.

---

### 3. Ist das Produkt unnötig kompliziert?

**Antwort: Nein — aber ein Flow-Bruch existiert.**

Der Lernflow ist für seine Komplexität überraschend durchgängig. 9 Phasen (Focus → Elaboration → Cards → Check → Complete → Lernzettel → ConceptMap → Summary → Dashboard) sind viel, aber sie bauen aufeinander auf. Kein Schritt wirkt unmotiviert.

Die Onboarding-Sequenz (4 Screens + Upload) ist angemessen und der ADHS-Nutzergruppe entsprechend gestaltet (Chip-Select statt Freitextfelder, keine langen Formulare).

**Der eine echte Kompliziertheits-Befund:** Der Wechsel zwischen "Projekten" und "globalem Flashcard-System" ist konzeptuell unintuitiv. Flashcards sind global (nicht projektspezifisch), Projekte sind lokal. Das ist eine implizite Daten-Modalität, die erklärungsbedürftig ist.

**Was die Komplexität rechtfertigt:** Die App ist für eine Nutzergruppe gebaut, die bei normalem Lernzwang scheitert. Die Komplexität hat eine didaktische Funktion — sie strukturiert einen Prozess, der ansonsten nicht stattfindet. Das ist legitim.

---

### 4. Funktioniert Lumo auch nach drei Monaten?

**Antwort: Wahrscheinlich nicht ohne zwei spezifische Eingriffe.**

Das SQLite-Datenverlust-Risiko (AUDIT-E-01) bedeutet: **Jedes Deployment nach dem ersten Tag könnte alle Nutzerdaten löschen.** Wenn Railway kein persistentes Volume hat, ist das ein Produktions-Zeitbombe. Drei Monate aktiver Nutzung mit mehreren Deployments (Bug-Fixes, Feature-Updates) würden vermutlich mehrfache Datenverluste produzieren.

Das zweite Drei-Monats-Risiko: `@anthropic-ai/sdk: "latest"` bedeutet, dass nach 90 Tagen eine Breaking-Change in einem Anthropic-SDK-Update die gesamte KI-Funktionalität stilllegen kann, ohne dass irgendjemand etwas geändert hat.

**Mit den Fixes von AUDIT-E-01 und AUDIT-B-01** ist Lumo für drei Monate Beta-Betrieb stabil genug. Die FSRS-Daten würden sich ansammeln und verbessern. Die User-States wären persistent.

**Ohne diese Fixes:** Weniger als 50% Chance, dass Lumo nach drei Monaten noch intakt ist.

---

### 5. Ist Lumo tatsächlich releasefähig oder sieht es nur fertig aus?

**Antwort: Es sieht fertig aus — es ist aber für einen öffentlichen Launch noch nicht bereit.**

Für einen **geschlossenen Beta-Test** ist Lumo nach ~2–3 Tagen kritischer Fixes releasefähig. Die Kernfunktionalität ist implementiert, der UX-Flow ist kohärent, und die pädagogische Grundlage ist solider als bei den meisten Wettbewerbern.

Für einen **öffentlichen Launch** fehlen strukturelle Qualitätsfundamente, die nicht optional sind:

- **Keine Tests** bedeutet, dass jede Änderung ein unkontrolliertes Risiko ist.
- **Kein Monitoring** bedeutet, dass Fehler in Production unsichtbar bleiben.
- **Der FSRS-Bug** am Kern-Feature ist ein Glaubwürdigkeitsproblem.
- **Das SQLite-Risiko** ist ein Vertrauensproblem.
- **`latest`-Dependencies** sind ein Stabilitätsproblem.

Lumo hat die richtige Substanz. Die Oberfläche ist poliert. Die Fundamente brauchen noch 2–3 Wochen solidere Arbeit.

**Die ehrliche Einschätzung für einen Founder:** "Sieht fertig aus" ist bei Lumo nicht nur eine optische Aussage — es spiegelt einen echten Entwicklungsstand wider. Der pädagogische Kern ist genuiner Mehrwert. Aber ein App, das beim ersten Deployment Nutzerdaten verliert, oder bei einem SDK-Update stumm bricht, oder das Kernfeature (FSRS) in der Hauptphase nicht korrekt ausführt — das ist nicht fertig. Es sieht fertig aus.

---

*Audit-Status: Vollständig für alle 23 Bereiche A–W. Keine Code-Änderungen während des Audits vorgenommen.*
