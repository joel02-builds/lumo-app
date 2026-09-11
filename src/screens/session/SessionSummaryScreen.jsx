import LumoMascot from '../../components/LumoMascot.jsx';
import { getSubjectColor } from '../../utils/subjectColors.js';

export default function SessionSummaryScreen({ block, evaluation, onContinue, onPause, allBlocks }) {
  const subjectColor = getSubjectColor(block?.subject);
  const completedCount = allBlocks?.filter(b => b.status === 'completed').length || 0;
  const totalCount = allBlocks?.length || 0;
  const gapBlocks = allBlocks?.filter(b =>
    b.status === 'completed' && (b.confidence === 'unsicher' || b.confidence === 'grosse_luecken')
  ) || [];
  const nextBlock = allBlocks?.find(b => b.status !== 'completed' && b.id !== block?.id);
  const allDone = completedCount === totalCount;

  const isGood = evaluation?.status === 'sicher';
  const isUnsure = evaluation?.status === 'unsicher';

  return (
    <div className="screen">
      <div className="screen-content" style={{ gap: '20px', maxWidth: '440px' }}>

        <LumoMascot state={isGood ? 'cheer' : 'learning'} />

        {/* Block abgeschlossen */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            display: 'inline-block',
            background: `${subjectColor}22`,
            border: `1px solid ${subjectColor}`,
            borderRadius: '20px',
            padding: '4px 14px',
            fontSize: '11px',
            fontWeight: '700',
            color: subjectColor,
            letterSpacing: '1px',
            textTransform: 'uppercase',
            marginBottom: '12px',
          }}>
            {block?.subject || 'Block'}
          </div>
          <h1 style={{ fontSize: '26px', marginBottom: '8px', lineHeight: '1.2' }}>
            {isGood ? 'Block verstanden.' : 'Block abgeschlossen.'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
            {completedCount} von {totalCount} Blöcken geschafft.
          </p>
        </div>

        {/* Bewertung */}
        {evaluation?.summaryText && (
          <div style={{
            width: '100%',
            background: isGood ? 'var(--green-soft)' : 'var(--red-soft)',
            border: `1px solid ${isGood ? 'var(--green)' : 'var(--red)'}`,
            borderRadius: '14px',
            padding: '16px 18px',
          }}>
            <p style={{
              fontSize: '15px',
              color: 'var(--text-primary)',
              margin: '0',
              lineHeight: '1.5',
            }}>
              {evaluation.summaryText}
            </p>
          </div>
        )}

        {/* Was noch wiederholt werden muss */}
        {gapBlocks.length > 0 && (
          <div style={{
            width: '100%',
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
              Kommt nochmal
            </p>
            {gapBlocks.map(b => (
              <div key={b.id} style={{
                fontSize: '14px',
                color: 'var(--text-secondary)',
                padding: '4px 0',
                paddingLeft: '12px',
                borderLeft: '2px solid var(--gold)',
                marginBottom: '6px',
              }}>
                {b.title}
              </div>
            ))}
          </div>
        )}

        {/* Nächster Block */}
        {nextBlock && !allDone && (
          <div style={{
            width: '100%',
            background: 'var(--bg-card)',
            border: `1px solid rgba(212, 168, 67, 0.3)`,
            borderRadius: '14px',
            padding: '16px 18px',
          }}>
            <p style={{
              fontSize: '11px',
              fontWeight: '700',
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              color: 'var(--gold)',
              margin: '0 0 6px',
            }}>
              Als nächstes
            </p>
            <p style={{
              fontSize: '16px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              margin: '0',
            }}>
              {nextBlock.title}
            </p>
          </div>
        )}

        {allDone && (
          <div style={{
            width: '100%',
            background: 'var(--green-soft)',
            border: '1px solid var(--green)',
            borderRadius: '14px',
            padding: '20px',
            textAlign: 'center',
          }}>
            <p style={{
              fontSize: '18px',
              fontWeight: '700',
              color: 'var(--green)',
              margin: '0',
            }}>
              Alle Blöcke geschafft. 🎉
            </p>
          </div>
        )}

        {/* Buttons */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {!allDone && (
            <button
              onClick={onContinue}
              style={{
                width: '100%',
                background: 'var(--gold)',
                color: '#1a1206',
                border: 'none',
                borderRadius: '12px',
                padding: '15px',
                fontSize: '16px',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              Weiter lernen
            </button>
          )}
          <button
            onClick={onPause}
            style={{
              width: '100%',
              background: 'none',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '13px',
              fontSize: '15px',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            {allDone ? 'Fertig für heute' : 'Pause machen'}
          </button>
        </div>

      </div>
    </div>
  );
}
