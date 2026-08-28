// Warme, nie-technische Fehlermeldung mit optionalem Retry und Ausstieg zur Übersicht.
export default function ErrorBanner({ message, onRetry, onClose, onExit }) {
  return (
    <div className="error-banner" role="alert">
      <p>{message}</p>
      <div className="error-actions">
        {onRetry && (
          <button className="lumo-btn lumo-btn--primary" onClick={onRetry}>
            Nochmal versuchen
          </button>
        )}
        {onClose && (
          <button className="text-link" onClick={onClose}>
            Schließen
          </button>
        )}
        {onExit && (
          <button className="text-link" onClick={onExit}>
            Zur Übersicht
          </button>
        )}
      </div>
    </div>
  );
}
