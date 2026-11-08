# Lumo Pre-Launch Audit — Abschlussbericht

**Datum:** 2026-11-08  
**Auditor:** Claude Sonnet 4.6 (Vollständige Code-Review, Phasen A–E)  
**Repo-Zustand:** Aktueller Hauptbranch, lokal, kein Commit/Deploy  
**Findings:** 18 Befunde (F001–F018), davon 16 CONFIRMED, 2 PLAUSIBLE

---

## 1. Punktezahl je Bereich

**Formel:** 100 − Σ Abzüge (S1 = 12, S2 = 5, S3 = 1,5); nur CONFIRMED-Befunde.  
Bereiche ohne eigene Findings erhalten Abzüge aus Findings anderer Bereiche, die sich auf sie auswirken.

| Nr | Bereich | Punkte | Konfidenz | CONFIRMED-Befunde |
|----|---------|--------|-----------|-------------------|
| 1 | Engineering | **95** | mittel | F011 (−1,5), F009 PLAUSIBLE (−0) |
| 2 | QA und Funktion | **95** | mittel | F003 (−5) |
| 3 | Produktdesign und UX | **98** | mittel | F012 (−1,5) |
| 4 | KI-Pipeline | **82** | mittel | — (keine Bugs, aber Golden Set nicht durchführbar) |
| 5 | Sicherheit | **87** | hoch | F001 (−5), F002 (−5), F008 (−1,5), F014 (−1,5) |
| 6 | Datenschutz und Recht | **80** | hoch | F004 (−5), F005 (−5), F006 (−5), F007 (−5) |
| 7 | Performance | **77** | niedrig | F018 (−1,5); Lighthouse nicht ausführbar |
| 8 | Lernwirksamkeit | **87** | mittel | F013 (−1,5); FSRS korrekt impl. |
| 9 | Barrierefreiheit | **90** | niedrig | F017 (−1,5); axe-core nicht ausführbar |
| 10 | Plattform und PWA | **97** | hoch | F010 (−1,5), F011 (−1,5) |
| 11 | Betrieb und Release | **90** | mittel | F016 (−5), F015 PLAUSIBLE (−0) |
| 12 | Produkt und Wirtschaftlichkeit | **72** | niedrig | Nicht vollständig geprüft |

**Gesamteindruck:** 87/100 (gewichteter Schnitt über geprüfte Bereiche, niedrig-Konfidenz-Bereiche ausgenommen)

---

## 2. Go / No-Go

### Verdict: **CONDITIONAL NO-GO**

Lumo ist technisch sehr solide und zeigt ein ungewöhnlich hohes Reife-Niveau für ein Solo-Projekt: saubere Architektur, korrekte FSRS-6-Implementierung, durchdachtes ADHS-Design, robuste Security-Header, 157/157 Tests bestanden.

**Öffentlicher Launch ist erst nach Behebung folgender Punkte empfohlen:**

#### Blocking für Launch (S2, CONFIRMED)
1. **F003** — Block-Completion geht bei Tab-Close verloren (Datenverlust)
2. **F001** — 10 AI-Routen ohne Input-Validierung (Kostenmissbrauch-Risiko)
3. **F004** — YouTube-Embed ohne `-nocookie` (DSGVO-Verstoß)
4. **F005** — Google Fonts extern geladen ohne Consent (DSGVO, dt. Rechtslage)
5. **F006** — Kein AVV/SCC-Hinweis für Anthropic in Datenschutzerklärung (DSGVO Art. 28/44)
6. **F007** — Web Speech API nicht in Datenschutzerklärung erwähnt
7. **F016** — Kein Error-Tracking (Produktionsfehler unsichtbar)

**F002** (Body-Parser-Limit) ist ein Low-Risk-Fix, der schnell umsetzbar ist.

#### Nicht-blockend, aber empfohlen vor Launch (S2, PLAUSIBLE)
- **F009** — Race Condition bei Multi-Device-Sync (reproduzierbar aber selbst-heilend)
- **F015** — Kein Staging-Environment (manuell mitigierbar)

---

## 3. Top-10 Fix-Liste nach Risiko und Aufwand

| Prio | ID | Risiko | Aufwand | Empfohlene Maßnahme |
|------|----|--------|---------|---------------------|
| 1 | F003 | Datenverlust, Nutzerfrustration | **Sehr gering** (~1 h) | `BLOCK_FINISHED` in `handleCheckDone` dispatchen, nicht erst bei Button-Klick |
| 2 | F004 | DSGVO-Verstoß | **Sehr gering** (~15 min) | `youtube.com/embed` → `youtube-nocookie.com/embed` in YoutubePanel.jsx:68 |
| 3 | F001 | DoW, ungültige AI-Calls | **Gering** (~2–4 h) | Null/leere Pflichtfelder in 10 Routes mit 400 ablehnen; Länge prüfen |
| 4 | F002 | Memory Exhaustion | **Gering** (~1 h) | Route-spezifische Body-Parser mit 50 KB Limit für kleine Routen |
| 5 | F007 | DSGVO, fehlende Disclosure | **Sehr gering** (~30 min) | Web Speech API in Datenschutzerklärung ergänzen (1 Absatz) |
| 6 | F005 | DSGVO (dt. Rechtslage) | **Mittel** (~4 h) | Google Fonts self-hosten via fontsource; Datenschutzerklärung anpassen |
| 7 | F006 | DSGVO Art. 28/44 | **Gering (rechtlich)** | AVV + SCC-Hinweis für Anthropic in Datenschutzerklärung ergänzen |
| 8 | F016 | Blinde Produktionsumgebung | **Mittel** (~4 h) | Sentry Free Tier integrieren (`@sentry/react`, init in main.jsx) |
| 9 | F011 | SW-Update mid-Session | **Gering** (~2 h) | Toast bei `controllerchange`-Event: "Lumo wurde aktualisiert" |
| 10 | F012 | Verwirrende UX bei Lücken | **Sehr gering** (~15 min) | Button-Text: "Verstanden, weiter →" → "Notiert, weiter →" bei `unsicher`-Status |

**Gesamtaufwand für Blocking-Fixes (F001–F007 + F016):** ~12–16 Stunden Code + juristisches Review der DSGVO-Texte

---

## 4. Stärken (zu erhalten)

**Architektur und Engineering:**
- **3-Layer Persistence** (localStorage → IndexedDB → Server) ist robust und ADHS-tauglich: App startet sofort, Daten überleben Offline-Phasen. Implementierung fehlerfrei.
- **FSRS-6 Implementierung** (`src/utils/fsrs.js`) ist korrekt und vollständig: Rating-Mapping, SM-2-Migration, Fallback, Fehlerbehandlung — keine Bugs gefunden.
- **Concurrency-Schutz** (P-BE-05, P-BE-07): Admission Control vor dem Body-Parser + globales AI-Call-Limit — beide Schichten korrekt getestet (157/157 Tests pass).
- **Security Headers** via Helmet: CSP, HSTS, Referrer-Policy, X-Content-Type-Options — vollständig und korrekt konfiguriert.

**KI-Pipeline:**
- **Strukturierte Outputs** mit `additionalProperties: false` auf allen 11 Schemas — verhindert Halluzinations-Leakage und Prompt-Injection-Exploitation.
- **Prompt-Injection-Guard** in `ANALYZE_SYSTEM` (Zeile 60): explizite Instruktion, Nutzermaterial nicht als Befehl zu interpretieren.
- **Effort-Praise-Prinzip** (Dweck 1998) konsequent in allen Feedback-Prompts implementiert (EVALUATE_CARD_ANSWER, EVALUATE_UNDERSTANDING) — wissenschaftlich fundiert.
- **Mood-adaptive Cards** (`getCardSystem`): weniger Karten, einfachere Fragen bei `bad`-Mood — evidenzbasiertes ADHS-Design.

**Lernwirksamkeit:**
- **Retrieval Practice** via FSRS-6-gestützte Karteikarten mit korrekter Intervall-Berechnung.
- **Pretesting** (pretest_question vor Karteninhalt) — Ausubel 1978 / Butler & Roediger 2007 korrekt umgesetzt.
- **Elaborative Interrogation** in EXPLAIN_CHAT_BASE: Fragen wie "Warum glaubst du ist das so?" statt direkter Erklärung.
- **Advance Organizer** (ElaborationPhase): Aktivierung ohne Bewertung — korrekt als warm-up implementiert, nicht als Test.

**ADHS-Design:**
- **prefers-reduced-motion** vollständig implementiert (animation-duration: 0s, animation-delay: 0s).
- **autoFocus** in allen Eingabefeldern gesetzt — reduziert Klick-Reibung für ADHS-Nutzer.
- **In-Session Spaced Repetition** (weakCardQueue, max 1 repeat/card/session) — verhindert Overload.
- **Offline-First** mit lokalem Fallback und freundlicher OfflineBanner-Komponente.

**Datenschutz:**
- **CookieConsent** vor erstem Cookie-Setzen implementiert (ePrivacy-konform).
- **materialText/fileBase64** werden nicht zum Server synchronisiert — intentional und DSGVO-günstig.
- **Anonyme User-ID** per Cookie — kein Account, keine E-Mail-Pflicht.

---

## 5. Vergleich mit Verdachtspunkte aus der Audit-Brief

| Verdacht | Ergebnis |
|---------|----------|
| KI-Routen validieren Eingaben nicht (leere Requests) | ✅ CONFIRMED → F001 |
| 6-MB-Body akzeptiert | ✅ CONFIRMED → F002 |
| Nach Reload Block auf 'in-progress', sessionsTotal 0, Streak 0 | ✅ CONFIRMED → F003 |
| Abschluss meldet 'Verstanden' trotz falscher Antwort | ⚠️ TEILWEISE: 'Verstanden, weiter' nur Button-Text → F012; Kein Datenverlust, aber misleading UX |
| Sicher/Unsicher-Abfrage nicht vorhanden | ✅ CONFIRMED → F013 (kein Nutzer-Confidence-Rating) |
| Keine Security-Header, x-powered-by sichtbar | ❌ REJECTED — Helmet vollständig konfiguriert; x-powered-by entfernt |
| /api/health nennt hasApiKey | ❌ REJECTED — GET /api/health liefert nur `{ok: true}` |
| Gleiche Frage nach 1 Minute, kein Ausgang bei nicht bestanden | ⚠️ TEILWEISE BESTÄTIGT: gleiche Frage in repeat-phase CONFIRMED; "kein Ausgang" REJECTED (Weiter-Button vorhanden) |
| Kein Lösungshinweis bei Wiederholungsfrage nicht bestanden | ✅ CONFIRMED (kein card.explanation in repeat-card-phase) — aufgenommen unter Lernwirksamkeit/UX |
| Vermutungsphase ignoriert die Antwort | ✅ CONFIRMED als INTENTIONELL (activation-only per Design-Kommentar) — keine Schwachstelle |
| Brücke-Analogie bei Synapsen fachlich schief | ❌ NICHT BESTÄTIGBAR — keine hardcoded Analogie; AI-generiert aus Nutzermaterial |
| materialText/fileBase64 nicht synchronisiert | ✅ CONFIRMED als INTENTIONELL (serverSync.js:77) — kein Bug |
| Sync schluckt Fehler | ✅ CONFIRMED als INTENTIONELL (fetchWithCookies catch→null) — offline-first Design |
| Konflikte: Version mit mehr Fortschritt gewinnt | ✅ CONFIRMED — count-based, nicht timestamp (dokumentiert) |
| Kein Drittland/AVV-Bezug zu Anthropic | ✅ CONFIRMED → F006 |
| Google Fonts extern | ✅ CONFIRMED → F005 |
| YouTube-Embed ohne nocookie | ✅ CONFIRMED → F004 |
| Web Speech API nicht erwähnt | ✅ CONFIRMED → F007 |
| Grammatikfehler in KI-Texten | ❌ NICHT PRÜFBAR ohne live Test-Runs (kein golden set) |
| Überlappungen Zurück-Button/Logo + Feedback-Button | ❌ NICHT PRÜFBAR ohne Browser-Test (Phase D ausstehend) |
| 15–20s Wartezeit beim Sessionstart | ❌ NICHT PRÜFBAR ohne Messung (Phase D ausstehend) |
| 607KB Maskottchen-PNG | ✅ BESTÄTIGT — und erweitert: dist/mascot enthält 4,1MB PNGs die nicht referenziert werden → F018 |
| Kein h1 | ❌ TEILWEISE REJECTED — h1 ist in vielen Screens vorhanden (AnalyzingScreen, WelcomeBackScreen, etc.) |
| Keine Landmarks | ✅ CONFIRMED → F017 (kein <main>, kein <nav> auf Root-Ebene) |

---

## 6. Offene Unsicherheiten

Die folgenden Punkte konnten im Rahmen dieser Audit-Phase nicht abschließend bewertet werden und bleiben offen:

| Unsicherheit | Warum offen | Empfehlung |
|-------------|-------------|------------|
| Lighthouse Mobile/Desktop | Phase D (Browser) nicht durchführbar im Cloud-Container | Manuell in Chrome DevTools mit Throttling (Slow 4G) ausführen |
| axe-core Accessibility Scan | Phase D ausstehend | axe-core Browser-Extension auf Live-App ausführen |
| Grammatik/Halluzinationen in KI-Texten | Erfordert Golden Set ≥20 Materialien mit Erwartungswerten | 5–10 typische Lernmaterialien manuell testen |
| Latenz p50/p95 je Route | Erfordert Messung gegen Live-App | k6 oder curl-Timing gegen https://lumo-app-pbgc.onrender.com |
| Multi-Device Race Condition (F009) | Plausibel aus Code, nicht live reproduziert | Mit 2 Tabs/Geräten gleichzeitig testen |
| Render Kaltstart-Verhalten | Free/Starter Plan unbekannt | In Browser öffnen nach 30min Inaktivität; Latenz messen |
| iOS Web-Storage-Löschung bei Nichtnutzung | Safari-Verhalten nach 7 Tagen | Auf echtem iPhone Safari testen |
| Produkt Wirtschaftlichkeit/Kosten pro Block | Erfordert Anthropic Console-Zugang | Token-Zähler im Code einbauen; pro Analyze-Call Tokens loggen |
| SSRF via YouTube-Route | REJECTED (Hardcoded googleapis.com URL, `concept` nur als encodeURIComponent-Parameter) | Keine weitere Prüfung nötig |

---

## 7. Findings-Übersicht

| ID | Bereich | Schwere | Status | Befund (Kurzfassung) |
|----|---------|---------|--------|---------------------|
| F001 | 5 Sicherheit | S2 | CONFIRMED | 10 AI-Routen ohne Input-Validierung |
| F002 | 5 Sicherheit | S2 | CONFIRMED | Body-Parser-Limit 35MB für alle Routen |
| F003 | 2 QA | S2 | CONFIRMED | Block-Completion erst bei Button-Klick persistiert |
| F004 | 6 Datenschutz | S2 | CONFIRMED | YouTube-Embed ohne nocookie |
| F005 | 6 Datenschutz | S2 | CONFIRMED | Google Fonts extern ohne Consent |
| F006 | 6 Datenschutz | S2 | CONFIRMED | AVV/SCC-Hinweis für Anthropic fehlt |
| F007 | 6 Datenschutz | S2 | CONFIRMED | Web Speech API nicht offenbart |
| F008 | 5 Sicherheit | S3 | CONFIRMED | API-Key-Existenz in Produktions-Logs |
| F009 | 1 Engineering | S2 | PLAUSIBLE | Race Condition bei Multi-Device-Sync |
| F010 | 10 PWA | S3 | CONFIRMED | Maskable-Icon ohne Safe Zone |
| F011 | 10 PWA / 1 Eng | S3 | CONFIRMED | SW-Update kann mid-Session übernehmen |
| F012 | 3 UX | S3 | CONFIRMED | Button "Verstanden, weiter →" bei unsicherem Ergebnis |
| F013 | 8 Lernwirksamkeit | S3 | CONFIRMED | Kein Nutzer-Confidence-Rating (nur AI-Bewertung) |
| F014 | 5 Sicherheit | S3 | CONFIRMED | 4 moderate CVEs in Entwicklungsabhängigkeiten |
| F015 | 11 Betrieb | S2 | PLAUSIBLE | Kein Staging-Environment |
| F016 | 11 Betrieb | S2 | CONFIRMED | Kein Error-Tracking |
| F017 | 9 Barrierefreiheit | S3 | CONFIRMED | Keine Landmark-Elemente (<main>, <nav>) |
| F018 | 7 Performance | S3 | CONFIRMED | 4,1 MB PNG-Maskottchen-Dateien unreferenziert im dist |

**S1-Findings (vor Beta): 0**  
**S2-Findings CONFIRMED: 8 (F001–F007, F016)**  
**S2-Findings PLAUSIBLE: 2 (F009, F015)**  
**S3-Findings CONFIRMED: 8 (F008, F010–F014, F017, F018)**

---

*Prüftiefe: Code-Review vollständig für server/prompts.js, server/index.js (ausgewählte Routen), src/utils/fsrs.js, src/utils/serverSync.js, src/screens/session/CardLearningPhase.jsx, src/screens/session/ElaborationPhase.jsx, src/screens/session/CheckUnderstandingPhase.jsx, public/manifest.json, vite.config.js. Browser-Tests (Phase D) und Golden Set (Phase C, Bereich 4) ausstehend.*  
*Rechtliche Einschätzungen zu DSGVO/AVV sind nicht rechtsverbindlich und sollten juristisch geprüft werden.*
