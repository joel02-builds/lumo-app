import { useState } from 'react';
import LumoMascot from '../../components/LumoMascot.jsx';
import Button from '../../components/Button.jsx';
import DateSelect, { isDateComplete, toIsoDate } from '../../components/DateSelect.jsx';

const GOALS = [
  { id: 'exam', label: 'Prüfung', needsDate: true, dateLabel: 'Wann ist die Prüfung?' },
  { id: 'homework', label: 'Hausarbeit', needsDate: true, dateLabel: 'Wann ist die Abgabe?' },
  { id: 'understand', label: 'Einfach verstehen', needsDate: false },
];

const EMPTY_DATE = { day: '', month: '', year: '' };

export default function OnboardingScreen3({ onConfirm, onBack }) {
  const [selectedId, setSelectedId] = useState(null);
  const [date, setDate] = useState(EMPTY_DATE);

  const selectedGoal = GOALS.find((g) => g.id === selectedId);

  function selectGoal(goal) {
    if (goal.needsDate) {
      setSelectedId(goal.id);
    } else {
      onConfirm({ goalType: goal.id, goalDate: '' });
    }
  }

  function confirmDate() {
    if (!isDateComplete(date)) return;
    onConfirm({ goalType: selectedId, goalDate: toIsoDate(date) });
  }

  if (selectedGoal?.needsDate) {
    return (
      <div className="screen" key="goal-date">
        <div className="screen-content">
          <LumoMascot state="idle" label="Lumo" />
          <h1>{selectedGoal.dateLabel}</h1>
          <DateSelect value={date} onChange={setDate} />
          <Button onClick={confirmDate} disabled={!isDateComplete(date)}>
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
