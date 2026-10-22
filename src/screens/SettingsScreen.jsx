import { exportProject, importProject, exportProgressReport } from '../utils/projectExport.js';
import { deleteServerState } from '../utils/serverSync.js';
import { useRef, useState } from 'react';

export default function SettingsScreen({ onBack, blocksAnalyzedTotal, onShowLegal }) {
  const importRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState('');
  const [deletingServer, setDeletingServer] = useState(false);
  const [confirmDeleteServer, setConfirmDeleteServer] = useState(false);

  async function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      await importProject(file);
      setMessage('Import erfolgreich. Seite wird neu geladen …');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setMessage(err.message);
      setImporting(false);
    }
  }

  async function handleDeleteServerData() {
    if (!confirmDeleteServer) {
      setConfirmDeleteServer(true);
      return;
    }
    setDeletingServer(true);
    try {
      await deleteServerState();
      // Cookie-Consent zurücksetzen
      try { localStorage.removeItem('lumo_cookie_consent'); } catch {}
      setMessage('Serverdaten gelöscht. Deine lokalen Daten sind unberührt.');
    } catch {
      setMessage('Serverdaten konnten nicht gelöscht werden. Versuche es erneut.');
    } finally {
      setDeletingServer(false);
      setConfirmDeleteServer(false);
    }
  }

  const SETTINGS_ITEMS = [
    {
      label: 'Fortschritt teilen',
      sub: 'Exportiere eine lesbare Zusammenfassung deines Lernstands.',
      action: () => {
        const result = exportProgressReport();
        if (result.success) {
          setMessage(result.shared ? 'Fortschritt geteilt.' : 'Fortschritt gespeichert.');
        } else {
          setMessage(result.reason || 'Export fehlgeschlagen.');
        }
      },
      icon: '↗',
    },
    {
      label: 'Backup exportieren',
      sub: 'Speichere alle Daten als Sicherungsdatei (JSON).',
      action: () => { exportProject(); setMessage('Backup gespeichert.'); },
      icon: '↓',
    },
    {
      label: 'Backup importieren',
      sub: 'Lade einen gespeicherten Lernstand.',
      action: () => importRef.current?.click(),
      icon: '↑',
    },
    {
      label: 'Feedback geben',
      sub: 'Sag mir was du dir wünschst oder was nicht funktioniert.',
      action: () => window.open('mailto:feedback@lumo-app.de?subject=Lumo Feedback', '_blank'),
      icon: '✉',
    },
  ];

  return (
    <div className="screen" style={{ justifyContent: 'flex-start', paddingTop: '60px' }}>
      <div className="screen-content" style={{ maxWidth: '480px', gap: '16px' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '14px', cursor: 'pointer' }}>
            ← Zurück
          </button>
          <h2 style={{ fontSize: '20px', fontWeight: '700', margin: '0' }}>Einstellungen</h2>
        </div>

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {SETTINGS_ITEMS.map((item, i) => (
            <button
              key={i}
              onClick={item.action}
              style={{
                width: '100%',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '14px',
                padding: '16px 18px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: '20px', color: 'var(--gold)', flexShrink: 0 }}>{item.icon}</span>
              <div>
                <p style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 2px' }}>{item.label}</p>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0' }}>{item.sub}</p>
              </div>
            </button>
          ))}
        </div>

        {message && (
          <p style={{ fontSize: '13px', color: 'var(--green)', textAlign: 'center', margin: '0' }}>
            {message}
          </p>
        )}

        <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />

        {/* ── DSGVO Art. 17: Recht auf Löschung ─────────────────────────────
            Server-Daten löschen — lumo_uid Cookie + gespeicherter Fortschritt.
            Zweistufige Bestätigung verhindert versehentliches Löschen. */}
        <div style={{
          width: '100%',
          borderTop: '1px solid var(--border)',
          paddingTop: '16px',
          marginTop: '4px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}>
          <p style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text-secondary)', margin: '0', opacity: 0.6 }}>
            Datenschutz
          </p>
          {confirmDeleteServer ? (
            <div style={{
              background: 'rgba(196,122,43,0.08)',
              border: '1px solid rgba(196,122,43,0.3)',
              borderRadius: '12px',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}>
              <p style={{ fontSize: '14px', color: 'var(--text-primary)', margin: 0, fontWeight: '600' }}>
                Serverdaten wirklich löschen?
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
                Dein Fortschritt auf unserem Server wird entfernt.
                Deine lokalen Daten bleiben unberührt.
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleDeleteServerData}
                  disabled={deletingServer}
                  style={{
                    flex: 1,
                    background: 'var(--amber, #C47A2B)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '10px',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    opacity: deletingServer ? 0.5 : 1,
                  }}
                >
                  {deletingServer ? 'Wird gelöscht …' : 'Ja, löschen'}
                </button>
                <button
                  onClick={() => setConfirmDeleteServer(false)}
                  style={{
                    flex: 1,
                    background: 'var(--bg-card)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    padding: '10px',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Abbrechen
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleDeleteServerData}
              style={{
                width: '100%',
                background: 'rgba(196, 122, 43, 0.05)',
                border: '1px solid rgba(196, 122, 43, 0.25)',
                borderRadius: '14px',
                padding: '14px 18px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: '20px', color: 'var(--amber)', flexShrink: 0 }}>🗑</span>
              <div>
                <p style={{ fontSize: '15px', fontWeight: '600', color: 'var(--amber)', margin: '0 0 2px' }}>
                  Serverdaten löschen
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0' }}>
                  Entfernt deinen anonymen Lernstand vom Server (DSGVO Art. 17).
                </p>
              </div>
            </button>
          )}
        </div>

        {blocksAnalyzedTotal > 0 && (
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center', margin: '8px 0 0' }}>
            {blocksAnalyzedTotal} Blöcke insgesamt gelernt
          </p>
        )}

        {/* Legal link — DSGVO-konform, immer erreichbar */}
        {onShowLegal && (
          <button
            onClick={onShowLegal}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '12px',
              cursor: 'pointer',
              padding: '4px 0',
              opacity: 0.5,
              textDecoration: 'underline',
              textUnderlineOffset: '2px',
              alignSelf: 'center',
            }}
          >
            Impressum & Datenschutz
          </button>
        )}

      </div>
    </div>
  );
}
