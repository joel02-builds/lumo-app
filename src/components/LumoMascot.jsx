import './LumoMascot.css';

const SOURCES = {
  idle: '/mascot/lumo-idle.png',
  learning: '/mascot/lumo-learning.png',
  // Kein eigenes "Nachdenken"-Artwork vorhanden – nutzt das ruhigere Idle-Bild,
  // unterscheidet sich aber über eine eigene, dezente Animation (siehe unten).
  thinking: '/mascot/lumo-idle.png',
  // Kein eigenes "Freu dich"-Artwork – das Complete-Bild passt vom Ausdruck
  // her am besten zu kurzem, positivem Karten-Feedback.
  cheer: '/mascot/lumo-complete.png',
  complete: '/mascot/lumo-complete.png',
};

const SIZES = {
  idle: 100,
  learning: 130,
  thinking: 100,
  cheer: 100,
  complete: 160,
};

// Fixe Pixelgrößen für kompakte Kontexte (z. B. Chat-Header), unabhängig vom state.
const SIZE_OVERRIDES = {
  small: 40,
};

const BASE_ANIMATIONS = {
  idle: 'lumo-pulse-idle 3s ease-in-out infinite',
  learning: 'lumo-float-learning 2s ease-in-out infinite',
  thinking: 'lumo-mascot-thinking 1.4s ease-in-out infinite',
  cheer: 'lumo-mascot-cheer 1s ease-in-out infinite',
  complete: 'lumo-complete-flash 1.2s ease-out',
};

// state: 'idle' | 'learning' | 'thinking' | 'cheer' | 'complete' — echtes PNG-Artwork
// (Ring/Partikel sind bereits Teil der Bilder, keine CSS-Overlays mehr nötig).
// size: optionaler fixer Override (z. B. 'small' für einen Chat-Header) statt
// der state-abhängigen Standardgröße.
// pulseOnce: zusätzlicher einmaliger Licht-Flash (z. B. bei Phasenübergängen),
// läuft parallel zur Loop-Animation, da beide unterschiedliche Properties animieren.
export default function LumoMascot({ state = 'idle', label, pulseOnce = false, size }) {
  const resolvedSize = SIZE_OVERRIDES[size] || SIZES[state] || SIZES.idle;
  const style = pulseOnce
    ? { animation: `${BASE_ANIMATIONS[state]}, lumo-flash-once 0.6s ease-out` }
    : undefined;

  return (
    <img
      src={SOURCES[state] || SOURCES.idle}
      width={resolvedSize}
      alt={label || 'Lumo'}
      className={`lumo-mascot lumo-mascot--${state}`}
      style={style}
    />
  );
}
