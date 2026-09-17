import { useState, useEffect } from 'react';
import { lumoApi } from '../api/lumo.js';

export default function YoutubePanel({ concept, blockTitle, onClose, subjectColor }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const color = subjectColor || 'var(--gold)';

  useEffect(() => {
    lumoApi.getYoutubeVideos({ concept, blockTitle })
      .then(result => {
        setData(result);
        setLoading(false);
      })
      .catch(() => {
        setData({ fallback: true, searchUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(concept)}`, query: concept });
        setLoading(false);
      });
  }, [concept]);

  return (
    <div style={{
      width: '100%',
      background: 'var(--bg-card)',
      borderRadius: '16px',
      border: '1px solid rgba(255,0,0,0.2)',
      borderTop: '3px solid #FF0000',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>▶</span>
          <div>
            <p style={{ fontSize: '11px', fontWeight: '700', color: '#FF0000', margin: '0 0 1px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Video-Erklärung
            </p>
            <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', margin: '0' }}>
              {concept}
            </p>
          </div>
        </div>
        <button onClick={onClose} style={{
          background: 'none', border: 'none',
          color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '16px',
        }}>✕</button>
      </div>

      {loading && (
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0', textAlign: 'center' }}>
          Lumo sucht das beste Video …
        </p>
      )}

      {/* Eingebettetes Video */}
      {selectedVideo && (
        <div style={{ width: '100%', position: 'relative', paddingBottom: '56.25%', borderRadius: '12px', overflow: 'hidden' }}>
          <iframe
            src={`https://www.youtube.com/embed/${selectedVideo}?autoplay=1`}
            style={{
              position: 'absolute', top: 0, left: 0,
              width: '100%', height: '100%', border: 'none', borderRadius: '12px',
            }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
            allowFullScreen
          />
        </div>
      )}

      {/* Video-Auswahl */}
      {!loading && !selectedVideo && data && !data.fallback && data.videos?.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0' }}>
            Lumo schlägt vor: <strong>„{data.query}"</strong>
          </p>
          {data.videos.map(video => (
            <button
              key={video.videoId}
              onClick={() => setSelectedVideo(video.videoId)}
              style={{
                width: '100%',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '10px 12px',
                cursor: 'pointer',
                display: 'flex',
                gap: '10px',
                alignItems: 'center',
                textAlign: 'left',
                transition: 'border-color 0.15s ease',
                boxSizing: 'border-box',
              }}
            >
              {video.thumbnail && (
                <img
                  src={video.thumbnail}
                  alt=""
                  style={{ width: '72px', height: '54px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }}
                />
              )}
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <p style={{
                  fontSize: '13px', fontWeight: '600',
                  color: 'var(--text-primary)', margin: '0 0 3px',
                  overflow: 'hidden', textOverflow: 'ellipsis',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                }}>
                  {video.title}
                </p>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '0' }}>
                  {video.channel}
                </p>
              </div>
              <span style={{ color: '#FF0000', fontSize: '18px', flexShrink: 0 }}>▶</span>
            </button>
          ))}
        </div>
      )}

      {/* Fallback */}
      {!loading && (data?.fallback || !data?.videos?.length) && (
        <>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0' }}>
            Suche nach: <strong style={{ color: 'var(--text-primary)' }}>„{data?.query || concept}"</strong>
          </p>
          <a
            href={data?.searchUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(concept)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block', width: '100%',
              background: '#FF0000', color: 'white',
              borderRadius: '10px', padding: '12px',
              fontSize: '14px', fontWeight: '700',
              textAlign: 'center', textDecoration: 'none',
              boxSizing: 'border-box',
            }}
          >
            Auf YouTube suchen →
          </a>
        </>
      )}

      {/* Zurück zur Karte */}
      {selectedVideo && (
        <button
          onClick={() => setSelectedVideo(null)}
          style={{
            background: 'none', border: 'none',
            color: 'var(--text-secondary)', fontSize: '13px',
            cursor: 'pointer', padding: '0', textDecoration: 'underline',
          }}
        >
          ← Andere Videos
        </button>
      )}

      <p style={{
        fontSize: '12px', color: 'var(--text-secondary)',
        margin: '0', textAlign: 'center', fontStyle: 'italic',
      }}>
        Komm danach zurück – Lumo wartet auf deine Antwort.
      </p>
    </div>
  );
}
