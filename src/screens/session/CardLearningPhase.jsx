import { useEffect, useState, useCallback } from 'react';
import LumoMascot from '../../components/LumoMascot.jsx';
import ErrorBanner from '../../components/ErrorBanner.jsx';
import CardVisual from '../../components/CardVisual.jsx';
import HighlightedText from '../../components/HighlightedText.jsx';
import { lumoApi } from '../../api/lumo.js';
import YoutubePanel from '../../components/YoutubePanel.jsx';
import { getBlockColor } from '../../utils/subjectColors.js';

export default function CardLearningPhase({ block, goalType, mood, learningStyle, elapsedSeconds, onDone, onExit, onAskFreely, onCardsReady, onCardProgress }) {
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
  const [speaking, setSpeaking] = useState(false);
  const [showCardMenu, setShowCardMenu] = useState(false);
  const [rewardMessage, setRewardMessage] = useState('');
  const [showRewardBurst, setShowRewardBurst] = useState(false);

  // ── Spaced Repetition: In-Session Wiederholung ────────────────────────────
  // Evidenz: Cepeda et al. 2006 (Psych. Bulletin) – spaced practice > massed;
  //          Karpicke & Roediger 2008 – Retrieval practice mit Wiederholung
  //          festigt deutlich besser als reines Lesen.
  //
  // Lumo-Ansatz: Keine Anki-artige Kälte, kein "X Karten falsch".
  // Stattdessen: Karten die nicht vollständig sitzen melden sich kurz zurück —
  // wie ein Konzept das noch einmal nachfragt, bevor es sich verabschiedet.
  //
  // Max. 1 In-Session-Wiederholung pro Karte (kein endless loop).
  // Framing: "Noch kurz zurück" — nicht "Fehler".
  const [weakCardQueue, setWeakCardQueue] = useState([]);   // Cards mit isGoodAnswer=false
  const [repeatMode, setRepeatMode] = useState(false);      // true = wir sind in der Wiederholungsrunde
  const [repeatIndex, setRepeatIndex] = useState(0);        // aktueller Index in weakCardQueue
  const [repeatAnswer, setRepeatAnswer] = useState('');
  const [repeatFeedback, setRepeatFeedback] = useState(null);
  const [repeatIsGood, setRepeatIsGood] = useState(false);
  const [repeatSending, setRepeatSending] = useState(false);

  // Micro-Reward Pool – variable-ratio für dopaminerge Verstärkung
  // Mood-adaptiv: Ton passt sich dem emotionalen Zustand an
  //
  // Effort-Praise statt Ability-Praise (Dweck 1998 / Mueller & Dweck 1998):
  // NICHT: "Du bist gut." / "Richtig!" / "Stark." (Ability-Praise → fragiles Selbstbild)
  // SONDERN: Prozess loben – das Durchdenken, das Erarbeiten, das Dranbeleiben
  // Belege: Effort-Praise → mehr Ausdauer, höhere Fehlertoleranz, längerfristige Motivation
  //
  // Kurz halten (≤ 5 Wörter): Kein Satz, der übertrieben wirkt.
  // Spezifisch auf Prozess: "durchgedacht", "erarbeitet", "drangeblieben"
  const REWARD_MESSAGES_BY_MOOD = {
    bad: [
      // Sanft, kein Druck – Mut zur Antwort loben
      'Du hast es probiert.',
      'Gut durchgehalten.',
      'Du hast dich getraut.',
      'Schon mal hingeschaut.',
      'Drangeblieben – das zählt.',
      'Du hast nachgedacht.',
    ],
    okay: [
      // Prozess betonen – das Durcharbeiten, nicht das Ergebnis
      'Gut durchgedacht.',
      'Erarbeitet. Genau so.',
      'Du hast das hergeleitet.',
      'Das war Arbeit – sitzt jetzt.',
      'Drangeblieben. Gut.',
      'Du hast dich durchgekämpft.',
    ],
    good: [
      // Prozess + leichte Energie – aber nie "Du bist brillant"
      'Gut durchgedacht. 🎯',
      'Das hast du dir erarbeitet.',
      'Drangeblieben – und es sitzt.',
      'Du hast das hergeleitet!',
      'Genau so arbeitet man sich durch.',
      'Das war echter Denkaufwand.',
    ],
  };
  const REWARD_MESSAGES = REWARD_MESSAGES_BY_MOOD[mood] || REWARD_MESSAGES_BY_MOOD.okay;

  // Menü schließen bei Klick außerhalb
  useEffect(() => {
    if (!showCardMenu) return;
    function handleClickOutside() { setShowCardMenu(false); }
    document.addEventListener('click', handleClickOutside, { capture: true, once: true });
    return () => document.removeEventListener('click', handleClickOutside, { capture: true });
  }, [showCardMenu]);

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

  // Karten-Fortschritt nach oben melden (für den SessionTimer)
  useEffect(() => {
    if (cards.length > 0) {
      onCardProgress?.(currentIndex, cards.length);
    }
  }, [currentIndex, cards.length]);

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
      if (result.isGood) {
        setRewardMessage(REWARD_MESSAGES[Math.floor(Math.random() * REWARD_MESSAGES.length)]);
        setShowRewardBurst(true);
        setTimeout(() => setShowRewardBurst(false), 600);
      } else {
        // Karte für In-Session-Wiederholung vormerken (max. 1x pro Karte)
        setWeakCardQueue((q) => {
          const alreadyQueued = q.some((c) => c.concept === currentCard.concept);
          return alreadyQueued ? q : [...q, currentCard];
        });
      }
      setPhase('feedback');
    } catch (err) {
      // Fallback auf lokale Bewertung wenn API fehlt
      const words = answer.trim().split(/\s+/).length;
      const isGood = words >= 8;
      setFeedback(isGood
        ? 'Das klingt richtig.'
        : 'Beschreib es etwas ausführlicher.'
      );
      setIsGoodAnswer(isGood);
      if (isGood) {
        setRewardMessage(REWARD_MESSAGES[Math.floor(Math.random() * REWARD_MESSAGES.length)]);
        setShowRewardBurst(true);
        setTimeout(() => setShowRewardBurst(false), 600);
      } else {
        setWeakCardQueue((q) => {
          const alreadyQueued = q.some((c) => c.concept === currentCard.concept);
          return alreadyQueued ? q : [...q, currentCard];
        });
      }
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

  function handleSpeak(text) {
    if (!window.speechSynthesis) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'de-DE';
    utterance.rate = 0.9;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }

  // Gemeinsames Reset der Karten-State-Felder nach jeder Karte
  function resetCardState() {
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

  function handleNext() {
    setAnimating(true);
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    setTimeout(() => {
      if (isLast) {
        // Wenn es schwache Karten gibt → Übergangsscreen zur Wiederholung
        // (weakCardQueue wird über setState gesetzt, daher über funktionales Update prüfen)
        setWeakCardQueue((currentQueue) => {
          if (currentQueue.length > 0) {
            setRepeatMode(true);
            setRepeatIndex(0);
            setRepeatAnswer('');
            setRepeatFeedback(null);
            setRepeatIsGood(false);
            setPhase('repeat-bridge');
          } else {
            setPhase('final-recall');
          }
          return currentQueue;
        });
        resetCardState();
      } else {
        setCurrentIndex((i) => i + 1);
        setPhase('reading');
        resetCardState();
      }
    }, 300);
  }

  // ── Wiederholungs-Handlers ──────────────────────────────────────────────

  async function handleRepeatSubmit() {
    if (!repeatAnswer.trim() || repeatSending) return;
    const repeatCard = weakCardQueue[repeatIndex];
    setRepeatSending(true);
    try {
      const result = await lumoApi.evaluateCardAnswer({
        concept: repeatCard.concept,
        explanation: repeatCard.explanation,
        question: repeatCard.question,
        userAnswer: repeatAnswer,
      });
      setRepeatFeedback(result.feedback);
      setRepeatIsGood(result.isGood);
    } catch {
      const words = repeatAnswer.trim().split(/\s+/).length;
      const isGood = words >= 8;
      setRepeatFeedback(isGood ? 'Das klingt richtig.' : 'Beschreib es etwas ausführlicher.');
      setRepeatIsGood(isGood);
    } finally {
      setRepeatSending(false);
    }
  }

  function handleRepeatNext() {
    const isRepeatLast = repeatIndex >= weakCardQueue.length - 1;
    if (isRepeatLast) {
      // Wiederholung abgeschlossen → final-recall
      setRepeatMode(false);
      setPhase('final-recall');
    } else {
      setRepeatIndex((i) => i + 1);
      setRepeatAnswer('');
      setRepeatFeedback(null);
      setRepeatIsGood(false);
    }
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
      setFinalFeedback({ isGood: true, feedback: 'Du hast dich durch den ganzen Block gearbeitet.' });
    } finally {
      setFinalSending(false);
    }
  }

  if (error) {
    return (
      <div className="screen">
        <div className="screen-content">
          <LumoMascot state="idle" />
          <ErrorBanner message={error} onRetry={() => window.location.reload()} onExit={onExit} />
        </div>
      </div>
    );
  }

  if (phase === 'loading') {
    return (
      <div className="screen">
        <div className="screen-content">
          <LumoMascot state="thinking" />
          <p style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>
            Ich bereite deinen Block vor …
          </p>
        </div>
      </div>
    );
  }

  // ── Spaced Repetition: Übergangsscreen ──────────────────────────────────
  // Zeigt sich nach dem letzten Hauptkarten-Durchlauf, wenn schwache Karten
  // vorhanden sind. Kein Fokus auf Fehler — Fokus auf "nochmal kurz hinschauen".
  if (phase === 'repeat-bridge') {
    const count = weakCardQueue.length;
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        background: 'var(--bg)',
        gap: '28px',
      }}>
        <LumoMascot state="idle" />
        <div style={{ textAlign: 'center', maxWidth: '480px' }}>
          <h2 style={{
            fontFamily: "'Instrument Serif', Georgia, serif",
            fontStyle: 'italic',
            fontWeight: 400,
            fontSize: '26px',
            letterSpacing: '-0.01em',
            lineHeight: 1.25,
            marginBottom: '12px',
          }}>
            {count === 1
              ? 'Ein Konzept möchte kurz nochmal.'
              : `${count} Konzepte melden sich nochmal.`}
          </h2>
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '15px',
            lineHeight: 1.6,
          }}>
            Kurz hinschauen — dann bist du wirklich durch.
          </p>
        </div>
        <button
          onClick={() => {
            setRepeatIndex(0);
            setRepeatAnswer('');
            setRepeatFeedback(null);
            setRepeatIsGood(false);
            setPhase('repeat-card');
          }}
          style={{
            background: 'var(--gold)',
            color: '#1a1206',
            border: 'none',
            borderRadius: '14px',
            padding: '16px 32px',
            fontSize: '16px',
            fontWeight: '700',
            cursor: 'pointer',
            width: '100%',
            maxWidth: '320px',
          }}
        >
          Okay, kurz nochmal →
        </button>
        <button
          onClick={() => {
            setRepeatMode(false);
            setPhase('final-recall');
          }}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            fontSize: '14px',
            cursor: 'pointer',
            padding: '4px',
          }}
        >
          Lieber überspringen
        </button>
      </div>
    );
  }

  // ── Spaced Repetition: Wiederholungs-Karten-Screen ───────────────────────
  // Zeigt schwache Karten nochmal — nur Frage + Eingabe, kein Reading.
  // Kein sichtbarer Zähler "Karte X von Y falsch" — nur sanfte Fortschrittsanzeige.
  if (phase === 'repeat-card' && repeatMode && weakCardQueue.length > 0) {
    const repeatCard = weakCardQueue[repeatIndex];
    const repeatProgress = (repeatIndex + 1) / weakCardQueue.length;

    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg)',
      }}>
        {/* Mini-Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px 0',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              fontSize: '11px',
              fontWeight: '700',
              letterSpacing: '1.2px',
              textTransform: 'uppercase',
              color: 'var(--gold)',
            }}>
              Kurze Wiederholung
            </div>
          </div>
          {/* Fortschrittsbalken — kein Zähler */}
          <div style={{
            height: '3px',
            borderRadius: '2px',
            background: 'var(--bg-elevated)',
            width: '80px',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              borderRadius: '2px',
              background: `var(--gold)`,
              width: `${repeatProgress * 100}%`,
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>

        {/* Karten-Inhalt */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 20px 32px',
          gap: '20px',
          maxWidth: '600px',
          width: '100%',
          margin: '0 auto',
        }}>
          {/* Frage */}
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: '16px',
            padding: '20px 20px',
            border: '1px solid var(--border)',
          }}>
            <p style={{
              fontSize: '11px',
              fontWeight: '700',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              color: `${subjectColor}`,
              margin: '0 0 10px',
            }}>
              {repeatCard.concept}
            </p>
            <p style={{
              fontSize: '16px',
              lineHeight: 1.55,
              color: 'var(--text-primary)',
              margin: 0,
              fontWeight: '500',
            }}>
              {repeatCard.question}
            </p>
          </div>

          {/* Feedback nach Antwort */}
          {repeatFeedback && (
            <div style={{
              background: repeatIsGood ? 'var(--green-soft)' : 'rgba(212,168,67,0.08)',
              border: `1px solid ${repeatIsGood ? 'var(--green)' : 'rgba(212,168,67,0.3)'}`,
              borderRadius: '14px',
              padding: '16px 20px',
            }}>
              <p style={{
                fontSize: '15px',
                color: 'var(--text-primary)',
                margin: 0,
                lineHeight: 1.55,
              }}>
                {repeatFeedback}
              </p>
            </div>
          )}

          {/* Eingabe oder Weiter-Button */}
          {!repeatFeedback ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <textarea
                value={repeatAnswer}
                onChange={(e) => setRepeatAnswer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && repeatAnswer.trim()) {
                    handleRepeatSubmit();
                  }
                }}
                placeholder="Deine Antwort …"
                rows={3}
                autoFocus
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  resize: 'none',
                  fontSize: '16px',
                  borderRadius: '12px',
                  lineHeight: '1.6',
                  background: 'var(--bg-card)',
                  border: '1.5px solid var(--input-border)',
                  color: 'var(--text-primary)',
                  padding: '14px 16px',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
              <button
                onClick={handleRepeatSubmit}
                disabled={!repeatAnswer.trim() || repeatSending}
                style={{
                  width: '100%',
                  background: repeatAnswer.trim() ? 'var(--gold)' : 'transparent',
                  color: repeatAnswer.trim() ? '#1a1206' : 'var(--text-secondary)',
                  border: repeatAnswer.trim() ? 'none' : '1.5px dashed rgba(255,255,255,0.15)',
                  borderRadius: '12px',
                  padding: '15px',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: repeatAnswer.trim() && !repeatSending ? 'pointer' : 'default',
                  transition: 'all 0.2s ease',
                }}
              >
                {repeatSending ? 'Lumo prüft …' : 'Antworten'}
              </button>
            </div>
          ) : (
            <button
              onClick={handleRepeatNext}
              style={{
                width: '100%',
                background: 'var(--gold)',
                color: '#1a1206',
                border: 'none',
                borderRadius: '12px',
                padding: '15px',
                fontSize: '16px',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              {repeatIndex >= weakCardQueue.length - 1
                ? 'Fertig ✓'
                : 'Weiter →'}
            </button>
          )}
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
                background: answer.trim() ? 'var(--gold)' : 'transparent',
                color: answer.trim() ? '#1a1206' : 'var(--text-secondary)',
                border: answer.trim() ? 'none' : '1.5px dashed rgba(255,255,255,0.15)',
                borderRadius: '12px',
                padding: '16px',
                fontSize: '17px',
                fontWeight: '700',
                cursor: answer.trim() && !finalSending ? 'pointer' : 'default',
                transition: 'all 0.2s ease',
                opacity: finalSending ? 0.7 : 1,
              }}
            >
              {finalSending ? 'Lumo bewertet …' : 'Abschicken'}
            </button>
          </div>
          )
        ) : (
          <div style={{ width: '100%', maxWidth: '560px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              background: finalFeedback.isGood ? 'var(--green-soft)' : 'rgba(212,168,67,0.08)',
              border: `1px solid ${finalFeedback.isGood ? 'var(--green)' : 'rgba(212,168,67,0.3)'}`,
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
                  : 'rgba(255,255,255,0.22)',
                transition: 'all 0.3s ease',
                boxShadow: i === currentIndex ? `0 0 8px ${subjectColor}` : 'none',
              }} />
            ))}
          </div>
        </div>
        {/* Milestone-Bestätigung – gibt Orientierung ohne Druck */}
        {(() => {
          if (cards.length < 3) return null;
          const ratio = currentIndex / (cards.length - 1);
          if (ratio >= 0.45 && ratio <= 0.6) return (
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', opacity: 0.7 }}>
              Halbzeit ✓
            </span>
          );
          if (ratio > 0.8) return (
            <span style={{ fontSize: '11px', color: 'var(--gold)', whiteSpace: 'nowrap', opacity: 0.85, fontWeight: '600' }}>
              Fast fertig
            </span>
          );
          return null;
        })()}
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
        padding: '32px 28px',
        paddingTop: '8vh',
        gap: '24px',
      }}>

        {/* Die Karte — kein Box-Container, Text atmet frei */}
        <div style={{
          width: '100%',
          maxWidth: 'min(640px, 100%)',
          padding: '0 4px',
          transition: 'all 0.3s ease',
          opacity: animating ? 0 : 1,
          transform: animating ? 'translateY(8px)' : 'translateY(0)',
          position: 'relative',
        }}>

          {phase === 'reading' && !shouldShowPretest() && (
            <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
              <button
                onClick={() => setShowCardMenu((v) => !v)}
                aria-label="Mehr Optionen"
                style={{
                  background: showCardMenu ? 'var(--bg-elevated)' : 'none',
                  border: showCardMenu ? '1px solid var(--border)' : 'none',
                  borderRadius: '8px',
                  color: 'var(--text-secondary)',
                  fontSize: '18px',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  lineHeight: 1,
                  letterSpacing: '2px',
                }}
              >
                ···
              </button>
              {showCardMenu && (
                <div style={{
                  position: 'absolute',
                  top: '36px',
                  right: '0',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  minWidth: '160px',
                  zIndex: 10,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                }}>
                  {typeof window !== 'undefined' && window.speechSynthesis && (
                    <button
                      onClick={() => {
                        handleSpeak(alternativeExplanation || currentCard?.explanation || '');
                        setShowCardMenu(false);
                      }}
                      style={{
                        background: speaking ? 'rgba(212,168,67,0.1)' : 'none',
                        border: 'none',
                        borderRadius: '8px',
                        color: speaking ? 'var(--gold)' : 'var(--text-primary)',
                        fontSize: '14px',
                        cursor: 'pointer',
                        padding: '10px 14px',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                      }}
                    >
                      <span>{speaking ? '⏹' : '🔊'}</span>
                      {speaking ? 'Stoppen' : 'Vorlesen'}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setNoteOpen((v) => !v);
                      setShowCardMenu(false);
                    }}
                    style={{
                      background: noteText ? 'rgba(212,168,67,0.1)' : 'none',
                      border: 'none',
                      borderRadius: '8px',
                      color: noteText ? 'var(--gold)' : 'var(--text-primary)',
                      fontSize: '14px',
                      cursor: 'pointer',
                      padding: '10px 14px',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
                    <span>📝</span>
                    {noteText ? 'Notiz bearbeiten' : 'Notiz hinzufügen'}
                  </button>
                  <button
                    onClick={() => {
                      setShowYoutube(true);
                      setShowCardMenu(false);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      cursor: 'pointer',
                      padding: '10px 14px',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
                    <span>▶</span>
                    Video-Erklärung
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Konzept-Label */}
          <div style={{
            fontSize: '11px',
            fontWeight: '600',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: subjectColor,
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span style={{
              display: 'inline-block',
              width: '6px', height: '6px',
              borderRadius: '50%',
              background: subjectColor,
              flexShrink: 0,
            }} />
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
                  fontSize: 'clamp(20px, 5.5vw, 26px)',
                  lineHeight: '1.55',
                  color: 'var(--text-primary)',
                  margin: '0 0 8px',
                  fontWeight: '400',
                  letterSpacing: '-0.01em',
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

          {phase === 'reading' && !shouldShowPretest() && noteOpen && (
            <div style={{ width: '100%', marginBottom: '16px' }}>
              <textarea
                value={noteText}
                onChange={(e) => {
                  setNoteText(e.target.value);
                  saveNote(e.target.value);
                }}
                placeholder="Schreib dir etwas auf …"
                rows={3}
                autoFocus
                style={{
                  width: '100%',
                  fontSize: '14px',
                  borderRadius: '8px',
                  resize: 'none',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  boxSizing: 'border-box',
                }}
              />
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
                    window.speechSynthesis?.cancel();
                    setSpeaking(false);
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
                        background: 'transparent',
                        color: reexplaining ? 'var(--text-secondary)' : 'var(--text-primary)',
                        border: '1.5px solid rgba(255,255,255,0.2)',
                        borderRadius: '12px',
                        padding: '13px',
                        fontSize: '15px',
                        fontWeight: '600',
                        cursor: reexplaining ? 'not-allowed' : 'pointer',
                        opacity: reexplaining ? 0.5 : 1,
                      }}
                    >
                      {reexplaining ? 'Lumo denkt …' : 'Nein, nochmal'}
                    </button>
                  </div>
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
                {mood === 'bad'
                  ? 'Kein Druck – schreib einfach was du weißt.'
                  : mood === 'okay'
                  ? 'Schreib was dir einfällt – auch ein Satz reicht.'
                  : 'Lumo hört zu. Kein Zurückschauen.'}
              </p>
              <textarea
                autoFocus
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder={mood === 'bad' ? 'Schreib einfach was du weißt …' : 'Fang einfach an – auch ein Satz reicht …'}
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
                    background: 'rgba(212, 168, 67, 0.06)',
                    border: '1px solid rgba(212, 168, 67, 0.2)',
                    borderRadius: '8px',
                    color: 'var(--gold)',
                    fontSize: '13px',
                    cursor: hintLoading ? 'default' : 'pointer',
                    padding: '8px 14px',
                    marginBottom: '12px',
                    alignSelf: 'flex-start',
                    opacity: hintLoading ? 0.6 : 0.85,
                    transition: 'opacity 0.15s ease',
                  }}
                >
                  {hintLoading ? 'Lumo denkt …' : '💡 Ich brauche einen Hinweis'}
                </button>
              )}

              <button
                onClick={handleAnswerSubmit}
                disabled={!answer.trim() || sending}
                style={{
                  width: '100%',
                  background: answer.trim() ? 'var(--gold)' : 'transparent',
                  color: answer.trim() ? '#1a1206' : 'var(--text-secondary)',
                  border: answer.trim() ? 'none' : '1.5px dashed rgba(255,255,255,0.15)',
                  borderRadius: '12px',
                  padding: '14px',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: answer.trim() && !sending ? 'pointer' : 'default',
                  transition: 'all 0.2s ease',
                  opacity: sending ? 0.7 : 1,
                }}
              >
                {sending ? 'Lumo denkt …' : 'Abschicken'}
              </button>
            </>
          )}

          {/* Feedback-Phase */}
          {phase === 'feedback' && (
            <>
              {/* ── Status-Banner: Richtig / Nochmal ──────────────────────────
                  Explizites Signal ganz oben — ADHS-Nutzer brauchen klares,
                  unverwechselbares Feedback ohne Suchen.
                  ADHS-safe: kein Rot — Amber statt Rot bei falscher Antwort. */}
              <div style={{
                width: '100%',
                borderRadius: '14px',
                padding: '14px 18px',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: isGoodAnswer
                  ? 'rgba(61, 158, 110, 0.12)'
                  : 'rgba(196, 122, 43, 0.10)',
                border: isGoodAnswer
                  ? '1.5px solid rgba(61, 158, 110, 0.5)'
                  : '1.5px solid rgba(196, 122, 43, 0.45)',
                animation: 'fadeIn 0.25s ease',
                transform: showRewardBurst && isGoodAnswer ? 'scale(1.02)' : 'scale(1)',
                transition: 'transform 0.25s ease',
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: isGoodAnswer
                    ? 'rgba(61, 158, 110, 0.2)'
                    : 'rgba(196, 122, 43, 0.15)',
                  border: isGoodAnswer
                    ? '2px solid var(--green)'
                    : '2px solid var(--amber)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  flexShrink: 0,
                }}>
                  {isGoodAnswer ? '✓' : '↺'}
                </div>
                <div>
                  <p style={{
                    fontSize: '16px',
                    fontWeight: '700',
                    color: isGoodAnswer ? 'var(--green)' : 'var(--amber, #C47A2B)',
                    margin: '0 0 1px',
                  }}>
                    {isGoodAnswer ? (rewardMessage || 'Richtig!') : 'Noch nicht ganz'}
                  </p>
                  <p style={{
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    margin: '0',
                    opacity: 0.8,
                  }}>
                    {isGoodAnswer ? 'Schau dir die Musterantwort an' : 'Vergleiche mit der Musterantwort'}
                  </p>
                </div>
              </div>

              <div style={{
                background: 'var(--bg-elevated)',
                borderRadius: '12px',
                padding: '16px 18px',
                marginBottom: '16px',
                borderLeft: isGoodAnswer ? '3px solid var(--green)' : '3px solid var(--gold)',
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
                background: isGoodAnswer ? 'rgba(61, 158, 110, 0.06)' : 'rgba(212, 168, 67, 0.08)',
                borderRadius: '12px',
                padding: '16px 18px',
                marginBottom: '20px',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
              }}>
                <LumoMascot state={isGoodAnswer ? 'cheer' : (mood === 'bad' ? 'idle' : 'learning')} size="small" />
                <p style={{
                  fontSize: '16px',
                  color: isGoodAnswer ? 'var(--green)' : 'var(--text-primary)',
                  margin: '0',
                  lineHeight: '1.5',
                  fontWeight: '500',
                }}>
                  {feedback}
                </p>
              </div>

              {/* Gap 4 – "Warum war das falsch? Lumo erklärt es nochmal."
                  Konkurrenz-Lücke: Kein Tool erklärt beim falschen Antworten aktiv den Grund.
                  Anki/Quizlet: zeigt nur Musterantwort. Kein "warum"-Kontext.
                  Evidenz: Feedback-Elaboration (Butler & Winne 1995) zeigt, dass elaboriertes
                  Feedback (mit Erklärung des Fehlers) > korrigierendes Feedback (nur richtige Antwort).
                  Fix: Bei falschem Antworten eine "Lumo erklärt den Grund" Sektion einfügen.
                  Das feedback-Feld IST schon die Erklärung — aber begraben unter dem Mascot.
                  Wir machen es zu einem expliziten, betitelten Lernmoment. */}
              {!isGoodAnswer && feedback && (
                <div style={{
                  background: 'rgba(196,122,43,0.06)',
                  border: '1px solid rgba(196,122,43,0.2)',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  marginBottom: '8px',
                }}>
                  <p style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    letterSpacing: '1.2px',
                    textTransform: 'uppercase',
                    color: 'var(--amber, #C47A2B)',
                    margin: '0 0 8px',
                  }}>
                    Das hätte ich wissen müssen
                  </p>
                  <p style={{
                    fontSize: '14px',
                    color: 'var(--text-primary)',
                    margin: '0',
                    lineHeight: '1.6',
                  }}>
                    {feedback}
                  </p>
                </div>
              )}

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
                    {mood === 'bad' ? 'Nochmal – ich versuch\'s' : 'Nochmal versuchen'}
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
                    {mood === 'bad' ? 'Weiter – ist okay' : 'Trotzdem weiter'}
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

        {onAskFreely && (phase === 'reading' || phase === 'final-recall') && (
          <button
            className="text-link"
            onClick={onAskFreely}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Ich möchte lieber frei nachfragen
          </button>
        )}

        {phase === 'reading' && showYoutube && (
          <div style={{ width: '100%', maxWidth: 'min(640px, 100%)' }}>
            <YoutubePanel
              concept={currentCard?.concept || ''}
              blockTitle={block.title}
              onClose={() => setShowYoutube(false)}
              subjectColor={subjectColor}
            />
          </div>
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
