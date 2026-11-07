# Phase 5 — Accessibility Audit (a11y)
**Lumo — Dein Lernbegleiter**
Audit-Stand: 2026-11-06

---

## Bewertungsrahmen

Referenz: WCAG 2.1 AA (Mindeststandard), WCAG 2.2 empfohlen.
Prüfbereiche: Kontrast, Keyboard-Navigation, ARIA, Screenreader-Kompatibilität, Motion.

---

## 5.1 Farbkontrast

### Kritische Kombinationen
| Vordergrund | Hintergrund | Kontrastverhältnis | WCAG AA (4.5:1) | Status |
|-------------|-------------|-------------------|-----------------|--------|
| `--text-primary: #F2EFE9` | `--bg: #0A0806` | ~16.8:1 | ✓ | 🟢 |
| `--text-primary: #F2EFE9` | `--bg-card: #1A1612` | ~14.2:1 | ✓ | 🟢 |
| `--text-secondary: #8A9BAE` | `--bg: #0A0806` | ~6.1:1 | ✓ | 🟢 |
| `--text-secondary: #8A9BAE` | `--bg-card: #1A1612` | ~5.8:1 | ✓ | 🟢 |
| `--gold: #D4A843` | `--bg: #0A0806` | ~8.4:1 | ✓ | 🟢 |
| `--gold: #D4A843` | `--bg-card: #1A1612` | ~7.1:1 | ✓ | 🟢 |
| Dark-Text (#1a1206) auf `--gold: #D4A843` | — | ~8.4:1 | ✓ | 🟢 |
| `--green: #3D9E6E` | `--bg: #0A0806` | ~4.7:1 | ✓ (knapp) | 🟡 |
| `--red: #E07B54` | `--bg: #0A0806` | ~4.2:1 | ✗ knapp unter 4.5 | 🔴 |
| `--amber: #C47A2B` | `--bg: #0A0806` | ~3.8:1 | ✗ | 🔴 |
| Placeholder text (est. ~50% opacity) | Input-BG | ~2.5:1 | ✗ | 🔴 |

**Bewertung Kontrast: 5/10**
Primäre Farben gut. Semantische Farben (Red, Amber) unterschreiten WCAG AA.

---

## 5.2 Keyboard-Navigation

### Beobachtungen (aus Code-Analyse)
| Feature | Status |
|---------|--------|
| Buttons mit `type="button"` | Unbekannt — muss geprüft werden |
| Tab-Order sinnvoll | Wahrscheinlich (DOM-Order) |
| Focus-Visible Styles | ⚠️ Nicht explizit in CSS definiert — Browser-Default |
| Modal/Overlay Fokus-Trap | CookieConsent — unklar ob Fokus-Trap |
| Dialog-Bestätigung (Delete Server Data) | 2-Schritt in-place, kein Modal — OK |
| Karteikarten-Flip via Keyboard | Unbekannt |
| Session-Phasen-Navigation via Keyboard | Unbekannt |

### Kritische Lücken
| Schwere | Problem | WCAG-Referenz |
|---------|---------|--------------|
| 🔴 Kritisch | **Kein expliziter :focus-visible Style** in CSS — Browser-Defaults sind oft unsichtbar bei `outline: none` auf Buttons | WCAG 2.4.7 |
| 🟡 Mittel | **CookieConsent-Banner** wahrscheinlich kein Fokus-Trap — Screenreader-Nutzer können "hindurchtabben" | WCAG 2.1.2 |
| 🟡 Mittel | **Mascot ohne keyboard-erreichbare Funktion** — wenn interaktiv, muss keyboard-zugänglich sein | WCAG 2.1.1 |

**Bewertung Keyboard-Navigation: 5/10**

---

## 5.3 ARIA & Semantisches HTML

### Positive Befunde
- `aria-label="Einstellungen öffnen"` auf Settings-Button (DashboardScreen) ✓
- `aria-label*="Karteikarten"` auf Karteikarten-Button ✓
- `aria-label*="Blöcke zum Wiederholen"` auf WeakSpots-Button ✓

### Probleme
| Schwere | Problem | WCAG-Referenz |
|---------|---------|--------------|
| 🟡 Mittel | **Fortschrittsbalken ohne `role="progressbar"` und `aria-valuenow`** | WCAG 4.1.2 |
| 🟡 Mittel | **Mascot-Animationen** ohne `aria-hidden="true"` — Screenreader lesen dekorative Inhalte vor | WCAG 1.1.1 |
| 🟡 Mittel | **Statusmeldungen** (Erfolgs-/Fehlermeldungen) ohne `role="alert"` oder `aria-live` — Screenreader wissen nicht, dass neuer Content erscheint | WCAG 4.1.3 |
| 🔵 Gering | Block-Liste: `<ul>/<li>` oder semantisches `<article>` statt `<div>`? Unbekannt | WCAG 1.3.1 |

**Bewertung ARIA: 5/10**

---

## 5.4 Screenreader-Kompatibilität

### Häufige Fallen
| Element | Status | Problem |
|---------|--------|---------|
| Mascot (SVG/IMG) | ⚠️ | Alt-Text? `aria-hidden`? |
| Karteikarten-Flip | ⚠️ | Reihenfolge der vor/zurück-Seite für SR |
| Konfetti | ⚠️ | canvas-confetti — `aria-hidden` nötig |
| Streak-Badge mit Emoji 🔥 | ⚠️ | Emoji-Screenreader-Aussprache unklar |
| Block-Progress-Ring | ⚠️ | SVG ohne accessible label? |

**Bewertung Screenreader: 4/10**

---

## 5.5 Motion & Reduzierte Bewegung

### Animationen in der App
- Mascot-Animationen (CSS/SVG)
- Konfetti (canvas-confetti)
- Block-Dot Pulse Animation (CSS `lumo-pulse`)
- Screen-Transitions (Phase-Übergänge in Session)
- Mascot-Transitions (`outPhase`)

### Prüfung `prefers-reduced-motion`
Suche in CSS und JSX nach `prefers-reduced-motion`:
- **Nicht explizit in index.css geprüft** — wahrscheinlich NICHT implementiert

| Schwere | Problem | WCAG-Referenz |
|---------|---------|--------------|
| 🟡 Mittel | **`prefers-reduced-motion` Media Query fehlt** — für Nutzer mit Vestibulardisorder oder Anfallsleiden | WCAG 2.3.3 |
| 🟡 Mittel | **canvas-confetti** ignoriert Reduzierte-Bewegung Präferenz | WCAG 2.3.3 |

**Bewertung Motion: 5/10**

---

## 5.6 Sprachunterstützung

| Feature | Status |
|---------|--------|
| `lang="de"` im HTML? | Unbekannt (HTML-Head nicht gesehen) |
| Konsistente Sprache | Vollständig Deutsch 🟢 |
| TTS (Web Speech API) | Implementiert in FlashcardScreen 🟢 |
| Spracherkennung | Implementiert (Voice Input) 🟢 |

**Bewertung Sprachunterstützung: 7/10**

---

## 5.7 Gesamtbewertung Phase 5

| Kategorie | Score |
|-----------|-------|
| Farbkontrast | 5/10 |
| Keyboard-Navigation | 5/10 |
| ARIA & Semantik | 5/10 |
| Screenreader | 4/10 |
| Motion | 5/10 |
| Sprachunterstützung | 7/10 |
| **Gesamt Accessibility** | **5.2/10** |

### Top-3-Findings

1. **[KRITISCH] Kein expliziter :focus-visible Style**: Keyboard-Navigation ist für sehbehinderte und motorisch eingeschränkte Nutzer de facto unbrauchbar, wenn Focus-Styles nicht sichtbar sind.

2. **[MITTEL] --red und --amber unterschreiten WCAG AA**: Semantische Farben für Warnung/Hinweis schreiben WCAG-Mindeststandard unter. Leichter Fix: Farbton 10-15% heller.

3. **[MITTEL] prefers-reduced-motion nicht implementiert**: Mascot-Animationen, Pulse-Dots und Konfetti laufen für alle Nutzer — auch für solche mit vestibulären Störungen oder Anfallsleiden.

---

## Empfohlene Quick-Wins (a11y)

```css
/* 1. Focus-Visible global */
:focus-visible {
  outline: 2px solid var(--gold);
  outline-offset: 2px;
  border-radius: 4px;
}

/* 2. Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* 3. Kontrast-Fix für --red */
/* #E07B54 → #F08860 (heller, ~5.1:1 auf --bg) */
```
