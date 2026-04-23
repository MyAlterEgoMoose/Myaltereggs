import { createContext, useContext, useReducer, useEffect } from 'react';

const QuizContext = createContext();

const initialState = {
  questions: [],
  participants: [],
  scoreRecords: [],
  currentSlideIndex: 0,
  editingId: null,
  currentType: 'single',
  isSidebarOpen: false,
  uploadedImages: [],
  githubConfig: {
    owner: '',
    repo: '',
    branch: 'main',
    token: ''
  }
};

function quizReducer(state, action) {
  switch (action.type) {
    case 'LOAD_STATE':
      return { ...state, ...action.payload };
    
    case 'ADD_QUESTION':
      return { 
        ...state, 
        questions: [...state.questions, action.payload],
        editingId: null 
      };
    
    case 'UPDATE_QUESTION':
      return {
        ...state,
        questions: state.questions.map(q => 
          q.id === action.payload.id ? { ...q, ...action.payload } : q
        ),
        editingId: null
      };
    
    case 'DELETE_QUESTION':
      return {
        ...state,
        questions: state.questions.filter(q => q.id !== action.payload),
        currentSlideIndex: Math.max(0, Math.min(state.currentSlideIndex, state.questions.length - 2))
      };
    
    case 'SET_EDITING_QUESTION':
      return {
        ...state,
        editingId: action.payload.id,
        currentType: action.payload.type
      };
    
    case 'CLEAR_FORM':
      return {
        ...state,
        editingId: null,
        currentType: 'single'
      };
    
    case 'SET_CURRENT_TYPE':
      return { ...state, currentType: action.payload };
    
    case 'SET_CURRENT_SLIDE':
      return { ...state, currentSlideIndex: action.payload };
    
    case 'TOGGLE_SIDEBAR':
      return { ...state, isSidebarOpen: !state.isSidebarOpen };
    
    case 'OPEN_SIDEBAR':
      return { ...state, isSidebarOpen: true };
    
    case 'CLOSE_SIDEBAR':
      return { ...state, isSidebarOpen: false };
    
    case 'ADD_PARTICIPANT':
      if (state.participants.find(p => p.name === action.payload)) {
        return state;
      }
      return {
        ...state,
        participants: [...state.participants, { id: action.payload, name: action.payload, totalScore: 0 }]
      };
    
    case 'DELETE_PARTICIPANT':
      return {
        ...state,
        participants: state.participants.filter(p => p.name !== action.payload),
        scoreRecords: state.scoreRecords.filter(r => r.participantName !== action.payload)
      };
    
    case 'ADD_SCORE_RECORD':
      return {
        ...state,
        scoreRecords: [...state.scoreRecords, action.payload]
      };
    
    case 'RESET_ALL_SCORES':
      return {
        ...state,
        scoreRecords: [],
        participants: state.participants.map(p => ({ ...p, totalScore: 0 }))
      };
    
    case 'RESET_ALL_QUESTIONS':
      return {
        ...state,
        questions: [],
        scoreRecords: [],
        participants: state.participants.map(p => ({ ...p, totalScore: 0 })),
        currentSlideIndex: 0
      };
    
    case 'SHUFFLE_QUESTIONS':
      return {
        ...state,
        questions: [...action.payload],
        currentSlideIndex: 0
      };
    
    case 'IMPORT_DATA':
      return {
        ...state,
        questions: action.payload.questions || [],
        participants: action.payload.participants || [],
        scoreRecords: action.payload.scoreRecords || [],
        uploadedImages: action.payload.uploadedImages || []
      };
    
    case 'SAVE_GITHUB_CONFIG':
      return {
        ...state,
        githubConfig: action.payload
      };
    
    default:
      return state;
  }
}

export function QuizProvider({ children }) {
  const [state, dispatch] = useReducer(quizReducer, initialState);

  // Load from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('quizAppState');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        dispatch({ type: 'LOAD_STATE', payload: parsed });
      } catch (e) {
        console.error('Failed to load state from localStorage:', e);
      }
    }
    
    const savedGithubConfig = localStorage.getItem('githubConfig');
    if (savedGithubConfig) {
      try {
        const config = JSON.parse(savedGithubConfig);
        dispatch({ type: 'SAVE_GITHUB_CONFIG', payload: config });
      } catch (e) {
        console.error('Failed to load GitHub config:', e);
      }
    }
  }, []);

  // Save to localStorage when state changes
  useEffect(() => {
    const { githubConfig, ...stateToSave } = state;
    localStorage.setItem('quizAppState', JSON.stringify(stateToSave));
  }, [state]);

  useEffect(() => {
    localStorage.setItem('githubConfig', JSON.stringify(state.githubConfig));
  }, [state.githubConfig]);

  return (
    <QuizContext.Provider value={{ state, dispatch }}>
      {children}
    </QuizContext.Provider>
  );
}

export function useQuiz() {
  const context = useContext(QuizContext);
  if (!context) {
    throw new Error('useQuiz must be used within a QuizProvider');
  }
  return context;
}
