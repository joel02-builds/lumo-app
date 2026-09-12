export const SCREENS = {
  ONBOARDING: 'onboarding',
  ANALYZING: 'analyzing',
  MATERIAL_CONFIRMATION: 'material-confirmation',
  DASHBOARD: 'dashboard',
  SESSION: 'session',
  WELCOME_BACK: 'welcome-back',
  WEAK_SPOTS: 'weak-spots',
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
};

// Lazy-Init für useReducer: baut den Startzustand aus einem evtl. in
// localStorage gefundenen Projekt auf (siehe utils/projectStorage.js).
export function createInitialState(savedProject) {
  if (!savedProject) return initialState;
  return {
    ...initialState,
    screen: SCREENS.WELCOME_BACK,
    topic: savedProject.projectName || '',
    fileName: savedProject.materialName || '',
    goalType: savedProject.goalType || null,
    goalDate: savedProject.goalDate || '',
    blocks: savedProject.blocks || [],
    recommendedOrder: savedProject.recommendedOrder || [],
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

    case 'RETURN_TO_DASHBOARD':
      return { ...state, screen: SCREENS.DASHBOARD, currentBlockId: null };

    case 'VIEW_WEAK_SPOTS':
      return { ...state, screen: SCREENS.WEAK_SPOTS };

    case 'START_NEW_PROJECT':
      return { ...initialState };

    default:
      return state;
  }
}
