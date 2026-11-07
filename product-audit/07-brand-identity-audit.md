# Phase 7 — Brand & Identity Audit
**Lumo — Dein Lernbegleiter**
Audit-Stand: 2026-11-06

---

## 7.1 Markenidentität-Analyse

### Brand-Kern
| Dimension | Ist-Zustand |
|-----------|-------------|
| Name | Lumo — lateinisch/finnisch für "Licht" |
| Tagline | "Dein Lernbegleiter" |
| Brand-Metapher | Begleiter/Freund, nicht Tool — warmherzig, persönlich |
| Visuelle Metapher | Mascot als Lichtwesen, Glow aus der Mitte |
| Tonalität | Ermutigung, keine Leistungsdruck |
| Zielgruppen-Signal | Studierende, explizit ADHS-aware |

### Brand-Stärken
- **Mascot** gibt der App eine Persönlichkeit — seltener und differenzierender Ansatz in EdTech
- **Warm-Dark-Ästhetik** (Lagerfeuer-Stimmung) unterscheidet sich von kühlem "Learning Management System"-Look
- **Gold als Licht-Metapher**: konsequent, bedeutungsreich (Erleuchtung, Erkenntnis)
- **"Lernbegleiter" statt "App"**: positiv besetzt, weniger Tool-Distanz

---

## 7.2 Mascot-Analyse

### Verwendung
| Screen | Mascot-State | Funktion |
|--------|-------------|---------|
| OnboardingScreen1 | — | Splash (Floating Tags, kein Mascot) |
| WelcomeBackScreen | idle/wave | Begrüßung, emotionale Wärme |
| DashboardScreen | Verschiedene States | Kontext-Reaktionen |
| ProjectsScreen | idle | Leerzustand |
| SessionScreen | — | Nicht im Session-Flow (Fokus) |

### Stärken
- Transitions implementiert (MascotTransition) ✓
- Verschiedene States (idle, excited, thinking, etc.) ✓
- Größenanpassung auf verschiedenen Screens ✓

### Schwächen
| Schwere | Problem |
|---------|---------|
| 🟡 Mittel | **Mascot-Reaktionen nicht konsistent**: Welcher State bei welchem Kontext? Kein dokumentiertes Mascot-State-System |
| 🟡 Mittel | **Mascot fehlt in Session**: Die intensivste Phase der App hat keinen emotionalen Anker — Fehlt eine Mascot-Reaktion auf richtige/falsche Antworten? |
| 🔵 Gering | **Mascot-Name?**: Hat das Wesen einen Namen? "Lumo" (der Mascot) = gleichnamig der App — potenzielle Verwechslung |

---

## 7.3 Typografische Markenidentität

### Fontauswahl als Brand-Signal
- **Instrument Serif Italic**: Warm, persönlich, literarisch — passt zur "Begleiter"-Metapher
- **System Font Body**: Pragmatisch, modern, vertraut
- **Nunito Wordmark**: Rund, freundlich, jugendlich

### Probleme
| Problem | Detail |
|---------|--------|
| Nunito nur für Wordmark | Warum Nunito? Passt es zu Instrument Serif? Kombination nicht dokumentiert |
| Instrument Serif nicht durchgehend | Nur bei `.screen-content h1` — in anderen Headlines fehlt die Serif-Wärme |
| Kein Typography-Manifest | Welche Schrift wofür? Nicht in CLAUDE.md, nicht im Design-System |

---

## 7.4 Sprache & Tonalität

### Copy-Analyse
| Element | Beispiel | Bewertung |
|---------|---------|---------|
| Mascot-Sprache | "Du hast genug für heute getan" | 🟢 Warm, bestärkend |
| CTA-Texte | "Los geht's", "Weiter", "Alle Blöcke" | 🟡 Funktional, wenig Brand-Voice |
| Fehlermeldungen | "Etwas ist schiefgelaufen" | 🔴 Generisch, kein Markenton |
| Lernabschluss | "Block abgeschlossen!" | 🟡 OK, aber ausbaufähig |
| Onboarding Chaos-Phase | "Kopf voll? Stoff zu viel?" | 🟢 Authentisch, treffend |
| Streaks | "🔥 3 Tage am Stück" | 🟢 Motivierend, gut |
| Schwachstellen | "Blöcke zum Wiederholen" | 🟡 Neutral, nicht besonders |

### Brand Voice Gap
Die App hat zwei Persönlichkeiten:
1. **Warm/persönlich**: Mascot-Texte, Onboarding-Sprache, Streak-Badges
2. **Generisch/funktional**: CTAs, Fehlermeldungen, Screen-Labels

Ein kohärentes Brand-Voice-System fehlt: Wann spricht Lumo-der-Mascot? Wann spricht die App neutral?

---

## 7.5 Visuelle Identität im Kontext (Market Fit)

### Konkurrenz-Einordnung
| App | Design-Sprache | Differenzierung zu Lumo |
|-----|---------------|------------------------|
| Anki | Utility, nüchtern | Lumo: emotional wärmer |
| Duolingo | Gamified, bunt | Lumo: ernsthafter, ruhiger |
| Notion | Clean, minimalist | Lumo: charaktervoller |
| Mochi | Dark-Minimal | Lumo: wärmer, goldener |
| RemNote | Academic, dense | Lumo: zugänglicher |

**Lumo-Position**: Einzige App mit warm-dark + Mascot + Gold-Glow + explizitem ADHS-Fokus.
Diese Kombination ist tatsächlich differenzierend — keine andere App im EdTech-Bereich belegt diesen Platz.

---

## 7.6 Brand-Konsistenz

### Wo die Brand stimmt
- WelcomeBack-Screen ✓ (Mascot + Gold + Instrument Serif)
- Onboarding S0 ✓ (Chaos-Screen, emotionale Headline)
- Streak-Badges ✓ (Gold, 🔥, motivierend)
- Dashboard-Glow ✓ (3-Layer Glow aktiv)

### Wo die Brand bricht
- Settings-Screen: Generic-Utility-Liste ohne Mascot, ohne Warm-Ton
- Error Boundary: "Etwas ist schiefgelaufen" — kein Mascot, kein Lumo-Ton
- ProjectsScreen: Liste ohne Stimmungsträger (außer Leerzustand)
- FlashcardScreen: Tab-Navigation wirkt wie externe App

---

## 7.7 Gesamtbewertung Phase 7

| Kategorie | Score |
|-----------|-------|
| Markenidentität-Kern | 8/10 |
| Mascot-System | 7/10 |
| Typografische Identität | 6/10 |
| Sprache & Tonalität | 6/10 |
| Differenzierung | 9/10 |
| Brand-Konsistenz | 6/10 |
| **Gesamt Brand** | **7.0/10** |

### Top-3-Findings

1. **[STÄRKE] Einzigartiger Marktplatz**: Lumos Warm-Dark + Mascot + ADHS-fokus hat keinen direkten Konkurrenten. Das ist echter Differenzierungswert — und muss geschützt werden.

2. **[MITTEL] Zwei Persönlichkeiten ohne Brücke**: Warm/emotional in Onboarding und WelcomeBack, generisch/kalt in Settings, Errors, und Labels. Ein Brand-Voice-System mit klaren Regeln fehlt.

3. **[MITTEL] Mascot fehlt in Schlüsselmomenten**: Session, Fehlerzustände, und Settings haben keinen Mascot-Kontext. Gerade bei Fehlern wäre der Mascot als emotionaler Puffer besonders wertvoll.
