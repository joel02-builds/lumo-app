import { useState, useEffect, useRef } from 'react';
import LumoMascot from '../../components/LumoMascot.jsx';

// ─── Huberman Focus Protocol (in-session breath primer) ───────────────────
//
// Evidenz:
//   Spiegel & Huberman (2023) – Physiological sigh (double-inhale + long
//   exhale) rapidly downregulates stress / activates parasympathetic tone.
//   Huberman (2021) – 30–60s visual focus on a stationary point activates
//   the superior colliculus → elevated sustained attention.
//
// Lumo-Umsetzung:
//   1. Ein einzelner Atemzug (doppelter Einatem + langer Ausatem) als
//      animierter Kreis – skippable, dauert ~10 s.
//   2. Kein Fokuspunkt-Timer (würde auf Mobile nicht funktionieren); statt-
//      dessen die Atemübung als Proxy für Aufmerksamkeitsprimer.
//   3. Nur angezeigt wenn mood ≠ overwhelmed (zu viele Schritte = mehr Stress).
// ──────────────────────────────────────────────────────────────────────────

function BreathPrimer({ onDone, onSkip }) {
  // Phasen: idle → inhale1 → inhale2 → exhale → done
  const [breathPhase, setBreathPhase] = useState('idle');
  const [cycleCount, setCycleCount] = useState(0);
  const timerRef = useRef(null);

  const TOTAL_CYCLES = 1; // Ein Zug reicht für den Primer-Effekt

  // Automatischer Ablauf: start → inhale1 (1.5s) → inhale2 (1s) → exhale (4s) → done
  useEffect(() => {
    if (breathPhase === 'idle') {
      timerRef.current = setTimeout(() => setBreathPhase('inhale1'), 600);
    } else if (breathPhase === 'inhale1') {
      timerRef.current = setTimeout(() => setBreathPhase('inhale2'), 1500);
    } else if (breathPhase === 'inhale2') {
      timerRef.current = setTimeout(() => setBreathPhase('exhale'), 1000);
    } else if (breathPhase === 'exhale') {
      timerRef.current = setTimeout(() => {
        const next = cycleCount + 1;
        setCycleCount(next);
        if (next >= TOTAL_CYCLES) {
          setBreathPhase('done');
        } else {
          setBreathPhase('inhale1');
        }
      }, 4500);
    } else if (breathPhase === 'done') {
      timerRef.current = setTimeout(onDone, 800);
    }
    return () => clearTimeout(timerRef.current);
  }, [breathPhase, cycleCount, onDone]);

  const circleScale =
    breathPhase === 'inhale1' ? 1.12
    : breathPhase === 'inhale2' ? 1.22
    : breathPhase === 'exhale' ? 0.88
    : breathPhase === 'done' ? 1
    : 1;

  const label =
    breathPhase === 'idle' ? 'Gleich …'
    : breathPhase === 'inhale1' ? 'Einatmen …'
    : breathPhase === 'inhale2' ? '… und noch ein kleines bisschen'
    : breathPhase === 'exhale' ? 'Ausatmen … ganz langsam'
    : 'Gut. Bereit.';

  return (
    <div style={{
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '32px',
      padding: '8px 0',
    }}>
      {/* Titel */}
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '20px', marginBottom: '6px', fontFamily: 'inherit', fontStyle: 'normal', fontWeight: '700' }}>
          Einen Moment ankommen.
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Ein einziger Atemzug — dann bist du bereit.
        </p>
      </div>

      {/* Animated breath circle */}
      <div style={{ position: 'relative', width: '120px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Outer glow ring */}
        <div style={{
          position: 'absolute',
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          border: '2px solid rgba(212,168,67,0.18)',
          transition: 'transform 0.5s ease, opacity 0.5s ease',
          transform: `scale(${breathPhase === 'exhale' ? 0.82 : 1.15})`,
          opacity: breathPhase === 'exhale' ? 0.3 : 0.7,
        }} />
        {/* Main circle */}
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: breathPhase === 'done'
            ? 'var(--green-soft)'
            : 'rgba(212,168,67,0.12)',
          border: `2px solid ${breathPhase === 'done' ? 'var(--green)' : 'var(--gold)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 0.5s cubic-bezier(0.34,1.2,0.64,1), background 0.4s ease, border-color 0.4s ease',
          transform: `scale(${circleScale})`,
          boxShadow: breathPhase === 'exhale'
            ? 'none'
            : `0 0 24px rgba(212,168,67,${breathPhase === 'inhale2' ? '0.35' : '0.18'})`,
        }}>
          <span style={{ fontSize: '24px', userSelect: 'none' }}>
            {breathPhase === 'done' ? '✓' : breathPhase === 'exhale' ? '○' : '●'}
          </span>
        </div>
      </div>

      {/* Phase label */}
      <p style={{
        fontSize: '18px',
        fontWeight: '600',
        color: breathPhase === 'done' ? 'var(--green)' : 'var(--text-primary)',
        textAlign: 'center',
        transition: 'color 0.3s ease',
        minHeight: '28px',
      }}>
        {label}
      </p>

      {/* Skip – immer sichtbar (ADHS-Sicherheitsnetz) */}
      <button
        onClick={onSkip}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-secondary)',
          fontSize: '13px',
          cursor: 'pointer',
          padding: '4px',
          textDecoration: 'underline',
          textUnderlineOffset: '3px',
          marginTop: '-16px',
        }}
      >
        Überspringen
      </button>
    </div>
  );
}

export default function FocusRitualPhase({ onDone, block, allBlocks, sessionStats, onMoodSet, sprintMode }) {
  // step: 'mood' → 'breath' → 'ready'
  const [step, setStep] = useState('mood');
  const [mood, setMood] = useState(null);

  const completedCount = allBlocks?.filter(b => b.status === 'completed').length || 0;
  const totalCount = allBlocks?.length || 0;
  const hasGaps = allBlocks?.some(b => b.confidence === 'unsicher' || b.confidence === 'grosse_luecken');
  const gapBlocks = allBlocks?.filter(b => b.confidence === 'unsicher' || b.confidence === 'grosse_luecken') || [];
  const isFirstBlock = completedCount === 0;
  const isReturning = completedCount > 0;

  // Nach Mood-Wahl: Breath-Primer zeigen? Nur wenn kein Overwhelm und kein Skip
  const handleMoodSelect = (value) => {
    setMood(value);
    onMoodSet?.(value);
    if (value === 'overwhelmed') {
      // Bei Overwhelm direkt weiter – weniger Schritte = besser
      setStep('ready');
    } else {
      setStep('breath');
    }
  };

  return (
    <div className="screen">
      <div className="screen-content" style={{ gap: '20px', maxWidth: '400px', width: '100%' }}>

        {step === 'mood' ? (
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
                  color: 'rgb(120,170,230)',
                  bg: 'rgba(100,149,237,0.07)',
                  border: 'rgba(100,149,237,0.3)',
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
                  className="lumo-mood-tile"
                  data-selected={mood === value ? 'true' : undefined}
                  data-other={mood && mood !== value ? 'true' : undefined}
                  onClick={() => handleMoodSelect(value)}
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
              onClick={() => handleMoodSelect('good')}
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
        ) : step === 'breath' ? (
          /* ── Huberman Focus Protocol (Physiological Sigh Primer) ──────────
             Evidenz: Spiegel & Huberman 2023 – ein doppelter Einatem +
             langer Ausatem aktiviert schnell den Parasympathikus und
             verbessert Fokus vor kognitiver Arbeit.
             Lumo-Umsetzung: Animierter Kreis, ~8s, vollständig skippable. */
          <BreathPrimer
            onDone={() => setStep('ready')}
            onSkip={() => setStep('ready')}
          />
        ) : (
          <>
            {/* Gap 8: Mood-responsiver LumoMascot statt hardcoded "idle".
                Evidenz: Pekrun 2006 – Emotionen formen kognitive Ressourcen.
                Mascot-State spiegelt den Mood zurück = emotionale Validierung.
                focused → cheer (aktivierend spiegeln)
                tired/stressed/overwhelmed → thinking (nicht-urteilend, ruhig)
                good/skip → idle (neutral) */}
            <LumoMascot state={
              mood === 'focused' ? 'cheer'
              : (mood === 'tired' || mood === 'stressed' || mood === 'overwhelmed') ? 'thinking'
              : 'idle'
            } />

            {/* Gap 6: Expliziter Session-Confirmation-Satz als erster Text.
                Konkurrenz-Lücke: Kein Tool sagt "alright — heute machen wir's kurz".
                Evidenz: Autonomy-support (Deci & Ryan SDT) → kurze, direkte Bestätigung
                des Mood als Legitimation für angepasste Session.
                Gap 6 = der Satz der fehlt: "Passt. Dann heute kurz und fokussiert." */}
            <div style={{ textAlign: 'center', width: '100%' }}>
              <p style={{
                fontSize: '18px',
                fontWeight: '700',
                color: mood === 'focused' ? 'var(--green)'
                      : mood === 'tired' || mood === 'stressed' || mood === 'overwhelmed' ? 'var(--text-primary)'
                      : 'var(--text-primary)',
                margin: '0 0 4px',
                lineHeight: '1.3',
              }}>
                {mood === 'focused' && '⚡ Alright — heute gehen wir rein.'}
                {mood === 'tired' && 'Passt. Dann heute kurz und einfach.'}
                {mood === 'stressed' && 'Verstanden. Ich halte es übersichtlich.'}
                {mood === 'overwhelmed' && 'Kein Problem — Schritt für Schritt.'}
                {(mood === 'good' || mood === 'skip' || !mood) && 'Alles klar. Ich hab alles vorbereitet.'}
              </p>
            </div>

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
                width: '100%',
              }}>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0', lineHeight: '1.8' }}>
                  {mood === 'tired' && '✓ Kürzere Erklärungen · ✓ Einfachere Fragen · ✓ Kein Zeitdruck'}
                  {mood === 'stressed' && '✓ Ein Block, dann Pause · ✓ Kein Recall-Druck · ✓ Du bestimmst das Tempo'}
                  {mood === 'overwhelmed' && '✓ Nur das Wichtigste · ✓ Kein Mehrfach-Konzept · ✓ Ich mach es ganz einfach'}
                </p>
              </div>
            )}
            {mood === 'focused' && (
              <p style={{ fontSize: '13px', color: 'var(--green)', textAlign: 'center', margin: '-8px 0 0', fontWeight: '500' }}>
                Volle Tiefe — ich gehe heute mehr ins Detail.
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

            {/* Gap 7 – "Letzte Session hattest du Probleme mit:" Framing.
                Konkurrenz-Lücke: Tools zeigen Lücken als anonyme Listen ohne Kontext.
                Problem: "Noch unsicher" triggert Scham. Keine Verbindung zur letzten Session.
                Evidenz: Episodisches Gedächtnis (Tulving) – Erinnerung an letztes Mal
                aktiviert Kontinuität statt Neubewertung. "Letztes Mal" = persönlich, spezifisch.
                Fix: Explizite Verbindung zur letzten Lernsession herstellen. */}
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
                    ? 'Heute nicht — nächstes Mal'
                    : 'Letzte Session — noch offen'}
                </p>
                {!(mood === 'tired' || mood === 'overwhelmed') && (
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 10px', lineHeight: '1.5' }}>
                    Letztes Mal hattest du damit noch Schwierigkeiten:
                  </p>
                )}
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
              {mood === 'tired' ? 'Los geht\'s – kurz und einfach'
               : mood === 'stressed' ? 'Los geht\'s – ich halte es übersichtlich'
               : mood === 'overwhelmed' ? 'Los geht\'s – Schritt für Schritt'
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
              Direkt starten
            </button>
          </>
        )}

      </div>
    </div>
  );
}
