import './LumoMascot.css';

const SOURCES = {
  idle: '/mascot/lumo-idle.png',
  learning: '/mascot/lumo-learning.png',
  complete: '/mascot/lumo-complete.png',
};

const SIZES = {
  idle: 100,
  learning: 130,
  complete: 160,
};

const BASE_ANIMATIONS = {
  idle: 'lumo-pulse-idle 3s ease-in-out infinite',
  learning: 'lumo-float-learning 2s ease-in-out infinite',
  complete: 'lumo-complete-flash 1.2s ease-out',
};

// state: 'idle' | 'learning' | 'complete' — echtes PNG-Artwork (Ring/Partikel
// sind bereits Teil der Bilder, keine CSS-Overlays mehr nötig).
// pulseOnce: zusätzlicher einmaliger Licht-Flash (z. B. bei Phasenübergängen),
// läuft parallel zur Loop-Animation, da beide unterschiedliche Properties animieren.
export default function LumoMascot({ state = 'idle', label, pulseOnce = false }) {
  const size = SIZES[state] || SIZES.idle;
  const style = pulseOnce
    ? { animation: `${BASE_ANIMATIONS[state]}, lumo-flash-once 0.6s ease-out` }
    : undefined;

  return (
    <img
      src={SOURCES[state] || SOURCES.idle}
      width={size}
      alt={label || 'Lumo'}
      className={`lumo-mascot lumo-mascot--${state}`}
      style={style}
    />
  );
}
