# ENTWURF – Entscheidungsliste Datenschutz (F006, F007)

> **Rechtlich zu prüfen, keine Rechtsberatung.**
> Diese Datei ist **kein** App-Text. Sie sammelt, was in `LegalScreen.jsx` bewusst **nicht** steht, weil es eine
> rechtliche Bewertung oder eine Tatsache braucht, die sich nicht aus dem Code belegen lässt. Jeder Punkt ist eine
> Frage an Joel bzw. an eine fachkundige Person. Stand der Code-Lage: 2026-11-24.
>
> Sie ersetzt die frühere Fassung aus dem Draft-PR #31 (Formulierungsvorschläge mit `[TODO prüfen]`). Texte mit
> offenen Punkten gehören nicht in die App.

## 1. Was im Code belegt und jetzt in der App korrigiert ist

| Änderung in `LegalScreen.jsx` | Beleg im Code |
|---|---|
| Statt „keine Lernmaterialien auf dem Server, nur Fortschrittsdaten": Aufzählung dessen, was der Sync speichert | `src/App.jsx` `buildSnapshot` (projectName, materialName, goalType, goalDate, sprintMode, blocks, recommendedOrder, subjectColor, learningStyle, subjectHistory, projects, activeProjectId, examResult, examResultAskedAt, blocksAnalyzedTotal, sessionsTotal, flashcards); `server/index.js` `POST /api/state` speichert den ganzen State außer `blocksAnalyzedTotal`; `server/db.js` `saveUserState` entfernt `fileBase64` und `materialText`; Block-Felder aus `server/prompts.js` `analyzeSchema` (title, content = KI-Kurzfassung, subtopics, difficulty, estimatedMinutes) und `appReducer.js` `BLOCK_FINISHED` (status, confidence, goodPoints, uncertainPoints, selfRating, completedAt), `SAVE_BLOCK_CARDS` |
| „Nicht auf den Server": hochgeladener Text/Datei und eigene Antworten | Snapshot enthält weder `materialText` noch Antworttexte; `saveUserState` streicht `materialText`/`fileBase64` |
| Wort „anonymisiert" entfernt, Hinweis auf möglichen Personenbezug | Kurzfassungen und KI-Hinweise geben Inhalte wieder (`content`, `goodPoints`, `uncertainPoints`) |
| Cookie-Tabelle: „lumo-app.de" ersetzt durch „Dieser Dienst" | Der Cookie wird von der ausliefernden Origin gesetzt (`server/index.js`); die produktive Adresse ist `FRONTEND_URL` (README: onrender.com) |
| Cookie „Inhalt": „UUID" ersetzt durch „zufälliger Code (64 Zeichen), Server speichert Hash" | `server/db.js`: `randomBytes(32).toString('hex')`, Spalte `session_hash` |
| Cookie-Eigenschaften ergänzt | `server/index.js` Cookie-Optionen: `httpOnly: true`, `secure: isProd`, `sameSite: isProd ? 'strict' : 'lax'`; Laufzeit 1 Jahr (`COOKIE_MAX_AGE`, `expires_at +1 year`) |
| Widerruf: „Synchronisation deaktivieren" ersetzt durch „Serverdaten löschen" | Es gibt keinen Schalter „Sync aus". `SettingsScreen.jsx` `handleDeleteServerData`: `DELETE /api/state` (löscht State, widerruft Session, löscht Cookie) und entfernt `lumo_cookie_consent` |
| Empfänger Cloudflare | Live-Antwortheader `Server: cloudflare`, `CF-RAY` (abgerufen 2026-11-22) |
| Empfänger YouTube / youtube-nocookie | `server/index.js` `/api/youtube-videos` (zuerst ein Anthropic-Aufruf mit `YOUTUBE_SEARCH_SYSTEM` aus Konzept und Blocktitel, dann YouTube Data API `googleapis.com`; ausgelöst per Klick im Kartenmenü, `CardLearningPhase.jsx` `setShowYoutube(true)`); `YoutubePanel.jsx`: Vorschaubild `<img src={video.thumbnail}>` direkt im Browser, Embed erst nach Tippen (`selectedVideo`) über `youtube-nocookie.com`; CSP `frameSrc` |
| Anthropic: Art der gesendeten Daten präzisiert (auch Antworten, Erklärungen, Chat) | `server/index.js`: `evaluate-understanding` (`userExplanation`), `evaluate-card-answer` (`userAnswer`), `explain-chat` (history) |
| Spracheingabe | `src/hooks/useSpeechInput.js`: Web Speech API des Browsers, Start erst nach Klick; Lumo erhält nur den erkannten Text (`onResult(text)`) |
| Rechte ergänzt: Art. 20, 21, Widerruf, Beschwerde (Art. 77); Weg zum Export | `SettingsScreen.jsx` „Backup exportieren" (JSON) |
| „Server-Logs … max. 7 Tage … nicht ausgewertet" entfernt, Abschnitt neutral „Hosting und Zugriffsdaten" | Dauer und Zweck sind im Code nicht belegt (siehe Frage 6) |

## 2. Entscheidungsliste (nichts davon steht in der App)

| Nr. | Thema | Frage | Warum nicht in der App |
|---|---|---|---|
| 1 | Rechtsgrundlagen (Art. 6 DSGVO) | Welche Rechtsgrundlage gilt je Verarbeitung: KI-Auswertung bei Anthropic, Server-Sync, Zugriffsdaten bei Render/Cloudflare, YouTube-Videosuche? Vertrag, Einwilligung oder berechtigtes Interesse? | Rechtliche Bewertung |
| 2 | Cookie `lumo_uid` (TDDDG) | Ist der Cookie zustimmungspflichtig nach TDDDG § 25, und genügt das aktuelle Banner („Fortschritt speichern?")? Ist die Einwilligung ausreichend informiert, solange der Text nur „anonymer Cookie" nennt? | Rechtliche Bewertung |
| 3 | Anthropic: Vertrag | Besteht ein Auftragsverarbeitungsvertrag (DPA) mit Anthropic für das genutzte API-Konto, in welcher Fassung und seit wann? | Tatsache, nicht aus dem Code |
| 4 | Anthropic: Drittland | Worauf stützt sich die Übermittlung in die USA (Standardvertragsklauseln, DPF-Zertifizierung)? Ist ein Transfer Impact Assessment nötig? | Rechtliche Bewertung und Tatsache |
| 5 | Anthropic: Aufbewahrung und Training | Wie lange speichert Anthropic API-Daten, und werden sie zum Training genutzt? (aus den aktuellen Anthropic-Unterlagen zu entnehmen, nicht zu raten) | Tatsache, nicht aus dem Code |
| 6 | Server-Logs | Stimmt die frühere Angabe „max. 7 Tage"? Wie lange halten Render **und** Cloudflare Zugriffsdaten tatsächlich, und wofür werden sie genutzt? | Tatsache, nicht aus dem Code (Angabe wurde aus der App entfernt) |
| 7 | Server-Region | In welcher Region läuft der Render-Dienst? Welche Übermittlungen sind dadurch Drittlandübermittlungen (Render, Cloudflare)? | Tatsache, nicht aus dem Code |
| 8 | Auftragsverarbeiter | Bestehen Verträge mit Render und Cloudflare? Was macht Cloudflare konkret (nur Weiterleitung oder auch Caching, Bot-Schutz, Analyse)? | Tatsache und rechtliche Bewertung |
| 9 | Art. 9 DSGVO | Zielgruppe Studierende mit ADHS: Können Material oder Antworten Gesundheitsdaten enthalten? Braucht es eine ausdrückliche Einwilligung oder einen Hinweis, keine Gesundheitsdaten einzugeben? | Rechtliche Bewertung |
| 10 | Minderjährige | Gilt das Angebot ab 16 oder auch für jüngere Nutzende? Falls ja: wie wird das geregelt? | Rechtliche Bewertung |
| 11 | Spracheingabe: Details | Was genau passiert in Safari/iOS, Edge, Chrome (Android)? Der App-Text nennt bewusst nur „Browser-Anbieter". Soll der Text pro Browser genauer werden, sobald das belegt ist? | Aus dem Code nicht belegbar |
| 12 | Spracheingabe: Hinweis vor erster Nutzung | Reicht der Absatz in der Erklärung, oder soll zusätzlich vor dem ersten Mikrofon-Tippen ein kurzer Hinweis erscheinen („Dein Browser wandelt den Ton in Text um und sendet ihn dafür an seinen Anbieter. Du kannst auch tippen.")? Ist das Tippen auf den Knopf eine wirksame Einwilligung (Art. 6 Abs. 1 lit. a)? | Rechtliche Bewertung und UI-Entscheidung |
| 13 | YouTube: Vorschaubilder | Der Browser lädt Vorschaubilder von der URL, die die YouTube-API liefert, sobald die Vorschläge erscheinen, also vor dem Antippen. Soll das erst nach einem Klick passieren oder ganz ohne Bilder? Aus welcher Domain kommen die Bilder? (im Code steht nur `snippet.thumbnails.medium.url`) | Produktentscheidung und Tatsache |
| 14 | YouTube: Videosuche aktiv? | Ist `YOUTUBE_API_KEY` auf dem Live-Server gesetzt? Ohne Schlüssel gibt es nur den Link zur YouTube-Suche, und die Erklärung wäre zu weit gefasst. | Konfiguration, nicht aus dem Code |
| 15 | Cookie-Anbieter | Wie soll der „Anbieter" in der Cookie-Tabelle heißen (Name und Anschrift des Verantwortlichen statt „Dieser Dienst")? Gehört `lumo-app.de`? In `SettingsScreen.jsx` steht noch `feedback@lumo-app.de` als Feedback-Adresse. | Tatsache |
| 16 | Widerruf des Server-Sync | Soll es einen eigenen Schalter „Server-Sync aus" geben? Aktuell setzt „Serverdaten löschen" die Zustimmung zurück; ob der laufende Sync danach bis zum nächsten Neuladen weitersendet, wurde im Code gelesen, aber nicht live geprüft. | Produktentscheidung, nicht geprüft |
| 17 | Löschfristen Server-Daten | Gibt es eine automatische Löschung inaktiver Nutzer? Im Code wurde keine gefunden (nicht vollständig geprüft); die Session läuft nach 1 Jahr ab. Welche Frist soll in der Erklärung stehen? | Tatsache und rechtliche Bewertung |
| 18 | Aufsichtsbehörde | Soll die zuständige Behörde namentlich genannt werden (Sitz des Verantwortlichen: Niedersachsen)? | Rechtliche Bewertung |
| 19 | Verzeichnis und Folgenabschätzung | Verzeichnis der Verarbeitungstätigkeiten (Art. 30), Datenschutz-Folgenabschätzung (Art. 35) nötig? | Rechtliche Bewertung |
| 20 | Nutzungsbedingungen | Abschnitt 4 („Weitergabe an Anthropic") und die neue Datenschutz-Beschreibung widerspruchsfrei? Soll die Einräumung des „Rechts zur Verarbeitung" so bleiben? | Rechtliche Bewertung |

## 3. Status der Findings

- F006 (Drittland/Anthropic) und F007 (Web Speech) bleiben **CONFIRMED**, bis die Punkte 1 bis 5 und 11 bis 12 entschieden sind.
- Die in der App korrigierten Aussagen (Abschnitt 1) beheben nur die Widersprüche zum Code, nicht F006/F007 selbst.
