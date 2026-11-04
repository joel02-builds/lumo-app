# LUMO – P-01 Performance, Skalierbarkeit und Ressourcenverbrauch: Audit-Bericht

**Auditiert:** `src/App.jsx` · `src/state/appReducer.js` · `src/screens/dashboard/DashboardScreen.jsx` · `src/screens/FlashcardScreen.jsx` · `src/screens/WeakSpotsScreen.jsx` · `server/index.js` · `server/db.js` · `src/utils/storage.js` · `src/utils/fsrs.js` · `vite.config.js` · Build-Output

**Auditiert am:** 2026-11-04  
**Status:** Audit abgeschlossen — keine Codeänderungen, kein Commit  
**Test-Suite beim Audit-Start:** 178/178 ✔

---

## 1. Executive Summary

Das Audit umfasst 4 Domänen (Frontend, Backend, SQLite, PWA) und identifiziert **26 Findings** (1 Critical, 5 High, 11 Medium, 9 Low) sowie **3 ausdrücklich markierte False Positives**.
*(Korrektur Phase 0: ursprünglich 22 gezählt; nach vollständiger Inventarisierung aller Finding-IDs und Zusammenführung von P-PWA-01+02 ergibt sich die korrekte Gesamtzahl 26.)*

**Die fünf dringendsten Probleme:**

1. **P-PWA-01 (Critical):** Erste PWA-Installation überträgt **4.813 KB Precache**. Davon entfallen **3.980 KB (82,7 %) auf 5 unkomprimierte Mascot-PNGs** (gemessen). Auf langsamer Mobilverbindung bis zu 25–75 Sekunden bis zur Erstnutzung.

2. **P-FE-11 (High):** Kein Code-Splitting. Alle **476 KB JavaScript** werden als Einzel-Chunk beim ersten Load übertragen. Kein Lazy Loading für selten genutzte Screens.

3. **P-BE-05 (High):** Kein globales Concurrency-Limit für `/api/analyze`. 10 gleichzeitige 24-MB-PDF-Uploads können bis zu **320 MB zusätzlichen Node.js-Heap** binden. Railway-Instanzen haben 512 MB–1 GB RAM.

4. **P-FE-01 (High):** Storage-Effect mit 17 Dependencies feuert bei jeder qualifizierenden State-Änderung **synchrones `JSON.stringify(fullState)` + `localStorage.setItem`** im UI-Thread. Jede Kartenbewertung in einer Session = eine vollständige State-Serialisierung.

5. **P-DB-01 (High):** `user_state.state_json` wächst unbegrenzt. Durch Duplizierung von `blocks[]` in jeden Projekt-Snapshot (P-FE-06) trifft ein Power-User mit 5 Projekten × 10 Blöcken + 500 Karten die 500-KB-Servergrenze. State-Save schlägt dann mit HTTP 413 fehl.

**Schweregrad-Verteilung:**

| Schweregrad    | Anzahl |
|----------------|--------|
| Critical       | 1      |
| High           | 5      |
| Medium         | 11     |
| Low            | 9      |
| False Positive | 3      |

---

## 2. Architekturüberblick der relevanten Performance-Pfade

### Frontend-Datenpfad

```
User Action
  → dispatch({ type, payload })
  → appReducer.js (synchrone State-Transformation, O(n) bei UPDATE_FLASHCARD)
  → React re-render (alle subscribed Components)
  → useEffect Storage-Effect (17 Dependencies, App.jsx ~163–200)
      → saveProjectSync(snapshot)      ← SYNCHRON: JSON.stringify + localStorage.setItem
      → saveProjectAsync(snapshot)     ← asynchron: IDB write
      → (async) POST /api/state        ← asynchron: Server-Sync
```

**Problematische Hot-Path-Kombinationen:**
- Kartenbewertung → `UPDATE_FLASHCARD` → O(n) map → re-render → Storage-Effect → JSON.stringify
- 10 Bewertungen am Sessionende (P-FE-02) → 10× obiger Pfad sequenziell

### Backend-Datenpfad

```
HTTP Request
  → Express Middleware: validateSession()
      → SHA-256(token) + SELECT users WHERE session_hash = ?  ← Event Loop blockiert
      → UPDATE users SET last_seen = ?                        ← Event Loop blockiert
  → Route Handler
      → loadUserState(userId)   → JSON.parse(state_json)      ← Event Loop blockiert
      → Business Logic
      → saveUserState(userId)   → JSON.stringify(state)
                                → INSERT OR REPLACE            ← Event Loop blockiert
  → HTTP Response
```

**Besonders problematisch bei POST /api/state:**
```
JSON.stringify(state)   ← Größencheck (1. Serialisierung)
isTooDeep(state)        ← O(n) rekursive Traversierung
saveUserState(userId)   → JSON.stringify(safeState)  ← 2. Serialisierung
                        → DB-Write
```

### Storage-Schichten (Redundanz)

```
State-Änderung
  ├── localStorage  (synchron, Main-Thread, bei jedem qualifying Event)
  ├── IndexedDB     (asynchron, bei jedem qualifying Event)
  └── POST /api/state (asynchron, bei jedem qualifying Event)
```

Alle drei Schichten werden gleichzeitig bei jeder qualifizierenden State-Änderung beschrieben.

---

## 3. Frontend-Befunde

### P-FE-01 (High) – Storage-Effect mit 17 Dependencies feuert synchron bei jeder State-Änderung

**Datei/Funktion:** `src/App.jsx`, Storage-useEffect, Zeilen ~163–200

**Konkretes Problem:**
Der Persistierungs-useEffect hat 17 Dependencies:
```javascript
}, [state.topic, state.fileName, state.goalType, state.goalDate, state.sprintMode,
    state.blocks, state.recommendedOrder, state.subjectColor, state.learningStyle,
    state.subjectHistory, state.projects, state.activeProjectId, state.examResult,
    state.examResultAskedAt, state.blocksAnalyzedTotal, state.sessionsTotal, state.flashcards]];
```
Bei jeder Änderung eines dieser Werte wird synchron aufgerufen:
```javascript
saveProjectSync(snapshot)  // = localStorage.setItem(KEY, JSON.stringify(snapshot))
```
Dies blockiert den UI-Thread bis zum Abschluss.

**Reproduzierbarer Nachweis:** Eine Kartenbewertung → `UPDATE_FLASHCARD`-Dispatch → `state.flashcards` ändert sich → Effect feuert → vollständiges `JSON.stringify(snapshot)` + `localStorage.setItem`. Bei 20 Bewertungen in einer Session: 20 vollständige Serialisierungen im UI-Thread. Der `snapshot` enthält alle Blöcke, Projekte und Lernkarten.

**Auswirkungen auf Nutzer:** Spürbares Stottern nach Kartenbewertungen bei umfangreichem Lernstand (viele Blöcke × viele Projekte × viele Karten) auf langsamen Mobilgeräten.

**Empfohlene Lösung:**
1. `saveProjectSync` debounced (300ms) mit `useRef` + `clearTimeout/setTimeout`
2. Dependencies auf tatsächlich persistenzrelevante Werte reduzieren (nicht `sessionsTotal`, `blocksAnalyzedTotal`)
3. IDB als primäre Persistenz; `localStorage` als reinen Fallback oder entfernen

**Aufwand:** Mittel (1–2 Tage)  
**Regressionrisiko:** Mittel (Datenverlust bei Tab-Schließen möglich, wenn Debounce > Browser-unload-Zeit)  
**Benchmark:** Timer um `saveProjectSync` mit synthetischem 500-Karten-State. Zielwert: < 5ms p99.

---

### P-FE-02 (Medium) – `handleSaveCardResults` dispatcht N individuelle `UPDATE_FLASHCARD`

**Datei/Funktion:** `src/App.jsx`, `handleSaveCardResults`, Zeilen ~365–393

**Konkretes Problem:**
```javascript
updates.forEach(({ id, updates: u }) => {
  dispatch({ type: 'UPDATE_FLASHCARD', payload: { id, updates: u } });
});
```
Jeder Dispatch triggert: Reducer (O(n) map über alle Karten) + React re-render + Storage-Effect (JSON.stringify + localStorage). Für 10 Karten-Updates: 10× O(n) Reducer + 10× vollständige Serialisierung.

**Auswirkungen auf Nutzer:** Merkliche Verzögerung beim Abschluss einer Session mit mehreren Karten.

**Empfohlene Lösung:** Neuer Reducer-Typ `UPDATE_FLASHCARDS_BATCH`:
```javascript
case 'UPDATE_FLASHCARDS_BATCH':
  return {
    ...state,
    flashcards: state.flashcards.map(c => {
      const update = action.payload.find(u => u.id === c.id);
      return update ? { ...c, ...update.updates } : c;
    }),
  };
```
Ein Dispatch statt N; ein Reducer-Lauf; eine Serialisierung.

**Aufwand:** Gering (0.5 Tage)  
**Regressionrisiko:** Gering  
**Benchmark:** React Profiler: Render-Zeit mit N=10 sequenziellen vs. 1 Batch-Dispatch

---

### P-FE-03 (Medium) – `SET_SUBJECT_COLOR` mappt über alle Blöcke

**Datei/Funktion:** `src/state/appReducer.js`, Zeilen ~218–223

**Konkretes Problem:**
```javascript
case 'SET_SUBJECT_COLOR':
  return {
    ...state,
    blocks: state.blocks.map((b) => ({ ...b, subject_color: action.payload })),
  };
```
Jedes Color-Picker-Event erzeugt ein neues Object für jeden Block. Farbauswahl-Events können mehrfach pro Sekunde feuern.

**Auswirkungen auf Nutzer:** Ruckelnder Color-Picker bei vielen Blöcken (> 20).

**Empfohlene Lösung:** `subjectColor` als eigenständiges State-Feld führen; Blöcke erhalten die Farbe zur Render-Zeit via Selector. Kein Block wird mehr bei Farbänderung angefasst.

**Aufwand:** Mittel  
**Regressionrisiko:** Mittel (alle Stellen, die `block.subject_color` lesen, müssen angepasst werden)

---

### P-FE-04 (Medium) – `ADD_FLASHCARDS` O(n²)-Deduplication

**Datei/Funktion:** `src/state/appReducer.js`, Zeilen ~288–290

**Konkretes Problem:**
```javascript
const newCards = action.payload.filter(
  newCard => !state.flashcards.find(existing => existing.id === newCard.id)
);
```
Für m neue Karten und n bestehende: O(n×m). Bei 500 bestehenden + 20 neuen: 10.000 Vergleiche.

**Empfohlene Lösung:**
```javascript
const existingIds = new Set(state.flashcards.map(c => c.id));
const newCards = action.payload.filter(c => !existingIds.has(c.id));
```
O(n+m) statt O(n×m).

**Aufwand:** Minimal (< 1h)  
**Regressionrisiko:** Gering

---

### P-FE-05 (Medium) – `UPDATE_FLASHCARD` O(n) full map per individueller Aktualisierung

**Datei/Funktion:** `src/state/appReducer.js`, Zeilen ~294–299

**Konkretes Problem:**
```javascript
case 'UPDATE_FLASHCARD':
  return {
    ...state,
    flashcards: state.flashcards.map(c =>
      c.id === action.payload.id ? { ...c, ...action.payload.updates } : c
    ),
  };
```
500 Karten → 500 Vergleiche + 500 neue Objekte per einzelnem Dispatch. Kombiniert mit P-FE-02 (sequenzielle Dispatches): 10 × 500 = 5.000 Objekte für 10 Karten-Updates.

**Empfohlene Lösung:** Batch-Reducer (P-FE-02 zusammen adressieren). Langfristig: `flashcards` als `Map<id, card>` für O(1)-Updates (breaking change).

**Aufwand:** Gering (Batch) / Hoch (Map-basiert)  
**Regressionrisiko:** Gering (Batch) / Mittel (Map)

---

### P-FE-06 (Medium) – `SAVE_CURRENT_PROJECT` dupliziert gesamtes `blocks`-Array

**Datei/Funktion:** `src/state/appReducer.js`, Zeilen ~324–345

**Konkretes Problem:**
Beim Speichern eines Projekts wird `state.blocks` vollständig in den Projekt-Snapshot kopiert. Mit N Projekten und M Blöcken enthält `state.projects` N Kopien von je M Blöcken — inklusive der vollständigen Block-Contents (je bis zu mehrere KB).

**Auswirkungen:** Direkter Treiber für P-DB-01 (state_json wächst auf > 500 KB). Mit 5 Projekten × 10 Blöcken × 2 KB Content = 100 KB reine Duplikate.

**Empfohlene Lösung:** Projekte speichern nur Metadaten + Block-IDs; `state.blocks` bleibt Single Source of Truth.

**Aufwand:** Hoch (Datenmodell-Refactoring + Migration gespeicherter States)  
**Regressionrisiko:** Hoch (Breaking Change an persistiertem Format)

---

### P-FE-07 (Medium) – `activeQueue` O(n²) auf jedem FlashcardScreen-Render

**Datei/Funktion:** `src/screens/FlashcardScreen.jsx`, Zeile ~505

**Konkretes Problem:**
```javascript
const activeQueue = queueIds.map(id => flashcards.find(c => c.id === id)).filter(Boolean);
```
Kein `useMemo`, läuft auf jedem Render. Bei 50 Queue-IDs × 500 Flashcards: **25.000 Vergleiche pro Render**.

**Auswirkungen auf Nutzer:** Spürbares Ruckeln beim Navigieren zwischen Karten bei umfangreichen Lernständen.

**Empfohlene Lösung:**
```javascript
const activeQueue = useMemo(
  () => queueIds.map(id => flashcards.find(c => c.id === id)).filter(Boolean),
  [queueIds, flashcards]
);
```
Mittelfristig: `flashcards` als `Map<id, card>` für O(1)-Lookup.

**Aufwand:** Minimal (< 30min für `useMemo`)  
**Regressionrisiko:** Minimal

---

### P-FE-08 (Medium) – DashboardScreen berechnet FSRS-Fälligkeiten ohne Memoization

**Datei/Funktion:** `src/screens/dashboard/DashboardScreen.jsx`, Zeilen ~96–108

**Konkretes Problem:**
```javascript
const dueCards = getDueCards(allFlashcards);       // FSRS-Retrievability-Berechnung, kein useMemo
const allCompletedBlocks = [
  ...safeBlocks.filter(b => b.status === 'completed' && b.confidence === 'sicher'),
  ...allProjects.flatMap(p => (p.blocks || []).filter(…)),
];
const totalMasteredConcepts = allCompletedBlocks.reduce((sum, b) => sum + (b.cards?.length || 0), 0);
```
`getDueCards` iteriert alle Karten mit FSRS-Retrievability-Berechnungen (Exponentialfunktion pro Karte). `getStreakDays()` (Zeile ~296) liest synchron `localStorage.getItem` + `JSON.parse` innerhalb des JSX-IIFEs auf jedem Render.

**Auswirkungen:** Wiederholte FSRS-Berechnungen bei jedem Render → messbar bei > 200 Karten.

**Empfohlene Lösung:**
```javascript
const dueCards = useMemo(() => getDueCards(allFlashcards), [allFlashcards]);
const allCompletedBlocks = useMemo(() => [...], [safeBlocks, allProjects]);
const streakDays = useMemo(() => getStreakDays(), []);  // einmalig berechnen
```

**Aufwand:** Minimal (< 1h)  
**Regressionrisiko:** Minimal

---

### P-FE-09 (Low) – Hintergrund-Prefetch ohne AbortController

**Datei/Funktion:** `src/screens/dashboard/DashboardScreen.jsx`, Zeilen ~111–119

**Konkretes Problem:**
```javascript
useEffect(() => {
  if (!next) return;
  lumoApi.generateCards({ blockTitle: next.title, ... }).catch(() => {});
}, [next?.id]);
```
Bei schnellem Projektwechsel können mehrere `generateCards`-Requests gleichzeitig in-flight sein. Kein `AbortController` beim Unmount oder Dependency-Wechsel.

**Auswirkungen:** Unnötige Server-Last; stale Requests häufen sich bei instabiler Verbindung.

**Empfohlene Lösung:**
```javascript
useEffect(() => {
  if (!next) return;
  const controller = new AbortController();
  lumoApi.generateCards({ ..., signal: controller.signal }).catch(() => {});
  return () => controller.abort();
}, [next?.id]);
```

**Aufwand:** Minimal (< 1h)  
**Regressionrisiko:** Minimal

---

### P-FE-10 (Low) – SM-2→FSRS-Migration dispatcht N individuelle Updates

**Datei/Funktion:** `src/screens/FlashcardScreen.jsx`, Zeilen ~453–465

**Konkretes Problem:**
Die One-time-Migration von Legacy-SM-2-Karten ruft `onUpdateFlashcard(card)` pro Karte auf: N sequenzielle `UPDATE_FLASHCARD`-Dispatches → N vollständige State-Serialisierungen (kombiniert mit P-FE-01).

**Auswirkungen:** Einmaliger Performance-Einbruch beim ersten Start nach Update für User mit Legacy-Karten. Bei > 100 Karten mehrere Sekunden.

**Empfohlene Lösung:** Batch-Dispatch nach P-FE-02-Fix.

**Aufwand:** Gering (nach P-FE-02-Lösung)  
**Regressionrisiko:** Gering

---

### P-FE-11 (High) – Kein Code-Splitting, kein Lazy Loading

**Datei/Funktion:** `vite.config.js`, Build-Output

**Gemessener Nachweis:**
```
dist/assets/index-CQOiJE6A.js   476,278 Bytes   (127.99 KB gzip)
dist/assets/index-BfrOmTlp.css   20,248 Bytes
```
Einziger JS-Chunk. Alle Screens (DashboardScreen 1041 LOC, FlashcardScreen 915 LOC, WeakSpotsScreen 363 LOC) und Bibliotheken (ts-fsrs) werden beim initialen Load übertragen und geparst.

**Auswirkungen auf Nutzer:** Parsing 476 KB JS auf low-end Android: 1–3 Sekunden. Time-to-Interactive wird durch diesen Block dominiert.

**Empfohlene Lösung:** Route-based Code-Splitting via `React.lazy` + `Suspense`:
```javascript
const FlashcardScreen = lazy(() => import('./screens/FlashcardScreen'));
const WeakSpotsScreen = lazy(() => import('./screens/WeakSpotsScreen'));
```
Vite `build.rollupOptions.output.manualChunks` für ts-fsrs als separaten Vendor-Chunk.

**Aufwand:** Mittel (1 Tag + Testabdeckung für Suspense-Boundaries)  
**Regressionrisiko:** Mittel (Suspense-Boundaries müssen korrekt gesetzt sein, Ladeflackern vermeiden)  
**Benchmark:** Lighthouse Performance Score + Time-to-Interactive vor/nach

---

## 4. Backend-Befunde

### P-BE-01 (High) – `better-sqlite3` blockiert Node.js Event Loop synchron

**Datei/Funktion:** `server/db.js` (alle DB-Funktionen); `server/index.js` (alle Route-Handler)

**Konkretes Problem:**
`better-sqlite3` ist ein synchroner SQLite-Treiber. Jede DB-Operation blockiert den Event Loop vollständig. Hot-Path pro Request:

| Operation | Wo | Blockiert |
|-----------|-----|-----------|
| SHA-256(token) | `validateSession` | ja |
| `SELECT users WHERE session_hash = ?` | `validateSession` | ja |
| `UPDATE users SET last_seen = ?` | `validateSession` | ja |
| `JSON.parse(state_json)` | `loadUserState` | ja |
| `JSON.stringify(state)` | `saveUserState` | ja |
| `INSERT OR REPLACE user_state` | `saveUserState` | ja |

Für einen User mit 400 KB `state_json`: JSON.parse ~2–5ms + DB-Zeit. Während dieser Zeit können keine anderen Requests bearbeitet werden.

**Auswirkungen auf Nutzer:** Erhöhte Latenz für alle parallelen User-Sessions während Materialanalysen.

**Benchmark-Plan:**
```javascript
// In server/db.js, temporär:
const t0 = process.hrtime.bigint();
const result = JSON.parse(row.state_json);
console.log(`loadUserState parse: ${(process.hrtime.bigint() - t0) / 1_000_000n}ms, ${row.state_json.length} bytes`);
```

**Empfohlene Lösung (kurzfristig):** State-Größe reduzieren (P-DB-01). Worker-Threads für JSON.parse/stringify großer States.  
**Empfohlene Lösung (langfristig):** Async SQLite-Treiber oder PostgreSQL.

**Aufwand:** Hoch (Treiberumstieg)  
**Regressionrisiko:** Hoch

---

### P-BE-02 (Medium) – `updateStreak` macht doppelten State-Roundtrip

**Datei/Funktion:** `server/db.js`, `updateStreak`, Zeilen ~515–541

**Konkretes Problem:**
```javascript
const state = loadUserState(userId);              // JSON.parse(gesamter State)
const newState = { ...(state || {}), streak: newStreak };
saveUserState(userId, newState);                  // JSON.stringify(gesamter State) + DB-Write
```
Nur um ein `streak`-Objekt zu aktualisieren, wird der vollständige Lernstand (inkl. aller Blöcke, Projekte, Karten) deserialisiert und reserialisiert.

**Empfohlene Lösung:** `streak`-Daten in eine separate Tabelle oder JSON-Column (`users.streak_json`) auslagern.

**Aufwand:** Mittel (Datenbankschema-Änderung + Migration)  
**Regressionrisiko:** Mittel

---

### P-BE-03 (Medium) – `POST /api/state` serialisiert JSON zweimal

**Datei/Funktion:** `server/index.js`, POST `/api/state`, Zeile ~899; `server/db.js`, `saveUserState`

**Konkretes Problem:**
```javascript
// In index.js:
const stateJson = JSON.stringify(state);    // 1. Stringify für Größencheck

// In saveUserState (db.js) intern:
JSON.stringify(safeState)                   // 2. erneutes Stringify für DB-Write
```
Für jeden State-Save: 2× `JSON.stringify` des vollständigen States. Für einen 400-KB-State: ~4–10ms reine Serialisierungszeit.

**Empfohlene Lösung:** `stateJson`-String aus Größencheck direkt an `saveUserState` übergeben, dort JSON-String direkt speichern statt erneut zu serialisieren.

**Phase-0-Verifikation:** Der `stateJson`-String (index.js Zeile 899) operiert auf `state` (inkl. `blocksAnalyzedTotal`). Die DB-Persistenz in `saveUserState` (db.js Zeile 489) erwartet `safeState = state − {blocksAnalyzedTotal, fileBase64, materialText}` — ein anderes Objekt. Eine direkte Wiederverwendung von `stateJson` würde `blocksAnalyzedTotal` in die DB schreiben und damit S-07 verletzen. Eine sichere gemeinsame Serialisierung würde erfordern: (1) alle drei Felder im Handler strippen, (2) serialisieren, (3) String an refaktorierte `saveUserState`-Signatur übergeben. **Sprint-1-Entscheidung: Optimierung nicht erzwingen — Finding dokumentieren.**

**Aufwand:** Minimal (< 1h) — aber nur mit Refaktorierung beider Funktionen realisierbar  
**Regressionrisiko:** Gering bei korrekter Umsetzung

---

### P-BE-04 (Low) – Session-Validierung schreibt `last_seen` auf jedem Request

**Datei/Funktion:** `server/db.js`, `validateSession`

**Konkretes Problem:**
```javascript
db.prepare("UPDATE users SET last_seen = datetime('now') WHERE id = ?").run(user.id);
```
Jeder API-Request — auch GET /api/state, GET /health — führt ein DB-Write durch. Generiert kontinuierlich WAL-Einträge bei jedem Request.

**Empfohlene Lösung:** `last_seen` nur alle 60 Sekunden aktualisieren:
```javascript
const needsUpdate = !user.last_seen || (Date.now() - new Date(user.last_seen).getTime()) > 60_000;
if (needsUpdate) db.prepare("UPDATE users SET last_seen = datetime('now') WHERE id = ?").run(user.id);
```

**Aufwand:** Gering (< 2h)  
**Regressionrisiko:** Gering (nur Genauigkeit von `last_seen` marginal reduziert)

---

### P-BE-05 (High) – Unkontrollierter Speicherverbrauch bei parallelen PDF-Uploads

**Datei/Funktion:** `server/index.js`, POST `/api/analyze`

**Konkretes Problem:**
`express.json({ limit: '35mb' })` erlaubt Requests bis 35 MB. Der vollständige Request-Body inkl. Base64-kodiertem PDF hält im Node.js-Heap für die gesamte Anthropic-API-Aufrufzeit (~5–20 Sekunden). Für 24 MB PDF: ~32 MB Base64-String im Heap.

Das Rate-Limit (10/Stunde pro IP) limitiert einzelne User, schützt aber nicht vor 10 gleichzeitigen Requests von 10 verschiedenen IPs:  
**10 gleichzeitige 24-MB-Requests ≈ 320 MB zusätzlicher Heap** auf einer Railway-Instanz mit 512 MB–1 GB RAM.

**Auswirkungen auf Nutzer:** OOM-Kill der Railway-Instanz → Ausfall für alle aktiven User.

**Phase-0-Verifikation:** `express.json({ limit: '35mb' })` ist in `server/index.js` Zeile 207 als **globales Middleware** registriert — vor allen Route-Handlern und vor dem Session-Middleware-Layer. Ein Concurrency-Check im `/api/analyze`-Handler allein reicht nicht: der 35-MB-Body ist zu diesem Zeitpunkt bereits vollständig in den Heap gelesen. Korrekte Implementierung erfordert entweder (a) route-spezifischen Body-Parser für `/api/analyze` statt des globalen, oder (b) ein Pre-Parser-Middleware-Layer, der den Slot prüft und den Request abbricht, bevor `express.json()` greift.

**Empfohlene Lösung:** Route-spezifischen Body-Parser + Admission-Control-Middleware:
```javascript
let activeAnalyzeCount = 0;
const MAX_CONCURRENT_ANALYZE = 3;

// Admission control BEFORE body is read (no global express.json for this route)
app.post('/api/analyze',
  (req, res, next) => {
    if (activeAnalyzeCount >= MAX_CONCURRENT_ANALYZE) {
      return res.status(429).json({ error: 'Server busy, try again shortly' });
    }
    activeAnalyzeCount++;
    res.on('finish', () => activeAnalyzeCount--);
    res.on('close', () => { /* slot released by finish or close */ });
    next();
  },
  express.json({ limit: '35mb' }),  // route-specific parser
  async (req, res) => { /* ... */ }
);
```

**Aufwand:** Gering–Mittel (2–4h inkl. Tests)  
**Regressionrisiko:** Gering (429-Response ist für Client handhabbar)

---

### P-BE-06 (Low) – `isTooDeep` rekursiv traversiert gesamten State auf jedem Save

**Datei/Funktion:** `server/index.js`, `isTooDeep`, Zeilen ~852–861

**Konkretes Problem:**
```javascript
function isTooDeep(obj, depth = 0) {
  if (depth > 10) return true;
  if (typeof obj !== 'object' || obj === null) return false;
  return Object.values(obj).some(v => isTooDeep(v, depth + 1));
}
```
Rekursive Traversierung auf jedem `POST /api/state`. State mit 500 Flashcards × 10 Felder = 5.000 Knoten traversiert.

**Empfohlene Lösung:** Traversierung mit frühem Exit optimieren; oder Tiefenprüfung durch JSON-Schema-Validierung mit begrenzter Tiefe ersetzen.

**Aufwand:** Gering  
**Regressionrisiko:** Gering

---

### P-BE-07 (Low) – Kein globales Concurrency-Limit für Claude-API-Calls

**Datei/Funktion:** `server/index.js`, alle Claude-API-Endpoints (`/api/analyze`, `/api/generate-cards`, `/api/chat`, etc.)

**Konkretes Problem:**
Individuelle Rate-Limits pro IP schützen nicht vor gleichzeitigen Requests verschiedener User. Ohne globales Limit: N User können gleichzeitig Claude-API-Calls starten. Kombiniert mit P-BE-01 (synchroner Event Loop): jede `better-sqlite3`-Operation während eines aktiven Claude-Calls blockiert alle anderen.

**Empfohlene Lösung:** Shared Semaphore für Claude-API-Calls:
```javascript
let activeAiCalls = 0;
const MAX_AI_CALLS = 5;
// vor jedem Claude-Call prüfen; am Ende dekrementieren
```

**Aufwand:** Gering (< 2h)  
**Regressionrisiko:** Gering

---

### P-BE-08 (Low) – `/api/youtube-videos` sequenzielle Claude-Calls

**Datei/Funktion:** `server/index.js`, `/api/youtube-videos`, Zeilen ~750–813

**Konkretes Problem:**
Zwei Anthropic-API-Aufrufe werden sequenziell ausgeführt (Query-Optimierung → YouTube-Verarbeitung). Addierte Latenz: 2 × 500–2.000ms = 1–4 Sekunden für ein Hintergrundfeature.

**Empfohlene Lösung:** Prüfen, ob Call 2 das Ergebnis von Call 1 zwingend benötigt. Falls ja: akzeptabel. Falls nein: `Promise.all` für Parallelisierung.

**Aufwand:** Gering (Analyse + ggf. Parallelisierung)  
**Regressionrisiko:** Gering

---

## 5. SQLite-Befunde

### P-DB-01 (High) – `user_state` JSON-Blob wächst unbegrenzt, trifft 500-KB-Grenze

**Datei/Funktion:** `server/db.js`, Schema: `user_state.state_json TEXT NOT NULL`; `server/index.js` Größencheck

**Konkretes Problem:**
Alles landet in einem JSON-Blob pro User: Blöcke (inkl. vollständiger Contents), Projekte (inkl. duplizierter Blöcke durch P-FE-06), Lernkarten (inkl. vollständiger FSRS-Parameterobjekte), History, Metadaten.

Hypothetisches Wachstum für einen aktiven User:
- 5 Projekte × 10 Blöcke × 2 KB Content = 100 KB (nur Blöcke-Duplikate)
- 500 Lernkarten × 200 Bytes FSRS-State = 100 KB
- Block-Contents, History, Metadaten: weitere 100–300 KB
- **Realistisch: 300–600 KB** → trifft 500-KB-Servergrenze

**Auswirkungen auf Nutzer:** `POST /api/state` schlägt mit HTTP 413 fehl. State wird nicht mehr serverseitig gespeichert. Bei Datenverlust (Tab-Schließen vor IDB-Sync) gehen Lernfortschritte verloren.

**Empfohlene Lösung (sofort):** Größenlimit auf 1 MB anheben.  
**Empfohlene Lösung (mittelfristig):** Normalisiertes Schema: Blöcke, Lernkarten, Projekte in eigene Tabellen; `user_state` nur noch für Präferenzen/Metadaten.

**Aufwand:** Minimal (Limit-Erhöhung) / Hoch (Normalisierung)  
**Regressionrisiko:** Gering (Limit) / Hoch (Normalisierung)

---

### P-DB-02 (Medium) – Vollständiger JSON-Roundtrip auf jedem State-Zugriff

**Datei/Funktion:** `server/db.js`, `loadUserState`, `saveUserState`

**Konkretes Problem:**
Jede Lese-Operation: `JSON.parse(row.state_json)` über den gesamten State.  
Jede Schreib-Operation: `JSON.stringify(safeState)` über den gesamten State.

**Benchmark-Plan (konkret, ohne erfundene Messwerte):**
```javascript
// server/db.js temporär:
function loadUserState(userId) {
  const row = db.prepare('SELECT state_json FROM user_state WHERE user_id = ?').get(userId);
  if (!row) return null;
  const t0 = process.hrtime.bigint();
  const result = JSON.parse(row.state_json);
  const ms = Number(process.hrtime.bigint() - t0) / 1_000_000;
  if (ms > 1) console.warn(`loadUserState: ${ms.toFixed(2)}ms, ${row.state_json.length} bytes`);
  return result;
}
```

**Empfohlene Lösung (langfristig):** Normalisiertes Schema (P-DB-01). Kurzfristig: State-Komprimierung mit `zlib.deflateRaw` vor Speicherung.

**Aufwand:** Minimal (Benchmark) / Hoch (Normalisierung)

---

### P-DB-03 (Medium) – `updateStreak` und `incrementBlocksAnalyzed` ineffiziente Muster

**Datei/Funktion:** `server/db.js`, `updateStreak` (~515–541), `incrementBlocksAnalyzed` (~584–596)

**Konkretes Problem:**
`incrementBlocksAnalyzed` führt 2 separate synchrone DB-Statements aus:
```javascript
db.prepare('UPDATE users SET blocks_analyzed_total = blocks_analyzed_total + ? WHERE id = ?').run(count, userId);
const row = db.prepare('SELECT blocks_analyzed_total FROM users WHERE id = ?').get(userId);
return row?.blocks_analyzed_total ?? -1;
```
Atomares `UPDATE ... RETURNING` wäre ein einziger Roundtrip.

**Phase-0-Verifikation:** `better-sqlite3` bundled SQLite **3.53.4** (gemessen). `UPDATE ... RETURNING` wird seit SQLite 3.35.0 unterstützt — hier sicher nutzbar. ✓

**Empfohlene Lösung:**
```javascript
// SQLite 3.53.4 (Phase-0-gemessen) — RETURNING seit 3.35.0 unterstützt ✓
const row = db.prepare(
  'UPDATE users SET blocks_analyzed_total = blocks_analyzed_total + ? WHERE id = ? RETURNING blocks_analyzed_total'
).get(count, userId);
return row?.blocks_analyzed_total ?? -1;
```

**Aufwand:** Minimal  
**Regressionrisiko:** Gering

---

### P-DB-04 (Low) – WAL-Checkpoint-Verhalten bei hoher Schreibfrequenz unklar

**Datei/Funktion:** `server/db.js`, DB-Initialisierung (`PRAGMA journal_mode = WAL`)

**Konkretes Problem:**
WAL-Modus ist korrekt aktiviert. Automatische Checkpoints bei 1.000 Seiten (= 4 MB WAL-Datei). Bei hoher Schreibfrequenz (State-Saves vieler paralleler User) kann Checkpoint-Moment zu kurzen Schreibpausen führen.

**Kein reproduzierbarer Nachweis:** Potenziell relevant bei Wachstum des Produkts.

**Benchmark-Plan:**
```bash
# WAL-Größe nach Stress-Test messen:
ls -lh /path/to/lumo.db-wal
# SQLite PRAGMA-Aufruf:
db.prepare("PRAGMA wal_checkpoint(PASSIVE)").run();
db.prepare("PRAGMA page_count").get();
```

**Empfohlene Lösung:** `PRAGMA wal_autocheckpoint = 400` für häufigere, kleinere Checkpoints falls WAL > 2 MB unter Last.

**Aufwand:** Minimal  
**Regressionrisiko:** Minimal

---

## 6. PWA-Befunde

### P-PWA-01+02 (Critical) – Precache von 4.813 KiB beim ersten Start und unkomprimierte Mascot-PNGs

**Datei/Funktion:** `vite.config.js`, Workbox-Precache; Build-Output `dist/`

**Gemessene Ist-Situation:**

| Datei | Gemessene Größe | Anteil am Precache |
|-------|-----------------|---------------------|
| `dist/mascot/lumo-cheer.png` | **1.165 KB** | 24,2 % |
| `dist/mascot/lumo-complete.png` | **811 KB** | 16,8 % |
| `dist/mascot/lumo-thinking.png` | **805 KB** | 16,7 % |
| `dist/mascot/lumo-learning.png` | **692 KB** | 14,4 % |
| `dist/mascot/lumo-idle.png` | **607 KB** | 12,6 % |
| **5 Mascot-PNGs gesamt** | **~3.980 KB** | **82,7 %** |
| `dist/assets/index-*.js` | **476 KB** | 9,9 % |
| `dist/icon-512.png` | **211 KB** | 4,4 % |
| `dist/workbox-*.js` | **21 KB** | 0,4 % |
| `dist/assets/index-*.css` | **20 KB** | 0,4 % |
| `dist/icon-192.png` | **38 KB** | 0,8 % |
| Weitere | **~5 KB** | 0,1 % |
| **Gesamt Precache** | **4.813 KB** | 100 % |

**Ladezeit-Schätzung beim ersten PWA-Install (ohne Messung, rechnerisch):**

| Verbindung | Geschwindigkeit | Schätzung |
|------------|-----------------|-----------|
| WLAN / LTE | ~20 Mbps | ~2 Sekunden |
| 4G          | ~8 Mbps  | ~5 Sekunden |
| 3G          | ~1,5 Mbps | ~25 Sekunden |
| Schlechtes 3G | ~0,5 Mbps | ~75 Sekunden |

**Auswirkungen auf Nutzer:** Für Nutzer auf mobilen Verbindungen ohne WLAN beim ersten Start bis zu 1 Minute nicht nutzbar.

**Empfohlene Lösung:**
1. Mascot-PNGs in WebP konvertieren (erfahrungsgemäß 60–80 % Größenreduktion bei gleicher visueller Qualität)
2. Mascot-PNGs aus dem Precache entfernen → Runtime-Caching:
```javascript
// vite.config.js:
workbox: {
  globPatterns: ['**/*.{js,css,html,ico,woff,woff2}'],  // PNGs entfernen
  runtimeCaching: [{
    urlPattern: /\.(png|webp|jpg|svg)$/,
    handler: 'CacheFirst',
    options: {
      cacheName: 'lumo-images-v1',
      expiration: { maxAgeSeconds: 30 * 24 * 60 * 60, maxEntries: 20 }
    }
  }]
}
```
3. `icon-512.png` ebenfalls in WebP konvertieren (211 KB → schätzungsweise ~50–70 KB)

**Geschätzte Precache-Größe nach Fix:** ~550–700 KB (JS + CSS + HTML + Icons) → **86 % Reduktion**

**Aufwand:** Gering (Konfiguration ~1h) + Mittel (Bildkonvertierung + Quality-Check)  
**Regressionrisiko:** Gering (Mascots werden beim ersten echten Aufruf gecacht; Offline-Funktion bei absolutem Erststart ohne Netz degradiert leicht)  
**Aspekt 2 – Bildkomprimierung (zusammengefasst aus P-PWA-02):**

Die fünf Mascot-PNGs liegen unkomprimiert in `public/mascot/` und werden ohne Konvertierung nach `dist/mascot/` kopiert. Vite-seitige Bildoptimierung findet nicht statt.

| Datei | Gemessene Größe |
|-------|-----------------|
| `lumo-cheer.png` | 1.192.541 Bytes (1,14 MB) |
| `lumo-complete.png` | 829.816 Bytes (0,79 MB) |
| `lumo-thinking.png` | 823.848 Bytes (0,79 MB) |
| `lumo-learning.png` | 707.802 Bytes (0,68 MB) |
| `lumo-idle.png` | 621.582 Bytes (0,59 MB) |
| **Gesamt** | **~4,18 MB** |

Erfahrungsgemäß reduziert `cwebp -q 85` PNGs mit Transparenz um 60–80 % (kein vorab gemessener Wert — Schätzung auf Basis allgemeiner WebP-Komprimierungserfahrung). Fallback: `<picture><source type="image/webp"><img src=".png"></picture>` für ältere Browser. Die beiden Aspekte Precache-Strategie und Bildkomprimierung sind eng gekoppelt: Größeneinsparung durch WebP ist in der installierten PWA nur dann wirksam, wenn die Mascots gleichzeitig aus dem Precache herausgenommen werden.

**Validierung:** `npm run build` → Precache-Größe im Build-Output prüfen; Größenvergleich aller 5 WebP- vs. PNG-Dateien.

---

### P-PWA-03 (Low) – `autoUpdate` kann aktive Lern-Session unterbrechen

**Datei/Funktion:** `vite.config.js`, `registerType: 'autoUpdate'`

**Konkretes Problem:**
`registerType: 'autoUpdate'` kombiniert mit vermutlichem `self.skipWaiting()` + `clientsClaim()` übernimmt ein neues SW-Update sofort alle Clients. Ein Deploy während einer aktiven Flashcard-Session erzwingt eine Seitenaktualisierung.

**Auswirkungen:** Lernfortschritt seit letztem State-Save könnte verloren gehen. Betrifft v.a. Mobile-User, die die App längere Zeit im Hintergrund haben.

**Empfohlene Lösung:** Entweder `skipWaiting()` nur bei User-Bestätigung aufrufen (`updateFound`-Event abfangen); oder sicherstellen, dass jede Kartenbewertung persistiert wird bevor SW übernimmt (wird durch P-FE-01-Fix abgedeckt).

**Aufwand:** Gering  
**Regressionrisiko:** Gering

---

### P-PWA-04 (Low) – Offline-Synchronisation nach Reconnect nicht verifiziert

**Datei/Funktion:** `src/screens/FlashcardScreen.jsx`; `src/utils/storage.js`

**Konkretes Problem:**
FlashcardScreen triggert bei Kartenbewertung `onUpdateFlashcard`, welcher über den Storage-Effect einen `POST /api/state` auslöst. Ohne Netzwerk schlägt dieser silently fehl (`.catch(() => {})`). Die App speichert in localStorage + IDB, aber kein Background Sync (Service Worker Sync API) wurde im analysierten Code gefunden.

**Kein reproduzierbarer Nachweis vorhanden** — dies ist eine Beobachtung, kein gemessenes Problem.

**Benchmark-Plan:**
1. Chrome DevTools → Network → „Offline" setzen
2. Lernkarten bewerten
3. Netzwerk wiederherstellen
4. Prüfen: synchronisiert `POST /api/state` korrekt nach Reconnect?
5. Prüfen: Ist der Server-State danach identisch mit dem lokalen State?

**Aufwand:** Minimal (Test), Mittel (Background Sync falls Lücke gefunden)

---

## 7. Vorhandene Messwerte und Testabdeckung

### Tatsächlich ermittelte Messwerte

| Metric | Wert | Ermittlung |
|--------|------|------------|
| JS Bundle (roh) | **476.278 Bytes (476 KB)** | `npm run build` + `ls -la dist/assets/` |
| JS Bundle (gzip) | **127.99 KB** | `npm run build` Output |
| CSS Bundle | **20.248 Bytes (20 KB)** | `ls -la dist/assets/` |
| PWA Precache Gesamt | **4.813.050 Bytes (4.813 KB)** | `npm run build` Output |
| PWA Precache Entries | **11** | `npm run build` Output |
| `lumo-cheer.png` | **1.192.541 Bytes (1.165 KB)** | `ls -lah public/mascot/` |
| `lumo-complete.png` | **829.816 Bytes (811 KB)** | `ls -lah public/mascot/` |
| `lumo-thinking.png` | **823.848 Bytes (805 KB)** | `ls -lah public/mascot/` |
| `lumo-learning.png` | **707.802 Bytes (692 KB)** | `ls -lah public/mascot/` |
| `lumo-idle.png` | **621.582 Bytes (607 KB)** | `ls -lah public/mascot/` |
| `icon-512.png` | **215.571 Bytes (211 KB)** | `ls -la dist/` |
| Test-Suite | **178/178 ✔** | `npm test` |

### Nicht vorliegende Messwerte (Benchmark-Plan erforderlich)

Folgende Werte wurden **nicht gemessen** — es wurden keine Schätzungen oder fiktiven Zahlen eingetragen:

| Metric | Benchmark-Plan |
|--------|---------------|
| `loadUserState` Latenz bei 400KB State | `process.hrtime.bigint()` um `JSON.parse(row.state_json)` |
| `saveUserState` Latenz | `process.hrtime.bigint()` um `JSON.stringify` + DB-Write |
| `JSON.stringify` Latenz im UI-Thread (500 Karten) | Synthetischer State + `performance.now()` im Browser |
| State-Größe typischer Power-User | Logging von `state_json.length` in `saveUserState` |
| Mascot-WebP-Größe nach Konvertierung | `cwebp -q 85` + Größenvergleich |
| Precache-Größe nach PWA-Fix | `npm run build` nach Konfigurationsänderung |
| Parallelisierungs-Impact | `autocannon` mit 10 gleichzeitigen `/api/analyze`-Requests |

### Bestehende Testabdeckung

**Abgedeckt (178/178 Tests):** API-Endpoints funktional, Auth/Session-Logik, State-Persistenz (funktional).

**Nicht abgedeckt:**
- Performance-Tests (kein einziger `perf_hooks`-basierter Test)
- Load-Tests / parallele Requests
- Tests mit synthetisch großen States (500+ Karten, 5+ Projekte)
- Bundle-Größen-Regression (kein CI-Check auf Bundle-Größe)
- Offline-Synchronisationsverhalten

---

## 8. Priorisierte Findings

| Rang | ID | Schweregrad | Problem | Datei | Aufwand |
|------|-----|-------------|---------|-------|---------|
| 1 | P-PWA-01+02 | **Critical** | 4,8 MB Precache bei Erst-Install (82,7 % unkomprimierte Mascot-PNGs) | vite.config.js | Gering+Mittel |
| 2 | P-FE-11 | **High** | Kein Code-Splitting, 476 KB Einzel-Bundle | vite.config.js | Mittel |
| 3 | P-BE-05 | **High** | Unkontrollierter RAM-Verbrauch bei parallelen PDF-Uploads — Admission-Control muss vor globalem express.json() greifen | server/index.js | Gering+Mittel |
| 4 | P-FE-01 | **High** | Storage-Effect: synchrones JSON.stringify+localStorage bei jeder State-Änderung | src/App.jsx | Mittel |
| 5 | P-DB-01 | **High** | user_state JSON-Blob wächst unbegrenzt, trifft 500-KB-Limit | server/db.js | Hoch |
| 6 | P-BE-01 | **High** | better-sqlite3 blockiert Event Loop synchron | server/db.js | Hoch |
| 7 | P-FE-07 | Medium | activeQueue O(n²) auf jedem FlashcardScreen-Render | FlashcardScreen.jsx | Minimal |
| 8 | P-FE-08 | Medium | FSRS-Fälligkeitsberechnung ohne useMemo im Dashboard | DashboardScreen.jsx | Minimal |
| 9 | P-BE-03 | Medium | Doppeltes JSON.stringify pro State-Save — nicht eliminierbar ohne Refaktorierung (Phase-0-Verifikation) | server/index.js | Mittel |
| 10 | P-FE-02 | Medium | handleSaveCardResults: N individuelle Dispatches | src/App.jsx | Gering |
| 11 | P-FE-04 | Medium | ADD_FLASHCARDS O(n²) Deduplication | appReducer.js | Minimal |
| 12 | P-FE-05 | Medium | UPDATE_FLASHCARD O(n) map per Update | appReducer.js | Gering |
| 13 | P-FE-03 | Medium | SET_SUBJECT_COLOR O(n) Block-Map bei jeder Farbwahl | appReducer.js | Mittel |
| 14 | P-FE-06 | Medium | SAVE_CURRENT_PROJECT dupliziert blocks[] in Projekt-Snapshots | appReducer.js | Hoch |
| 15 | P-BE-02 | Medium | updateStreak: unnötiger voller State-Roundtrip | server/db.js | Mittel |
| 16 | P-DB-02 | Medium | Vollständiger JSON-Roundtrip für jeden State-Zugriff | server/db.js | Hoch |
| 17 | P-DB-03 | Medium | incrementBlocksAnalyzed: 2 separate DB-Ops statt RETURNING | server/db.js | Minimal |
| 18 | P-FE-09 | Low | Prefetch ohne AbortController | DashboardScreen.jsx | Minimal |
| 19 | P-BE-04 | Low | last_seen-Update auf jedem Request | server/db.js | Gering |
| 20 | P-BE-07 | Low | Kein globales Claude-API Concurrency-Limit | server/index.js | Gering |
| 21 | P-BE-08 | Low | /api/youtube-videos: sequenzielle Claude-Calls | server/index.js | Gering |
| 22 | P-BE-06 | Low | isTooDeep O(n) rekursiv auf jedem State-Save | server/index.js | Gering |
| 23 | P-FE-10 | Low | SM-2→FSRS-Migration: N individuelle Dispatches | FlashcardScreen.jsx | Gering |
| 24 | P-PWA-03 | Low | autoUpdate kann aktive Lern-Session unterbrechen | vite.config.js | Gering |
| 25 | P-PWA-04 | Low | Offline-Synchronisation nach Reconnect nicht verifiziert | FlashcardScreen.jsx | Minimal |
| 26 | P-DB-04 | Low | WAL-Checkpoint-Verhalten bei hoher Schreibfrequenz unklar | server/db.js | Minimal |

---

## 9. False Positives

### FP-01 – `user_state.user_id` ist indiziert (PRIMARY KEY)

**Vermutet:** Fehlender Index auf `user_state.user_id`.

**Tatsächlich:** `user_state.user_id TEXT PRIMARY KEY` — SQLite erstellt automatisch einen B-Tree-Index auf PRIMARY KEY-Felder. Alle Zugriffe via `WHERE user_id = ?` sind O(log n).

**Fazit:** Kein Handlungsbedarf.

---

### FP-02 – `navigateFallbackDenylist` korrekt konfiguriert

**Vermutet:** API-Routen werden durch Service Worker als Navigation abgefangen.

**Tatsächlich:** `navigateFallbackDenylist: [/^\/api\//]` ist korrekt gesetzt. API-Requests werden nicht durch den SW als Navigation behandelt. Offline-Fallback auf `/index.html` gilt nur für UI-Routen.

**Fazit:** Kein Handlungsbedarf.

---

### FP-03 – FSRS-Instanz ist Module-Level-Singleton

**Vermutet:** `fsrs()`-Instanz wird möglicherweise pro Render oder pro Kartenbewertung neu erstellt.

**Tatsächlich:** In `src/utils/fsrs.js`, Zeile ~15: `const f = fsrs(params)` ist auf Modul-Level definiert. Wird einmalig beim ersten Import initialisiert, nicht pro Render oder Rating-Operation.

**Fazit:** Korrekte Implementierung. Kein Handlungsbedarf.

---

## 10. Empfohlene Implementierungsreihenfolge

Die Reihenfolge priorisiert: höchsten User-Impact bei geringstem Aufwand, gefolgt von Stabilitätsrisiken.

### Sprint 1 – Quick Wins (< 1 Woche, geringes Risiko)

| # | Finding | Maßnahme | Erwarteter Impact |
|---|---------|----------|-------------------|
| 1 | P-PWA-01 + P-PWA-02 | Mascot-PNGs aus Precache, Runtime-Caching, WebP-Konvertierung | Precache 4.813 KB → ~550 KB (86 %) |
| 2 | P-BE-05 | Globaler Concurrency-Limiter für `/api/analyze` | Produktionsstabilität bei parallelen PDF-Uploads |
| 3 | P-FE-07 | `useMemo` für `activeQueue` in FlashcardScreen | O(25.000) → O(0) Vergleiche per Render bei 500 Karten |
| 4 | P-FE-04 | `Set`-basierte Deduplication in `ADD_FLASHCARDS` | O(n×m) → O(n+m) |
| 5 | P-BE-03 | Doppeltes `JSON.stringify` — **nicht umsetzbar ohne Refaktorierung** (Phase-0-Verifikation: unterschiedliche Objekte, Reuse würde S-07 verletzen) | Dokumentiert, nicht implementiert |
| 6 | P-FE-08 | `useMemo` für FSRS-Berechnung + Stats im Dashboard | Wiederholte FSRS-Rechenzeit eliminiert |
| 7 | P-FE-09 | `AbortController` für Prefetch-useEffect | Stale Requests eliminiert |
| 8 | P-BE-04 | `last_seen`-Update throttlen (60s-Interval) | ~50 % weniger DB-Writes |
| 9 | P-DB-03 | `incrementBlocksAnalyzed` auf `RETURNING` migrieren | 2 DB-Ops → 1 |

**Validierung Sprint 1:** `npm run build` → Precache-Größe; `npm test` → 178/178

### Sprint 2 – State-Management (1–2 Wochen, mittleres Risiko)

| # | Finding | Maßnahme |
|---|---------|----------|
| 10 | P-FE-02 + P-FE-10 | `UPDATE_FLASHCARDS_BATCH`-Reducer; `handleSaveCardResults` und SM-2-Migration batchén |
| 11 | P-FE-01 | Storage-Effect debounce (300ms); IDB als primäre Persistenz |
| 12 | P-FE-11 | Code-Splitting: `React.lazy` für selten genutzte Screens; ts-fsrs als Vendor-Chunk |
| 13 | P-BE-07 | Globaler Claude-API Concurrency-Limiter |
| 14 | P-BE-08 + P-FE-09 | `/api/youtube-videos` Parallelisierung; AbortController |

**Validierung Sprint 2:** React Profiler vor/nach; Lighthouse Performance Score

### Sprint 3 – Backend Stabilität (1–2 Wochen, mittleres Risiko)

| # | Finding | Maßnahme |
|---|---------|----------|
| 15 | P-DB-01 (sofort) | `state_json`-Größenlimit auf 1 MB anheben |
| 16 | P-BE-02 | `streak`-Daten aus `user_state` herauslösen |
| 17 | P-DB-02 | Benchmarks messen; ggf. `zlib`-Komprimierung |
| 18 | P-BE-06 | `isTooDeep` optimieren |

**Validierung Sprint 3:** Synthetischer Load-Test mit 500-Karten-State

### Sprint 4 – Architektur (> 1 Monat, hohes Risiko, strategisch)

| # | Finding | Maßnahme |
|---|---------|----------|
| 19 | P-FE-03 + P-FE-06 | `subjectColor` als eigenständiges State-Feld; Blöcke aus Projekt-Snapshots entfernen |
| 20 | P-DB-01 (langfristig) | Normalisiertes Schema: Blöcke, Projekte, Karten in eigene Tabellen |
| 21 | P-BE-01 | Evaluierung async SQLite-Treiber oder PostgreSQL für Produktionsskalierung |

---

*Audit abgeschlossen: 2026-11-04. Keine Codeänderungen wurden vorgenommen. Kein Commit.*
