const MASCOT_STATES = {
  idle:      '/mascot/lumo-idle.png',
  learning:  '/mascot/lumo-learning.png',
  complete:  '/mascot/lumo-complete.png',
  thinking:  '/mascot/lumo-thinking.png',
  cheer:     '/mascot/lumo-cheer.png',
};

const FALLBACKS = {
  idle:     'idle',
  learning: 'idle',
  complete: 'idle',
  thinking: 'idle',
  cheer:    'idle',
};

export default function LumoMascot({ state = 'idle', label, size = 'normal', pulseOnce }) {
  const src = MASCOT_STATES[state] || MASCOT_STATES.idle;
  const px = size === 'small' ? 40 : 100;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '6px',
    }}>
      <img
        src={src}
        alt={`Lumo ${state}`}
        width={px}
        height={px}
        style={{
          objectFit: 'contain',
          animation: pulseOnce
            ? 'lumo-pulse-once 0.6s ease-out'
            : state === 'thinking'
            ? 'lumo-breathe 3s ease-in-out infinite'
            : state === 'cheer'
            ? 'lumo-bounce 0.8s ease-in-out infinite alternate'
            : 'none',
          filter: state === 'complete'
            ? 'drop-shadow(0 0 12px rgba(212,168,67,0.6))'
            : 'none',
          transition: 'all 0.3s ease',
        }}
        onError={(e) => {
          e.target.style.display = 'none';
        }}
      />
    </div>
  );
}
