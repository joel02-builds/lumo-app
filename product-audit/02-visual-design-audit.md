# Phase 2 — Visual Design Audit
**Lumo — Dein Lernbegleiter**
Audit-Stand: 2026-11-06

---

## Bewertungsrahmen

Skala: 1 (kritisch) → 10 (exzellent)
Gewichtung: Konsistenz 25%, Hierarchie 20%, Stimmigkeit 20%, Ausführung 20%, Differenzierung 15%

---

## 2.1 Farbsystem

### Stärken
- **Warm-Dark-Palette** (`#0A0806`) ist unverwechselbar — kein generisches "Dark Mode Dark Blue"
- **Gold als Brand-Anker** (`#D4A843`): konsequent eingesetzt für CTAs, Highlights, Mascot
- **Semantische Differenzierung** korrekt umgesetzt: Grün=Erfolg, Amber=Warnung, Rot=Hinweis (kein Alarm-Rot)
- 3-Layer Glow-System schafft echte Tiefe (Ebene: Center, Top, Vignette)

### Probleme
| Schwere | Problem | Datei/Kontext |
|---------|---------|--------------|
| 🟡 Mittel | `--text-secondary: #8A9BAE` ist **blaugrau** — thermisch inkonsistent mit Warm-Dark-Base | index.css |
| 🟡 Mittel | `--input-bg: #0F1A20` ist dunkelblau-grün — Kontrast zur warmen `--bg` wirkt wie fremdes UI-Element | index.css |
| 🟡 Mittel | `background_color` in PWA-Manifest (`#0F1920`) entspricht exakt dem `--input-bg`, nicht `--bg` | manifest.json |
| 🔵 Gering | `--yellow` und `--gold` haben identischen Wert `#D4A843` — semantische Duplikation ohne Differenzierung | index.css |
| 🔵 Gering | Gold-Varianten (gold, gold-soft, gold-light, gold-glow) = 4 Abstufungen für eine Farbe — evtl. zu granular | index.css |

**Bewertung Farbsystem: 6/10**
Kern-Idee stark, aber thermische Inkonsistenz (cool-blau im warm-dunkel) stört die Kohäsion.

---

## 2.2 Typografie

### Stärken
- **Instrument Serif Italic** für emotionale Momente ist kraftvoll und unvergesslich
- System-Font-Stack als Body ist pragmatisch performant (keine Ladezeit)
- Klare Größen-Hierarchie (h1→h3: 26→20→17px)
- Tight Letter-Spacing (-0.025em) bei Headlines: modern, kompakt

### Probleme
| Schwere | Problem | Detail |
|---------|---------|--------|
| 🟡 Mittel | **Doppel-Font-System mit unklarer Grenze**: Nunito lädt, wird aber nur für Wordmark verwendet — Wert unklar | HTML Head |
| 🟡 Mittel | **Instrument Serif nur in `.screen-content h1`** — außerhalb des Screen-Content-Containers erscheinen h1-Elemente in System-Font, ohne Erklärung | index.css:75 |
| 🔵 Gering | Kein explizit benanntes **Display/Large-Text-Token** — 28px nur implizit für `.screen-content h1` | index.css:79 |
| 🔵 Gering | Keine **explizite Schriftgröße für Labels** (z.B. 12px für Chip-Labels, 11px für Metadaten) | — |

**Bewertung Typografie: 7/10**
Differenzierte Typografie-Entscheidungen (Serif für Emotion), aber Font-Rollen nicht vollständig dokumentiert.

---

## 2.3 Visuelle Hierarchie & Layout

### Stärken
- **Mascot als emotionaler Anker**: klare Augen des Nutzers auf den Kern-Content gelenkt
- **Card-System**: `--bg-card (#1A1612)` hebt Blöcke klar vom `--bg (#0A0806)` ab
- **Gold-CTAs** springen sofort ins Auge — CTA-Hierarchie stimmt

### Probleme
| Schwere | Problem | Detail |
|---------|---------|--------|
| 🔴 Kritisch | **Desktop Dead Space**: 440px ungenutzter Rand pro Seite auf 1440px-Viewport — keine Desktop-Nutzung | Alle Screens |
| 🟡 Mittel | **WelcomeBack Screen**: Mascot + Headline + Stats + CTA auf kleiner Fläche — zu viele Elemente ohne klare Ruhe-Zone | WelcomeBackScreen |
| 🟡 Mittel | **Dashboard Blockliste**: Progress-Bar über alle Blöcke + individuelle Block-Dots = redundante Progress-Information | DashboardScreen |
| 🟡 Mittel | **ProjectsScreen**: leere Zustände ohne visuelles Feedback (kein Illustration/Mascot-Reaktion) | ProjectsScreen |
| 🔵 Gering | Z-Index-Layering für fixed LumoWordmark kann mit Session-Header kollidieren (bekannt, `sessionHasOwnHeader` guard) | App.jsx |

**Bewertung Visuelle Hierarchie: 5/10**
Mobile gut durchdacht, Desktop fundamental vernachlässigt.

---

## 2.4 Visuelles Design-System (Ausführung)

### Stärken
- **CSS Custom Properties konsequent** — keine Hard-coded Farben in src/ (außer wenigen Einzelfällen)
- **Glow-System** konsistent über Screens
- **Border-Radius** `12–16px` überall einheitlich
- **Shadow-System** (card, elevated, gold) semantisch korrekt eingesetzt

### Probleme
| Schwere | Problem | Detail |
|---------|---------|--------|
| 🟡 Mittel | Inline-Styles in ProjectsScreen/SettingsScreen für Buttons: `background: 'var(--gold)', color: '#1a1206'` — nicht über Button-Komponente | ProjectsScreen.jsx:50-57 |
| 🟡 Mittel | Kein zentrales `spacing`-Token — Abstände werden ad-hoc gesetzt (8px, 12px, 14px, 16px, 20px, 24px je nach Kontext) | — |
| 🔵 Gering | `border-radius: 14px` auf Inputs vs. `12px` auf Buttons — nicht harmonisiert | index.css:114 |
| 🔵 Gering | Transition-Dauer nicht tokenisiert: `0.15s`, `0.2s`, `0.3s` je nach Kontext | — |

**Bewertung Design-System-Ausführung: 6/10**

---

## 2.5 Differenzierung & Originalität

### Stärken
- **Warm-Dark** statt Cool-Dark: selten, erkennbar
- **Mascot als Kern-Element**: Lernbegleiter-Metapher visuell verankert
- **Instrument Serif Italic** für Headlines: ungewöhnlich in EdTech

### Schwächen
- Vergleichbare Apps (Anki, Notion, Duolingo Dark) nutzen ebenfalls Dark-Mode — Differenzierung ist subtil
- Gold als EdTech-Farbe wird zunehmend von anderen Apps kopiert

**Bewertung Differenzierung: 7/10**

---

## 2.6 Gesamtbewertung Phase 2

| Kategorie | Score |
|-----------|-------|
| Farbsystem | 6/10 |
| Typografie | 7/10 |
| Visuelle Hierarchie | 5/10 |
| Design-System-Ausführung | 6/10 |
| Differenzierung | 7/10 |
| **Gesamt Visual Design** | **6.2/10** |

### Top-3-Findings

1. **[KRITISCH] Desktop Dead Space**: Die App ist auf 1440px einer schmalen 560px-Spalte gefangen. Kein anderes Desktop-EdTech-Tool leistet sich das.

2. **[MITTEL] Thermische Inkonsistenz**: `--text-secondary` und `--input-bg` sind blaugrau/blaugrün — andere Temperatur als die warme Basis-Palette. Entweder durchgehend warm ODER bewusst kontrastierend (dann explizit).

3. **[MITTEL] Inline-Styles statt Token-Nutzung**: Button-Styles in ProjectsScreen/SettingsScreen außerhalb des Button-Komponenten-Systems — Design-System-Lücke.
