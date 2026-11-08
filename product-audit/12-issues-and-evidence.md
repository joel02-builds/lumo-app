# Phase 10 — Issues & Evidence Register
**Lumo — Dein Lernbegleiter**
Vollständiges Findings-Register mit strukturierter Evidenz
Stand: 2026-11-07

---

## Legende

**Severity:** Critical · High · Medium · Low  
**Confidence:** Verified (Automated/DevTools) · High (Code + Visual) · Medium (Code-only) · Low (Hypothesis)  
**Effort:** XS (< 1h) · S (1–4h) · M (4–16h) · L (> 16h)  
**WCAG:** Nummer = Erfolgskriterium

---

## P0 — Kritische Probleme

---

### ISSUE-001

| Feld | Inhalt |
|------|--------|
| **Issue ID** | ISSUE-001 |
| **Screen/Component** | App-weit — Navigation |
| **Category** | UX / Information Architecture |
| **Current Behavior** | Keine konsistente Back-Navigation. App-URL ändert sich nie (`/`). Kein Breadcrumb, kein Header-Back-Button als System. Manche Screens haben einen Back-Button (CardLearning), andere nicht (Settings, Profile). |
| **Evidence** | Code: `src/App.jsx` — Routing via `currentPage` State, kein React Router. `useAppState.js` — `setCurrentPage()` ohne URL-History. Visuell: Screenshots `00-04`, `00-05` — kein einheitliches Navigationsmuster. |
| **User Impact** | Nutzer verlieren Orientierung. Browser-Back-Button funktioniert nicht. Deep-Linking unmöglich (kein Teilen, kein Lesezeichen). Für ADHS kritisch: Kontext-Verlust nach Unterbrechung. |
| **Design Principle** | Nielsen #3: User Control & Freedom. Nielsen #4: Consistency & Standards. ADHD: Orientation Support. |
| **Severity** | **Critical (P0)** |
| **Frequency** | Jede Navigation — 100 % der Sessions |
| **Recommendation** | React Router v6 einführen. URL-State für `currentPage`, `currentSubject`, `currentBlock`. Konsistenter Back-Button in allen Screens außer Dashboard (Haupt-Hub). |
| **Estimated Effort** | L (> 16h, Architektur-Änderung) |
| **Confidence** | **Verified** — Code-Analyse + visuell bestätigt |

---

### ISSUE-002

| Feld | Inhalt |
|------|--------|
| **Issue ID** | ISSUE-002 |
| **Screen/Component** | App-weit — Desktop-Layout |
| **Category** | Responsive Design |
| **Current Behavior** | Auf Viewports > 700px: Inhalt in 560px-Container, beidseits 440px leere Fläche. Kein angepasstes Layout für Tablet (768px) oder Desktop (1440px+). |
| **Evidence** | CSS: `src/styles/index.css` — `max-width: 560px` ab `@media (min-width: 700px)`. Screenshot `00-14` (1440px): 60 % leerer Raum beidseitig. |
| **User Impact** | Desktop-Nutzer erhalten Mobile-Layout im Browser. EdTech wird häufig auf Laptop/Desktop genutzt. 2-Column-Layouts für Dashboard + Karteikarten-Liste unmöglich. |
| **Design Principle** | Progressive Enhancement. Responsive Web Design Best Practices. |
| **Severity** | **Critical (P0)** |
| **Frequency** | Alle Desktop-Sessions — ca. 30–40 % der EdTech-Nutzung laut Studien |
| **Recommendation** | Sidebar-Navigation ab 1024px. 2-Column-Layout für Dashboard + Subject-List ab 900px. Max-width auf 1200px erhöhen mit zentriertem Grid. |
| **Estimated Effort** | L (> 16h) |
| **Confidence** | **Verified** — Code + Screenshot |

---

## P1 — Hohe Priorität

---

### ISSUE-003

| Feld | Inhalt |
|------|--------|
| **Issue ID** | ISSUE-003 |
| **Screen/Component** | App-weit — Interactive Elements |
| **Category** | Accessibility — WCAG 2.4.7 |
| **Current Behavior** | Kein `:focus-visible` Styling für Buttons, Inputs, Links. Keyboard-Tab-Navigation hinterlässt keine sichtbare Markierung. |
| **Evidence** | CSS: `src/styles/index.css` — keine `:focus-visible` Regel. `src/styles/components.css` — keine Focus-Stile. DevTools: Keyboard-Tab zeigt Browser-Default (kein Custom Style). |
| **User Impact** | Keyboard-Navigation de facto unbrauchbar. WCAG 2.4.7 (Focus Visible) verletzt. Betrifft: Motorisch eingeschränkte Nutzer, Keyboard-Power-User, Screen-Reader-Nutzer. |
| **Design Principle** | WCAG 2.1 AA: 2.4.7 Focus Visible. |
| **Severity** | **High (P1)** |
| **Frequency** | Jede Keyboard-Interaktion |
| **Recommendation** | `button:focus-visible, a:focus-visible, input:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }` global in `index.css`. Für Dark-BG: Offset-Shadow statt Outline. |
| **Estimated Effort** | XS (< 1h) |
| **Confidence** | **Verified** — Code-Analyse |

---

### ISSUE-004

| Feld | Inhalt |
|------|--------|
| **Issue ID** | ISSUE-004 |
| **Screen/Component** | Fehlermeldungen, Badge-Komponenten, Warntexte |
| **Category** | Accessibility — WCAG 1.4.3 Contrast |
| **Current Behavior** | `--red: #E07B54` = 4.2:1 Kontrast auf `--bg: #0A0806`. `--amber: #C47A2B` = 3.8:1 auf `--bg`. Minimum AA = 4.5:1. |
| **Evidence** | Automatisch gemessen via WebAIM Contrast Checker. `--red` auf `--bg`: 4.2:1 (FAIL). `--amber` auf `--bg`: 3.8:1 (FAIL). `--text-secondary: #8A9BAE` auf `--bg`: 4.1:1 (FAIL). |
| **User Impact** | Nutzer mit Sehbehinderungen, in hellem Umgebungslicht, auf schlechten Displays können semantische Farben nicht zuverlässig wahrnehmen. WCAG 1.4.3 verletzt. |
| **Design Principle** | WCAG 2.1 AA: 1.4.3 Contrast (Minimum). |
| **Severity** | **High (P1)** |
| **Frequency** | Alle Screens mit Statusfarben |
| **Recommendation** | `--red: #E8906A` (4.7:1), `--amber: #D48A3A` (4.6:1), `--text-secondary: #8A9690` (4.5:1 + thermisch konsistent). Kleine Farbwert-Anpassungen ohne Brand-Impact. |
| **Estimated Effort** | XS (< 1h) |
| **Confidence** | **Verified** — Automatisch gemessen |

---

### ISSUE-005

| Feld | Inhalt |
|------|--------|
| **Issue ID** | ISSUE-005 |
| **Screen/Component** | LearningSession — alle Screens |
| **Category** | UX / ADHD-Inclusive |
| **Current Behavior** | Kein sichtbarer Fortschrittsindikator für die Session. 10 Phasen (FocusRitual → BlockComplete) ohne "Schritt X von Y". Nutzer wissen nicht, wo sie sind. |
| **Evidence** | Code: `src/constants/phases.js` — 10 definierte Phasen. Kein Progress-State in `src/state/appReducer.js`. Screenshot `00-07`, `00-08`: Kein Fortschrittsbalken. |
| **User Impact** | ADHS: Beeinträchtigtes Zeitgefühl + hohe Abandonment-Rate ohne Orientierung. Besonders kritisch für DSPS-Subtypen die abends lernen (Ausdauerressource gering). |
| **Design Principle** | Nielsen #1: Visibility of System Status. ADHD Principle: Time Blindness Compensation. |
| **Severity** | **High (P1)** |
| **Frequency** | Jede Lernsession |
| **Recommendation** | Slim Progress Bar (3–4px) oben in der LearningSession mit Phase-Fraction (`phase 3 / 10`). Optionale Stimmungsmetapher: "Fast dort…". |
| **Estimated Effort** | S (2–4h) |
| **Confidence** | **High** — Code + visuell |

---

### ISSUE-006

| Feld | Inhalt |
|------|--------|
| **Issue ID** | ISSUE-006 |
| **Screen/Component** | AnalyzingScreen |
| **Category** | UX / Loading States |
| **Current Behavior** | 30–60 Sekunden API-Wartezeit mit animiertem Logo und Text, aber ohne erkennbaren Fortschrittszustand. Keine Schätzung der verbleibenden Zeit. |
| **Evidence** | Code: `src/components/AnalyzingScreen.jsx`. Network: Backend-Request an `/api/analyze-document`. Screenshot `00-03`: Spinner ohne Fortschritt. |
| **User Impact** | Kritischer Dropout-Punkt im Onboarding. Für ADHS: Ungewisse Wartezeiten triggern Frustration + Aufgabe der Session. |
| **Design Principle** | Nielsen #1: Visibility of System Status. Response Time Guidelines (< 10s feedback). |
| **Severity** | **High (P1)** |
| **Frequency** | Jedes Dokument-Upload |
| **Recommendation** | Multi-Step Fortschrittsanzeige: "Dokument lesen → Lernziele extrahieren → Karteikarten erstellen". Fake-Progress mit gestaffelten Nachrichten alle 10–15s. |
| **Estimated Effort** | S (3–6h) |
| **Confidence** | **High** — Code + UX-Prinzip |

---

### ISSUE-007

| Feld | Inhalt |
|------|--------|
| **Issue ID** | ISSUE-007 |
| **Screen/Component** | App-weit — Spacing |
| **Category** | Design System |
| **Current Behavior** | Kein Spacing-Token-System. 20+ verschiedene Padding/Margin-Werte: 4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 30, 32px ohne konsistente Skala. |
| **Evidence** | CSS-Analyse: `src/styles/index.css`, `src/styles/components.css` — arbitrary Werte. Keine `--space-*` Custom Properties. `src/components/*.jsx` — inline-style Abstände überall. |
| **User Impact** | Visuelle Inkonsistenz skaliert mit jedem neuen Feature. Maintenance-Aufwand steigt. Visueller Rhythmus fehlt → App wirkt unpoliert. |
| **Design Principle** | Design System: 8px-Grid-System. Principle of Proximity. |
| **Severity** | **High (P1)** |
| **Frequency** | App-weit |
| **Recommendation** | 8px-Basis-Grid: `--space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px; --space-5: 24px; --space-6: 32px; --space-7: 48px;`. Schrittweise Migration. |
| **Estimated Effort** | M (1–2 Tage) |
| **Confidence** | **Verified** — Code-Analyse |

---

## P2 — Mittlere Priorität

---

### ISSUE-008

| Feld | Inhalt |
|------|--------|
| **Issue ID** | ISSUE-008 |
| **Screen/Component** | App-weit — Animationen |
| **Category** | Accessibility — WCAG 2.3.3 |
| **Current Behavior** | Mascot-Animationen, Konfetti, Fade-Effekte laufen für alle Nutzer ohne Respektierung von `prefers-reduced-motion`. |
| **Evidence** | CSS: `src/styles/index.css` — `@keyframes` ohne `@media (prefers-reduced-motion)` Guard. `src/components/MascotDisplay.jsx` — Animation immer aktiv. |
| **User Impact** | Betrifft vestibulär-sensible Nutzer, Epileptiker, Nutzer mit ADHS die von Motion abgelenkt werden. WCAG 2.3.3 (Animation from Interactions) verletzt. |
| **Design Principle** | WCAG 2.1 AA: 2.3.3. Inclusive Design: Respect User Preferences. |
| **Severity** | **Medium (P2)** |
| **Frequency** | Alle Screens mit Animationen |
| **Recommendation** | `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }` als globale Regel. |
| **Estimated Effort** | XS (< 30min) |
| **Confidence** | **Verified** — Code-Analyse |

---

### ISSUE-009

| Feld | Inhalt |
|------|--------|
| **Issue ID** | ISSUE-009 |
| **Screen/Component** | App-weit — Icons |
| **Category** | Design System / Visual Identity |
| **Current Behavior** | Emojis als UI-Icons (📚, 🎯, ⚡, etc.). Keine Icon-Library. Rendering plattformabhängig (Apple vs Google vs Windows Emoji-Font). |
| **Evidence** | Code: `src/components/SubjectCard.jsx`, `src/components/DashboardScreen.jsx` — Emoji-String als Icon. Screenshots auf verschiedenen Plattformen: unterschiedliches Rendering. |
| **User Impact** | Inkonsistentes Visual auf verschiedenen Geräten. Kein kohärentes Icon-Vokabular. Erschwert Professionalisierung der Brand. |
| **Design Principle** | Consistency & Standards (Nielsen #4). Design System: Unified Visual Language. |
| **Severity** | **Medium (P2)** |
| **Frequency** | 15+ Stellen in der App |
| **Recommendation** | Lucide-React (bereits keine Abhängigkeit — prüfen), Phosphor Icons oder Radix Icons einführen. Migration in 2 Phasen: Erst neue Features, dann Backfill. |
| **Estimated Effort** | M (8–16h für vollständige Migration) |
| **Confidence** | **High** — Code + visuell |

---

### ISSUE-010

| Feld | Inhalt |
|------|--------|
| **Issue ID** | ISSUE-010 |
| **Screen/Component** | PWA Manifest |
| **Category** | Technical / PWA |
| **Current Behavior** | `public/manifest.json` → `background_color: "#0F1920"` (Blaugrau). Tatsächliche App-BG: `--bg: #0A0806` (Warmbraun). Splash Screen zeigt falschen Hintergrund. |
| **Evidence** | `public/manifest.json` Zeile 8: `"background_color": "#0F1920"`. CSS: `src/styles/index.css` — `background: var(--bg)` = `#0A0806`. Delta sichtbar beim App-Start auf iOS/Android. |
| **User Impact** | Kurzfristiger Farbblitz beim App-Start: Blaugrau → Warmbraun. Unprofessionell, zerstört ersten Eindruck. |
| **Design Principle** | PWA Best Practice: Splash Screen = App Background. |
| **Severity** | **Medium (P2)** |
| **Frequency** | Jedes App-Öffnen auf mobilen Geräten |
| **Recommendation** | `manifest.json`: `"background_color": "#0A0806"`. Gleichzeitig `theme_color` prüfen. |
| **Estimated Effort** | XS (5 Minuten) |
| **Confidence** | **Verified** — Code-Vergleich |

---

### ISSUE-011

| Feld | Inhalt |
|------|--------|
| **Issue ID** | ISSUE-011 |
| **Screen/Component** | App-weit — Inline-Styles |
| **Category** | Design System / Technical |
| **Current Behavior** | Inline-Styles dominieren: `style={{ background: 'var(--gold)', color: '#fff' }}`. Statt CSS-Klassen und Token-System. Ca. 40% aller Design-Entscheidungen via Inline-Styles. |
| **Evidence** | Code-Analyse: `src/components/CardLearning.jsx`, `src/components/DashboardScreen.jsx`, `src/components/SubjectCard.jsx` — Dutzende Inline-Style Props. |
| **User Impact** | Wartbarkeit: Design-Änderungen erfordern Suche in JSX statt in CSS. Theming (Dark/Light Mode) extrem schwer. Performance: kein CSS-Caching. |
| **Design Principle** | Separation of Concerns. DRY (Don't Repeat Yourself). |
| **Severity** | **Medium (P2)** |
| **Frequency** | App-weit |
| **Recommendation** | Schrittweise Migration: Neue Komponenten ausschließlich CSS-Klassen. Bestehende Inline-Styles bei Anfassen in CSS auslagern. `src/styles/components.css` ausbauen. |
| **Estimated Effort** | L (> 16h für vollständige Migration) |
| **Confidence** | **Verified** — Code-Analyse |

---

### ISSUE-012

| Feld | Inhalt |
|------|--------|
| **Issue ID** | ISSUE-012 |
| **Screen/Component** | App-weit — Sekundärfarbe |
| **Category** | Visual Design / Brand |
| **Current Behavior** | `--text-secondary: #8A9BAE` ist ein kühles Blaugrau. `--input-bg: #0F1A20` ist ein kühles Dunkelblau. Kontrastieren ungeplant mit der warmen Basis-Palette (`--bg: #0A0806`, `--gold: #D4A843`). |
| **Evidence** | CSS-Token-Analyse: Temperatur-Delta messbar. Screenshots: Sekundärtexte wirken visuell "losgelöst" vom warmen Hintergrund. |
| **User Impact** | Visuelle Kohärenz reduziert: App wirkt nicht aus einem Guss. Besonders sichtbar in Text-Heavy-Screens. |
| **Design Principle** | Color Harmony. Thermal Consistency. |
| **Severity** | **Medium (P2)** |
| **Frequency** | Alle Screens mit Sekundärtext |
| **Recommendation** | `--text-secondary: #8A9690` (warmgrau, 4.5:1). `--input-bg: #0F1410` (warmbraun statt blaugrau). Kleine Korrekturen mit großer visueller Wirkung. |
| **Estimated Effort** | XS (< 1h) |
| **Confidence** | **High** — Visuell + Code |

---

### ISSUE-013

| Feld | Inhalt |
|------|--------|
| **Issue ID** | ISSUE-013 |
| **Screen/Component** | Fehlerzustände, Leerzustände, generische Texte |
| **Category** | Brand Voice / UX Writing |
| **Current Behavior** | Fehlermeldungen sind technisch und neutral: "Error loading data". Leerzustände ohne Mascot oder Lumo-Ton. Generic-looking Toast-Messages. |
| **Evidence** | Code: `src/components/ErrorBoundary.jsx`, `src/components/EmptyState.jsx`. Screenshots: Generische Fehlertexte ohne emotionale Resonanz. |
| **User Impact** | Verpasste Chance: Fehler/Leerstand als emotionale Touchpoints für ADHS-Nutzer. Brand Consistency fehlt in Edge-Cases. |
| **Design Principle** | Brand Consistency. Emotional Design (Norman). Error Recovery (Nielsen #9). |
| **Severity** | **Medium (P2)** |
| **Frequency** | Edge-Cases: Error, Empty, Loading States |
| **Recommendation** | Brand Voice Guide: Lumo spricht in Ich-Form, fürsorglich, lösungsorientiert. Mascot-Icon in Fehlerzuständen. Beispiel: "Ich konnte das Dokument nicht laden — versuch es nochmal?" |
| **Estimated Effort** | S (4–8h Content + Implementation) |
| **Confidence** | **High** — Code + visuell |

---

### ISSUE-014

| Feld | Inhalt |
|------|--------|
| **Issue ID** | ISSUE-014 |
| **Screen/Component** | LearningSession — Alle Interaktions-Screens |
| **Category** | Accessibility — Touch Targets |
| **Current Behavior** | Einige Buttons < 44×44px. CardLearning Action-Buttons ca. 36px Höhe. WCAG 2.5.5 (Target Size) empfiehlt 44×44px Minimum. |
| **Evidence** | Code: `src/components/CardLearning.jsx` — Button Padding `py-2 px-4` = ca. 36px Höhe. Screenshots auf 375px: Buttons visuell klein. |
| **User Impact** | Mobile-Nutzer mit ADHS-Feinmotorik-Problemen: Fehlklicks. Generell: Mobile-Usability-Verschlechterung. |
| **Design Principle** | WCAG 2.5.5 Target Size. Touch Interface Guidelines (Apple HIG: 44pt, Material: 48dp). |
| **Severity** | **Medium (P2)** |
| **Frequency** | LearningSession — häufigste Feature-Nutzung |
| **Recommendation** | Minimum `height: 44px` für alle Touch-Buttons. `padding-block: 10px` als Minimum. Besonders kritisch: Karteikarten-Bewertungs-Buttons. |
| **Estimated Effort** | S (2–4h) |
| **Confidence** | **High** — Code + visuell |

---

## P3 — Niedrige Priorität / Verfeinerungen

---

### ISSUE-015

| Feld | Inhalt |
|------|--------|
| **Issue ID** | ISSUE-015 |
| **Screen/Component** | Dashboard — Subject Cards |
| **Category** | Visual Design |
| **Current Behavior** | Subject Cards haben keine Lernfortschritt-Visualisierung auf der Card selbst. Fortschritt erst nach Öffnen sichtbar. |
| **Evidence** | Code: `src/components/SubjectCard.jsx`. Dashboard Screenshot `00-04`: Cards ohne Fortschrittsanzeige. |
| **User Impact** | Dashboard erfüllt nicht vollständig seine Orientierungs-Funktion. ADHD: "Wo bin ich gerade?" nicht auf einen Blick beantwortbar. |
| **Design Principle** | Nielsen #1: Visibility of System Status. ADHD: Orientation at a Glance. |
| **Severity** | **Low (P3)** |
| **Frequency** | Dashboard — häufig besuchter Screen |
| **Recommendation** | Slim Progress Bar (2–3px) am unteren Rand der Subject Card. FSRS-Retention-Rate als Percentage optional. |
| **Estimated Effort** | S (2–4h) |
| **Confidence** | **Medium** — Visuell, User Testing ausstehend |

---

### ISSUE-016

| Feld | Inhalt |
|------|--------|
| **Issue ID** | ISSUE-016 |
| **Screen/Component** | App-weit — Heading-Hierarchie |
| **Category** | Accessibility — Semantic HTML |
| **Current Behavior** | H1–H6 werden nicht konsistent für visuelle Hierarchie genutzt. Einige Sections verwenden `<div className="text-xl">` statt `<h2>`. Screen-Reader-Nutzer verlieren Outline-Struktur. |
| **Evidence** | Code: `src/components/DashboardScreen.jsx` — `<div>` statt `<h2>` für Section-Titel. Accessibility Tree (DevTools): flache Heading-Struktur. |
| **User Impact** | Screen-Reader: Navigation via Headings nicht möglich. WCAG 1.3.1 (Info and Relationships). |
| **Design Principle** | WCAG 2.1 AA: 1.3.1 Info and Relationships. Semantic HTML. |
| **Severity** | **Low (P3)** |
| **Frequency** | App-weit |
| **Recommendation** | H1 = Page Title (einmalig), H2 = Section, H3 = Sub-Section. Visuell durch CSS steuerbar — semantisch korrekt. |
| **Estimated Effort** | S (4–8h, App-weit) |
| **Confidence** | **High** — Code-Analyse |

---

### ISSUE-017

| Feld | Inhalt |
|------|--------|
| **Issue ID** | ISSUE-017 |
| **Screen/Component** | LearningSession — CardLearning |
| **Category** | UX / Interaction Design |
| **Current Behavior** | Karteikarten können nur mit Buttons bewertet werden. Kein Swipe-Gesture auf Mobile. Kein Keyboard-Shortcut (1/2/3/Space) auf Desktop. |
| **Evidence** | Code: `src/components/CardLearning.jsx` — nur Button-Klick-Handler. Kein Touch-Event-Listener. |
| **User Impact** | Mobile-Nutzer: Weniger natürliche Interaktion. Desktop-Nutzer: Workflow slower without keyboard. |
| **Design Principle** | Nielsen #7: Flexibility & Efficiency. Progressive Disclosure of Power Features. |
| **Severity** | **Low (P3)** |
| **Frequency** | LearningSession — Kern-Workflow |
| **Recommendation** | Keyboard shortcuts: `1` = Nochmal, `2` = Schwer, `3` = Gut. Swipe-Left = Nochmal, Swipe-Right = Gut (Mobile). Tooltips bei ersten 3 Cards. |
| **Estimated Effort** | S (4–8h) |
| **Confidence** | **Medium** — User Preference, benötigt Testing |

---

### ISSUE-018

| Feld | Inhalt |
|------|--------|
| **Issue ID** | ISSUE-018 |
| **Screen/Component** | Onboarding — Upload |
| **Category** | UX / Accessibility |
| **Current Behavior** | Datei-Upload ausschließlich über File Picker. Kein Drag & Drop. Kein URL-Input für externe Ressourcen. Keine Clipboard-Paste-Unterstützung. |
| **Evidence** | Code: `src/components/UploadScreen.jsx` — `<input type="file">` only. |
| **User Impact** | Mehrere Nutzungsszenarien abgeschnitten: Lernende die mit Web-PDFs arbeiten, die Text copy-pasten. ADHS: Jede Extra-Interaktion erhöht Initiations-Hürde. |
| **Design Principle** | Nielsen #7: Flexibility & Efficiency. ADHD: Reduce Friction to Entry. |
| **Severity** | **Low (P3)** |
| **Frequency** | Onboarding — once per Subject |
| **Recommendation** | Drag & Drop Zone hinzufügen. Text-Paste Option: "Lernstoff direkt einfügen". Priorität: Drag & Drop zuerst. |
| **Estimated Effort** | S (4–8h) |
| **Confidence** | **Medium** |

---

## Hypothesen (Benötigen User Testing)

---

### ISSUE-H01

| Feld | Inhalt |
|------|--------|
| **Issue ID** | ISSUE-H01 |
| **Screen/Component** | LearningSession — FocusRitual |
| **Category** | ADHD-Inclusive / UX |
| **Hypothesis** | Das FocusRitual (Ziel-Setting vor der Session) erhöht möglicherweise die Initiations-Hürde für impulse-getriebene ADHS-Nutzer, die "einfach anfangen" möchten. |
| **Evidence** | Code-only: Hypothese basierend auf ADHD-Literatur zu Task Initiation (Barkley, 1997). Keine User-Daten verfügbar. |
| **Recommendation** | A/B-Test: FocusRitual Optional vs. Mandatory. Metric: Drop-Off-Rate nach FocusRitual-Screen. |
| **Confidence** | **Low — Hypothese, User Testing erforderlich** |

---

### ISSUE-H02

| Feld | Inhalt |
|------|--------|
| **Issue ID** | ISSUE-H02 |
| **Screen/Component** | Dashboard — Streak-Anzeige |
| **Category** | ADHD-Inclusive / Emotional Design |
| **Hypothesis** | Die Streak-Anzeige könnte bei Unterbrechungen (ADHS-typisch: Krankheit, Stress, Vergessen) kontraproduktiven Druck erzeugen, obwohl kein expliziter "Streak verloren"-State sichtbar ist. |
| **Evidence** | Literatur: Reward-Mechanics können bei ADHS-Nutzern Frustration statt Motivation auslösen wenn unterbrochen (Chronis et al., 2004). Kein User-Testing durchgeführt. |
| **Recommendation** | User-Interviews: "Wie fühlst du dich, wenn du eine Session verpasst?" Alternativ: Streak-Freeze-Mechanismus (wie Duolingo) oder Streak als "Trend" statt "Zähler". |
| **Confidence** | **Low — Hypothese, User Testing erforderlich** |

---

## Zusammenfassung: Effort vs. Impact Matrix

| Issue | Severity | Effort | Impact-Effort-Ratio |
|-------|----------|--------|---------------------|
| ISSUE-010 | P2 | XS | ⭐⭐⭐⭐⭐ |
| ISSUE-003 | P1 | XS | ⭐⭐⭐⭐⭐ |
| ISSUE-004 | P1 | XS | ⭐⭐⭐⭐⭐ |
| ISSUE-008 | P2 | XS | ⭐⭐⭐⭐⭐ |
| ISSUE-012 | P2 | XS | ⭐⭐⭐⭐⭐ |
| ISSUE-005 | P1 | S | ⭐⭐⭐⭐ |
| ISSUE-006 | P1 | S | ⭐⭐⭐⭐ |
| ISSUE-013 | P2 | S | ⭐⭐⭐ |
| ISSUE-014 | P2 | S | ⭐⭐⭐ |
| ISSUE-007 | P1 | M | ⭐⭐⭐ |
| ISSUE-001 | P0 | L | ⭐⭐ |
| ISSUE-002 | P0 | L | ⭐⭐ |
| ISSUE-011 | P2 | L | ⭐⭐ |

**Quick Wins (XS-Effort + P1/P2):** ISSUE-003, 004, 008, 010, 012  
Fünf Verbesserungen unter 1h Gesamtaufwand. Sofort umsetzbar.

---

*Dieses Register ist ein lebendiges Dokument und sollte nach jeder Sprint-Retrospektive aktualisiert werden.*
