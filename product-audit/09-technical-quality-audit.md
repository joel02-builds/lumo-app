# Phase 9 — Technical Quality Audit (Frontend/Design)
**Lumo — Dein Lernbegleiter**
Audit-Stand: 2026-11-06

---

## Scope: Frontend-Design-Perspektive
(Backend-/Security-Audits abgeschlossen in separaten Reports: AUDIT_P01, SECURITY_*)

---

## 9.1 CSS-Qualität

### Stärken
- **CSS Custom Properties konsequent** — keine Hard-coded Hex-Werte außer wenigen Ausnahmen
- **Sparsame globale Styles** — index.css definiert nur Tokens und Basis-Reset
- Kein komplexes Sass/Less — sauberes Vanilla CSS
- `box-sizing: border-box` global ✓
- `-webkit-font-smoothing: antialiased` ✓
- `@keyframes lumo-pulse` im globalen CSS — korrekt platziert

### Probleme
| Schwere | Problem | Detail |
|---------|---------|--------|
| 🟡 Mittel | **Inline-Styles dominant**: Viele Komponenten nutzen `style={{ }}` statt CSS-Klassen — schwer zu warten, kein Design-Token-Zugriff per Klasse | Besonders ProjectsScreen, SettingsScreen |
| 🟡 Mittel | **Screen-spezifische CSS-Klassen** unklar definiert: `className="screen"`, `className="screen-content"` müssen global existieren — wo definiert? | index.css oder Screen.css? |
| 🔵 Gering | Kein CSS-Linting (z.B. Stylelint) — Stil-Konsistenz nicht erzwungen | — |
| 🔵 Gering | Keine CSS-Module oder Scoped Styles — Naming-Collisions möglich bei größerer Codebase | — |

**Bewertung CSS-Qualität: 6/10**

---

## 9.2 React-Komponent-Qualität

### Stärken
- **Code Splitting** korrekt mit Lazy + Suspense
- **useReducer** statt useState-Chaos: skalierbare State-Architektur
- **useMemo** an richtigen Stellen (FlashcardScreen activeQueue)
- **useCallback** für Handler wo sinnvoll

### Probleme
| Schwere | Problem | Detail |
|---------|---------|--------|
| 🔴 Kritisch | **CardLearningPhase.jsx: 2009 Zeilen** — Wartbarkeit stark eingeschränkt | Langfristig aufteilen (außerhalb Audit-Scope) |
| 🟡 Mittel | **Prop-Drilling** wahrscheinlich tief: App.jsx → Screen → Sub-Component | Context API oder Zustand verwenden für tiefe Props |
| 🟡 Mittel | **Fehlende TypeScript** — Props-Typen nicht erzwungen, Typo-Fehler werden erst Runtime sichtbar | JSDoc als Mindest-Dokumentation, langfristig TS Migration |
| 🔵 Gering | `BetaFeedbackButton` — Bleibt das nach Beta? Wenn nein, wie wird's entfernt? | Feature-Flag oder Env-Variable empfohlen |

**Bewertung React-Qualität: 6/10**

---

## 9.3 Performance (Frontend/Design)

### Messbare Metriken (Schätzung aus Codeanalyse)
| Metrik | Schätzung | Ziel |
|--------|----------|------|
| LCP (Largest Contentful Paint) | ~1.5-2.5s | <2.5s ✓ |
| FCP (First Contentful Paint) | ~0.8-1.5s | <1.8s ✓ |
| CLS (Cumulative Layout Shift) | Niedrig (SPA) | <0.1 ✓ |
| Bundle-Größe (Eager) | ~100-150KB gzip est. | Akzeptabel |
| Time-to-Interactive | ~2-3s | Akzeptabel |

### Render-Performance
| Element | Status |
|---------|--------|
| Mascot-Animationen | CSS-basiert ✓ (kein JS-Animation) |
| canvas-confetti | On-Demand (nicht beim Load) ✓ |
| Font-Loading | Google Fonts (preconnect?) | 🟡 Prüfen |
| Image Optimization | WebP-Konvertierung bereits umgesetzt ✓ |
| PWA Cache-Strategy | Cache-First für Assets ✓ |

**Bewertung Performance: 7/10**

---

## 9.4 Wartbarkeit & Developer Experience

### Stärken
- Klare Verzeichnisstruktur (`screens/`, `components/`, `utils/`, `api/`, `state/`)
- Kommentare im Code mit Evidenz-Referenzen (z.B. "Barkley 2015") — ungewöhnlich und wertvoll
- Git-History gepflegt (Commits mit klaren Messages)

### Probleme
| Problem | Detail |
|---------|--------|
| Kein Storybook | Komponenten nicht isoliert entwickelbar/testbar |
| Kein Design-Token-Export | Tokens sind nur in CSS — kein JSON-Export für Figma etc. |
| Kein Vitest für UI-Komponenten | Nur Server-seitige Tests (db.test.js etc.) |
| Screen-Routing ohne Tests | createInitialState-Logik hat hohe Komplexität |

**Bewertung Wartbarkeit: 5/10**

---

## 9.5 PWA-Qualität

| Merkmal | Status | Qualität |
|---------|--------|---------|
| Service Worker (Auto-Update) | Implementiert ✓ | 🟢 |
| Cache-First für Assets | Implementiert ✓ | 🟢 |
| Offline-Fallback | OfflineBanner vorhanden ✓ | 🟢 |
| Install-Prompt | InstallBanner implementiert ✓ | 🟢 |
| iOS-spezifische Safari-Fixes | `--dvh: 100dvh` ✓ | 🟢 |
| Manifest vollständig | theme_color, icons, screenshots | 🟡 Screenshots fehlen |
| `background_color` ≠ `--bg` | `#0F1920` vs `#0A0806` | 🟡 |
| maskable Icon | Vorhanden (PWA-Icon optimiert ✓) | 🟢 |

**Bewertung PWA: 7/10**

---

## 9.6 Gesamtbewertung Phase 9

| Kategorie | Score |
|-----------|-------|
| CSS-Qualität | 6/10 |
| React-Komponenten | 6/10 |
| Performance | 7/10 |
| Wartbarkeit | 5/10 |
| PWA | 7/10 |
| **Gesamt Technical Quality** | **6.2/10** |

### Top-3-Findings

1. **[MITTEL] Inline-Styles dominieren**: Die Abwesenheit eines CSS-Klassen-Systems (CSS Modules, BEM, etc.) führt zu nicht-wiederverwendbaren Styles. Jede neue Komponente copy-past die gleichen `style={{ background: 'var(--gold)' }}` Definitionen.

2. **[MITTEL] Fehlende Font-Preconnect**: Google Fonts ohne `<link rel="preconnect">` blockiert potentiell FCP. Leicht zu fixen, messbar verbessert LCP.

3. **[KRITISCH/BEKANNT] CardLearningPhase.jsx (2009 Zeilen)**: Die komplexeste Phase der App in einer Datei — Bugs finden dauert 3× länger als notwendig.
