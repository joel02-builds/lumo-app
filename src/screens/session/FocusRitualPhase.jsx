import { useEffect } from 'react';
import LumoMascot from '../../components/LumoMascot.jsx';

const RITUAL_MS = 3000;

// Kurzer mentaler Reset vor jedem Block – kein Button, automatischer Übergang.
export default function FocusRitualPhase({ onDone }) {
  useEffect(() => {
    const timer = setTimeout(onDone, RITUAL_MS);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="screen">
      <div className="screen-content">
        <LumoMascot state="idle" label="Lumo" />
        <h1>Bereit?</h1>
        <p className="hint-text">Alles andere kann warten.</p>
      </div>
    </div>
  );
}
