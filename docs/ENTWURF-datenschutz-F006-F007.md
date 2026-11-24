# ENTWURF – Textvorschläge für die Datenschutzerklärung (F006, F007)

> **Rechtlich zu prüfen, keine Rechtsberatung.**
> Das sind Formulierungsvorschläge, keine geprüften Texte. Sie sind **nicht** in die App
> eingebaut (`LegalScreen.jsx` ist unverändert). Vor einer Übernahme muss eine
> fachkundige Person (Anwältin/Anwalt oder Datenschutzbeauftragte/r) Inhalt und
> Vollständigkeit prüfen. Stand der Code-Lage: 2026-11-21.

## Was im Code belegt ist (Grundlage der Texte)

| Aussage | Beleg |
|---|---|
| Lerninhalt (eingefügter Text, TXT, PDF-Inhalt) und Antworten/Erklärungen der Nutzenden gehen an die Claude-API von Anthropic. | `server/index.js` (alle `askLumo`-Routen), `server/prompts.js` |
| Die Anfragen kommen von **unserem Server**, nicht vom Gerät der Nutzenden. Anthropic sieht also die Server-IP, nicht die IP der Nutzenden. | Alle KI-Aufrufe laufen über `/api/*` |
| Namen, E-Mail-Adressen oder Standort werden nicht mitgeschickt; was in Lernmaterial oder Antworten steht, kann aber Personenbezug enthalten. | Routen senden nur Material/Antworttexte; Nutzende können frei Text eingeben |
| Spracheingabe ist optional und startet erst nach Klick auf den Mikrofon-Button. | `src/hooks/useSpeechInput.js` (Kommentar „erst beim Klick“), genutzt in `CheckUnderstandingPhase.jsx` und `ExplainChatPhase.jsx` |
| Die Spracherkennung läuft über die **Web Speech API des Browsers** (`SpeechRecognition` / `webkitSpeechRecognition`); Lumo bekommt nur den erkannten Text. | `useSpeechInput.js` |
| Der Permissions-Policy-Header erlaubt das Mikrofon nur für die eigene Origin. | PR F019 |

## Was **nicht** aus dem Code hervorgeht und geklärt werden muss

1. **Besteht ein Auftragsverarbeitungsvertrag (AVV/DPA) mit Anthropic, und welche Fassung?**
   Der Befund F006 verweist auf ein öffentlich dokumentiertes Data Processing Addendum mit
   Standardvertragsklauseln. Das habe ich **nicht geprüft**. Joel muss klären, ob das DPA für
   das genutzte API-Konto gilt/abgeschlossen ist, und die Fassung ablegen.
2. **Wo liegt der Server?** (Render-Region; der Befund Abschnitt „Server-Logs“ nennt Render.)
   Relevant für die Frage, welche Übermittlungen überhaupt Drittlandübermittlungen sind.
3. **Speichert oder trainiert Anthropic mit API-Daten, und wie lange?** Aufbewahrung und
   Zweckbindung sind aus Anthropics Unterlagen zu entnehmen, nicht zu raten.
4. **Rechtsgrundlage** der Verarbeitung (Vertragserfüllung Art. 6 Abs. 1 lit. b DSGVO?
   Einwilligung?). Besonders heikel: Zielgruppe mit ADHS; wenn Material oder Antworten
   Gesundheitsbezug haben könnten, steht Art. 9 DSGVO im Raum.
5. **Transfer Impact Assessment (TIA)** und ob zusätzliche Maßnahmen nötig sind.
6. **Minderjährige:** Gilt das Angebot für unter 16-Jährige?

## Vorschlag A – F006: Anthropic (ersetzt/ergänzt Abschnitt „Werden Daten an externe Dienste gesendet?“)

> **4. Werden Daten an externe Dienste gesendet?**
>
> Ja. Wenn du eine Lernsession startest, sendet Lumo den Lerninhalt, den du eingegeben oder
> hochgeladen hast, sowie deine Antworten und Erklärungen an die Programmierschnittstelle (API)
> von Anthropic (Anthropic PBC, USA), damit Lumo daraus Lernkarten und Rückmeldungen erstellen kann.
>
> **Welche Daten:** nur die Texte, die du in Lumo eingibst oder hochlädst (Lernmaterial, deine
> Antworten, Nachfragen im Chat). Namen, E-Mail-Adressen oder deinen Standort senden wir nicht mit.
> Bitte gib in Lernmaterial und Antworten keine Daten ein, die du nicht übertragen möchtest –
> was du schreibst, wird so übertragen, wie du es schreibst.
>
> **Wer sendet:** Die Anfrage kommt von unserem Server, nicht von deinem Gerät. Anthropic sieht
> deshalb nicht deine IP-Adresse.
>
> **Zweck:** ausschließlich die Bereitstellung der Lumo-Funktionen.
>
> **Übermittlung in die USA:** Anthropic verarbeitet die Daten in den USA. Die Übermittlung
> stützt sich auf **[TODO prüfen: Standardvertragsklauseln der EU-Kommission nach Art. 46 Abs. 2
> lit. c DSGVO im Auftragsverarbeitungsvertrag mit Anthropic / ggf. Angemessenheitsbeschluss bei
> Zertifizierung unter dem EU-US Data Privacy Framework]**. Mit Anthropic besteht ein
> Auftragsverarbeitungsvertrag nach Art. 28 DSGVO **[TODO: nur schreiben, wenn tatsächlich
> abgeschlossen; Fassung und Datum festhalten]**.
>
> **Speicherdauer bei Anthropic:** **[TODO: aus den aktuellen Anthropic-Unterlagen übernehmen,
> nicht raten]**.
>
> Weitere Informationen: Datenschutzrichtlinie von Anthropic, anthropic.com/privacy.

## Vorschlag B – F007: Spracheingabe (neuer Abschnitt, z. B. „Spracheingabe (optional)“)

> **Spracheingabe (optional)**
>
> In manchen Bereichen von Lumo kannst du deine Antwort einsprechen, statt sie zu tippen. Das
> passiert nur, wenn du selbst auf den Mikrofon-Button tippst. Ohne diesen Klick wird dein Mikrofon
> nicht benutzt.
>
> Die Umwandlung von Sprache in Text übernimmt **dein Browser**, nicht Lumo. Je nach Browser wird
> dein Ton dafür an den Anbieter des Browsers übertragen und dort verarbeitet:
> in **Google Chrome** an Google, in **Safari** an Apple. Lumo selbst erhält nur den erkannten Text
> und speichert keine Tonaufnahmen. Welche Daten dein Browser-Anbieter dabei verarbeitet, regelt
> dessen Datenschutzerklärung. Wenn du das nicht möchtest, tippe deine Antwort einfach.
>
> Rechtsgrundlage ist deine Einwilligung durch das Tippen auf den Mikrofon-Button
> (Art. 6 Abs. 1 lit. a DSGVO) **[TODO prüfen]**. Du kannst die Aufnahme jederzeit beenden und
> die Mikrofon-Freigabe in den Einstellungen deines Browsers entziehen.

Hinweis zur Genauigkeit: Dass Chrome Audio an Google-Server schickt, ist der Befund F007
(unverifiziert hier). Für Safari/Apple und Firefox (keine Unterstützung) ist die Formulierung
**noch zu verifizieren**, bevor sie veröffentlicht wird.

## Vorschlag C – kurzer Hinweis an der Stelle der Nutzung (optional, UI-Text)

> Sprachaufnahme: Dein Browser wandelt den Ton in Text um und sendet ihn dafür an seinen Anbieter.
> Du kannst auch tippen.

(Erscheint beim ersten Tippen auf den Mikrofon-Button, mit einer ruhigen „Verstanden“-Schaltfläche;
wäre eine UI-Änderung und ist **nicht** Teil dieses Entwurfs.)

## Folgeänderungen im Text, falls Vorschlag A/B übernommen wird

- Die Aussage in den Nutzungsbedingungen („Weitergabe an Anthropic“) und im Datenschutzteil
  „Wir senden keine personenbezogenen Daten …“ nochmals auf Widerspruchsfreiheit prüfen:
  Freitext kann Personenbezug enthalten.
- Übersicht/Verzeichnis der Verarbeitungstätigkeiten (Art. 30 DSGVO) ergänzen.
- Findings F006/F007 erst nach juristischer Freigabe und Einbau auf FIXED setzen.
