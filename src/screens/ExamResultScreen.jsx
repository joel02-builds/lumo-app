import { useState } from 'react';
import LumoMascot from '../components/LumoMascot.jsx';

const GRADES = [
  { label: 'Sehr gut', value: 'sehr_gut', emoji: '🏆', color: '#3D9E6E' },
  { label: 'Gut', value: 'gut', emoji: '✨', color: '#D4A843' },
  { label: 'Befriedigend', value: 'befriedigend', emoji: '👍', color: '#D4A843' },
  { label: 'Ausreichend', value: 'ausreichend', emoji: '📚', color: '#E07B54' },
  { label: 'Nicht bestanden', value: 'nicht_bestanden', emoji: '💪', color: '#E07B54' },
];

export default function ExamResultScreen({ project, onDone, onDismiss }) {
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const RESPONSES = {
    sehr_gut: 'Das ist das Ergebnis von echtem Lernen. Du hast es wirklich verstanden – das zeigt sich jetzt.',
    gut: 'Gut gemacht. Das war echte Arbeit. Beim nächsten Mal noch etwas gezielter die Lücken angehen.',
    befriedigend: 'Okay ist okay. Schau dir an was noch offen war – da steckt das nächste Mal mehr drin.',
    ausreichend: 'Bestanden ist bestanden. Ich merke mir was noch nicht saß – das wiederholen wir.',
    nicht_bestanden: 'Das tut weh – ich weiß. Aber du weißt jetzt genau was fehlt. Das ist mehr wert als es klingt.',
  };

  if (submitted && selected) {
    const grade = GRADES.find(g => g.value === selected);
    return (
      <div className="screen">
        <div className="screen-content" style={{ gap: '20px', maxWidth: '400px' }}>
          <LumoMascot state={selected === 'sehr_gut' || selected === 'gut' ? 'cheer' : 'learning'} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '8px' }}>{grade.emoji}</div>
            <h1 style={{ fontSize: '24px', marginBottom: '12px' }}>{grade.label}</h1>
            <p style={{ fontSize: '16px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              {RESPONSES[selected]}
            </p>
          </div>
          <button
            onClick={() => onDone(selected)}
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
            Weiter lernen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="screen-content" style={{ gap: '20px', maxWidth: '400px' }}>
        <LumoMascot state="idle" />
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '24px', marginBottom: '8px' }}>
            Wie lief die Prüfung?
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--text-secondary)', margin: '0' }}>
            Ich lerne daraus für das nächste Mal.
          </p>
        </div>

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {GRADES.map(grade => (
            <button
              key={grade.value}
              onClick={() => setSelected(grade.value)}
              style={{
                width: '100%',
                background: selected === grade.value ? `${grade.color}22` : 'var(--bg-card)',
                border: selected === grade.value ? `1px solid ${grade.color}` : '1px solid var(--border)',
                borderRadius: '12px',
                padding: '14px 18px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{ fontSize: '20px' }}>{grade.emoji}</span>
              <span style={{
                fontSize: '15px',
                fontWeight: '600',
                color: selected === grade.value ? grade.color : 'var(--text-primary)',
              }}>
                {grade.label}
              </span>
            </button>
          ))}
        </div>

        {selected && (
          <button
            onClick={() => setSubmitted(true)}
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
            Abschicken
          </button>
        )}

        <button
          onClick={onDismiss}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            fontSize: '13px',
            cursor: 'pointer',
            padding: '4px',
          }}
        >
          Später
        </button>
      </div>
    </div>
  );
}
