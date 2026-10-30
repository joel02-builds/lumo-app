// SessionTimer – Zeit-Orientierung für Menschen mit Zeitblindheit
//
// Design-Prinzipien (ADHS-spezifisch):
// • Kein nackter Zähler: "04:32" ist bedeutungslos. Kontext macht Zeit greifbar.
// • Kein Countdown-Druck: Kein "noch X Minuten". Das erzeugt Anxiety.
// • Progressive Sichtbarkeit: Timer wird erst nach 5 Min. auffälliger –
//   davor stört er den Lernfluss.
// • Sprache statt Zahl: "kurz dabeigeblieben" > "00:03:41"
//
// Props:
//   seconds        – vergangene Sekunden (von SessionScreen)
//   totalCards     – Gesamtzahl Karten in diesem Block (optional)
//   completedCards – Anzahl bereits abgeschlossener Karten (optional)
//   estimatedMin   – geschätzte Blockdauer in Minuten (von block.estimatedMinutes)

export default function SessionTimer({ seconds, totalCards, completedCards, estimatedMin }) {
  const minutes = Math.floor(seconds / 60);

  // Menschenlesbare Zeit
  function getTimeLabel(min) {
    if (min < 1) return 'gerade gestartet';
    if (min === 1) return '1 Min.';
    if (min < 5) return `${min} Min.`;
    if (min < 60) return `${min} Min.`;
    const h = Math.floor(min / 60);
    const rest = min % 60;
    return rest === 0 ? `${h} Std.` : `${h} Std. ${rest} Min.`;
  }

  // Kein zeitbasierter Kontext mehr – Zeitschätzungen erzeugen Versagensgefühl
  // wenn der Nutzer länger braucht. Fortschritt wird über Karten-Fortschritt angezeigt.
  function getContextLabel(_min, _est) {
    return null;
  }

  // Karten-Fortschritt: diskret, nur wenn verfügbar
  function getCardProgress(done, total) {
    if (!done || !total || total < 2) return null;
    if (done === 0) return null;
    if (done === total) return null; // Block ist fertig, kein Timer mehr nötig
    return `${done} von ${total}`;
  }

  // Progressive Sichtbarkeit:
  // < 2 Min: sehr leise (nur da, nicht lesbar)
  // 2-10 Min: dezent sichtbar
  // 10-20 Min: normal sichtbar
  // > 20 Min: leicht hervorgehoben – sanfte Erinnerung
  function getOpacity(min) {
    if (min < 2) return 0.2;
    if (min < 10) return 0.45;
    if (min < 20) return 0.6;
    return 0.85;
  }

  const timeLabel = getTimeLabel(minutes);
  const contextLabel = getContextLabel(minutes, estimatedMin);
  const cardProgress = getCardProgress(completedCards, totalCards);
  const opacity = getOpacity(minutes);
  const isLong = minutes >= 20;

  return (
    <div
      className="session-timer"
      aria-hidden="true"
      style={{ opacity, transition: 'opacity 2s ease' }}
    >
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '2px',
      }}>
        {/* Hauptzeile: Zeit + optionaler Kontext */}
        {/* P2-UX-07: sanfte Puls-Animation bei langen Sessions (≥20 Min).
            Kein Countdown-Druck — nur ein weiches "Du bist schon länger hier"-Signal.
            ADHS-safe: 2.5s Intervall, opacity 0.65 → 1 (kein agressives Blinken). */}
        <span style={{
          fontSize: '11px',
          color: isLong ? 'var(--gold)' : 'var(--text-secondary)',
          fontVariantNumeric: 'tabular-nums',
          fontWeight: isLong ? '600' : '400',
          transition: 'color 3s ease',
          whiteSpace: 'nowrap',
          animation: isLong ? 'lumo-timer-pulse 2.5s ease-in-out infinite' : 'none',
        }}>
          {minutes < 1 ? 'gestartet' : `${timeLabel} dabei`}
        </span>
        <style>{`
          @keyframes lumo-timer-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.65; }
          }
        `}</style>

        {/* Kontext-Zeile (nur wenn sinnvoll) */}
        {contextLabel && (
          <span style={{
            fontSize: '10px',
            color: 'var(--text-secondary)',
            opacity: 0.7,
            whiteSpace: 'nowrap',
          }}>
            {contextLabel}
          </span>
        )}

        {/* Karten-Fortschritt (nur wenn verfügbar + sinnvoll) */}
        {cardProgress && !contextLabel && (
          <span style={{
            fontSize: '10px',
            color: 'var(--text-secondary)',
            opacity: 0.6,
            whiteSpace: 'nowrap',
          }}>
            Karte {cardProgress}
          </span>
        )}
      </div>
    </div>
  );
}
