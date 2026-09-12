import { useEffect, useState } from 'react';
import LumoMascot from '../../components/LumoMascot.jsx';
import { lumoApi } from '../../api/lumo.js';

export default function LernzettelScreen({ block, cards, onDone, subjectColor }) {
  const [lernzettel, setLernzettel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    lumoApi.generateLernzettel({
      blockTitle: block.title,
      blockContent: block.content,
      cards,
    }).then(data => {
      setLernzettel(data);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, [block.id]);

  const color = subjectColor || '#D4A843';

  function handleCopy() {
    if (!lernzettel) return;
    const text = `${lernzettel.title}\n\n${lernzettel.points.map(p => `${p.keyword}: ${p.explanation}`).join('\n')}\n\nMerksatz: ${lernzettel.merksatz}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  if (loading) {
    return (
      <div className="screen">
        <div className="screen-content">
          <LumoMascot state="thinking" />
          <p style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>
            Lumo erstellt deinen Lernzettel …
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="screen" style={{ justifyContent: 'flex-start', paddingTop: '40px' }}>
      <div className="screen-content" style={{ maxWidth: '560px', gap: '20px' }}>

        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: '11px',
            fontWeight: '700',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            color: color,
            marginBottom: '8px',
          }}>
            Lernzettel
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '4px' }}>
            {lernzettel?.title || block.title}
          </h2>
        </div>

        {/* Punkte */}
        <div style={{
          width: '100%',
          background: 'var(--bg-card)',
          borderRadius: '16px',
          border: `1px solid ${color}33`,
          borderTop: `4px solid ${color}`,
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}>
          {lernzettel?.points.map((point, i) => (
            <div key={i} style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start',
            }}>
              <div style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: color,
                flexShrink: 0,
                marginTop: '8px',
              }} />
              <div>
                <span style={{
                  fontWeight: '700',
                  color: 'var(--text-primary)',
                  fontSize: '15px',
                }}>
                  {point.keyword}:
                </span>
                <span style={{
                  color: 'var(--text-secondary)',
                  fontSize: '15px',
                  marginLeft: '6px',
                  lineHeight: '1.5',
                }}>
                  {point.explanation}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Merksatz */}
        {lernzettel?.merksatz && (
          <div style={{
            width: '100%',
            background: `${color}11`,
            border: `1px solid ${color}44`,
            borderRadius: '12px',
            padding: '16px 20px',
            textAlign: 'center',
          }}>
            <p style={{
              fontSize: '11px',
              fontWeight: '700',
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              color: color,
              margin: '0 0 6px',
            }}>
              Merksatz
            </p>
            <p style={{
              fontSize: '16px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              margin: '0',
              lineHeight: '1.5',
              fontStyle: 'italic',
            }}>
              „{lernzettel.merksatz}"
            </p>
          </div>
        )}

        {/* Buttons */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={handleCopy}
            style={{
              width: '100%',
              background: copied ? 'var(--green)' : 'var(--bg-card)',
              color: copied ? 'white' : 'var(--text-secondary)',
              border: `1px solid ${copied ? 'var(--green)' : 'var(--border)'}`,
              borderRadius: '12px',
              padding: '13px',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {copied ? '✓ Kopiert!' : 'Lernzettel kopieren'}
          </button>
          <button
            onClick={onDone}
            style={{
              width: '100%',
              background: 'var(--gold)',
              color: '#1a1206',
              border: 'none',
              borderRadius: '12px',
              padding: '14px',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
            }}
          >
            Weiter →
          </button>
        </div>

      </div>
    </div>
  );
}
