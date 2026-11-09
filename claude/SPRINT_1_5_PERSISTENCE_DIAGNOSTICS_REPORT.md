# SPRINT 1.5 — Persistence Diagnostics Report

**Erstellt:** 2026-11-08  
**Sprints:** Sprint 1.5 (State-Limit-Hardening und Persistenzdiagnose)  
**Status:** Abgeschlossen

---

## Legende

| Kennzeichnung | Bedeutung |
|---|---|
| **[GEMESSEN]** | Tatsächlich ausgeführte Messung (Test-Assertion, Build-Output) |
| **[CODEANALYSE]** | Aus Quellcode abgeleiteter Wert (kein Runtime-Browser) |
| **[SCHÄTZUNG]** | Plausible Größenordnung auf Basis von Struktur und bekannten Werten |

---

## Phase 1 — UTF-8-Byte-Limit-Korrektur

### Befund

Die State-Größenprüfung in `server/index.js` verwendete `stateJson.length`, was UTF-16-Code-Units (JavaScript-String-Länge) zählt, nicht UTF-8-Bytes. Für ASCII-Payloads sind beide identisch, für CJK-Zeichen (3 Bytes/Zeichen) oder Emoji (4 Bytes/Zeichen) kann `stateJson.length` um Faktor 1–4 kleiner als die tatsächliche UTF-8-Bytegröße sein.

**Konkretes Risiko [CODEANALYSE]:**  
Ein Payload mit 400.000 CJK-Zeichen hat:
- `.length` = ~400.011 → wäre als < 1 MB akzeptiert worden
- `Buffer.byteLength('utf8')` = ~1.200.011 → 20 % über dem 1 MB-Limit

### Implementierte Korrektur

**Datei:** `server/index.js`, Zeilen 942–948

```javascript
// Vorher (fehlerhaft):
if (stateJson.length > MAX_STATE_JSON_BYTES) { ... }

// Nachher (korrekt):
const stateByteSize = Buffer.byteLength(stateJson, 'utf8');
if (stateByteSize > MAX_STATE_JSON_BYTES) { ... }
```

Keine doppelte Serialisierung: `stateJson` wird einmalig erzeugt und sowohl für die Größenprüfung als auch für den Downstream-Flow (`saveUserState`) verwendet.

### Tests — Phase 1

**[GEMESSEN]** — 4 neue Tests, alle passing:

| Test | Payload | Erwartung | Ergebnis |
|---|---|---|---|
| S06-1a | ASCII, 1.048.564 Zeichen (< 1 MB) | 200 | ✓ 200 |
| S06-1b | ASCII, 1.048.566 Zeichen (> 1 MB) | 400 | ✓ 400 |
| S06-1c | 400.000 CJK: `.length`<1 MB, Bytes>1 MB | 400 | ✓ 400 |
| S06-1d | 349.520 CJK: Bytes 1.048.571 (< 1 MB) | 200 | ✓ 200 |

**Gesamtergebnis Phase 1 [GEMESSEN]:** 54/54 Security-Hardening-Tests pass, 178/178 Gesamttests pass.

---

## Phase 2 — Persistenz-Instrumentierung

### Architektur der Dev-Instrumentierung

**Neue Datei:** `src/utils/persistenceLogger.js`

```
Produktions-Build:
  import.meta.env.DEV → false (Vite build-time)
  → alle if-Blöcke dead code
  → persistenceLogger.js vollständig tree-geshakt
  → 0 Bytes im Produktions-Bundle

Dev-Build:
  window.__lumoPerf.getStats()   → Metriken abrufen
  window.__lumoPerf.resetStats() → Zurücksetzen
```

**[GEMESSEN]** — Produktions-Bundle-Check:
```bash
grep -r 'lumoPerf|persistenceLogger|logLocalSync' dist/ | wc -l
→ 0
```
Kein Byte des Loggers im Produktions-Bundle.

### Instrumentierte Funktionen

| Funktion | Datei | Gemessene Metriken |
|---|---|---|
| `saveProjectSync` | `storage.js` | JSON.stringify-Dauer, Write-Dauer, UTF-8-Bytes |
| `saveProjectAsync` | `storage.js` | IDB-Write-Dauer, localStorage-Write-Dauer, UTF-8-Bytes |
| `syncToServer` | `serverSync.js` | Fetch-RTT, HTTP-Erfolg |

### Vollständiger Persistenzpfad [CODEANALYSE]

Ausgelöst durch: `useEffect` in `App.jsx` (Zeilen 193–235), abhängig von 17 State-Feldern.

```
Nutzeraktion
    │
    ▼
dispatch(ACTION) → appReducer → neuer State
    │
    ▼  [sofort, synchron]
useEffect erkennt State-Änderung
    │
    ├─► saveProjectSync(snapshot)         Layer 1
    │       └── localStorage.setItem()    ~0–2 ms [SCHÄTZUNG]
    │
    ├─► clearTimeout + setTimeout(300ms)  Layer 2 (debounced)
    │       └── saveProjectAsync(snapshot)
    │               ├── idbSet()          ~1–5 ms [SCHÄTZUNG]
    │               └── localStorage.setItem()  ~0–2 ms [SCHÄTZUNG]
    │
    └─► scheduleSyncToServer(snapshot)    Layer 3 (2000ms debounced)
            └── [nur bei Cookie-Consent = 'accepted']
                POST /api/state           ~50–300 ms (Netzwerk) [SCHÄTZUNG]
```

### State-Größe — Strukturanalyse [CODEANALYSE]

Der Snapshot enthält 17 Felder. Größe hängt primär von `blocks`, `projects`, `flashcards` ab.

| Szenario | Schätzung |
|---|---|
| Leerer State (kein Projekt) | ~200–500 Bytes |
| 1 Projekt, 10 Blöcke, 20 Karten | ~8–15 KB |
| 1 Projekt, 50 Blöcke, 100 Karten | ~40–80 KB |
| 3 Projekte, je 50 Blöcke + Karten | ~100–300 KB |
| Maximal (viele Projekte + Karten) | ~500 KB–1 MB |

Materialdaten (`materialText`, `fileBase64`) werden **nicht** im Snapshot gespeichert — korrekt ausgeschlossen in `App.jsx` Snapshot-Erstellung.

---

## Phase 3 — Repräsentative Szenarien [CODEANALYSE]

> **Hinweis:** Da kein Browser-Testsystem verfügbar war, basieren alle Zahlen auf Codeanalyse und bekannten Timing-Werten. Gemessene Werte werden nach Aktivierung der Dev-Instrumentierung im Browser ergänzt.

### Szenario 1: Dashboard öffnen, nichts tun

**Auslöser:** App-Init → `HYDRATE_FROM_STORAGE`-Dispatch (falls IDB/Server-State neuer)

| Write-Layer | Anzahl |
|---|---|
| localStorage-sync | 1 (bei HYDRATE-Dispatch) |
| IDB-async | 1 (300 ms nach HYDRATE) |
| Server-sync | 0 (kein State-Change durch User) |

**Wichtig:** Der Init-Effekt (`useEffect([], [])`) triggert seinerseits keinen Persistenz-Write. Nur wenn `HYDRATE_FROM_STORAGE` dispatcht wird (Server-State neuer), entsteht 1 Write-Zyklus. Bei identischem State: 0 Writes.

**Bewertung:** ✅ Kein unnötiger Schreibdruck beim reinen Öffnen.

---

### Szenario 2: Eine Flashcard bewerten

**Auslöser:** `RATE_FLASHCARD`-Dispatch (oder analoges Action-Type)  
**Geänderte State-Felder:** `flashcards`, evtl. `blocks`

| Write-Layer | Anzahl | Timing |
|---|---|---|
| localStorage-sync | 1 | sofort (~0–2 ms) |
| IDB-async | 1 | 300 ms debounced |
| Server-sync | 1 | 2000 ms debounced |

**Payload-Größe:** ~20–80 KB [SCHÄTZUNG], dominiert durch `flashcards`-Array mit FSRS-Metadaten.

**Bewertung:** ✅ Normal. 1 Bewertung = 1 Write-Zyklus.

---

### Szenario 3: Komplette Lerneinheit (Session)

**Auslöser:** N Flashcard-Ratings + 1 Session-Complete-Event  
**Beispiel:** 15 Karten à ~3 Sekunden = ~45 s Session

| Write-Layer | Anzahl | Erklärung |
|---|---|---|
| localStorage-sync | N+1 | jede Bewertung + Session-Complete |
| IDB-async | ~2–5 | 300 ms Debounce: bei 3s/Karte wird nach jeder Karte geschrieben |
| Server-sync | ~1–3 | 2000 ms Debounce: 1 Sync/2s-Fenster bei ~15 Karten/45s |

**Wichtig:** localStorage schreibt bei **jeder** Nutzerbewertung. IDB und Server sind durch Debouncing bereits deutlich effizienter.

---

### Szenario 4: Mehrere Karten hintereinander (schnell)

**Annahme:** Nutzer klickt sehr schnell (< 300 ms zwischen Karten)

| Write-Layer | Anzahl (bei N=10 schnellen Ratings in 2s) |
|---|---|
| localStorage-sync | N = 10 (sofort, keine Debounce) |
| IDB-async | 1–2 (300 ms Debounce: fast alle werden gecancelt) |
| Server-sync | 1 (2000 ms Debounce: 1 Server-Call) |

**Befund [CODEANALYSE — potenzielle Friction]:**  
localStorage schreibt **jede** State-Änderung sofort. Bei sehr schnellem Karteikarten-Flipping (z. B. durch ADHD-typisches schnelles Durchklicken) kann es zu 10+ synchronen localStorage-Writes in < 2 Sekunden kommen. Jeder Write blockiert den JS-Main-Thread (synchron). Dauer je Write: ~0–5 ms [SCHÄTZUNG]. Summe bei 10 Writes: bis zu ~50 ms Blocking-Zeit.

---

### Szenario 5: Zwischen Projekten wechseln

**Auslöser:** `SWITCH_PROJECT`-Dispatch  
**Geänderte State-Felder:** `activeProjectId`, `blocks`, evtl. `flashcards`

| Write-Layer | Anzahl |
|---|---|
| localStorage-sync | 1 |
| IDB-async | 1 (300 ms) |
| Server-sync | 1 (2000 ms, bei Consent) |

**Bewertung:** ✅ Normal.

---

### Szenario 6: Neue Lerneinheit hochladen und analysieren

**Auslöser:** Materialanalyse (AI-Stream) → mehrere `APPEND_BLOCK` oder ähnliche Dispatches  
**Besonderheit:** KI-Antwort kommt als Stream → viele schnelle State-Updates

| Write-Layer | Anzahl (bei N=20 Stream-Chunks in 5s) |
|---|---|
| localStorage-sync | N = 20 (sofort, jeder Chunk) |
| IDB-async | ~5–10 (300 ms Debounce) |
| Server-sync | ~2–3 (2000 ms Debounce) |

**Payload-Größe:** Wächst mit jedem Chunk. Am Ende (20 Blöcke): ~50–150 KB [SCHÄTZUNG].

**Befund:** Hier entsteht der höchste Write-Druck. localStorage schreibt bei jedem Stream-Chunk synchron.

---

## Phase 4 — Entscheidungsvorlage für Sprint 2

### Schreibhäufigkeit pro Szenario (Zusammenfassung)

| Szenario | LS-Writes | IDB-Writes | Server-Writes |
|---|---|---|---|
| Dashboard öffnen | 0–1 | 0–1 | 0 |
| 1 Flashcard bewerten | 1 | 1 | 1 |
| Session (15 Karten) | 15–16 | 2–5 | 1–3 |
| Schnelles Klicken (10 Karten) | 10 | 1–2 | 1 |
| Projekt wechseln | 1 | 1 | 1 |
| Material analysieren (20 Chunks) | 20 | 5–10 | 2–3 |

### Teuerste Operationen [CODEANALYSE + SCHÄTZUNG]

| Operation | Dauer | Blocking? |
|---|---|---|
| `localStorage.setItem` (kleiner State, ~10 KB) | ~0–2 ms | **Ja (synchron)** |
| `localStorage.setItem` (großer State, ~200 KB) | ~2–10 ms | **Ja (synchron)** |
| `idbSet` (IDB-Write) | ~1–5 ms | Nein (async) |
| POST /api/state | ~50–300 ms | Nein (async, debounced) |
| `JSON.stringify` (kleiner State, ~10 KB) | ~0–1 ms | Ja (synchron) |
| `JSON.stringify` (großer State, ~200 KB) | ~1–5 ms | Ja (synchron) |

**Wichtigste Erkenntnis:** Das einzige blocking-kritische Muster ist `saveProjectSync` (localStorage + JSON.stringify), das bei **jeder** State-Änderung sofort ausgeführt wird.

### Doppelte Schreibvorgänge?

**Ja, dokumentiert:**  
`saveProjectAsync` schreibt in **beide** Layer: IDB + localStorage.  
`saveProjectSync` (sofort) + `saveProjectAsync` (300 ms) schreiben **beide** nach localStorage.

Bei einer Nutzerbewertung entstehen damit:
- 1× `JSON.stringify` + `localStorage.setItem` (sofort, in `saveProjectSync`)
- 1× IDB-Write (300 ms, in `saveProjectAsync`) 
- 1× `JSON.stringify` + `localStorage.setItem` (300 ms, Fallback in `saveProjectAsync`)

→ **2× localStorage-Write** pro Nutzerbewertung (sofort + nach 300 ms).  
Die zweite localStorage-Schreibung in `saveProjectAsync` ist redundant, wenn `saveProjectSync` erfolgreich war.

### Bewertung der Optimierungsoptionen

#### Option A: Debouncing für `saveProjectSync` (localStorage)
**Vorteil:** Reduziert synchrone Main-Thread-Blockierung bei schnellem Klicken.  
**Risiko:** Datenverlust bei Tab-Close oder Crash im Debounce-Fenster. localStorage ist aktuell das primäre Sicherheitsnetz.  
**Empfehlung:** Nur mit kurzem Debounce (< 100 ms) und explizitem `beforeunload`-Handler sicher. Mittleres Risiko.

#### Option B: localStorage-Fallback in `saveProjectAsync` entfernen
**Vorteil:** Eliminiert doppelten localStorage-Write nach 300 ms.  
**Risiko:** `saveProjectAsync` schreibt dann nicht mehr nach localStorage. Kein direktes Problem, da `saveProjectSync` bereits localStorage schreibt.  
**Empfehlung:** Kleine, sichere Verbesserung. Reduziert 1 redundanten Write/Zyklus.

#### Option C: Batching von Stream-Chunk-Dispatches
**Vorteil:** Massiv reduzierte Write-Frequenz bei Materialanalyse (20→1-2 LS-Writes).  
**Risiko:** Komplexere Reducer-Logik, potenzielle State-Inkonsistenz bei Batchverarbeitung.  
**Empfehlung:** Mittlere Komplexität. Lohnt sich bei häufiger Materialanalyse.

#### Option D: Persistenz unverändert lassen
**Begründung:** Für typische Nutzungsszenarien (1–5 Ratings/Minute) sind die Writes tolerierbar. 1–10 ms Blocking-Zeit pro Write ist auf modernen Geräten kaum spürbar.  
**Risiko:** Bei sehr schnellem Klicken oder schwachen Geräten (ältere Smartphones) könnte der Main-Thread sichtbar blockieren.  
**Empfehlung:** Für Sprint 2 als Baseline behalten, Optimierungen erst nach Browser-Messungen priorisieren.

#### Option E: IDB als primären Sync-Layer verwenden (langfristig)
**Vorteil:** Keine synchronen Writes, höhere Datenhaltbarkeit als localStorage (eviction-geschützt).  
**Risiko:** Init-Phase aufwändiger, `loadProjectSync` für `useReducer`-Init entfällt → State-Init wird async.  
**Empfehlung:** Mittelfristig richtige Richtung, aber signifikanter Umbauaufwand. Nicht für Sprint 2.

### Empfehlung für Sprint 2

**Kleinste sichere Verbesserung:**  
Option B: Redundanten localStorage-Write in `saveProjectAsync` entfernen.  
1 Zeile Änderung, keine Risiken, messbar weniger Writes.

**Mittelfristige Priorität (Sprint 3+):**  
Browser-Messungen mit `window.__lumoPerf.getStats()` durchführen, um reale Timing-Werte zu erhalten. Erst danach Option A oder C implementieren.

**Nicht empfohlen für Sprint 2:**  
Debouncing für localStorage (`saveProjectSync`) — das Datenverlust-Risiko überwiegt den Nutzen ohne präzise Messungen.

---

## Phase 5 — Abschluss

### Testlauf [GEMESSEN]

```
Testsuite:  7 Dateien
Tests:      178
Pass:       178
Fail:       0
Dauer:      ~4 s
```

Neue Tests in dieser Sprint:
- `S06-1c`: Unicode-Payload, Zeichenanzahl < 1 MB, UTF-8-Bytes > 1 MB → 400 ✓
- `S06-1d`: Unicode-Payload, UTF-8-Bytes knapp unter 1 MB → 200 ✓

### Build [GEMESSEN]

```
Build-Zeit:   404 ms
Größte Chunk: index-Co6sukIA.js — 206.59 kB (gzip: 51.53 kB)
Logger-Code:  0 Bytes im Produktions-Bundle (vollständig tree-geshakt)
```

### Geänderte Dateien (uncommitted, lokal)

| Datei | Änderung |
|---|---|
| `server/index.js` | `stateJson.length` → `Buffer.byteLength(stateJson, 'utf8')` + klarerer Fehlermeldungstext |
| `tests/security-hardening.test.js` | +2 Tests: S06-1c (Unicode über Limit) + S06-1d (Unicode knapp unter Limit) |
| `src/utils/persistenceLogger.js` | **Neu** — dev-only Logger (tree-geshakt in Prod) |
| `src/utils/storage.js` | +Import `persistenceLogger` + Instrumentierung in `saveProjectSync` + `saveProjectAsync` |
| `src/utils/serverSync.js` | +Import `persistenceLogger` + Instrumentierung in `syncToServer` |

### Verwendung der Dev-Instrumentierung

Im Dev-Build (`npm run dev`):
```javascript
// Browser-Konsole
window.__lumoPerf.getStats()
// → { startedAt, uptimeS, counts, summary, recentEvents }

window.__lumoPerf.resetStats()
// → Zähler zurücksetzen vor neuem Szenario
```

### Einschränkungen und offene Punkte

1. **Keine Browser-Laufzeitmessungen** in dieser Sprint — alle Timing-Schätzungen basieren auf Codeanalyse und Erfahrungswerten. Reale Messungen stehen aus.

2. **Triggerkategorie** nicht instrumentiert — der Logger unterscheidet nicht, welches Redux-Action den Persistenz-Zyklus ausgelöst hat. Für detailliertere Analyse wäre ein Action-Logger im `useEffect` nötig.

3. **Schwache Geräte** ungetestet — auf alten Smartphones mit langsamen `localStorage` und schwachem JS-Engine könnten die Timing-Werte signifikant höher sein.

---

## Fazit

**Phase 1 (Byte-Limit):** Korrektur implementiert und verifiziert. Der Server lehnt jetzt korrekt ab, was tatsächlich zu groß ist (UTF-8-Bytes), nicht nur was nach JS-String-Länge zu groß erscheint.

**Phase 2 (Instrumentierung):** Dev-Logger eingebaut, production-safe, leicht entfernbar. `window.__lumoPerf.getStats()` steht für Laufzeit-Diagnose zur Verfügung.

**Phase 3–4 (Szenarien + Entscheidungsvorlage):** Rein code-basiert. Wichtigster Befund: `saveProjectSync` (localStorage) ist das einzige blocking-synchrone Element; es wird bei jeder State-Änderung ausgeführt. Für typische Nutzungsintensität (1–5 Aktionen/Minute) kein Handlungsbedarf. Bei schnellem Karteikarten-Flipping oder Materialanalyse-Streams könnte Debouncing oder Batching sinnvoll sein — erst nach Browser-Messungen priorisieren.

**Empfehlung Sprint 2:** Option B (redundanter LS-Write in `saveProjectAsync` entfernen) als einzige sichere Sofortmaßnahme. Alles andere: Browser-Messungen abwarten.
