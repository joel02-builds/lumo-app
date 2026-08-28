// Nicht-modale Empfehlung nach 20 aktiven Lernminuten, erscheint als sanfter
// Streifen unter dem aktuellen Inhalt statt als störendes Modal.
export default function BreakSuggestionToast({ onBreak, onContinue }) {
  return (
    <div className="break-toast" role="status">
      <p>Du lernst schon 20 Minuten. Eine kurze Pause hilft deinem Gehirn.</p>
      <div className="break-toast-actions">
        <button type="button" className="lumo-btn lumo-btn--primary" onClick={onBreak}>
          Pause machen
        </button>
        <button type="button" className="text-link" onClick={onContinue}>
          Weiter lernen
        </button>
      </div>
    </div>
  );
}
