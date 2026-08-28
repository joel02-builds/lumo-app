import LumoMascot from '../../components/LumoMascot.jsx';
import Button from '../../components/Button.jsx';

// Echter mentaler Abschluss der Session nach "Pause machen" auf dem
// Block-Abschluss-Screen. Der Block ist zu diesem Zeitpunkt bereits erfasst.
export default function BlockCompleteBreakScreen({ completedToday, onContinue }) {
  return (
    <div className="screen">
      <div className="screen-content">
        <LumoMascot state="idle" label="Lumo" />
        <h1>
          Pause. Du hast heute {completedToday} {completedToday === 1 ? 'Block' : 'Blöcke'} geschafft.
        </h1>
        <p className="hint-text">Dein Fortschritt ist gespeichert.</p>
        <Button onClick={onContinue}>Weiter lernen</Button>
      </div>
    </div>
  );
}
