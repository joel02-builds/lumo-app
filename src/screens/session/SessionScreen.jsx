import { useCallback, useEffect, useState } from 'react';
import FocusRitualPhase from './FocusRitualPhase.jsx';
import CardLearningPhase from './CardLearningPhase.jsx';
import DepthChoicePhase from './DepthChoicePhase.jsx';
import ExplainChatPhase from './ExplainChatPhase.jsx';
import CheckUnderstandingPhase from './CheckUnderstandingPhase.jsx';
import BlockCompletePhase from './BlockCompletePhase.jsx';
import LernzettelScreen from './LernzettelScreen.jsx';
import ConceptMapScreen from './ConceptMapScreen.jsx';
import SessionSummaryScreen from './SessionSummaryScreen.jsx';
import MidSessionBreakScreen from './MidSessionBreakScreen.jsx';
import ElaborationPhase from './ElaborationPhase.jsx';
import SessionTimer from '../../components/SessionTimer.jsx';
import BreakSuggestionToast from '../../components/BreakSuggestionToast.jsx';
import { getBlockColor } from '../../utils/subjectColors.js';

const PHASES = {
  FOCUS_RITUAL: 'focus-ritual',
  ELABORATION: 'elaboration',  // Vorwissen-Aktivierung vor dem Lernen
  CARDS: 'cards',
  DEPTH_CHOICE: 'depth-choice',
  EXPLAIN: 'explain',
  CHECK: 'check',
  COMPLETE: 'complete',
  LERNZETTEL: 'lernzettel',
  CONCEPT_MAP: 'concept-map',
  SESSION_SUMMARY: 'session-summary',
};

// Standard-Pausenintervall (Evidenz: Dinges et al. 1987, Sweller 1988)
const DEFAULT_BREAK_INTERVAL_SECONDS = 20 * 60;
const MIN_BREAK_INTERVAL_SECONDS = 15 * 60; // bei sehr langen Blöcken kürzer
const MAX_BREAK_INTERVAL_SECONDS = 25 * 60; // bei kurzen Blöcken länger

/**
 * Adaptiver Break-Intervall basierend auf Block-Länge.
 *
 * Evidenz:
 * ─────────────────────────────────────────────────────────────────────────
 * Cognitive Load Theory (Sweller, 1988): Kognitive Überlastung entsteht
 *   schneller bei dichtem, komplexem Material. Break-Frequenz sollte
 *   an Materialdichte angepasst werden.
 *
 * Optimal rest timing (Dinges et al., 1987): Pausen nach 15–25 Minuten
 *   konsolidieren Gedächtnis effektiver als feste 20-Min-Intervalle.
 *
 * Adaptive Logik:
 * – Langer Block (>30 min): 15 Min Intervall (höhere kognitive Last)
 * – Kurzer Block (<10 min): 25 Min Intervall (weniger Dichte, User noch nicht müde)
 * – Mittel: 20 Min Standard
 *
 * ADHS-spezifisch:
 * – Fixe Timer wirken willkürlich und werden ignoriert
 * – Kontextbasierte Empfehlungen werden als relevanter wahrgenommen
 */
function getBreakIntervalSeconds(block) {
  const est = block?.estimatedMinutes;
  if (!est || est <= 0) return DEFAULT_BREAK_INTERVAL_SECONDS;
  if (est > 30) return MIN_BREAK_INTERVAL_SECONDS;   // 15 min
  if (est < 10) return MAX_BREAK_INTERVAL_SECONDS;   // 25 min
  // Lineare Interpolation zwischen 25 min (bei 10 min Block) und 15 min (bei 30 min Block):
  // breakMin = 25 - (est - 10) / (30 - 10) * (25 - 15) = 25 - (est-10)/2
  const breakMin = Math.round(25 - ((est - 10) / 2));
  return Math.max(MIN_BREAK_INTERVAL_SECONDS, Math.min(MAX_BREAK_INTERVAL_SECONDS, breakMin * 60));
}

// Owns the full flow for exactly one block. Mount with key={block.id} from
// the parent so a new block always starts with a clean phase state.
export default function SessionScreen({ block, blocks, goalType, sprintMode, learningStyle, onRecordCompletion, onSaveCards, onTrackSubject, onAddFlashcards, onSaveCardResults, onPause, onHeaderVisibilityChange }) {
  const [phase, setPhase] = useState(PHASES.FOCUS_RITUAL);
  const [depth, setDepth] = useState('simple');
  const [result, setResult] = useState(null);
  const [sessionCards, setSessionCards] = useState([]);
  const [sessionStartTime] = useState(() => Date.now());
  const [sessionMood, setSessionMood] = useState(null);
  const [cardProgress, setCardProgress] = useState({ current: 0, total: 0 });

  // Einmal pro Blocksession (dieser Screen wird mit key={block.id} neu
  // gemountet) melden, welches Fach gerade gelernt wird.
  useEffect(() => {
    if (block?.subject) onTrackSubject?.(block.subject);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block?.id]);

  // Adaptiver Break-Intervall — basiert auf Block-Länge statt fixem 20-Min-Timer
  // (Evidenz: Sweller 1988 Cognitive Load Theory, Dinges et al. 1987)
  const breakIntervalSeconds = getBreakIntervalSeconds(block);

  // Pause-Empfehlung nach adaptiven Minuten, als Overlay statt Phasenwechsel
  // (siehe MidSessionBreakScreen), damit Chatverlauf/Antwort erhalten bleiben.
  const [lastPromptThreshold, setLastPromptThreshold] = useState(0);
  const [showMidBreak, setShowMidBreak] = useState(false);

  // Gemeinsamer Timer für Chat- und Abrufphase – zählt nur hoch, solange eine
  // dieser beiden Phasen aktiv ist, der Tab sichtbar ist UND keine Pause läuft.
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerActive =
    (phase === PHASES.CARDS || phase === PHASES.EXPLAIN || phase === PHASES.CHECK) && !showMidBreak;

  useEffect(() => {
    if (!timerActive) return undefined;
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        setElapsedSeconds((s) => s + 1);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [timerActive]);

  // Phasen mit eigenem, kompaktem Header (CardLearningPhase, ExplainChatPhase)
  // sowie CheckUnderstandingPhase kollidieren mit der global fixed positionierten
  // LumoWordmark aus App.jsx – da SessionScreen sie selbst nicht rendert, muss
  // die Sichtbarkeits-Entscheidung an den Elternteil zurückgemeldet werden.
  const hasOwnHeader = phase === PHASES.CARDS || phase === PHASES.EXPLAIN || phase === PHASES.CHECK;
  useEffect(() => {
    onHeaderVisibilityChange?.(hasOwnHeader);
  }, [hasOwnHeader, onHeaderVisibilityChange]);

  const currentThreshold = Math.floor(elapsedSeconds / breakIntervalSeconds);
  const showBreakSuggestion = timerActive && currentThreshold > lastPromptThreshold && phase !== PHASES.CARDS;

  // SessionScreen re-rendert jede Sekunde (Timer). Ohne useCallback bekämen
  // ExplainChatPhase/CheckUnderstandingPhase bei jedem Tick eine NEUE onDone-
  // Referenz – deren eigene useEffect-Timer (z. B. der "Gut. Jetzt du."-Übergang)
  // würden dadurch jede Sekunde abgebrochen und neu gestartet, bevor sie je
  // ablaufen können. Stabile Referenzen sind hier kein Stil, sondern nötig.
  const handleExplainDone = useCallback(() => setPhase(PHASES.CHECK), []);
  const handleCardsDone = useCallback((answerResults) => {
    // Session→FSRS Bridge: Lernergebnisse an App weitergeben, damit FSRS-Karten
    // aktualisiert werden (isGood=true → Rating.Good, false → Rating.Again)
    if (answerResults && Object.keys(answerResults).length > 0) {
      onSaveCardResults?.(answerResults);
    }
    setPhase(PHASES.CHECK);
  }, [onSaveCardResults]);
  const handleCheckDone = useCallback((r) => {
    setResult(r);
    setPhase(PHASES.COMPLETE);
  }, []);

  if (phase === PHASES.FOCUS_RITUAL) {
    return (
      <FocusRitualPhase
        onDone={() => setPhase(PHASES.ELABORATION)}
        block={block}
        allBlocks={blocks}
        onMoodSet={setSessionMood}
        sprintMode={sprintMode}
      />
    );
  }

  if (phase === PHASES.ELABORATION) {
    return (
      <ElaborationPhase
        block={block}
        onDone={() => setPhase(PHASES.CARDS)}
        onSkip={() => setPhase(PHASES.CARDS)}
      />
    );
  }

  if (phase === PHASES.DEPTH_CHOICE) {
    return (
      <DepthChoicePhase
        onChoose={(chosenDepth) => {
          setDepth(chosenDepth);
          setPhase(PHASES.EXPLAIN);
        }}
      />
    );
  }

  if (phase === PHASES.COMPLETE) {
    return (
      <BlockCompletePhase
        block={block}
        result={result}
        cards={sessionCards}
        onAddFlashcards={onAddFlashcards}
        sprintMode={sprintMode}
        allBlocks={blocks}
        onContinue={() => {
          onRecordCompletion(result);
          setPhase(PHASES.LERNZETTEL);
        }}
        onPause={() => {
          onRecordCompletion(result);
          onPause();
        }}
      />
    );
  }

  if (phase === PHASES.LERNZETTEL) {
    return (
      <LernzettelScreen
        block={block}
        cards={sessionCards}
        goalType={goalType}
        subjectColor={getBlockColor(block)}
        onDone={() => setPhase(PHASES.SESSION_SUMMARY)}
        onShowConceptMap={() => setPhase(PHASES.CONCEPT_MAP)}
      />
    );
  }

  if (phase === PHASES.CONCEPT_MAP) {
    return (
      <ConceptMapScreen
        block={block}
        cards={sessionCards}
        onDone={() => setPhase(PHASES.SESSION_SUMMARY)}
      />
    );
  }

  if (phase === PHASES.SESSION_SUMMARY) {
    return (
      <SessionSummaryScreen
        block={block}
        evaluation={result}
        allBlocks={blocks}
        sessionMinutes={Math.round((Date.now() - sessionStartTime) / 60000)}
        onContinue={onPause}
        onPause={onPause}
      />
    );
  }

  return (
    <>
      {timerActive && (
        <SessionTimer
          seconds={elapsedSeconds}
          totalCards={cardProgress.total}
          completedCards={cardProgress.current}
          estimatedMin={block?.estimatedMinutes}
        />
      )}

      {phase === PHASES.CARDS && (
        <CardLearningPhase
          block={block}
          goalType={goalType}
          mood={sessionMood}
          learningStyle={learningStyle}
          elapsedSeconds={elapsedSeconds}
          onDone={handleCardsDone}
          onExit={onPause}
          onAskFreely={() => setPhase(PHASES.DEPTH_CHOICE)}
          onCardsReady={(cards) => {
            setSessionCards(cards);
            onSaveCards?.(cards);
            setCardProgress({ current: 0, total: cards.length });
          }}
          onCardProgress={(current, total) => setCardProgress({ current, total })}
        />
      )}

      {phase === PHASES.EXPLAIN && (
        <ExplainChatPhase block={block} depth={depth} onDone={handleExplainDone} onExit={onPause} />
      )}

      {phase === PHASES.CHECK && (
        <CheckUnderstandingPhase block={block} onDone={handleCheckDone} onExit={onPause} />
      )}

      {showBreakSuggestion && (
        <BreakSuggestionToast
          onBreak={() => {
            setLastPromptThreshold(currentThreshold);
            setShowMidBreak(true);
          }}
          onContinue={() => setLastPromptThreshold(currentThreshold)}
        />
      )}

      {showMidBreak && <MidSessionBreakScreen onContinue={() => setShowMidBreak(false)} />}
    </>
  );
}
