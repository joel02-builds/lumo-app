import { useEffect, useState } from 'react';
import LumoMascot from '../../components/LumoMascot.jsx';
import Button from '../../components/Button.jsx';

const STATUS_META = {
  sicher: { label: 'Sicher verstanden' },
  unsicher: { label: 'Noch unsicher' },
  grosse_luecken: { label: 'Große Lücken' },
};

const TEXT_DELAY_MS = 800;

// Deterministisch verteilte Konfetti-Stücke (kein Zufall nötig, nur optische Streuung).
const CONFETTI_PIECES = Array.from({ length: 18 }, (_, i) => ({
  left: (i * 37) % 100,
  delay: (i % 6) * 0.12,
  duration: 1.8 + (i % 4) * 0.1,
  color: i % 3 === 0 ? '#ffe7b8' : '#f5a623',
}));

// Phase 4 – Block-Abschluss: Verstärkung je nach Ergebnis (Konfetti/Glow/Wippen),
// mit kurzer Verzögerung vor dem Text für einen dramatischeren Moment.
// "Pause machen" erfasst den Block sofort (onTakeBreak) und zeigt danach den
// eigenen Pause-Screen – "Fortschritt gespeichert" ist dort dann auch wahr.
export default function BlockCompletePhase({ block, result, onFinish, onTakeBreak }) {
  const status = result?.status || 'unsicher';
  const meta = STATUS_META[status];
  const bullets = [...(result?.goodPoints || []), ...(result?.uncertainPoints || [])].slice(0, 3);
  const [textVisible, setTextVisible] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setTextVisible(true);
      return undefined;
    }
    const timer = setTimeout(() => setTextVisible(true), TEXT_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  function buildPayload() {
    return {
      status,
      goodPoints: result?.goodPoints || [],
      uncertainPoints: result?.uncertainPoints || [],
    };
  }

  return (
    <div className="screen">
      <div className="screen-content">
        <div className={`reinforcement reinforcement--${status}`}>
          <LumoMascot state="complete" label="Block geschafft" />
          {status === 'sicher' && (
            <div className="confetti-container" aria-hidden="true">
              {CONFETTI_PIECES.map((p, i) => (
                <span
                  key={i}
                  className="confetti-piece"
                  style={{
                    left: `${p.left}%`,
                    animationDelay: `${p.delay}s`,
                    animationDuration: `${p.duration}s`,
                    backgroundColor: p.color,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {textVisible && (
          <div className="reinforcement-text">
            <h1>Block geschafft: {block.title}</h1>
            <span className={`verdict-badge verdict-block--${status}`}>{meta.label}</span>

            {status === 'grosse_luecken' && <p className="feedback-text">Du hast es versucht, das zählt.</p>}

            {bullets.length > 0 && (
              <ul className="complete-bullets">
                {bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            )}

            <div className="action-stack">
              <Button onClick={() => onFinish(buildPayload())}>Weiter zum nächsten Block</Button>
              <button className="text-link" onClick={() => onTakeBreak(buildPayload())}>
                Pause machen
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
