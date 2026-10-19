import { useEffect, useState } from 'react';

/**
 * InstallBanner — zeigt einen sichtbaren "App installieren" Button für Beta-Tester.
 *
 * Funktioniert auf Android/Desktop Chrome via beforeinstallprompt.
 * Auf iOS zeigt es eine schrittweise visuelle Anleitung (Teilen → Zum Home-Bildschirm),
 * da iOS keinen programmatischen Install-Trigger unterstützt.
 *
 * Verbesserungen v2:
 * – iOS: Banner erscheint erst nach Onboarding (auf Dashboard), nicht mitten im Flow
 * – iOS-Hint: Verbessertes visuelles Sheet mit Safari-spezifischem Teilen-Icon SVG
 * – Android: beforeinstallprompt wie bisher
 * – "Bereits installiert" Check via standalone mode
 *
 * Design-Prinzip:
 * – Kein aufdringliches Modal beim ersten Öffnen
 * – Freundlicher goldener Banner, dezent positioniert
 * – Einmalige Dismissal dauerhaft (localStorage)
 */

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
}

function isInStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
}

// Wird von App.jsx gesetzt sobald Onboarding abgeschlossen & Dashboard sichtbar
const ONBOARDING_DONE_KEY = 'lumo_onboarding_done';
const DISMISSED_KEY = 'lumo_install_dismissed';

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showIOSHint, setShowIOSHint] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [iosStep, setIosStep] = useState(0); // 0 = Übersicht, 1-3 = einzelne Schritte

  useEffect(() => {
    // Nicht zeigen wenn schon als App installiert
    if (isInStandaloneMode()) return;

    // Schon dismissed
    try { if (localStorage.getItem(DISMISSED_KEY)) return; } catch {}

    if (isIOS()) {
      // Auf iOS erst zeigen wenn Onboarding abgeschlossen ist
      // Wir prüfen alle 500ms bis der Key gesetzt ist
      const check = () => {
        try {
          if (localStorage.getItem(ONBOARDING_DONE_KEY)) {
            // Kurze Pause nach Dashboard-Erscheinen, dann Banner
            setTimeout(() => setShowBanner(true), 4000);
          } else {
            // Noch nicht fertig, nochmal prüfen
            setTimeout(check, 500);
          }
        } catch {
          setTimeout(() => setShowBanner(true), 5000);
        }
      };
      // Starte Prüfung nach 1 Sekunde
      const t = setTimeout(check, 1000);
      return () => clearTimeout(t);
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
      setIosStep(0);
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
    try { localStorage.setItem(DISMISSED_KEY, '1'); } catch {}
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
            Lumo als App speichern
          </p>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0' }}>
            {isIOS() ? 'In 3 Sekunden auf dem Home-Bildschirm' : 'Direkt vom Home-Bildschirm starten'}
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

      {/* iOS Installations-Anleitung — Bottom Sheet */}
      {showIOSHint && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.75)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'flex-end',
            padding: '16px',
          }}
          onClick={() => setShowIOSHint(false)}
        >
          <div
            style={{
              width: '100%',
              background: 'var(--bg-card)',
              borderRadius: '24px',
              padding: '28px 24px 32px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '28px', margin: '0 0 8px' }}>📱</p>
              <h2 style={{ fontSize: '22px', fontWeight: '800', margin: '0 0 6px', color: 'var(--text-primary)' }}>
                Lumo installieren
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0' }}>
                Füge Lumo zu deinem Home-Bildschirm hinzu — dauert 10 Sekunden.
              </p>
            </div>

            {/* Schritte */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {[
                {
                  icon: (
                    // Safari-Teilen-Symbol (Pfeil nach oben aus Box)
                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                      <rect x="3" y="8" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.8"/>
                      <path d="M11 1v11M8 4l3-3 3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ),
                  step: '1',
                  text: 'Tippe auf das Teilen-Symbol',
                  sub: 'Das Symbol unten in der Mitte in Safari',
                },
                {
                  icon: (
                    // Plus in einem Quadrat
                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                      <rect x="2" y="2" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.8"/>
                      <path d="M11 7v8M7 11h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                  ),
                  step: '2',
                  text: '„Zum Home-Bildschirm" wählen',
                  sub: 'Im Menü nach unten scrollen',
                },
                {
                  icon: (
                    // Häkchen
                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                      <path d="M4 11l5 5 9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ),
                  step: '3',
                  text: '„Hinzufügen" tippen — fertig!',
                  sub: 'Lumo erscheint als App auf deinem Bildschirm',
                },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '10px 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{
                    width: '40px', height: '40px', flexShrink: 0,
                    borderRadius: '12px',
                    background: 'rgba(212,168,67,0.12)',
                    border: '1px solid rgba(212,168,67,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--gold)',
                  }}>
                    {item.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 2px' }}>
                      {item.step}. {item.text}
                    </p>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0' }}>
                      {item.sub}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <button
              onClick={() => { setShowIOSHint(false); handleDismiss(); }}
              style={{
                width: '100%',
                background: 'var(--gold)',
                color: '#1a1206',
                border: 'none',
                borderRadius: '14px',
                padding: '16px',
                fontSize: '16px',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              Alles klar!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
