import { useState } from 'react';
import LumoMascot from '../../components/LumoMascot.jsx';
import Button from '../../components/Button.jsx';

export default function OnboardingScreen1({ onNext }) {
  const [learningStyle, setLearningStyle] = useState(null);

  return (
    <div className="screen">
      <div className="screen-content" style={{ gap: '24px', maxWidth: '400px' }}>

        <LumoMascot state="idle" />

        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '28px', marginBottom: '12px', lineHeight: '1.2' }}>
            Du lernst.<br />Lumo übernimmt den Rest.
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '16px', lineHeight: '1.6' }}>
            Ich plane. Ich strukturiere. Ich sage dir was als nächstes kommt.
            Du lernst – ich kümmere mich um den Rest.
          </p>
        </div>

        <div style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}>
          {[
            { icon: '📄', text: 'Material hochladen oder einfügen' },
            { icon: '🧩', text: 'Lumo teilt es in Lernblöcke auf' },
            { icon: '💬', text: 'Lumo erklärt – du antwortest' },
            { icon: '✓', text: 'Lumo merkt sich was du noch brauchst' },
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '12px 16px',
              background: 'var(--bg-card)',
              borderRadius: '12px',
              border: '1px solid var(--border)',
            }}>
              <span style={{ fontSize: '20px', flexShrink: 0 }}>{item.icon}</span>
              <span style={{
                fontSize: '15px',
                color: 'var(--text-primary)',
                fontWeight: '500',
              }}>
                {item.text}
              </span>
            </div>
          ))}
        </div>

        <div style={{
          width: '100%',
          background: 'var(--bg-card)',
          borderRadius: '12px',
          padding: '14px 16px',
          borderLeft: '3px solid var(--gold)',
        }}>
          <p style={{
            fontSize: '14px',
            color: 'var(--text-secondary)',
            margin: '0',
            lineHeight: '1.5',
            fontStyle: 'italic',
          }}>
            „Ich hab endlich aufgehört Lernmaterial nur durchzulesen.
            Lumo zwingt mich wirklich zu verstehen."
          </p>
          <p style={{
            fontSize: '12px',
            color: 'var(--text-secondary)',
            margin: '6px 0 0',
            fontWeight: '600',
          }}>
            – Beta-Nutzer, Psychologie-Studentin
          </p>
        </div>

        {!learningStyle ? (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', textAlign: 'center', margin: '0' }}>
              Wie lernst du am liebsten?
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { label: 'Mit Beispielen', value: 'examples', icon: '💡' },
                { label: 'Mit Zusammenhängen', value: 'connections', icon: '🔗' },
                { label: 'Schritt für Schritt', value: 'stepbystep', icon: '📋' },
              ].map(({ label, value, icon }) => (
                <button
                  key={value}
                  onClick={() => setLearningStyle(value)}
                  style={{
                    flex: 1,
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    padding: '12px 8px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span style={{ fontSize: '20px' }}>{icon}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500', textAlign: 'center' }}>{label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <Button onClick={() => onNext({ learningStyle })} style={{ width: '100%' }}>
            Jetzt starten
          </Button>
        )}

      </div>
    </div>
  );
}
