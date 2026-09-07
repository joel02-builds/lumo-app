import LumoMascot from '../../components/LumoMascot.jsx';
import Button from '../../components/Button.jsx';
import { getRecommendedBlock } from '../../utils/blockProgress.js';

function statusLabel(block) {
  if (block.status === 'not-started') return 'Nicht gestartet';
  if (block.status === 'in-progress') return 'In Bearbeitung';
  if (block.confidence === 'sicher') return 'Verstanden';
  if (block.confidence === 'unsicher') return 'Nochmal anschauen';
  return 'Wiederholen';
}

function BlockDot({ block }) {
  if (block.status === 'completed' && block.confidence === 'sicher') {
    return (
      <div style={{
        width: '10px', height: '10px', borderRadius: '50%',
        background: 'var(--green)', flexShrink: 0,
        boxShadow: '0 0 6px var(--green)',
      }} />
    );
  }
  if (block.status === 'completed' && block.confidence === 'unsicher') {
    return (
      <div style={{
        width: '10px', height: '10px', borderRadius: '50%',
        background: 'var(--yellow)', flexShrink: 0,
      }} />
    );
  }
  if (block.status === 'completed') {
    return (
      <div style={{
        width: '10px', height: '10px', borderRadius: '50%',
        background: 'var(--red)', flexShrink: 0,
      }} />
    );
  }
  if (block.status === 'in-progress') {
    return (
      <div style={{
        width: '10px', height: '10px', borderRadius: '50%',
        background: 'var(--gold)', flexShrink: 0,
        boxShadow: '0 0 8px var(--gold)',
        animation: 'lumo-pulse 2s ease-in-out infinite',
      }} />
    );
  }
  return (
    <div style={{
      width: '10px', height: '10px', borderRadius: '50%',
      background: 'var(--border)', flexShrink: 0,
      border: '1px solid var(--text-secondary)',
    }} />
  );
}

export default function DashboardScreen({ blocks, recommendedOrder, onStartBlock }) {
  const total = blocks.length;
  const completed = blocks.filter((b) => b.status === 'completed').length;
  const percent = total ? Math.round((completed / total) * 100) : 0;
  const allDone = total > 0 && completed === total;
  const next = getRecommendedBlock(blocks, recommendedOrder);

  return (
    <div className="screen" style={{ justifyContent: 'flex-start', paddingTop: '80px' }}>
      <div className="screen-content" style={{ maxWidth: '560px', gap: '20px' }}>

        <LumoMascot state={allDone ? 'complete' : 'idle'} label="Lumo" />

        {/* Fortschritt */}
        <div style={{ width: '100%', textAlign: 'center' }}>
          <div style={{
            fontSize: '48px',
            fontWeight: '800',
            color: percent === 100 ? 'var(--green)' : 'var(--gold)',
            lineHeight: '1',
            marginBottom: '8px',
          }}>
            {percent}%
          </div>
          <div style={{
            height: '6px',
            background: 'var(--bg-card)',
            borderRadius: '6px',
            overflow: 'hidden',
            margin: '0 0 8px',
          }}>
            <div style={{
              height: '100%',
              width: `${percent}%`,
              background: percent === 100
                ? 'var(--green)'
                : 'linear-gradient(90deg, var(--gold), var(--gold-light))',
              borderRadius: '6px',
              transition: 'width 0.6s ease',
            }} />
          </div>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            {completed} von {total} Blöcken geschafft
          </p>
        </div>

        {/* Block Liste */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {blocks.map((b) => {
            const isNext = next && b.id === next.id;
            const isDone = b.status === 'completed';
            return (
              <button
                key={b.id}
                onClick={() => onStartBlock(b.id)}
                style={{
                  width: '100%',
                  background: isNext ? 'var(--bg-card)' : 'var(--bg-elevated)',
                  border: isNext
                    ? '1px solid var(--gold)'
                    : isDone
                    ? '1px solid var(--border)'
                    : '1px solid var(--border)',
                  borderRadius: '14px',
                  padding: '16px 18px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                  opacity: isDone && b.confidence === 'sicher' ? 0.7 : 1,
                }}
              >
                <BlockDot block={b} />
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: isNext ? '600' : '500',
                    color: 'var(--text-primary)',
                    marginBottom: '2px',
                  }}>
                    {b.title}
                  </div>
                  <div style={{
                    fontSize: '13px',
                    color: b.status === 'completed' && b.confidence === 'grosse_luecken'
                      ? 'var(--red)'
                      : 'var(--text-secondary)',
                  }}>
                    {statusLabel(b)}
                  </div>
                </div>
                {isNext && (
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    color: 'var(--gold)',
                    background: 'var(--gold-soft)',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    letterSpacing: '0.5px',
                    whiteSpace: 'nowrap',
                  }}>
                    Jetzt
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {next && !allDone && (
          <Button onClick={() => onStartBlock(next.id)} style={{ width: '100%' }}>
            Weiter mit „{next.title}"
          </Button>
        )}

        {allDone && (
          <p style={{
            color: 'var(--green)',
            fontWeight: '600',
            fontSize: '17px',
            textAlign: 'center',
          }}>
            Alle Blöcke geschafft. Starkes Lernen.
          </p>
        )}
      </div>
    </div>
  );
}
