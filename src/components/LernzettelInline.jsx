import { useEffect, useState } from 'react';
import { lumoApi } from '../api/lumo.js';
import { getBlockColor } from '../utils/subjectColors.js';

export default function LernzettelInline({ block, cards }) {
  const [lernzettel, setLernzettel] = useState(null);
  const [loading, setLoading] = useState(true);
  const color = getBlockColor(block);

  useEffect(() => {
    lumoApi.generateLernzettel({
      blockTitle: block.title,
      blockContent: block.content,
      cards: cards || [],
    }).then(data => {
      setLernzettel(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [block.id]);

  if (loading) return (
    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center', padding: '12px 0', margin: 0 }}>
      Ich fasse zusammen …
    </p>
  );

  if (!lernzettel) return null;

  return (
    <div style={{
      width: '100%',
      background: 'var(--bg-card)',
      borderRadius: '12px',
      border: `1px solid ${color}33`,
      borderTop: `3px solid ${color}`,
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
    }}>
      {lernzettel.points?.map((p, i) => (
        <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <div style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: color, flexShrink: 0, marginTop: '7px',
          }} />
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)', lineHeight: '1.5' }}>
            <strong style={{ color }}>{p.keyword}:</strong> {p.explanation}
          </p>
        </div>
      ))}
      {lernzettel.merksatz && (
        <p style={{
          fontSize: '13px', color: 'var(--text-secondary)',
          fontStyle: 'italic', margin: '4px 0 0',
          paddingTop: '10px', borderTop: `1px solid ${color}22`,
        }}>
          💡 {lernzettel.merksatz}
        </p>
      )}
    </div>
  );
}
