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
    // Verzögerung: erst nach 1.8s zeigen, damit Hook+Intro ungestört bleiben
    const t = setTimeout(() => setVisible(true), 1800);
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
        padding: '12px 16px',
        paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
        transform: visible ? 'translateY(0)' : 'translateY(110%)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <div style={{
        maxWidth: '520px',
        margin: '0 auto',
        background: 'rgba(25, 37, 48, 0.97)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(212, 168, 67, 0.2)',
        borderRadius: '16px',
        padding: '14px 18px',
        boxShadow: '0 -4px 40px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5', flex: 1, minWidth: '180px' }}>
            <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>Fortschritt speichern?</span>
            {' '}Anonymer Cookie für geräteübergreifenden Lernstand.
          </p>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button
              onClick={onAccept}
              style={{
                background: 'var(--gold)',
                color: '#1a1206',
                border: 'none',
                borderRadius: '10px',
                padding: '9px 18px',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Ja, gerne
            </button>
            <button
              onClick={onDecline}
              style={{
                background: 'transparent',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                padding: '9px 14px',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Nur lokal
            </button>
          </div>
        </div>

        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0, opacity: 0.5, textAlign: 'center' }}>
          <span
            role="button"
            tabIndex={0}
            onClick={() => {
              window.dispatchEvent(new CustomEvent('lumo:show-legal'));
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                window.dispatchEvent(new CustomEvent('lumo:show-legal'));
              }
            }}
            style={{ color: 'var(--gold)', textDecoration: 'underline', cursor: 'pointer', opacity: 0.8 }}
          >
            Datenschutzerklärung
          </span>
        </p>
      </div>
    </div>
  );
}
