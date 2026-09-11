import { useCallback, useEffect, useReducer, useState } from 'react';
import { appReducer, createInitialState, SCREENS } from './state/appReducer.js';
import { lumoApi } from './api/lumo.js';
import { loadProject, saveProject, clearProject } from './utils/projectStorage.js';
import { clearAllNotes } from './utils/notesStorage.js';
import OnboardingScreen1 from './screens/onboarding/OnboardingScreen1.jsx';
import OnboardingScreen2 from './screens/onboarding/OnboardingScreen2.jsx';
import OnboardingScreen3 from './screens/onboarding/OnboardingScreen3.jsx';
import AnalyzingScreen from './screens/AnalyzingScreen.jsx';
import DashboardScreen from './screens/dashboard/DashboardScreen.jsx';
import SessionScreen from './screens/session/SessionScreen.jsx';
import WelcomeBackScreen from './screens/WelcomeBackScreen.jsx';
import MaterialConfirmationScreen from './screens/MaterialConfirmationScreen.jsx';
import ErrorBanner from './components/ErrorBanner.jsx';
import LumoWordmark from './components/LumoWordmark.jsx';
import OfflineBanner from './components/OfflineBanner.jsx';

export default function App() {
  const [state, dispatch] = useReducer(appReducer, null, () => createInitialState(loadProject()));

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
    if (state.blocks.length === 0) return;
    saveProject({
      projectName: state.topic,
      materialName: state.fileName,
      goalType: state.goalType,
      goalDate: state.goalDate,
      blocks: state.blocks,
      recommendedOrder: state.recommendedOrder,
    });
  }, [state.topic, state.fileName, state.goalType, state.goalDate, state.blocks, state.recommendedOrder]);

  const handleMaterial = useCallback((payload) => {
    dispatch({ type: 'SET_MATERIAL', ...payload });
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
    ({ goalType, goalDate }) => runAnalysis(goalType, goalDate),
    [runAnalysis]
  );

  const handleNewProject = useCallback(() => {
    clearProject();
    clearAllNotes();
    dispatch({ type: 'START_NEW_PROJECT' });
  }, []);

  const currentBlock = state.blocks.find((b) => b.id === state.currentBlockId);
  const isWelcomeScreen = state.screen === SCREENS.ONBOARDING && state.onboardingStep === 1;

  return (
    <>
      {!isOnline && <OfflineBanner />}

      {!isWelcomeScreen && (
        <LumoWordmark onClick={() => dispatch({ type: 'RETURN_TO_DASHBOARD' })} />
      )}

      {state.screen === SCREENS.WELCOME_BACK && (
        <WelcomeBackScreen
          blocks={state.blocks}
          recommendedOrder={state.recommendedOrder}
          onStartBlock={(blockId) => dispatch({ type: 'START_BLOCK', blockId })}
          onGoToDashboard={() => dispatch({ type: 'RETURN_TO_DASHBOARD' })}
          onNewProject={handleNewProject}
        />
      )}

      {isWelcomeScreen && (
        <OnboardingScreen1 onNext={() => dispatch({ type: 'GO_TO_STEP2' })} />
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
          onStart={() => dispatch({ type: 'CONFIRM_MATERIAL' })}
          onReanalyze={() => runAnalysis(state.goalType, state.goalDate)}
        />
      )}

      {state.screen === SCREENS.DASHBOARD && (
        <DashboardScreen
          blocks={state.blocks}
          recommendedOrder={state.recommendedOrder}
          onStartBlock={(blockId) => dispatch({ type: 'START_BLOCK', blockId })}
          onNewProject={handleNewProject}
        />
      )}

      {state.screen === SCREENS.SESSION && currentBlock && (
        <SessionScreen
          key={currentBlock.id}
          block={currentBlock}
          blocks={state.blocks}
          onRecordCompletion={(result) => dispatch({ type: 'BLOCK_FINISHED', blockId: currentBlock.id, ...result })}
          onPause={() => dispatch({ type: 'RETURN_TO_DASHBOARD' })}
        />
      )}
    </>
  );
}
