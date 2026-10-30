/**
 * SkeletonLoader — Shimmer-Platzhalter für alle Loading-States in Lumo
 *
 * Design-Prinzipien:
 * – Dunkles Warm-Palette (#0E0C09 Basis), Gold-Akzent (#D4A843)
 * – Shimmer läuft immer von links nach rechts (natürliche Leserichtung)
 * – Keine Spinner, keine Bars — Content-shaped Platzhalter
 * – Reduziert wahrgenommene Ladezeit (Nielsen Norman Group)
 * – ADHS-safe: Bewegung ist subtil, nicht ablenkend
 */

import { useEffect, useRef } from 'react';

// Globale CSS-Animation — wird nur einmal injiziert
let shimmerInjected = false;
function injectShimmerCSS() {
  if (shimmerInjected || typeof document === 'undefined') return;
  shimmerInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    @keyframes lumo-shimmer {
      0%   { background-position: -400px 0; }
      100% { background-position: 400px 0; }
    }
    .lumo-skeleton {
      background: linear-gradient(
        90deg,
        rgba(255,255,255,0.04) 0%,
        rgba(212,168,67,0.08) 40%,
        rgba(255,255,255,0.04) 80%
      );
      background-size: 800px 100%;
      animation: lumo-shimmer 1.6s ease-in-out infinite;
      border-radius: 8px;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Einzelner Skeleton-Block
 *
 * @param {string} width   — CSS-Breite, default '100%'
 * @param {string} height  — CSS-Höhe, default '16px'
 * @param {string} borderRadius — CSS-Wert, default '8px'
 * @param {object} style   — zusätzliche Inline-Styles
 */
export function SkeletonLine({ width = '100%', height = '16px', borderRadius = '8px', style = {} }) {
  injectShimmerCSS();
  return (
    <div
      className="lumo-skeleton"
      style={{
        width,
        height,
        borderRadius,
        flexShrink: 0,
        ...style,
      }}
    />
  );
}

/**
 * Skeleton-Karte — imitiert eine Lernkarte
 * Enthält: Konzept-Label, Erklärungstext (3 Zeilen), Trennlinie, Button
 */
export function SkeletonCard({ style = {} }) {
  injectShimmerCSS();
  return (
    <div style={{
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      ...style,
    }}>
      {/* Konzept-Label */}
      <SkeletonLine width="120px" height="11px" borderRadius="4px" />

      {/* Erklärungstext — 3 Zeilen unterschiedlicher Länge (natürlicher) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <SkeletonLine width="100%" height="24px" borderRadius="6px" />
        <SkeletonLine width="92%" height="24px" borderRadius="6px" />
        <SkeletonLine width="78%" height="24px" borderRadius="6px" />
      </div>

      {/* Trennlinie */}
      <div style={{
        height: '1px',
        background: 'rgba(255,255,255,0.06)',
        margin: '4px 0',
      }} />

      {/* Button-Platzhalter */}
      <SkeletonLine width="100%" height="50px" borderRadius="12px" />
    </div>
  );
}

/**
 * Skeleton für den AnalyzingScreen — simuliert erkannte Blöcke
 * @param {number} count — Anzahl simulierter Block-Zeilen (default: 3)
 */
export function SkeletonBlockList({ count = 3 }) {
  injectShimmerCSS();

  // Unterschiedliche Breiten für natürlichere Optik
  const widths = ['85%', '70%', '78%', '65%', '80%'];

  return (
    <div style={{
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px 16px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '12px',
          }}
        >
          {/* Farbdot */}
          <div style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: 'rgba(212,168,67,0.15)',
            flexShrink: 0,
          }} />
          {/* Titel */}
          <SkeletonLine
            width={widths[i % widths.length]}
            height="15px"
            style={{ flex: 1 }}
          />
          {/* Schwierigkeits-Badge */}
          <SkeletonLine width="52px" height="22px" borderRadius="20px" />
        </div>
      ))}
    </div>
  );
}

/**
 * Vollbild-Skeleton für den Karten-Loading-State
 * Imitiert die echte CardLearningPhase-Struktur (Header + Karte)
 */
export function SkeletonCardScreen() {
  injectShimmerCSS();
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg)',
    }}>
      {/* Mini-Header — imitiert echten CardLearningPhase-Header */}
      <div style={{
        padding: '14px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'var(--bg-elevated)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexShrink: 0,
      }}>
        {/* Gold-Dot */}
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: 'rgba(212,168,67,0.3)',
          flexShrink: 0,
        }} />
        {/* Block-Titel + Progress-Dots */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <SkeletonLine width="160px" height="10px" borderRadius="4px" />
          {/* Progress-Dots-Reihe */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {[20, 8, 8, 8, 8].map((w, i) => (
              <div
                key={i}
                className="lumo-skeleton"
                style={{
                  width: `${w}px`,
                  height: '8px',
                  borderRadius: '4px',
                  flexShrink: 0,
                }}
              />
            ))}
          </div>
        </div>
        {/* Pause-Button-Platzhalter */}
        <SkeletonLine width="50px" height="28px" borderRadius="8px" />
      </div>

      {/* Haupt-Content-Bereich */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: '32px 28px',
        paddingTop: '8vh',
        gap: '24px',
      }}>
        <div style={{
          width: '100%',
          maxWidth: 'min(640px, 100%)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}>
          <SkeletonCard />
        </div>
      </div>
    </div>
  );
}

export default SkeletonLine;
