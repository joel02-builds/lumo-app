import React, { Component, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { isChunkLoadError, shouldAutoReload } from './utils/chunkError.js';
import './styles/fonts.css'; // F005: selbst gehostete Schriften, keine Verbindung zu Google
import './styles/index.css';
import './styles/app.css';
import { reportClientError, installGlobalErrorHandlers } from './utils/errorReport.js';

// F016: Laufzeitfehler (window.onerror, unhandledrejection) ins Server-Log melden.
installGlobalErrorHandlers();

// Nur im Fehlerfall "Neue Version": lädt den Tab EINMAL selbst neu (siehe chunkError.js).
// Eigene kleine Komponente, damit der Seiteneffekt nicht im Render des Boundaries steckt.
function ReloadOnceOnNewVersion() {
  useEffect(() => {
    if (shouldAutoReload()) window.location.reload();
  }, []);
  return null;
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    // Immer in die Console loggen — auch in Production
    console.error('[Lumo Error Boundary]', error, info?.componentStack);
    // F016: nur Typ, Screen-Name und gekürzte Meldung – kein Stack, keine Inhalte.
    reportClientError('boundary', error);
  }
  render() {
    if (this.state.hasError) {
      // Nach einem Deploy fehlt der Code-Chunk eines Screens: kein App-Fehler, sondern eine
      // neue Version. Freundlicher Hinweis statt "Etwas ist schiefgelaufen".
      const newVersion = isChunkLoadError(this.state.error);
      return (
        <div style={{
          minHeight: 'var(--dvh, 100dvh)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 24px',
          background: '#0F1920',
          gap: '20px',
          textAlign: 'center',
        }}>
          {newVersion && <ReloadOnceOnNewVersion />}
          <img src="/mascot/lumo-idle.webp" srcSet="/mascot/lumo-idle.webp 1x, /mascot/lumo-idle@2x.webp 2x" alt="Lumo" width={100} height={100} style={{ objectFit: 'contain' }} />
          <h1 style={{ fontSize: '24px', color: '#F0EDE8', margin: '0' }}>
            {newVersion ? 'Es gibt eine neue Version von Lumo.' : 'Etwas ist schiefgelaufen.'}
          </h1>
          <p style={{ fontSize: '15px', color: '#8A9BAE', margin: '0', lineHeight: '1.5' }}>
            {newVersion ? 'Lade die Seite neu, dann geht es weiter –' : 'Ich entschuldige mich. Lade die Seite neu –'}<br />
            dein Fortschritt ist gespeichert.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#D4A843',
              color: '#1a1206',
              border: 'none',
              borderRadius: '12px',
              padding: '14px 28px',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
            }}
          >
            Seite neu laden
          </button>
          {/* Debug-Info: nur sichtbar wenn man draufklickt */}
          <details style={{ marginTop: '8px' }}>
            {/* F020: opacity 0.5 drückte den Kontrast auf 2,5:1; ohne opacity und mit
                hellerer Farbe sind es 9,6:1. */}
            <summary style={{ fontSize: '12px', color: '#B4C0CE', cursor: 'pointer' }}>
              Fehlerdetails
            </summary>
            <pre style={{
              fontSize: '11px', color: '#8A9BAE', textAlign: 'left',
              background: 'rgba(255,255,255,0.05)', borderRadius: '8px',
              padding: '12px', marginTop: '8px', maxWidth: '360px',
              overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
              {this.state.error?.message}{'\n'}{this.state.error?.stack?.split('\n').slice(0,5).join('\n')}
            </pre>
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
