import LumoMascot from './LumoMascot.jsx';

// Nicht-modale Empfehlung nach 20 aktiven Lernminuten, erscheint als sanfter
// Streifen unter dem aktuellen Inhalt statt als störendes Modal.
export default function BreakSuggestionToast({ onBreak, onContinue }) {
  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'var(--bg-card)',
      border: '1px solid var(--gold)',
      borderRadius: '16px',
      padding: '16px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      zIndex: 100,
      maxWidth: '480px',
      width: 'calc(100% - 48px)',
    }}>
      <LumoMascot state="cheer" size="small" />
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 2px' }}>
          20 Minuten. Starke Leistung.
        </p>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0' }}>
          Eine kurze Pause jetzt hilft dem Gedächtnis.
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
        <button
          onClick={onBreak}
          style={{
            background: 'var(--gold)',
            color: '#1a1206',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 14px',
            fontSize: '13px',
            fontWeight: '700',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Pause machen
        </button>
        <button
          onClick={onContinue}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            fontSize: '12px',
            cursor: 'pointer',
            padding: '4px',
          }}
        >
          Weitermachen
        </button>
      </div>
    </div>
  );
}
