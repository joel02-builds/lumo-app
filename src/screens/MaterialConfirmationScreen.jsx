import LumoMascot from '../components/LumoMascot.jsx';
import Button from '../components/Button.jsx';

function formatDuration(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} Minuten`;
  const hourLabel = hours === 1 ? 'Stunde' : 'Stunden';
  if (minutes === 0) return `${hours} ${hourLabel}`;
  return `${hours} ${hourLabel} ${minutes} Minuten`;
}

// Zwischenstopp nach der Analyse, bevor das Dashboard erscheint – gibt dem
// Nutzer Kontrolle und Vertrauen, bevor er wirklich loslegt.
export default function MaterialConfirmationScreen({ blocks, onConfirm, onReanalyze }) {
  const totalMinutes = blocks.reduce((sum, b) => sum + (b.estimatedMinutes || 0), 0);

  return (
    <div className="screen">
      <div className="screen-content">
        <LumoMascot state="idle" label="Lumo" />
        <h1>Lumo hat dein Material verstanden.</h1>

        <ul className="block-preview-list">
          {blocks.map((b) => (
            <li key={b.id}>{b.title}</li>
          ))}
        </ul>

        <p className="confirmation-stats">
          {blocks.length} Lernblöcke wurden erstellt · ca. {formatDuration(totalMinutes)} Gesamtlernzeit
        </p>

        <Button onClick={onConfirm}>Los geht&apos;s</Button>
        <button className="text-link" onClick={onReanalyze}>
          Neu analysieren
        </button>
      </div>
    </div>
  );
}
