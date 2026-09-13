import { useState } from 'react';
import LumoMascot from '../../components/LumoMascot.jsx';

export default function FocusRitualPhase({ onDone, block, allBlocks, sessionStats, onMoodSet }) {
  const [ready, setReady] = useState(false);
  const [mood, setMood] = useState(null);

  const completedCount = allBlocks?.filter(b => b.status === 'completed').length || 0;
  const totalCount = allBlocks?.length || 0;
  const hasGaps = allBlocks?.some(b => b.confidence === 'unsicher' || b.confidence === 'grosse_luecken');
  const gapBlocks = allBlocks?.filter(b => b.confidence === 'unsicher' || b.confidence === 'grosse_luecken') || [];
  const isFirstBlock = completedCount === 0;
  const isReturning = completedCount > 0;

  return (
    <div className="screen">
      <div className="screen-content" style={{ gap: '20px', maxWidth: '400px', width: '100%' }}>

        {!mood ? (
          <div style={{ width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <LumoMascot state="idle" />
            <h1 style={{ fontSize: '24px', marginBottom: '4px' }}>
              Wie geht's dir gerade?
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0' }}>
              Ich passe die Session an.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              {[
                { emoji: '😊', label: 'Gut', value: 'good' },
                { emoji: '😐', label: 'So lala', value: 'okay' },
                { emoji: '😔', label: 'Nicht gut', value: 'bad' },
              ].map(({ emoji, label, value }) => (
                <button
                  key={value}
                  onClick={() => { setMood(value); onMoodSet?.(value); }}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '14px',
                    padding: '14px 20px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                    flex: 1,
                  }}
                >
                  <span style={{ fontSize: '28px' }}>{emoji}</span>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>{label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <LumoMascot state="idle" />

            {/* Mood-spezifische Nachricht */}
            {mood === 'bad' && (
              <div style={{
                background: 'rgba(212, 168, 67, 0.08)',
                border: '1px solid rgba(212, 168, 67, 0.3)',
                borderRadius: '12px',
                padding: '14px 18px',
                textAlign: 'center',
              }}>
                <p style={{ fontSize: '15px', color: 'var(--text-primary)', margin: '0', lineHeight: '1.5' }}>
                  Kein Problem. Wir machen es heute kürzer und einfacher.
                  Du musst nur anfangen – der Rest kommt von selbst.
                </p>
              </div>
            )}
            {mood === 'okay' && (
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', textAlign: 'center', margin: '0' }}>
                Alright. Ich halte es übersichtlich heute.
              </p>
            )}

            {/* Begrüßung */}
            <div style={{ textAlign: 'center' }}>
              <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>
                {isFirstBlock ? 'Bereit loszulegen?' : 'Willkommen zurück.'}
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '16px', lineHeight: '1.5' }}>
                {isFirstBlock
                  ? 'Ich hab alles vorbereitet. Du musst nur anfangen.'
                  : `Du hast ${completedCount} von ${totalCount} Blöcken geschafft.`}
              </p>
              {isFirstBlock && (
                <p style={{
                  fontSize: '14px',
                  color: 'var(--text-secondary)',
                  textAlign: 'center',
                  margin: '4px 0 0',
                  lineHeight: '1.5',
                }}>
                  Ich erkläre dir jeden Schritt. Du musst nichts vorbereiten.
                </p>
              )}
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
                  ca. {mood === 'bad' ? Math.round(block.estimatedMinutes * 0.7) : block.estimatedMinutes} Minuten
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
                  color: mood === 'bad' ? 'var(--text-secondary)' : 'var(--gold)',
                  margin: '0 0 10px',
                }}>
                  {mood === 'bad'
                    ? 'Kommen nochmal – aber nicht heute'
                    : gapBlocks.some(b => b.confidence === 'grosse_luecken') ? 'Noch nicht sicher' : 'Noch unsicher'}
                </p>
                {gapBlocks.slice(0, mood === 'bad' ? 1 : 2).map(b => (
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
                {gapBlocks.length > 2 && mood !== 'bad' && (
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
              {mood === 'bad' ? 'Trotzdem starten – kurz und einfach' : 'Los geht\'s'}
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
              Direkt starten – Briefing überspringen
            </button>
          </>
        )}

      </div>
    </div>
  );
}
