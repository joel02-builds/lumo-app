import { useMemo } from 'react';
import LumoMascot from '../../components/LumoMascot.jsx';
import { getBlockColor } from '../../utils/subjectColors.js';

// Sleep-Consolidation Hinweise – Walker 2009, Stickgold 2005
// Hippocampus konsolidiert Gedächtnisspuren während des Schlafs.
// Ton: ruhig, kein Fachjargon, kein Imperativ ("Du musst jetzt schlafen"),
// keine Erwartung ("wenn du schläfst wird's besser") – stattdessen:
// neutrales Faktum als stiller Abschluss. Erscheint nur beim Beenden der Session.
const SLEEP_HINTS = [
  'Das Gelernte von heute festigt sich im Schlaf von selbst weiter.',
  'Dein Gehirn arbeitet jetzt weiter – auch ohne Bildschirm.',
  'Was heute saß, vertieft sich in der Nacht.',
  'Gute Nacht. Das Gehirn übernimmt den Rest.',
  'Jetzt kommt der stille Teil des Lernens.',
];

function getSleepHint() {
  return SLEEP_HINTS[Math.floor(Math.random() * SLEEP_HINTS.length)];
}

// Ist es Abend / Nacht? Dann ist Sleep-Consolidation besonders relevant.
function isEvening() {
  const h = new Date().getHours();
  return h >= 18 || h < 5;
}

export default function SessionSummaryScreen({ block, evaluation, onContinue, onPause, allBlocks, sessionMinutes }) {
  const subjectColor = getBlockColor(block);
  const completedCount = allBlocks?.filter(b => b.status === 'completed').length || 0;
  const totalCount = allBlocks?.length || 0;
  // Einmal pro Render fixieren – kein Flackern bei Re-Render
  const sleepHint = useMemo(() => getSleepHint(), []);
  const gapBlocks = allBlocks?.filter(b =>
    b.status === 'completed' && (b.confidence === 'unsicher' || b.confidence === 'grosse_luecken')
  ) || [];
  const nextBlock = allBlocks?.find(b => b.status !== 'completed' && b.id !== block?.id);
  const allDone = completedCount === totalCount;
  const allPerfect = allDone && allBlocks?.every(b => b.confidence === 'sicher');

  const isGood = evaluation?.status === 'sicher';
  const isUnsure = evaluation?.status === 'unsicher';

  return (
    <div className="screen">
      <div className="screen-content" style={{ gap: '20px', maxWidth: 'min(440px, 100%)' }}>

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

        {completedCount >= 3 && !allDone && completedCount % 3 === 0 && (
          <p style={{
            fontSize: '13px',
            color: 'var(--text-secondary)',
            fontStyle: 'italic',
            textAlign: 'center',
            margin: '-4px 0 0',
          }}>
            Tipp: Abwechslungsreiches Lernen festigt Wissen besser als alles hintereinander.
          </p>
        )}

        {/* Bewertung */}
        {evaluation?.summaryText && (
          <div style={{
            width: '100%',
            background: isGood ? 'var(--green-soft)' : 'var(--bg-card)',
            border: `1px solid ${isGood ? 'var(--green)' : 'var(--border)'}`,
            borderLeft: isGood ? undefined : '3px solid var(--gold)',
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
            background: allPerfect
              ? 'linear-gradient(135deg, rgba(212,168,67,0.12) 0%, rgba(61,158,110,0.12) 100%)'
              : 'var(--green-soft)',
            border: `1px solid ${allPerfect ? 'var(--gold)' : 'var(--green)'}`,
            borderRadius: '16px',
            padding: '24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}>
            <p style={{ fontSize: '28px', margin: '0' }}>
              {allPerfect ? '✨' : '🎉'}
            </p>
            <p style={{
              fontSize: '17px',
              fontWeight: '800',
              color: allPerfect ? 'var(--gold)' : 'var(--green)',
              margin: '0',
              letterSpacing: '-0.02em',
            }}>
              {allPerfect ? 'Alles verstanden.' : 'Alle Blöcke geschafft.'}
            </p>
            <p style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
              margin: '0',
              lineHeight: '1.55',
            }}>
              {allPerfect
                ? 'Nicht nur abgehakt – wirklich verstanden. Das ist der Unterschied.'
                : 'In 7 Tagen eine kurze Wiederholung – dann bleibt es wirklich sitzen.'}
            </p>
          </div>
        )}

        {/* Sleep-Consolidation Hinweis – stiller Abschluss der Session
            Erscheint immer (nicht nur nach 45 min) – Consolidation gilt für jede Session.
            Abends: etwas prominenter, da Schlaf unmittelbar bevorsteht.
            Tags: dezenter, da Schlaf noch fern ist.
            Kein Imperativ ("schlaf jetzt"), kein Fachjargon – nur ein ruhiges Faktum. */}
        <p style={{
          fontSize: '13px',
          color: 'var(--text-secondary)',
          textAlign: 'center',
          lineHeight: '1.6',
          margin: '0',
          opacity: isEvening() ? 0.85 : 0.55,
          fontStyle: 'italic',
          padding: '0 8px',
        }}>
          {sleepHint}
        </p>

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
              Nächsten Block starten →
            </button>
          )}
          <button
            onClick={onPause}
            style={{
              width: '100%',
              background: 'transparent',
              border: '1.5px solid rgba(255,255,255,0.2)',
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
