// Proaktiver, app-weiter Hinweis, sobald der Browser keine Verbindung mehr hat.
export default function OfflineBanner() {
  return (
    <div className="offline-banner" role="status">
      Du bist gerade offline. Lumo braucht eine Verbindung zum Lernen.
    </div>
  );
}
