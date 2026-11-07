# Phase 3 — UX & Interaction Audit
**Lumo — Dein Lernbegleiter**
Audit-Stand: 2026-11-06

---

## 3.1 Onboarding-Flow

### Ist-Zustand
OnboardingScreen1 deckt 4 Phasen ab: s0 (Chaos/Splash) → s1 (Demo) → s2 (Quiz) → s3 (Ready) → form (Material-Upload)
OnboardingScreen3 folgt nach dem Upload für Ziel-Auswahl/Datum.

### Stärken
- **Demo-First Ansatz** (s1): Nutzer sehen sofort ein Beispiel, bevor sie ihre Daten eingeben
- **Quiz vor Upload** (s2): Lernstil-Präferenzen werden abgefragt — personalisiert Erfahrung
- **Chaos-Screen** (s0): Emotionaler Einstieg mit Instrument Serif — differenziert von generischen Willkommen-Screens
- `skipIntro=true` für Rückkehrende: starten direkt im Form-Schritt — richtiger Ansatz

### UX-Probleme
| Schwere | Problem | Empfehlung |
|---------|---------|-----------|
| 🟡 Mittel | **OnboardingScreen3 (Goal-Type) noch aktiv** — Task #48 "Remove goal-type selection" steht aus. Extra Screen nach Material-Upload unterbricht Momentum | Entfernen oder in OnboardingScreen1 integrieren |
| 🟡 Mittel | **AnalyzingScreen**: Ladezeit für KI-Analyse (30–60s) ohne echtes Progress-Feedback außer einer Animation | Schritt-für-Schritt-Progress anzeigen: "Lese Material → Erkenne Themen → Erstelle Blöcke" |
| 🟡 Mittel | **MaterialConfirmationScreen**: Nutzer müssen Blöcke "bestätigen" ohne klares Verständnis was das bedeutet | Erkläre was ein Block ist, zeige einen Beispiel-Block |
| 🔵 Gering | Quiz-Antworten (Lernstil/Hürden) werden im State gespeichert aber nicht sichtbar im Late-Stage-Produktverhalten — kein Feedback auf den gespeicherten Präferenzen | Personalisierung sichtbarer machen |

---

## 3.2 Navigation & Orientierung

### Stärken
- **LumoWordmark** als persistenter Ankerpunkt (fixed oben)
- **WelcomeBack-Screen** als kontextueller Einstieg statt generischem Dashboard
- **Streak-Anzeige** in Dashboard gibt Zeitkontext

### Probleme
| Schwere | Problem | Empfehlung |
|---------|---------|-----------|
| 🔴 Kritisch | **Kein persistentes Navigation-System**: Back-Button existiert in einigen Screens (`SettingsScreen.onBack`), fehlt in anderen. Nutzer wissen nicht, wie sie zurücknavigieren. | Konsistente Back-Navigation oder Bottom-Tab-Navigation |
| 🔴 Kritisch | **Screen-Routing via Daten-Derivation**: Tiefes Linking unmöglich. App-URL ändert sich nie. Nutzer können nicht zu einer bestimmten Ansicht verlinken. | Hash-basiertes Routing (/#/dashboard) als Mindest-Lösung |
| 🟡 Mittel | **Dashboard → Session → Back**: Wenn Session beendet, landen Nutzer zurück im Dashboard OHNE Feedback-Anker "du warst gerade in Block X" | Nach Session: kurze Zusammenfassung mit Rückkehr-Kontext |
| 🟡 Mittel | **ProjectsScreen**: Kein klares "Welches Projekt ist aktiv?" — visuell unklar welches Fach gerade bearbeitet wird | Aktives Projekt hervorheben, Current-Indicator |
| 🔵 Gering | **WeakSpotsScreen / FlashcardScreen**: Erreichbar nur über Dashboard-Buttons — keine alternative Route bekannt | Shortcuts auf WelcomeBack, Button in Session-Summary |

---

## 3.3 Lern-Session Flow (Core)

### SessionScreen 10-Phasen-Architektur
FocusRitual → PreTest → CardLearning → CheckUnderstanding → ExplainChat → ConceptMap → ConnectBlocks → SleepRitualHint → BlockComplete → SessionSummary

### Stärken
- **Strukturierter Flow** mit wissenschaftlich belegten Phasen (spaced retrieval, active recall, elaborative interrogation)
- **FocusRitualPhase**: Benutzerorientierter Einstieg (Mood, Absicht setzen)
- **BlockCompletePhase**: Abschluss-Moment mit Konfetti — Belohnung korrekt platziert
- **Pause-ohne-Strafe**: Implementiert (WelcomeBack Abwesenheits-Adaption)

### Probleme
| Schwere | Problem | Empfehlung |
|---------|---------|-----------|
| 🟡 Mittel | **10 Phasen ohne Fortschrittsanzeige**: Nutzer wissen nicht in welcher Phase sie sind oder wie viel noch kommt — Unsicherheit erhöht kognitive Last | Phase-Indikator (z.B. "Schritt 3 von 7") |
| 🟡 Mittel | **SessionScreen API-Calls** scheitern ohne API-Key (dev): Error Boundary zeigt "Etwas ist schiefgelaufen" ohne hilfreichen Kontext | Dev-Mode: Fallback-Daten oder klare "Offline Mode"-Meldung |
| 🟡 Mittel | **CardLearningPhase.jsx** hat 2009 Zeilen — eine der komplexesten Dateien. Neue Features/Bugs schwerer zu finden | Langfristig aufteilen (kein Scope für diesen Audit) |
| 🔵 Gering | **ConceptMapPhase**: Generierte Konzeptmap ist statisch (Text-Liste?) — kein interaktives Layout | Wenn statisch: als solche kennzeichnen |

---

## 3.4 Interaktions-Design

### Touch-Targets & Fitts's Law
| Element | Größe (est.) | Standard (min 44px) | Status |
|---------|-------------|---------------------|--------|
| CTA-Buttons (Gold) | ~48px height | ✓ 44px+ | 🟢 OK |
| Dashboard Block-Items | ~52-60px | ✓ | 🟢 OK |
| Settings-Items | ~48px | ✓ | 🟢 OK |
| Rating-Buttons (Karteikarten) | ~44px | ✓ | 🟢 OK |
| Mascot (klickbar?) | varies | Unbekannt | 🟡 Prüfen |
| Streak-Badge-Touch | ~32px | ✗ klein | 🔴 Fix |

### Feedback & Affordances
| Schwere | Problem | Empfehlung |
|---------|---------|-----------|
| 🟡 Mittel | **Buttons ohne Hover-State Spezifikation** (auf Desktop): Standard-Hover fehlt in Button.jsx | Expliziter hover/focus State mit var(--gold-glow) |
| 🟡 Mittel | **Form-Validation**: Min-Words-Check (100 Wörter) gibt Fehlermeldung aber kein Progress-Feedback ("noch 47 Wörter bis du fortfahren kannst") | Live Word-Count-Anzeige in Textarea |
| 🔵 Gering | **Swipe-Gesten**: Keine Swipe-Navigation zwischen Blöcken oder Karteikarten. Mobile-Native würde Swipe erwarten | Progressives Enhancement: Swipe Links/Rechts auf Karteikarten |

---

## 3.5 Leerszustände (Empty States)

| Screen | Leerzustand | Qualität |
|--------|-------------|---------|
| ProjectsScreen (0 Projekte) | Mascot + Text + CTA | 🟢 Gut |
| FlashcardScreen (0 Karten) | Unbekannt | 🟡 Prüfen |
| WeakSpotsScreen (keine Schwachstellen) | Unbekannt | 🟡 Prüfen |
| DashboardScreen (0 Blöcke) | Nicht erreichbar (leitet auf Projects) | 🔵 N/A |

---

## 3.6 Fehlerzustände

| Fehlertyp | Behandlung | Qualität |
|-----------|-----------|---------|
| API-Fehler (Analyse) | ErrorBanner oben | 🟡 Mittel — keine Retry-Option im Banner |
| Session API-Fehler | Error Boundary: "Etwas ist schiefgelaufen" | 🔴 Schwach — kein Recovery-Weg |
| Storage-Voll (>1MB) | StorageWarningBanner | 🟢 Gut |
| Offline | OfflineBanner | 🟢 Gut |
| Import-Fehler | Inline-Message in Settings | 🟢 OK |

---

## 3.7 Gesamtbewertung Phase 3

| Kategorie | Score |
|-----------|-------|
| Onboarding-Flow | 7/10 |
| Navigation & Orientierung | 4/10 |
| Session-Flow | 7/10 |
| Interaktions-Design | 6/10 |
| Leerszustände | 6/10 |
| Fehlerzustände | 5/10 |
| **Gesamt UX/Interaction** | **5.8/10** |

### Top-3-Findings

1. **[KRITISCH] Kein konsistentes Navigation-Muster**: Back-Buttons sind inkonsistent. Tiefes Linking fehlt komplett. Nutzer sind auf Session-gespeichertem State angewiesen.

2. **[MITTEL] Session-Phasen ohne Fortschrittsanzeige**: 10 Phasen sind für ADHS-Nutzer ohne Zeitgefühl besonders schwierig ohne Orientierung. "Wie lange noch?" ist unbeantwortet.

3. **[MITTEL] AnalyzingScreen ohne Schritt-Feedback**: 30-60 Sekunden warten ohne Feedback über was gerade passiert führt zu Dropout. Live-Progress ist machbar und kritisch für Retention.
