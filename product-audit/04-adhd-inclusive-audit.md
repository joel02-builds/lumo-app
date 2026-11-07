# Phase 4 — ADHD-Inclusive Design Audit
**Lumo — Dein Lernbegleiter**
Audit-Stand: 2026-11-06

---

## Bewertungsrahmen

Basiert auf: Barkley (2015) ADHD Executive Function Model, Kessler et al. (2006) Epidemiologie, 
Brown (2013) ADHD Attention Dysregulation, Universal Design for Learning (UDL) Framework.

ADHD-Design-Prinzipien bewertet:
1. Exekutivfunktion-Unterstützung (Planung, Task Initiation, Working Memory)
2. Emotionsregulation (kein Trigger-Design, kein Straf-Muster)
3. Zeitwahrnehmung (Zeitblindheit-Kompensation)
4. Aufmerksamkeitssteuerung (Ablenkungsreduktion, Salienz)
5. Belohnungssystem (Dopamin-kompatible Motivation)

---

## 4.1 Exekutivfunktion-Unterstützung

### Task Initiation (Anfangen)
| Prinzip | Implementierung | Status |
|---------|----------------|--------|
| Niedriger Einstiegswiderstand | WelcomeBack CTA: "Los geht's" (1 Klick) | 🟢 Gut |
| Klare nächste Handlung | "Empfohlener Block" prominent in Dashboard | 🟢 Gut |
| Momentum erhalten | Demo-Material in Onboarding: Nutzer sehen sofort Ergebnis | 🟢 Gut |
| Keine Entscheidungsparalyse | Empfohlene Reihenfolge reduziert Auswahl-Stress | 🟢 Gut |

**Bewertung Task Initiation: 8/10** — Stärke der App

### Working Memory Entlastung
| Prinzip | Implementierung | Status |
|---------|----------------|--------|
| Externalisation (Auslagerung ins Interface) | Blöcke mit Status, Fortschrittsring | 🟢 Gut |
| Chunk-Strukturierung | Lernstoff in Blöcke geteilt | 🟢 Gut |
| Aktuelle Aufgabe hervorgehoben | "Aktueller Block" in Session | 🟢 Gut |
| Kontext nach Rückkehr | WelcomeBack-Screen zeigt letzten Stand | 🟡 Teilweise — kein "du warst bei..." |

**Bewertung Working Memory: 7/10**

### Planung & Prioritäten
| Prinzip | Implementierung | Status |
|---------|----------------|--------|
| Automatisch priorisierte Liste | recommendedOrder aus KI-Analyse | 🟢 Gut |
| Countdown bis Prüfung | "15 Tage bis zur Prüfung" | 🟢 Gut |
| Sprint-Modus bei kurzer Zeit | sprintMode bei ≤3 Tagen | 🟢 Gut |
| Realistische Zeitschätzung | Keine Zeitschätzung pro Block | 🔴 Fehlt |

**Bewertung Planung: 7/10**

---

## 4.2 Emotionsregulation

### Stärken (sehr stark!)
- **Kein Rot für Fehler** in Karteikarten-Bewertung: Amber statt Rot (kommentiert: "Barkley 2015: ADHS + Frustration")
- **"Keine Ahnung" als normaler Zustand**: Formulierung normalisiert Nicht-Wissen
- **Pause-ohne-Strafe** (WelcomeBack Abwesenheits-Adaption): keine Bestrafung bei Rückkehr nach Pause
- **Mascot als emotionaler Puffer**: Kein kaltes Dashboard-Interface
- **Positives Reframing**: Formulierungen fokussieren auf Fortschritt, nicht Versagen

### Probleme
| Schwere | Problem | Empfehlung |
|---------|---------|-----------|
| 🟡 Mittel | **Error Boundary "Etwas ist schiefgelaufen"**: Zu abstrakt, löst Verwirrung aus — ADHS-Nutzer neigen bei unklaren Fehlern zu Frustrations-Spiral | Konkrete Erklärung + einfacher Recovery-Schritt |
| 🟡 Mittel | **AnalyzingScreen Wartezeit** (30-60s): Keine Rückmeldung über Fortschritt — Wartezeit ohne Kontrolle ist für ADHS besonders schwierig | Schritt-für-Schritt-Progress |
| 🔵 Gering | **Streak-Verlust nach Ausfall**: Was passiert wenn Streak abbricht? Kein "Comeback"-Framing erkennbar | "Willkommen zurück, starte neuen Streak!" |

**Bewertung Emotionsregulation: 8/10** — Stärke der App

---

## 4.3 Zeitwahrnehmung (Zeitblindheit-Kompensation)

ADHS = chronische Zeitblindheit (Barkley 2015: "Jetzt vs. Nicht-Jetzt" Problem)

| Feature | Status |
|---------|--------|
| Countdown bis Prüfung | 🟢 Vorhanden |
| Streak-Counter | 🟢 Vorhanden (3-Tage-Streak) |
| Sprint-Modus | 🟢 Vorhanden |
| Zeitschätzung pro Block ("~20 Minuten") | 🔴 Fehlt |
| Sitzungsdauer-Anzeige ("Du lernst seit 12 Min.") | 🔴 Fehlt |
| "Wann war ich zuletzt hier?" | 🟡 Teilweise (WelcomeBack Abwesenheits-Nachricht) |
| Zeitzone/Tageszeit-Hinweis | 🟢 Vorhanden (getLernzeitHinweis()) |

**Bewertung Zeitwahrnehmung: 6/10**
Countdown + Streak gut. Aber keine Echtzeitanzeige innerhalb der Session ("wie lange bin ich schon?").

---

## 4.4 Aufmerksamkeitssteuerung

### Ablenkungsreduktion
| Feature | Status |
|---------|--------|
| Minimale chrome (kein Header mit vielen Icons) | 🟢 Gut |
| Single-Column-Layout | 🟢 Gut |
| FocusRitual vor Session | 🟢 Gut |
| Wenig Text auf einmal (Blöcke = Chunks) | 🟢 Gut |
| Animationen sparsam | 🟡 Teilweise — Mascot-Animationen + confetti können ablenken |
| Kein Banner/Notification-Noise während Session | 🟢 Gut (StorageWarning versteckt sich) |

### Salienz (Was ist wichtig?)
| Feature | Status |
|---------|--------|
| Gold = klickmich | 🟢 Konsequent |
| Glow auf aktivem Block | 🟢 Vorhanden |
| Pulsierender Dot auf in-progress Block | 🟢 Vorhanden |
| Mascot lenkt Blick | 🟢 Gut |

**Bewertung Aufmerksamkeitssteuerung: 8/10**

---

## 4.5 Belohnungssystem (Dopamin-Kompatibilität)

ADHS = chronische Unterstimulation des Belohnungssystems — variable Belohnungsrate >fixe (Barkley 2015)

| Feature | Status |
|---------|--------|
| Konfetti bei Block-Abschluss | 🟢 Gut |
| Streak-Counter (Tages-Belohnung) | 🟢 Gut |
| FSRS-Fortschritt sichtbar (Retention %) | 🟡 Vorhanden aber wenig betont |
| Fortschrittsbalken im Dashboard | 🟢 Gut |
| Keine Punktzahl/Gamification | 🟡 Bewusste Entscheidung — aber fehlt als Option |
| "Heute geschafft: 2 Blöcke" Zusammenfassung | 🟡 Teilweise in Session-Summary |

**Bewertung Belohnungssystem: 7/10**

---

## 4.6 Spezifische ADHS-Risiken

### Risiko-Assessment
| Risiko | Status | Bewertung |
|--------|--------|----------|
| Hyperfokus-Falle (Session endet nie) | Kein Session-Limit erkennbar | 🟡 Mittel-Risiko |
| Frustrations-Schwelle zu hoch | Amber statt Rot ✓ | 🟢 Gut behandelt |
| Information-Overload | Blöcke + Tabs + Navigation = komplex | 🟡 Mittel-Risiko |
| Initiierung scheitert ("ich schau kurz rein") | WelcomeBack CTA funktioniert | 🟢 Gut |
| Aufschiebe-Spiral bei Rückstand | Pause-ohne-Strafe ✓ | 🟢 Gut behandelt |

---

## 4.7 Gesamtbewertung Phase 4

| Kategorie | Score |
|-----------|-------|
| Task Initiation | 8/10 |
| Working Memory Entlastung | 7/10 |
| Emotionsregulation | 8/10 |
| Zeitwahrnehmung | 6/10 |
| Aufmerksamkeitssteuerung | 8/10 |
| Belohnungssystem | 7/10 |
| **Gesamt ADHD-Inclusive** | **7.3/10** |

### Top-3-Findings

1. **[STÄRKE] Emotionales Design**: Lumo hat ADHS-Triggers bewusst berücksichtigt (kein Alarm-Rot, Pause-ohne-Strafe, Mascot-Puffer). Das ist eine echte Differenzierung.

2. **[MITTEL] Fehlende Zeitwahrnehmungs-Unterstützung in Sessions**: "Wie lange bin ich schon hier?" und "Wie lange dauert dieser Block noch?" sind unbeantwortet. Für ADHS-Zeitblindheit kritisch.

3. **[MITTEL] AnalyzingScreen ohne Schritt-Feedback**: 30-60 Sekunden unkontrollierte Wartezeit sind für ADHS besonders problematisch (kein Feedback = "funktioniert das noch?").
