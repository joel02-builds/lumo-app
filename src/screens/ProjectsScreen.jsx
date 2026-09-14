import LumoMascot from '../components/LumoMascot.jsx';
import { getSubjectColor } from '../utils/subjectColors.js';

export default function ProjectsScreen({ projects, onLoad, onNew, onDelete }) {
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
            Neues Projekt starten
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen" style={{ justifyContent: 'flex-start', paddingTop: '60px' }}>
      <div className="screen-content" style={{ maxWidth: '520px', gap: '16px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: '700', margin: '0' }}>
          Meine Projekte
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
                  onClick={() => onDelete(p.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '16px',
                    padding: '2px 6px',
                  }}
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
          + Neues Projekt
        </button>
      </div>
    </div>
  );
}
