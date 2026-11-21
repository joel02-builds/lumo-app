# Persistente Server-Daten auf Render (F033)

Stand: 2026-11-21. Das ist eine **Vorbereitung**: Im Code und in `render.yaml` ist nichts umgeschaltet.
Ob und wann umgestellt wird, ist deine Entscheidung (Kosten, Hosting-Wahl).

## Ausgangslage

- Der Server legt seine SQLite-Datei in `$DB_PATH/lumo.db` ab (`server/db.js`). In Produktion bricht er
  ohne `DB_PATH` ab.
- Auf Render Free ist das Dateisystem flüchtig. Steht `DB_PATH` auf `/tmp` (oder einem anderen Ort ohne
  Disk), **gehen alle Server-Stände bei jedem Deploy und Neustart verloren**: Sitzungen, die Server-Kopie
  des Lernstands, Streak, Free-Limit-Zähler.
- Seit diesem PR schreibt der Server beim Start in Produktion eine Warnzeile, wenn `DB_PATH` unter `/tmp`,
  `/var/tmp` oder dem Systemtemp liegt:
  `[DB] WARNUNG: DB_PATH ist flüchtig, Server-Daten gehen bei Deploy/Neustart verloren. …`
  Die Warnung ändert nichts am Verhalten und erkennt nur diese Orte (andere flüchtige Pfade nicht).
- Das Hosting ist nicht eindeutig: Im Repo liegen `render.yaml` **und** `railway.json`. Welcher Wert für
  `DB_PATH` im Dashboard steht, ist aus dem Repo nicht ersichtlich. Prüfe es dort und im Start-Log.

## Umschalten auf eine Persistent Disk (Render)

Voraussetzung, bitte vorab in der Render-Dokumentation/im Dashboard prüfen (nicht aus dem Repo ableitbar):
welcher Instanztyp Disks erlaubt, was Instanztyp und Disk kosten, und wie Deploys mit Disk ablaufen
(Render nennt Einschränkungen wie genau eine Instanz).

1. **Backup der Lage notieren:** Aktuellen `DB_PATH` im Dashboard (Environment) notieren. Bei `/tmp` gibt es
   nichts zu sichern, die Daten sind ohnehin flüchtig (die Clients schicken ihren Stand wieder hoch, siehe
   unten).
2. **Instanztyp** auf einen Typ ändern, der Disks erlaubt (die Vorlage nennt `starter`).
3. **Disk anlegen:** Dashboard → Service → Disks → Add Disk: Name `lumo-data`, Mount Path `/data`, Größe 1 GB.
   Alternativ in `render.yaml` die auskommentierte Vorlage einkommentieren (`plan: starter` und den
   `disk:`-Block) – dann greift sie beim nächsten Sync des Blueprints.
4. **`DB_PATH=/data`** im Dashboard setzen (Environment). `FRONTEND_URL` und `ANTHROPIC_API_KEY` bleiben.
5. **Deployen** und im Start-Log prüfen:
   - `[DB] SQLite initialisiert: /data/lumo.db` steht da,
   - die Zeile `DB_PATH ist flüchtig` steht **nicht** da.
6. **Neustart-Probe:** Die Datei muss einen Neustart überleben. Im Dashboard unter „Shell“ `ls -l /data`
   ausführen (`lumo.db` ist da, Größe und Zeitstempel notieren), dann „Manual Restart“ und danach wieder
   `ls -l /data`: Die Datei ist noch da und mindestens so groß wie vorher. Beobachte dabei nicht die App:
   Dort würde auch ein leerer Server nichts bemerkbar machen, weil die Clients ihren Stand selbst wieder
   hochschicken (siehe Befund unten).

**Rückfall:** `DB_PATH` zurück auf den alten Wert setzen. Die Daten auf der Disk bleiben erhalten, werden
aber nicht mehr benutzt.

## Befund: Was passiert, wenn der Server leer startet und ein Client mit altem Stand synct? (3e)

Nur beobachtet, nichts geändert. Nachgestellt mit einem leeren Server (frische Temp-DB) und einem
Client, der ein formal gültiges, dem Server aber unbekanntes `lumo_uid`-Cookie mitbringt:

| Schritt | Beobachtung |
|---|---|
| 1. App-Start: `GET /api/state` | HTTP 200, `{"state":null}`; der Server stellt eine **neue anonyme Sitzung** aus und setzt ein neues Cookie (`startAnonymousSession` in `server/index.js`, nur auf `/api/state*`). Das alte Cookie ist nutzlos geworden. |
| Client | `serverResult.state` ist `null` → **kein Merge**, der lokale Stand bleibt unangetastet (`App.jsx`, Hydration). |
| 2. etwa 2 s später: `POST /api/state` | Der Client schickt seinen lokalen Stand (Speichern-Effekt), mit dem **neuen** Cookie; der Server speichert ihn als Stand des neuen Nutzers. Ein Merge ist nicht nötig, es gibt nichts zu überschreiben. |
| 3. nächster Start: `GET /api/state` | liefert genau diesen Stand zurück (Blöcke, Karten inkl. FSRS-Felder). |

**Folgen:**
- **Lernstand und FSRS-Daten gehen nicht verloren**, solange der Client seinen lokalen Stand hat: Er stellt die
  Server-Kopie von selbst wieder her. Verloren ist nur, was **ausschließlich** auf dem Server lag:
  - der **Free-Limit-Zähler** (`users.blocks_analyzed_total`): Im Test 0, obwohl der Client lokal 6 hatte. Das
    Limit von 20 Blöcken beginnt damit von vorn (der Server ist die einzige durchsetzende Stelle),
  - der **serverseitige Streak**,
  - die **alte Identität** (neuer Nutzer, neues Cookie).
- Echter Datenverlust entsteht nur, wenn Server **und** Browser gleichzeitig leer sind (z. B. Browser-Daten
  gelöscht und Server ohne Disk neu gestartet).
- Wer „Nur lokal“ gewählt hat, ist nicht betroffen (keine Server-Identität).
- Dieser Abschnitt beschreibt den Zustand **ohne** Disk. Mit Disk tritt er nur nach einem manuellen Zurücksetzen
  oder einem Wechsel des Speicherorts ein.

## Textvorschlag für den iPhone-Installationshinweis (3c)

Befund: `src/components/InstallBanner.jsx` erklärt die Installation auf dem iPhone bereits **in drei Schritten
mit Symbolen** („Tippe auf das Teilen-Symbol“ → „‚Zum Home-Bildschirm‘ wählen“ → „‚Hinzufügen‘ tippen –
fertig!“). Es fehlt nur das **Warum**. Auf dem iPhone löscht Safari laut dem Kommentar in
`src/utils/storage.js` gespeicherte Website-Daten nach 7 Tagen ohne Nutzung („7-Tage-Regel“; hier nicht
unabhängig geprüft). Eine installierte Web-App unterliegt dem nach Apples Angabe nicht.

Vorschlag, nur Text, kein Umbau:

- Untertitel im Banner (statt „In 3 Sekunden auf dem Home-Bildschirm“):
  **„Auf dem Home-Bildschirm bleibt dein Lernstand sicher.“**
- Zusatzzeile im Schritte-Blatt, unter „Füge Lumo zu deinem Home-Bildschirm hinzu – dauert 10 Sekunden.“:
  **„Safari löscht gespeicherte Daten von Websites, die du eine Woche nicht öffnest. Als App auf dem
  Home-Bildschirm bleibt dein Fortschritt erhalten.“**

Offen (nicht Teil dieses PR): Die Erkennung `isIOS()` greift beim iPad mit iPadOS 13+ nicht (es meldet sich
wie ein Mac); dort erscheint der iPhone-Hinweis nicht.
