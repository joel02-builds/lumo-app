# Phase 1 — Project Discovery
**Lumo — Dein Lernbegleiter**
Audit-Stand: 2026-11-06

---

## 1. Produktvision & Zielgruppe

**Mission:** Lumo ist ein KI-gestützter Lernbegleiter, der Studierenden hilft, Prüfungsstoff systematisch zu verstehen und zu behalten. Zielgruppe sind primär ADHS-betroffene oder ablenkungsanfällige Studierende, die mit klassischen Lernmethoden scheitern.

**Unique Value Proposition:**
- Upload von Lernmaterial → KI analysiert und strukturiert Stoff automatisch
- Blockorientiertes Lernen: Stoff wird in verdauliche "Blöcke" zerlegt
- Spaced-Repetition via FSRS-Algorithmus für langfristiges Behalten
- KI-Chat zur Vertiefung (ExplainChat), Verständnischeck (CheckUnderstanding)
- Emotionales Design: Mascot, warme Ästhetik, kein Stress-Interface

---

## 2. Tech Stack

| Layer | Technologie | Version |
|-------|------------|---------|
| Frontend Framework | React | 18.3.1 |
| Build Tool | Vite | 8.3.5 |
| PWA | vite-plugin-pwa | 2.0.0 |
| Backend | Express | 5.2.1 |
| Datenbank | better-sqlite3 | 13.0.3 |
| KI | @anthropic-ai/sdk | 0.117.1 |
| Spaced Repetition | ts-fsrs | 5.4.2 |
| Animationen | canvas-confetti | 1.9.4 |
| Security | helmet, cors, express-rate-limit, cookie-parser | 8.x |

**Node.js:** ≥22.12.0 (engines.node in package.json)
**Deployment:** Railway (Backend + SQLite), Vite PWA auf separatem Host möglich

---

## 3. Architektur-Übersicht

```
┌─────────────────────────────────┐
│          React 18 SPA           │
│  useReducer (appReducer.js)     │
│  Code Splitting (lazy screens)  │
├──────────────┬──────────────────┤
│ localStorage │ IndexedDB        │
│ (Sync/Quick) │ (Async/Primary)  │
└──────────────┴──────────────────┤
                                  │ fetch API
┌─────────────────────────────────┤
│    Express 5 Backend            │
│    16 REST-Endpunkte            │
│    Rate Limiting                │
│    Session-basierte Auth        │
├─────────────────────────────────┤
│    better-sqlite3               │
│    1 Database-Datei             │
│    JSON-Felder für State        │
└─────────────────────────────────┘
```

**State-Routing-Logik (kritisch):**
Screen wird nie direkt gespeichert — er wird aus Daten abgeleitet:
```
hasActiveBlocks → WELCOME_BACK
projects.length > 0 → PROJECTS
(default) → ONBOARDING
```

---

## 4. Screen-Inventar

### Primary Screens (11)
| Screen | Datei | Trigger |
|--------|-------|---------|
| OnboardingScreen1 | `screens/onboarding/OnboardingScreen1.jsx` | Erststart (4 Phasen: s0 Chaos → s1 Demo → s2 Quiz → s3 Ready → form) |
| OnboardingScreen3 | `screens/onboarding/OnboardingScreen3.jsx` | Nach Material-Eingabe (Ziel-Datum, GoalType) — noch aktiv! |
| AnalyzingScreen | `screens/AnalyzingScreen.jsx` | Nach Material-Upload (KI-Analyse läuft) |
| MaterialConfirmationScreen | `screens/MaterialConfirmationScreen.jsx` | Nach Analyse (Blöcke bestätigen) |
| WelcomeBackScreen | `screens/WelcomeBackScreen.jsx` | Rückkehrender User mit Blöcken |
| DashboardScreen | `screens/dashboard/DashboardScreen.jsx` | Haupt-Navigation zu Blöcken |
| SessionScreen | `screens/session/SessionScreen.jsx` | Block-Lerneinheit (10 Phasen) |
| WeakSpotsScreen | `screens/WeakSpotsScreen.jsx` | Schwachstellen-Übersicht |
| FlashcardScreen | `screens/FlashcardScreen.jsx` | FSRS-Karteikarten-Review |
| ProjectsScreen | `screens/ProjectsScreen.jsx` | Multi-Fach-Verwaltung |
| SettingsScreen | `screens/SettingsScreen.jsx` | App-Einstellungen |
| ExamResultScreen | `screens/ExamResultScreen.jsx` | Nach Prüfung |
| LegalScreen | `screens/LegalScreen.jsx` | Impressum + Datenschutz (Overlay) |

### Session Sub-Screens (10 Phasen in SessionScreen)
FocusRitualPhase → PreTestPhase → CardLearningPhase → CheckUnderstandingPhase → ExplainChatPhase → ConceptMapPhase → ConnectBlocksPhase → SleepRitualHintPhase → BlockCompletePhase → SessionSummaryPhase

---

## 5. Component-Inventar

| Komponente | Datei | Verwendung |
|-----------|-------|-----------|
| LumoMascot | `components/LumoMascot.jsx` | Emotionaler Kern — erscheint in WelcomeBack, Onboarding |
| LumoWordmark | `components/LumoWordmark.jsx` | Fixed Header auf allen Screens |
| Button | `components/Button.jsx` | CTA-Button (primary/secondary/ghost) |
| ErrorBanner | `components/ErrorBanner.jsx` | Fehlermeldung oben |
| StorageWarningBanner | `components/StorageWarningBanner.jsx` | Speicherlimit-Warnung |
| OfflineBanner | `components/OfflineBanner.jsx` | Offline-Hinweis |
| InstallBanner | `components/InstallBanner.jsx` | PWA-Install-Prompt |
| BetaFeedbackButton | `components/BetaFeedbackButton.jsx` | Floating Feedback (Beta) |
| CookieConsent | `components/CookieConsent.jsx` | DSGVO Cookie-Banner |
| BlockProgressRing | `components/BlockProgressRing.jsx` | Fortschrittsring je Block |

---

## 6. Design Tokens (vollständig)

### Farben
```css
/* Hintergründe */
--bg: #0A0806                    /* Haupt-Hintergrund — sehr dunkles Warm-Schwarz */
--bg-elevated: #141210           /* Erhöhte Oberflächen */
--bg-card: #1A1612               /* Card-Hintergründe */
--bg-card-bright: #201C17        /* Hellste Card-Variante */

/* Primär-Akzent */
--gold: #D4A843                  /* Lumo Gold — primärer Brand-Farbton */
--gold-soft: rgba(212,168,67,.12)  /* Sanfter Gold-Hintergrund */
--gold-light: #FFE8A0            /* Helles Gold für Highlights */
--gold-glow: rgba(212,168,67,.18) /* Glow-Overlay */

/* Text */
--text-primary: #F2EFE9          /* Warm-Weiß, 95% Luminanz */
--text-secondary: #8A9BAE        /* Blau-Grau (kühl) — Kontrast zur warmen Base */

/* Semantische Farben */
--green: #3D9E6E                 /* Erfolg, Verstanden */
--green-soft: rgba(61,158,110,.12)
--red: #E07B54                   /* Orange-Rot: Warnung (kein Alarm-Rot) */
--red-soft: rgba(224,123,84,.15)
--amber: #C47A2B                 /* Warnsignal, Schwellenwerte */
--amber-soft: rgba(196,122,43,.12)

/* Rahmen */
--border: rgba(255,255,255,.07)   /* Subtile Trennung */
--border-gold: rgba(212,168,67,.22) /* Gold-Rahmen */

/* Input */
--input-bg: #0F1A20              /* Leicht bläulich — kühler Kontrast */
--input-border: rgba(212,168,67,.25)
```

### Schatten
```css
--shadow-card: 0 2px 16px rgba(0,0,0,.45), 0 1px 3px rgba(0,0,0,.3)
--shadow-elevated: 0 8px 48px rgba(0,0,0,.6), 0 2px 8px rgba(0,0,0,.35)
--shadow-gold: 0 4px 28px rgba(212,168,67,.35), 0 2px 10px rgba(212,168,67,.18)
```

### 3-Layer Glow-System
```css
--glow-center: radial-gradient(ellipse 70% 55% at 50% 50%,
  rgba(212,168,67,.07) 0%, rgba(212,168,67,.02) 40%, transparent 70%)
--glow-top: radial-gradient(ellipse 90% 40% at 50% 0%,
  rgba(212,168,67,.09) 0%, rgba(212,168,67,.03) 50%, transparent 75%)
--glow-vignette: radial-gradient(ellipse 100% 100% at 50% 50%,
  transparent 50%, rgba(0,0,0,.35) 100%)
```

---

## 7. Typografie

| Rolle | Familie | Stil | Größe | Gewicht |
|-------|---------|------|-------|---------|
| Headlines emotional | Instrument Serif | Italic | 28px | 400 |
| h1 (Standard) | System Font Stack | — | 26px | 800 |
| h2 | System Font Stack | — | 20px | 800 |
| h3 | System Font Stack | — | 17px | 700 |
| Body | -apple-system, Inter, Segoe UI, … | — | 16px | 400 |
| Body Line-Height | — | — | — | 1.65 |
| Body Letter-Spacing | — | — | — | -0.01em |
| Wordmark | Nunito | — | —  | (geladen im HTML-Head) |

**Ladestrategie:** Google Fonts via `<link>` im HTML-Head für Instrument Serif + Nunito.
System Font Stack als Body-Fallback — keine zusätzliche Netzwerkanfrage für Body-Text.

---

## 8. Layout & Responsive

| Breakpoint | Max-Width | Verhalten |
|-----------|-----------|----------|
| < 700px (mobile) | 520px | Single column, zentriert |
| ≥ 700px (desktop) | 560px | Gleiche Spalte, mehr Rand |

**Kern-Problem:** Kein echtes Desktop-Layout. Auf 1440px Viewport besteht ca. 440px ungenutzter Rand pro Seite. Kein Grid, keine Sidebar, keine Multi-Column-Nutzung.

---

## 9. PWA-Konfiguration

```json
// public/manifest.json
name: "Lumo – Dein Lernbegleiter"
short_name: "Lumo"
theme_color: "#D4A843"      (Gold)
background_color: "#0F1920" (Dunkelblau-Grün — ABWEICHEND von --bg #0A0806)
display: "standalone"
```

**Workbox-Strategie** (vite.config.js):
- Assets: Cache-First
- API-Calls: Network-First
- Auto-Update aktiviert

---

## 10. API-Endpunkte (Backend)

| Methode | Endpoint | Funktion |
|---------|---------|---------|
| GET | /api/health | Health-Check |
| POST | /api/analyze | Material → Blöcke (KI) |
| POST | /api/session | Lerneinheit starten |
| POST | /api/check-understanding | Verständnischeck (KI) |
| POST | /api/explain | KI-Chat (ExplainChat) |
| POST | /api/concept-map | Konzeptmap generieren |
| POST | /api/connect-blocks | Block-Verbindungen |
| POST | /api/exam-ready | Prüfungsbereitschaft |
| GET/POST | /api/state | Server-State lesen/schreiben |
| POST | /api/state/restore | State wiederherstellen |
| POST | /api/streak | Streak aktualisieren |
| POST | /api/freeask | Freie Frage an KI |
| POST | /api/query | Flexible KI-Abfrage |
| POST | /api/pretest | Vorwissens-Check |
| POST | /api/consent | Cookie-Consent speichern |
| DELETE | /api/state | State löschen |

---

## 11. Storage-Layer

| Layer | Key | Zweck | Priorität |
|-------|-----|-------|----------|
| IndexedDB | `lumo_v2` | Primärer, asynchroner Speicher | 1 (Primary) |
| localStorage | `lumo_project` | Sync-Lesezugriff beim Start | 2 (Fallback) |
| localStorage | `lumo_streak` | Streak-Counter (einfach) | — |
| localStorage | `lumo_cookie_consent` | DSGVO-Zustimmung | — |
| Backend SQLite | — | Server-State für Multi-Device | 3 (Remote) |

**Größenlimit:** Backend lehnt State-JSON >1MB ab (P-DB-01).

---

## 12. Screenshot-Baseline

Vollständiger visueller Snapshot aufgenommen: 85 PNG-Dateien in `product-audit/screenshots/`
3 Viewports: mobile (390×844), desktop (1440×900), dark-mobile (390×844 dark)
→ Details in `product-audit/00-screenshot-index.md`

---

## 13. Kritische Beobachtungen (Phase-1-Flags)

### 🟡 Architektur
- **OnboardingScreen3** noch aktiv (goal-type Auswahl) — Task #48 "Remove goal-type selection" steht noch aus
- **Screen-Routing via Daten-Derivation** bedeutet: kein direktes Deep-Linking möglich
- **SessionScreen mit 10 Phasen** in einer Datei: CardLearningPhase.jsx ist 2009 Zeilen lang

### 🟡 Design-Konsistenz
- `background_color` im PWA Manifest (`#0F1920`) weicht von `--bg: #0A0806` ab
- `--text-secondary: #8A9BAE` ist blaugrau — kühler als die warme Farbpalette, wirkt fremdartig
- `--input-bg: #0F1A20` ebenfalls kühler/blauer als `--bg` — inkonsistente Temperatur

### 🟡 Desktop-Gap
- 1440px viewport zeigt ~440px toten Rand pro Seite
- Keine Desktop-spezifischen Layout-Features (Sidebar, Multi-Column, Keyboard-Shortcuts)

### 🟢 Stärken
- Konsequentes Token-System (alle Farben als CSS Custom Properties)
- Warme, unverwechselbare Ästhetik (#0A0806 + #D4A843)
- Code-Splitting korrekt implementiert (Eager/Lazy getrennt)
- DSGVO-compliant: Cookie-Consent, Impressum, Datenschutz vorhanden
