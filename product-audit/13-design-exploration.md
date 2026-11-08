# Phase 11 — Design Exploration
**Lumo — Dein Lernbegleiter**
Visuelle Richtungen: 10 Konzepte A–J mit Bewertung und Empfehlung
Stand: 2026-11-07

---

## Überblick

Im Rahmen des Audits wurden 10 visuelle Richtungen entwickelt, die alle:
1. Wissenschaftlich begründet sind (kognitionspsychologische oder neurowissenschaftliche Basis)
2. Für unterschiedliche ADHS-Subtypen und Lernkontexte geeignet sind
3. Als interaktive HTML-Prototypen mit Dashboard + Karteikarten-Mockups vorliegen
4. Nie die bestehende Produktions-App berühren (isolierte Prototypen)

**Prototypen-Links:**
- Konzepte A–C: `https://claude.ai/artifact/LfRSqiKAK3ik56cwxP1ipP`
- Konzepte D–F: `https://claude.ai/artifact/T7B2qvgs82JMpbNAGeE5MT`
- Konzepte G–J: `https://claude.ai/artifact/DKCJuidT84gynzdK74WMnk`

---

## Bewertungsrahmen

Jede Richtung wird bewertet nach:

| Kriterium | Beschreibung |
|-----------|-------------|
| **Visuelle Qualität** | Kohärenz, Distinktheit, Finish-Level |
| **Brand Fit** | Passt zur Lernbegleiter-Metapher und ADHS-Mission |
| **ADHS-Eignung** | Welche Subtypen profitieren? |
| **Accessibility** | Kontrast, Lesbarkeit, Low-Stimulation |
| **Skalierbarkeit** | Kann das System mit neuen Features wachsen? |
| **Technische Machbarkeit** | Aufwand der Migration |
| **Wissenschaftliche Grundlage** | Stärke der Evidenz |

---

## Konzept A — Refined Warmth (Variante der aktuellen Richtung)

### Tokens
| Token | Wert |
|-------|------|
| Background | `#0A0806` |
| Accent | `#D4A843` (Gold) |
| Text Primary | `#F2EFE9` |
| Text Secondary | `#8A9690` (thermisch korrigiert) |
| Success | `#4A9B6F` |
| Warning | `#D48A3A` |

### Typografie
Instrument Serif (Headlines) + System Font (UI)

### Beschreibung
Die aktuelle Lumo-Palette, thermisch korrigiert und mit besserem Kontrast. Keine grundlegende Richtungsänderung — stattdessen Verfeinerung und Bugfixing des bestehenden Systems. Warm-Dark bleibt die Basis.

### Bewertung

| Kriterium | Score | Begründung |
|-----------|-------|------------|
| Visuelle Qualität | 7.5/10 | Distinkt, warm, wiedererkennbar — aber durch Bugs derzeit unter Potential |
| Brand Fit | 9/10 | Perfekter Fit: Lernbegleiter, Ruhe, Vertrauen |
| ADHS-Eignung | 8/10 | Warm-Dark reduziert Blaulicht; Gold als Erfolgs-Signal klar |
| Accessibility | 7/10 | Nach Kontrast-Fix: AA-compliant. Bleibt Dark-Mode-only |
| Skalierbarkeit | 8/10 | Token-System vorhanden, ausbaubar |
| Technische Machbarkeit | 10/10 | Null Migration-Aufwand |
| Wissenschaftliche Basis | 7/10 | Warm-Dark reduziert Blaulicht (Brainard 2001) |

**Gesamtscore: 8.1/10**

---

## Konzept B — Cosmic Study

### Tokens
| Token | Wert |
|-------|------|
| Background | `#07080F` |
| Accent | `#E8C87A` (Lemon-Gold) |
| Text Primary | `#EDF2FF` |
| Text Secondary | `#6677AA` |
| Highlight | `#9B59C5` (Lila, sparsam) |

### Typografie
Instrument Serif (Headlines) + Inter (UI)

### Beschreibung
Cool-Dark mit einem Hauch Weltraum-Ästhetik. Lemon-Gold statt Warmgold, kühles Blau als Muted Color. Funktioniert gut für Nachtstudenten mit Affinität zu Technologie.

### Bewertung

| Kriterium | Score | Begründung |
|-----------|-------|------------|
| Visuelle Qualität | 7/10 | Interessant, aber weniger originär in EdTech |
| Brand Fit | 6/10 | Lernbegleiter-Metapher kühler, weniger fürsorglich |
| ADHS-Eignung | 6.5/10 | Weniger warm = weniger emotional regulierend |
| Accessibility | 7.5/10 | Gute Kontraste, cool-tone Text klarer |
| Skalierbarkeit | 8/10 | Klares System |
| Technische Machbarkeit | 9/10 | Nur Token-Änderungen |
| Wissenschaftliche Basis | 5/10 | Keine spezifische Evidenz |

**Gesamtscore: 7.0/10**

---

## Konzept C — Amber Candlelight

### Tokens
| Token | Wert |
|-------|------|
| Background | `#100C07` |
| Accent | `#E8A040` (Bernstein) |
| Text Primary | `#F5EFE0` (Cremeweiß) |
| Text Secondary | `#8A7060` |

### Typografie
Instrument Serif (Headlines) + Nunito (UI)

### Beschreibung
Stärker als Refined Warmth in Richtung Kerzenlicht-Wärme. Höherer Rotanteil im Background, Cremeweiß statt Reinweiß als Textfarbe. Extrem warm und beruhigend — aber näher an "Buch" als "App".

### Bewertung

| Kriterium | Score | Begründung |
|-----------|-------|------------|
| Visuelle Qualität | 7/10 | Schön, aber fast zu warm für App-Kontext |
| Brand Fit | 7.5/10 | Lernbegleiter-Metapher gut — aber E-Book-Assoziation |
| ADHS-Eignung | 8.5/10 | Maximal beruhigend für Angst-Subtypen |
| Accessibility | 6.5/10 | Cremeweiß-auf-Dunkelbraun: Kontrast grenzwertig |
| Skalierbarkeit | 7/10 | Eingeschränkter für Data-Visualisierung |
| Technische Machbarkeit | 9/10 | Token-Änderungen |
| Wissenschaftliche Basis | 7/10 | Warme Farben reduzieren Cortisol (Küller 2006) |

**Gesamtscore: 7.4/10**

---

## Konzept D — Sage Grove

### Tokens
| Token | Wert |
|-------|------|
| Background | `#060D08` |
| Accent | `#7EC8A0` (Salbeigrün) |
| Text Primary | `#EAE8E2` |
| Text Secondary | `#527060` |

### Typografie
Instrument Serif (Headlines) + Inter (UI)

### Beschreibung
Natur-Dark mit Salbeigrün als Akzent statt Gold. Wissenschaftliche Basis: Grün reduziert Stress und fördert Erholung (Ulrich, 1983). Alternative für Nutzer die Gold als "leistungsbezogen" empfinden.

### Bewertung

| Kriterium | Score | Begründung |
|-----------|-------|------------|
| Visuelle Qualität | 7.5/10 | Distinkt, ruhig, originell für EdTech |
| Brand Fit | 6.5/10 | Weniger "Lernbegleiter", mehr "Wellness App" |
| ADHS-Eignung | 7.5/10 | Stress-reduzierende Wirkung von Grün belegt |
| Accessibility | 7.5/10 | Salbeigrün auf Dark: gute Kontrastwerte |
| Skalierbarkeit | 7.5/10 | Grün als Akzent skaliert gut |
| Technische Machbarkeit | 9/10 | Token-Änderungen |
| Wissenschaftliche Basis | 7/10 | Ulrich, 1983: Natur-Visualisierung reduziert Stress |

**Gesamtscore: 7.4/10**

---

## Konzept E — Paper Study

### Tokens
| Token | Wert |
|-------|------|
| Background | `#F4F0E8` (Pergament) |
| Accent | `#3B5B8A` (Schieferblau) |
| Text Primary | `#1A1510` |
| Text Secondary | `#8A806A` |

### Typografie
DM Serif Display (Headlines) + Inter (UI)

### Beschreibung
Hell-Modus. Akademische Pappkarton-Ästhetik. Für die 30–40 % der ADHS-Nutzer, die mit Dark Mode Augenstrain erleben. Warmes Pergament statt Standard-Weiß.

### Bewertung

| Kriterium | Score | Begründung |
|-----------|-------|------------|
| Visuelle Qualität | 7.5/10 | Eigenständig, akademisch, poliert |
| Brand Fit | 7/10 | "Studium" gut getroffen, aber weniger modern |
| ADHS-Eignung | 7/10 | Für Light-Mode-Nutzer, weniger für DSPS-Nachtlerner |
| Accessibility | 8.5/10 | Light Mode: Kontrastvorteile, weniger Blendung-Risiko |
| Skalierbarkeit | 8/10 | Klares akademisches System |
| Technische Machbarkeit | 7/10 | Vollständiger Themenwechsel nötig |
| Wissenschaftliche Basis | 7/10 | Farley 2021: 30–40 % mit Dark Mode Augenstrain |

**Gesamtscore: 7.6/10**

---

## Konzept F — Stark Signal

### Tokens
| Token | Wert |
|-------|------|
| Background | `#050505` |
| Accent | `#FF6040` (Korall) |
| Text Primary | `#F5F5F5` |
| Text Secondary | `#555555` |

### Typografie
Inter 800 (Headlines) + Inter (UI)

### Beschreibung
Brutalist-Dark. Maximaler Kontrast, keine Decoration, Anti-Gamification. Für fokussierte Nutzer die keine emotionale Sprache wollen.

### Bewertung

| Kriterium | Score | Begründung |
|-----------|-------|------------|
| Visuelle Qualität | 6.5/10 | Mutig aber kalt |
| Brand Fit | 4/10 | Lernbegleiter = fürsorglich. Stark = das Gegenteil |
| ADHS-Eignung | 5/10 | Fehlende emotionale Wärme kontraproduktiv für Angst-Subtypen |
| Accessibility | 8/10 | Kontrast ausgezeichnet |
| Skalierbarkeit | 7/10 | Simpel, robust |
| Technische Machbarkeit | 9/10 | Token-Änderungen |
| Wissenschaftliche Basis | 5/10 | Wenig ADHS-spezifische Evidenz |

**Gesamtscore: 5.8/10**

---

## Konzept G — Dusk Protocol

### Tokens
| Token | Wert |
|-------|------|
| Background | `#09050A` |
| Accent | `#E87828` (Warmorange) |
| Text Primary | `#EDE4D6` |
| Text Secondary | `#9A7A5A` |

### Typografie
Instrument Serif (Headlines) + Inter (UI)

### Wissenschaftliche Basis
- Bijlenga et al. (2019): 73 % der ADHS-Erwachsenen haben Delayed Sleep Phase Syndrome
- Brainard et al. (2001): Warme Töne minimieren Blaulicht-Melatonin-Hemmung
- Czeisler et al. (1999): Zirkadiane Dysregulation bei ADHS

### Beschreibung
Chronobiologisch informiertes Design. Warmorange statt Gold, noch wärmer als Refined Warmth. Konzipiert für den ADHS-typischen Abendlernzeitraum 20–23 Uhr.

### Bewertung

| Kriterium | Score | Begründung |
|-----------|-------|------------|
| Visuelle Qualität | 8/10 | Warm, distinkt, ikonisch für Abend-Kontext |
| Brand Fit | 8/10 | Passt zur Lernbegleiter-Metapher — sogar stärker durch Chronobio-Dimension |
| ADHS-Eignung | 9/10 | DSPS-Subtyp explizit adressiert — keine andere App tut das |
| Accessibility | 7.5/10 | Orange auf Fast-Schwarz: 4.6:1 — knapp AA |
| Skalierbarkeit | 8/10 | Orange-System skaliert gut, Tagversion vorstellbar |
| Technische Machbarkeit | 9/10 | Token-Änderungen + Tageszeit-Logic |
| Wissenschaftliche Basis | **9/10** | Stärkste Evidenz aller 10 Konzepte |

**Gesamtscore: 8.4/10**

---

## Konzept H — Mineral

### Tokens
| Token | Wert |
|-------|------|
| Background | `#0D0D0F` |
| Accent | `#6BA8C0` (Stahlblau) |
| Text Primary | `#D8D9DF` |
| Text Secondary | `#70707A` |

### Typografie
JetBrains Mono (Daten) + Inter (UI)

### Wissenschaftliche Basis
- Liss et al. (2005): ~40 % der ADHS-Fälle mit Sensory Processing Sensitivity
- Marco et al. (2011): Saturierte Farben triggern sensorische Überlastung bei SPS

### Beschreibung
Nahezu achromatisches Design für sensorisch empfindliche ADHS-Subtypen. Farbe nur als Zustandssignal, nicht als Dekoration.

### Bewertung

| Kriterium | Score | Begründung |
|-----------|-------|------------|
| Visuelle Qualität | 7/10 | Minimal, aber diszipliniert — kein EdTech macht das |
| Brand Fit | 5.5/10 | Wenig emotionale Wärme — Lernbegleiter-Metapher schwächer |
| ADHS-Eignung | 8/10 | Für SPS-Subtypen ausgezeichnet |
| Accessibility | 8.5/10 | Monochrom = natürlich AA-compliant |
| Skalierbarkeit | 8.5/10 | Monochrom skaliert sehr gut |
| Technische Machbarkeit | 9/10 | Token-Änderungen |
| Wissenschaftliche Basis | 7/10 | SPS-ADHS-Korrelation mittelstark belegt |

**Gesamtscore: 7.6/10**

---

## Konzept I — Bauhaus Workshop

### Tokens
| Token | Wert |
|-------|------|
| Background | `#EAE5DB` (Warmgrau, hell) |
| Accent | `#B8622A` (Rost) |
| Text Primary | `#1A1510` |
| Text Secondary | `#9A8A78` |

### Typografie
Space Grotesk 700 (Headlines) + Inter (UI)

### Wissenschaftliche Basis
- Wilson (2002): Embodied Cognition — Handwerk-Metaphern aktivieren andere kognitive Schemas
- Sirois (2014): Craft vs. Performance Frame reduziert Performance-Angst
- Farley (2021): 30–40 % der ADHS-Nutzer mit Dark Mode Augenstrain

### Beschreibung
Warm-Light-Modus mit Handwerk-Metapher. "Werkzeuge meistern" statt "Tests bestehen". Für Performance-Angst-Subtypen.

### Bewertung

| Kriterium | Score | Begründung |
|-----------|-------|------------|
| Visuelle Qualität | 8/10 | Eigenständig, professionell, Bauhaus-Referenz stark |
| Brand Fit | 7.5/10 | Craft-Metapher ergänzt Lernbegleiter gut |
| ADHS-Eignung | 7.5/10 | Performance-Angst-Subtyp gut adressiert |
| Accessibility | 8.5/10 | Light Mode: exzellente Kontraste |
| Skalierbarkeit | 8/10 | Klares System, hell + dunkel denkbar |
| Technische Machbarkeit | 7/10 | Vollständiger Themenwechsel nötig |
| Wissenschaftliche Basis | 7.5/10 | Embodied Cognition mittelstark belegt |

**Gesamtscore: 7.9/10**

---

## Konzept J — Deep Signal

### Tokens
| Token | Wert |
|-------|------|
| Background | `#030508` |
| Accent | `#00CEDE` (Cyan) |
| Text Primary | `#E8EEF8` |
| Text Secondary | `#58637A` |

### Typografie
Space Grotesk 800 (Headlines) + JetBrains Mono (Daten) + Inter (UI)

### Wissenschaftliche Basis
- Zentall (1983): Optimal Stimulation Theory — ADHS = chronische Unter-Erregung
- Sikström & Söderlund (2007): Unter-Erregungssubtyp sucht sensorischen Input
- **Schwache Evidenz:** Küller et al. (2006): Cyan-Wavelengths mit kognitiver Alertheit assoziiert

### Beschreibung
Maximum-Kontrast-Dark für den Unter-Erregungssubtyp. Elektrisches Cyan. Wichtige Warnung: Die Cyan-Alertness-Hypothese ist schwach repliziert.

### Bewertung

| Kriterium | Score | Begründung |
|-----------|-------|------------|
| Visuelle Qualität | 7.5/10 | Visuell stark — aber schmales Nutzersegment |
| Brand Fit | 5/10 | "Fürsorglich" vs. "Signal": deutlicher Konflikt |
| ADHS-Eignung | 6.5/10 | Nur für Unter-Erregungssubtyp geeignet |
| Accessibility | 8/10 | Cyan auf Fast-Schwarz: exzellenter Kontrast |
| Skalierbarkeit | 7/10 | Neon-System eingeschränkter für subtile UI-Zustände |
| Technische Machbarkeit | 9/10 | Token-Änderungen |
| Wissenschaftliche Basis | 5/10 | Cyan-Hypothese schwach — explizit gekennzeichnet |

**Gesamtscore: 6.6/10**

---

## Gesamtranking

| Rang | Konzept | Score | Besonderheit |
|------|---------|-------|-------------|
| 1 | **G — Dusk Protocol** | **8.4/10** | Stärkste Evidenz, chronobiologisch einzigartig |
| 2 | **A — Refined Warmth** | **8.1/10** | Beste Brand-Fit, geringster Aufwand |
| 3 | **I — Bauhaus Workshop** | **7.9/10** | Stark für Light-Mode + Craft-Metapher |
| 4 | **E — Paper Study** | **7.6/10** | Light-Mode, akademisch |
| 5 | **H — Mineral** | **7.6/10** | SPS-Subtyp, minimalistisch |
| 6 | **C — Amber Candlelight** | **7.4/10** | Warm, beruhigend |
| 7 | **D — Sage Grove** | **7.4/10** | Natur-Metapher, weniger Brand-Fit |
| 8 | **B — Cosmic Study** | **7.0/10** | Cool-Dark, weniger distinkt |
| 9 | **J — Deep Signal** | **6.6/10** | Schwache Evidenz, kleines Segment |
| 10 | **F — Stark Signal** | **5.8/10** | Zu kalt für ADHS-Lernbegleiter |

---

## Empfehlung

### Primäre Empfehlung: Hybride Strategie

Anstelle eines einzelnen Konzepts empfehle ich eine **Mode-basierte Architektur**, die auf starker Evidenz aufbaut:

#### Basis: Konzept A (Refined Warmth) als Standard
Die aktuelle Lumo-Palette ist nicht falsch — sie hat Bugs. Nach Kontrast-Fix, thermischer Korrektur und Focus-Visible ist sie eine solide Basis.

**Begründung:** Null Migration-Aufwand. Existierende Brand-Equity nicht verspielen. Nutzer kennen die Palette bereits.

#### Erweiterung 1: Dusk Mode (Konzept G)
Ein optionaler Abend-Modus, der bei Sonnenuntergang automatisch aktiviert wird. Warmorange statt Gold, noch wärmere BG-Farbe.

**Begründung:** 73 % der ADHS-Erwachsenen haben DSPS. Kein Konkurrent adressiert das. Einzigartiges Feature mit starker wissenschaftlicher Basis.

#### Erweiterung 2: Light Mode (Konzept I oder E)
Ein optionaler Hell-Modus für die 30–40 % mit Dark-Mode-Augenstrain.

**Begründung:** Accessibility-Anforderung. Bauhaus Workshop (I) als eigenständigere visuelle Sprache empfohlen.

### Implementierungs-Reihenfolge
1. **Phase 1 (Sprint 1):** Konzept A — Quick Fixes im bestehenden System
2. **Phase 2 (Sprint 3):** Dusk Mode — Mode-Switching-Architektur + Warmorange Tokens
3. **Phase 3 (Sprint 4):** Light Mode — Bauhaus Workshop als dritte Option

### Was nicht empfohlen wird
- Stark Signal (F), Deep Signal (J): Zu wenig Brand-Fit für Lernbegleiter-Metapher
- Direkter Komplettaustausch der aktuellen Palette: Unnötiger Aufwand, kein signifikanter Vorteil gegenüber Refined Warmth + Bugfixes

---

## Wichtiger Vorbehalt

**Diese Empfehlung ist evidenzbasiert, aber nicht validiert.**

Ohne User-Testing mit tatsächlichen ADHS-Studierenden bleiben alle Richtungsentscheidungen Hypothesen. Priorität vor jeder visuellen Änderung:

1. Guerilla-Usability-Tests mit 5–8 ADHS-Studierenden
2. Preference-Testing: A/B-Vergleich Konzept A vs. G
3. Heatmap/Session-Recording nach erstem Release-Update

**Keine Richtung ist "ADHS-freundlich" ohne Nutzer-Validierung.**

---

*Dieses Dokument schließt Phase 11 des Master-Audits ab. Alle Prototypen sind als isolierte HTML-Artefakte verfügbar und haben die Produktions-App nicht berührt.*
