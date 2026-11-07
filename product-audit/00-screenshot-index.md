# Screenshot-Baseline Index
**Phase 0 — Visueller Ist-Zustand von Lumo**
Stand: 2026-11-06 — Vor dem Redesign

---

## Viewports

| Kürzel | Auflösung | Scale | Kontext |
|--------|-----------|-------|---------|
| `mobile` | 390×844 px | @2x | iPhone 14 / Standard-Mobile |
| `desktop` | 1440×900 px | @2x | MacBook Air / Standard-Desktop |
| `dark-mobile` | 390×844 px | @2x | iPhone Dark Mode |

---

## Screen-Verzeichnis

### Onboarding-Flow
| Datei | Beschreibung |
|-------|-------------|
| `mobile_01_onboarding-splash.png` / `desktop` | Splash-Screen: Mascot + "Kopf voll..." Hero |
| `mobile_ob_01_splash.png` | Onboarding Einstieg (floating tags) |
| `mobile_ob_02_enter-topic.png` | Schritt: Thema eingeben |
| `mobile_02_onboarding-step2.png` | Onboarding Schritt 2 |
| `mobile_03_onboarding-step3.png` | Onboarding Schritt 3 |

### Hauptscreens
| Datei | Beschreibung |
|-------|-------------|
| `mobile_04_welcome-back.png` / `desktop` | Welcome Back: Mascot + Streak + "Alle Blöcke" |
| `mobile_05_dashboard-blocks.png` / `desktop` | Dashboard: Blockliste + Fortschrittsbalken |
| `mobile_05b_dashboard-scrolled.png` | Dashboard gescrollt |
| `mobile_settings_01.png` / `desktop` | Einstellungen-Screen |
| `mobile_projects_01.png` / `desktop` | Projekte-Übersicht (3 Fächer) |

### Lernscreens
| Datei | Beschreibung |
|-------|-------------|
| `mobile_fc_01_list.png` / `desktop` | Karteikarten: Queue + Sortierung |
| `mobile_ws_01.png` / `desktop` | Lernstand (Weak Spots): Übersicht |
| `mobile_06_session-start.png` | Session-Start (Error Boundary sichtbar) |

### Dark Mode
| Datei | Beschreibung |
|-------|-------------|
| `dark-mobile_01_onboarding-splash.png` | Onboarding Dark |
| `dark-mobile_04_welcome-back.png` | Welcome Back Dark |
| `dark-mobile_05_dashboard-blocks.png` | Dashboard Dark |
| `dark-mobile_fc_01_list.png` | Karteikarten Dark |

---

## Visuelle Beobachtungen (Ist-Zustand)

### Farbpalette
```
Hintergrund:    #0A0806  (sehr dunkles Warm-Schwarz)
Elevated:       #141210
Cards:          #1A1612
Gold/Akzent:    #D4A843
Text Primary:   #F2EFE9  (Warm-Weiß)
Text Secondary: #8A9BAE  (Blaugrau — kühler Kontrast zur warmen Base)
Grün:           #3D9E6E
Rot/Orange:     #E07B54
```

### Typografie
- **System-Font** als Body (Inter → System-Default Fallback)
- **Instrument Serif** (Google Fonts) für emotionale Headlines (Onboarding, Mascot-Texte)
- **Nunito** (Google Fonts) geladen im HTML `<head>` — primärer Einsatz unklar
- Body: 16px, line-height 1.65, letter-spacing -0.01em
- h1/h2/h3: weight 800, letter-spacing -0.025em

### Layout
- Mobile-first, max-width 520px content — zentriert
- Desktop: gleiche 520px Spalte, großer ungenutzter Rand (viel Dead Space)
- Ein Breakpoint: `@media (min-width: 700px)` → max-width 560px
- Kein echtes Desktop-Layout (keine Sidebar, kein Grid)

### Design-Sprache
- Dark ambient mit goldenem Glow-System (3-Ebenen Radial-Gradienten)
- Mascot-Charakter als emotionales Herzstück
- Warmes, meditativen Ton ("Lernbegleiter" Metapher)
- Cards: `border-radius` prominent, `box-shadow` mit 45% Alpha
