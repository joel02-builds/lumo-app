import { exportProject, importProject } from '../utils/projectExport.js';
import { useRef, useState } from 'react';

export default function SettingsScreen({ onBack, blocksAnalyzedTotal }) {
  const importRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState('');

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

  const SETTINGS_ITEMS = [
    {
      label: 'Backup exportieren',
      sub: 'Speichere deinen Lernfortschritt als Datei.',
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

        {blocksAnalyzedTotal > 0 && (
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center', margin: '8px 0 0' }}>
            {blocksAnalyzedTotal} Blöcke insgesamt gelernt
          </p>
        )}

      </div>
    </div>
  );
}
