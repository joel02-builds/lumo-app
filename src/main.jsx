import React, { Component } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/index.css';
import './styles/app.css';

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
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 24px',
          background: '#0F1920',
          gap: '20px',
          textAlign: 'center',
        }}>
          <img src="/mascot/lumo-idle.png" alt="Lumo" width={100} height={100} style={{ objectFit: 'contain' }} />
          <h1 style={{ fontSize: '24px', color: '#F0EDE8', margin: '0' }}>
            Etwas ist schiefgelaufen.
          </h1>
          <p style={{ fontSize: '15px', color: '#8A9BAE', margin: '0', lineHeight: '1.5' }}>
            Ich entschuldige mich. Lade die Seite neu –<br />
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
            <summary style={{ fontSize: '12px', color: '#8A9BAE', cursor: 'pointer', opacity: 0.5 }}>
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
