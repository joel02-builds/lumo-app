// Persistenter Schriftzug oben links, auf allen Screens außer dem Welcome-Screen.
// Klick führt immer zurück zum Dashboard.
export default function LumoWordmark({ onClick }) {
  return (
    <button type="button" className="lumo-wordmark" onClick={onClick}>
      lumo
    </button>
  );
}
