/**
 * LumoMascot — Lumo's visuelle Persönlichkeit
 *
 * Änderungen vs. vorher:
 * ─────────────────────────────────────────────────────────────────────────
 * 1. SVG-Fallback wenn Bild nicht lädt (war: display:none — ADHS-ungünstig)
 * 2. Label wird korrekt gerendert (war: silently ignored)
 * 3. Neue States: "absence" (anderer Ausdruck nach langer Pause),
 *                 "streak" (Feier-Pose bei Streak-Milestones)
 * 4. Intro-Animations-Prop für "Ich bin Lumo" Moment
 * 5. Reaktionen auf konkrete Events (definiert als state-Props):
 *    - 'first-complete': Erste Block-Vollendung
 *    - 'streak': 7-Tage-Streak Meilenstein
 *    - 'absence': Rückkehr nach langer Pause (> 3 Tage)
 *
 * ADHS-Design:
 * – Mascot-Reaktionen geben emotionalen Kontext ohne Text-Walls
 * – SVG-Fallback hält visuelle Identität aufrecht auch wenn Bild fehlt
 * – Keine roten States — Feedback bleibt encouragend
 */

import { useEffect, useRef, useState } from 'react';

// ─── State → Bild-Mapping ──────────────────────────────────────────────────

const MASCOT_IMAGES = {
  idle:            '/mascot/lumo-idle.png',
  learning:        '/mascot/lumo-learning.png',
  complete:        '/mascot/lumo-complete.png',
  thinking:        '/mascot/lumo-thinking.png',
  cheer:           '/mascot/lumo-cheer.png',
  // Neue States — können auf vorhandene Bilder mappen bis eigene verfügbar sind
  'first-complete': '/mascot/lumo-cheer.png',   // Erste Block-Vollendung → Jubel
  streak:          '/mascot/lumo-cheer.png',     // Streak-Meilenstein → Jubel
  absence:         '/mascot/lumo-thinking.png',  // Lange Pause → nachdenklich
};

// ─── SVG-Fallback Komponente ────────────────────────────────────────────────
// Erscheint wenn PNG nicht geladen werden kann.
// Hält visuelle Identität: Lumos Farbe (Gold), erkennbare Form.

function LumoSvgFallback({ size, state: mascotState }) {
  const isCheer = mascotState === 'cheer' || mascotState === 'first-complete' || mascotState === 'streak';
  const isThinking = mascotState === 'thinking' || mascotState === 'absence';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Lumo"
      style={{
        animation: isCheer
          ? 'lumo-bounce 0.8s ease-in-out infinite alternate'
          : isThinking
          ? 'lumo-breathe 3s ease-in-out infinite'
          : 'none',
      }}
    >
      {/* Körper — goldene Grundform */}
      <circle cx="50" cy="55" r="30" fill="var(--gold)" opacity="0.9" />

      {/* Kopf */}
      <circle cx="50" cy="30" r="22" fill="var(--gold)" />

      {/* Augen */}
      <circle cx="43" cy="28" r="4" fill="#1a1206" />
      <circle cx="57" cy="28" r="4" fill="#1a1206" />

      {/* Augen-Glanz */}
      <circle cx="44.5" cy="26.5" r="1.5" fill="white" opacity="0.8" />
      <circle cx="58.5" cy="26.5" r="1.5" fill="white" opacity="0.8" />

      {/* Mund — je nach Zustand */}
      {isCheer ? (
        // Offenes Lachen
        <path d="M42 35 Q50 42 58 35" stroke="#1a1206" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      ) : isThinking ? (
        // Schmaler nachdenklicher Mund
        <path d="M44 35 Q50 37 56 35" stroke="#1a1206" strokeWidth="2" fill="none" strokeLinecap="round" />
      ) : (
        // Entspanntes Lächeln
        <path d="M43 35 Q50 40 57 35" stroke="#1a1206" strokeWidth="2" fill="none" strokeLinecap="round" />
      )}

      {/* Wangen (nur bei cheer/streak) */}
      {isCheer && (
        <>
          <circle cx="37" cy="32" r="4" fill="#E8935A" opacity="0.5" />
          <circle cx="63" cy="32" r="4" fill="#E8935A" opacity="0.5" />
        </>
      )}

      {/* Kleine Sternchen bei Streak */}
      {mascotState === 'streak' && (
        <>
          <text x="18" y="20" fontSize="12" fill="var(--gold)" opacity="0.7">✦</text>
          <text x="72" y="18" fontSize="10" fill="var(--gold)" opacity="0.7">✦</text>
          <text x="12" y="45" fontSize="8" fill="var(--gold)" opacity="0.5">✦</text>
        </>
      )}
    </svg>
  );
}

// ─── Haupt-Komponente ──────────────────────────────────────────────────────

export default function LumoMascot({
  state = 'idle',
  label,
  size = 'normal',
  pulseOnce,
  glowPulse = false, // true → goldener Leuchtring pulsiert
  intro = false, // true → Einführungs-Animation "Ich bin Lumo"
}) {
  const src = MASCOT_IMAGES[state] || MASCOT_IMAGES.idle;
  // small=40, medium=56, normal=120, large=160
  const px = size === 'small' ? 40 : size === 'medium' ? 56 : size === 'large' ? 160 : 120;

  const [imgVisible, setImgVisible] = useState(true);
  const [currentSrc, setCurrentSrc] = useState(src);
  const [imgError, setImgError] = useState(false);
  const prevSrc = useRef(src);

  // Sanfter Übergang wenn state sich ändert
  useEffect(() => {
    if (src === prevSrc.current) return;
    prevSrc.current = src;
    setImgVisible(false);
    setImgError(false); // neuen State → neues Bild versuchen
    const t = setTimeout(() => {
      setCurrentSrc(src);
      setImgVisible(true);
    }, 150);
    return () => clearTimeout(t);
  }, [src]);

  // Animations-Logik je nach State
  const isCheer = state === 'cheer' || state === 'first-complete' || state === 'streak';
  const isThinking = state === 'thinking' || state === 'absence';
  const isComplete = state === 'complete';

  const imageAnimation = pulseOnce
    ? 'lumo-pulse-once 0.6s ease-out'
    : intro
    ? 'lumo-pulse-once 0.8s ease-out'
    : isThinking
    ? 'lumo-breathe 3s ease-in-out infinite'
    : isCheer
    ? 'lumo-bounce 0.8s ease-in-out infinite alternate'
    : 'none';

  const imageFilter = glowPulse
    ? 'drop-shadow(0 0 18px rgba(212,168,67,0.7))'
    : isComplete
    ? 'drop-shadow(0 0 12px rgba(212,168,67,0.6))'
    : state === 'streak'
    ? 'drop-shadow(0 0 16px rgba(212,168,67,0.8))'
    : 'none';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '6px',
    }}>
      {/* Bild oder SVG-Fallback */}
      {!imgError ? (
        <img
          src={currentSrc}
          alt={label ? `Lumo – ${label}` : 'Lumo'}
          width={px}
          height={px}
          style={{
            objectFit: 'contain',
            opacity: imgVisible ? 1 : 0,
            animation: imageAnimation,
            filter: imageFilter,
            transition: 'opacity 0.15s ease, filter 0.3s ease',
          }}
          onError={() => {
            // SVG-Fallback aktivieren statt display:none
            setImgError(true);
          }}
        />
      ) : (
        // SVG-Fallback: hält visuelle Identität aufrecht
        <div style={{
          width: px,
          height: px,
          opacity: imgVisible ? 1 : 0,
          transition: 'opacity 0.15s ease',
        }}>
          <LumoSvgFallback size={px} state={state} />
        </div>
      )}

      {/* Label — "Lumo" unter dem Mascot */}
      {label && (
        <span style={{
          fontSize: size === 'small' ? '10px' : '12px',
          fontWeight: '700',
          letterSpacing: '0.8px',
          color: 'var(--gold)',
          textTransform: 'uppercase',
          opacity: 0.8,
        }}>
          {label}
        </span>
      )}
    </div>
  );
}
