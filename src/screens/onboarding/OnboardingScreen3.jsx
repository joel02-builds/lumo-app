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

const LEARNING_STYLES = [
  { label: 'Mit Beispielen', value: 'examples', icon: '💡', sub: 'Konkrete Fälle zuerst' },
  { label: 'Zusammenhänge', value: 'connections', icon: '🔗', sub: 'Wie alles zusammenhängt' },
  { label: 'Schritt für Schritt', value: 'stepbystep', icon: '📋', sub: 'Klare Reihenfolge' },
  { label: 'Mit Vergleichen', value: 'analogies', icon: '🌉', sub: 'Einfache Analogien' },
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
  const [confirmedGoal, setConfirmedGoal] = useState(null);
  const [showSprintInterstitial, setShowSprintInterstitial] = useState(false);
  const [pendingSprintGoal, setPendingSprintGoal] = useState(null);

  const selectedGoal = GOALS.find((g) => g.id === selectedId);

  function selectGoal(goal) {
    if (goal.needsDate) {
      setSelectedId(goal.id);
    } else {
      setConfirmedGoal({ goalType: goal.id, goalDate: '', sprintMode: false });
    }
  }

  function confirmDate() {
    if (!goalDate) return;
    // Sprint-Modus: Prüfung in ≤3 Tagen → Interstitial zeigen
    const days = getDaysUntilDate(goalDate);
    if (selectedId === 'exam' && days !== null && days <= 3) {
      setPendingSprintGoal({ goalType: selectedId, goalDate, daysUntilExam: days });
      setShowSprintInterstitial(true);
    } else {
      setConfirmedGoal({ goalType: selectedId, goalDate, sprintMode: false });
    }
  }

  // Sprint-Modus Interstitial: erscheint wenn Prüfung ≤3 Tage
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
            onClick={() => setConfirmedGoal({ ...pendingSprintGoal, sprintMode: true })}
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
              setConfirmedGoal({ ...pendingSprintGoal, sprintMode: false });
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

  if (confirmedGoal) {
    return (
      <div className="screen" key="learning-style">
        <div className="screen-content">
          <LumoMascot state="idle" label="Lumo" />
          <p style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', textAlign: 'center', margin: '0' }}>
            Wie lernst du am liebsten?
          </p>
          <p style={{
            fontSize: '14px',
            color: 'var(--text-secondary)',
            textAlign: 'center',
            margin: '-4px 0 4px',
            lineHeight: '1.5',
          }}>
            Lumo erklärt dann genau so wie es für dich am besten passt.
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            width: '100%',
          }}>
            {LEARNING_STYLES.map(({ label, value, icon, sub }) => (
              <button
                key={value}
                onClick={() => onConfirm({ goalType: confirmedGoal.goalType, goalDate: confirmedGoal.goalDate, sprintMode: confirmedGoal.sprintMode || false, learningStyle: value })}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '14px',
                  padding: '16px 10px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--gold)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <span style={{ fontSize: '24px' }}>{icon}</span>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', textAlign: 'center' }}>{label}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center', lineHeight: '1.3' }}>{sub}</span>
              </button>
            ))}
          </div>
          <button className="text-link" onClick={() => setConfirmedGoal(null)}>
            ← Zurück
          </button>
        </div>
      </div>
    );
  }

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
            Weiter
          </Button>
          <button className="text-link" onClick={() => setSelectedId(null)}>
            Zurück zur Auswahl
          </button>
        </div>
      </div>
    );
  }

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
