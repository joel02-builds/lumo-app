import { useEffect, useState } from 'react';
import LumoMascot from '../components/LumoMascot.jsx';

const MESSAGES = [
  'Ich schaue mir dein Material an …',
  'Ich erkenne die Struktur …',
  'Ich teile in Lernblöcke auf …',
  'Ich schätze die Schwierigkeit ein …',
  'Fast fertig …',
];

export default function AnalyzingScreen() {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((i) => (i + 1) % MESSAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="screen">
      <div className="screen-content">
        <LumoMascot state="thinking" />
        <h1 style={{ fontSize: '22px', textAlign: 'center', lineHeight: '1.3' }}>
          {MESSAGES[msgIndex]}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Das dauert einen Moment.
        </p>
      </div>
    </div>
  );
}
