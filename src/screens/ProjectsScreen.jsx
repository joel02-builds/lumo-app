import { useState } from 'react';
import LumoMascot from '../components/LumoMascot.jsx';
import { getSubjectColor } from '../utils/subjectColors.js';

export default function ProjectsScreen({ projects, onLoad, onNew, onDelete }) {
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
        <div className="screen-content" style={{ gap: '20px' }}>
          <LumoMascot state="idle" />
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '22px', marginBottom: '8px' }}>Noch keine Fächer.</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px', lineHeight: '1.6', margin: 0 }}>
              Lade dein erstes Skript hoch — Lumo teilt es in lernbare Blöcke auf.
            </p>
          </div>
          <button
            onClick={onNew}
            style={{
              width: '100%',
              background: 'var(--gold)',
              color: '#1a1206',
              border: 'none',
              borderRadius: '12px',
              padding: '14px',
              fontSize: '16px',
              fontWeight: '800',
              cursor: 'pointer',
              letterSpacing: '-0.01em',
            }}
          >
            Erstes Fach starten →
          </button>
        </div>
      </div>
    );
  }

  const projectToDelete = projects.find(p => p.id === confirmDeleteId);

  return (
    <div className="screen" style={{ justifyContent: 'flex-start', paddingTop: '56px' }}>
      <div style={{ width: '100%', maxWidth: '520px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '800', letterSpacing: '-0.025em', margin: 0 }}>
            Meine Fächer
          </h2>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {projects.length} {projects.length === 1 ? 'Fach' : 'Fächer'}
          </span>
        </div>

        {/* Projekt-Karten */}
        {projects.map(p => {
          const color = p.subjectColor || getSubjectColor(p.subject);
          const done = p.blocks.filter(b => b.status === 'completed').length;
          const total = p.blocks.length;
          const pct = total ? Math.round((done / total) * 100) : 0;
          const isComplete = pct === 100;

          return (
            <div
              key={p.id}
              style={{
                width: '100%',
                background: 'var(--bg-card)',
                border: `1px solid ${color}33`,
                borderLeft: `3px solid ${color}`,
                borderRadius: '14px',
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              {/* Titel-Zeile */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0, paddingRight: '8px' }}>
                  <p style={{
                    fontSize: '15px',
                    fontWeight: '700',
                    color: 'var(--text-primary)',
                    margin: '0 0 4px',
                    letterSpacing: '-0.01em',
                    lineHeight: '1.3',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {p.topic || 'Ohne Titel'}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                    }}>
                      {done}/{total} Blöcke
                    </span>
                    {isComplete && (
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        color: 'var(--green)',
                        background: 'rgba(61,158,110,0.12)',
                        borderRadius: '999px',
                        padding: '2px 8px',
                        letterSpacing: '0.03em',
                        textTransform: 'uppercase',
                      }}>
                        Fertig
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteClick(p.id)}
                  aria-label="Projekt löschen"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '15px',
                    padding: '2px 6px',
                    borderRadius: '6px',
                    opacity: 0.5,
                    flexShrink: 0,
                    transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '0.5'; }}
                >
                  ✕
                </button>
              </div>

              {/* Progress Bar */}
              <div style={{ height: '3px', background: 'var(--bg-elevated)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${pct}%`,
                  background: isComplete ? 'var(--green)' : color,
                  borderRadius: '4px',
                  transition: 'width 0.4s ease',
                }} />
              </div>

              {/* CTA */}
              <button
                onClick={() => onLoad(p.id)}
                style={{
                  width: '100%',
                  background: isComplete ? 'var(--bg-elevated)' : color,
                  color: isComplete ? 'var(--text-secondary)' : '#1a1206',
                  border: isComplete ? '1px solid var(--border)' : 'none',
                  borderRadius: '10px',
                  padding: '10px',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  letterSpacing: '-0.01em',
                  transition: 'opacity 0.15s ease',
                }}
              >
                {isComplete ? 'Nochmal wiederholen' : 'Weiter lernen →'}
              </button>
            </div>
          );
        })}

        {/* Neues Fach Button */}
        <button
          onClick={onNew}
          style={{
            width: '100%',
            background: 'transparent',
            border: '1px dashed rgba(212,168,67,0.3)',
            borderRadius: '14px',
            padding: '14px',
            fontSize: '14px',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontWeight: '500',
            transition: 'border-color 0.15s ease, color 0.15s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--gold)';
            e.currentTarget.style.color = 'var(--gold)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'rgba(212,168,67,0.3)';
            e.currentTarget.style.color = 'var(--text-secondary)';
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
              padding: '26px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: '800', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
                Fach löschen?
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
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
                  padding: '12px',
                  fontSize: '15px',
                  fontWeight: '700',
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
                  padding: '12px',
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
