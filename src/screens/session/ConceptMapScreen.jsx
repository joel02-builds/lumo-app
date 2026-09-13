import { useEffect, useState } from 'react';
import LumoMascot from '../../components/LumoMascot.jsx';
import ConceptMap from '../../components/ConceptMap.jsx';
import { lumoApi } from '../../api/lumo.js';
import { getBlockColor } from '../../utils/subjectColors.js';

export default function ConceptMapScreen({ block, cards, onDone }) {
  const [mapData, setMapData] = useState(null);
  const [loading, setLoading] = useState(true);
  const color = getBlockColor(block);

  useEffect(() => {
    lumoApi.generateConceptMap({
      blockTitle: block.title,
      blockContent: block.content,
      cards,
    }).then(data => {
      setMapData(data);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, [block.id]);

  if (loading) {
    return (
      <div className="screen">
        <div className="screen-content">
          <LumoMascot state="thinking" />
          <p style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>
            Ich zeige dir wie alles zusammenhängt …
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
            color,
            marginBottom: '8px',
          }}>
            Zusammenhänge
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '4px' }}>
            {block.title}
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0' }}>
            So hängt alles zusammen.
          </p>
        </div>

        {mapData ? (
          <div style={{
            width: '100%',
            background: 'var(--bg-card)',
            borderRadius: '16px',
            border: `1px solid ${color}33`,
            borderTop: `4px solid ${color}`,
            padding: '20px',
          }}>
            <ConceptMap
              nodes={mapData.nodes}
              edges={mapData.edges}
              color={color}
            />
          </div>
        ) : (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>
            Concept Map konnte nicht erstellt werden.
          </p>
        )}

        <button
          onClick={onDone}
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
          Weiter →
        </button>

      </div>
    </div>
  );
}
