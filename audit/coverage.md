# Lumo Release Audit — Prüfmatrix

Stand: Phasen A–E abgeschlossen — 18/18 Findings dokumentiert (16 CONFIRMED, 2 PLAUSIBLE)

## Prüfbereiche

| Nr | Bereich | Status | Methode | Konfidenz |
|----|---------|--------|---------|-----------|
| 1 | Engineering: Architektur, State-Management, Sync, Schema, Fehlerbehandlung | ✅ geprüft | Code-Review (App.jsx, appReducer.js, serverSync.js, server/index.js, fsrs.js) | mittel |
| 2 | QA und Funktion: Screens, Übergänge, Edge Cases, Upload, FSRS, Backup | 🔶 teilweise | Code-Review (SessionScreen.jsx, BlockCompletePhase.jsx, CheckUnderstandingPhase.jsx, appReducer.js) | mittel |
| 3 | Produktdesign und UX: Heuristiken, Walkthrough, Konsistenz, Texte | 🔶 teilweise | Code-Review (UI-Texte, Buttons, screen-Komponenten) | mittel |
| 4 | KI-Pipeline: Prompts, Validierung, Groundedness, Halluzinationen, Latenz | ✅ geprüft | Code-Review (server/prompts.js vollständig, 669 Zeilen; server/index.js alle AI-Routen) | mittel |
| 5 | Sicherheit: Auth, CSRF, CORS, Input, Upload, Secrets, CVEs, Headers | ✅ geprüft | Code-Review, npm audit, gitleaks-Output, Grep; SSRF-Prüfung YouTube-Route | hoch |
| 6 | Datenschutz und Recht: DSGVO, Einwilligung, Drittland, Datenschutzerklärung | ✅ geprüft | Code-Review (LegalScreen.jsx, index.html, YoutubePanel.jsx) | hoch |
| 7 | Performance: Lighthouse, Bundle, SW, Latenz, localStorage-Grenzen | 🔶 teilweise | dist/-Analyse, PNG-Grep; Lighthouse ausstehend (Browser-Phase) | niedrig |
| 8 | Lernwirksamkeit: Retrieval Practice, Spacing, Feedback, FSRS-Parameter | ✅ geprüft | Code-Review (CheckUnderstandingPhase, BlockCompletePhase, SessionScreen, fsrs.js, CardLearningPhase.jsx) | mittel |
| 9 | Barrierefreiheit und ADHS-Design: WCAG 2.2 AA, Tastatur, Fokus, Kontraste | 🔶 teilweise | Code-Review (index.css, App.jsx, DashboardScreen.jsx); axe-core/WCAG ausstehend | niedrig |
| 10 | Plattform und PWA: Manifest, Icons, Offline, Update-Flow, iOS/Android | ✅ geprüft | Code-Review (vite.config.js, manifest.json, SW-Update-Flow) | hoch |
| 11 | Betrieb und Release: Hosting, CI/CD, Monitoring, Backups, Rollback | ✅ geprüft | Code-Review (package.json, server health, Render-Konfiguration) | mittel |
| 12 | Produkt und Wirtschaftlichkeit: Wertversprechen, Zeit bis Aha, Kosten | ⬜ nicht geprüft | Browser-Phase ausstehend | niedrig |

## Legende
- ✅ geprüft — CONFIRMED/REJECTED
- 🔶 teilweise geprüft
- ⬜ offen
- ❌ nicht prüfbar (Grund angegeben)

---

## Nicht geprüft (mit Grund)

| Bereich | Prüfpunkt | Grund |
|---------|-----------|-------|
| 1 Engineering | madge (Zyklen), jscpd (Duplikate) | Tools nicht installiert |
| 1 Engineering | Schema-Versionierung / Migration | Kein Migrations-Framework gefunden — ggf. nicht vorhanden |
| 2 QA | FSRS-Parametervergleich mit ts-fsrs Referenz | Noch nicht geprüft |
| 2 QA | Backup-Export/-Import (korrupte Datei) | Noch nicht geprüft |
| 2 QA | Upload-Edge-Cases (Zip-Bomben, bösartige PDFs) | Noch nicht geprüft |
| 4 KI-Pipeline | Golden Set ≥20 Materialien mit Erwartungswerten | Zu kostenintensiv für Live-API; nur Stichproben möglich |
| 4 KI-Pipeline | k6-Lasttest gegen Staging | Keine Staging-Umgebung vorhanden |
| 4 KI-Pipeline | Alle Prompt-Texte in Detail | ✅ Vollständig gelesen — server/prompts.js 669 Zeilen komplett |
| 5 Sicherheit | ZAP-Baseline Vollscan | ZAP nicht installiert |
| 5 Sicherheit | Security-Header via curl (Live-App) | Externe HTTPS-Verbindungen im Cloud-Container geblockt |
| 5 Sicherheit | SSRF über YouTube-Route | ❌ REJECTED — Route fetcht nur hardcoded googleapis.com; concept/blockTitle nur als encodeURIComponent-Parameter |
| 7 Performance | Lighthouse Mobile/Desktop | Browser-Phase ausstehend |
| 7 Performance | Bundle-Größenanalyse im Detail | ✅ Geprüft — dist/ analysiert; F018 (4,1 MB unreferenzierte PNGs) CONFIRMED |
| 9 Barrierefreiheit | axe-core Scan | Browser-Phase ausstehend |
| 9 Barrierefreiheit | WCAG 2.2 AA vollständig | Browser-Phase ausstehend |
| 11 Betrieb | Backups des Server-State (Render) | Kein direkter Render-Admin-Zugang |
| 11 Betrieb | Kostenalarm Anthropic Console | Kein Zugang zur Anthropic Console |
| 12 Produkt | Zeit bis zum ersten Aha-Moment (live) | Browser-Phase ausstehend |
