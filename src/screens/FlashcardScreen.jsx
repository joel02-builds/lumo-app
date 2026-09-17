import { useState } from 'react';
import LumoMascot from '../components/LumoMascot.jsx';
import { getSubjectColor } from '../utils/subjectColors.js';

const DIFFICULTY_COLORS = {
  leicht: '#3D9E6E',
  mittel: '#D4A843',
  schwer: '#E07B54',
};

function exportFlashcards(flashcards) {
  const text = flashcards.map((card, i) =>
    `Karte ${i + 1}: ${card.concept}\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `Frage: ${card.question}\n\n` +
    `Antwort: ${card.answer}\n\n` +
    `Hinweis: ${card.hint}\n`
  ).join('\n' + '═'.repeat(30) + '\n\n');

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

function FlashCard({ card, onKnown, onUnsure, onRemove }) {
  const [flipped, setFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const color = card.subjectColor || getSubjectColor(card.subject);

  return (
    <div style={{
      width: '100%',
      maxWidth: '480px',
      perspective: '1000px',
    }}>
      {/* Karte */}
      <div
        onClick={() => setFlipped(f => !f)}
        style={{
          width: '100%',
          minHeight: '220px',
          background: flipped ? 'var(--bg-card-bright)' : 'var(--bg-card)',
          borderRadius: '20px',
          border: `1px solid ${color}44`,
          borderTop: `4px solid ${color}`,
          padding: '28px 24px',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '16px',
          transition: 'all 0.3s ease',
          boxShadow: flipped
            ? `0 8px 32px ${color}22`
            : '0 4px 16px rgba(0,0,0,0.2)',
          position: 'relative',
          userSelect: 'none',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span style={{
              fontSize: '10px',
              fontWeight: '700',
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              color,
            }}>
              {flipped ? 'Antwort' : 'Frage'}
            </span>
            <p style={{
              fontSize: '12px',
              color: 'var(--text-secondary)',
              margin: '2px 0 0',
            }}>
              {card.concept}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{
              fontSize: '11px',
              fontWeight: '600',
              color: DIFFICULTY_COLORS[card.difficulty] || 'var(--text-secondary)',
              background: `${DIFFICULTY_COLORS[card.difficulty]}22`,
              padding: '3px 8px',
              borderRadius: '20px',
            }}>
              {card.difficulty}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(card.id); }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '14px',
                padding: '2px',
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Inhalt */}
        <p style={{
          fontSize: flipped ? '16px' : '18px',
          fontWeight: flipped ? '400' : '600',
          color: 'var(--text-primary)',
          lineHeight: '1.5',
          margin: '0',
          flex: 1,
          display: 'flex',
          alignItems: 'center',
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
            Tippe zum Umdrehen
          </p>
        )}
      </div>

      {/* Hinweis */}
      {!flipped && (
        <div style={{ textAlign: 'center', marginTop: '10px' }}>
          {!showHint ? (
            <button
              onClick={() => setShowHint(true)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '13px',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Hinweis anzeigen
            </button>
          ) : (
            <p style={{
              fontSize: '13px',
              color: color,
              fontStyle: 'italic',
              margin: '0',
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

      {/* Aktions-Buttons – nur nach Umdrehen */}
      {flipped && (
        <div style={{
          display: 'flex',
          gap: '10px',
          marginTop: '14px',
        }}>
          <button
            onClick={() => { setFlipped(false); setShowHint(false); onUnsure(card.id); }}
            style={{
              flex: 1,
              background: 'var(--bg-card)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '13px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Nochmal üben
          </button>
          <button
            onClick={() => { setFlipped(false); setShowHint(false); onKnown(card.id); }}
            style={{
              flex: 1,
              background: color,
              color: '#1a1206',
              border: 'none',
              borderRadius: '12px',
              padding: '13px',
              fontSize: '14px',
              fontWeight: '700',
              cursor: 'pointer',
            }}
          >
            Gewusst ✓
          </button>
        </div>
      )}
    </div>
  );
}

function matchesFilter(filter, card) {
  if (filter === 'new') return card.status === 'new';
  if (filter === 'learning') return card.status === 'learning';
  return card.status !== 'mastered';
}

export default function FlashcardScreen({ flashcards, onUpdateFlashcard, onRemoveFlashcard, onBack }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filter, setFilter] = useState('all'); // all | new | learning
  const [sessionDone, setSessionDone] = useState(false);
  const [knownCount, setKnownCount] = useState(0);
  // Feste Reihenfolge für diese Durchgangs-Session: reviewCount/status ändern
  // sich bei jeder Antwort, wodurch eine Karte den aktuellen Filter verlassen
  // kann (z. B. 'new' -> 'learning'). Würde man filteredCards bei jedem Render
  // neu aus den live aktualisierten flashcards ableiten, würde das Array genau
  // dann schrumpfen und currentIndex + 1 die eigentlich nächste Karte
  // überspringen. Die Reihenfolge/IDs werden daher einmal pro Filterwechsel
  // eingefroren; nur der Karteninhalt selbst bleibt live.
  const [queueIds, setQueueIds] = useState(() =>
    flashcards.filter(card => matchesFilter('all', card)).map(c => c.id)
  );

  const filteredCards = queueIds
    .map(id => flashcards.find(c => c.id === id))
    .filter(Boolean);

  const currentCard = filteredCards[currentIndex];
  const total = filteredCards.length;

  function selectFilter(value) {
    setFilter(value);
    setQueueIds(flashcards.filter(card => matchesFilter(value, card)).map(c => c.id));
    setCurrentIndex(0);
    setSessionDone(false);
  }

  function handleKnown(id) {
    const card = flashcards.find(c => c.id === id);
    const newCount = (card?.reviewCount || 0) + 1;
    onUpdateFlashcard(id, {
      status: newCount >= 3 ? 'mastered' : 'learning',
      reviewCount: newCount,
    });
    setKnownCount(k => k + 1);
    advance();
  }

  function handleUnsure(id) {
    onUpdateFlashcard(id, { status: 'learning' });
    advance();
  }

  function advance() {
    if (currentIndex >= filteredCards.length - 1) {
      setSessionDone(true);
    } else {
      setCurrentIndex(i => i + 1);
    }
  }

  if (flashcards.length === 0) {
    return (
      <div className="screen">
        <div className="screen-content" style={{ gap: '20px' }}>
          <LumoMascot state="idle" />
          <h1 style={{ fontSize: '24px', textAlign: 'center' }}>Noch keine Karteikarten.</h1>
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', lineHeight: '1.5' }}>
            Lumo erstellt automatisch Karteikarten wenn du bei einem Block Lücken hast.
            Lerne einen Block und komm dann hierher zurück.
          </p>
          <button onClick={onBack} style={{
            background: 'var(--gold)',
            color: '#1a1206',
            border: 'none',
            borderRadius: '12px',
            padding: '14px 28px',
            fontSize: '16px',
            fontWeight: '700',
            cursor: 'pointer',
          }}>
            Zurück zum Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (sessionDone) {
    const masteredCount = flashcards.filter(c => c.status === 'mastered').length;
    return (
      <div className="screen">
        <div className="screen-content" style={{ gap: '24px', maxWidth: '400px' }}>
          <LumoMascot state={knownCount > total * 0.7 ? 'cheer' : 'learning'} />
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '26px', marginBottom: '8px' }}>
              {knownCount > total * 0.7 ? 'Starke Session.' : 'Session beendet.'}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px', lineHeight: '1.5' }}>
              {knownCount} von {total} Karten gewusst.
              {masteredCount > 0 && ` ${masteredCount} Karten gemeistert.`}
            </p>
          </div>
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={() => { selectFilter(filter); setKnownCount(0); }}
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
              Nochmal durchgehen
            </button>
            <button onClick={onBack} style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '14px',
              cursor: 'pointer',
              padding: '8px',
            }}>
              Zurück zum Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen" style={{ justifyContent: 'flex-start', paddingTop: '20px' }}>
      <div className="screen-content" style={{ maxWidth: '520px', gap: '16px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
          <button onClick={onBack} style={{
            background: 'none', border: 'none',
            color: 'var(--text-secondary)', fontSize: '14px', cursor: 'pointer',
          }}>
            ← Zurück
          </button>
          <h2 style={{ fontSize: '20px', fontWeight: '700', margin: '0', flex: 1 }}>
            Karteikarten
          </h2>
          {flashcards.length > 0 && (
            <button
              onClick={() => exportFlashcards(flashcards)}
              style={{
                background: 'none',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: 'var(--text-secondary)',
                fontSize: '12px',
                cursor: 'pointer',
                padding: '6px 12px',
              }}
            >
              ↓ Export
            </button>
          )}
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            {currentIndex + 1} / {total}
          </span>
        </div>

        {/* Filter */}
        <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
          {[
            { label: 'Alle', value: 'all' },
            { label: 'Neu', value: 'new' },
            { label: 'In Übung', value: 'learning' },
          ].map(({ label, value }) => (
            <button
              key={value}
              onClick={() => selectFilter(value)}
              style={{
                flex: 1,
                background: filter === value ? 'var(--gold)' : 'var(--bg-card)',
                color: filter === value ? '#1a1206' : 'var(--text-secondary)',
                border: filter === value ? 'none' : '1px solid var(--border)',
                borderRadius: '10px',
                padding: '8px',
                fontSize: '13px',
                fontWeight: filter === value ? '700' : '500',
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Fortschrittsbalken */}
        <div style={{ width: '100%', height: '4px', background: 'var(--bg-card)', borderRadius: '4px' }}>
          <div style={{
            height: '100%',
            width: `${((currentIndex) / total) * 100}%`,
            background: 'var(--gold)',
            borderRadius: '4px',
            transition: 'width 0.3s ease',
          }} />
        </div>

        {/* Aktuelle Karte */}
        {currentCard ? (
          <FlashCard
            key={currentCard.id}
            card={currentCard}
            onKnown={handleKnown}
            onUnsure={handleUnsure}
            onRemove={(id) => {
              onRemoveFlashcard(id);
              if (currentIndex >= filteredCards.length - 1) {
                setCurrentIndex(Math.max(0, filteredCards.length - 2));
              }
            }}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <p style={{ color: 'var(--text-secondary)' }}>
              Keine Karten in dieser Kategorie.
            </p>
          </div>
        )}

        {/* Statistik unten */}
        <div style={{
          display: 'flex',
          gap: '16px',
          justifyContent: 'center',
          fontSize: '13px',
          color: 'var(--text-secondary)',
        }}>
          <span>🆕 {flashcards.filter(c => c.status === 'new').length} Neu</span>
          <span>📚 {flashcards.filter(c => c.status === 'learning').length} In Übung</span>
          <span>✓ {flashcards.filter(c => c.status === 'mastered').length} Gemeistert</span>
        </div>

      </div>
    </div>
  );
}
