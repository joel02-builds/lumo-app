import { useCallback, useEffect, useReducer, useState } from 'react';
import { appReducer, createInitialState, SCREENS } from './state/appReducer.js';
import { lumoApi } from './api/lumo.js';
import { loadProject, saveProject, clearProject } from './utils/projectStorage.js';
import { clearAllNotes } from './utils/notesStorage.js';
import { startKeepAlive } from './utils/keepAlive.js';
import OnboardingScreen1 from './screens/onboarding/OnboardingScreen1.jsx';
import OnboardingScreen2 from './screens/onboarding/OnboardingScreen2.jsx';
import OnboardingScreen3 from './screens/onboarding/OnboardingScreen3.jsx';
import AnalyzingScreen from './screens/AnalyzingScreen.jsx';
import DashboardScreen from './screens/dashboard/DashboardScreen.jsx';
import SessionScreen from './screens/session/SessionScreen.jsx';
import WelcomeBackScreen from './screens/WelcomeBackScreen.jsx';
import WeakSpotsScreen from './screens/WeakSpotsScreen.jsx';
import ProjectsScreen from './screens/ProjectsScreen.jsx';
import ExamResultScreen from './screens/ExamResultScreen.jsx';
import SettingsScreen from './screens/SettingsScreen.jsx';
import FlashcardScreen from './screens/FlashcardScreen.jsx';
import MaterialConfirmationScreen from './screens/MaterialConfirmationScreen.jsx';
import ErrorBanner from './components/ErrorBanner.jsx';
import LumoWordmark from './components/LumoWordmark.jsx';
import OfflineBanner from './components/OfflineBanner.jsx';

export default function App() {
  const [state, dispatch] = useReducer(appReducer, null, () => createInitialState(loadProject()));

  // Wird von SessionScreen gemeldet: true während einer Phase mit eigenem
  // Header (CardLearningPhase, ExplainChatPhase, CheckUnderstandingPhase), die
  // sonst mit der fixed positionierten LumoWordmark kollidieren würde.
  const [sessionHasOwnHeader, setSessionHasOwnHeader] = useState(false);

  useEffect(() => {
    const interval = startKeepAlive();
    return () => clearInterval(interval);
  }, []);

  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
    }
    function handleOffline() {
      setIsOnline(false);
    }
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    // Immer persistieren, auch wenn blocks/projects gerade leer sind (z. B.
    // nach dem Löschen des letzten Projekts) – loadProject() entscheidet beim
    // nächsten Start anhand des Inhalts, ob der gespeicherte Stand gültig ist.
    saveProject({
      projectName: state.topic,
      materialName: state.fileName,
      goalType: state.goalType,
      goalDate: state.goalDate,
      blocks: state.blocks,
      recommendedOrder: state.recommendedOrder,
      subjectColor: state.subjectColor,
      learningStyle: state.learningStyle,
      subjectHistory: state.subjectHistory,
      projects: state.projects,
      activeProjectId: state.activeProjectId,
      examResult: state.examResult,
      examResultAskedAt: state.examResultAskedAt,
      blocksAnalyzedTotal: state.blocksAnalyzedTotal,
      sessionsTotal: state.sessionsTotal,
      flashcards: state.flashcards,
    });
  }, [state.topic, state.fileName, state.goalType, state.goalDate, state.blocks, state.recommendedOrder, state.subjectColor, state.learningStyle, state.subjectHistory, state.projects, state.activeProjectId, state.examResult, state.examResultAskedAt, state.blocksAnalyzedTotal, state.sessionsTotal, state.flashcards]);

  const handleMaterial = useCallback((payload) => {
    dispatch({ type: 'SET_MATERIAL', ...payload });
  }, []);

  const handleOnboardingNext = useCallback(() => {
    dispatch({ type: 'GO_TO_STEP2' });
  }, []);

  const handleStart = useCallback(({ subject, color } = {}) => {
    if (color) {
      dispatch({ type: 'SET_SUBJECT_COLOR', payload: color });
    }
    dispatch({ type: 'CONFIRM_MATERIAL' });
  }, []);

  const runAnalysis = useCallback(
    async (goalType, goalDate) => {
      dispatch({ type: 'START_ANALYSIS', goalType, goalDate });
      try {
        const data = await lumoApi.analyzeMaterial({
          topic: state.topic,
          materialText: state.materialText,
          fileBase64: state.fileBase64,
          fileMediaType: state.fileMediaType,
          goalType,
          goalDate,
        });
        dispatch({ type: 'ANALYSIS_SUCCESS', data });
      } catch (err) {
        dispatch({ type: 'ANALYSIS_ERROR', message: err.message });
      }
    },
    [state.topic, state.materialText, state.fileBase64, state.fileMediaType]
  );

  const handleGoalConfirm = useCallback(
    ({ goalType, goalDate, learningStyle }) => {
      if (learningStyle) dispatch({ type: 'SET_LEARNING_STYLE', learningStyle });
      runAnalysis(goalType, goalDate);
    },
    [runAnalysis]
  );

  // Verwirft den aktiven Arbeitsstand endgültig (localStorage + Notizen) und
  // startet frisch im Onboarding. Gespeicherte Projekte (state.projects)
  // bleiben davon unberührt.
  const handleStartFreshProject = useCallback(() => {
    clearProject();
    clearAllNotes();
    dispatch({ type: 'START_NEW_PROJECT' });
  }, []);

  // "Neues Projekt": das aktuelle Projekt wird zuerst gesichert, damit es
  // nicht verloren geht. Gibt es dann (mit dem gerade gesicherten) bereits
  // Projekte, zeigt das die Projektübersicht statt sofort zu löschen.
  const handleNewProject = useCallback(() => {
    if (state.blocks.length > 0) {
      dispatch({ type: 'SAVE_CURRENT_PROJECT' });
    }
    if (state.projects.length > 0 || state.blocks.length > 0) {
      dispatch({ type: 'VIEW_PROJECTS' });
    } else {
      handleStartFreshProject();
    }
  }, [state.blocks.length, state.projects.length, handleStartFreshProject]);

  const handleViewProjects = useCallback(() => {
    if (state.blocks.length > 0) {
      dispatch({ type: 'SAVE_CURRENT_PROJECT' });
    }
    dispatch({ type: 'VIEW_PROJECTS' });
  }, [state.blocks.length]);

  const handleViewSettings = useCallback(() => {
    dispatch({ type: 'VIEW_SETTINGS' });
  }, []);

  const handleViewFlashcards = useCallback(() => {
    dispatch({ type: 'VIEW_FLASHCARDS' });
  }, []);

  const handleExamResultDone = useCallback((result) => {
    dispatch({ type: 'SET_EXAM_RESULT', payload: result });
    dispatch({ type: 'RETURN_TO_DASHBOARD' });
  }, []);

  const handleExamResultDismiss = useCallback(() => {
    dispatch({ type: 'SET_EXAM_RESULT_ASKED' });
    dispatch({ type: 'RETURN_TO_DASHBOARD' });
  }, []);

  const currentBlock = state.blocks.find((b) => b?.id === state.currentBlockId);
  const isWelcomeScreen = state.screen === SCREENS.ONBOARDING && state.onboardingStep === 1;

  return (
    <>
      {!isOnline && <OfflineBanner />}

      {!isWelcomeScreen && (
        <LumoWordmark
          onClick={() => dispatch({ type: 'RETURN_TO_DASHBOARD' })}
          hidden={state.screen === SCREENS.SESSION && sessionHasOwnHeader}
        />
      )}

      {state.screen === SCREENS.WELCOME_BACK && (
        <WelcomeBackScreen
          blocks={state.blocks}
          recommendedOrder={state.recommendedOrder}
          subjectHistory={state.subjectHistory}
          goalType={state.goalType}
          examResult={state.examResult}
          examResultAskedAt={state.examResultAskedAt}
          onStartBlock={(blockId) => dispatch({ type: 'START_BLOCK', blockId })}
          onGoToDashboard={() => dispatch({ type: 'RETURN_TO_DASHBOARD' })}
          onNewProject={handleNewProject}
          onAskExamResult={() => dispatch({ type: 'VIEW_EXAM_RESULT' })}
        />
      )}

      {isWelcomeScreen && (
        <OnboardingScreen1 onNext={handleOnboardingNext} />
      )}

      {state.screen === SCREENS.ONBOARDING && state.onboardingStep === 2 && (
        <OnboardingScreen2 onNext={handleMaterial} onBack={() => dispatch({ type: 'BACK_TO_STEP1' })} />
      )}

      {state.screen === SCREENS.ONBOARDING && state.onboardingStep === 3 && (
        <>
          <OnboardingScreen3
            onConfirm={handleGoalConfirm}
            onBack={() => dispatch({ type: 'BACK_TO_STEP2' })}
          />
          {state.error && (
            <div className="error-toast">
              <ErrorBanner
                message={state.error}
                onRetry={() => runAnalysis(state.goalType, state.goalDate)}
                onClose={() => dispatch({ type: 'CLEAR_ERROR' })}
              />
            </div>
          )}
        </>
      )}

      {state.screen === SCREENS.ANALYZING && <AnalyzingScreen />}

      {state.screen === SCREENS.MATERIAL_CONFIRMATION && (
        <MaterialConfirmationScreen
          blocks={state.blocks}
          totalBlocks={state.blocks.length}
          recommendedOrder={state.recommendedOrder}
          subject={state.blocks[0]?.subject}
          onStart={handleStart}
          onReanalyze={() => runAnalysis(state.goalType, state.goalDate)}
        />
      )}

      {state.screen === SCREENS.DASHBOARD && (
        <DashboardScreen
          blocks={state.blocks}
          recommendedOrder={state.recommendedOrder}
          goalType={state.goalType}
          goalDate={state.goalDate}
          onStartBlock={(blockId) => dispatch({ type: 'START_BLOCK', blockId })}
          onNewProject={handleNewProject}
          onViewWeakSpots={() => dispatch({ type: 'VIEW_WEAK_SPOTS' })}
          onViewProjects={handleViewProjects}
          onSettings={handleViewSettings}
          blocksAnalyzedTotal={state.blocksAnalyzedTotal}
          flashcardsCount={state.flashcards.length}
          onViewFlashcards={handleViewFlashcards}
        />
      )}

      {state.screen === SCREENS.FLASHCARDS && (
        <FlashcardScreen
          flashcards={state.flashcards}
          onUpdateFlashcard={(id, updates) => dispatch({ type: 'UPDATE_FLASHCARD', payload: { id, updates } })}
          onRemoveFlashcard={(id) => dispatch({ type: 'REMOVE_FLASHCARD', payload: id })}
          onBack={() => dispatch({ type: 'RETURN_TO_DASHBOARD' })}
        />
      )}

      {state.screen === SCREENS.SETTINGS && (
        <SettingsScreen
          onBack={() => dispatch({ type: 'RETURN_TO_DASHBOARD' })}
          blocksAnalyzedTotal={state.blocksAnalyzedTotal}
        />
      )}

      {state.screen === SCREENS.PROJECTS && (
        <ProjectsScreen
          projects={state.projects}
          onLoad={(id) => dispatch({ type: 'LOAD_PROJECT', payload: id })}
          onNew={handleStartFreshProject}
          onDelete={(id) => dispatch({ type: 'DELETE_PROJECT', payload: id })}
        />
      )}

      {state.screen === SCREENS.EXAM_RESULT && (
        <ExamResultScreen
          onDone={handleExamResultDone}
          onDismiss={handleExamResultDismiss}
        />
      )}

      {state.screen === SCREENS.WEAK_SPOTS && (
        <WeakSpotsScreen
          blocks={state.blocks}
          onBack={() => dispatch({ type: 'RETURN_TO_DASHBOARD' })}
          onStartBlock={(blockId) => dispatch({ type: 'START_BLOCK', blockId })}
        />
      )}

      {state.screen === SCREENS.SESSION && currentBlock && (
        <SessionScreen
          key={currentBlock.id}
          block={currentBlock}
          blocks={state.blocks}
          goalType={state.goalType}
          learningStyle={state.learningStyle}
          onTrackSubject={(subject) => dispatch({ type: 'TRACK_SUBJECT', payload: subject })}
          onAddFlashcards={(cards) => dispatch({ type: 'ADD_FLASHCARDS', payload: cards })}
          onRecordCompletion={(result) => dispatch({ type: 'BLOCK_FINISHED', blockId: currentBlock.id, ...result })}
          onSaveCards={(cards) => dispatch({ type: 'SAVE_BLOCK_CARDS', payload: { blockId: currentBlock.id, cards } })}
          onPause={() => dispatch({ type: 'RETURN_TO_DASHBOARD' })}
          onHeaderVisibilityChange={setSessionHasOwnHeader}
        />
      )}
    </>
  );
}
