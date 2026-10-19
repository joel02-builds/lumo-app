import LumoMascot from '../../components/LumoMascot.jsx';

// Übergang zum freien Erklärungs-Chat – wird nur aufgerufen wenn der User
// in der CardLearningPhase aktiv "Frag Lumo" wählt.
export default function DepthChoicePhase({ onChoose }) {
  return (
    <div className="screen">
      <div className="screen-content">
        <LumoMascot state="learning" />
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '22px', marginBottom: '8px' }}>
            Ich erkläre es dir.
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px', lineHeight: '1.5', margin: '0' }}>
            Stell mir jede Frage zum Thema – ich bin dabei.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
          <button
            onClick={() => onChoose('simple')}
            style={{
              width: '100%',
              background: 'var(--gold)',
              color: '#1a1206',
              border: 'none',
              borderRadius: '12px',
              padding: '16px',
              fontSize: '15px',
              fontWeight: '700',
              cursor: 'pointer',
            }}
          >
            Einfach erklären →
          </button>
          <button
            onClick={() => onChoose('detailed')}
            style={{
              width: '100%',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '16px',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Tief einsteigen →
          </button>
        </div>
      </div>
    </div>
  );
}
