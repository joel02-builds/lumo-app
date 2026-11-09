# Lumo Pre-Launch Audit — Abschlussbericht (v3)

**Datum:** 2026-11-08 (v3 — Zwei-Stand-Bewertung, Live-Evidenz)  
**Auditor:** Claude Sonnet 4.6 (Phasen A–F, Lighthouse, axe-core, Live-Verifikation)  
**Findings:** 27 Befunde (F001–F027) · 25 CONFIRMED · 2 PLAUSIBLE  
**v3 gegenüber v2:** Zwei Stände bewertet (Live-Stand vs. Arbeitsstand); F023–F027 aus Live-Evidenz; Bereiche 4 und 12 als „nicht bewertet"; Schnitt nur über bewertete Bereiche.

---

## Kurzurteil

| Stand | Verdict | Begründung |
|-------|---------|------------|
| **Live-Stand** (deployed Render) | 🔴 **HARD NO-GO** | F023 (S1): Alle Security-Header fehlen im deployed Code. Render läuft noch auf Commit vom 2. Nov. — 15+ Commits hinter origin/main. |
| **Arbeitsstand** (lokal, inkl. P01) | 🟡 **CONDITIONAL NO-GO** | Keine S1-Befunde; 7 offene S2-Befunde in Sicherheit, Datenschutz, UX und Betrieb. Launch nach gezielten Fixes möglich. |

**Kritischer Pfad:** Render-Redeploy auf aktuellen Stand (origin/main HEAD `395d3e0` oder später) → Live-Stand wird Arbeitsstand-equivalent → HARD NO-GO wird CONDITIONAL NO-GO. Danach: S2-Befunde adressieren.

---

## Methodik

**Formel:** `100 − Σ Abzüge` je Bereich; S1 = 12 Pkt., S2 = 5 Pkt., S3 = 1,5 Pkt.; **nur CONFIRMED-Befunde zählen.**

**PLAUSIBLE-Befunde** fließen nicht in die Score-Berechnung ein (erscheinen mit `0` Abzug).

**„Nicht bewertet"** = Bereich wurde nicht ausreichend gemessen; kein Score, kein Abzug. Der Gesamtschnitt wird nur über bewertete Bereiche berechnet.

**Stands:**
- **Live-Stand** = auf Render deployte Version (Bundle-Timestamp 2026-11-02 20:36 UTC, Commit ~53cb6809/560a864)
- **Arbeitsstand** = lokal, inkl. P01-Änderungen (server/index.js mit Helmet, appReducer.js mit BATCH_UPDATE)

---

## Auftrag a — Root-Cause der fehlenden Live-Header

### Untersuchungsergebnis

```
Bundle last-modified:  2026-11-02 20:36 UTC
Matching commit:       53cb6809 (2026-11-02 21:36:20 +0100 = 20:36:20 UTC)
Helmet hinzugefügt:    32db339  (2026-11-04 19:26 +0100)
Lücke:                 ~47 Stunden / 15+ Commits
```

**Schritt-für-Schritt:**

1. `git show 53cb6809:server/index.js | head -15` → `import express, cors, cookieParser, rateLimit, Anthropic` — kein Helmet-Import.
2. `git log --follow -S 'app.use(helmet' -- server/index.js` → erster Treffer: `32db339` (4. Nov.).
3. `render.yaml`: `NODE_ENV=production` gesetzt; keine `RAILWAY_*`-Variablen → `IS_RAILWAY=false`, aber `isProd=true`.
4. Konsequenz: Auch `isProd=true` hilft nicht — der Code kennt `helmet` schlicht nicht.

**Warum nicht IS_RAILWAY?** Diese Hypothese wurde verworfen. Render setzt `NODE_ENV=production` explizit, also `isProd=true`. Selbst wenn `isProd=false` wäre, würden die meisten Helmet-Header (CSP, X-Frame-Options etc.) gesetzt — nur HSTS nicht. Das `x-powered-by: Express` als gesetzter Header zeigt eindeutig, dass Helmet gar nicht läuft.

**Fix:** `git push origin main` (oder Render-Manual-Deploy triggern) — kein Codefix nötig, der Code ist korrekt im Arbeitsstand.

---

## Auftrag b — Zwei Stände bewertet

### Scoring-Tabelle

| Nr | Bereich | Live-Stand | Formel Live | Arbeitsstand | Formel Arbeitsstand |
|----|---------|-----------|-------------|-------------|---------------------|
| 1 | Engineering | **98,5** | 100 − 1,5 (F011) | **98,5** | 100 − 1,5 (F011) |
| 2 | QA und Funktion | **95** | 100 − 5 (F003) | **95** | 100 − 5 (F003) |
| 3 | Produktdesign und UX | **83,5** | 100 − 1,5 − 5 − 5 − 5 | **83,5** | 100 − 1,5 − 5 − 5 − 5 |
| 4 | KI-Pipeline | _nicht bewertet_ | — | _nicht bewertet_ | — |
| 5 | Sicherheit | **75** | 100 − 12 − 5 − 5 − 1,5 − 1,5 | **85,5** | 100 − 5 − 5 − 1,5 − 1,5 − 1,5 |
| 6 | Datenschutz und Recht | **80** | 100 − 5 − 5 − 5 − 5 | **80** | 100 − 5 − 5 − 5 − 5 |
| 7 | Performance | **92** | 100 − 1,5 − 5 − 1,5 | **92** | 100 − 1,5 − 5 − 1,5 |
| 8 | Lernwirksamkeit | **93,5** | 100 − 1,5 − 5 | **93,5** | 100 − 1,5 − 5 |
| 9 | Barrierefreiheit | **93,5** | 100 − 1,5 − 5 | **93,5** | 100 − 1,5 − 5 |
| 10 | Plattform und PWA | **98,5** | 100 − 1,5 (F010) | **98,5** | 100 − 1,5 (F010) |
| 11 | Betrieb und Release | **95** | 100 − 5 (F016) | **95** | 100 − 5 (F016) |
| 12 | Produkt | _nicht bewertet_ | — | _nicht bewertet_ | — |
| | **Schnitt (10 Bereiche)** | **90,5** | | **91,6** | |

**Rechenweg Schnitt:**

- Live-Stand: (98,5 + 95 + 83,5 + 75 + 80 + 92 + 93,5 + 93,5 + 98,5 + 95) / 10 = 905,0 / 10 = **90,5**
- Arbeitsstand: (98,5 + 95 + 83,5 + 85,5 + 80 + 92 + 93,5 + 93,5 + 98,5 + 95) / 10 = 915,5 / 10 = **91,55 ≈ 91,6**

### Unterschied zwischen den Ständen

Der Unterschied liegt vollständig in Bereich 5 (Sicherheit):

| | Live-Stand | Arbeitsstand | Differenz |
|--|-----------|-------------|-----------|
| Bereich 5 Sicherheit | 75 | 85,5 | −10,5 |
| F023 (S1, alle Header fehlen) | ✗ zählt (−12) | ✓ nicht vorhanden | |
| F019 (S3, Permissions-Policy) | subsumiert durch F023 | ✗ zählt (−1,5) | |
| F001, F002, F008, F014 | gleich | gleich | |

Ein einziger Render-Redeploy beseitigt den S1-Befund und hebt den Live-Stand auf Arbeitsstand-Niveau.

---

## Auftrag c — „Nicht bewertet" für KI-Pipeline und Produkt

Bereiche ohne ausreichende Messung erhalten keinen Score und keinen Default-Wert von 100.

| Bereich | Grund | Konsequenz |
|---------|-------|------------|
| **4 KI-Pipeline** | Golden Set ≥20 Materialien nicht durchführbar (kein ANTHROPIC_API_KEY in Sandbox); Latenz-p50/p95 nicht messbar (Proxy 403 CONNECT). Prompt-Review vollständig, aber Output-Qualität nicht systematisch evaluiert. | Score = _nicht bewertet_. Latenz-Daten aus Live-Messung: generate-cards 15–20 s, analyze 25–30 s — diese Latenz ist faktisch bekannt, aber die inhaltliche Qualität der Outputs ist nicht systematisch geprüft. |
| **12 Produkt** | Zeit bis zum ersten Aha-Moment, Retention, Conversion — nicht messbar ohne echte Nutzerdaten. Kein Zugang zur Live-App oder Nutzungsmetriken. | Score = _nicht bewertet_. |

Der Gesamtschnitt wird über die **10 bewerteten Bereiche** berechnet. Bereiche 4 und 12 fließen nicht ein.

---

## Auftrag d — Nutzerfolge-Begründung für F025 und F026

### F025 — Wiederholung ohne Lösung (S2)

**Absicht:** Das Design setzt auf Activation-Only — der Nutzer soll durch eigenes Erinnern lernen, nicht durch Nachschlagen.

**Nutzerproblem trotzdem real:** Nach dem zweiten Fehlversuch in Folge hat der Nutzer durch eigenständiges Erinnern offensichtlich keinen Lernerfolg. Weitere Wiederholung ohne Lösungszugang führt zu:

1. **Learned Helplessness** (Seligman 1972): Wiederholt fehlschlagen ohne erkennbaren Ausweg erzeugt die Erwartung, dass eigene Anstrengung das Ergebnis nicht beeinflusst — das Gegenteil von Selbstwirksamkeit.
2. **Task Abandonment bei ADHS**: Die Frustrations-Toleranz-Schwelle ist bei ADHS-Nutzern nachweislich niedriger (Barkley 1997). Ein geschlossener Loop ohne Escape-Hatch erhöht die Abbruchrate massiv.
3. **Fehlende Desirable Difficulty**: Das Prinzip besagt, dass produktiver Schwierigkeitsgrad einen Lernpfad voraussetzt. Ohne Lösungsweg ist die Schwierigkeit nicht „desirable", sondern frustrierend.

**S2-Einstufung gerechtfertigt:** Direkter Nutzungsschaden (Abbruch, negative Lernemotionen) auch wenn die Absicht lerntheoretisch vertretbar ist.

### F026 — Sync ohne Statusanzeige (S2)

**Absicht:** Offline-First-Architektur — die App soll auch ohne Netz funktionieren; der Ladevorgang ist architekturbedingt asynchron.

**Nutzerproblem trotzdem real:** 15–30 Sekunden ohne Rückmeldung sind aus UX-Sicht nicht tolerierbar, unabhängig von der Architektur:

1. **Nielsen-Heuristik #1 (System Status Visibility):** Jede Operation über 10 Sekunden benötigt einen Fortschrittsindikator mit Schätzung der Restzeit (Nielsen 1994).
2. **ADHS-spezifischer Cognitive Load:** Fehlende Rückmeldung erzeugt Unsicherheit, die als zusätzliche kognitive Belastung wirkt. ADHS-Nutzer sind besonders sensitiv für Wartezeiten ohne Kontext (Barkley 1997).
3. **Impulsiver Reload-Reflex:** Ohne Rückmeldung ist ein Page-Reload die naheliegende Reaktion — was den KI-Prozess unterbricht und von vorne beginnt.
4. **Vertrauensverlust:** Eine einmalige Erfahrung von „App friert ein" kann dauerhaftes Misstrauen erzeugen, selbst wenn die App danach korrekt funktioniert.

**S2-Einstufung gerechtfertigt:** Das Fehlen des Indikators ist ein vermeidbares UX-Problem mit direktem Nutzungsschaden; die Latenz selbst ist akzeptabel.

---

## Vollständige Findings-Liste

| ID | Bereich | S | Stand | Status | Kurzfassung |
|----|---------|---|-------|--------|-------------|
| F001 | 5 Sicherheit | S2 | beide | CONFIRMED | 10 AI-Routen ohne Input-Validierung |
| F002 | 5 Sicherheit | S2 | beide | CONFIRMED | Body-Parser 35 MB für alle Routen |
| F003 | 2 QA | S2 | beide | CONFIRMED | Block-Completion vor Button-Klick geht verloren |
| F004 | 6 Datenschutz | S2 | beide | CONFIRMED | YouTube youtube.com statt youtube-nocookie.com |
| F005 | 6 Datenschutz | S2 | beide | CONFIRMED | Google Fonts ohne Consent (OLG München) |
| F006 | 6 Datenschutz | S2 | beide | CONFIRMED | Kein AVV/SCC-Hinweis für Anthropic |
| F007 | 6 Datenschutz | S2 | beide | CONFIRMED | Web Speech API nicht in Datenschutzerklärung |
| F008 | 5 Sicherheit | S3 | beide | CONFIRMED | API-Key-Existenz in Produktions-Logs |
| F009 | 1 Engineering | S2 | beide | PLAUSIBLE | Blind-POST überschreibt Server-State (kein Merge) |
| F010 | 10 PWA | S3 | beide | CONFIRMED | Kein dediziertes Maskable-Icon mit Safe Zone |
| F011 | 1 Engineering | S3 | beide | CONFIRMED | autoUpdate SW übernimmt mid-session |
| F012 | 3 UX | S3 | beide | CONFIRMED | „Verstanden, weiter →" bei Lücken missverständlich |
| F013 | 8 Lernwirksamkeit | S3 | beide | CONFIRMED | Keine Selbsteinschätzung (Metacognitive Accuracy) |
| F014 | 5 Sicherheit | S3 | beide | CONFIRMED | 4 moderate CVEs in esbuild (dev) |
| F015 | 11 Betrieb | S2 | beide | PLAUSIBLE | Kein Staging/Preview-Environment |
| F016 | 11 Betrieb | S2 | beide | CONFIRMED | Kein Fehler-Tracking (Sentry o.ä.) |
| F017 | 9 Barrierefreiheit | S3 | beide | CONFIRMED | Keine Landmark-Elemente (<main>, <nav>) |
| F018 | 7 Performance | S3 | beide | CONFIRMED | 4,1 MB unreferenzierte PNGs im dist/ |
| F019 | 5 Sicherheit | S3 | Arbeitsstand | CONFIRMED | Permissions-Policy-Header nicht gesetzt (Helmet 8.x) |
| F020 | 9 Barrierefreiheit | S2 | beide | CONFIRMED | 3 UI-Elemente < WCAG AA Kontrast 4.5:1 |
| F021 | 7 Performance | S2 | beide | CONFIRMED | FCP 3,6 s mobil; 213 KiB ungenutztes JS |
| F022 | 7 Performance | S3 | beide | CONFIRMED | Kein meta-description; robots.txt gibt HTML zurück |
| **F023** | **5 Sicherheit** | **S1** | **Live-Stand** | **CONFIRMED** | **Alle Security-Header fehlen; Render auf Nov-2-Commit** |
| **F024** | **8 Lernwirksamkeit** | **S2** | **beide** | **CONFIRMED** | **Feedback benennt Fehlvorstellung nicht** |
| **F025** | **3 UX** | **S2** | **beide** | **CONFIRMED** | **Wiederholung ohne Lösung/Ausweg** |
| **F026** | **3 UX** | **S2** | **beide** | **CONFIRMED** | **Sessionstart 15–30 s ohne Statusanzeige** |
| **F027** | **3 UX** | **S2** | **beide** | **CONFIRMED** | **UI-Überlappung bei 1280 px und mobil** |

**Legende:** Stand = auf welchen Stand der Befund zutrifft; F023 nur Live-Stand (Helmet fehlt); F019 nur Arbeitsstand (durch F023 auf Live-Stand subsumiert).

---

## Priorisierter Fix-Plan

### Sofort (Blocker für Live-Stand)

| Priorität | Finding | Aufwand | Impact |
|-----------|---------|---------|--------|
| 🔴 P0 | **F023** — Render-Redeploy | 10 min | Live-Stand → Arbeitsstand-Niveau; S1 beseitigt |

### Vor Launch (S2 CONFIRMED)

| Priorität | Finding | Aufwand |
|-----------|---------|---------|
| 🟠 P1 | F001 — Input-Validierung für 10 AI-Routen | 2 h |
| 🟠 P1 | F002 — Body-Parser-Limits pro Route | 1 h |
| 🟠 P1 | F020 — Kontrast-Fixes (3 UI-Elemente) | 2 h |
| 🟠 P1 | F025 — Lösung/Exit nach Fehlversuch | 3 h |
| 🟠 P1 | F026 — Loading-State beim Sessionstart | 2 h |
| 🟠 P1 | F027 — Überlappung Zurück/Logo + Mobil | 2 h |
| 🟡 P2 | F004–F007 — DSGVO-Korrekturen | 4 h (rechtlich zu prüfen) |
| 🟡 P2 | F016 — Sentry-Integration | 2 h |
| 🟡 P2 | F024 — Feedback-Prompt mit Fehlvorstellung | 1 h (Prompt-Anpassung) |

### Nach Launch (S3 CONFIRMED und PLAUSIBLE)

F008, F009, F010, F011, F013, F015, F018, F019, F021, F022, F014.

---

## Einschränkungen dieses Audits

- **KI-Pipeline (Bereich 4):** Golden Set und systematische Output-Qualitätsmessung nicht durchgeführt. Latenz aus Live-Messung bekannt (15–30 s), Halluzinationsrate unbekannt.
- **Produkt (Bereich 12):** Retention, Time-to-Aha, Conversion — keine Daten.
- **Performance (Bereich 7):** Lighthouse lokal ohne CDN; Live-Werte können abweichen.
- **PLAUSIBLE-Findings:** F009 (Blind-POST) und F015 (kein Staging) nicht reproduziert; Einschätzungen beruhen auf Code-Review.
- **Datenschutz:** Kein Rechtsanwalt — Einschätzungen zu DSGVO sind technischer Natur und nicht rechtsverbindlich.
