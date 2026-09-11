import { useState } from 'react';
import LumoMascot from '../../components/LumoMascot.jsx';

export default function FocusRitualPhase({ onDone, block, allBlocks, sessionStats }) {
  const [ready, setReady] = useState(false);

  const completedCount = allBlocks?.filter(b => b.status === 'completed').length || 0;
  const totalCount = allBlocks?.length || 0;
  const hasGaps = allBlocks?.some(b => b.confidence === 'unsicher' || b.confidence === 'grosse_luecken');
  const gapBlocks = allBlocks?.filter(b => b.confidence === 'unsicher' || b.confidence === 'grosse_luecken') || [];
  const isFirstBlock = completedCount === 0;
  const isReturning = completedCount > 0;

  return (
    <div className="screen">
      <div className="screen-content" style={{ gap: '20px', maxWidth: '400px', width: '100%' }}>

        <LumoMascot state="idle" label="Lumo" />

        {/* Begrüßung */}
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>
            {isFirstBlock ? 'Bereit loszulegen?' : 'Willkommen zurück.'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '16px', lineHeight: '1.5' }}>
            {isFirstBlock
              ? 'Lumo hat alles vorbereitet. Du musst nur anfangen.'
              : `Du hast ${completedCount} von ${totalCount} Blöcken geschafft.`}
          </p>
        </div>

        {/* Was jetzt dran ist */}
        <div style={{
          width: '100%',
          background: 'var(--bg-card)',
          border: '1px solid rgba(212, 168, 67, 0.3)',
          borderRadius: '16px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}>
          <p style={{
            fontSize: '11px',
            fontWeight: '700',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            color: 'var(--gold)',
            margin: '0',
          }}>
            Jetzt dran
          </p>
          <p style={{
            fontSize: '18px',
            fontWeight: '600',
            color: 'var(--text-primary)',
            margin: '0',
            lineHeight: '1.3',
          }}>
            {block?.title || 'Nächster Block'}
          </p>
          {block?.estimatedMinutes && (
            <p style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
              margin: '0',
            }}>
              ca. {block.estimatedMinutes} Minuten
            </p>
          )}
        </div>

        {/* Lücken aus letzter Session */}
        {isReturning && hasGaps && (
          <div style={{
            width: '100%',
            background: 'rgba(212, 168, 67, 0.06)',
            border: '1px solid rgba(212, 168, 67, 0.2)',
            borderRadius: '16px',
            padding: '20px',
          }}>
            <p style={{
              fontSize: '11px',
              fontWeight: '700',
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              color: 'var(--gold)',
              margin: '0 0 10px',
            }}>
              Noch unsicher
            </p>
            {gapBlocks.slice(0, 2).map(b => (
              <p key={b.id} style={{
                fontSize: '14px',
                color: 'var(--text-secondary)',
                margin: '0 0 4px',
                paddingLeft: '12px',
                borderLeft: '2px solid var(--gold)',
              }}>
                {b.title}
              </p>
            ))}
            {gapBlocks.length > 2 && (
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '8px 0 0' }}>
                + {gapBlocks.length - 2} weitere
              </p>
            )}
          </div>
        )}

        {/* Start Button */}
        <button
          className="lumo-btn lumo-btn--primary"
          onClick={onDone}
          style={{ width: '100%', marginTop: '4px' }}
        >
          Los geht's
        </button>

        <button
          onClick={onDone}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            fontSize: '14px',
            cursor: 'pointer',
            padding: '4px',
          }}
        >
          Direkt starten
        </button>

      </div>
    </div>
  );
}
