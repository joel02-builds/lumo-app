import LumoMascot from '../../components/LumoMascot.jsx';
import Button from '../../components/Button.jsx';

export default function OnboardingScreen1({ onNext }) {
  return (
    <div className="screen">
      <div className="screen-content" style={{ gap: '24px', maxWidth: '400px' }}>

        <LumoMascot state="idle" />

        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '28px', marginBottom: '12px', lineHeight: '1.2' }}>
            Du lernst.<br />Lumo übernimmt den Rest.
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '16px', lineHeight: '1.6' }}>
            Kein Planen. Kein Strukturieren. Kein Rätseln was als nächstes kommt.
            Lumo führt dich – Schritt für Schritt – durch dein Lernmaterial.
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

        <Button onClick={onNext} style={{ width: '100%' }}>
          Jetzt starten
        </Button>

      </div>
    </div>
  );
}
