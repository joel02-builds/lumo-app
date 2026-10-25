/**
 * OnboardingScreen3 — Optionaler Termin-Screen
 *
 * Entscheidung: Die 3 Ziel-Optionen (Prüfung / Hausarbeit / Einfach verstehen)
 * wurden entfernt. Begründung:
 *
 *   1. Cognitive Load: User wollen sofort loslegen, nicht kategorisieren.
 *   2. Differenzierung unklar: "Prüfung" vs "Verstehen" ist eine Frage der
 *      Intensität, nicht des Flows — Lumo kann das selbst ableiten.
 *   3. Dropout-Risiko: Jede extra Entscheidung vor dem ersten Wert kostet.
 *      (Hick's Law: Entscheidungszeit ∝ Anzahl Optionen)
 *
 * Was bleibt:
 *   – Optionaler Termin: Wer einen Abgabe- oder Prüfungstermin hat, kann ihn
 *     eintragen. Lumo nutzt ihn für den Countdown und ggf. Sprint-Modus.
 *   – "Jetzt loslegen" überspringt den Termin komplett.
 *   – Sprint-Modus bleibt für Prüfungen ≤3 Tage erhalten.
 *
 * Default bei "Jetzt loslegen": goalType = 'understand', goalDate = '', sprintMode = false
 */

import { useState } from 'react';
import LumoMascot from '../../components/LumoMascot.jsx';

function getDaysUntilDate(dateStr) {
  if (!dateStr) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

export default function OnboardingScreen3({ onConfirm, onBack }) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [goalDate, setGoalDate] = useState('');
  const [goalType, setGoalType] = useState('understand');
  const [showSprintInterstitial, setShowSprintInterstitial] = useState(false);
  const [pendingSprintGoal, setPendingSprintGoal] = useState(null);

  // Sprint-Modus Interstitial: Prüfung in ≤3 Tagen
  if (showSprintInterstitial && pendingSprintGoal) {
    const { daysUntilExam } = pendingSprintGoal;
    const dayWord = daysUntilExam === 0 ? 'heute' : daysUntilExam === 1 ? 'morgen' : `in ${daysUntilExam} Tagen`;
    return (
      <div className="screen" key="sprint-interstitial">
        <div className="screen-content" style={{ gap: '20px', maxWidth: '400px' }}>
          <LumoMascot state="cheer" />
          <div style={{ textAlign: 'center' }}>
            <p style={{
              fontSize: '11px',
              fontWeight: '700',
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              color: 'var(--gold)',
              margin: '0 0 10px',
            }}>
              Sprint-Modus
            </p>
            <h1 style={{ fontSize: '22px', lineHeight: '1.35', marginBottom: '12px' }}>
              Deine Prüfung ist {dayWord}.
            </h1>
            <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: '1.6', margin: '0' }}>
              Lumo schaltet in den <strong style={{ color: 'var(--text-primary)' }}>Sprint-Modus</strong>.
              Statt allem zu lernen, fokussierst du dich jetzt auf das Wichtigste –
              komprimiert, direkt, prüfungsrelevant.
            </p>
          </div>

          <div style={{
            width: '100%',
            background: 'rgba(212, 168, 67, 0.07)',
            border: '1px solid rgba(212, 168, 67, 0.2)',
            borderRadius: '14px',
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}>
            {[
              { icon: '⚡', text: 'Nur die prüfungsrelevantesten Themen zuerst' },
              { icon: '⏱', text: 'Jeder Block max. 20 Minuten' },
              { icon: '🎯', text: 'Direkt testen statt lang erklären' },
              { icon: '🧠', text: 'Am Ende: deine 3 wichtigsten Punkte zum Wiederholen' },
            ].map(({ icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>{icon}</span>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.45' }}>{text}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => onConfirm({ ...pendingSprintGoal, sprintMode: true, learningStyle: null })}
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
            Sprint starten
          </button>

          <button
            onClick={() => {
              setShowSprintInterstitial(false);
              onConfirm({ ...pendingSprintGoal, sprintMode: false, learningStyle: null });
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '13px',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            Nein, normal lernen
          </button>
        </div>
      </div>
    );
  }

  // Datum-Picker (erscheint wenn "Termin eintragen" geklickt)
  if (showDatePicker) {
    function confirmDate() {
      if (!goalDate) return;
      const days = getDaysUntilDate(goalDate);
      // Sprint-Modus wenn Prüfung in ≤3 Tagen
      if (goalType === 'exam' && days !== null && days <= 3) {
        setPendingSprintGoal({ goalType, goalDate, daysUntilExam: days });
        setShowSprintInterstitial(true);
      } else {
        onConfirm({ goalType, goalDate, sprintMode: false, learningStyle: null });
      }
    }

    return (
      <div className="screen" key="goal-date">
        <div className="screen-content" style={{ gap: '24px', maxWidth: '400px' }}>
          <LumoMascot state="idle" />
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '22px', marginBottom: '8px' }}>Wann ist der Termin?</h1>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: '0' }}>
              Lumo zeigt dir einen Countdown und passt den Fokus an.
            </p>
          </div>

          {/* Typ-Auswahl: Prüfung oder Abgabe — kompakt */}
          <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
            {[{ id: 'exam', label: '📝 Prüfung' }, { id: 'homework', label: '📄 Abgabe' }].map((t) => (
              <button
                key={t.id}
                onClick={() => setGoalType(t.id)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '12px',
                  border: goalType === t.id ? '2px solid var(--gold)' : '1px solid var(--border)',
                  background: goalType === t.id ? 'rgba(212,168,67,0.10)' : 'var(--bg-card)',
                  color: goalType === t.id ? 'var(--gold)' : 'var(--text-secondary)',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <input
            type="date"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--gold)',
              borderRadius: '12px',
              color: 'var(--text-primary)',
              fontSize: '18px',
              padding: '14px 20px',
              fontFamily: 'inherit',
              outline: 'none',
              cursor: 'pointer',
              width: '100%',
              maxWidth: '280px',
            }}
            min={new Date().toISOString().split('T')[0]}
            value={goalDate}
            onChange={(e) => setGoalDate(e.target.value)}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
            <button
              onClick={confirmDate}
              disabled={!goalDate}
              style={{
                width: '100%',
                background: goalDate ? 'var(--gold)' : 'var(--bg-card)',
                color: goalDate ? '#1a1206' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: '12px',
                padding: '15px',
                fontSize: '16px',
                fontWeight: '700',
                cursor: goalDate ? 'pointer' : 'not-allowed',
                transition: 'all 0.15s ease',
              }}
            >
              Los geht's →
            </button>
            <button
              className="text-link"
              onClick={() => setShowDatePicker(false)}
            >
              Zurück
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Hauptansicht — Direktstart ohne Entscheidungszwang
  return (
    <div className="screen" key="goal-start">
      <button className="back-link" onClick={onBack}>
        ← Zurück
      </button>
      <div className="screen-content" style={{ gap: '28px', maxWidth: '400px' }}>
        <LumoMascot state="idle" />

        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '24px', lineHeight: '1.3', marginBottom: '10px' }}>
            Bereit zum Starten.
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: '1.6', margin: '0' }}>
            Lumo analysiert dein Material und teilt es in lernbare Blöcke auf.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
          {/* Primärer CTA: direkt starten */}
          <button
            onClick={() => onConfirm({ goalType: 'understand', goalDate: '', sprintMode: false, learningStyle: null })}
            style={{
              width: '100%',
              background: 'var(--gold)',
              color: '#1a1206',
              border: 'none',
              borderRadius: '14px',
              padding: '16px',
              fontSize: '17px',
              fontWeight: '800',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Jetzt loslegen →
          </button>

          {/* Sekundär: optionaler Termin */}
          <button
            onClick={() => setShowDatePicker(true)}
            style={{
              width: '100%',
              background: 'transparent',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              padding: '13px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Ich habe einen Prüfungs- oder Abgabetermin
          </button>
        </div>
      </div>
    </div>
  );
}
