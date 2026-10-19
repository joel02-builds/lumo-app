/**
 * StorageWarningBanner
 *
 * Erscheint wenn IndexedDB nicht verfügbar ist und nur localStorage als
 * Datenschicht dient. In diesem Fall können Daten nach 7 Tagen (Safari iOS)
 * oder bei Speicherdruck automatisch gelöscht werden.
 *
 * Design-Prinzipien:
 * – Kein Rot (ADHS-Trigger, No-Red Principle)
 * – Amber/Orange Ton als Warnung – spürbar aber nicht alarmierend
 * – Kompakte einzeilige Darstellung, nicht aufdringlich
 * – Export-CTA direkt zugänglich
 * – Schließbar (wird per sessionStorage vermerkt, erscheint beim nächsten
 *   App-Start wieder wenn das Problem noch besteht)
 */

import { useState } from 'react';
import { exportAllData } from '../utils/storage.js';

export default function StorageWarningBanner() {
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem('lumo_storage_warn_dismissed') === '1'; } catch { return false; }
  });
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);

  if (dismissed) return null;

  function handleDismiss() {
    try { sessionStorage.setItem('lumo_storage_warn_dismissed', '1'); } catch { /* ignore */ }
    setDismissed(true);
  }

  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    try {
      await exportAllData();
      setExported(true);
    } catch (err) {
      alert('Export fehlgeschlagen: ' + err.message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: 'var(--amber, #C47A2B)',
        color: '#fff',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap',
        fontSize: '13px',
        lineHeight: '1.4',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      <span style={{ fontSize: '16px', flexShrink: 0 }}>⚠️</span>

      <span style={{ flex: 1, minWidth: '200px' }}>
        <strong>Deine Daten werden nur temporär gespeichert.</strong>{' '}
        Safari löscht sie nach 7 Tagen automatisch. Sichere dein Backup regelmäßig.
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <button
          onClick={handleExport}
          disabled={exporting}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.5)',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '13px',
            fontWeight: '600',
            padding: '5px 12px',
            cursor: exporting ? 'default' : 'pointer',
            whiteSpace: 'nowrap',
            transition: 'background 0.15s ease',
          }}
          onMouseOver={(e) => { if (!exporting) e.target.style.background = 'rgba(255,255,255,0.3)'; }}
          onMouseOut={(e) => { e.target.style.background = 'rgba(255,255,255,0.2)'; }}
        >
          {exporting ? 'Läuft…' : exported ? '✓ Gespeichert' : 'Backup herunterladen'}
        </button>

        <button
          onClick={handleDismiss}
          aria-label="Hinweis schließen"
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.8)',
            fontSize: '18px',
            cursor: 'pointer',
            padding: '0 4px',
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
