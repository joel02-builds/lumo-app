import { useEffect, useState } from 'react';
import LumoMascot from '../../components/LumoMascot.jsx';

const READY_DELAY_MS = 2000;

export default function FocusRitualPhase({ onDone, block }) {
  const [canContinue, setCanContinue] = useState(false);
  const [breathePhase, setBreathePhase] = useState('in'); // 'in' | 'out'

  // Button erscheint erst nach 2 Sekunden – kurzer Pflichtmoment
  useEffect(() => {
    const timer = setTimeout(() => setCanContinue(true), READY_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  // Einfache Atem-Animation: 4 Sekunden ein, 4 Sekunden aus
  useEffect(() => {
    const interval = setInterval(() => {
      setBreathePhase((p) => (p === 'in' ? 'out' : 'in'));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="screen">
      <div className="screen-content" style={{ gap: '20px', maxWidth: '360px' }}>
        <LumoMascot state="idle" label="Lumo" />

        <div style={{ textAlign: 'center' }}>
          <p style={{
            fontSize: '13px',
            fontWeight: '600',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            color: 'var(--text-secondary)',
            marginBottom: '8px'
          }}>
            Nächster Block
          </p>
          <h1 style={{ fontSize: '24px', lineHeight: '1.3', marginBottom: '0' }}>
            {block?.title || 'Neuer Block'}
          </h1>
        </div>

        {/* Atem-Kreis */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px',
          margin: '8px 0'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(245, 166, 35, 0.15)',
            border: '2px solid rgba(245, 166, 35, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: breathePhase === 'in' ? 'scale(1.3)' : 'scale(0.85)',
            transition: 'transform 4s ease-in-out',
          }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'rgba(245, 166, 35, 0.6)',
              transform: breathePhase === 'in' ? 'scale(1.2)' : 'scale(0.7)',
              transition: 'transform 4s ease-in-out',
            }} />
          </div>
          <p style={{
            fontSize: '14px',
            color: 'var(--text-secondary)',
            margin: '0',
            transition: 'opacity 0.8s ease',
            opacity: 0.8,
          }}>
            {breathePhase === 'in' ? 'Einatmen …' : 'Ausatmen …'}
          </p>
        </div>

        <p style={{
          fontSize: '15px',
          color: 'var(--text-secondary)',
          textAlign: 'center',
          lineHeight: '1.5',
          margin: '0',
        }}>
          Leg das Handy weg. Mach das Fenster zu.<br />
          Dieser Block gehört dir.
        </p>

        <button
          className={canContinue ? 'lumo-btn lumo-btn--primary lumo-btn--ready' : 'lumo-btn lumo-btn--waiting'}
          onClick={() => canContinue && onDone()}
          disabled={!canContinue}
          style={{ marginTop: '8px', width: '100%' }}
        >
          {canContinue ? 'Ich bin bereit' : 'Einen Moment …'}
        </button>
      </div>
    </div>
  );
}
