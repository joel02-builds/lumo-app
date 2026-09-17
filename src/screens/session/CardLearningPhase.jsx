import { useEffect, useState, useCallback } from 'react';
import LumoMascot from '../../components/LumoMascot.jsx';
import ErrorBanner from '../../components/ErrorBanner.jsx';
import CardVisual from '../../components/CardVisual.jsx';
import HighlightedText from '../../components/HighlightedText.jsx';
import { lumoApi } from '../../api/lumo.js';
import YoutubePanel from '../../components/YoutubePanel.jsx';
import { getBlockColor } from '../../utils/subjectColors.js';

export default function CardLearningPhase({ block, goalType, mood, learningStyle, elapsedSeconds, onDone, onExit, onAskFreely, onCardsReady }) {
  const subjectColor = getBlockColor(block);
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState('loading'); // loading | reading | answering | feedback | final-recall | done
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState(null);
  const [animating, setAnimating] = useState(false);
  const [sending, setSending] = useState(false);
  const [isGoodAnswer, setIsGoodAnswer] = useState(false);
  const [finalFeedback, setFinalFeedback] = useState(null);
  const [finalSending, setFinalSending] = useState(false);
  const [showBreakSuggestion, setShowBreakSuggestion] = useState(false);
  const [hint, setHint] = useState('');
  const [hintLoading, setHintLoading] = useState(false);
  const [clickedCheck, setClickedCheck] = useState(false);
  const [reexplaining, setReexplaining] = useState(false);
  const [alternativeExplanation, setAlternativeExplanation] = useState('');
  const [activeTerm, setActiveTerm] = useState(null);
  const [termExplanation, setTermExplanation] = useState('');
  const [termLoading, setTermLoading] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [pretestAnswer, setPretestAnswer] = useState('');
  const [pretestDone, setPretestDone] = useState(false);
  const [whyAnswer, setWhyAnswer] = useState('');
  const [whyMode, setWhyMode] = useState(false);
  const [whyFeedback, setWhyFeedback] = useState('');
  const [whySending, setWhySending] = useState(false);
  const [bridgeVisible, setBridgeVisible] = useState(true);
  const [showYoutube, setShowYoutube] = useState(false);

  // Karten laden
  useEffect(() => {
    let cancelled = false;
    lumoApi.generateCards({
      blockTitle: block.title,
      blockContent: block.content,
      difficulty: block.difficulty,
      goalType,
      mood,
      learningStyle,
    }).then((data) => {
      if (!cancelled) {
        setCards(data.cards);
        setPhase('reading');
        onCardsReady?.(data.cards);
      }
    }).catch((err) => {
      if (!cancelled) setError(err.message);
    });
    return () => { cancelled = true; };
  }, [block.id]);

  // Startet den 20-Minuten-Timer genau einmal, sobald die Karten geladen sind –
  // nicht bei jedem Phasenwechsel neu (sonst würde jede Antwort den Countdown
  // zurücksetzen). Ein leeres Dependency-Array würde den Timer nie starten, da
  // "phase" beim Mount immer noch 'loading' ist und der Effect danach nie
  // erneut läuft; stattdessen hängt er an cards.length > 0, das genau einmal
  // von false auf true kippt.
  const cardsLoaded = cards.length > 0;
  useEffect(() => {
    if (!cardsLoaded) return;
    const timer = setTimeout(() => {
      setShowBreakSuggestion(true);
    }, 20 * 60 * 1000);
    return () => clearTimeout(timer);
  }, [cardsLoaded]);

  const currentCard = cards[currentIndex];
  const isLast = currentIndex === cards.length - 1;
  const progress = cards.length > 0 ? currentIndex / cards.length : 0;

  function shouldShowPretest() {
    return currentIndex > 0 &&
      currentCard?.pretest_question &&
      currentCard?.concept !== 'Überblick' &&
      !pretestDone;
  }

  function saveNote(text) {
    try {
      const key = `lumo_note_${block.id}_${currentCard?.concept}`;
      if (text.trim()) {
        localStorage.setItem(key, text);
      } else {
        localStorage.removeItem(key);
      }
    } catch {}
  }

  function loadNote() {
    try {
      const key = `lumo_note_${block.id}_${currentCard?.concept}`;
      return localStorage.getItem(key) || '';
    } catch { return ''; }
  }

  useEffect(() => {
    if (currentCard) {
      const saved = loadNote();
      setNoteText(saved);
      setNoteOpen(!!saved);
    }
  }, [currentIndex]);

  function handleReadingDone() {
    setPhase('answering');
    setAnswer('');
  }

  async function handleAnswerSubmit() {
    if (!answer.trim() || sending) return;
    setSending(true);
    try {
      const result = await lumoApi.evaluateCardAnswer({
        concept: currentCard.concept,
        explanation: currentCard.explanation,
        question: currentCard.question,
        userAnswer: answer,
      });
      setFeedback(result.feedback);
      setIsGoodAnswer(result.isGood);
      setPhase('feedback');
    } catch (err) {
      // Fallback auf lokale Bewertung wenn API fehlt
      const words = answer.trim().split(/\s+/).length;
      setFeedback(words >= 8
        ? 'Das klingt richtig.'
        : 'Beschreib es etwas ausführlicher.'
      );
      setIsGoodAnswer(words >= 8);
      setPhase('feedback');
    } finally {
      setSending(false);
    }
  }

  async function handleNoIdea() {
    if (hintLoading) return;
    setHintLoading(true);
    try {
      const result = await lumoApi.getUnderstandingHint({
        blockTitle: block.title,
        blockContent: currentCard.explanation,
      });
      setHint(result.hint);
    } catch {
      setHint('Ich geb dir einen Tipp: Was ist die eine Sache die du dir merken musst?');
    } finally {
      setHintLoading(false);
    }
  }

  function handleNext() {
    setAnimating(true);
    setTimeout(() => {
      if (isLast) {
        setPhase('final-recall');
        setAnswer('');
        setFeedback(null);
        setHint('');
        setHintLoading(false);
        setClickedCheck(false);
        setAlternativeExplanation('');
        setReexplaining(false);
        setActiveTerm(null);
        setTermExplanation('');
        setNoteOpen(false);
        setNoteText('');
        setPretestAnswer('');
        setPretestDone(false);
        setWhyAnswer('');
        setWhyMode(false);
        setWhyFeedback('');
        setShowYoutube(false);
        setAnimating(false);
      } else {
        setCurrentIndex((i) => i + 1);
        setPhase('reading');
        setAnswer('');
        setFeedback(null);
        setHint('');
        setHintLoading(false);
        setClickedCheck(false);
        setAlternativeExplanation('');
        setReexplaining(false);
        setActiveTerm(null);
        setTermExplanation('');
        setNoteOpen(false);
        setNoteText('');
        setPretestAnswer('');
        setPretestDone(false);
        setWhyAnswer('');
        setWhyMode(false);
        setWhyFeedback('');
        setShowYoutube(false);
        setAnimating(false);
      }
    }, 300);
  }

  async function handleTermClick(term) {
    if (activeTerm === term) {
      setActiveTerm(null);
      setTermExplanation('');
      return;
    }
    setActiveTerm(term);
    setTermLoading(true);
    setTermExplanation('');
    try {
      const result = await lumoApi.explainTerm({
        term,
        blockTitle: block.title,
        blockContext: currentCard.explanation,
      });
      setTermExplanation(result.explanation);
    } catch {
      setTermExplanation('Ich kann diesen Begriff gerade nicht erklären.');
    } finally {
      setTermLoading(false);
    }
  }

  async function handleFinalSubmit() {
    if (!answer.trim() || finalSending) return;
    setFinalSending(true);
    try {
      const result = await lumoApi.evaluateCardAnswer({
        concept: 'Gesamtblock',
        explanation: cards.map(c => c.explanation).join(' '),
        question: 'Erkläre den gesamten Block in eigenen Worten.',
        userAnswer: answer,
      });
      setFinalFeedback(result);
    } catch {
      setFinalFeedback({ isGood: true, feedback: 'Gut gemacht – du hast den Block abgeschlossen.' });
    } finally {
      setFinalSending(false);
    }
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
            Ich bereite deinen Block vor …
          </p>
        </div>
      </div>
    );
  }

  if (phase === 'final-recall') {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: '10vh',
        padding: '10vh 24px 40px',
        background: 'var(--bg)',
        gap: '24px',
      }}>
        <LumoMascot state={finalFeedback ? (finalFeedback.isGood ? 'cheer' : 'learning') : 'idle'} />

        <div style={{ textAlign: 'center', maxWidth: '560px' }}>
          <div style={{
            fontSize: '11px',
            fontWeight: '700',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            color: 'var(--gold)',
            marginBottom: '12px',
          }}>
            Gesamtblock
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>
            Erkläre den ganzen Block.
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px', lineHeight: '1.5' }}>
            Stell dir vor du erklärst es jemandem der nichts davon weiß. Kein Zurückschauen.
          </p>
        </div>

        {!finalFeedback && bridgeVisible && (
          <div style={{
            width: '100%',
            maxWidth: '560px',
            background: 'var(--bg-card)',
            borderRadius: '14px',
            padding: '16px 20px',
          }}>
            <p style={{
              fontSize: '11px',
              fontWeight: '700',
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              color: 'var(--text-secondary)',
              margin: '0 0 10px',
            }}>
              Was du gerade gelernt hast
            </p>
            {cards.filter(c => c.concept !== 'Überblick').map((card, i) => (
              <p key={i} style={{
                fontSize: '14px',
                color: 'var(--text-secondary)',
                margin: '0 0 4px',
                paddingLeft: '12px',
                borderLeft: '2px solid var(--border)',
              }}>
                {card.concept}
              </p>
            ))}
            <button
              onClick={() => setBridgeVisible(false)}
              style={{
                marginTop: '12px',
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '13px',
                cursor: 'pointer',
                padding: '0',
                textDecoration: 'underline',
              }}
            >
              Okay, ich erklär's →
            </button>
          </div>
        )}

        {!finalFeedback ? (
          !bridgeVisible && (
            <div style={{ width: '100%', maxWidth: '560px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <textarea
              autoFocus
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Fang an – auch ein Satz reicht …"
              rows={6}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                resize: 'none',
                fontSize: '16px',
                borderRadius: '12px',
                lineHeight: '1.6',
              }}
            />
            {!answer.trim() && (
              <p style={{
                fontSize: '12px',
                color: 'var(--text-secondary)',
                margin: '-4px 0 0',
                fontStyle: 'italic',
              }}>
                Schreib mindestens einen Satz – dann wird der Button aktiv.
              </p>
            )}
            <button
              onClick={handleFinalSubmit}
              disabled={!answer.trim() || finalSending}
              style={{
                width: '100%',
                background: answer.trim() ? 'var(--gold)' : 'var(--bg-card)',
                color: answer.trim() ? '#1a1206' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: '12px',
                padding: '16px',
                fontSize: '17px',
                fontWeight: '700',
                cursor: answer.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              {finalSending ? 'Lumo bewertet …' : 'Abschicken'}
            </button>
          </div>
          )
        ) : (
          <div style={{ width: '100%', maxWidth: '560px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              background: finalFeedback.isGood ? 'var(--green-soft)' : 'var(--red-soft)',
              border: `1px solid ${finalFeedback.isGood ? 'var(--green)' : 'var(--red)'}`,
              borderRadius: '16px',
              padding: '20px 24px',
            }}>
              <p style={{
                fontSize: '17px',
                color: 'var(--text-primary)',
                margin: '0',
                lineHeight: '1.6',
                fontWeight: '500',
              }}>
                {finalFeedback.feedback}
              </p>
            </div>
            <button
              onClick={onDone}
              style={{
                width: '100%',
                background: 'var(--gold)',
                color: '#1a1206',
                border: 'none',
                borderRadius: '12px',
                padding: '16px',
                fontSize: '17px',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              Block abschließen ✓
            </button>
          </div>
        )}
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
      <div className="card-header" style={{
        padding: '14px 24px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-elevated)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexShrink: 0,
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: 'var(--gold)',
          flexShrink: 0,
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="card-header-title" style={{
            fontSize: '11px',
            fontWeight: '600',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            color: 'var(--gold)',
            marginBottom: '2px',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            whiteSpace: 'normal',
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
                  ? subjectColor
                  : 'var(--border)',
                transition: 'all 0.3s ease',
                boxShadow: i === currentIndex ? `0 0 8px ${subjectColor}` : 'none',
              }} />
            ))}
          </div>
        </div>
        {elapsedSeconds > 60 && (
          <span style={{
            fontSize: '11px',
            color: 'var(--text-secondary)',
            marginRight: '8px',
            whiteSpace: 'nowrap',
          }}>
            {Math.floor(elapsedSeconds / 60)} Min
          </span>
        )}
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
        justifyContent: 'flex-start',
        padding: '32px 24px',
        paddingTop: '10vh',
        gap: '24px',
      }}>

        {/* Die Karte */}
        <div style={{
          width: '100%',
          maxWidth: 'min(640px, 100%)',
          background: 'var(--bg-card)',
          borderLeft: `1px solid ${phase === 'answering' || phase === 'feedback' ? 'transparent' : 'rgba(212, 168, 67, 0.25)'}`,
          borderRight: `1px solid ${phase === 'answering' || phase === 'feedback' ? 'transparent' : 'rgba(212, 168, 67, 0.25)'}`,
          borderBottom: `1px solid ${phase === 'answering' || phase === 'feedback' ? 'transparent' : 'rgba(212, 168, 67, 0.25)'}`,
          borderTop: `4px solid ${subjectColor}`,
          borderRadius: '20px',
          padding: 'clamp(20px, 5vw, 36px) clamp(16px, 4vw, 40px)',
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
            color: subjectColor,
            marginBottom: '16px',
          }}>
            {currentCard?.concept || ''}
          </div>

          {/* Pre-test: Vermutung des Nutzers, BEVOR er die Erklärung sieht */}
          {phase === 'reading' && shouldShowPretest() && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{
                fontSize: '11px',
                fontWeight: '700',
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                color: subjectColor,
                margin: '0',
              }}>
                Deine Vermutung
              </p>
              <p style={{
                fontSize: '19px',
                lineHeight: '1.5',
                color: 'var(--text-primary)',
                margin: '0',
                fontWeight: '500',
              }}>
                {currentCard.pretest_question}
              </p>
              <p style={{
                fontSize: '13px',
                color: 'var(--text-secondary)',
                margin: '0',
                fontStyle: 'italic',
              }}>
                Es gibt keine falsche Antwort – rate einfach drauflos.
              </p>
              <textarea
                autoFocus
                value={pretestAnswer}
                onChange={(e) => setPretestAnswer(e.target.value)}
                placeholder="Was glaubst du?"
                rows={3}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  resize: 'none',
                  fontSize: '15px',
                  borderRadius: '12px',
                  lineHeight: '1.5',
                }}
              />
              <button
                onClick={() => setPretestDone(true)}
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
                {pretestAnswer.trim() ? 'Meine Vermutung' : 'Ich habe keine Ahnung – zeig mir die Erklärung'}
              </button>
            </div>
          )}

          {/* Erklärung – verschwindet bei Answering */}
          {((phase === 'reading' && !shouldShowPretest()) || phase === 'loading') && (
            reexplaining ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px 0',
                color: 'var(--text-secondary)',
                fontSize: '15px',
              }}>
                <LumoMascot state="thinking" size="small" />
                Ich denke mir eine andere Erklärung aus …
              </div>
            ) : (
              <>
                {pretestDone && pretestAnswer.trim() && (
                  <div style={{
                    borderLeft: `3px solid ${subjectColor}`,
                    paddingLeft: '12px',
                    margin: '0 0 12px',
                  }}>
                    <p style={{
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                      margin: '0 0 2px',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                    }}>
                      Deine Vermutung
                    </p>
                    <p style={{
                      fontSize: '14px',
                      color: 'var(--text-secondary)',
                      margin: '0',
                      fontStyle: 'italic',
                      lineHeight: '1.5',
                    }}>
                      {pretestAnswer}
                    </p>
                  </div>
                )}
                <p style={{
                  fontSize: '19px',
                  lineHeight: '1.65',
                  color: 'var(--text-primary)',
                  margin: '0 0 8px',
                  fontWeight: '400',
                }}>
                  <HighlightedText
                    text={alternativeExplanation || currentCard?.explanation || ''}
                    color={subjectColor}
                    onTermClick={phase === 'reading' ? handleTermClick : undefined}
                  />
                </p>
              </>
            )
          )}

          {phase === 'reading' && !shouldShowPretest() && activeTerm && (
            <div style={{
              background: `${subjectColor}11`,
              border: `1px solid ${subjectColor}44`,
              borderRadius: '10px',
              padding: '12px 16px',
              marginBottom: '16px',
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start',
            }}>
              <LumoMascot state={termLoading ? 'thinking' : 'learning'} size="small" />
              <div style={{ flex: 1 }}>
                <p style={{
                  fontSize: '12px',
                  fontWeight: '700',
                  color: subjectColor,
                  margin: '0 0 4px',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}>
                  {activeTerm}
                </p>
                <p style={{
                  fontSize: '14px',
                  color: 'var(--text-primary)',
                  margin: '0',
                  lineHeight: '1.5',
                }}>
                  {termLoading ? 'Lumo erklärt …' : termExplanation}
                </p>
              </div>
              <button
                onClick={() => { setActiveTerm(null); setTermExplanation(''); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '16px',
                  padding: '0',
                  flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>
          )}

          {phase === 'reading' && !shouldShowPretest() && (
            <div style={{ width: '100%', marginBottom: '16px' }}>
              <button
                onClick={() => setNoteOpen(!noteOpen)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: noteText ? 'var(--gold)' : 'var(--text-secondary)',
                  fontSize: '13px',
                  cursor: 'pointer',
                  padding: '4px 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>{noteOpen ? '▾' : '▸'}</span>
                {noteText ? 'Notiz bearbeiten' : '+ Notiz zu dieser Karte'}
              </button>
              {noteOpen && (
                <textarea
                  value={noteText}
                  onChange={(e) => {
                    setNoteText(e.target.value);
                    saveNote(e.target.value);
                  }}
                  placeholder="Schreib dir etwas auf …"
                  rows={3}
                  style={{
                    width: '100%',
                    marginTop: '6px',
                    fontSize: '14px',
                    borderRadius: '8px',
                    resize: 'none',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                  }}
                />
              )}
            </div>
          )}

          {phase === 'reading' && !shouldShowPretest() && (
            <CardVisual
              visual_type={currentCard?.visual_type}
              visual_data={currentCard?.visual_data}
              subjectColor={subjectColor}
            />
          )}

          {/* Klick-Check statt direktem Antworten-Button */}
          {phase === 'reading' && !shouldShowPretest() && (
            <>
              <div style={{
                height: '1px',
                background: 'var(--border)',
                margin: '0 0 20px',
              }} />
              {currentIndex === 0 && currentCard?.concept === 'Überblick' ? (
                <button
                  onClick={() => {
                    setAnimating(true);
                    setTimeout(() => {
                      setCurrentIndex(1);
                      setPhase('reading');
                      setAnswer('');
                      setFeedback(null);
                      setClickedCheck(false);
                      setAlternativeExplanation('');
                      setActiveTerm(null);
                      setTermExplanation('');
                      setNoteOpen(false);
                      setNoteText('');
                      setPretestAnswer('');
                      setPretestDone(false);
                      setWhyAnswer('');
                      setWhyMode(false);
                      setWhyFeedback('');
                      setShowYoutube(false);
                      setAnimating(false);
                    }, 300);
                  }}
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
                    marginTop: '8px',
                  }}
                >
                  Verstanden, weiter →
                </button>
              ) : !clickedCheck ? (
                <button
                  onClick={() => setClickedCheck(true)}
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
                    marginTop: '8px',
                  }}
                >
                  Hat es klick gemacht? ✓
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                  <p style={{
                    fontSize: '14px',
                    color: 'var(--text-secondary)',
                    textAlign: 'center',
                    margin: '0 0 4px',
                  }}>
                    {currentCard?.question || 'Was hast du gerade verstanden?'}
                  </p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={handleReadingDone}
                      style={{
                        flex: 1,
                        background: 'var(--gold)',
                        color: '#1a1206',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '13px',
                        fontSize: '15px',
                        fontWeight: '700',
                        cursor: 'pointer',
                      }}
                    >
                      Ja, verstanden
                    </button>
                    <button
                      onClick={async () => {
                        setClickedCheck(false);
                        setReexplaining(true);
                        try {
                          const result = await lumoApi.reexplain({
                            concept: currentCard.concept,
                            originalExplanation: currentCard.explanation,
                            blockTitle: block.title,
                          });
                          setAlternativeExplanation(result.reply);
                        } catch {
                          // Fallback: einfach zurück zur Originalerklärung
                        } finally {
                          setReexplaining(false);
                        }
                      }}
                      disabled={reexplaining}
                      style={{
                        flex: 1,
                        background: 'var(--bg-card-bright)',
                        color: reexplaining ? 'var(--text-secondary)' : 'var(--text-primary)',
                        border: '1px solid var(--border)',
                        borderRadius: '12px',
                        padding: '13px',
                        fontSize: '15px',
                        fontWeight: '600',
                        cursor: reexplaining ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {reexplaining ? 'Lumo denkt …' : 'Nein, nochmal'}
                    </button>
                  </div>
                </div>
              )}

              {alternativeExplanation && !showYoutube && !clickedCheck && (
                <button
                  onClick={() => setShowYoutube(true)}
                  style={{
                    width: '100%',
                    background: 'none',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    padding: '12px',
                    fontSize: '14px',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    marginTop: '10px',
                  }}
                >
                  <span>▶</span> Video-Erklärung auf YouTube suchen
                </button>
              )}

              {showYoutube && (
                <div style={{ marginTop: '10px' }}>
                  <YoutubePanel
                    concept={currentCard?.concept || ''}
                    blockTitle={block.title}
                    onClose={() => setShowYoutube(false)}
                    subjectColor={subjectColor}
                  />
                </div>
              )}
            </>
          )}

          {/* Antwort-Phase – Erklärung weg */}
          {phase === 'answering' && (
            <>
              <p style={{
                fontSize: '22px',
                color: 'var(--gold)',
                fontWeight: '700',
                margin: '0 0 16px',
                lineHeight: '1.4',
              }}>
                {currentCard?.question || 'Was hast du daraus mitgenommen?'}
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
                placeholder="Fang einfach an – auch ein Satz reicht …"
                rows={4}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
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

              {hint && (
                <div style={{
                  background: 'rgba(212, 168, 67, 0.08)',
                  border: '1px solid rgba(212, 168, 67, 0.3)',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  fontSize: '14px',
                  color: 'var(--text-secondary)',
                  lineHeight: '1.5',
                  marginBottom: '12px',
                }}>
                  💡 {hint}
                </div>
              )}

              {!hint && (
                <button
                  onClick={handleNoIdea}
                  disabled={hintLoading}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    fontSize: '13px',
                    cursor: 'pointer',
                    padding: '4px',
                    marginBottom: '12px',
                    textDecoration: 'underline',
                    alignSelf: 'flex-start',
                  }}
                >
                  {hintLoading ? 'Lumo denkt …' : 'Keine Ahnung – zeig mir einen Hinweis'}
                </button>
              )}

              <button
                onClick={handleAnswerSubmit}
                disabled={!answer.trim() || sending}
                style={{
                  width: '100%',
                  background: answer.trim() ? 'var(--gold)' : 'var(--bg-card-bright)',
                  color: answer.trim() ? '#1a1206' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '14px',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: answer.trim() && !sending ? 'pointer' : 'not-allowed',
                  transition: 'all 0.15s ease',
                }}
              >
                {sending ? 'Lumo denkt …' : 'Abschicken'}
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
                  color: isGoodAnswer ? 'var(--green)' : 'var(--red)',
                  margin: '0',
                  lineHeight: '1.5',
                  fontWeight: '500',
                }}>
                  {feedback}
                </p>
              </div>

              {isGoodAnswer && currentCard?.why_question && !whyMode && !whyFeedback && (
                <div style={{
                  background: `${subjectColor}11`,
                  border: `1px solid ${subjectColor}33`,
                  borderRadius: '10px',
                  padding: '12px 16px',
                  marginBottom: '8px',
                }}>
                  <p style={{ fontSize: '11px', color: subjectColor, fontWeight: '600', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Tiefer denken
                  </p>
                  <p style={{ fontSize: '14px', color: 'var(--text-primary)', margin: '0 0 10px', lineHeight: '1.5' }}>
                    {currentCard.why_question}
                  </p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setWhyMode(true)}
                      style={{
                        flex: 1,
                        background: subjectColor,
                        color: '#1a1206',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '9px',
                        fontSize: '13px',
                        fontWeight: '700',
                        cursor: 'pointer',
                      }}
                    >
                      Nachdenken
                    </button>
                    <button
                      onClick={handleNext}
                      style={{
                        background: 'none',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        padding: '9px 14px',
                        fontSize: '13px',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                      }}
                    >
                      Überspringen
                    </button>
                  </div>
                </div>
              )}

              {whyMode && !whyFeedback && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '8px' }}>
                  <p style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: '600', margin: '0' }}>
                    {currentCard.why_question}
                  </p>
                  <textarea
                    autoFocus
                    value={whyAnswer}
                    onChange={(e) => setWhyAnswer(e.target.value)}
                    placeholder="Dein Gedanke dazu …"
                    rows={3}
                    style={{ width: '100%', fontSize: '14px', borderRadius: '10px', resize: 'none' }}
                  />
                  <button
                    onClick={async () => {
                      if (!whyAnswer.trim() || whySending) return;
                      setWhySending(true);
                      try {
                        const result = await lumoApi.evaluateCardAnswer({
                          concept: currentCard.concept,
                          explanation: currentCard.why_question,
                          question: currentCard.why_question,
                          userAnswer: whyAnswer,
                        });
                        setWhyFeedback(result.feedback);
                      } catch {
                        setWhyFeedback('Interessanter Gedanke. Weiter.');
                      } finally {
                        setWhySending(false);
                      }
                    }}
                    disabled={!whyAnswer.trim() || whySending}
                    style={{
                      background: whyAnswer.trim() ? subjectColor : 'var(--bg-card)',
                      color: whyAnswer.trim() ? '#1a1206' : 'var(--text-secondary)',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '12px',
                      fontSize: '14px',
                      fontWeight: '700',
                      cursor: whyAnswer.trim() ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {whySending ? 'Lumo liest …' : 'Abschicken'}
                  </button>
                </div>
              )}

              {whyFeedback && (
                <div style={{
                  background: 'var(--bg-elevated)',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  marginBottom: '8px',
                  borderLeft: `3px solid ${subjectColor}`,
                }}>
                  <p style={{ fontSize: '14px', color: 'var(--text-primary)', margin: '0', lineHeight: '1.5' }}>
                    {whyFeedback}
                  </p>
                </div>
              )}

              {isGoodAnswer ? (
                <button onClick={handleNext} style={{
                  width: '100%',
                  background: 'var(--gold)',
                  color: '#1a1206',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '14px',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}>
                  {isLast ? 'Block abschließen' : 'Weiter →'}
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    onClick={() => {
                      setAnswer('');
                      setFeedback(null);
                      setIsGoodAnswer(false);
                      setPhase('answering');
                    }}
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
                    Nochmal versuchen
                  </button>
                  <button
                    onClick={handleNext}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      fontSize: '13px',
                      cursor: 'pointer',
                      padding: '8px',
                      textDecoration: 'underline',
                    }}
                  >
                    Trotzdem weiter
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {currentIndex === 0 && phase === 'reading' && currentCard?.keywords?.length > 0 && (
          <p style={{
            fontSize: '12px',
            color: 'var(--text-secondary)',
            textAlign: 'center',
            fontStyle: 'italic',
            margin: '-8px 0 0',
          }}>
            Tipp: Tippe auf goldene Begriffe für mehr Details.
          </p>
        )}

        {onAskFreely && phase !== 'answering' && phase !== 'feedback' && alternativeExplanation && (
          <button
            className="text-link"
            onClick={onAskFreely}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Ich möchte lieber frei nachfragen
          </button>
        )}
      </div>

      {showBreakSuggestion && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--bg-card)',
          border: '1px solid var(--gold)',
          borderRadius: '16px',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          zIndex: 100,
          maxWidth: '480px',
          width: 'calc(100% - 48px)',
        }}>
          <LumoMascot state="cheer" size="small" />
          <div style={{ flex: 1 }}>
            <p style={{
              fontSize: '15px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              margin: '0 0 2px',
            }}>
              Du lernst schon 20 Minuten.
            </p>
            <p style={{
              fontSize: '13px',
              color: 'var(--text-secondary)',
              margin: '0',
            }}>
              Kurze Pause hilft dem Gedächtnis.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button
              onClick={onExit}
              style={{
                background: 'var(--gold)',
                color: '#1a1206',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 14px',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Pause machen
            </button>
            <button
              onClick={() => setShowBreakSuggestion(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '12px',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              Weitermachen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
