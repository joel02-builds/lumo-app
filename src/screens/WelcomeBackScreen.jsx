import LumoMascot from '../components/LumoMascot.jsx';
import Button from '../components/Button.jsx';
import { getRecommendedBlock } from '../utils/blockProgress.js';

// Erscheint statt Onboarding, wenn beim App-Start ein gespeichertes Projekt
// gefunden wird. Maximal clean: ein Ergebnis, ein Hauptbutton, zwei dezente Links.
export default function WelcomeBackScreen({ blocks, recommendedOrder, onStartBlock, onGoToDashboard, onNewProject }) {
  const total = blocks.length;
  const completed = blocks.filter((b) => b.status === 'completed').length;
  const next = getRecommendedBlock(blocks, recommendedOrder);

  return (
    <div className="screen">
      <div className="screen-content">
        <LumoMascot state="idle" label="Lumo" />
        <h1>Willkommen zurück.</h1>
        <p className="welcome-back-stats">
          Du hast {completed} von {total} Blöcken geschafft.
        </p>

        {next ? (
          <Button onClick={() => onStartBlock(next.id)}>Weiter mit „{next.title}“</Button>
        ) : (
          <p className="all-done-text">Du hast alle Blöcke geschafft. Starkes Lernen!</p>
        )}

        <div className="welcome-back-links">
          <button className="text-link" onClick={onGoToDashboard}>
            Anderen Block wählen
          </button>
          <button className="text-link" onClick={onNewProject}>
            Neues Projekt starten
          </button>
        </div>
      </div>
    </div>
  );
}
