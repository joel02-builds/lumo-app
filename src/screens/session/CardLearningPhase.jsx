import { useEffect, useState, useCallback } from 'react';
import LumoMascot from '../../components/LumoMascot.jsx';
import ErrorBanner from '../../components/ErrorBanner.jsx';
import { lumoApi } from '../../api/lumo.js';

export default function CardLearningPhase({ block, onDone, onExit, onAskFreely }) {
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState('loading'); // loading | reading | answering | feedback | done
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState(null);
  const [animating, setAnimating] = useState(false);

  // Karten laden
  useEffect(() => {
    let cancelled = false;
    lumoApi.generateCards({
      blockTitle: block.title,
      blockContent: block.content,
      difficulty: block.difficulty,
    }).then((data) => {
      if (!cancelled) {
        setCards(data.cards);
        setPhase('reading');
      }
    }).catch((err) => {
      if (!cancelled) setError(err.message);
    });
    return () => { cancelled = true; };
  }, [block.id]);

  const currentCard = cards[currentIndex];
  const isLast = currentIndex === cards.length - 1;
  const progress = cards.length > 0 ? currentIndex / cards.length : 0;

  function handleReadingDone() {
    setPhase('answering');
    setAnswer('');
  }

  function handleAnswerSubmit() {
    if (!answer.trim()) return;
    // Einfaches lokales Feedback – kein extra API-Call
    const words = answer.trim().split(/\s+/).length;
    const isGood = words >= 8;
    setFeedback(isGood
      ? 'Gut. Du hast es in eigenen Worten.'
      : 'Versuch es etwas ausführlicher – beschreib es als würdest du es jemandem erklären.'
    );
    setPhase('feedback');
  }

  function handleNext() {
    setAnimating(true);
    setTimeout(() => {
      if (isLast) {
        onDone();
      } else {
        setCurrentIndex((i) => i + 1);
        setPhase('reading');
        setAnswer('');
        setFeedback(null);
        setAnimating(false);
      }
    }, 300);
  }

  if (error) {
    return (
      <div className="screen">
        <div className="screen-content">
          <LumoMascot state="idle" label="Lumo" />
          <ErrorBanner message={error} onRetry={() => window.location.reload()} onExit={onExit} />
        </div>
      </div>
    );
  }

  if (phase === 'loading') {
    return (
      <div className="screen">
        <div className="screen-content">
          <LumoMascot state="thinking" label="Lumo" />
          <p style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>
            Lumo bereitet deinen Block vor …
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg)',
    }}>

      {/* Header */}
      <div style={{
        padding: '14px 24px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-elevated)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexShrink: 0,
      }}>
        <LumoMascot state="learning" label="" size="small" />
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: '11px',
            fontWeight: '600',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            color: 'var(--gold)',
            marginBottom: '2px',
          }}>
            {block.title}
          </div>
          {/* Progress Dots */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {cards.map((_, i) => (
              <div key={i} style={{
                width: i === currentIndex ? '20px' : '8px',
                height: '8px',
                borderRadius: '4px',
                background: i < currentIndex
                  ? 'var(--green)'
                  : i === currentIndex
                  ? 'var(--gold)'
                  : 'var(--border)',
                transition: 'all 0.3s ease',
                boxShadow: i === currentIndex ? '0 0 8px var(--gold)' : 'none',
              }} />
            ))}
          </div>
        </div>
        <button onClick={onExit} style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-secondary)',
          fontSize: '14px',
          cursor: 'pointer',
          padding: '8px',
        }}>
          Pause
        </button>
      </div>

      {/* Hauptbereich */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 24px',
        gap: '24px',
      }}>

        {/* Die Karte */}
        <div style={{
          width: '100%',
          maxWidth: '560px',
          background: 'var(--bg-card)',
          border: `1px solid ${phase === 'answering' || phase === 'feedback' ? 'transparent' : 'rgba(212, 168, 67, 0.25)'}`,
          borderRadius: '20px',
          padding: '32px',
          boxShadow: phase === 'reading'
            ? '0 0 40px rgba(212, 168, 67, 0.08), 0 8px 32px rgba(0,0,0,0.3)'
            : '0 8px 32px rgba(0,0,0,0.3)',
          transition: 'all 0.3s ease',
          opacity: animating ? 0 : 1,
          transform: animating ? 'translateY(8px)' : 'translateY(0)',
        }}>

          {/* Konzept-Label */}
          <div style={{
            fontSize: '11px',
            fontWeight: '700',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            color: 'var(--gold)',
            marginBottom: '16px',
          }}>
            {currentCard?.concept || ''}
          </div>

          {/* Erklärung – verschwindet bei Answering */}
          {(phase === 'reading' || phase === 'loading') && (
            <p style={{
              fontSize: '19px',
              lineHeight: '1.65',
              color: 'var(--text-primary)',
              margin: '0 0 24px',
              fontWeight: '400',
            }}>
              {currentCard?.explanation || ''}
            </p>
          )}

          {/* Lumos Frage */}
          {phase === 'reading' && (
            <>
              <div style={{
                height: '1px',
                background: 'var(--border)',
                margin: '0 0 20px',
              }} />
              <p style={{
                fontSize: '16px',
                color: 'var(--gold)',
                fontWeight: '500',
                margin: '0 0 20px',
                lineHeight: '1.5',
              }}>
                {currentCard?.question || ''}
              </p>
              <button
                onClick={handleReadingDone}
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
                  transition: 'all 0.15s ease',
                }}
              >
                Antworten
              </button>
            </>
          )}

          {/* Antwort-Phase – Erklärung weg */}
          {phase === 'answering' && (
            <>
              <p style={{
                fontSize: '16px',
                color: 'var(--gold)',
                fontWeight: '500',
                margin: '0 0 16px',
                lineHeight: '1.5',
              }}>
                {currentCard?.question || ''}
              </p>
              <p style={{
                fontSize: '13px',
                color: 'var(--text-secondary)',
                margin: '0 0 12px',
              }}>
                Lumo hört zu. Kein Zurückschauen.
              </p>
              <textarea
                autoFocus
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Schreib in deinen eigenen Worten …"
                rows={4}
                style={{
                  width: '100%',
                  resize: 'none',
                  fontSize: '16px',
                  borderRadius: '12px',
                  marginBottom: '12px',
                  lineHeight: '1.6',
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.metaKey) handleAnswerSubmit();
                }}
              />
              <button
                onClick={handleAnswerSubmit}
                disabled={!answer.trim()}
                style={{
                  width: '100%',
                  background: answer.trim() ? 'var(--gold)' : 'var(--bg-card-bright)',
                  color: answer.trim() ? '#1a1206' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '14px',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: answer.trim() ? 'pointer' : 'not-allowed',
                  transition: 'all 0.15s ease',
                }}
              >
                Abschicken
              </button>
            </>
          )}

          {/* Feedback-Phase */}
          {phase === 'feedback' && (
            <>
              <div style={{
                background: 'var(--bg-elevated)',
                borderRadius: '12px',
                padding: '16px 18px',
                marginBottom: '16px',
                borderLeft: '3px solid var(--gold)',
              }}>
                <p style={{
                  fontSize: '14px',
                  color: 'var(--text-secondary)',
                  margin: '0 0 4px',
                  fontWeight: '600',
                }}>
                  Deine Antwort
                </p>
                <p style={{
                  fontSize: '16px',
                  color: 'var(--text-primary)',
                  margin: '0',
                  lineHeight: '1.5',
                }}>
                  {answer}
                </p>
              </div>

              <div style={{
                background: 'rgba(212, 168, 67, 0.08)',
                borderRadius: '12px',
                padding: '16px 18px',
                marginBottom: '20px',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
              }}>
                <LumoMascot state="cheer" label="" size="small" />
                <p style={{
                  fontSize: '16px',
                  color: 'var(--text-primary)',
                  margin: '0',
                  lineHeight: '1.5',
                  fontWeight: '500',
                }}>
                  {feedback}
                </p>
              </div>

              <button
                onClick={handleNext}
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
                {isLast ? 'Block abschließen' : 'Weiter →'}
              </button>
            </>
          )}
        </div>

        {onAskFreely && phase !== 'answering' && phase !== 'feedback' && (
          <button
            className="text-link"
            onClick={onAskFreely}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Ich möchte lieber frei nachfragen
          </button>
        )}
      </div>
    </div>
  );
}
