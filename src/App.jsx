import { useState, useEffect } from 'react';
import { useQuiz } from './context/QuizContext.jsx';
import QuestionBuilder from './components/QuestionBuilder';
import QuestionsList from './components/QuestionsList';
import ParticipantManager from './components/ParticipantManager';
import QuizDisplay from './components/QuizDisplay';
import Scoreboard from './components/Scoreboard';
import GradingModal from './components/GradingModal';
import Toolbar from './components/Toolbar';

export default function App() {
  const { state, dispatch } = useQuiz();
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [gradingModalOpen, setGradingModalOpen] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [currentUserAnswer, setCurrentUserAnswer] = useState(null);
  const [editingQuestionData, setEditingQuestionData] = useState(null);

  // Expose openGradingModal globally for QuizDisplay component
  useEffect(() => {
    window.openGradingModal = (question, answer) => {
      setCurrentQuestion(question);
      setCurrentUserAnswer(answer);
      setGradingModalOpen(true);
    };
    
    return () => {
      window.openGradingModal = null;
    };
  }, []);

  const handleEditQuestion = (question) => {
    setEditingQuestionData(question);
    dispatch({ type: 'OPEN_SIDEBAR' });
  };

  const toggleSidebar = () => {
    dispatch({ type: 'TOGGLE_SIDEBAR' });
  };

  return (
    <div className="app">
      {/* Hamburger button for mobile */}
      <button 
        className="hamburger-btn" 
        onClick={toggleSidebar}
        aria-label="Toggle menu"
        style={{
          position: 'fixed',
          top: '1rem',
          left: '1rem',
          zIndex: 1000,
          fontSize: '1.5rem',
          background: '#2c7da0',
          color: 'white',
          border: 'none',
          borderRadius: '0.5rem',
          padding: '0.5rem',
          cursor: 'pointer'
        }}
      >
        ☰
      </button>

      {/* Overlay for mobile sidebar */}
      {state.isSidebarOpen && (
        <div 
          className="overlay"
          onClick={() => dispatch({ type: 'CLOSE_SIDEBAR' })}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 998
          }}
        />
      )}

      {/* Sidebar with builder and participant management */}
      <div className={`builder-panel ${state.isSidebarOpen ? 'open' : ''}`}>
        <QuestionBuilder />
        <div className="questions-list-header">📋 Questions</div>
        <QuestionsList onEditQuestion={handleEditQuestion} />
        <ParticipantManager />
      </div>

      {/* Main content area */}
      <div className="main-content">
        <div className="app-container">
          <Toolbar />
          
          <div className="quiz-main">
            <div className="preview-panel">
              <div className="section-title">🎯 Quiz</div>
              <div id="slideQuizContainer">
                <QuizDisplay />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grading Modal */}
      <GradingModal
        isOpen={gradingModalOpen}
        question={currentQuestion}
        userAnswer={currentUserAnswer}
        onClose={() => setGradingModalOpen(false)}
      />

      {/* Scoreboard */}
      <Scoreboard />
      
      {/* Toggle Scoreboard Button */}
      <button
        onClick={() => setShowScoreboard(!showScoreboard)}
        className="scoreboard-toggle"
        style={{
          position: 'fixed',
          bottom: '1rem',
          right: '1rem',
          zIndex: 999,
          padding: '0.75rem 1.5rem',
          background: '#2c7da0',
          color: 'white',
          border: 'none',
          borderRadius: '2rem',
          cursor: 'pointer',
          fontSize: '1rem'
        }}
      >
        📊 {showScoreboard ? 'Hide Scoreboard' : 'Show Scoreboard'} 🏆
      </button>
    </div>
  );
}
