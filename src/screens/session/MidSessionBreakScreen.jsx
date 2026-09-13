import LumoMascot from '../../components/LumoMascot.jsx';

// Overlay statt Phasenwechsel: legt sich über die laufende Chat-/Abrufphase,
// ohne sie zu unmounten – so bleiben Chatverlauf bzw. eingetippte Antwort
// erhalten, wenn der Nutzer zurückkommt.
export default function MidSessionBreakScreen({ onContinue }) {
  return (
    <div className="break-overlay">
      <div className="screen-content">
        <LumoMascot state="idle" />
        <h1 style={{ fontSize: '26px' }}>Gut gemacht.</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '16px', lineHeight: '1.5' }}>
          Komm zurück wenn du bereit bist.<br />
          Ich bin hier.
        </p>
        <button
          onClick={onContinue}
          style={{
            background: 'var(--gold)',
            color: '#1a1206',
            border: 'none',
            borderRadius: '12px',
            padding: '14px 32px',
            fontSize: '16px',
            fontWeight: '700',
            cursor: 'pointer',
          }}
        >
          Ich bin zurück
        </button>
      </div>
    </div>
  );
}
