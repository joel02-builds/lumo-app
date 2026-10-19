import { useEffect, useState } from 'react';

/**
 * InstallBanner — zeigt einen sichtbaren "App installieren" Button für Beta-Tester.
 *
 * Funktioniert auf Android/Desktop Chrome via beforeinstallprompt.
 * Auf iOS zeigt es eine Anleitung ("Teilen → Zum Home-Bildschirm"), da iOS
 * keinen programmatischen Install-Trigger unterstützt.
 *
 * Design-Prinzip: Kein aufdringliches Modal, sondern ein freundlicher goldener
 * Banner der bei Scroll verschwindet und jederzeit über ⚙ Settings zugänglich ist.
 */

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
}

function isInStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
}

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showIOSHint, setShowIOSHint] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Kein Banner wenn schon installiert
    if (isInStandaloneMode()) return;

    // Schon dismissed → nicht mehr zeigen
    try {
      if (localStorage.getItem('lumo_install_dismissed')) return;
    } catch {}

    if (isIOS()) {
      // Auf iOS nach kurzer Verzögerung zeigen
      const timer = setTimeout(() => setShowBanner(true), 3000);
      return () => clearTimeout(timer);
    }

    // Android / Desktop: auf beforeinstallprompt warten
    function handlePrompt(e) {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    }
    window.addEventListener('beforeinstallprompt', handlePrompt);
    return () => window.removeEventListener('beforeinstallprompt', handlePrompt);
  }, []);

  function handleInstall() {
    if (isIOS()) {
      setShowIOSHint(true);
      return;
    }
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => {
        setDeferredPrompt(null);
        setShowBanner(false);
      });
    }
  }

  function handleDismiss() {
    setShowBanner(false);
    setDismissed(true);
    try { localStorage.setItem('lumo_install_dismissed', '1'); } catch {}
  }

  if (!showBanner || dismissed) return null;

  return (
    <>
      {/* Floating Banner */}
      <div style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        width: 'calc(100% - 32px)',
        maxWidth: '480px',
        background: 'var(--bg-card)',
        border: '1px solid rgba(212,168,67,0.4)',
        borderRadius: '18px',
        padding: '16px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
        animation: 'lumo-screen-fade-in 300ms ease-out',
      }}>
        <div style={{ fontSize: '28px', flexShrink: 0 }}>📲</div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 2px' }}>
            Lumo als App installieren
          </p>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0' }}>
            Für schnelleren Zugriff direkt vom Home-Bildschirm
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
          <button
            onClick={handleInstall}
            style={{
              background: 'var(--gold)',
              color: '#1a1206',
              border: 'none',
              borderRadius: '10px',
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Installieren
          </button>
          <button
            onClick={handleDismiss}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '11px',
              cursor: 'pointer',
              padding: '2px',
              textDecoration: 'underline',
            }}
          >
            Nicht jetzt
          </button>
        </div>
      </div>

      {/* iOS Anleitung Modal */}
      {showIOSHint && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.7)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'flex-end',
            padding: '24px',
          }}
          onClick={() => setShowIOSHint(false)}
        >
          <div
            style={{
              width: '100%',
              background: 'var(--bg-card)',
              borderRadius: '20px',
              padding: '28px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '20px', fontWeight: '800', margin: '0' }}>Lumo installieren</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { num: '1', text: 'Tippe auf das Teilen-Symbol', icon: '⬆️' },
                { num: '2', text: 'Wähle „Zum Home-Bildschirm"', icon: '＋' },
                { num: '3', text: 'Tippe „Hinzufügen" – fertig!', icon: '✓' },
              ].map(step => (
                <div key={step.num} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '32px', height: '32px',
                    borderRadius: '50%',
                    background: 'rgba(212,168,67,0.15)',
                    border: '1px solid rgba(212,168,67,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '16px',
                    flexShrink: 0,
                  }}>
                    {step.icon}
                  </div>
                  <p style={{ fontSize: '15px', color: 'var(--text-primary)', margin: '0' }}>
                    {step.text}
                  </p>
                </div>
              ))}
            </div>
            <button
              onClick={() => { setShowIOSHint(false); handleDismiss(); }}
              style={{
                width: '100%',
                background: 'var(--gold)',
                color: '#1a1206',
                border: 'none',
                borderRadius: '12px',
                padding: '14px',
                fontSize: '16px',
                fontWeight: '700',
                cursor: 'pointer',
                marginTop: '4px',
              }}
            >
              Verstanden
            </button>
          </div>
        </div>
      )}
    </>
  );
}
