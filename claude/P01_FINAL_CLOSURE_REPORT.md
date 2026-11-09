# P-01 Performance Audit — Final Closure Report

**Sprint:** P-01 Final Sprint  
**Status:** ABGESCHLOSSEN  
**Datum:** 2026-11-08  
**Tests:** 157 / 157 pass (kein Fehler)  
**Build:** `npm run build` → ✓ (318 ms, keine Fehler, keine Warnungen)

---

## Verbindliche Regeln (eingehalten)

- Keine Commits, keine Pushes, keine Deployments.
- Alle Änderungen bleiben lokal und uncommitted.
- Keine Produktionsdatenbank verändert oder zurückgesetzt.
- Keine automatischen Hooks als Freigabe interpretiert.
- Keine Änderungen an echten Nutzerdaten.
- Keine bereits geschlossenen Findings ohne neue konkrete Evidenz wieder geöffnet.
- Keine unnötigen Abhängigkeiten hinzugefügt.
- Keine großen Architekturumbauten ohne nachvollziehbaren Nutzen.
- FSRS-Daten, Lernfortschritt, Kartenreihenfolge, Projekte und Nutzerzustände erhalten.
- Keine Performance-Verbesserung hat Datenverlust oder inkonsistente Synchronisierung riskiert.

---

## Vollständige Finding-Matrix (27 Findings)

### Status-Legende
- **BEHOBEN** — In diesem Sprint neu implementiert und verifiziert
- **VERIFIZIERT** — In Sprint 1 implementiert; in diesem Sprint re-verifiziert
- **TEILWEISE BEHOBEN** — Teilimplementierung: eine Variante umgesetzt; Kernanliegen des ursprünglichen Findings besteht weiterhin
- **ZURÜCKGESTELLT** — Bewusst verschoben; Rationale dokumentiert
- **NICHT RELEVANT** — Finding trifft auf aktuelle Codebasis nicht mehr zu

---

### Frontend (P-FE-01 … P-FE-11)

| ID | Titel | Status | Datei(en) | Notiz |
|----|-------|--------|-----------|-------|
| P-FE-01 | Storage-Effect: synchroner Write bei jeder State-Änderung | **TEILWEISE BEHOBEN (Option B)** | `src/utils/storage.js` | Redundanter `localStorage.setItem` aus `saveProjectAsync` entfernt (Option B). Das Kernanliegen des Findings — synchrones `JSON.stringify(fullState)` + `localStorage.setItem` im UI-Thread bei **jeder** qualifizierenden State-Änderung durch `saveProjectSync` — besteht weiterhin. Option B adressiert nur den redundanten asynchronen Doppelschreibvorgang; der synchrone Hauptpfad ist unverändert. |
| P-FE-02 | UPDATE_FLASHCARDS_BATCH für FSRS-Reviews | **VERIFIZIERT** | `src/state/appReducer.js` | Bereits in Sprint 1 implementiert. `Map`-basiertes O(n+m)-Lookup; Sprint-Final-Sprint verifiziert durch Beibehaltung. |
| P-FE-03 | SET_SUBJECT_COLOR mappt über alle Blöcke | **ZURÜCKGESTELLT** | `src/state/appReducer.js` | Mittleres Risiko, nicht im Hot-Path. Action wird nur im Setup-Flow aufgerufen. Deferred Sprint 4. |
| P-FE-04 | ADD_FLASHCARDS: Intra-Payload-Deduplication | **VERIFIZIERT** | `src/state/appReducer.js` | In Sprint 1 implementiert; Regressionstests in `tests/reducer-add-flashcards.test.js`. |
| P-FE-05 | UPDATE_FLASHCARD: `.map()` → `findIndex` | **BEHOBEN** | `src/state/appReducer.js` | `findIndex` + `splice`-artige Ersetzung statt `.map()`: 1 neues Objekt statt N. Regressionstests in `tests/reducer-flashcard-updates.test.js` (FE05-1 bis FE05-6). |
| P-FE-06 | SAVE_CURRENT_PROJECT: volle `blocks`-Array-Kopie | **ZURÜCKGESTELLT** | `src/state/appReducer.js` | Hohes Risiko: Datenmodell-Änderung. Erfordert Refactoring des gesamten Projekte-Subsystems. Deferred Sprint 4. |
| P-FE-07 | activeQueue: unnötige Neuberechnungen | **VERIFIZIERT** | `src/screens/FlashcardScreen.jsx` | In Sprint 1 implementiert (`useMemo`). |
| P-FE-08 | Dashboard-Berechnungen | **VERIFIZIERT** | `src/screens/dashboard/DashboardScreen.jsx` | In Sprint 1 implementiert (`useMemo`). |
| P-FE-09 | Prefetch useEffect: kein AbortController | **BEHOBEN** | `src/screens/dashboard/DashboardScreen.jsx`, `src/api/lumo.js` | `AbortController` in Prefetch-`useEffect` hinzugefügt; Cleanup-Funktion bricht Request bei Unmount oder `next`-Wechsel ab. `lumo.js: post()` und `generateCards()` nehmen jetzt optionales `{ signal }` entgegen. |
| P-FE-10 | SM-2→FSRS Migration: N einzelne Dispatches | **BEHOBEN** | `src/screens/FlashcardScreen.jsx`, `src/App.jsx` | Migration zu 1× `UPDATE_FLASHCARDS_BATCH`-Dispatch umgestellt. `onUpdateFlashcardsBatch`-Prop in `App.jsx` → `FlashcardScreen.jsx` Chain. Regressionstests in `tests/reducer-flashcard-updates.test.js` (FE10-1 bis FE10-6). |
| P-FE-11 | Code-Splitting: kein `manualChunks` | **VERIFIZIERT** | `vite.config.js` | In Sprint 1 implementiert; `vendor-react`, `vendor-fsrs` Chunks. Build-Output verifiziert: 3 Vendor-Chunks sichtbar. |

---

### Backend (P-BE-01 … P-BE-08)

| ID | Titel | Status | Datei(en) | Notiz |
|----|-------|--------|-----------|-------|
| P-BE-01 | SQLite: synchroner Treiber | **ZURÜCKGESTELLT** | `server/db.js` | `better-sqlite3` ist synchron by design; Wechsel auf `node:sqlite` oder `bun:sqlite` ist ein architektonischer Umbau. Kein direkter Performance-Gewinn ohne Änderung des gesamten Request-Handling-Modells. Deferred Sprint 4. |
| P-BE-02 | updateStreak: doppelter State-Roundtrip | **ZURÜCKGESTELLT** | `server/db.js` | Deserialisiert/re-serialisiert den gesamten User-State, um nur das `streak`-Objekt zu aktualisieren. Fix erfordert separate `users.streak_json`-Column (Schema-Migration). HTTP-Security-Header-Arbeit (Helmet, CORS) ist S-Serie, nicht P-BE-02. Deferred Sprint 3. |
| P-BE-03 | Doppeltes JSON.stringify | **ZURÜCKGESTELLT** | `server/index.js` | Kann nicht sicher vermieden werden: `state` enthält `blocksAnalyzedTotal`, das vor `saveUserState` (Z. 966) entfernt wird. `stateJson` aus Z. 940 ist daher nicht wiederverwendbar. Für eine sichere Deduplication wäre ein Refactoring der State-Serialisierungslogik erforderlich. Deferred. |
| P-BE-04 | last_seen-Throttling | **VERIFIZIERT** | `server/index.js` | In Sprint 1 implementiert (60s Throttle). |
| P-BE-05 | Admission Control für /api/analyze | **VERIFIZIERT** | `server/index.js` | In Sprint 1 implementiert (3 Slots, vor Body-Parser). Vollständige Regressionssuite `tests/concurrency-limit.test.js` (T1–T7). |
| P-BE-06 | isTooDeep: rekursiv → iterativ | **BEHOBEN** | `server/index.js` | Stack-basierte iterative Implementierung: kein Stack-Overflow-Risiko bei tief verschachtelten JSON-Payloads, Early-Exit bleibt erhalten. |
| P-BE-07 | Globales KI-Concurrency-Limit (askLumo) | **BEHOBEN** | `server/index.js` | `_activeAiCalls` / `MAX_CONCURRENT_AI = 5` in `askLumo` eingefügt (try/finally für Slot-Freigabe). `AiCapacityError` → HTTP 429 mit `retryAfter: 5` via `sendFriendlyError`. Regressionssuite `tests/ai-concurrency.test.js` (T1–T5). |
| P-BE-08 | YouTube-Route: 2 Claude-Aufrufe | **NICHT RELEVANT** | `server/index.js` | Aktuelle Implementierung enthält nur 1 `askLumo`-Aufruf in der YouTube-Route (Z. 843). Finding trifft auf aktuelle Codebasis nicht zu. |

---

### Datenbank (P-DB-01 … P-DB-04)

| ID | Titel | Status | Datei(en) | Notiz |
|----|-------|--------|-----------|-------|
| P-DB-01 | user_state: JSON-Blob wächst unbegrenzt, trifft 500-KB-Grenze | **ZURÜCKGESTELLT** | `server/db.js` | `user_state.state_json` wächst durch Block-Duplikation (P-FE-06) unbegrenzt; Power-User können HTTP 413 treffen. Sofortmaßnahme (Limit auf 1 MB anheben) ausstehend. Index-Arbeit (`users.email`, `sessions.token_hash`) gehört zur S-Serie, nicht zu P-DB-01. Deferred Sprint 3 (Limit-Erhöhung) / Sprint 4 (Normalisierung). |
| P-DB-02 | JSON-Roundtrips | **ZURÜCKGESTELLT** | `server/db.js` | Benötigt Messung vor Intervention. `better-sqlite3` deserialisiert JSON bereits effizient. Ohne Profiling-Daten kein begründeter Handlungsbedarf. |
| P-DB-03 | DB-Update-Optimierung | **VERIFIZIERT** | `server/db.js` | In Sprint 1 implementiert (`UPDATE...RETURNING` statt `UPDATE` + `SELECT`). |
| P-DB-04 | WAL-Autocheckpoint-Tuning | **BEHOBEN** | `server/db.js` | `PRAGMA wal_autocheckpoint = 400` nach `synchronous = NORMAL` eingefügt (Standard: 1000 Seiten). Kein vorher/nachher-Benchmark durchgeführt — tatsächliche Auswirkung auf Checkpoint-Latenz und WAL-Datei-Wachstum ungemessen. |

---

### PWA (P-PWA-01 … P-PWA-04)

| ID | Titel | Status | Datei(en) | Notiz |
|----|-------|--------|-----------|-------|
| P-PWA-01 | Mascot-Bilder nicht optimiert | **VERIFIZIERT** | `public/`, `vite.config.js` | In Sprint 1 implementiert (WebP-Konvertierung, Precache-Reduktion). |
| P-PWA-02 | Precache-Liste zu groß | **VERIFIZIERT** | `vite.config.js` | In Sprint 1 implementiert (Globmuster eingeschränkt). |
| P-PWA-03 | registerType: 'autoUpdate' | **ZURÜCKGESTELLT** | `vite.config.js` | HOHES RISIKO: `autoUpdate` kann aktive Lernsessions unterbrechen. Vollständige Lösung erfordert `registerType: 'prompt'` + UI-Komponente ("Update verfügbar"). `saveProjectSync` als Safety-Net vorhanden (data-loss mitigiert). Deferred Sprint 4. |
| P-PWA-04 | Offline-Sync-Verifikation | **ZURÜCKGESTELLT** | — | Erfordert Browser-Testumgebung (Service Worker, IndexedDB, Netzwerk-Toggle). Kann in dieser Umgebung nicht verifiziert werden. Manueller QA-Test empfohlen. |

---

## Neue Testdateien

| Datei | Findings | Tests | Status |
|-------|----------|-------|--------|
| `tests/reducer-flashcard-updates.test.js` | P-FE-05, P-FE-10 | 12 | ✓ 12/12 pass |
| `tests/ai-concurrency.test.js` | P-BE-07 | 5 | ✓ 5/5 pass |

---

## Gesamtbild Test-Coverage

| Kategorie | Bestanden | Gesamt |
|-----------|-----------|--------|
| Alle Tests (Baseline Sprint 1) | 140 | 140 |
| Neue Tests P-FE-05/FE-10 | 12 | 12 |
| Neue Tests P-BE-07 | 5 | 5 |
| **Gesamt** | **157** | **157** |

---

## Implementierungs-Zusammenfassung (neu in diesem Sprint)

### P-FE-01 (Option B) — `src/utils/storage.js`
- `saveProjectAsync`: redundanter `localStorage.setItem`-Aufruf entfernt (Option B)
- `saveProjectSync` (synchron, selber Tick) stellt sicher, dass localStorage stets aktuell ist, wenn der 300ms-Debounce von `saveProjectAsync` feuert
- **Einschränkung (Kernanliegen verbleibt):** Das synchrone `JSON.stringify(fullState)` + `localStorage.setItem` durch `saveProjectSync` bei jeder qualifizierenden State-Änderung ist weiterhin aktiv. Der UI-Thread-Block bei Kartenbewertungen (das eigentliche High-Finding) wird durch Option B nicht adressiert.
- Fallback-Verhalten bei IDB-Ausfall unverändert

### P-FE-05 — `src/state/appReducer.js`
- `UPDATE_FLASHCARD`: `.map()` durch `findIndex` + direkten Index-Zugriff ersetzt
- Ergebnis: 1 neues Array + 1 neues Objekt (geänderte Karte) statt N neue Objekte
- Objekt-Referenz-Identität für unveränderte Karten bleibt erhalten (kein Re-Render)

### P-FE-09 — `src/api/lumo.js` + `src/screens/dashboard/DashboardScreen.jsx`
- `post()` nimmt jetzt optionales `{ signal }` entgegen und verknüpft es mit dem internen `AbortController`
- `generateCards()` leitet `signal` durch
- Prefetch-`useEffect` im Dashboard erstellt `AbortController`; Cleanup bricht Request ab bei Unmount oder `next?.id`-Wechsel

### P-FE-10 — `src/screens/FlashcardScreen.jsx` + `src/App.jsx`
- SM-2→FSRS-Migration: N× `UPDATE_FLASHCARD` → 1× `UPDATE_FLASHCARDS_BATCH`
- `onUpdateFlashcardsBatch`-Prop in `App.jsx` hinzugefügt und an `FlashcardScreen` übergeben
- Fallback auf Einzel-Dispatches wenn Prop nicht vorhanden (Abwärtskompatibilität)

### P-BE-06 — `server/index.js`
- `isTooDeep`: rekursiv → iterativ (expliziter Stack: `[[val, 0]]`)
- Kein Stack-Overflow-Risiko bei beliebig tiefer JSON-Verschachtelung
- Early-Exit (`return true`) bei Überschreitung bleibt erhalten

### P-BE-07 — `server/index.js`
- `let _activeAiCalls = 0` / `const MAX_CONCURRENT_AI = 5` als Modulvariablen
- `askLumo`: Gate vor Slot-Erwerb, `try/finally` garantiert `_activeAiCalls--`
- `sendFriendlyError`: `AiCapacityError` → HTTP 429 `{ error: "...", retryAfter: 5 }`
- `export function __getActiveAiCallsForTesting()` für Testinspektion

### P-DB-04 — `server/db.js`
- `db.pragma('wal_autocheckpoint = 400')` nach `synchronous = NORMAL` eingefügt
- Senkt Checkpoint-Intervall von 1000 → 400 Seiten
- **Kein Benchmark:** Kein vorher/nachher-Vergleich der Checkpoint-Latenz oder WAL-Datei-Größe durchgeführt. Die tatsächliche Performance-Auswirkung wurde nicht gemessen und wird nicht behauptet.

---

## Zurückgestellte Findings — Detaillierte Begründung

| ID | Grund für Verschiebung | Empfohlene Priorität |
|----|------------------------|---------------------|
| P-FE-01 (sync debounce) | `saveProjectSync` synchron als Safety-Net bei Tab-Close erhalten. Option B (async LS-Write) erledigt. Vollständiges Debouncing würde Tab-Close-Safety-Net schwächen. | Sprint 4 |
| P-BE-02 | Erfordert Schema-Migration: neue `users.streak_json`-Column. Kein DB-Schema-Change in diesem Sprint. | Sprint 3 |
| P-DB-01 | 500-KB-Größenlimit nicht erhöht; Normalisierung ist Architektur-Sprint. Aktives Risiko: Power-User können HTTP 413 treffen. | Sprint 3 (Limit) / Sprint 4 (Schema) |
| P-FE-03 | `SET_SUBJECT_COLOR` nicht im Hot-Path; mittleres Refactoring-Risiko | Sprint 4 |
| P-FE-06 | `SAVE_CURRENT_PROJECT` Datenmodell-Änderung = hohes Risiko | Sprint 4 |
| P-BE-01 | Architektonischer Treiberwechsel; Nutzen ohne Profiling-Daten unklar | Sprint 5 |
| P-BE-03 | Erfordert Refactoring der State-Serialisierungslogik | Sprint 4 |
| P-DB-02 | Benötigt Profiling-Daten; kein begründeter Handlungsbedarf | Sprint 4 (nach Messung) |
| P-PWA-03 | Datenintegritätsrisiko ohne UI-Komponente; `saveProjectSync` mitigiert | Sprint 4 |
| P-PWA-04 | Kann nicht in Cloud-Testumgebung verifiziert werden | Manuelles QA |

---

## Datenschutz & Datensicherheit

Alle Implementierungen wurden unter folgenden Prämissen entwickelt:
- **Kein Datenverlust**: Die 3-Layer-Persistenzkette (localStorage → IDB → Server) bleibt vollständig erhalten
- **FSRS-Integrität**: Kein Finding berührt FSRS-Scoring-Logik, Karten-Reihenfolge oder Lernfortschritt
- **Nutzerisolation**: Alle Authentifizierungs- und Datenbankänderungen respektieren bestehende User-Isolation-Garantien
- **Produktionssicherheit**: Kein direkter Produktionszugriff, keine DB-Migrationen, keine Deployment-Aktionen

---

*Erstellt: 2026-11-08 | Lumo P-01 Final Sprint*
