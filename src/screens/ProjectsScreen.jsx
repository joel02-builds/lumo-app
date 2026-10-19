import { useState } from 'react';
import LumoMascot from '../components/LumoMascot.jsx';
import { getSubjectColor } from '../utils/subjectColors.js';

export default function ProjectsScreen({ projects, onLoad, onNew, onDelete }) {
  // Sicherheitsnetz gegen impulsives Löschen (ADHS-Designprinzip):
  // Erst nach Bestätigung wird das Projekt endgültig entfernt.
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  function handleDeleteClick(id) {
    setConfirmDeleteId(id);
  }

  function handleDeleteConfirm() {
    if (confirmDeleteId) {
      onDelete(confirmDeleteId);
      setConfirmDeleteId(null);
    }
  }

  if (projects.length === 0) {
    return (
      <div className="screen">
        <div className="screen-content">
          <LumoMascot state="idle" />
          <h1 style={{ fontSize: '24px', textAlign: 'center' }}>Noch keine Projekte.</h1>
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>
            Starte dein erstes Lernprojekt.
          </p>
          <button
            onClick={onNew}
            style={{
              width: '100%',
              background: 'var(--gold)',
              color: '#1a1206',
              border: 'none',
              borderRadius: '12px',
              padding: '15px',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
            }}
          >
            Neues Fach starten
          </button>
        </div>
      </div>
    );
  }

  const projectToDelete = projects.find(p => p.id === confirmDeleteId);

  return (
    <div className="screen" style={{ justifyContent: 'flex-start', paddingTop: '60px' }}>
      <div className="screen-content" style={{ maxWidth: '520px', gap: '16px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: '700', margin: '0' }}>
          Meine Fächer
        </h2>

        {projects.map(p => {
          const color = p.subjectColor || getSubjectColor(p.subject);
          const done = p.blocks.filter(b => b.status === 'completed').length;
          const total = p.blocks.length;
          const pct = total ? Math.round((done / total) * 100) : 0;
          return (
            <div
              key={p.id}
              style={{
                width: '100%',
                background: 'var(--bg-card)',
                border: `1px solid ${color}44`,
                borderLeft: `4px solid ${color}`,
                borderRadius: '14px',
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 4px' }}>
                    {p.topic || 'Ohne Titel'}
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0' }}>
                    {done} von {total} Blöcken · {pct}%
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteClick(p.id)}
                  aria-label="Projekt löschen"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '16px',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                  ✕
                </button>
              </div>
              <div style={{ height: '4px', background: 'var(--bg-elevated)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '4px' }} />
              </div>
              <button
                onClick={() => onLoad(p.id)}
                style={{
                  width: '100%',
                  background: color,
                  color: '#1a1206',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '11px',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                Weiter lernen →
              </button>
            </div>
          );
        })}

        <button
          onClick={onNew}
          style={{
            width: '100%',
            background: 'var(--bg-elevated)',
            border: '1px dashed var(--border)',
            borderRadius: '14px',
            padding: '16px',
            fontSize: '15px',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontWeight: '500',
          }}
        >
          + Neues Fach
        </button>
      </div>

      {/* Lösch-Bestätigung Modal */}
      {confirmDeleteId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'flex-end',
            padding: '24px',
          }}
          onClick={() => setConfirmDeleteId(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '480px',
              margin: '0 auto',
              background: 'var(--bg-card)',
              borderRadius: '20px',
              padding: '28px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 6px' }}>
                Fach löschen?
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0', lineHeight: '1.5' }}>
                „{projectToDelete?.topic || 'Dieses Fach'}" und der gesamte Lernfortschritt werden dauerhaft gelöscht. Das lässt sich nicht rückgängig machen.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setConfirmDeleteId(null)}
                style={{
                  flex: 1,
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '13px',
                  fontSize: '15px',
                  fontWeight: '600',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                }}
              >
                Abbrechen
              </button>
              <button
                onClick={handleDeleteConfirm}
                style={{
                  flex: 1,
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '13px',
                  fontSize: '15px',
                  fontWeight: '600',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
