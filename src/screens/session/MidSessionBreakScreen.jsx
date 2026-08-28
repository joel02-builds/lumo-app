import LumoMascot from '../../components/LumoMascot.jsx';
import Button from '../../components/Button.jsx';

// Overlay statt Phasenwechsel: legt sich über die laufende Chat-/Abrufphase,
// ohne sie zu unmounten – so bleiben Chatverlauf bzw. eingetippte Antwort
// erhalten, wenn der Nutzer zurückkommt.
export default function MidSessionBreakScreen({ onContinue }) {
  return (
    <div className="break-overlay">
      <div className="screen-content">
        <LumoMascot state="idle" label="Lumo" />
        <h1>Gut gemacht.</h1>
        <p className="hint-text">Komm zurück, wenn du bereit bist.</p>
        <Button onClick={onContinue}>Ich bin zurück</Button>
      </div>
    </div>
  );
}
