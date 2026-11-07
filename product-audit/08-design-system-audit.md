# Phase 8 — Design System Audit
**Lumo — Dein Lernbegleiter**
Audit-Stand: 2026-11-06

---

## 8.1 Ist-Zustand des Design-Systems

### Was existiert
| Element | Implementierung | Vollständigkeit |
|---------|----------------|-----------------|
| Farb-Tokens | CSS Custom Properties in index.css | 🟢 Gut (22 Tokens) |
| Typografie-Scale | Implizit in index.css (h1-h3, body) | 🟡 Teilweise |
| Schatten-Tokens | 3 semantische Schatten | 🟢 Gut |
| Glow-Tokens | 3 Glow-Layer | 🟢 Gut |
| Border-Tokens | 2 Border-Varianten | 🟡 Ausreichend |
| Spacing-Tokens | ❌ Keine — ad-hoc | 🔴 Fehlt |
| Animation-Tokens | ❌ Keine Dauer-Tokens | 🔴 Fehlt |
| Component-Library | Minimal (Button, Mascot, Wordmark, ErrorBanner) | 🟡 Unvollständig |
| Icon-System | ❌ Kein Vektorsystem — Emojis + inline SVGs | 🔴 Fehlt |
| Dokumentation | ❌ Keine Design-System-Doku | 🔴 Fehlt |

---

## 8.2 Farb-Token-System (Detail-Review)

### Vollständigkeit
```
Hintergründe: 4 Tokens ✓ (bg, bg-elevated, bg-card, bg-card-bright)
Gold-Familie: 4 Tokens ✓ (gold, gold-soft, gold-light, gold-glow)
Text: 2 Tokens ✓ (text-primary, text-secondary)
Semantisch: 6 Tokens ✓ (green, green-soft, red, red-soft, amber, amber-soft)
Rahmen: 2 Tokens ✓ (border, border-gold)
Input: 2 Tokens ✓ (input-bg, input-border)
```

### Probleme
| Problem | Detail |
|---------|--------|
| **`--yellow` = `--gold`** (identische Werte) | Semantische Duplikation ohne Differenzierung |
| **Kein Surface-Hover-Token** | `--bg-card-hover` oder ähnliches fehlt |
| **Kein Disabled-State-Token** | Deaktivierte Elemente ohne Token |
| **Thermische Inkonsistenz** | Kühle Blautöne (input-bg, text-secondary) in warmer Palette |

---

## 8.3 Typografie-System (Detail-Review)

### Was definiert ist
```css
h1: 26px, 800 weight, -0.025em spacing
h2: 20px, 800 weight
h3: 17px, 700 weight, -0.015em spacing
.screen-content h1: 28px, Instrument Serif italic, 400
body: 16px, 1.65 line-height, -0.01em spacing
```

### Was fehlt
| Token | Fehlt | Konsequenz |
|-------|-------|-----------|
| `--font-size-xs` (11-12px für Labels) | ❌ | Ad-hoc in Komponenten |
| `--font-size-sm` (14px für sekundäre) | ❌ | Ad-hoc |
| `--font-size-lg` (18px für Einleitungen) | ❌ | Ad-hoc |
| `--font-size-display` (32-36px für Splash) | ❌ | Ad-hoc |
| `--font-weight-medium` (500/600) | ❌ | Sprung von 400→700 |
| `--line-height-tight` (1.2 für Headlines) | ❌ | Hard-coded |
| `--line-height-loose` (1.8 für Lesbarkeit) | ❌ | Hard-coded |

---

## 8.4 Spacing-System

### Ist-Zustand
Kein Spacing-Token-System. Abstände werden überall ad-hoc gesetzt:
- 8px, 10px, 12px, 14px, 16px, 20px, 24px, 32px, 40px, 48px
- Keine Konsistenz zwischen Screens

### Empfohlenes Spacing-System (8px-Grid)
```css
--space-xs:  4px   /* Tight gaps, icon spacing */
--space-sm:  8px   /* Inner padding small elements */
--space-md: 16px   /* Standard padding */
--space-lg: 24px   /* Section gaps */
--space-xl: 40px   /* Large sections */
--space-2xl: 64px  /* Screen-Level separations */
```

---

## 8.5 Komponenten-Review

### Vorhandene Komponenten
| Komponente | Vollständigkeit | Props-API |
|-----------|-----------------|----------|
| `Button` | 🟡 Teilweise | `variant`, `onClick`, `disabled`? |
| `LumoMascot` | 🟡 Teilweise | `state`, `size`? |
| `LumoWordmark` | 🟢 Vollständig | Wenig Props nötig |
| `ErrorBanner` | 🟡 Teilweise | Fehlermeldungs-Text |
| `StorageWarningBanner` | 🟡 Teilweise | Bytes |
| `OfflineBanner` | 🟢 Minimal | Kein Props nötig |
| `InstallBanner` | 🟢 Minimal | Kein Props nötig |
| `BetaFeedbackButton` | 🟢 Vollständig | — |
| `CookieConsent` | 🟢 Vollständig | Hooks + Rendering |

### Fehlende Komponenten
| Komponente | Verwendung | Priorität |
|-----------|-----------|----------|
| `ProgressBar` | Dashboard, Block-Fortschritt | 🔴 Hoch |
| `Badge` | Streak, Status-Labels | 🔴 Hoch |
| `Card` | Blöcke, Projekte, Karteikarten | 🟡 Mittel |
| `Spinner/LoadingState` | AnalyzingScreen, API-Calls | 🟡 Mittel |
| `Modal/Dialog` | Bestätigungen (statt In-Place) | 🔵 Gering |
| `TabBar` | FlashcardScreen, WeakSpots-Tabs | 🟡 Mittel |
| `IconButton` | Settings-Gear, Back-Arrow | 🔴 Hoch |
| `EmptyState` | Leer-Zustände konsistent | 🟡 Mittel |

---

## 8.6 Icon-System

### Ist-Zustand
- Keine einheitliche Icon-Bibliothek
- Emojis als UI-Icons (🔥 Streak, ✓ Bestätigung, etc.)
- Inline-SVGs für spezifische Icons (Settings-Gear in DashboardScreen)
- Kein konsistentes Größen-/Stil-System

### Probleme
| Problem | Konsequenz |
|---------|-----------|
| Emojis als UI-Icons | Plattformabhängige Darstellung (Apple vs. Android vs. Windows) |
| Kein Icon-Set | Bei neuen Features muss jedes Mal ein neues Icon erfunden werden |
| SVG inline vs. Emoji | Visuelle Inkonsistenz |

**Empfehlung**: Lucide Icons (tree-shakeable, MIT, konsistent) oder Phosphor Icons.

---

## 8.7 Animationen & Transitions

### Definierte Animationen (index.css)
- `lumo-pulse`: 2s ease-in-out infinite (Block-Dots in-progress)
- Phase-Transitions in SessionScreen (wahrscheinlich inline)
- Mascot-Animationen (LumoMascot.jsx)

### Fehlende Animation-Tokens
```css
/* Empfohlen */
--duration-instant: 100ms
--duration-fast: 200ms
--duration-normal: 300ms
--duration-slow: 500ms
--easing-standard: cubic-bezier(0.4, 0, 0.2, 1)
--easing-decelerate: cubic-bezier(0, 0, 0.2, 1)
--easing-spring: cubic-bezier(0.34, 1.56, 0.64, 1)
```

---

## 8.8 Design-System-Dokumentation

### Was fehlt
❌ Kein Storybook / Component Playground
❌ Kein DESIGN_SYSTEM.md oder ähnliche Dokumentation
❌ Keine Component-API-Dokumentation
❌ Keine Design-Token-Referenz für Entwickler
❌ Kein Color-Usage-Guide ("Wann --gold vs. --amber?")
❌ Kein Mascot-State-Katalog ("Welcher State für welchen Kontext?")

---

## 8.9 Gesamtbewertung Phase 8

| Kategorie | Score |
|-----------|-------|
| Farb-Token-System | 7/10 |
| Typografie-System | 5/10 |
| Spacing-System | 2/10 |
| Komponenten-Library | 5/10 |
| Icon-System | 3/10 |
| Animationen | 4/10 |
| Dokumentation | 1/10 |
| **Gesamt Design-System** | **3.9/10** |

### Top-3-Findings

1. **[KRITISCH] Kein Spacing-System**: Das fehlt vollständig. Abstände sind auf 20+ verschiedene Werte verteilt. Jede neue UI-Komponente erfindert ihr eigenes Spacing — Chaos wächst mit der Codebase.

2. **[KRITISCH] Kein Icon-System**: Emojis als UI-Icons sind plattformabhängig (Apple Emoji ≠ Windows Emoji) und nicht skalierbar. Bei weiterer Feature-Entwicklung notwendig.

3. **[MITTEL] Fehlende Kern-Komponenten**: ProgressBar, Badge, IconButton, EmptyState sind in jeder Feature-Datei neu implementiert statt als gemeinsame Komponente.

---

## Quick-Win: Design Token Erweiterung

```css
/* Zu index.css hinzufügen */
:root {
  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 40px;
  
  /* Typography */
  --text-xs: 12px;
  --text-sm: 14px;
  --text-md: 16px;
  --text-lg: 18px;
  --text-xl: 22px;
  
  /* Duration */
  --dur-fast: 150ms;
  --dur-normal: 250ms;
  --dur-slow: 400ms;
  
  /* Border Radius */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-full: 9999px;
}
```
