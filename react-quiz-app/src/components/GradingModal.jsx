import { useState } from 'react';
import { useQuiz } from '../context/QuizContext';
import { generateId, escapeHtml, shuffleArray } from '../utils/helpers.js';

export default function GradingModal({ isOpen, question, userAnswer, onClose }) {
  const { state, dispatch } = useQuiz();
  const [notes, setNotes] = useState('');
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [selectedPoints, setSelectedPoints] = useState(null);

  const pointsOptions = [0.5, 1, 2, 3, 5, 7.5, 10];

  const handleSaveScore = () => {
    if (!selectedParticipant || selectedPoints === null) {
      alert('Please select a participant and points');
      return;
    }

    // Add participant if doesn't exist
    if (!state.participants.find(p => p.name === selectedParticipant)) {
      dispatch({ type: 'ADD_PARTICIPANT', payload: selectedParticipant });
    }

    // Create score record
    const scoreRecord = {
      id: generateId(),
      participantName: selectedParticipant,
      questionId: question?.id,
      questionText: question?.text,
      pointsEarned: selectedPoints,
      notes: notes.trim(),
      timestamp: new Date().toISOString()
    };

    dispatch({ type: 'ADD_SCORE_RECORD', payload: scoreRecord });
    
    // Reset form
    setNotes('');
    setSelectedParticipant(null);
    setSelectedPoints(null);
    onClose();
  };

  if (!isOpen || !question) return null;

  return (
    <div className={`modal fullscreen-module ${isOpen ? 'active' : ''}`} role="dialog" aria-modal="true">
      <div className="modal-content fullscreen-content">
        <div className="modal-header module-header">
          <h2>📝 Grade Answer</h2>
          <span 
            className="modal-close" 
            onClick={onClose}
            style={{cursor: 'pointer'}}
            aria-label="Close"
          >
            ×
          </span>
        </div>
        
        <div className="modal-body">
          <div style={{marginBottom: '1rem'}}>
            <strong>Question:</strong> {escapeHtml(question.text)}<br/>
            <strong>Answer:</strong> {escapeHtml(JSON.stringify(userAnswer))}<br/>
            <small>Select participant and points below.</small>
          </div>
          
          <div className="participant-buttons-container">
            <label>👤 Select Participant & Points</label>
            
            {!state.participants.length ? (
              <div style={{color: '#666', textAlign: 'center', padding: '2rem'}}>
                No participants yet. Add participants from the sidebar.
              </div>
            ) : (
              <div id="participantButtonsList" className="participant-buttons-list">
                {state.participants.map(p => (
                  <div key={p.name} className="participant-btn">
                    <div 
                      className={`participant-name ${selectedParticipant === p.name ? 'selected' : ''}`}
                      onClick={() => setSelectedParticipant(p.name)}
                      style={{cursor: 'pointer', marginBottom: '0.5rem'}}
                    >
                      👤 {escapeHtml(p.name)}
                    </div>
                    <div className="points-options">
                      {pointsOptions.map(pts => (
                        <span
                          key={pts}
                          className={`points-badge ${selectedParticipant === p.name && selectedPoints === pts ? 'selected' : ''}`}
                          onClick={() => {
                            setSelectedParticipant(p.name);
                            setSelectedPoints(pts);
                          }}
                          style={{
                            cursor: 'pointer',
                            margin: '0.25rem',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.25rem',
                            background: selectedParticipant === p.name && selectedPoints === pts ? '#2c7da0' : '#e0e0e0',
                            color: selectedParticipant === p.name && selectedPoints === pts ? 'white' : 'black'
                          }}
                        >
                          +{pts}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="input-group" style={{marginTop: '1rem'}}>
            <label>📝 Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows="2"
              style={{width: '100%', padding: '0.5rem', borderRadius: '0.5rem'}}
            />
          </div>
        </div>
        
        <div className="modal-footer">
          <button onClick={handleSaveScore} className="btn-primary">
            💾 Save Score
          </button>
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
