# Phase 11 — Priorisierter Verbesserungs-Roadmap
**Lumo — Dein Lernbegleiter**
Stand: 2026-11-06

---

## Roadmap-Prinzipien

1. **Stärken schützen zuerst**: ADHS-Aware-Design und Brand-Identity sind differenzierend — nichts davon darf durch technische Verbesserungen beschädigt werden.
2. **Quick-Wins vor Systemarbeit**: Die wichtigsten Nutzungsmomente verbessern zuerst, ohne große Refactorings.
3. **Impact/Effort priorisiert**: Effort = Implementierungsaufwand (Entwickler-Stunden). Impact = Verbesserung für Endnutzer.
4. **ADHS-Nutzbarkeit hat höchste Priorität**: Jede Friction, die ADHS-Nutzer beim Lernen stört, ist P0.

---

## Impact / Effort Matrix

```
                    HIGH IMPACT
                         |
   D ◄────────────────── | ──────────────────►
   E  P0-UX-01          |  P1-A11Y-01
   S  (Navigation)      |  (focus-visible) ← HIER ANFANGEN
   K  P0-RWD-01         |  P1-A11Y-02  
   T  (Desktop)         |  (Kontrast)
   O     ●              |  P1-UX-02 (Session-Progress) ●
   P     |              |  P1-UX-03 (Analyzing)  ●
   L     |              |  P2-PWA-01  ●
                        |
   H  P2-DS-02          |  P2-THERM-01 ●
   I  (Icon-System)     |  P2-BRAND-01 ●  
   G     ●              |
   H     |              |  P1-DS-01
        P2-CSS-01 ●     |  (Spacing-System) ●
                        |
                    LOW IMPACT
              HIGH EFFORT ←──── LOW EFFORT
```

---

## Sprint 1 — Quick Wins (1-3 Tage)

### S1.1 — Kontrast-Fix für WCAG-Compliance
**Effort**: 2h | **Impact**: Hoch (Accessibility, Brand-Konsistenz)
**Findings**: P1-A11Y-02

```css
/* Aktuelle Werte: */
--red: #E07B54;    /* 4.2:1 — zu wenig */
--amber: #C47A2B;  /* 3.8:1 — zu wenig */

/* Empfohlene Fixes: */
--red: #E8906A;    /* ~4.6:1 auf #0A0806 — WCAG AA ✓ */
--amber: #D48A3A;  /* ~4.6:1 auf #0A0806 — WCAG AA ✓ */
```

**Risiko**: Minimal. Farbton bleibt erhalten, nur Helligkeit angepasst.
**Prüfung**: Visuell vergleichen nach Änderung — Amber darf nicht "gelber" oder "zu blass" wirken.

---

### S1.2 — :focus-visible Style implementieren
**Effort**: 1h | **Impact**: Hoch (Keyboard-Navigation, WCAG 2.4.7)
**Findings**: P1-A11Y-01

```css
/* Zu index.css hinzufügen */
*:focus-visible {
  outline: 2px solid var(--gold);
  outline-offset: 3px;
  border-radius: 4px;
}

/* Für Buttons und Cards mit eigenem Border */
.btn:focus-visible,
.card:focus-visible {
  outline-offset: 2px;
}
```

**Risiko**: Minimal. Bestehende Styles werden nicht überschrieben.
**Prüfung**: Tab-Navigation durch die App, alle fokussierbaren Elemente müssen sichtbaren Ring haben.

---

### S1.3 — prefers-reduced-motion
**Effort**: 2h | **Impact**: Mittel (Accessibility, WCAG 2.3.3)
**Findings**: P2-A11Y-03

```css
/* Zu index.css hinzufügen */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  
  /* canvas-confetti: in LumoMascot.jsx oder BlockComplete.jsx */
  /* Prüfen ob Konfetti-Trigger auf reduced-motion reagiert */
}
```

**Risiko**: Minimal. Test: Reduzierte Bewegung in MacOS/iOS aktivieren.

---

### S1.4 — PWA background_color Fix
**Effort**: 15min | **Impact**: Gering-Mittel (Brand-Konsistenz beim Splash)
**Findings**: P2-PWA-01

In `public/manifest.json`:
```json
{
  "background_color": "#0A0806"
}
```
(Von `#0F1920` auf `#0A0806` = `--bg`)

**Risiko**: Minimal. Nur visuell beim Splash-Screen.

---

### S1.5 — Thermische Farb-Korrektur
**Effort**: 30min | **Impact**: Mittel (Brand-Konsistenz)
**Findings**: P2-THERM-01

```css
/* Aktuelle kühle Werte: */
--text-secondary: #8A9BAE;  /* Blaustich */
--input-bg: #0F1A20;        /* Blaustich */

/* Empfohlene warme Werte: */
--text-secondary: #8A9690;  /* Warmes Graugrün — neutral, nicht blau */
--input-bg: #12100E;        /* Warmes Dunkelbraun — passt zu --bg */
```

**Risiko**: Mittel. Visuell gut prüfen — Text muss noch lesbar und kontrastreich genug sein.
**Prüfung**: Screenshots vor/nach. Besonders OnboardingScreen1, ProjectsScreen.

---

## Sprint 2 — Nutzungskritische Verbesserungen (1-2 Wochen)

### S2.1 — Session Phasen-Indikator
**Effort**: 4h | **Impact**: Hoch (ADHS-Zeitwahrnehmung)
**Findings**: P1-UX-02

**Problem**: 10 Session-Phasen ohne Fortschritts-Feedback.
**Lösung**: Diskreter Phase-Counter oberhalb oder im Header.

```
Mögliche Implementierung in SessionScreen:
- "Phase 3 von 6" als Subtext
- Oder: Dot-Indikatoren (••○○○○)
- Oder: Dünne Progress-Bar am oberen Rand

WICHTIG: ADHS-sensitive Implementierung:
- KEINE Countdown-Zahlen
- KEINE Zeitangaben ("noch 20 min")
- NUR Fortschritt (wie weit bin ich)
- Optionale "Wie lange bin ich schon hier?" Funktion
```

---

### S2.2 — AnalyzingScreen Schritt-Feedback
**Effort**: 6h | **Impact**: Hoch (Onboarding-Completion-Rate)
**Findings**: P1-UX-03

**Problem**: 30-60s Wartezeit mit einem generischen Spinner.
**Lösung**: Schrittweise Feedback-Animation.

```
Schritt 1: "Lese deinen Text..."    [●○○○]
Schritt 2: "Erkenne Themen..."      [●●○○]  
Schritt 3: "Erstelle Karteikarten..." [●●●○]
Schritt 4: "Fast fertig..."          [●●●●]
```

```jsx
// Implementierung: steps array + 15-sec intervals
const ANALYZING_STEPS = [
  "Lese deinen Text...",
  "Erkenne Themen...", 
  "Erstelle deine Karteikarten...",
  "Letzte Feinheiten..."
];
// Mascot wechselt Zustand bei jedem Schritt (thinking → excited)
```

---

### S2.3 — Mascot in Fehlerzuständen
**Effort**: 3h | **Impact**: Mittel (Brand-Konsistenz, Emotional Design)
**Findings**: P2-BRAND-01

**Problem**: ErrorBoundary und ErrorBanner ohne Mascot.
**Lösung**: Mascot-State `sad` oder `thinking` + Brand-Voice-Fehlermeldung.

```
Statt: "Etwas ist schiefgelaufen"
Besser: "Oops — Lumo ist kurz gestolpert. 
         Versuch's nochmal?"
         [Mascot: confused/sad]
```

---

### S2.4 — Desktop max-width anheben
**Effort**: 30min | **Impact**: Mittel (Desktop-Nutzbarkeit)
**Findings**: P0-RWD-01 (kleines Partial-Fix)

```css
/* Sofortmaßnahme ohne Layout-Refactoring */
@media (min-width: 1024px) {
  .screen-content { max-width: 720px; }
}

@media (min-width: 1400px) {
  .screen-content { max-width: 860px; }
}
```

**Hinweis**: Das ist kein echtes Desktop-Layout, nur mehr Platz. 
Ein echtes Desktop-Layout (Sidebar etc.) kommt in Sprint 4.

---

## Sprint 3 — Design System Fundament (3-4 Wochen)

### S3.1 — Spacing-Token-System einführen
**Effort**: 2 Tage | **Impact**: Hoch (langfristige Maintainability)
**Findings**: P1-DS-01

```css
/* Phase 1: Tokens definieren */
:root {
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 40px;
  --space-2xl: 64px;
}
```

**Phase 2**: Schrittweise Migration. Priorität:
1. DashboardScreen (meistgenutzter Screen)
2. ProjectsScreen
3. SessionScreen
4. Weitere nach Bedarf

---

### S3.2 — Typografie-Token-System
**Effort**: 1 Tag | **Impact**: Mittel
**Findings**: P2-DS-* (Typografie)

```css
:root {
  --text-xs: 12px;
  --text-sm: 14px;
  --text-md: 16px;
  --text-lg: 18px;
  --text-xl: 22px;
  --text-2xl: 26px;
  --text-3xl: 32px;
}
```

---

### S3.3 — Animation-Token-System
**Effort**: 2h | **Impact**: Mittel
```css
:root {
  --dur-instant: 100ms;
  --dur-fast: 150ms;
  --dur-normal: 250ms;
  --dur-slow: 400ms;
  --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

---

### S3.4 — ProgressBar Component
**Effort**: 4h | **Impact**: Hoch (Dashboard, Block-Fortschritt)
**Findings**: P1-DS-02 (fehlende Komponenten)

```jsx
// Universelle ProgressBar Komponente
<ProgressBar 
  value={completedCards} 
  max={totalCards} 
  color="var(--gold)"
  showLabel={false}  // für ADHS: optional
/>
```

---

## Sprint 4 — Desktop & Navigation (4-6 Wochen)

### S4.1 — Desktop-Layout (Sidebar-Navigation)
**Effort**: 2 Wochen | **Impact**: Kritisch für Desktop-Nutzbarkeit
**Findings**: P0-RWD-01

Empfohlene Architektur:
```
Desktop ≥ 1200px:
┌──────────────┬──────────────────────────┐
│  Sidebar     │  Haupt-Content            │
│  220px       │  max-width: 760px         │
│              │                           │
│  LumoMascot  │                           │
│  Navigation  │                           │
│  - Dashboard │                           │
│  - Projekte  │                           │
│  - Schwächen │                           │
│  - Einst.    │                           │
└──────────────┴──────────────────────────┘

Tablet 768-1199px:
┌────────────────────────────────────────┐
│  TopBar mit Navigation                 │
├────────────────────────────────────────┤
│  Content: max-width 680px, zentriert   │
└────────────────────────────────────────┘
```

---

### S4.2 — Konsistente Navigation
**Effort**: 1 Woche | **Impact**: Hoch (Orientierung in der App)
**Findings**: P0-UX-01

Maßnahmen:
1. Back-Button auf ALLEN Screens ausser Dashboard
2. Breadcrumb oder "Wo bin ich?" Indicator
3. Screen-Titel konsistent positioniert
4. Navigation-State in URL reflektieren (optionales Deep-Linking)

---

## Sprint 5 — Brand & Icon-System (2-3 Wochen)

### S5.1 — Icon-System einführen
**Effort**: 1 Woche | **Impact**: Mittel (Konsistenz, Skalierbarkeit)
**Findings**: P2-DS-02

Empfehlung: **Lucide Icons** (MIT-Lizenz, tree-shakeable, konsistent)

```bash
npm install lucide-react
```

Prioritäten:
1. Settings-Icon (ersetzt Inline-SVG)
2. Back-Arrow
3. Close/X 
4. Add/Plus
5. Calendar/Exam

Emojis behalten für: Streaks (🔥), Lernhinweise, emotionale Momente.
Lucide für: UI-Navigation, Aktionen, Status.

---

### S5.2 — Brand Voice Guide
**Effort**: 2 Tage | **Impact**: Mittel (Brand-Konsistenz)
**Findings**: P2-BRAND-01

Deliverables:
1. Brand Voice Dokument (intern): "Wann Mascot-Sprache, wann neutral?"
2. Fehlermeldungen überarbeiten mit Lumo-Ton
3. CTA-Texte auf Brand-Voice prüfen
4. Leerzustand-Texte auf allen Screens

---

## Nicht-Scope / Bewusst ausgeklammert

| Thema | Warum nicht jetzt |
|-------|-----------------|
| TypeScript Migration | Zu groß, kein kurzfristiger Nutzer-Benefit |
| CardLearningPhase.jsx Split | Riskant ohne Test-Coverage, langfristiges Refactoring |
| Storybook einführen | Sinnvoll bei größerem Team, aktuell Over-Engineering |
| URL-basiertes Deep-Linking | Erfordert Router (z.B. React Router) — große Änderung |
| Swipe-Navigation | Nice-to-have nach Mobile-Validierung |

---

## Metriken für Erfolg

| Sprint | Key Metric | Ziel |
|--------|-----------|------|
| S1 | WCAG AA Compliance | >90% |
| S1 | Focus-visible auf allen Buttons | 100% |
| S2 | AnalyzingScreen Completion-Rate | +15% vs Baseline |
| S2 | Session-Start nach WelcomeBack | +10% vs Baseline |
| S3 | Neue Komponenten mit Spacing-Tokens | 100% |
| S4 | Desktop-Zufriedenheit | Messbar positiv |
| S4 | Desktop-Retention-Rate | +X% |

---

## Empfohlene Reihenfolge (Zusammenfassung)

```
Woche 1:    S1.1 Kontrast + S1.2 Focus-Visible + S1.4 PWA Fix
Woche 1:    S1.3 reduced-motion + S1.5 Thermische Farbe
Woche 2-3:  S2.1 Session-Indikator + S2.2 AnalyzingScreen + S2.3 Mascot-Fehler
Woche 3-4:  S2.4 Desktop max-width anheben
Woche 5-8:  S3.x Design System Tokens + Komponenten
Woche 9-14: S4.x Desktop Layout + Navigation
Woche 15+:  S5.x Icons + Brand Voice
```
