# LUMO – Evidence & Verification Report
**Datum:** 2026-11-02  
**Prüfer:** Claude Sonnet 4.6 (Second-Pass Audit)  
**Grundlage:** LUMO_AUDIT_REPORT.md (First-Pass Audit)  
**Methode:** Direktes Lesen aller relevanten Quell-Dateien, keine Code-Änderungen

---

## Verifikations-Legende

| Status | Bedeutung |
|--------|-----------|
| ✅ VERIFIED | Befund ist korrekt und mit konkreter Evidenz belegt |
| ⚠️ PARTIALLY VERIFIED | Befund ist grundsätzlich richtig, aber mit Fehlern in Beweisführung oder Schweregrad |
| ❌ FALSE POSITIVE | Befund ist falsch — Problem existiert nicht wie beschrieben |
| 🔲 NOT VERIFIED | Kein Code-Beweis gefunden; Befund bleibt unklar |
| 🔴 NEW FINDING | Neu entdecktes Problem, nicht im ersten Audit |

---

## 1. Befunde mit Verifikationsstatus

---

### AUDIT-K-01 — Binäre FSRS-Bewertungen (nur Gut/Nochmal)
**Ursprüngliche Einstufung:** CRITICAL  
**Verifikationsstatus:** ✅ VERIFIED

**Beweis (src/App.jsx, Zeilen 363–385):**
```javascript
const handleSaveCardResults = useCallback((answerResults) => {
  if (!answerResults || !state.flashcards?.length) return;
  const updates = [];
  for (const [concept, isGood] of Object.entries(answerResults)) {  // isGood: boolean
    ...
    const quality = isGood ? 2 : 0; // Good=2, Again=0
    const updated = calculateNextReview(card, quality);
  }
}, [state.flashcards]);
```

**Bestätigung (src/screens/session/CardLearningPhase.jsx, Zeile 61):**
```javascript
const [answerResults, setAnswerResults] = useState({}); // { [concept]: boolean }
```

**Bewertung:** FSRS-6 unterstützt 4 Qualitätsstufen (0=Again, 1=Hard, 2=Good, 3=Easy). Der Code nutzt ausschließlich 0 und 2. Die Intervallberechnung für Hard (kurze Verlängerung) und Easy (aggressive Verlängerung) wird nie erreicht. Dies reduziert die Präzision des Spaced-Repetition-Algorithmus erheblich.

---

### AUDIT-E-01 — SQLite-Datenverlust nach Container-Neustart
**Ursprüngliche Einstufung:** CRITICAL  
**Verifikationsstatus:** ✅ VERIFIED

**Beweis (server/db.js, Zeile 32):**
```javascript
const DB_DIR = process.env.DB_PATH || __dirname;
```

**Beweis (railway.json, vollständige Datei — 13 Zeilen):**
```json
{
  "build": { "builder": "NIXPACKS" },
  "deploy": { "startCommand": "node server/index.js", "healthcheckPath": "/" }
}
```

**Bewertung:** Ohne `DB_PATH` Umgebungsvariable wird die SQLite-Datenbank im Container-Verzeichnis (`__dirname`) angelegt. Railway hat kein persistentes Volume konfiguriert. Jeder Deploy oder Container-Neustart löscht alle Nutzerdaten vollständig. **Diese Kombination macht persistente Server-Speicherung in der aktuellen Railway-Deployment-Konfiguration unmöglich.**

---

### AUDIT-E-02 — Keine Datenbank-Migrationen
**Ursprüngliche Einstufung:** MEDIUM  
**Verifikationsstatus:** ✅ VERIFIED

**Beweis (server/db.js):** Einzige Schema-Befehle sind `CREATE TABLE IF NOT EXISTS`. Kein `user_version` PRAGMA, keine Migrationstabelle, keine Versionsprüfung.

**Bewertung:** Schemaänderungen (z.B. neue Spalten) werden bei bestehenden Installationen still ignoriert. Besonders kritisch in Kombination mit AUDIT-E-01: selbst wenn ein Volume konfiguriert wird, könnten künftige Schemaänderungen bestehende Datensätze unlesbar machen.

---

### AUDIT-R-01 — API-Key-Präfix im Log
**Ursprüngliche Einstufung:** HIGH  
**Verifikationsstatus:** ⚠️ PARTIALLY VERIFIED

**Fehler im ursprünglichen Audit:** Der zitierte Beweis `console.log('API Key configured:', apiKey.substring(0,7)+'...')` existiert nicht im Code.

**Tatsächlicher Code (server/index.js):**
```javascript
// Zeilen 63–70 (Startup-Logs):
console.log('API KEY vorhanden:', Boolean(process.env.ANTHROPIC_API_KEY));
console.log('API KEY Länge:', process.env.ANTHROPIC_API_KEY?.length || 0);
console.log('Verfügbare ENV Keys:', Object.keys(process.env).join(', '));

// Zeilen 592–601 (server.listen() Callback):
console.log(`ANTHROPIC_API_KEY geladen, Präfix: ${key.slice(0, 10)}... (Länge: ${key.length})`);
```

**Entwickler-Kommentar im Code:** "Nur die ersten 10 Zeichen (reines Präfix wie 'sk-ant-api', kein Geheimnisanteil)"

**Korrigierte Bewertung:** Der ursprüngliche Befund nannte falsche Variablennamen und Zeilennummern. Das Sicherheitsproblem existiert aber: 10 Zeichen des API-Keys werden geloggt. Ob `sk-ant-api0` (10 Zeichen) wirklich kein sensitiver Anteil ist, hängt vom tatsächlichen Key-Format ab. Der Schlüssel-boolean und die Länge (≈93 Zeichen) sind low-risk. **Die Log-Zeile beim `server.listen()` ist unnötig und sollte entfernt werden.**

---

### AUDIT-B-01 — Unpinned `latest`-Dependencies
**Ursprüngliche Einstufung:** HIGH  
**Verifikationsstatus:** ✅ VERIFIED

**Beweis (package.json, tatsächlich installierte Versionen aus package-lock.json):**

| Paket | package.json | Installiert |
|-------|-------------|-------------|
| `@anthropic-ai/sdk` | `latest` | `0.117.1` |
| `express` | `latest` | `5.2.1` ⚠️ |
| `cors` | `latest` | `2.8.6` |
| `dotenv` | `latest` | `17.4.2` |
| `vite` | `latest` | `8.3.5` |
| `@vitejs/plugin-react` | `latest` | `6.0.5` |
| `concurrently` | `latest` | `10.0.6` |

**🔴 NEW FINDING innerhalb dieses Befunds — Express 5.2.1:**  
`express: latest` hat Express 5.2.1 installiert. Express 5 ist ein **Major-Version-Bump mit Breaking Changes** gegenüber Express 4.x:
- Wildcard-Routing (`app.get('*', ...)`) ist in Express 5 gebrochen (path-to-regexp Änderung)
- Der Code hat dieses spezifische Problem bereits behoben (Zeile 576: `app.use(...)` statt `app.get('*', ...)`, Kommentar im Code erklärt dies)
- Jedoch können weitere Express-5-Breaking-Changes unentdeckt sein

---

### AUDIT-D-01 — Veraltete Render.com CORS-URL
**Ursprüngliche Einstufung:** MEDIUM  
**Verifikationsstatus:** ✅ VERIFIED

**Beweis (server/index.js, Zeile 96):**
```javascript
'https://lumo-app-pbgc.onrender.com'
```

Diese URL verweist auf eine Render.com-Deployment, das laut ursprünglichem Audit nicht mehr aktiv ist. Bleibt im ALLOWED_ORIGINS-Array. Risiko: niedrig (schadet nicht wenn die Domain tot ist), aber zeigt fehlendes CORS-Management.

---

### AUDIT-H-01 — Stille Material-Trunkierung
**Ursprüngliche Einstufung:** MEDIUM  
**Verifikationsstatus:** ✅ VERIFIED

**Beweis (server/index.js, Zeilen 251–255):**
```javascript
const MAX_MATERIAL_CHARS = 8000;
let material = materialText;
if (material.length > MAX_MATERIAL_CHARS) {
  material = material.substring(0, MAX_MATERIAL_CHARS);
}
```

**Entwickler-Kommentar im Code:** Ursprünglich war die Grenze durch den Render.com Free Plan bedingt.

**Bewertung:** Nutzer erhalten keine Warnung wenn ihr Lernmaterial stillschweigend auf ~1,5 DIN-A4-Seiten gekürzt wird. Die Grenze von 8000 Zeichen ist für ein Lern-Tool sehr niedrig.

---

### AUDIT-G-02 — `queryEnglish` im YouTube-Schema ungenutzt
**Ursprüngliche Einstufung:** LOW  
**Verifikationsstatus:** ✅ VERIFIED

**Beweis (server/index.js, Zeile 462):**
```javascript
searchQuery = queryData.query;
```

Das `queryEnglish`-Feld wird vom Modell generiert (kostet Tokens) aber nie im YouTube-Endpoint verwendet.

---

### AUDIT-J-01 — Pretest als Dead Feature
**Ursprüngliche Einstufung:** MEDIUM  
**Verifikationsstatus:** ⚠️ PARTIALLY VERIFIED

**Befund:** `PRETEST_SYSTEM` ist in `server/prompts.js` definiert (Zeile 595), Kommentar: "Aktuell ungenutzt in index.js". Das `pretest_question`-Feld in `cardSchema` (Zeile 426) **wird jedoch für jede Karte generiert** (kostet Tokens).

**Unklar (erfordert Live-Zugang):** Wird `pretest_question` im UI irgendwo angezeigt oder genutzt? Im gelesenen Code kein Frontend-Handler gefunden.

---

### AUDIT-V-01 — Keine Tests
**Ursprüngliche Einstufung:** HIGH  
**Verifikationsstatus:** ✅ VERIFIED

```bash
# Keine Test-Dateien im gesamten Projekt
find . -name "*.test.*" -o -name "*.spec.*" -o -name "__tests__" 2>/dev/null
# → Keine Treffer
```

Kein Testing-Framework, keine CI-Pipeline erkennbar.

---

### AUDIT-M-01 — Tote CSS-Variablen
**Ursprüngliche Einstufung:** LOW  
**Verifikationsstatus:** ⚠️ PARTIALLY VERIFIED

**Korrekte Analyse:** 29 CSS-Variablen definiert. Das ursprüngliche Audit implizierte viele tote Variablen. Die Analyse zeigt:
- 23 von 29 werden irgendwo im Projekt als `var()` genutzt
- Tatsächlich tote Variablen (nirgendwo referenziert): **5-6**

**Truly unused:**
- `--glow-center` (Zeile 37)  
- `--glow-top` (Zeile 38)  
- `--glow-vignette` (Zeile 39)  
- `--gold-glow` (Zeile 12)
- `--border-gold` (Zeile 26)

**Hinweis zu `--dvh`:** Wird in Zeile 137 als `var(--dvh, 100dvh)` genutzt (mit Fallback). Das ursprüngliche Analyse-Skript hat `var(name, fallback)` nicht erkannt.

**Bewertung:** Befund korrekt, aber Ausmaß kleiner als impliziert. ~5 tote Variablen, nicht Dutzende.

---

### AUDIT-S-01 — PWA-Manifest Qualität
**Ursprüngliche Einstufung:** LOW  
**Verifikationsstatus:** ✅ VERIFIED

**Beweis (public/manifest.json):**
```json
{
  "screenshots": [],
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

- `screenshots` ist leer (keine Screenshots für App-Store-Präsentation)
- Dasselbe 512×512-PNG wird für standard und maskable verwendet — für maskable Icons sollte das Icon 80% safe-zone einhalten, was mit dem gleichen Asset nicht garantiert ist
- Kein SVG-Icon für `sizes: "any"`

---

### AUDIT-P-01 — Keine React Error Boundaries
**Ursprüngliche Einstufung:** MEDIUM  
**Verifikationsstatus:** ❌ FALSE POSITIVE

**Beweis (src/main.jsx, Zeilen 7–75):** Ein vollständiges `ErrorBoundary` class-Component existiert und **wraps die gesamte App**:

```jsx
class ErrorBoundary extends React.Component {
  // ...
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          {/* Mascot, Reload-Button, kollapsierbare Fehler-Details */}
        </div>
      );
    }
    return this.props.children;
  }
}
// ...
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

**Bewertung:** Der ursprüngliche Befund "Keine React Error Boundaries sichtbar" ist falsch. Die ErrorBoundary ist vorhanden und deckt die gesamte App ab. Ursprünglicher Audit-Reviewer hat `main.jsx` nicht vollständig gelesen.

---

## 2. Neu entdeckte Probleme

---

### 🔴 AUDIT-NEW-01 — Express 5 mit ungeklärtem Breaking-Change-Risiko
**Einstufung:** HIGH

`express: latest` hat Express 5.2.1 installiert. Express 5 ist gegenüber 4.x ein Major-Release mit Breaking Changes:
- Wildcard-Routing ist gebrochen (im Code bereits kompensiert: Kommentar in Zeile 576)
- Weitere Breaking Changes (async error handling, `res.json()` Verhalten, Query-Parsing) sind im Code nicht dokumentiert geprüft

**Risiko:** Unbekannte Express-5-Inkompatibilitäten können bei bestimmten Request-Typen stille Fehler verursachen.

**Empfehlung:** Express auf `^4.21.0` pinnen, bis Express-5-Kompatibilität explizit geprüft und dokumentiert ist. Alternativ: alle Express-5-Breaking-Changes gegen den Code prüfen.

---

### 🔴 AUDIT-NEW-02 — `output_config.format.json_schema` via `client.messages.stream()`
**Einstufung:** MEDIUM → KEIN BUG (korrigiert)

**Initialer Verdacht:** `output_config` ist ein Beta-Feature und sollte via `client.beta.messages` aufgerufen werden.

**Nach Verifikation:** In SDK 0.117.1 ist `output_config` in `client.messages.messages.ts` definiert (Zeile 3215: `output_config?: OutputConfig`) — also im **standard** Messages-Namespace unterstützt. Der Code ist korrekt.

**Restrisiko:** Da `@anthropic-ai/sdk: latest`, könnte eine zukünftige SDK-Version das `output_config`-Interface breaking ändern. Dies ist Teil von AUDIT-B-01.

---

### 🔴 AUDIT-NEW-03 — `pretest_question` verursacht unnötige Token-Kosten
**Einstufung:** MEDIUM

`pretest_question` ist in `cardSchema` (server/prompts.js, Zeile 426) definiert und wird daher **bei jeder Karten-Generierung produziert**. Laut Kommentar im Code ist `PRETEST_SYSTEM` aktuell ungenutzt. Kein Frontend-Code liest `pretest_question` aus.

**Konsequenz:** Jede Analyse generiert Pretest-Fragen für alle Karten — Token-Verschwendung bei 100% der API-Calls.

---

### 🔴 AUDIT-NEW-04 — `BACK_TO_STEP2`-Action springt zu Step 1
**Einstufung:** LOW (dokumentiert, kein Runtime-Bug)

In `appReducer.js` (Zeilen 133–138):
```javascript
// P2-BUG-02: [...] seit Screen 2 mit Screen 1 zusammengeführt wurde [...]
// Der Action-Name ist historisch; der Reducer-Sprung zu onboardingStep: 1 ist korrekt.
case 'BACK_TO_STEP2':
  return { ...state, onboardingStep: 1 };
```

Der Entwickler hat dieses Problem bereits erkannt und dokumentiert. Kein funktionaler Bug, da der Reducer-Zielwert (1) korrekt ist. Risiko: Namens-Verwirrung bei zukünftiger Weiterentwicklung.

---

### 🔴 AUDIT-NEW-05 — Doppeltes `HYDRATE_FROM_STORAGE` Dispatch
**Einstufung:** LOW (kein Bug, aber Performance-Overhead)

`src/App.jsx` dispatcht `HYDRATE_FROM_STORAGE` zweimal auf jedem App-Start:
1. Nach erstem async IDB-Load (lokale Daten)
2. Nach Server-Sync + Merge (server+lokale Daten)

Ein `cancelled`-Flag verhindert Dispatches nach Component-Unmount. Innerhalb des Mount-Lifecycles finden jedoch zwei State-Updates statt, die zwei React-Re-Renders auslösen. Kein Datenintegritätsproblem, aber redundanter Render.

---

### 🔴 AUDIT-NEW-06 — serverSync.js: Misleading Kommentar
**Einstufung:** LOW (Codequalität)

`src/utils/serverSync.js`, Zeile 3: Kommentar beschreibt Merge als "timestamp-basiert (neuerer gewinnt)". 

**Tatsächliche Implementierung:** `mergeStates()` nutzt `countProgress()` — ein Score aus:
- Abgeschlossene Blöcke × 10
- Konfidenz 'sicher' Blöcke × 5  
- Abgeschlossene Projekte × 10
- `blocksAnalyzedTotal` × 3
- `sessionsTotal` × 2

Timestamps spielen keine Rolle. Der Kommentar ist sachlich falsch und kann zukünftige Entwickler in die Irre führen.

---

### 🔴 AUDIT-NEW-07 — npm audit: 8 moderate Vulnerabilities (BUILD-TIME)
**Einstufung:** LOW (Build-time only, kein Runtime-Risiko)

`npm audit` zeigt 8 moderate Vulnerabilities. **Alle befinden sich in der `vite-plugin-pwa` Build-Chain** (ejs, glob, minimatch, workbox-build) — diese Code-Pfade laufen nur beim `npm run build`, nie zur Laufzeit im Browser oder auf dem Server.

**Klarstellung:** Der ursprüngliche Audit implizierte Runtime-Risiko. Das ist falsch. Der Fix (`npm audit fix --force`) würde `vite-plugin-pwa` auf 1.1.0 downgraden — ein **Major Breaking Change**. Nicht empfohlen ohne Kompatibilitätsprüfung.

---

## 3. Noch offene Live-Prüfungen

Diese Befunde konnten nur durch Zugang zur laufenden Railway/Produktiv-Instanz verifiziert werden:

| # | Prüfung | Warum offline nicht prüfbar |
|---|---------|----------------------------|
| L-01 | Funktioniert `output_config.format.json_schema` in Produktion? | Erfordert echte Anthropic API Response |
| L-02 | Verlieren Nutzer bei Railway-Deploy tatsächlich ihre Daten? | Erfordert Deployment-Beobachtung |
| L-03 | Blockiert die CORS-Config legitime Requests? | Erfordert Browser-Tests |
| L-04 | Funktioniert YouTube-Suche ohne `queryEnglish`? | Erfordert API-Call mit echtem Key |
| L-05 | Wie viele Token kostet `pretest_question` pro Session? | Erfordert API-Call mit Monitoring |
| L-06 | Funktioniert `saveUserState` / Sync unter parallelen Requests (Race)? | Erfordert Load-Test |

---

## 4. Korrigierte Befund-Tabelle (alle Findings zusammengefasst)

| ID | Befund | Ursprüngliche Stufe | Verifizierter Status | Korrekte Stufe |
|----|--------|--------------------|--------------------|----------------|
| K-01 | Binäre FSRS-Bewertungen | CRITICAL | ✅ VERIFIED | CRITICAL |
| E-01 | SQLite ephemeral (kein Volume) | CRITICAL | ✅ VERIFIED | CRITICAL |
| E-02 | Keine DB-Migrationen | MEDIUM | ✅ VERIFIED | MEDIUM |
| R-01 | API-Key-Präfix im Log | HIGH | ⚠️ EVIDENCE WRONG | MEDIUM |
| B-01 | `latest`-Dependencies | HIGH | ✅ VERIFIED | HIGH |
| V-01 | Null Tests | HIGH | ✅ VERIFIED | HIGH |
| D-01 | Stale CORS URL | MEDIUM | ✅ VERIFIED | LOW |
| H-01 | Stille Trunkierung 8000 Zeichen | MEDIUM | ✅ VERIFIED | MEDIUM |
| J-01 | Pretest Dead Feature | MEDIUM | ⚠️ PARTIALLY | LOW |
| G-02 | queryEnglish ungenutzt | LOW | ✅ VERIFIED | LOW |
| M-01 | Tote CSS-Variablen | LOW | ⚠️ OVERSTATED | LOW (5 vars) |
| S-01 | PWA screenshots leer | LOW | ✅ VERIFIED | LOW |
| P-01 | Keine Error Boundaries | MEDIUM | ❌ FALSE POSITIVE | N/A |
| NEW-01 | Express 5 Breaking Changes | — | 🔴 NEU | HIGH |
| NEW-02 | output_config API (SDK 0.117.1) | — | ✅ KEIN BUG | N/A |
| NEW-03 | pretest_question Token-Waste | — | 🔴 NEU | MEDIUM |
| NEW-04 | BACK_TO_STEP2 → Step 1 | — | 🔴 NEU (dokumentiert) | LOW |
| NEW-05 | Double HYDRATE_FROM_STORAGE | — | 🔴 NEU | LOW |
| NEW-06 | serverSync.js misleading comment | — | 🔴 NEU | LOW |
| NEW-07 | npm audit BUILD-TIME vulnerabilities | — | 🔴 NEU (kein Runtime-Risk) | LOW |

---

## 5. Priorisierte Release-Blocker

### 🚨 Muss vor jedem Beta-Launch behoben sein

**BLOCKER-1: AUDIT-E-01 — Datenverlust bei Container-Neustart**  
Railway hat kein persistentes Volume. Jeder Deploy löscht alle Nutzerdaten.  
**Fix:** `DB_PATH` Umgebungsvariable in Railway setzen + Volume-Mount konfigurieren.  
*Aufwand: 30 Minuten (Railway-Konfiguration). Keine Code-Änderung notwendig.*

**BLOCKER-2: AUDIT-K-01 — FSRS nur mit 2 von 4 Qualitätsstufen**  
Der Kern des Produktwerts (intelligentes Spaced Repetition) ist halbiert.  
**Fix:** `CardLearningPhase.jsx` auf 4-stufige UI (Nochmal/Schwer/Gut/Leicht) umbauen + `App.jsx` bridge anpassen.  
*Aufwand: 2–4 Stunden.*

---

### ⚠️ Sollte vor Beta-Launch behoben sein

**IMPORTANT-1: AUDIT-B-01 + NEW-01 — `latest`-Dependencies pinnen**  
Express 5 ist installiert und hat ungeprüfte Breaking-Change-Fläche. Pinnen aller `latest`-Deps auf aktuelle Versionen (kein Versionswechsel, nur die `latest`-Tags ersetzen).  
**Fix:** `package.json` alle `latest` durch konkrete Versionsnummern ersetzen.  
*Aufwand: 1 Stunde.*

**IMPORTANT-2: AUDIT-H-01 — Nutzer-Warning bei Material-Trunkierung**  
8000-Zeichen-Limit ohne UI-Feedback.  
**Fix:** Frontend-Warnung wenn `materialText.length > 8000` (oder besserer API-Response mit truncation flag).  
*Aufwand: 1–2 Stunden.*

**IMPORTANT-3: AUDIT-R-01 — API-Key Prefix-Log entfernen**  
Server.listen() Callback loggt 10 Zeichen des API-Keys. Unnötig.  
**Fix:** Log-Zeile entfernen oder auf `Boolean(key)` reduzieren.  
*Aufwand: 5 Minuten.*

---

### 📋 Technische Schulden (pre-Public-Launch)

**DEBT-1: AUDIT-E-02 — Datenbank-Migrationen**  
Erfordert vollständiges Migrations-System (user_version pragma + Migration-Runner).

**DEBT-2: AUDIT-V-01 — Testsuite**  
Mindestens Unit-Tests für FSRS-Logik, Reducer und serverSync.js.

**DEBT-3: NEW-03 — pretest_question aus cardSchema entfernen**  
Spart Tokens bei 100% der Analyze-Requests. Entweder Feature entfernen oder implementieren.

**DEBT-4: NEW-01 — Express 5 Audit**  
Alle Express-5-Breaking-Changes gegen den Code prüfen und dokumentieren.

**DEBT-5: AUDIT-D-01 — Stale CORS URL bereinigen**  
`'https://lumo-app-pbgc.onrender.com'` aus ALLOWED_ORIGINS entfernen oder kommentieren.

---

## 6. Beta- und Public-Launch-Status (aktualisiert)

### Beta-Launch-Freigabe

**Status: 🔴 NICHT FREIGEGEBEN**

**Blockierender Grund:** BLOCKER-1 (AUDIT-E-01) allein disqualifiziert Beta. Nutzerdaten werden bei jedem Railway-Deploy gelöscht. Das ist nicht Beta-fähig — kein Nutzer kann eine sinnvolle Lernerfahrung aufbauen, wenn ihre Fortschritte nach jeder Deployment-Aktivität verschwinden. Dieses Problem ist mit 30 Minuten Railway-Konfiguration behebbar.

BLOCKER-2 (AUDIT-K-01) ist für eine Beta ebenfalls kritisch: wenn FSRS das zentrale Differenzierungsmerkmal von Lumo ist, fehlt in der aktuellen Version die Hälfte seiner Funktion.

**Nach Behebung von BLOCKER-1 + BLOCKER-2:** Beta-Launch unter Vorbehalt möglich, wenn IMPORTANT-1 bis IMPORTANT-3 ebenfalls adressiert sind.

### Public-Launch-Freigabe

**Status: 🔴 NICHT FREIGEGEBEN**

Zusätzlich zu den Beta-Blockern müssen vor Public Launch behoben sein:
- DEBT-1 (Datenbank-Migrationen)
- DEBT-2 (Testsuite, zumindest Critical-Path-Tests)
- DEBT-3 (pretest_question Token-Waste)
- DEBT-4 (Express 5 Audit)

---

## 7. Qualitäts-Audit der Beweisführung im Original-Audit

| Befund | Qualität der Original-Evidenz |
|--------|-------------------------------|
| K-01 | ✅ Korrekte Quelldatei und Logik beschrieben |
| E-01 | ✅ Korrekte Quelldatei |
| R-01 | ❌ Falsche Zeilen, falsche Variable, falsche Anzahl Zeichen |
| P-01 | ❌ main.jsx nicht vollständig gelesen |
| M-01 | ⚠️ Befund korrekt aber Ausmaß stark übertrieben |
| B-01 | ✅ Korrekt, aber Express-5-Implikation nicht erkannt |
| NEW-07 | ⚠️ Runtime- vs. Build-time-Risiko nicht unterschieden |

**Fazit zur Audit-Qualität:** Der erste Audit hat die wichtigsten strukturellen Probleme korrekt identifiziert (E-01, K-01, B-01). Die Beweisführung für sicherheitsrelevante Findings (R-01) war jedoch fehlerhaft. Ein False Positive (P-01) zeigt, dass nicht alle Schlüsseldateien vollständig gelesen wurden. Die allgemeine Richtung des Audits war korrekt; die Einzelbeweise erforderten eine zweite Prüfung.

---

*Ende des LUMO Evidence & Verification Reports*  
*Erstellt: 2026-11-02*  
*Nächster Schritt: Behebung BLOCKER-1 (Railway Volume-Konfiguration) + BLOCKER-2 (FSRS 4-Stufen-UI)*
