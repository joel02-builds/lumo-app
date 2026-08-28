import LumoMascot from '../../components/LumoMascot.jsx';
import Button from '../../components/Button.jsx';
import { getRecommendedBlock } from '../../utils/blockProgress.js';

function blockItemClass(block) {
  if (block.status === 'completed') {
    if (block.confidence === 'sicher') return 'block-item--sicher';
    if (block.confidence === 'unsicher') return 'block-item--unsicher';
    return 'block-item--gaps';
  }
  if (block.status === 'in-progress') return 'block-item--progress';
  return '';
}

function statusLabel(block) {
  if (block.status === 'not-started') return 'Nicht gestartet';
  if (block.status === 'in-progress') return 'In Bearbeitung';
  if (block.confidence === 'sicher') return 'Sicher verstanden';
  if (block.confidence === 'unsicher') return 'Noch unsicher';
  return 'Wiederholen empfohlen';
}

function BlockIndicator({ block }) {
  if (block.status === 'completed' && block.confidence === 'sicher') {
    return (
      <span className="block-dot dot-check" aria-hidden="true">
        <svg viewBox="0 0 16 16" width="10" height="10">
          <path
            d="M3 8.5L6.2 11.5L13 4.5"
            stroke="#0d1117"
            strokeWidth="2.2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }
  if (block.status === 'completed' && block.confidence === 'grosse_luecken') {
    return <span className="block-dot dot-red" aria-hidden="true" />;
  }
  if (block.status === 'completed' && block.confidence === 'unsicher') {
    return <span className="block-dot dot-yellow" aria-hidden="true" />;
  }
  if (block.status === 'in-progress') {
    return <span className="block-dot dot-progress" aria-hidden="true" />;
  }
  return <span className="block-dot dot-neutral" aria-hidden="true" />;
}

export default function DashboardScreen({ blocks, recommendedOrder, onStartBlock }) {
  const total = blocks.length;
  const completed = blocks.filter((b) => b.status === 'completed').length;
  const percent = total ? Math.round((completed / total) * 100) : 0;
  const allDone = total > 0 && completed === total;

  const next = getRecommendedBlock(blocks, recommendedOrder);

  return (
    <div className="screen">
      <div className="screen-content dashboard-content">
        <LumoMascot state={allDone ? 'complete' : 'idle'} label="Lumo" />
        <h1>Dein Fortschritt</h1>

        <div className="progress-section">
          <span className="progress-percent">{percent}%</span>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${percent}%` }} />
          </div>
          <p className="progress-label">
            {completed} von {total} Blöcken geschafft
          </p>
        </div>

        <ul className="block-list">
          {blocks.map((b) => (
            <li key={b.id}>
              <button
                className={`block-item ${blockItemClass(b)}`.trim()}
                onClick={() => onStartBlock(b.id)}
              >
                <BlockIndicator block={b} />
                <div className="block-info">
                  <span className="block-title-row">
                    <span className="block-title">{b.title}</span>
                    {next && b.id === next.id && <span className="recommended-badge">Empfohlen</span>}
                  </span>
                  <span className="block-status">{statusLabel(b)}</span>
                </div>
                {b.content && (
                  <div className="block-tooltip" aria-hidden="true">
                    {b.content}
                  </div>
                )}
              </button>
            </li>
          ))}
        </ul>

        {next ? (
          <Button onClick={() => onStartBlock(next.id)}>Weiter mit „{next.title}“</Button>
        ) : (
          allDone && <p className="all-done-text">Du hast alle Blöcke geschafft. Starkes Lernen!</p>
        )}
      </div>
    </div>
  );
}
