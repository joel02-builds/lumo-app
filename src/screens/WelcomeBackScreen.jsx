import { useState, useEffect } from 'react';
import LumoMascot from '../components/LumoMascot.jsx';
import Button from '../components/Button.jsx';
import { getRecommendedBlock } from '../utils/blockProgress.js';

function getBlocksDueToday(blocks) {
  const now = new Date();
  return blocks.filter(b => {
    if (b.status !== 'completed') return false;
    if (!b.completedAt) return false;
    const completed = new Date(b.completedAt);
    const diffDays = Math.floor((now - completed) / (1000 * 60 * 60 * 24));
    if (b.confidence === 'sicher') return diffDays >= 7;
    if (b.confidence === 'unsicher') return diffDays >= 1;
    if (b.confidence === 'grosse_luecken') return diffDays >= 0;
    return false;
  });
}

function getLernzeitHinweis() {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 9) {
    return { show: true, text: 'Morgens direkt nach dem Aufwachen ist das Gehirn noch nicht auf Touren. Falls möglich, lern heute Nachmittag.' };
  }
  if (hour >= 14 && hour < 18) {
    return { show: true, text: 'Nachmittags bist du oft am fokussiertesten. Guter Zeitpunkt.' };
  }
  if (hour >= 22 || hour < 6) {
    return { show: true, text: 'Spät abends lernt sich schwerer. Kurz und gezielt – dann schlafen.' };
  }
  return { show: false, text: '' };
}

export default function WelcomeBackScreen({ blocks, recommendedOrder, subjectHistory, onStartBlock, onGoToDashboard, onNewProject }) {
  const total = blocks.length;
  const completed = blocks.filter((b) => b.status === 'completed').length;
  const remaining = total - completed;
  const next = getRecommendedBlock(blocks, recommendedOrder);
  const allDone = total > 0 && completed === total;
  const topSubject = subjectHistory
    ?.slice()
    .sort((a, b) => b.count - a.count)[0]?.subject;

  const [streakDays, setStreakDays] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('lumo_streak');
      const streak = raw ? JSON.parse(raw) : { days: 0, lastDate: null };
      const today = new Date().toDateString();
      const yesterday = new Date(Date.now() - 86400000).toDateString();

      if (streak.lastDate === today) {
        setStreakDays(streak.days);
      } else if (streak.lastDate === yesterday) {
        const newStreak = { days: streak.days + 1, lastDate: today };
        localStorage.setItem('lumo_streak', JSON.stringify(newStreak));
        setStreakDays(newStreak.days);
      } else {
        const newStreak = { days: 1, lastDate: today };
        localStorage.setItem('lumo_streak', JSON.stringify(newStreak));
        setStreakDays(1);
      }
    } catch {
      setStreakDays(1);
    }
  }, []);

  function getGreeting() {
    const hour = new Date().getHours();
    const day = new Date().getDay();

    const morningGreetings = [
      'Guten Morgen.',
      'Morgen. Bereit?',
      'Guter Start in den Tag.',
    ];
    const afternoonGreetings = [
      'Willkommen zurück.',
      'Da bist du.',
      'Schön dass du da bist.',
      'Auf geht\'s.',
    ];
    const eveningGreetings = [
      'Guten Abend.',
      'Noch ein Block heute?',
      'Abend. Ich bin dabei.',
    ];

    const pool = hour < 12 ? morningGreetings : hour < 18 ? afternoonGreetings : eveningGreetings;

    // Deterministisch basierend auf Tag damit es nicht bei jedem Reload wechselt
    return pool[day % pool.length];
  }

  return (
    <div className="screen">
      <div className="screen-content" style={{ gap: '24px', maxWidth: '480px' }}>
        <LumoMascot state={allDone ? 'complete' : getBlocksDueToday(blocks).length > 0 ? 'cheer' : 'idle'} />

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
          {streakDays >= 1 && (
            <p style={{
              fontSize: '13px',
              color: 'var(--text-secondary)',
              margin: '-8px 0 0',
              fontStyle: 'italic',
            }}>
              {streakDays === 1
                ? 'Ich bin heute dabei.'
                : streakDays === 2
                ? 'Ich bin seit gestern dabei.'
                : streakDays < 7
                ? `Ich bin seit ${streakDays} Tagen dabei.`
                : streakDays < 30
                ? `Wir lernen seit ${streakDays} Tagen zusammen.`
                : `${streakDays} Tage. Du machst das wirklich.`
              }
            </p>
          )}
          {(() => {
            const hinweis = getLernzeitHinweis();
            if (!hinweis.show) return null;
            return (
              <p style={{
                fontSize: '12px',
                color: 'var(--text-secondary)',
                fontStyle: 'italic',
                margin: '-12px 0 0',
                textAlign: 'center',
              }}>
                {hinweis.text}
              </p>
            );
          })()}
          {topSubject && completed > 2 && (
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '-12px 0 0', textAlign: 'center' }}>
              Dein meistgelerntes Fach: {topSubject.charAt(0).toUpperCase() + topSubject.slice(1)}
            </p>
          )}
        </div>

        {(() => {
          const dueBlocks = getBlocksDueToday(blocks);
          if (dueBlocks.length === 0) return null;
          return (
            <div style={{
              width: '100%',
              background: 'rgba(212, 168, 67, 0.08)',
              border: '1px solid rgba(212, 168, 67, 0.3)',
              borderRadius: '14px',
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}>
              <p style={{
                fontSize: '11px',
                fontWeight: '700',
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                color: 'var(--gold)',
                margin: '0',
              }}>
                Zeit zur Wiederholung
              </p>
              {dueBlocks.map(b => (
                <button
                  key={b.id}
                  onClick={() => onStartBlock(b.id)}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    fontWeight: '500',
                  }}
                >
                  {b.title} →
                </button>
              ))}
            </div>
          );
        })()}

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
              Ich empfehle
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
