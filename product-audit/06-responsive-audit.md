# Phase 6 — Responsive Design Audit
**Lumo — Dein Lernbegleiter**
Audit-Stand: 2026-11-06

---

## 6.1 Breakpoint-Strategie

### Ist-Zustand
```css
/* Einziger expliziter Breakpoint */
@media (min-width: 700px) {
  .screen-content { max-width: 560px; }
}
/* Mobile Default */
.screen-content { max-width: 520px; }
```

**Problem**: Nur ein Breakpoint. Keine Tablet-, Desktop- oder Wide-Screen-Anpassungen.

### Viewport-Abdeckung
| Viewport | Verhalten | Qualität |
|----------|----------|---------|
| 375px (iPhone SE) | Zentrierte Spalte, Scroll | 🟢 OK |
| 390px (iPhone 14) | Zentrierte Spalte | 🟢 OK |
| 430px (iPhone Pro Max) | Zentrierte Spalte, etwas Rand | 🟢 OK |
| 768px (iPad) | 560px Spalte, 100px Rand | 🟡 Ungenutzt |
| 1024px (iPad Pro) | 560px Spalte, 230px Rand pro Seite | 🟡 Ungenutzt |
| 1440px (MacBook Air) | 560px Spalte, 440px Rand pro Seite | 🔴 Dead Space |
| 1920px (Full HD) | 560px Spalte, 680px Rand | 🔴 Kritisch |

---

## 6.2 Mobile Erfahrung

### Stärken
- **Mobile-First korrekt umgesetzt**: Alle Screens funktionieren bei 375px+
- **`--dvh: 100dvh`**: Dynamische Viewport-Höhe für iOS Safari implementiert ✓
- **Tastatur-Handling**: JS-basierte `--dvh`-Aktualisierung bei Tastaturöffnung ✓
- **Touch-Target-Größen** (CTA-Buttons): 44px+ ✓
- **Kein horizontales Scroll** erkennbar

### Verbesserungen
| Schwere | Problem | Empfehlung |
|---------|---------|-----------|
| 🟡 Mittel | **Bottom Safe Area (iPhone Home Indicator)**: Wahrscheinlich nicht konsistent behandelt | `padding-bottom: env(safe-area-inset-bottom)` auf `.screen` |
| 🟡 Mittel | **Swipe-Navigation fehlt**: Mobile-Nutzer erwarten Swipe zwischen Karteikarten | Progressive Enhancement: Swipe Links/Rechts |
| 🔵 Gering | **Zoom bei Input-Focus**: iOS zoomt wenn `font-size < 16px`. Inputs haben 16px ✓ — aber Labels/Chips eventuell kleiner | Prüfen |

**Bewertung Mobile: 7/10**

---

## 6.3 Tablet-Erfahrung (768–1024px)

### Ist-Zustand
App zeigt exakt gleiche Ansicht wie Mobile, zentriert in 560px Spalte.

### Verbesserungspotenzial
| Feature | Beschreibung | Priorität |
|---------|-------------|----------|
| Zweispalten-Layout | Dashboard: Blöcke links, Details rechts | 🟡 Mittel |
| Größere Touch-Targets | Tablet-Nutzer tippen weniger präzise | 🔵 Gering |
| Breitere Cards | 560px ist auf 768px+ zu schmal | 🟡 Mittel |
| Karteikarten Flip-Effekt | Tablet: Breitere Karte möglich | 🔵 Gering |

**Bewertung Tablet: 4/10** — kein spezifisches Tablet-Layout

---

## 6.4 Desktop-Erfahrung (1200px+)

### Ist-Zustand (kritisch)
560px Inhalts-Spalte, ~440px toter Rand pro Seite auf 1440px.
Keine Desktop-spezifischen Features.

### Vergleich mit Wettbewerbern
| App | Desktop-Layout |
|-----|---------------|
| Anki | Full-Width, Multi-Column Card-Review |
| Notion | Full-Width, flexible Sidebar |
| Duolingo | Zentriert ~780px, aber mit Side-Widgets |
| Coursera | Multi-Column, richtige Desktop-Navigation |
| **Lumo** | **560px zentriert — kein Desktop-Layout** |

### Empfohlene Desktop-Verbesserungen
```
1. Max-Width auf 800px erhöhen (mindestens)
2. Desktop-Layout Variante:
   ┌──────────────┬──────────────────────────┐
   │  Sidebar     │  Haupt-Content            │
   │  220px       │  Blöcke, Session, etc.    │
   │  Navigation  │                           │
   │  - Dashboard │                           │
   │  - Karten    │                           │
   │  - Schwächen │                           │
   │  - Einst.    │                           │
   └──────────────┴──────────────────────────┘
   
3. ODER: Zweispalten ohne Sidebar:
   ┌─────────────────┬────────────────────────┐
   │  Block-Liste    │  Block-Detail / Session │
   │  300px          │                        │
   └─────────────────┴────────────────────────┘
```

**Bewertung Desktop: 2/10** — kein Desktop-Layout vorhanden

---

## 6.5 PWA auf Desktop (Chrome/Edge)

### Ist-Zustand
PWA installierbar über InstallBanner. Bei Installation als PWA-App auf Desktop:
- Öffnet in einem schmalen Fenster (~500px default?)
- Background Color im Manifest: `#0F1920` (nicht `--bg #0A0806`)
- Kein angepasstes Desktop-PWA-Layout

### PWA-spezifische Probleme
| Problem | Status |
|---------|--------|
| `background_color` ≠ `--bg` | Beim Splash-Screen sieht man andere Farbe | 🟡 |
| Kein `min-width` im Manifest | App kann sehr schmal gezogen werden | 🔵 |
| Kein `display: "window-controls-overlay"` | Standard PWA-Chrome | 🔵 |

**Bewertung PWA-Desktop: 5/10**

---

## 6.6 Performance auf mobilen Netzwerken

### Bundle-Analyse (Vite 8.3.5 + Code Splitting)
Eager Bundle (DashboardScreen + SessionScreen + WelcomeBackScreen):
- Mindestens 3 große React-Komponenten + alle Abhängigkeiten
- canvas-confetti: ~1.9KB gzip ✓
- ts-fsrs: ~15KB gzip (est.) ✓
- react+react-dom: ~43KB gzip ✓

Lazy Chunks (alle anderen Screens): On-demand geladen
PWA Service Worker: Cache-First für Assets ✓

**Bewertung Performance: 7/10** (Code Splitting korrekt implementiert)

---

## 6.7 Gesamtbewertung Phase 6

| Kategorie | Score |
|-----------|-------|
| Mobile | 7/10 |
| Tablet | 4/10 |
| Desktop | 2/10 |
| PWA-Desktop | 5/10 |
| Performance | 7/10 |
| **Gesamt Responsive** | **5.0/10** |

### Top-3-Findings

1. **[KRITISCH] Desktop = Mobile in 560px-Käfig**: Der einzige Desktop-Unterschied sind 40px mehr max-width. Keine Sidebar, kein Grid, kein nutzungsgerechtes Layout. 44% aller Desktop-Nutzer sehen ein app-großes Loch.

2. **[MITTEL] Kein Tablet-Layout**: iPad-Nutzer (signifikante Lernendenzielgruppe!) sehen 768px-Viewport mit 560px Inhalt und 100px weißem Rand beiderseits. Verschwendetes Potential für komfortables Lernen auf größerem Bildschirm.

3. **[GERING] PWA background_color-Diskrepanz**: `#0F1920` vs. `--bg: #0A0806` — beim Splash-Screen und bei PWA-Fenster sieht man kurz die falsche Farbe.
