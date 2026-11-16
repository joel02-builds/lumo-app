/**
 * UpdatePrompt — Hinweis „Neue Version verfügbar"
 *
 * Warum: Mit registerType 'autoUpdate' übernahm ein neuer Service Worker still
 * im Hintergrund. Bestandsnutzer der installierten App sahen eine neue Version
 * dadurch erst beim ZWEITEN Öffnen (F011). Jetzt wartet der neue Service Worker
 * und Lumo fragt nach.
 *
 * ADHS-Design:
 * – Nicht blockierend: schmale Leiste oben, kein Modal. Mitten in einer Session
 *   würde ein erzwungenes Neuladen die laufende Karte kosten – der Nutzer
 *   entscheidet selbst, wann.
 * – Amber, nicht Rot: ein Hinweis, kein Alarm.
 * – „Später" schließt bis zum nächsten App-Start.
 */

import { useRegisterSW } from 'virtual:pwa-register/react';

const RELOAD_FALLBACK_MS = 1500;

export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: '6px 14px',
        padding: 'calc(8px + env(safe-area-inset-top, 0px)) 16px 8px',
        background: 'var(--amber)',
        color: '#1a1206',
        fontSize: '14px',
        fontWeight: 600,
        boxShadow: '0 2px 12px rgba(0,0,0,0.35)',
      }}
    >
      <span>Es gibt eine neue Version von Lumo.</span>
      <span style={{ display: 'flex', gap: '8px' }}>
        <button
          type="button"
          onClick={() => {
            // true = wartenden Service Worker aktivieren; die Seite lädt neu,
            // sobald er übernommen hat.
            updateServiceWorker(true);
            // Fallback: Gibt es keinen wartenden Service Worker (z. B. beim
            // allerersten Besuch, wenn die Seite noch nicht gesteuert wird und
            // der neue direkt aktiv wurde), passiert oben nichts – der Button
            // wäre tot. Dann nach kurzer Frist selbst neu laden.
            setTimeout(() => window.location.reload(), RELOAD_FALLBACK_MS);
          }}
          style={{
            background: '#1a1206',
            color: 'var(--gold-light)',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 14px',
            minHeight: '36px',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Neu laden
        </button>
        <button
          type="button"
          onClick={() => setNeedRefresh(false)}
          style={{
            background: 'none',
            color: '#1a1206',
            border: '1px solid rgba(26,18,6,0.45)',
            borderRadius: '8px',
            padding: '8px 12px',
            minHeight: '36px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Später
        </button>
      </span>
    </div>
  );
}
