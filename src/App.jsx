import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { appReducer, createInitialState, SCREENS } from './state/appReducer.js';
import { lumoApi } from './api/lumo.js';
import {
  loadProject,
  saveProject,
  clearProject,
  loadProjectAsync,
  saveProjectAsync,
  requestPersistentStorage,
  getStorageStatus,
} from './utils/projectStorage.js';
import { loadServerState, scheduleSyncToServer, mergeStates, syncStreak } from './utils/serverSync.js';
import { clearAllNotes } from './utils/notesStorage.js';
import { startKeepAlive } from './utils/keepAlive.js';
import StorageWarningBanner from './components/StorageWarningBanner.jsx';
import OnboardingScreen1 from './screens/onboarding/OnboardingScreen1.jsx';
// OnboardingScreen2 wurde in OnboardingScreen1 zusammengeführt (Welcome + Material in einem Schritt)
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
import InstallBanner from './components/InstallBanner.jsx';
import BetaFeedbackButton from './components/BetaFeedbackButton.jsx';
import LegalScreen from './screens/LegalScreen.jsx';
import CookieConsent, { useCookieConsent } from './components/CookieConsent.jsx';
import { calculateNextReview } from './utils/fsrs.js';

export default function App() {
  const [state, dispatch] = useReducer(appReducer, null, () => createInitialState(loadProject()));

  // Wird von SessionScreen gemeldet: true während einer Phase mit eigenem
  // Header (CardLearningPhase, ExplainChatPhase, CheckUnderstandingPhase), die
  // sonst mit der fixed positionierten LumoWordmark kollidieren würde.
  const [sessionHasOwnHeader, setSessionHasOwnHeader] = useState(false);

  // Impressum/Datenschutz — overlay über allem anderen, kein eigener Screen-State nötig
  const [showLegal, setShowLegal] = useState(false);

  // Cookie-Consent — ePrivacy-konform, muss vor Server-Sync angezeigt werden
  const { consent, accept, decline } = useCookieConsent();
  const showCookieBanner = consent === null;

  // Datenschutz aus Cookie-Banner heraus öffnen
  useEffect(() => {
    function handleLegalEvent() { setShowLegal(true); }
    window.addEventListener('lumo:show-legal', handleLegalEvent);
    return () => window.removeEventListener('lumo:show-legal', handleLegalEvent);
  }, []);

  // Storage-Status für Warning Banner
  const [storageLayer, setStorageLayer] = useState(null); // null = noch nicht geprüft
  const idbHydrated = useRef(false);

  // Beim ersten Render:
  // 1. requestPersistentStorage — einmalig, erhöht Schutz vor Browser-Eviction
  // 2. loadProjectAsync — IDB-Daten laden und State ggf. aktualisieren
  // 3. getStorageStatus — Layer für Warning Banner ermitteln
  useEffect(() => {
    let cancelled = false;

    async function initStorage() {
      // Persist-Anfrage (nur einmal pro Gerät, intern gecacht)
      await requestPersistentStorage();

      // IDB-Hydration: Wenn IDB Daten enthält die neuer/vollständiger sind,
      // State übernehmen. Da useReducer mit loadProject() (sync localStorage)
      // initialisiert wurde, ist dieser Step ein Upgrade, kein Ersteinstieg.
      if (!idbHydrated.current) {
        idbHydrated.current = true;
        try {
          const idbData = await loadProjectAsync();
          if (!cancelled && idbData) {
            dispatch({ type: 'HYDRATE_FROM_STORAGE', payload: idbData });
          }
        } catch {
          // IDB nicht verfügbar — localStorage-Init reicht
        }

        // Server-State laden — NUR wenn Cookie-Consent erteilt (ePrivacy)
        // Consent-Status direkt aus localStorage lesen (nicht aus React-State, da async)
        const cookieConsent = (() => { try { return localStorage.getItem('lumo_cookie_consent'); } catch { return null; } })();
        if (cookieConsent === 'accepted') {
          try {
            const serverResult = await loadServerState();
            if (!cancelled && serverResult?.state) {
              const localData = await loadProjectAsync();
              const merged = mergeStates(localData, serverResult.state);
              if (merged && JSON.stringify(merged) !== JSON.stringify(localData)) {
                console.log('[Sync] Server-State übernommen (anderes Gerät/Browser)');
                dispatch({ type: 'HYDRATE_FROM_STORAGE', payload: merged });
              }
            }
          } catch {
            // Server nicht erreichbar — kein Problem, lokal läuft alles
          }
        }
      }

      // Storage-Status für Warning Banner
      try {
        const status = await getStorageStatus();
        if (!cancelled) setStorageLayer(status.layer);
      } catch {
        if (!cancelled) setStorageLayer('localStorage');
      }
    }

    initStorage();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    const snapshot = {
      projectName: state.topic,
      materialName: state.fileName,
      goalType: state.goalType,
      goalDate: state.goalDate,
      sprintMode: state.sprintMode,
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
    };

    // Sync: sofortiger localStorage-Write (UI blockiert nie)
    saveProject(snapshot);

    // Async: IDB-Write im Hintergrund (primärer Layer)
    saveProjectAsync(snapshot).catch(() => {
      // IDB-Fehler sind nicht kritisch – localStorage ist der Fallback
    });

    // Server-Sync — nur bei erteiletem Cookie-Consent (ePrivacy)
    const cookieConsent = (() => { try { return localStorage.getItem('lumo_cookie_consent'); } catch { return null; } })();
    if (cookieConsent === 'accepted') {
      scheduleSyncToServer(snapshot);
    }
  }, [state.topic, state.fileName, state.goalType, state.goalDate, state.sprintMode, state.blocks, state.recommendedOrder, state.subjectColor, state.learningStyle, state.subjectHistory, state.projects, state.activeProjectId, state.examResult, state.examResultAskedAt, state.blocksAnalyzedTotal, state.sessionsTotal, state.flashcards]);

  // ── Abgeleitete Werte — VOR allen useCallbacks, die sie referenzieren ────
  // WICHTIG: Diese Konstanten MÜSSEN vor den useCallback-Hooks stehen.
  // Vites Minifier/Bundler kann sonst eine Temporal Dead Zone (TDZ) erzeugen,
  // die in Production zu einem ReferenceError führt (auch wenn Dev-Mode funktioniert).
  const currentBlock = state.blocks.find((b) => b?.id === state.currentBlockId);
  const isWelcomeScreen = state.screen === SCREENS.ONBOARDING && state.onboardingStep === 1;

  // Kombinierter Handler für den neuen Screen 1+2:
  // Material-Payload kommt direkt aus OnboardingScreen1 und setzt
  // onboardingStep → 3 (überspringt den alten Screen 2).
  const handleMaterial = useCallback((payload) => {
    dispatch({ type: 'SET_MATERIAL', ...payload });
  }, []);

  const handleStart = useCallback(({ subject, color, blocks } = {}) => {
    if (color) {
      dispatch({ type: 'SET_SUBJECT_COLOR', payload: color });
    }
    if (blocks) {
      dispatch({ type: 'UPDATE_BLOCKS_ORDER', payload: blocks });
    }
    dispatch({ type: 'CONFIRM_MATERIAL' });
  }, []);

  const runAnalysis = useCallback(
    async (goalType, goalDate, sprintMode = false) => {
      dispatch({ type: 'START_ANALYSIS', goalType, goalDate, sprintMode });
      try {
        const data = await lumoApi.analyzeMaterial({
          topic: state.topic,
          materialText: state.materialText,
          // Multi-file: send files array; server handles multiple PDFs.
          // Legacy single-file kept as fallback for older state shape.
          files: state.files?.length ? state.files : undefined,
          fileBase64: !state.files?.length ? state.fileBase64 : undefined,
          fileMediaType: !state.files?.length ? state.fileMediaType : undefined,
          goalType,
          goalDate,
          sprintMode,
        });
        dispatch({ type: 'ANALYSIS_SUCCESS', data });
      } catch (err) {
        dispatch({ type: 'ANALYSIS_ERROR', message: err.message });
      }
    },
    [state.topic, state.materialText, state.files, state.fileBase64, state.fileMediaType]
  );

  const handleGoalConfirm = useCallback(
    ({ goalType, goalDate, learningStyle, sprintMode = false }) => {
      if (learningStyle) dispatch({ type: 'SET_LEARNING_STYLE', learningStyle });
      runAnalysis(goalType, goalDate, sprintMode);
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

  // Streak nach echtem Block-Abschluss schreiben.
  // Wird in SessionScreen via onRecordCompletion ausgelöst – also nur wenn
  // der Nutzer einen Block wirklich durchgelernt hat, nicht beim bloßen Öffnen
  // der App. Schreibt direkt in localStorage (außerhalb des Reducers, weil
  // der Reducer pure bleiben soll).
  const handleRecordCompletion = useCallback((result) => {
    try {
      const today = new Date().toDateString();
      const raw = localStorage.getItem('lumo_streak');
      const streak = raw ? JSON.parse(raw) : { days: 0, lastDate: null };

      if (streak.lastDate !== today) {
        // Erster Block heute: Streak um 1 erhöhen (oder auf 1 setzen wenn neu)
        const newDays = streak.lastDate === new Date(Date.now() - 86400000).toDateString()
          ? streak.days + 1   // gestern gelernt → Streak läuft weiter
          : 1;                 // länger nicht gelernt → Streak startet neu bei 1
        localStorage.setItem('lumo_streak', JSON.stringify({ days: newDays, lastDate: today }));
      }
      // Wenn lastDate === today: bereits heute einen Block abgeschlossen – kein Update nötig
    } catch {
      // localStorage nicht verfügbar – still ignorieren
    }
    dispatch({ type: 'BLOCK_FINISHED', blockId: currentBlock?.id, ...result });
  }, [currentBlock?.id]);

  // Session→FSRS Bridge
  // ─────────────────────────────────────────────────────────────────────────
  // Nach einer Lernsession gibt CardLearningPhase die Ergebnisse jeder Karte
  // weiter: { [concept]: isGood }. Hier suchen wir die passenden Flashcards
  // im State und aktualisieren ihre FSRS-Werte.
  //
  // Rating-Mapping (FSRS-6):
  //   isGood=true  → Quality 2 (Good)  → normale Wiederholung
  //   isGood=false → Quality 0 (Again) → Intervall verkürzen
  //
  // Matching: concept-String case-insensitive, weil Karten manchmal
  // leicht unterschiedlich formatiert sein können.
  const handleSaveCardResults = useCallback((answerResults) => {
    if (!answerResults || !state.flashcards?.length) return;
    const updates = [];
    for (const [concept, isGood] of Object.entries(answerResults)) {
      const conceptLower = concept.toLowerCase().trim();
      const card = state.flashcards.find(
        (c) => (c.concept || c.front || '').toLowerCase().trim() === conceptLower
      );
      if (!card) continue;
      try {
        const quality = isGood ? 2 : 0; // Good=2, Again=0
        const updated = calculateNextReview(card, quality);
        updates.push({ id: card.id, updates: updated });
      } catch {
        // FSRS-Fehler still ignorieren – kein Loop-Stopper
      }
    }
    if (updates.length > 0) {
      updates.forEach(({ id, updates: u }) => {
        dispatch({ type: 'UPDATE_FLASHCARD', payload: { id, updates: u } });
      });
    }
  }, [state.flashcards]);

  const handleExamResultDone = useCallback((result) => {
    dispatch({ type: 'SET_EXAM_RESULT', payload: result });
    dispatch({ type: 'RETURN_TO_DASHBOARD' });
  }, []);

  const handleExamResultDismiss = useCallback(() => {
    dispatch({ type: 'SET_EXAM_RESULT_ASKED' });
    dispatch({ type: 'RETURN_TO_DASHBOARD' });
  }, []);

  return (
    <>
      {/* LegalScreen überlagert alles — via showLegal aus jedem Screen erreichbar */}
      {showLegal && <LegalScreen onBack={() => setShowLegal(false)} />}

      {!showLegal && (
        <>
      {!isOnline && <OfflineBanner />}
      {storageLayer === 'localStorage' && <StorageWarningBanner />}
      <InstallBanner />
      <BetaFeedbackButton />

      {/* Cookie-Consent — ePrivacy Directive 2002/58/EC
          lumo_uid ist kein technisch notwendiger Cookie (App läuft lokal auch ohne).
          Consent muss vor dem ersten Cookie-Setzen eingeholt werden. */}
      {showCookieBanner && (
        <CookieConsent
          onAccept={accept}
          onDecline={decline}
        />
      )}

      {!isWelcomeScreen && (
        <LumoWordmark
          onClick={() => dispatch({ type: 'RETURN_TO_DASHBOARD' })}
          hidden={state.screen === SCREENS.SESSION && sessionHasOwnHeader}
        />
      )}

      {state.screen === SCREENS.WELCOME_BACK && (
        <WelcomeBackScreen
          blocks={state.blocks}
          flashcards={state.flashcards}
          recommendedOrder={state.recommendedOrder}
          subjectHistory={state.subjectHistory}
          goalType={state.goalType}
          goalDate={state.goalDate}
          sprintMode={state.sprintMode}
          examResult={state.examResult}
          examResultAskedAt={state.examResultAskedAt}
          onStartBlock={(blockId) => dispatch({ type: 'START_BLOCK', blockId })}
          onGoToDashboard={() => dispatch({ type: 'RETURN_TO_DASHBOARD' })}
          onNewProject={handleNewProject}
          onAskExamResult={() => dispatch({ type: 'VIEW_EXAM_RESULT' })}
        />
      )}

      {/* Kombinierter Welcome + Material Screen (früher Screen 1 + 2 getrennt) */}
      {isWelcomeScreen && (
        <OnboardingScreen1 onNext={handleMaterial} onShowLegal={() => setShowLegal(true)} />
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
          sprintMode={state.sprintMode}
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
          onResetOnboarding={() => dispatch({ type: 'RESET_TO_ONBOARDING' })}
          blocksAnalyzedTotal={state.blocksAnalyzedTotal}
          onShowLegal={() => setShowLegal(true)}
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
          flashcards={state.flashcards}
          onBack={() => dispatch({ type: 'RETURN_TO_DASHBOARD' })}
          onStartBlock={(blockId) => dispatch({ type: 'START_BLOCK', blockId })}
          onViewFlashcards={handleViewFlashcards}
        />
      )}

      {state.screen === SCREENS.SESSION && currentBlock && (
        <SessionScreen
          key={currentBlock.id}
          block={currentBlock}
          blocks={state.blocks}
          flashcards={state.flashcards}
          goalType={state.goalType}
          sprintMode={state.sprintMode}
          learningStyle={state.learningStyle}
          onTrackSubject={(subject) => dispatch({ type: 'TRACK_SUBJECT', payload: subject })}
          onAddFlashcards={(cards) => dispatch({ type: 'ADD_FLASHCARDS', payload: cards })}
          onRecordCompletion={handleRecordCompletion}
          onSaveCardResults={handleSaveCardResults}
          onSaveCards={(cards) => dispatch({ type: 'SAVE_BLOCK_CARDS', payload: { blockId: currentBlock.id, cards } })}
          onPause={() => dispatch({ type: 'RETURN_TO_DASHBOARD' })}
          onHeaderVisibilityChange={setSessionHasOwnHeader}
        />
      )}
        </>
      )}
    </>
  );
}
