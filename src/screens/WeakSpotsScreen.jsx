import LumoMascot from '../components/LumoMascot.jsx';

export default function WeakSpotsScreen({ blocks, onBack, onStartBlock }) {
  const weakBlocks = blocks.filter(b =>
    b.status === 'completed' && (b.confidence === 'unsicher' || b.confidence === 'grosse_luecken')
  );
  const notStarted = blocks.filter(b => b.status !== 'completed');
  const strongBlocks = blocks.filter(b => b.status === 'completed' && b.confidence === 'sicher');

  return (
    <div className="screen" style={{ justifyContent: 'flex-start', paddingTop: '60px' }}>
      <div className="screen-content" style={{ maxWidth: '520px', gap: '20px' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
          <button
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '14px',
              cursor: 'pointer',
              padding: '4px 8px',
            }}
          >
            ← Zurück
          </button>
          <h2 style={{ fontSize: '20px', fontWeight: '700', margin: '0' }}>
            Mein Lernstand
          </h2>
        </div>

        {/* Schwächen */}
        {weakBlocks.length > 0 && (
          <div style={{ width: '100%' }}>
            <p style={{
              fontSize: '11px',
              fontWeight: '700',
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              color: 'var(--red)',
              margin: '0 0 10px',
            }}>
              Wiederholen ({weakBlocks.length})
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {weakBlocks.map(b => (
                <button
                  key={b.id}
                  onClick={() => onStartBlock(b.id)}
                  style={{
                    width: '100%',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--red)',
                    borderLeft: `4px solid var(--red)`,
                    borderRadius: '12px',
                    padding: '14px 16px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>
                    {b.title}
                  </span>
                  {b.uncertainPoints?.length > 0 && (
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                      {b.uncertainPoints.slice(0, 2).join(' · ')}
                      {b.uncertainPoints.length > 2 ? ` + ${b.uncertainPoints.length - 2} weitere` : ''}
                    </span>
                  )}
                  <span style={{
                    fontSize: '11px',
                    color: 'var(--red)',
                    fontWeight: '600',
                    marginTop: '2px',
                  }}>
                    {b.confidence === 'grosse_luecken' ? 'Große Lücken' : 'Noch unsicher'} · Nochmal lernen →
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Noch nicht gestartet */}
        {notStarted.length > 0 && (
          <div style={{ width: '100%' }}>
            <p style={{
              fontSize: '11px',
              fontWeight: '700',
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              color: 'var(--text-secondary)',
              margin: '0 0 10px',
            }}>
              Noch offen ({notStarted.length})
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {notStarted.map(b => (
                <button
                  key={b.id}
                  onClick={() => onStartBlock(b.id)}
                  style={{
                    width: '100%',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: '15px', fontWeight: '500', color: 'var(--text-primary)' }}>
                    {b.title}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Stärken */}
        {strongBlocks.length > 0 && (
          <div style={{ width: '100%' }}>
            <p style={{
              fontSize: '11px',
              fontWeight: '700',
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              color: 'var(--green)',
              margin: '0 0 10px',
            }}>
              Verstanden ({strongBlocks.length})
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {strongBlocks.map(b => (
                <div
                  key={b.id}
                  style={{
                    width: '100%',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderLeft: '4px solid var(--green)',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: '15px', fontWeight: '500', color: 'var(--text-primary)' }}>
                    {b.title}
                  </span>
                  <span style={{ fontSize: '18px' }}>✓</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {weakBlocks.length === 0 && notStarted.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <LumoMascot state="cheer" />
            <p style={{ color: 'var(--green)', fontWeight: '600', fontSize: '18px', marginTop: '16px' }}>
              Alles verstanden. Starkes Lernen.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
