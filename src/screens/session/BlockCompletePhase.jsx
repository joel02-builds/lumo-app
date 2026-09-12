import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import Button from '../../components/Button.jsx';

const MESSAGES = {
  sicher: [
    'Du hast es. Wirklich.',
    'Das sitzt. Lumo ist stolz.',
    'Verstanden. Abgehakt. Weiter.',
    'Das war echter Fortschritt.',
  ],
  unsicher: [
    'Gut versucht. Kommt nochmal.',
    'Fast da. Beim nächsten Mal sitzt es.',
    'Du hast es angepackt. Das zählt.',
  ],
  grosse_luecken: [
    'Anfangen ist das Schwerste. Du hast angefangen.',
    'Noch nicht da – aber du warst dabei.',
    'Lumo merkt sich was noch fehlt.',
  ],
};

function randomMessage(status) {
  const list = MESSAGES[status] || MESSAGES.unsicher;
  return list[Math.floor(Math.random() * list.length)];
}

export default function BlockCompletePhase({ block, result, onContinue, onPause }) {
  const status = result?.status || 'unsicher';
  const isGood = status === 'sicher';
  const firedRef = useRef(false);

  useEffect(() => {
    if (!isGood || firedRef.current) return;
    firedRef.current = true;

    // Erster Konfetti-Burst
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#FFE8A0', '#D4A843', '#FFFFFF', '#4CAF82'],
      scalar: 1.1,
    });

    // Zweiter Burst nach kurzer Verzögerung
    setTimeout(() => {
      confetti({
        particleCount: 60,
        spread: 120,
        origin: { y: 0.5 },
        startVelocity: 20,
        colors: ['#FFE8A0', '#D4A843'],
        scalar: 0.9,
      });
    }, 400);
  }, [isGood]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
      background: isGood
        ? 'radial-gradient(ellipse at center, rgba(212,168,67,0.08) 0%, var(--bg) 70%)'
        : 'var(--bg)',
      gap: '28px',
      transition: 'background 0.6s ease',
    }}>

      {/* Lumo – größer als normal */}
      <div style={{
        animation: isGood ? 'lumo-bounce 0.8s ease-in-out infinite alternate' : 'none',
        filter: isGood ? 'drop-shadow(0 0 24px rgba(212,168,67,0.5))' : 'none',
      }}>
        <img
          src={isGood ? '/mascot/lumo-complete.png' : '/mascot/lumo-learning.png'}
          alt="Lumo"
          width={isGood ? 160 : 120}
          height={isGood ? 160 : 120}
          style={{ objectFit: 'contain', transition: 'all 0.4s ease' }}
        />
      </div>

      {/* Hauptnachricht */}
      <div style={{ textAlign: 'center', maxWidth: '360px' }}>
        {isGood && (
          <div style={{
            fontSize: '48px',
            marginBottom: '8px',
            animation: 'lumo-pulse-once 0.6s ease-out',
          }}>
            ✨
          </div>
        )}
        <h1 style={{
          fontSize: isGood ? '32px' : '26px',
          fontWeight: '800',
          color: isGood ? 'var(--gold-light)' : 'var(--text-primary)',
          marginBottom: '12px',
          lineHeight: '1.2',
          letterSpacing: isGood ? '-0.5px' : '0',
        }}>
          {randomMessage(status)}
        </h1>
        <p style={{
          fontSize: '15px',
          color: 'var(--text-secondary)',
          lineHeight: '1.5',
        }}>
          {block?.title}
        </p>
      </div>

      {/* Status Badge */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        background: isGood ? 'rgba(212,168,67,0.12)' : 'rgba(224,123,84,0.12)',
        border: `1px solid ${isGood ? 'var(--gold)' : 'var(--red)'}`,
        borderRadius: '20px',
        padding: '8px 18px',
        fontSize: '13px',
        fontWeight: '700',
        color: isGood ? 'var(--gold)' : 'var(--red)',
        letterSpacing: '0.5px',
      }}>
        {isGood ? '✓ Verstanden' : status === 'grosse_luecken' ? '○ Große Lücken' : '◐ Noch unsicher'}
      </div>

      {/* Lücken-Info wenn nicht sicher */}
      {!isGood && result?.uncertainPoints?.length > 0 && (
        <div style={{
          width: '100%',
          maxWidth: '360px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '14px',
          padding: '16px 18px',
        }}>
          <p style={{
            fontSize: '11px',
            fontWeight: '700',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            color: 'var(--gold)',
            margin: '0 0 10px',
          }}>
            Das fehlte noch
          </p>
          {result.uncertainPoints.map((gap, i) => (
            <p key={i} style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
              margin: '0 0 6px',
              paddingLeft: '12px',
              borderLeft: '2px solid var(--border)',
              lineHeight: '1.4',
            }}>
              {gap}
            </p>
          ))}
        </div>
      )}

      {/* Buttons */}
      <div style={{
        width: '100%',
        maxWidth: '360px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}>
        <Button onClick={onContinue} style={{ width: '100%' }}>
          {isGood ? 'Weiter lernen →' : 'Zum nächsten Block'}
        </Button>
        <button
          onClick={onPause}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            fontSize: '14px',
            cursor: 'pointer',
            padding: '8px',
          }}
        >
          Pause machen
        </button>
      </div>

    </div>
  );
}
