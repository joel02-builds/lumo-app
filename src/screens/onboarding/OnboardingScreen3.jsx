/**
 * OnboardingScreen3 — Ziel-Auswahl
 *
 * Änderungen vs. vorher:
 * ─────────────────────────────────────────────────────────────────────────
 * 1. Lernstil-Picker ENTFERNT — wird später im Dashboard/Einstellungen angeboten
 *    nach der ersten Session, wenn der Nutzer bereits Kontext hat.
 *    Evidenz: Learning-Style-Picker im Onboarding erhöht Drop-Off,
 *    weil er nicht für sofortigen Wert steht und die Entscheidung unklar ist.
 *    (Pashler et al., 2008: Lernstile als Konzept schwach belegt)
 *
 * 2. Nach Ziel + Datum-Bestätigung → direkt onConfirm (keine weitere Stufe)
 * 3. Back-Button geht zurück zu Onboarding Screen 1 (nicht mehr Step 2)
 *
 * Flows:
 * ─────────────────────────────────────────────────────────────────────────
 *   [Ziel auswählen]
 *     → "Einfach verstehen" → onConfirm direkt
 *     → "Prüfung" / "Hausarbeit" → Datum-Picker → [Sprint-Check] → onConfirm
 */

import { useState } from 'react';
import LumoMascot from '../../components/LumoMascot.jsx';
import Button from '../../components/Button.jsx';

const GOALS = [
  {
    id: 'exam',
    label: 'Prüfung',
    needsDate: true,
    dateLabel: 'Wann ist die Prüfung?',
    sub: 'Lumo fokussiert auf Prüfungsrelevanz und testet dich strenger.',
  },
  {
    id: 'homework',
    label: 'Hausarbeit',
    needsDate: true,
    dateLabel: 'Wann ist die Abgabe?',
    sub: 'Lumo hilft dir das Thema tief zu verstehen und zu strukturieren.',
  },
  {
    id: 'understand',
    label: 'Einfach verstehen',
    needsDate: false,
    sub: 'Lumo erklärt ohne Druck – du bestimmst das Tempo.',
  },
];

function getDaysUntilDate(dateStr) {
  if (!dateStr) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

export default function OnboardingScreen3({ onConfirm, onBack }) {
  const [selectedId, setSelectedId] = useState(null);
  const [goalDate, setGoalDate] = useState('');
  const [showSprintInterstitial, setShowSprintInterstitial] = useState(false);
  const [pendingSprintGoal, setPendingSprintGoal] = useState(null);

  const selectedGoal = GOALS.find((g) => g.id === selectedId);

  function selectGoal(goal) {
    if (goal.needsDate) {
      setSelectedId(goal.id);
    } else {
      // Direkter Abschluss ohne weiteren Schritt
      onConfirm({ goalType: goal.id, goalDate: '', sprintMode: false, learningStyle: null });
    }
  }

  function confirmDate() {
    if (!goalDate) return;
    const days = getDaysUntilDate(goalDate);
    // Sprint-Modus: Prüfung in ≤3 Tagen → Interstitial zeigen
    if (selectedId === 'exam' && days !== null && days <= 3) {
      setPendingSprintGoal({ goalType: selectedId, goalDate, daysUntilExam: days });
      setShowSprintInterstitial(true);
    } else {
      // Direkter Abschluss ohne Lernstil-Schritt
      onConfirm({ goalType: selectedId, goalDate, sprintMode: false, learningStyle: null });
    }
  }

  // Sprint-Modus Interstitial: erscheint wenn Prüfung ≤3 Tage entfernt
  if (showSprintInterstitial && pendingSprintGoal) {
    const { daysUntilExam } = pendingSprintGoal;
    const dayWord = daysUntilExam === 0 ? 'heute' : daysUntilExam === 1 ? 'morgen' : `in ${daysUntilExam} Tagen`;
    return (
      <div className="screen" key="sprint-interstitial">
        <div className="screen-content" style={{ gap: '20px', maxWidth: '400px' }}>
          <LumoMascot state="cheer" label="Lumo" />
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

  // Datum-Picker für Prüfung / Hausarbeit
  if (selectedGoal?.needsDate) {
    return (
      <div className="screen" key="goal-date">
        <div className="screen-content">
          <LumoMascot state="idle" label="Lumo" />
          <h1>{selectedGoal.dateLabel}</h1>
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
          <Button onClick={confirmDate} disabled={!goalDate}>
            Los geht's →
          </Button>
          <button className="text-link" onClick={() => setSelectedId(null)}>
            Zurück zur Auswahl
          </button>
        </div>
      </div>
    );
  }

  // Ziel-Auswahl (Hauptansicht)
  return (
    <div className="screen" key="goal-list">
      <button className="back-link" onClick={onBack}>
        ← Zurück
      </button>
      <div className="screen-content">
        <LumoMascot state="idle" label="Lumo" />
        <h1>Was ist dein Ziel?</h1>
        <div className="goal-options">
          {GOALS.map((g) => (
            <button key={g.id} className="goal-btn" onClick={() => selectGoal(g)}>
              <span style={{ display: 'block', fontWeight: '700', fontSize: '16px' }}>{g.label}</span>
              <span style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: '400' }}>{g.sub}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
