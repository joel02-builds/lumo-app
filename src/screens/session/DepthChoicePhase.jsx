import LumoMascot from '../../components/LumoMascot.jsx';

// Erster Schritt jedes Blocks: legt fest, wie tief Lumos Eröffnungserklärung startet.
export default function DepthChoicePhase({ onChoose }) {
  return (
    <div className="screen">
      <div className="screen-content">
        <LumoMascot state="idle" label="Lumo" />
        <h1>Wie möchtest du einsteigen?</h1>
        <div className="goal-options">
          <button className="depth-btn" onClick={() => onChoose('simple')}>
            Erstmal einfach &amp; grob
          </button>
          <button className="depth-btn" onClick={() => onChoose('detailed')}>
            Direkt ins Detail
          </button>
        </div>
      </div>
    </div>
  );
}
