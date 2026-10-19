import { useEffect, useState } from 'react';
import LumoMascot from '../components/LumoMascot.jsx';

const MESSAGES = [
  'Ich schaue mir dein Material an …',
  'Ich erkenne die Struktur …',
  'Ich teile in Lernblöcke auf …',
  'Ich schätze die Schwierigkeit ein …',
  'Fast fertig …',
];

// Fortschrittsschritte pro Nachricht: simuliert visuellen Fortschritt
// damit ADHS-Nutzer nicht in einem statischen Wartezustand "stecken" bleiben.
// Tatsächliche API-Dauer ist unbekannt – Werte sind bewusst konservativ geschätzt,
// damit der Balken nie bei 100% einfriert bevor die Antwort kommt.
const PROGRESS_STEPS = [0, 18, 36, 58, 78];

export default function AnalyzingScreen() {
  const [msgIndex, setMsgIndex] = useState(0);
  const [dotCount, setDotCount] = useState(1);

  useEffect(() => {
    const msgInterval = setInterval(() => {
      setMsgIndex((i) => Math.min(i + 1, MESSAGES.length - 1));
    }, 3000);
    return () => clearInterval(msgInterval);
  }, []);

  // Animierte Punkte als minimaler Aktivitätsindikator
  useEffect(() => {
    const dotInterval = setInterval(() => {
      setDotCount((d) => (d % 3) + 1);
    }, 500);
    return () => clearInterval(dotInterval);
  }, []);

  const progress = PROGRESS_STEPS[msgIndex] ?? 78;

  return (
    <div className="screen">
      <div className="screen-content" style={{ gap: '24px', maxWidth: '360px' }}>
        <LumoMascot state="thinking" />

        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '20px', lineHeight: '1.4', minHeight: '58px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {MESSAGES[msgIndex]}
          </h1>
        </div>

        {/* Fortschrittsbalken – visuelles Feedback dass etwas passiert */}
        <div style={{
          width: '100%',
          height: '4px',
          background: 'var(--bg-elevated)',
          borderRadius: '4px',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: 'var(--gold)',
            borderRadius: '4px',
            transition: 'width 2.4s cubic-bezier(0.4, 0, 0.2, 1)',
          }} />
        </div>

        {/* Pulsierende Aktivitätspunkte */}
        <p style={{
          color: 'var(--text-secondary)',
          fontSize: '14px',
          letterSpacing: '0.05em',
          margin: '-8px 0 0',
        }}>
          {'·'.repeat(dotCount)}{'  '}Lumo arbeitet
        </p>
      </div>
    </div>
  );
}
