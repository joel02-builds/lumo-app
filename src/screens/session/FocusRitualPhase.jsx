import { useState } from 'react';
import LumoMascot from '../../components/LumoMascot.jsx';

export default function FocusRitualPhase({ onDone, block, allBlocks, sessionStats, onMoodSet, sprintMode }) {
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
          /* ── Mood-Check (Pekrun 2006 Academic Emotions) ──────────────────
             4 konkrete Lernzustände statt 3 abstrakter Emojis.
             Pekrun unterscheidet aktivierende vs. deaktivierende Emotionen.
             Jeder Zustand triggert eine andere Session-Anpassung.
             Hick's Law: Skip-Button immer sichtbar, Entscheidungslast minimal. */
          <div style={{ width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <LumoMascot state="idle" />
            <div>
              <h1 style={{ fontSize: '22px', marginBottom: '4px' }}>
                Wie startest du gerade?
              </h1>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0' }}>
                Ich passe die Session an — 1 Tipp.
              </p>
            </div>
            {/* 2×2 Grid: besser lesbar als 3 enge Kacheln */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: '100%' }}>
              {[
                {
                  emoji: '⚡',
                  label: 'Fokussiert',
                  sub: 'Ich bin dabei',
                  value: 'focused',
                  color: 'var(--green)',
                  bg: 'rgba(61,158,110,0.08)',
                  border: 'rgba(61,158,110,0.25)',
                },
                {
                  emoji: '😴',
                  label: 'Müde',
                  sub: 'Wenig Energie',
                  value: 'tired',
                  color: 'var(--text-secondary)',
                  bg: 'var(--bg-card)',
                  border: 'rgba(255,255,255,0.15)',
                },
                {
                  emoji: '😰',
                  label: 'Gestresst',
                  sub: 'Viel im Kopf',
                  value: 'stressed',
                  color: 'var(--amber, #C47A2B)',
                  bg: 'rgba(196,122,43,0.08)',
                  border: 'rgba(196,122,43,0.25)',
                },
                {
                  emoji: '🤯',
                  label: 'Überfordert',
                  sub: 'Zu viel auf einmal',
                  value: 'overwhelmed',
                  color: 'var(--amber, #C47A2B)',
                  bg: 'rgba(196,122,43,0.08)',
                  border: 'rgba(196,122,43,0.25)',
                },
              ].map(({ emoji, label, sub, value, color, bg, border }) => (
                <button
                  key={value}
                  onClick={() => { setMood(value); onMoodSet?.(value); }}
                  style={{
                    background: bg,
                    border: `1px solid ${border}`,
                    borderRadius: '14px',
                    padding: '14px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '4px',
                    transition: 'all 0.15s ease',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: '22px' }}>{emoji}</span>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>{label}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.3' }}>{sub}</span>
                </button>
              ))}
            </div>
            {/* Hick's Law: Skip ist prominent, nicht versteckt */}
            <button
              onClick={() => { setMood('good'); onMoodSet?.('good'); }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '13px',
                cursor: 'pointer',
                padding: '4px',
                textDecoration: 'underline',
                textUnderlineOffset: '3px',
              }}
            >
              Überspringen – einfach starten
            </button>
          </div>
        ) : (
          <>
            <LumoMascot state="idle" />

            {/* ── Mood-spezifische Session-Anpassung (Pekrun 2006) ───────────
                Aktivierende Emotionen → volle Tiefe
                Deaktivierende Emotionen → reduzierte Komplexität, mehr Pausen */}
            {(mood === 'tired' || mood === 'stressed' || mood === 'overwhelmed') && (
              <div style={{
                background: 'rgba(196,122,43,0.08)',
                border: '1px solid rgba(196,122,43,0.25)',
                borderRadius: '12px',
                padding: '14px 18px',
                textAlign: 'left',
              }}>
                <p style={{ fontSize: '14px', color: 'var(--text-primary)', margin: '0 0 8px', fontWeight: '600' }}>
                  {mood === 'tired' && 'Session angepasst für wenig Energie:'}
                  {mood === 'stressed' && 'Session angepasst für viel Druck:'}
                  {mood === 'overwhelmed' && 'Session vereinfacht — ein Schritt nach dem anderen:'}
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0', lineHeight: '1.8' }}>
                  {mood === 'tired' && '✓ Kürzere Erklärungen · ✓ Einfachere Fragen · ✓ Kein Zeitdruck'}
                  {mood === 'stressed' && '✓ Ein Block, dann Pause · ✓ Kein Recall-Druck · ✓ Du bestimmst das Tempo'}
                  {mood === 'overwhelmed' && '✓ Nur das Wichtigste · ✓ Kein Mehrfach-Konzept · ✓ Ich mach es ganz einfach'}
                </p>
              </div>
            )}
            {mood === 'focused' && (
              <p style={{ fontSize: '14px', color: 'var(--green)', textAlign: 'center', margin: '0', fontWeight: '500' }}>
                ⚡ Volle Tiefe — ich gehe heute mehr ins Detail.
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
              {block?.difficulty && (
                <span style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  color: block.difficulty === 'schwer' ? 'var(--amber)' : block.difficulty === 'mittel' ? 'var(--gold)' : 'var(--green)',
                  background: block.difficulty === 'schwer' ? 'var(--amber-soft)' : block.difficulty === 'mittel' ? 'rgba(212,168,67,0.12)' : 'rgba(61,158,110,0.12)',
                  borderRadius: '999px',
                  padding: '3px 10px',
                  letterSpacing: '0.02em',
                }}>
                  {block.difficulty}
                </span>
              )}
              {sprintMode && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(212, 168, 67, 0.12)',
                  border: '1px solid rgba(212, 168, 67, 0.3)',
                  borderRadius: '8px',
                  padding: '4px 10px',
                  marginTop: '4px',
                  width: 'fit-content',
                }}>
                  <span style={{ fontSize: '12px' }}>⚡</span>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--gold)', letterSpacing: '0.5px' }}>
                    Sprint-Modus
                  </span>
                </div>
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
                  {(mood === 'tired' || mood === 'overwhelmed')
                    ? 'Kommen nochmal – aber nicht heute'
                    : gapBlocks.some(b => b.confidence === 'grosse_luecken') ? 'Noch nicht sicher' : 'Noch unsicher'}
                </p>
                {gapBlocks.slice(0, (mood === 'tired' || mood === 'overwhelmed') ? 1 : 2).map(b => (
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
                {gapBlocks.length > 2 && mood !== 'tired' && mood !== 'overwhelmed' && (
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
              {mood === 'tired' ? 'Trotzdem starten – kurz und einfach'
               : mood === 'stressed' ? 'Starten – ich halte es übersichtlich'
               : mood === 'overwhelmed' ? 'Starten – Schritt für Schritt'
               : 'Los geht\'s'}
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
