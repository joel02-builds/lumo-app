import LumoMascot from '../../components/LumoMascot.jsx';

// Erster Schritt jedes Blocks: legt fest, wie tief Lumos Eröffnungserklärung startet.
export default function DepthChoicePhase({ onChoose }) {
  return (
    <div className="screen">
      <div className="screen-content">
        <LumoMascot state="learning" />
        <h1 style={{ fontSize: '22px', textAlign: 'center' }}>
          Was möchtest du wissen?
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px', textAlign: 'center' }}>
          Stell mir deine Frage – ich erkläre es dir.
        </p>
        <button
          onClick={() => onChoose('detailed')}
          style={{
            width: '100%',
            background: 'var(--gold)',
            color: '#1a1206',
            border: 'none',
            borderRadius: '12px',
            padding: '15px',
            fontSize: '16px',
            fontWeight: '700',
            cursor: 'pointer',
          }}
        >
          Zum freien Chat →
        </button>
      </div>
    </div>
  );
}
