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
