import { useState, useEffect } from 'react';
import { lumoApi } from '../api/lumo.js';

export default function YoutubePanel({ concept, blockTitle, onClose, subjectColor }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const color = subjectColor || 'var(--gold)';

  useEffect(() => {
    lumoApi.getYoutubeSearchQuery({ concept, blockTitle })
      .then(data => {
        setQuery(data.query);
        setLoading(false);
      })
      .catch(() => {
        setQuery(`${concept} erklärt`);
        setLoading(false);
      });
  }, [concept]);

  const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

  return (
    <div style={{
      width: '100%',
      background: 'var(--bg-card)',
      borderRadius: '16px',
      border: `1px solid ${color}33`,
      borderTop: `3px solid #FF0000`,
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>▶</span>
          <div>
            <p style={{ fontSize: '12px', fontWeight: '700', color: '#FF0000', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              YouTube
            </p>
            <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', margin: '0' }}>
              {concept} verstehen
            </p>
          </div>
        </div>
        <button onClick={onClose} style={{
          background: 'none', border: 'none',
          color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '16px',
        }}>
          ✕
        </button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0' }}>
          Ich suche das beste Video …
        </p>
      ) : (
        <>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0' }}>
            Lumo schlägt vor: <strong style={{ color: 'var(--text-primary)' }}>„{query}"</strong>
          </p>

          <a
            href={youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block',
              width: '100%',
              background: '#FF0000',
              color: 'white',
              borderRadius: '10px',
              padding: '12px',
              fontSize: '14px',
              fontWeight: '700',
              textAlign: 'center',
              textDecoration: 'none',
              cursor: 'pointer',
              boxSizing: 'border-box',
            }}
          >
            Videos auf YouTube ansehen →
          </a>

          <p style={{
            fontSize: '12px',
            color: 'var(--text-secondary)',
            margin: '0',
            textAlign: 'center',
            fontStyle: 'italic',
          }}>
            Komm danach zurück – Lumo wartet auf deine Antwort.
          </p>
        </>
      )}
    </div>
  );
}
