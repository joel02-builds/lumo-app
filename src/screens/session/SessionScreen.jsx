import { useCallback, useEffect, useState } from 'react';
import FocusRitualPhase from './FocusRitualPhase.jsx';
import CardLearningPhase from './CardLearningPhase.jsx';
import DepthChoicePhase from './DepthChoicePhase.jsx';
import ExplainChatPhase from './ExplainChatPhase.jsx';
import CheckUnderstandingPhase from './CheckUnderstandingPhase.jsx';
import BlockCompletePhase from './BlockCompletePhase.jsx';
import SessionSummaryScreen from './SessionSummaryScreen.jsx';
import MidSessionBreakScreen from './MidSessionBreakScreen.jsx';
import SessionTimer from '../../components/SessionTimer.jsx';
import BreakSuggestionToast from '../../components/BreakSuggestionToast.jsx';

const PHASES = {
  FOCUS_RITUAL: 'focus-ritual',
  CARDS: 'cards',
  DEPTH_CHOICE: 'depth-choice',
  EXPLAIN: 'explain',
  CHECK: 'check',
  COMPLETE: 'complete',
  SESSION_SUMMARY: 'session-summary',
};

const BREAK_INTERVAL_SECONDS = 20 * 60;

// Owns the full flow for exactly one block. Mount with key={block.id} from
// the parent so a new block always starts with a clean phase state.
export default function SessionScreen({ block, blocks, onRecordCompletion, onPause, onHeaderVisibilityChange }) {
  const [phase, setPhase] = useState(PHASES.FOCUS_RITUAL);
  const [depth, setDepth] = useState('simple');
  const [result, setResult] = useState(null);

  // Pause-Empfehlung alle 20 aktiven Minuten, als Overlay statt Phasenwechsel
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

  const currentThreshold = Math.floor(elapsedSeconds / BREAK_INTERVAL_SECONDS);
  const showBreakSuggestion = timerActive && currentThreshold > lastPromptThreshold && phase !== PHASES.CARDS;

  // SessionScreen re-rendert jede Sekunde (Timer). Ohne useCallback bekämen
  // ExplainChatPhase/CheckUnderstandingPhase bei jedem Tick eine NEUE onDone-
  // Referenz – deren eigene useEffect-Timer (z. B. der "Gut. Jetzt du."-Übergang)
  // würden dadurch jede Sekunde abgebrochen und neu gestartet, bevor sie je
  // ablaufen können. Stabile Referenzen sind hier kein Stil, sondern nötig.
  const handleExplainDone = useCallback(() => setPhase(PHASES.CHECK), []);
  const handleCardsDone = useCallback(() => setPhase(PHASES.CHECK), []);
  const handleCheckDone = useCallback((r) => {
    setResult(r);
    setPhase(PHASES.COMPLETE);
  }, []);

  if (phase === PHASES.FOCUS_RITUAL) {
    return (
      <FocusRitualPhase
        onDone={() => setPhase(PHASES.CARDS)}
        block={block}
        allBlocks={blocks}
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
        onContinue={() => {
          onRecordCompletion(result);
          setPhase(PHASES.SESSION_SUMMARY);
        }}
        onPause={() => {
          onRecordCompletion(result);
          onPause();
        }}
      />
    );
  }

  if (phase === PHASES.SESSION_SUMMARY) {
    return (
      <SessionSummaryScreen
        block={block}
        evaluation={result}
        allBlocks={blocks}
        onContinue={onPause}
        onPause={onPause}
      />
    );
  }

  return (
    <>
      {timerActive && <SessionTimer seconds={elapsedSeconds} />}

      {phase === PHASES.CARDS && (
        <CardLearningPhase
          block={block}
          onDone={handleCardsDone}
          onExit={onPause}
          onAskFreely={() => setPhase(PHASES.DEPTH_CHOICE)}
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
