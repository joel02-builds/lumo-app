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

export default function ElaborationPhase({ block, onDone, onSkip }) {
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [autoSkipSecs, setAutoSkipSecs] = useState(null);
  const color = getBlockColor(block);
  const textareaRef = useRef(null);
  const question = getElaborationQuestion(block?.title);

  // Auto-Fokus auf Textarea
  useEffect(() => {
    const t = setTimeout(() => textareaRef.current?.focus(), 400);
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
                : 'Los geht\'s.'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5' }}>
              {hasEnoughText
                ? 'Dein Vorwissen ist jetzt aktiviert – das macht das Lernen leichter.'
                : 'Das Thema kommt dir beim Lernen bekannter vor.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="screen-content" style={{ gap: '20px', maxWidth: '440px' }}>

        <LumoMascot state="thinking" label="Lumo" />

        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: '11px',
            fontWeight: '700',
            letterSpacing: '1.4px',
            textTransform: 'uppercase',
            color,
            marginBottom: '10px',
          }}>
            Kurz nachdenken
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
            placeholder="Stichworte, Sätze, egal was dir einfällt …"
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
            Alles richtig — Ziel ist Aktivierung, kein Test.
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
              background: hasSomeText ? color : 'var(--bg-card)',
              color: hasSomeText ? '#1a1206' : 'var(--text-secondary)',
              border: hasSomeText ? 'none' : '1px solid var(--border)',
              borderRadius: '12px',
              padding: '14px',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {hasSomeText ? 'Weiter →' : 'Einfach mal schauen →'}
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
