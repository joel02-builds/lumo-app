/**
 * ElaborationPhase — Vorwissen-Aktivierung vor dem Lernen
 *
 * Evidenz:
 * ─────────────────────────────────────────────────────────────────────────
 * Elaborative Interrogation (Dunlosky et al., 2013):
 *   "Mittlere bis hohe Wirksamkeit" — Nutzer beantworten "Warum?" und "Wie?"
 *   Fragen vor dem Lernen, was neue Informationen besser mit bestehendem
 *   Wissen verknüpft (Ausubel, 1978: "Advance Organizer").
 *
 * Self-Explanation Effect (Chi et al., 1989):
 *   Eigene Erklärungen vor der Lernphase erhöhen Verstehensbewertungen um 25%.
 *
 * ADHS-spezifisch:
 *   Aktivierung von Vorwissen reduziert kognitive Fremdheit des neuen Materials
 *   und steigert initiales Engagement — besonders wichtig für ADHS-Nutzer, die
 *   bei "kalten" Themen schnell disengagen.
 *
 * Ton:
 * – Kurz: max. 60s, kein Zwang zur vollständigen Antwort
 * – Keine Benotung: alles ist richtig, Ziel ist Aktivierung nicht Test
 * – Kann übersprungen werden — keine Barriere
 * – ADHS-safe: kein Druck, kein "Falsch", nur Neugier
 */

import { useState, useRef, useEffect } from 'react';
import LumoMascot from '../../components/LumoMascot.jsx';
import { getBlockColor } from '../../utils/subjectColors.js';

// Elaborations-Fragen — Auswahl passend zum Block-Titel
function getElaborationQuestion(blockTitle) {
  const title = blockTitle?.toLowerCase() || '';

  // Fragen-Vorlagen: aktivieren Vorwissen ohne Druck
  const templates = [
    `Was fällt dir spontan zu „${blockTitle}" ein?`,
    `Was glaubst du, worum es bei „${blockTitle}" geht?`,
    `Was verbindest du mit dem Thema „${blockTitle}"?`,
    `Was weißt du schon über „${blockTitle}"?`,
  ];

  // Einfache Heuristik: nimm erste Frage, die nicht "Was weißt du schon" ist,
  // wenn der Titel kurz ist (wirkt spezifischer)
  if (blockTitle && blockTitle.length < 30) {
    return templates[0];
  }
  return templates[Math.floor(Math.random() * 2)];
}

const MIN_CHARS_FOR_FULL_XP = 20; // Mindest-Zeichen für volle Elaboration

export default function ElaborationPhase({ block, onDone, onSkip, onBack }) {
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [autoSkipSecs, setAutoSkipSecs] = useState(null);
  const color = getBlockColor(block);
  const textareaRef = useRef(null);
  const question = getElaborationQuestion(block?.title);

  // Auto-Fokus auf Textarea — scrollIntoView verhindert iOS-Layout-Shift
  useEffect(() => {
    const t = setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }, 400);
    return () => clearTimeout(t);
  }, []);

  // Nach Submit: 2s Feedback, dann weiter
  useEffect(() => {
    if (!submitted) return;
    const t = setTimeout(() => onDone(), 1800);
    return () => clearTimeout(t);
  }, [submitted, onDone]);

  function handleSubmit() {
    if (submitted) return;
    setSubmitted(true);
  }

  const hasEnoughText = answer.trim().length >= MIN_CHARS_FOR_FULL_XP;
  const hasSomeText = answer.trim().length > 0;

  if (submitted) {
    return (
      <div className="screen">
        <div className="screen-content" style={{ gap: '20px', maxWidth: '400px' }}>
          <LumoMascot state="cheer" />
          <div style={{ textAlign: 'center', animation: 'fadeIn 0.4s ease' }}>
            <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>
              {hasEnoughText
                ? 'Gut aktiviert.'
                : 'Perfekt.'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5' }}>
              {hasEnoughText
                ? 'Dein Vorwissen ist aktiviert – das macht das Lernen gleich leichter.'
                : 'Manchmal reicht es, kurz hinzuschauen. Der Rest kommt beim Lernen.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      {/* P1-UX-01: Escape-Hatch – subtile Zurück-Schaltfläche, damit Nutzer
          jederzeit die Session beenden können. onSkip ≠ onBack:
          onSkip überspringt nur die Elaboration und startet die Lernphase,
          onBack kehrt komplett zum Dashboard zurück. */}
      {onBack && (
        <button
          onClick={onBack}
          aria-label="Zurück zum Dashboard"
          title="Session beenden"
          style={{
            position: 'fixed',
            top: 'calc(16px + env(safe-area-inset-top, 0px))',
            left: '16px',
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            fontSize: '14px',
            cursor: 'pointer',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            zIndex: 10,
            opacity: 0.65,
          }}
          onFocus={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.outline = '2px solid var(--gold)'; e.currentTarget.style.outlineOffset = '2px'; }}
          onBlur={e => { e.currentTarget.style.opacity = '0.65'; e.currentTarget.style.outline = 'none'; }}
          onMouseEnter={e => e.currentTarget.style.opacity = '1'}
          onMouseLeave={e => e.currentTarget.style.opacity = '0.65'}
        >
          ← Zurück
        </button>
      )}
      <div className="screen-content" style={{ gap: '20px', maxWidth: '440px' }}>

        <LumoMascot state="thinking" />

        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: '11px',
            fontWeight: '700',
            letterSpacing: '1.4px',
            textTransform: 'uppercase',
            color,
            marginBottom: '10px',
          }}>
            Bevor wir anfangen
          </div>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '700',
            lineHeight: '1.4',
            margin: '0',
          }}>
            {question}
          </h2>
        </div>

        {/* Eingabe — kein Zwang, kein Rotes */}
        <div style={{ width: '100%' }}>
          <textarea
            ref={textareaRef}
            rows={4}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Stichworte, halbe Sätze, egal — alles hilft …"
            onKeyDown={(e) => {
              // Cmd/Ctrl+Enter submittiert
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                handleSubmit();
              }
            }}
            style={{
              width: '100%',
              borderColor: hasSomeText ? color : undefined,
            }}
          />
          <p style={{
            fontSize: '12px',
            color: 'var(--text-secondary)',
            margin: '6px 0 0',
            textAlign: 'right',
            opacity: 0.6,
          }}>
            Kein Test. Kein Richtig oder Falsch. Nur warm werden.
          </p>
        </div>

        <div style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}>
          <button
            onClick={handleSubmit}
            style={{
              width: '100%',
              background: hasSomeText ? color : 'rgba(212,168,67,0.12)',
              color: hasSomeText ? '#1a1206' : 'rgba(212,168,67,0.9)',
              border: hasSomeText ? 'none' : '1.5px solid rgba(212,168,67,0.35)',
              borderRadius: '12px',
              padding: '14px',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {hasSomeText ? 'Weiter →' : 'Direkt rein →'}
          </button>

          {/* Überspringen — immer sichtbar, aber unaufdringlich */}
          <button
            onClick={onSkip}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '13px',
              cursor: 'pointer',
              padding: '6px',
              opacity: 0.7,
            }}
          >
            Überspringen
          </button>
        </div>

      </div>
    </div>
  );
}
