// Persistenter Schriftzug oben links, auf allen Screens außer dem Welcome-Screen.
// Klick führt immer zurück zum Dashboard.
// hidden: blendet die Wordmark komplett aus – für Screens mit eigenem Header
// (z. B. CardLearningPhase, ExplainChatPhase), die sonst mit ihr kollidieren.
export default function LumoWordmark({ onClick, hidden = false }) {
  return (
    <button
      type="button"
      className="lumo-wordmark-wrapper"
      onClick={onClick}
      style={{
        position: 'fixed',
        top: '24px',
        left: '24px',
        zIndex: 10,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        display: hidden ? 'none' : 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '4px 8px',
        borderRadius: '8px',
        transition: 'opacity 0.15s ease',
      }}
      onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
      onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
    >
      <img
        src="/mascot/lumo-idle.png"
        alt="Lumo"
        width={28}
        height={28}
        style={{ objectFit: 'contain' }}
      />
      <span style={{
        fontFamily: "'Nunito', sans-serif",
        fontWeight: '800',
        fontSize: '20px',
        background: 'linear-gradient(135deg, #FFE8A0 0%, #D4A843 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        letterSpacing: '-0.3px',
      }}>
        lumo
      </span>
    </button>
  );
}
