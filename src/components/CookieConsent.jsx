/**
 * CookieConsent — ePrivacy-konformes Cookie-Banner
 *
 * Rechtliche Grundlage:
 * – EU ePrivacy Directive 2002/58/EC (Cookie-Law)
 * – DSGVO Art. 7 (Consent muss informiert, freiwillig, eindeutig sein)
 *
 * Lumo setzt einen nicht-essentiellen Cookie (`lumo_uid`) zur
 * anonymen Server-Synchronisation. Dieser ist kein technisch notwendiger
 * Cookie (das App würde ohne ihn funktionieren — nur mit lokalem Storage),
 * daher ist Consent erforderlich.
 *
 * Verhalten:
 * – Erscheint beim ersten Besuch (kein Consent in localStorage)
 * – "Akzeptieren" → speichert Consent + setzt Cookie-Flag
 * – "Nur lokal" → speichert Ablehnung, App läuft ohne Server-Sync
 * – Consent-Status wird in localStorage gespeichert: 'lumo_cookie_consent'
 *   Werte: 'accepted' | 'declined'
 *
 * ADHS-Design:
 * – Kein Modal (blockiert den Flow)
 * – Bottom-Banner, nicht aufdringlich
 * – Zwei klare Optionen — keine Dark Patterns
 */

import { useState, useEffect } from 'react';

const CONSENT_KEY = 'lumo_cookie_consent';

export function useCookieConsent() {
  const [consent, setConsent] = useState(() => {
    try { return localStorage.getItem(CONSENT_KEY); }
    catch { return null; }
  });

  function accept() {
    try { localStorage.setItem(CONSENT_KEY, 'accepted'); } catch {}
    setConsent('accepted');
  }

  function decline() {
    try { localStorage.setItem(CONSENT_KEY, 'declined'); } catch {}
    setConsent('declined');
  }

  return { consent, accept, decline };
}

export default function CookieConsent({ onAccept, onDecline }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Kurze Verzögerung, damit der erste Render fertig ist
    const t = setTimeout(() => setVisible(true), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      role="dialog"
      aria-label="Cookie-Einwilligung"
      aria-modal="false"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        padding: '16px',
        paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
        transform: visible ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <div style={{
        maxWidth: '560px',
        margin: '0 auto',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: '18px',
        padding: '18px 20px',
        boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <span style={{ fontSize: '20px', flexShrink: 0, marginTop: '1px' }}>🍪</span>
          <div>
            <p style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 4px' }}>
              Lumo speichert deinen Fortschritt
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.6' }}>
              Dafür nutzen wir einen anonymen Cookie (<code style={{ background: 'var(--bg-card)', borderRadius: '4px', padding: '1px 5px', fontSize: '12px' }}>lumo_uid</code>),
              der deinen Lernstand geräteübergreifend synchronisiert. Kein Name, keine E-Mail — nur ein anonymer Code.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onAccept}
            style={{
              flex: 1,
              background: 'var(--gold)',
              color: '#1a1206',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: '700',
              cursor: 'pointer',
            }}
          >
            Akzeptieren
          </button>
          <button
            onClick={onDecline}
            style={{
              flex: 1,
              background: 'var(--bg-card)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            Nur lokal speichern
          </button>
        </div>

        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0, opacity: 0.6, textAlign: 'center' }}>
          Mehr dazu in unserer{' '}
          <span
            role="button"
            tabIndex={0}
            onClick={() => {
              // Datenschutz öffnen — wird via window-Event kommuniziert
              window.dispatchEvent(new CustomEvent('lumo:show-legal'));
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                window.dispatchEvent(new CustomEvent('lumo:show-legal'));
              }
            }}
            style={{ color: 'var(--gold)', textDecoration: 'underline', cursor: 'pointer' }}
          >
            Datenschutzerklärung
          </span>
        </p>
      </div>
    </div>
  );
}
