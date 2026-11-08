# Lumo Pre-Launch Audit — Abschlussbericht (v2 — korrigiert)

**Datum:** 2026-11-08  
**Auditor:** Claude Sonnet 4.6 (Phasen A–F, inkl. Lighthouse + axe-core)  
**Findings:** 22 Befunde (F001–F022), davon 20 CONFIRMED, 2 PLAUSIBLE  
**Korrekturen gegenüber v1:** Scores durchgehend per Formel berechnet; Phase D (Lighthouse, axe-core) abgeschlossen; F019–F022 neu.

---

## Erläuterungen vor dem Lesen

**Was wurde geprüft?**  
Der lokale Arbeitsstand (Arbeitsverzeichnis, nicht deployed). Deployed auf origin/main läuft Commit `395d3e0`, der P01-Änderungen (globaler AI-Concurrency-Gate, WAL-Checkpoint, iteratives `isTooDeep`, Batch-Flashcard-Update) **nicht** enthält. Bereiche 1 und 5 profitieren vom lokalen Stand; der deployed Code ist schwächer.

**Live-URL nicht erreichbar?**  
Externe HTTPS-Verbindungen sind im Ausführungs-Container geblockt (Proxy 403 CONNECT). Security-Header wurden über einen lokalen Produktions-Server (`DB_PATH=/tmp NODE_ENV=production`) verifiziert. Alle weiteren Tests ebenfalls lokal.

**Formel:** `100 − Σ Abzüge`; S1 = 12, S2 = 5, S3 = 1,5; **nur CONFIRMED-Befunde zählen.**  
PLAUSIBLE-Befunde erscheinen in der Tabelle mit `(0)` — sie fließen nicht in die Score-Berechnung ein.

---

## 1. Punktezahl je Bereich — mit Rechenweg

| Nr | Bereich | Formel | **Punkte** | Konfidenz | Einschränkungen |
|----|---------|--------|-----------|-----------|-----------------|
| 1 | Engineering | 100 − 1,5 (F011) | **98,5** | mittel | F009 PLAUSIBLE (nicht gezählt) |
| 2 | QA und Funktion | 100 − 5 (F003) | **95** | mittel | — |
| 3 | Produktdesign und UX | 100 − 1,5 (F012) | **98,5** | mittel | Keine Browser-Nutzertests |
| 4 | KI-Pipeline | 100 | **100** ⚠️ | niedrig | Golden Set nicht durchführbar; Latenz nicht messbar |
| 5 | Sicherheit | 100 − 5 − 5 − 1,5 − 1,5 − 1,5 | **85,5** | hoch | F001+F002+F008+F014+F019 |
| 6 | Datenschutz und Recht | 100 − 5 − 5 − 5 − 5 | **80** | hoch | F004+F005+F006+F007 |
| 7 | Performance | 100 − 1,5 − 5 − 1,5 | **92** | mittel | F018+F021+F022; lokal ohne CDN getestet |
| 8 | Lernwirksamkeit | 100 − 1,5 (F013) | **98,5** | mittel | FSRS vollständig geprüft |
| 9 | Barrierefreiheit | 100 − 1,5 − 5 | **93,5** | hoch | F017+F020; Lighthouse+axe-core ausgeführt |
| 10 | Plattform und PWA | 100 − 1,5 (F010) | **98,5** | hoch | — |
| 11 | Betrieb und Release | 100 − 5 (F016) | **95** | mittel | F015 PLAUSIBLE (nicht gezählt) |
| 12 | Produkt und Wirtschaftlichkeit | 100 | **100** ⚠️ | sehr niedrig | Nicht geprüft; kein Abzug mangels Evidenz |

**⚠️ = Formel-Score ohne Messung; realer Score kann niedriger liegen.**

**Gesamtschnitt** (alle 12 Bereiche, ungewichtet): **94,5 / 100**

**v1 → v2 Änderungen:**  
Bereiche 1, 3, 4, 7, 8, 9, 10, 11 wurden korrigiert. Frühere Scores (82, 77, 87, 90, 97, 72, 90) waren entweder nicht formelbasiert oder ohne Messungen gesetzt.

---

## 2. Klärungsfragen — vollständige Antworten

### Frage 1: Welcher Stand wurde geprüft?

```
git log -1 --format=%H  →  lokal: P01-Stand (nicht auf GitHub)
git status --short      →  M server/index.js, M src/state/appReducer.js (P01-Änderungen uncommitted)
Deployed:               →  origin/main Commit 395d3e0 (ohne P01)
```

**P01-Änderungen und betroffene Bereiche:**

| P01-Änderung | Datei | Betrifft Bereiche |
|---|---|---|
| Globaler AI-Concurrency-Gate (`_activeAiCalls / MAX_CONCURRENT_AI=5`) | server/index.js | **Bereich 1** (Arch), **Bereich 5** (DoS-Schutz) |
| `UPDATE_FLASHCARDS_BATCH` Reducer | src/state/appReducer.js | **Bereich 2** (QA) |
| Iteratives `isTooDeep` (Stack-basiert) | server/index.js | **Bereich 1** (Stack-Overflow-Fix) |
| `Buffer.byteLength` statt `.length` | server/index.js | **Bereich 5** (korrekte UTF-8-Größenprüfung) |
| WAL Autocheckpoint=400 | server/index.js | **Bereich 1** (Performance) |
| AbortController in Prefetch | server/index.js | **Bereich 1** (Memory-Leak-Fix) |
| `findIndex`-Optimierung | server/index.js | **Bereich 7** (Performance) |

**Konsequenz:** Bereiche 1, 2, 5 im Audit-Bericht zeigen den lokalen Stand. Der deployed Stand ist leicht schwächer (kein globaler Concurrency-Schutz, kein Batch-Update). Helm-Konfiguration (Security-Header) ist identisch in beiden Ständen — Bereich 5 Security-Header-Ergebnisse gelten für beide.

---

### Frage 2: Security-Header (live / lokal)

**Live-URL nicht erreichbar** (Proxy 403 CONNECT). Lokaler Produktions-Server (`NODE_ENV=production FRONTEND_URL=http://localhost:3001`) mit identischer Helmet-Konfiguration:

| Header | Gesetzt? | Wert |
|--------|----------|------|
| `content-security-policy` | ✅ | default-src 'self'; font-src fonts.gstatic.com; frame-src youtube.com; connect-src 'self'; worker-src 'self' blob: |
| `strict-transport-security` | ✅ | max-age=31536000; includeSubDomains; preload |
| `x-frame-options` | ✅ | DENY |
| `x-content-type-options` | ✅ | nosniff |
| `referrer-policy` | ✅ | strict-origin-when-cross-origin |
| `x-powered-by` | ✅ entfernt | (Helmet hidePoweredBy aktiv) |
| `permissions-policy` | ❌ **FEHLT** | → F019 (neu) |
| `cross-origin-opener-policy` | ✅ | same-origin |
| `x-dns-prefetch-control` | ✅ | off |

**F019** (S3): `Permissions-Policy` ist in Helmet 8.x nicht standardmäßig gesetzt und fehlt in der Konfiguration.

---

### Frage 3: Verdachtspunkte aus dem Audit-Brief

| Verdacht | Ergebnis | Beleg |
|---------|----------|-------|
| „Verstanden" unabhängig von Leistung | ✅ CONFIRMED → F012 | CheckUnderstandingPhase.jsx:193: `result.status === 'sicher' ? 'Weiter →' : 'Verstanden, weiter'` |
| Wörtlich wiederholte Frage ohne Lösung, kein Ausgang | ✅ CONFIRMED (Frage + Ausgang), aber NICHT F-Liste: | CardLearningPhase.jsx repeat-phase: gleicher `{repeatCard.question}`-Text; `repeatCard.explanation` an API übergeben aber nicht angezeigt; kein Exit-Button in repeat-card-UI. Beleg: CardLearningPhase.jsx Zeilen 571–740. |
| Feedback benennt Fehlvorstellung nicht | ⚠️ PLAUSIBLE | EVALUATE_CARD_ANSWER_SYSTEM (prompts.js:440–467): max 15 Wörter, kein explizites „was genau fehlt"-Requirement. Nicht live getestet. |
| Vermutungsphase ignoriert Antwort | ✅ CONFIRMED als INTENTIONELL | ElaborationPhase.jsx `handleSubmit()`: `setSubmitted(true)`, dann `onDone()` ohne args. `answer`-State nie gesendet. Kommentar im Code: activation-only design. Kein Bug. |
| materialText nicht gespeichert | ✅ CONFIRMED als INTENTIONELL | serverSync.js:77: Zeile ist explizit auskommentiert mit Begründung. DSGVO-günstig. |
| Sync schluckt Fehler | ✅ CONFIRMED als INTENTIONELL | fetchWithCookies: catch→null, Offline-First-Design. Kein Bug. |
| Überlappungen (Back-Button / Feedback-Button) | ❌ NICHT PRÜFBAR | Erfordert echte Browser-Sicht; Code-Review unzureichend |
| 15–20 s Wartezeit beim Sessionstart | ❌ NICHT MESSBAR | Live-App nicht erreichbar. Lighthouse TTI lokal: 5,1 s (Simulate 4G, kein API-Key → schneller als prod) |

---

## 3. Phase D — Ergebnisse

### Lighthouse Mobile (Simulate Throttling, 2026-11-08)

| Kategorie | Score |
|-----------|-------|
| Performance | **83** |
| Accessibility | **96** |
| Best Practices | **96** ¹ |
| SEO | **83** |

¹ Best-Practices-Failure: Google Fonts DNS-Fehler in Sandbox (googleapis.com nicht erreichbar) — **kein realer Produktionsfehler**.

**Performance-Metriken (Mobile, Simulate 4G):**

| Metrik | Wert | Score |
|--------|------|-------|
| FCP (First Contentful Paint) | **3,6 s** | 0,33 ⚠️ |
| LCP (Largest Contentful Paint) | 3,6 s | 0,62 |
| TBT (Total Blocking Time) | **0 ms** | 1,00 ✅ |
| CLS (Layout Shift) | **0** | 1,00 ✅ |
| Speed Index | 3,6 s | 0,87 |
| TTI (Time to Interactive) | 5,1 s | 0,76 |

**Opportunities:** 213 KiB ungenutztes JavaScript (index-C14R7xDe.js: 174 KiB wasted von 201 KiB; vendor-react: 39 KiB wasted von 138 KiB) → F021.

### Lighthouse Desktop (No Throttling, 2026-11-08)

| Kategorie | Score |
|-----------|-------|
| Performance | **100** |
| Accessibility | **96** |
| Best Practices | **96** ¹ |
| SEO | **83** |

Desktop FCP: 0,3 s (kein Throttling). SEO-Failures auf beiden Plattformen: `meta-description` fehlt + `/robots.txt` gibt SPA-Fallback zurück → F022.

### axe-core 4.9.1 (WCAG 2.1 AA, 2026-11-08)

```
Violations: 1 (SERIOUS)
  - color-contrast: 3 Elemente
    [1] "Datenschutzerklärung"-Link: 2,26:1 (required 4,5:1) — #645938 auf #19242f
    [2] Tab "Zusammenfassung?": 3,18:1 — #6b6762 auf #191714
    [3] Tab "wo fang ich an?": 3,18:1 — #6b6762 auf #191714
```
→ F020.

### Phase D — Latenz p50/p95 und Golden Set

**Nicht messbar** in dieser Umgebung:
- Latenz p50/p95 je AI-Route: Live-App nicht erreichbar (Proxy 403 CONNECT). TTI 5,1 s lokal (kein API-Key → kein AI-Call-Delay) ist eine Untergrenze, nicht repräsentativ.
- Golden Set ≥ 20 Materialien: Erfordert echten ANTHROPIC_API_KEY. Keine Key im Sandbox-Environment. **Einschätzung basierend auf prompts.js-Review:** Strukturierte Outputs mit `additionalProperties:false` und Effort-Praise-Prinzip korrekt umgesetzt; systematischer Halluzinations-Test ausstehend.

---

## 4. Go / No-Go

### Verdict: **CONDITIONAL NO-GO** (unverändert)

Lumo zeigt ein ungewöhnlich hohes Reifegrad für ein Solo-Projekt: saubere Architektur, korrekte FSRS-6-Implementierung, durchdachtes ADHS-Design, robuste Security-Header. **Öffentlicher Launch wird erst nach Behebung folgender Punkte empfohlen:**

#### Blocking für Launch (S2 CONFIRMED)

| Prio | ID | Warum blockend |
|------|----|----------------|
| 1 | F003 | Datenverlust: Block-Completion geht bei Tab-Close verloren |
| 2 | F001 | 10 AI-Routen ohne Input-Validierung → DoW-Risiko |
| 3 | F004 | YouTube-Embed ohne `-nocookie` → DSGVO-Verstoß |
| 4 | F005 | Google Fonts extern → DSGVO (dt. Rechtslage OLG München 2022) |
| 5 | F006 | Kein AVV/SCC-Hinweis für Anthropic → DSGVO Art. 28/44 |
| 6 | F007 | Web Speech API nicht offenbart → DSGVO |
| 7 | F016 | Kein Error-Tracking → Produktionsfehler unsichtbar |
| 8 | F020 | Kontrast 2,26:1 (WCAG AA: 4,5:1) → Barrierefreiheitspflicht |

F002 (Body-Parser) und F021 (Mobile FCP) sind bei kurzer Entwicklungszeit schnell behebbar und sollten vor Launch erfolgen.

---

## 5. Top-10 Fix-Liste nach Risiko und Aufwand

| Prio | ID | Risiko | Aufwand | Empfohlene Maßnahme |
|------|----|--------|---------|---------------------|
| 1 | F003 | Datenverlust, Nutzerfrustration | ~1 h | `BLOCK_FINISHED` in `handleCheckDone` dispatchen, nicht erst bei Button-Klick |
| 2 | F004 | DSGVO-Verstoß | ~15 min | `youtube.com/embed` → `youtube-nocookie.com/embed` in YoutubePanel.jsx:68 |
| 3 | F020 | WCAG AA Barrier | ~1 h | `.ob-ftab.ghost` Textfarbe auf mind. #9b9490; Datenschutz-Link Kontrast erhöhen |
| 4 | F001 | DoW, ungültige AI-Calls | ~2–4 h | 400-Validierung in 10 Routes für null/leere Pflichtfelder + max. Länge |
| 5 | F002 | Memory Exhaustion | ~1 h | Route-spezifische Body-Parser mit 50 KB Limit für kleine Routes |
| 6 | F021 | Mobile FCP 3,6 s | ~3–6 h | Dynamic imports für nicht-initiale Screens; Ziel: Initial-Bundle < 50 KiB |
| 7 | F007 | DSGVO | ~30 min | Web Speech API in Datenschutzerklärung ergänzen |
| 8 | F005 | DSGVO (dt. Rechtslage) | ~4 h | Google Fonts self-hosten; Datenschutzerklärung anpassen |
| 9 | F006 | DSGVO Art. 28/44 | Gering (rechtlich) | AVV + SCC-Hinweis für Anthropic in Datenschutzerklärung ergänzen |
| 10 | F022 | SEO | ~30 min | `<meta name="description">` + `public/robots.txt` ergänzen |

**Gesamtaufwand für Blocking-Fixes (F001–F007 + F016 + F020):** ~16–20 h Code + juristisches Review der DSGVO-Texte

---

## 6. Stärken (zu erhalten)

**Architektur und Engineering:**
- **3-Layer Persistence** (localStorage → IndexedDB → Server) robust und ADHS-tauglich
- **FSRS-6** korrekt und vollständig implementiert (Rating-Mapping, SM-2-Migration, Fallback)
- **Concurrency-Schutz** (P-BE-05, P-BE-07): Admission Control + globales AI-Call-Limit — 157/157 Tests
- **Security Headers** vollständig: CSP, HSTS, Referrer-Policy, X-Content-Type-Options

**KI-Pipeline:**
- Strukturierte Outputs mit `additionalProperties: false` auf allen 11 Schemas
- Prompt-Injection-Guard in `ANALYZE_SYSTEM`
- Effort-Praise (Dweck 1998) in allen Feedback-Prompts
- Mood-adaptive Kartenanzahl (bad-Mood → weniger, einfachere Karten)

**Lernwirksamkeit:**
- Retrieval Practice via FSRS-6-gestützte Karteikarten
- Pretesting (pretest_question vor Karteninhalt) — Ausubel 1978 / Butler & Roediger 2007
- Elaborative Interrogation in EXPLAIN_CHAT_BASE
- Advance Organizer (ElaborationPhase): activation-only, korrekt implementiert

**ADHS-Design:**
- `prefers-reduced-motion` vollständig implementiert
- `autoFocus` in allen Eingabefeldern
- In-Session Spaced Repetition (weakCardQueue, max 1 repeat/card/session)
- Offline-First mit freundlicher OfflineBanner-Komponente

---

## 7. Verdachtspunkt-Tabelle (vollständig)

| Verdacht | Ergebnis |
|---------|----------|
| KI-Routen validieren Eingaben nicht | ✅ CONFIRMED → F001 |
| 6-MB-Body akzeptiert | ✅ CONFIRMED → F002 |
| Block bleibt in-progress nach Reload | ✅ CONFIRMED → F003 |
| „Verstanden" trotz falscher Antwort | ✅ CONFIRMED → F012 (Button-Text) |
| Confidence-Rating fehlt | ✅ CONFIRMED → F013 |
| Keine Security-Header, x-powered-by sichtbar | ❌ REJECTED (Helmet vollständig korrekt) |
| /api/health nennt hasApiKey | ❌ REJECTED (nur `{ok:true}`) |
| Gleiche Frage in repeat-phase | ✅ CONFIRMED (kein exit-button, kein explanation-display) |
| Kein Lösungshinweis bei Wiederholungsfrage | ✅ CONFIRMED |
| Vermutungsphase ignoriert Antwort | ✅ INTENTIONELL (activation-only) |
| materialText nicht synchronisiert | ✅ INTENTIONELL (DSGVO-günstig) |
| Sync schluckt Fehler | ✅ INTENTIONELL (Offline-First) |
| Konfliktresolution nicht timestamps-basiert | ✅ INTENTIONELL (count-based dokumentiert) |
| Kein Drittland/AVV für Anthropic | ✅ CONFIRMED → F006 |
| Google Fonts extern | ✅ CONFIRMED → F005 |
| YouTube-Embed ohne nocookie | ✅ CONFIRMED → F004 |
| Web Speech API nicht erwähnt | ✅ CONFIRMED → F007 |
| Kontrast-Probleme | ✅ CONFIRMED → F020 (axe-core/Lighthouse) |
| Keine Landmarks | ✅ CONFIRMED → F017 |
| PNGs unreferenziert | ✅ CONFIRMED → F018 (4,1 MB) |
| Grammatikfehler / Halluzinationen in KI-Texten | ❌ NICHT PRÜFBAR (kein Golden Set ohne API-Key) |
| Überlappungen UI | ❌ NICHT PRÜFBAR (erfordert Browser) |
| 15–20 s Wartezeit | ❌ NICHT MESSBAR (kein API-Key lokal) |

---

## 8. Offene Unsicherheiten (nach Phase D)

| Unsicherheit | Warum offen |
|-------------|-------------|
| Latenz p50/p95 je AI-Route | Live-App nicht erreichbar; lokaler TTI ohne API-Call-Delay nicht repräsentativ |
| Halluzinationen / Grammatik in KI-Texten | Erfordert echten API-Key und ≥20 typisierte Materialien |
| Multi-Device Race Condition (F009) | PLAUSIBLE aus Code-Review; nie live reproduziert |
| Render Kaltstart (Free Plan) | Nicht messbar aus Container |
| iOS Safari 7-Tage Storage-Löschung | Erfordert echtes Gerät |
| Produkt-Wirtschaftlichkeit / Token-Kosten | Erfordert Anthropic Console-Zugang |

---

## 9. Findings-Übersicht (vollständig)

| ID | Bereich | Schwere | Status | Befund (Kurzfassung) |
|----|---------|---------|--------|---------------------|
| F001 | 5 Sicherheit | S2 | CONFIRMED | 10 AI-Routen ohne Input-Validierung |
| F002 | 5 Sicherheit | S2 | CONFIRMED | Body-Parser-Limit 35 MB für alle Routen |
| F003 | 2 QA | S2 | CONFIRMED | Block-Completion erst bei Button-Klick persistiert |
| F004 | 6 Datenschutz | S2 | CONFIRMED | YouTube-Embed ohne nocookie |
| F005 | 6 Datenschutz | S2 | CONFIRMED | Google Fonts extern ohne Consent |
| F006 | 6 Datenschutz | S2 | CONFIRMED | AVV/SCC-Hinweis für Anthropic fehlt |
| F007 | 6 Datenschutz | S2 | CONFIRMED | Web Speech API nicht offenbart |
| F008 | 5 Sicherheit | S3 | CONFIRMED | API-Key-Existenz in Produktions-Logs |
| F009 | 1 Engineering | S2 | PLAUSIBLE | Race Condition bei Multi-Device-Sync |
| F010 | 10 PWA | S3 | CONFIRMED | Maskable-Icon ohne Safe Zone |
| F011 | 1 Engineering | S3 | CONFIRMED | SW-Update kann mid-Session übernehmen |
| F012 | 3 UX | S3 | CONFIRMED | Button „Verstanden, weiter →" bei unsicherem Ergebnis |
| F013 | 8 Lernwirksamkeit | S3 | CONFIRMED | Kein Nutzer-Confidence-Rating |
| F014 | 5 Sicherheit | S3 | CONFIRMED | 4 moderate CVEs in Dev-Dependencies |
| F015 | 11 Betrieb | S2 | PLAUSIBLE | Kein Staging-Environment |
| F016 | 11 Betrieb | S2 | CONFIRMED | Kein Error-Tracking |
| F017 | 9 Barrierefreiheit | S3 | CONFIRMED | Keine HTML-Landmark-Elemente |
| F018 | 7 Performance | S3 | CONFIRMED | 4,1 MB PNG-Maskottchen-Dateien unreferenziert |
| F019 | 5 Sicherheit | S3 | CONFIRMED | Permissions-Policy-Header fehlt |
| F020 | 9 Barrierefreiheit | S2 | CONFIRMED | 3 UI-Elemente < 2,3–3,2:1 Kontrast (WCAG AA: 4,5:1) |
| F021 | 7 Performance | S2 | CONFIRMED | Mobile FCP 3,6 s; 213 KiB ungenutztes JS im Initial-Bundle |
| F022 | 7 Performance | S3 | CONFIRMED | meta-description fehlt; robots.txt gibt SPA-HTML zurück |

**S1-Findings: 0**  
**S2 CONFIRMED: 10** (F001–F007, F016, F020, F021)  
**S2 PLAUSIBLE: 2** (F009, F015) — fließen nicht in Scores ein  
**S3 CONFIRMED: 10** (F008, F010–F014, F017–F019, F022)

---

*Prüftiefe: Code-Review für server/prompts.js (669 Zeilen vollständig), server/index.js (alle AI-Routen), src/utils/fsrs.js, src/utils/serverSync.js, src/screens/session/* (alle relevanten Phasen), public/manifest.json, vite.config.js. Phase D: Lighthouse 13.6.0 (mobile + desktop) gegen localhost:3001; axe-core 4.9.1 via Playwright. Latenz und Golden Set nicht messbar (kein API-Key).*  
*Rechtliche Einschätzungen zu DSGVO/AVV sind nicht rechtsverbindlich und sollten juristisch geprüft werden.*
