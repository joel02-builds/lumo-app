export const SCREENS = {
  ONBOARDING: 'onboarding',
  ANALYZING: 'analyzing',
  MATERIAL_CONFIRMATION: 'material-confirmation',
  DASHBOARD: 'dashboard',
  SESSION: 'session',
  WELCOME_BACK: 'welcome-back',
  WEAK_SPOTS: 'weak-spots',
  PROJECTS: 'projects',
};

export const initialState = {
  screen: SCREENS.ONBOARDING,
  onboardingStep: 1,
  topic: '',
  materialText: '',
  fileName: '',
  fileBase64: '',
  fileMediaType: '',
  goalType: null,
  goalDate: '',
  blocks: [],
  recommendedOrder: [],
  currentBlockId: null,
  error: null,
  subjectColor: null,
  learningStyle: null,
  subjectHistory: [],
  projects: [],
  activeProjectId: null,
};

// Lazy-Init für useReducer: baut den Startzustand aus einem evtl. in
// localStorage gefundenen Projekt auf (siehe utils/projectStorage.js).
export function createInitialState(savedProject) {
  if (!savedProject) return initialState;
  const hasActiveBlocks = Array.isArray(savedProject.blocks) && savedProject.blocks.length > 0;
  const projects = savedProject.projects || [];
  return {
    ...initialState,
    // Ohne aktive Blöcke (z. B. nach "Neues Projekt" vor Abschluss des
    // Onboardings) landet man bei vorhandenen gespeicherten Projekten direkt
    // in der Übersicht statt in einem leeren "Willkommen zurück" ohne Inhalt.
    screen: hasActiveBlocks ? SCREENS.WELCOME_BACK : projects.length > 0 ? SCREENS.PROJECTS : SCREENS.ONBOARDING,
    topic: savedProject.projectName || '',
    fileName: savedProject.materialName || '',
    goalType: savedProject.goalType || null,
    goalDate: savedProject.goalDate || '',
    blocks: savedProject.blocks || [],
    recommendedOrder: savedProject.recommendedOrder || [],
    subjectColor: savedProject.subjectColor || null,
    learningStyle: savedProject.learningStyle || null,
    subjectHistory: savedProject.subjectHistory || [],
    projects,
    activeProjectId: savedProject.activeProjectId || null,
  };
}

export function appReducer(state, action) {
  switch (action.type) {
    case 'GO_TO_STEP2':
      return { ...state, onboardingStep: 2 };

    case 'BACK_TO_STEP1':
      return { ...state, onboardingStep: 1 };

    case 'SET_MATERIAL':
      return {
        ...state,
        topic: action.topic,
        materialText: action.materialText,
        fileName: action.fileName,
        fileBase64: action.fileBase64,
        fileMediaType: action.fileMediaType,
        onboardingStep: 3,
      };

    case 'BACK_TO_STEP2':
      return { ...state, onboardingStep: 2 };

    case 'START_ANALYSIS':
      return {
        ...state,
        goalType: action.goalType,
        goalDate: action.goalDate,
        screen: SCREENS.ANALYZING,
        error: null,
      };

    case 'ANALYSIS_SUCCESS': {
      const blocks = action.data.blocks.map((b) => ({
        ...b,
        subject: action.data.subject,
        status: 'not-started',
        confidence: null,
        goodPoints: [],
        uncertainPoints: [],
      }));
      const ids = new Set(blocks.map((b) => b.id));
      const recommendedOrder =
        Array.isArray(action.data.recommendedOrder) && action.data.recommendedOrder.every((id) => ids.has(id))
          ? action.data.recommendedOrder
          : blocks.map((b) => b.id);
      return {
        ...state,
        blocks,
        recommendedOrder,
        screen: SCREENS.MATERIAL_CONFIRMATION,
      };
    }

    case 'CONFIRM_MATERIAL':
      return { ...state, screen: SCREENS.DASHBOARD };

    case 'SET_LEARNING_STYLE':
      return { ...state, learningStyle: action.learningStyle };

    case 'TRACK_SUBJECT': {
      const existing = state.subjectHistory.find(s => s.subject === action.payload);
      return {
        ...state,
        subjectHistory: existing
          ? state.subjectHistory.map(s =>
              s.subject === action.payload ? { ...s, count: s.count + 1 } : s
            )
          : [...state.subjectHistory, { subject: action.payload, count: 1 }],
      };
    }

    case 'SET_SUBJECT_COLOR':
      return {
        ...state,
        subjectColor: action.payload,
        blocks: state.blocks.map((b) => ({ ...b, subject_color: action.payload })),
      };

    case 'ANALYSIS_ERROR':
      return { ...state, screen: SCREENS.ONBOARDING, onboardingStep: 3, error: action.message };

    case 'CLEAR_ERROR':
      return { ...state, error: null };

    case 'START_BLOCK':
      return {
        ...state,
        currentBlockId: action.blockId,
        screen: SCREENS.SESSION,
        blocks: state.blocks.map((b) =>
          b.id === action.blockId && b.status === 'not-started' ? { ...b, status: 'in-progress' } : b
        ),
      };

    case 'BLOCK_FINISHED':
      return {
        ...state,
        blocks: state.blocks.map((b) =>
          b.id === action.blockId
            ? {
                ...b,
                status: 'completed',
                confidence: action.status,
                goodPoints: action.goodPoints || [],
                uncertainPoints: action.uncertainPoints || [],
                completedAt: new Date().toISOString(),
              }
            : b
        ),
      };

    case 'SAVE_BLOCK_CARDS':
      return {
        ...state,
        blocks: state.blocks.map(b =>
          b.id === action.payload.blockId
            ? { ...b, cards: action.payload.cards }
            : b
        ),
      };

    case 'RETURN_TO_DASHBOARD':
      return { ...state, screen: SCREENS.DASHBOARD, currentBlockId: null };

    case 'VIEW_WEAK_SPOTS':
      return { ...state, screen: SCREENS.WEAK_SPOTS };

    case 'VIEW_PROJECTS':
      return { ...state, screen: SCREENS.PROJECTS };

    case 'SAVE_CURRENT_PROJECT': {
      const current = {
        id: state.activeProjectId || Date.now().toString(),
        topic: state.topic,
        goalType: state.goalType,
        blocks: state.blocks,
        recommendedOrder: state.recommendedOrder,
        subject: state.blocks[0]?.subject || null,
        subjectColor: state.subjectColor,
        savedAt: new Date().toISOString(),
      };
      const existing = state.projects.findIndex(p => p.id === current.id);
      const projects = existing >= 0
        ? state.projects.map((p, i) => i === existing ? current : p)
        : [...state.projects, current];
      return { ...state, projects, activeProjectId: current.id };
    }

    case 'LOAD_PROJECT': {
      const project = state.projects.find(p => p.id === action.payload);
      if (!project) return state;
      return {
        ...state,
        topic: project.topic,
        goalType: project.goalType,
        blocks: project.blocks,
        recommendedOrder: project.recommendedOrder,
        subjectColor: project.subjectColor,
        activeProjectId: project.id,
        currentBlockId: null,
        screen: SCREENS.WELCOME_BACK,
      };
    }

    case 'DELETE_PROJECT': {
      const projects = state.projects.filter(p => p.id !== action.payload);
      // Wird gerade das aktive Projekt gelöscht, muss auch der Arbeitsstand
      // geleert werden – sonst "lebt" es beim nächsten Aufruf von
      // 'Alle Projekte' (SAVE_CURRENT_PROJECT) sofort wieder auf.
      if (state.activeProjectId === action.payload) {
        return {
          ...state,
          projects,
          blocks: [],
          recommendedOrder: [],
          topic: '',
          goalType: null,
          subjectColor: null,
          activeProjectId: null,
          currentBlockId: null,
        };
      }
      return { ...state, projects };
    }

    case 'START_NEW_PROJECT':
      // Gespeicherte Projekte (projects) bleiben über einen Neustart hinweg
      // erhalten – nur der aktuell aktive Arbeitsstand wird zurückgesetzt.
      return { ...initialState, projects: state.projects };

    default:
      return state;
  }
}
