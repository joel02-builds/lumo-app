import LumoMascot from '../components/LumoMascot.jsx';
import Button from '../components/Button.jsx';
import { getRecommendedBlock } from '../utils/blockProgress.js';

export default function WelcomeBackScreen({ blocks, recommendedOrder, onStartBlock, onGoToDashboard, onNewProject }) {
  const total = blocks.length;
  const completed = blocks.filter((b) => b.status === 'completed').length;
  const remaining = total - completed;
  const next = getRecommendedBlock(blocks, recommendedOrder);
  const allDone = total > 0 && completed === total;

  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Guten Morgen.';
    if (hour < 18) return 'Willkommen zurück.';
    return 'Guten Abend.';
  }

  return (
    <div className="screen">
      <div className="screen-content" style={{ gap: '24px', maxWidth: '480px' }}>
        <LumoMascot state={allDone ? 'complete' : 'idle'} label="Lumo" />

        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>{getGreeting()}</h1>
          {allDone ? (
            <p style={{ color: 'var(--gold)', fontWeight: '600', fontSize: '18px' }}>
              Du hast alle {total} Blöcke geschafft. Starkes Lernen.
            </p>
          ) : (
            <p style={{ color: 'var(--text-secondary)', fontSize: '17px', lineHeight: '1.5' }}>
              {completed > 0
                ? `Du hast ${completed} von ${total} Blöcken geschafft. Noch ${remaining} ${remaining === 1 ? 'Block' : 'Blöcke'}.`
                : `${total} Blöcke warten auf dich.`}
            </p>
          )}
        </div>

        {next && !allDone && (
          <div style={{
            width: '100%',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '20px 24px',
            textAlign: 'left',
          }}>
            <p style={{
              fontSize: '11px',
              fontWeight: '600',
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              color: 'var(--gold)',
              marginBottom: '6px',
            }}>
              Lumo empfiehlt
            </p>
            <p style={{
              fontSize: '18px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              lineHeight: '1.3',
            }}>
              {next.title}
            </p>
          </div>
        )}

        {next && !allDone ? (
          <Button onClick={() => onStartBlock(next.id)} style={{ width: '100%' }}>
            Weiter lernen
          </Button>
        ) : allDone ? (
          <Button onClick={onNewProject} style={{ width: '100%' }}>
            Neues Thema starten
          </Button>
        ) : null}

        <div style={{ display: 'flex', gap: '24px' }}>
          <button className="text-link" onClick={onGoToDashboard}>
            Alle Blöcke sehen
          </button>
          <button className="text-link" onClick={onNewProject}>
            Neues Projekt
          </button>
        </div>
      </div>
    </div>
  );
}
