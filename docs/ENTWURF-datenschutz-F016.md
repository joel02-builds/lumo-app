# ENTWURF – Datenschutzerklärung zum Fehler-Log (F016)

> **Rechtlich zu prüfen, keine Rechtsberatung.**
> Formulierungsvorschlag, nicht in die App eingebaut (`LegalScreen.jsx` ist unverändert).
> Vor einer Übernahme von einer fachkundigen Person prüfen lassen.

## Was der Code tatsächlich tut (Grundlage)

- Bei einem Programmfehler im Browser sendet Lumo `POST /api/client-error` mit **nur** drei Angaben:
  Fehlerart (`boundary`, `error` oder `unhandledrejection`), Name des aktuellen Bildschirms
  (z. B. `dashboard`) und eine auf 200 Zeichen gekürzte technische Meldung.
- Vor dem Senden und noch einmal auf dem Server werden Text in Anführungszeichen, E-Mail-Adressen
  und Web-Adressen aus der Meldung entfernt. Kein Stack-Trace, keine Lerninhalte, kein Cookie
  (`credentials: 'omit'`), keine Nutzer-Kennung.
- Der Server schreibt eine Zeile ins Betriebs-Log. **Nicht** protokolliert werden IP-Adresse,
  User-Agent und Cookie von dieser Route; es wird nichts in der Datenbank gespeichert.
- Höchstens 5 Meldungen pro Seitenaufruf; serverseitig 20 Meldungen je 10 Minuten und IP.
- **Offen:** Der Hosting-Anbieter (Render) protokolliert Zugriffe, darunter auch Aufrufe dieser
  Route, mit IP-Adresse in seinen eigenen Server-Logs (siehe bestehender Abschnitt „Server-Logs“,
  7 Tage). Das ist nicht Teil des Lumo-Codes und muss im Text mitbedacht werden.

## Vorschlag – kurzer Satz (z. B. als Ergänzung im Abschnitt „6. Server-Logs“)

> Wenn in Lumo ein technischer Fehler auftritt, sendet die App automatisch eine kurze Meldung an
> unseren Server: die Art des Fehlers, den Namen des Bildschirms, auf dem er auftrat, und einen
> gekürzten technischen Fehlertext. Deine Lerninhalte, Antworten oder Namen sind darin nicht
> enthalten; wir entfernen darin vorkommende Textstellen in Anführungszeichen, E-Mail-Adressen und
> Web-Adressen. Die Meldung dient ausschließlich dazu, Fehler zu finden und zu beheben, wird nur
> im Server-Log vermerkt und nicht mit dir als Person verknüpft.

## Zu klären, bevor der Text veröffentlicht wird

1. **Rechtsgrundlage** (z. B. berechtigtes Interesse an der Fehlerbehebung, Art. 6 Abs. 1 lit. f DSGVO)
   und ob die Meldung ohne Einwilligung zulässig ist, da sie nichts auf dem Gerät speichert und
   keine Kennung enthält (ePrivacy/TTDSG-Einschätzung).
2. **Bleibt die Aussage „nicht mit dir verknüpft“ richtig?** Der Hoster sieht die IP-Adresse des
   Aufrufs; im Lumo-Log steht sie nicht. Formulierung mit dem Hoster-Log abstimmen.
3. **Aufbewahrung** der Server-Logs (bisher: Hoster, max. 7 Tage laut bestehendem Text) bestätigen.
4. Die Bereinigung ist ein **Bestmöglich-Filter**. Fehlertexte des Browsers sind technisch, können
   aber selten Textstücke zitieren, die nicht in Anführungszeichen stehen. Ob „enthält keine
   Lerninhalte“ als Zusage taugt oder abgeschwächt werden muss („soll keine … enthalten“), ist zu prüfen.
5. Eintrag im Verzeichnis der Verarbeitungstätigkeiten (Art. 30 DSGVO) ergänzen.
