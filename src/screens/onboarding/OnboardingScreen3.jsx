import { useState } from 'react';
import LumoMascot from '../../components/LumoMascot.jsx';
import Button from '../../components/Button.jsx';

const GOALS = [
  { id: 'exam', label: 'Prüfung', needsDate: true, dateLabel: 'Wann ist die Prüfung?' },
  { id: 'homework', label: 'Hausarbeit', needsDate: true, dateLabel: 'Wann ist die Abgabe?' },
  { id: 'understand', label: 'Einfach verstehen', needsDate: false },
];

export default function OnboardingScreen3({ onConfirm, onBack }) {
  const [selectedId, setSelectedId] = useState(null);
  const [goalDate, setGoalDate] = useState('');

  const selectedGoal = GOALS.find((g) => g.id === selectedId);

  function selectGoal(goal) {
    if (goal.needsDate) {
      setSelectedId(goal.id);
    } else {
      onConfirm({ goalType: goal.id, goalDate: '' });
    }
  }

  function confirmDate() {
    if (!goalDate) return;
    onConfirm({ goalType: selectedId, goalDate });
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
              {g.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
