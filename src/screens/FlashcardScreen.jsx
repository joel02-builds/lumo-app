import { useState, useEffect, useMemo } from 'react';
import LumoMascot from '../components/LumoMascot.jsx';
import { getSubjectColor } from '../utils/subjectColors.js';
import { calculateNextReview, getDueCards } from '../utils/sm2.js';

const DIFFICULTY_COLORS = {
  leicht: '#3D9E6E',
  mittel: '#D4A843',
  schwer: '#E07B54',
};

const QUALITY_OPTIONS = [
  { value: 0, label: 'Keine Ahnung', color: '#E07B54', bg: 'rgba(224,123,84,0.1)' },
  { value: 1, label: 'Schwer', color: '#E07B54', bg: 'rgba(224,123,84,0.1)' },
  { value: 2, label: 'Mittel', color: '#D4A843', bg: 'rgba(212,168,67,0.1)' },
  { value: 3, label: 'Leicht', color: '#3D9E6E', bg: 'rgba(61,158,110,0.1)' },
];

function FlashCard({ card, onRate, onRemove, subjectColor }) {
  const [flipped, setFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const color = card.subjectColor || subjectColor || getSubjectColor(card.subject);

  const daysUntilReview = card.nextReview
    ? Math.max(0, Math.ceil((new Date(card.nextReview) - new Date()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <div style={{ width: '100%', maxWidth: '480px' }}>
      {/* Karte */}
      <div
        onClick={() => !flipped && setFlipped(true)}
        style={{
          width: '100%',
          minHeight: '200px',
          background: flipped ? 'var(--bg-card-bright)' : 'var(--bg-card)',
          borderRadius: '20px',
          border: `1px solid ${color}44`,
          borderTop: `4px solid ${color}`,
          padding: '24px',
          cursor: flipped ? 'default' : 'pointer',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          transition: 'background 0.3s ease',
          boxShadow: `0 4px 24px ${color}11`,
          position: 'relative',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{
              fontSize: '10px',
              fontWeight: '700',
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              color,
            }}>
              {flipped ? '✓ Antwort' : '? Frage'}
            </span>
            {card.subject && (
              <span style={{
                fontSize: '10px',
                background: `${color}22`,
                color,
                padding: '2px 8px',
                borderRadius: '20px',
                fontWeight: '600',
              }}>
                {card.subject}
              </span>
            )}
            <span style={{
              fontSize: '10px',
              background: `${DIFFICULTY_COLORS[card.difficulty]}22`,
              color: DIFFICULTY_COLORS[card.difficulty],
              padding: '2px 8px',
              borderRadius: '20px',
              fontWeight: '600',
            }}>
              {card.difficulty}
            </span>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(card.id); }}
            style={{
              background: 'none', border: 'none',
              color: 'var(--text-secondary)', cursor: 'pointer',
              fontSize: '14px', padding: '2px', flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Konzept */}
        <p style={{
          fontSize: '12px',
          color: 'var(--text-secondary)',
          margin: '0',
          fontWeight: '500',
        }}>
          {card.concept} · {card.blockTitle}
        </p>

        {/* Inhalt */}
        <p style={{
          fontSize: flipped ? '17px' : '19px',
          fontWeight: flipped ? '400' : '600',
          color: 'var(--text-primary)',
          lineHeight: '1.5',
          margin: '0',
          flex: 1,
        }}>
          {flipped ? card.answer : card.question}
        </p>

        {/* Flip-Hinweis */}
        {!flipped && (
          <p style={{
            fontSize: '12px',
            color: 'var(--text-secondary)',
            margin: '0',
            textAlign: 'center',
            fontStyle: 'italic',
          }}>
            Tippe zum Aufdecken
          </p>
        )}

        {/* Review-Info */}
        {card.repetitions > 0 && !flipped && (
          <div style={{
            position: 'absolute',
            bottom: '12px',
            right: '16px',
            fontSize: '11px',
            color: 'var(--text-secondary)',
          }}>
            {daysUntilReview === 0 ? 'Heute fällig' : `In ${daysUntilReview} Tagen`}
          </div>
        )}
      </div>

      {/* Hint */}
      {!flipped && (
        <div style={{ textAlign: 'center', marginTop: '8px' }}>
          {!showHint ? (
            <button
              onClick={() => setShowHint(true)}
              style={{
                background: 'none', border: 'none',
                color: 'var(--text-secondary)', fontSize: '13px',
                cursor: 'pointer', textDecoration: 'underline',
              }}
            >
              Hinweis anzeigen
            </button>
          ) : (
            <p style={{
              fontSize: '13px', color: color,
              fontStyle: 'italic', margin: '0',
              padding: '8px 16px',
              background: `${color}11`,
              borderRadius: '8px',
              display: 'inline-block',
            }}>
              💡 {card.hint}
            </p>
          )}
        </div>
      )}

      {/* SM-2 Bewertung nach Aufdecken */}
      {flipped && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px',
          marginTop: '12px',
        }}>
          {QUALITY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => {
                const updates = calculateNextReview(card, opt.value);
                onRate(card.id, updates);
              }}
              style={{
                background: opt.bg,
                color: opt.color,
                border: `1px solid ${opt.color}44`,
                borderRadius: '12px',
                padding: '12px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FlashcardScreen({ flashcards, onUpdateFlashcard, onRemoveFlashcard, onBack }) {
  const [filter, setFilter] = useState('due');
  const [sortBy, setSortBy] = useState('subject');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionDone, setSessionDone] = useState(false);
  const [ratedCount, setRatedCount] = useState(0);
  const [queueIds, setQueueIds] = useState([]);

  const dueCards = useMemo(() => getDueCards(flashcards), [flashcards]);

  const filteredCards = useMemo(() => {
    let cards = filter === 'due' ? dueCards
      : filter === 'all' ? flashcards
      : filter === 'mastered' ? flashcards.filter(c => c.status === 'mastered')
      : flashcards.filter(c => c.status === filter);

    if (sortBy === 'subject') {
      cards = [...cards].sort((a, b) => (a.subject || '').localeCompare(b.subject || ''));
    } else if (sortBy === 'difficulty') {
      const order = { schwer: 0, mittel: 1, leicht: 2 };
      cards = [...cards].sort((a, b) => (order[a.difficulty] || 1) - (order[b.difficulty] || 1));
    } else if (sortBy === 'due') {
      cards = [...cards].sort((a, b) => new Date(a.nextReview || 0) - new Date(b.nextReview || 0));
    }

    return cards;
  }, [flashcards, filter, sortBy, dueCards]);

  // Die Session-Reihenfolge wird beim Wechsel von Filter/Sortierung einmalig
  // eingefroren (nur die IDs, nicht die Karteninhalte selbst): würde man die
  // Warteschlange stattdessen bei jedem Render aus filteredCards ableiten,
  // würde eine bewertete Karte (z. B. Filter "Fällig") direkt aus der Liste
  // fallen sobald ihr nextReview in der Zukunft liegt – wodurch currentIndex+1
  // auf die eigentlich nächste, noch unbewertete Karte zeigt und diese
  // übersprungen wird, statt sie anzuzeigen.
  useEffect(() => {
    setQueueIds(filteredCards.map(c => c.id));
    setCurrentIndex(0);
    setSessionDone(false);
    setRatedCount(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, sortBy]);

  const activeQueue = queueIds.map(id => flashcards.find(c => c.id === id)).filter(Boolean);
  const currentCard = activeQueue[currentIndex];
  const total = activeQueue.length;

  function handleRate(id, updates) {
    onUpdateFlashcard(id, updates);
    setRatedCount(r => r + 1);
    if (currentIndex >= activeQueue.length - 1) {
      setSessionDone(true);
    } else {
      setCurrentIndex(i => i + 1);
    }
  }

  function startNewSession() {
    setQueueIds(filteredCards.map(c => c.id));
    setCurrentIndex(0);
    setSessionDone(false);
    setRatedCount(0);
  }

  function exportFlashcards() {
    const text = flashcards.map((card, i) =>
      `Karte ${i + 1}: ${card.concept} (${card.subject || ''})\n` +
      `${'─'.repeat(40)}\n` +
      `F: ${card.question}\n\n` +
      `A: ${card.answer}\n\n` +
      `Tipp: ${card.hint}\n`
    ).join('\n' + '═'.repeat(40) + '\n\n');

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Lumo-Karteikarten.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  if (flashcards.length === 0) {
    return (
      <div className="screen">
        <div className="screen-content" style={{ gap: '20px' }}>
          <LumoMascot state="idle" />
          <h1 style={{ fontSize: '22px', textAlign: 'center' }}>Noch keine Karteikarten.</h1>
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', lineHeight: '1.5' }}>
            Lumo erstellt automatisch Karteikarten wenn du bei einem Block Lücken hast.
          </p>
          <button onClick={onBack} style={{
            background: 'var(--gold)', color: '#1a1206',
            border: 'none', borderRadius: '12px',
            padding: '14px 28px', fontSize: '16px',
            fontWeight: '700', cursor: 'pointer',
          }}>
            Zurück
          </button>
        </div>
      </div>
    );
  }

  if (sessionDone) {
    const masteredCount = flashcards.filter(c => c.status === 'mastered').length;
    const goodRate = Math.round((ratedCount / Math.max(1, total)) * 100);
    return (
      <div className="screen">
        <div className="screen-content" style={{ gap: '24px', maxWidth: '400px' }}>
          <LumoMascot state={goodRate >= 70 ? 'cheer' : 'learning'} />
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '26px', marginBottom: '8px' }}>
              {goodRate >= 70 ? 'Starke Session.' : 'Session beendet.'}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px', lineHeight: '1.5' }}>
              {ratedCount} Karten bewertet.
              {masteredCount > 0 && ` ${masteredCount} gemeistert.`}
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '8px' }}>
              {dueCards.length > 0
                ? `${dueCards.length} Karten sind morgen wieder fällig.`
                : 'Alle Karten sind auf dem neuesten Stand. 🎉'}
            </p>
          </div>
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {dueCards.length > 0 && (
              <button onClick={startNewSession} style={{
                width: '100%', background: 'var(--gold)',
                color: '#1a1206', border: 'none',
                borderRadius: '12px', padding: '14px',
                fontSize: '16px', fontWeight: '700', cursor: 'pointer',
              }}>
                Weiter üben
              </button>
            )}
            <button onClick={onBack} style={{
              background: 'none', border: 'none',
              color: 'var(--text-secondary)', fontSize: '14px',
              cursor: 'pointer', padding: '8px',
            }}>
              Zurück zum Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Gruppierung nach Subject für Sidebar
  const subjectGroups = [...new Set(flashcards.map(c => c.subject).filter(Boolean))];

  return (
    <div className="screen" style={{ justifyContent: 'flex-start', paddingTop: '16px' }}>
      <div className="screen-content" style={{ maxWidth: '520px', gap: '14px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
          <button onClick={onBack} style={{
            background: 'none', border: 'none',
            color: 'var(--text-secondary)', fontSize: '14px', cursor: 'pointer',
          }}>←</button>
          <h2 style={{ fontSize: '18px', fontWeight: '700', margin: '0', flex: 1 }}>
            Karteikarten
          </h2>
          <button onClick={exportFlashcards} style={{
            background: 'none',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            color: 'var(--text-secondary)',
            fontSize: '12px', cursor: 'pointer',
            padding: '5px 10px',
          }}>
            ↓ Export
          </button>
        </div>

        {/* Stats Row */}
        <div style={{
          display: 'flex',
          gap: '8px',
          width: '100%',
          overflowX: 'auto',
          paddingBottom: '2px',
        }}>
          {[
            { label: 'Fällig', value: dueCards.length, color: 'var(--red)', id: 'due' },
            { label: 'Alle', value: flashcards.filter(c => c.status !== 'mastered').length, color: 'var(--text-secondary)', id: 'all' },
            { label: 'Gemeistert', value: flashcards.filter(c => c.status === 'mastered').length, color: 'var(--green)', id: 'mastered' },
          ].map(stat => (
            <button
              key={stat.id}
              onClick={() => setFilter(stat.id)}
              style={{
                flex: 1,
                background: filter === stat.id ? 'var(--bg-card)' : 'var(--bg-elevated)',
                border: filter === stat.id ? `1px solid ${stat.color}` : '1px solid var(--border)',
                borderRadius: '10px',
                padding: '8px 6px',
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              <p style={{ fontSize: '18px', fontWeight: '800', color: stat.color, margin: '0 0 2px' }}>
                {stat.value}
              </p>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '0', fontWeight: '500' }}>
                {stat.label}
              </p>
            </button>
          ))}
        </div>

        {/* Subject Filter Chips */}
        {subjectGroups.length > 1 && (
          <div style={{ display: 'flex', gap: '6px', width: '100%', overflowX: 'auto', paddingBottom: '2px' }}>
            {subjectGroups.map(subject => {
              const color = getSubjectColor(subject);
              const count = flashcards.filter(c => c.subject === subject && c.status !== 'mastered').length;
              return (
                <button
                  key={subject}
                  onClick={() => {
                    setSortBy('subject');
                    setFilter('all');
                  }}
                  style={{
                    background: `${color}22`,
                    border: `1px solid ${color}44`,
                    borderRadius: '20px',
                    padding: '5px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, display: 'inline-block' }} />
                  <span style={{ fontSize: '12px', color, fontWeight: '600' }}>
                    {subject.charAt(0).toUpperCase() + subject.slice(1)}
                  </span>
                  {count > 0 && (
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>({count})</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Sort */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', width: '100%' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Sortieren:</span>
          {[
            { id: 'due', label: 'Fälligkeitsdatum' },
            { id: 'subject', label: 'Fach' },
            { id: 'difficulty', label: 'Schwierigkeit' },
          ].map(s => (
            <button
              key={s.id}
              onClick={() => setSortBy(s.id)}
              style={{
                background: sortBy === s.id ? 'var(--gold)' : 'var(--bg-card)',
                color: sortBy === s.id ? '#1a1206' : 'var(--text-secondary)',
                border: sortBy === s.id ? 'none' : '1px solid var(--border)',
                borderRadius: '8px',
                padding: '5px 10px',
                fontSize: '12px',
                fontWeight: sortBy === s.id ? '700' : '400',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Progress */}
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ flex: 1, height: '4px', background: 'var(--bg-card)', borderRadius: '4px' }}>
            <div style={{
              height: '100%',
              width: `${total > 0 ? (currentIndex / total) * 100 : 0}%`,
              background: 'var(--gold)',
              borderRadius: '4px',
              transition: 'width 0.3s ease',
            }} />
          </div>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
            {currentIndex + 1} / {total}
          </span>
        </div>

        {/* Karte */}
        {currentCard ? (
          <FlashCard
            key={currentCard.id}
            card={currentCard}
            onRate={handleRate}
            onRemove={(id) => {
              onRemoveFlashcard(id);
              if (currentIndex >= activeQueue.length - 1 && currentIndex > 0) {
                setCurrentIndex(i => i - 1);
              }
            }}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <LumoMascot state="cheer" />
            <p style={{ color: 'var(--green)', fontWeight: '600', fontSize: '16px', marginTop: '16px' }}>
              Alle Karten in dieser Kategorie erledigt!
            </p>
            <button onClick={startNewSession} style={{
              marginTop: '16px',
              background: 'var(--gold)', color: '#1a1206',
              border: 'none', borderRadius: '12px',
              padding: '12px 24px', fontSize: '14px',
              fontWeight: '700', cursor: 'pointer',
            }}>
              Nochmal durchgehen
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
