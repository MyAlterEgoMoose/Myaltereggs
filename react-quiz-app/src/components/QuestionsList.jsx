import { useState } from 'react';
import { useQuiz } from '../context/QuizContext';
import { escapeHtml, shuffleArray } from '../utils/helpers.js';

export default function QuestionsList({ onEditQuestion }) {
  const { state, dispatch } = useQuiz();

  const handleDelete = (id) => {
    if (confirm('Delete this question?')) {
      dispatch({ type: 'DELETE_QUESTION', payload: id });
    }
  };

  const handleEdit = (question) => {
    dispatch({ type: 'SET_EDITING_QUESTION', payload: { id: question.id, type: question.type } });
    onEditQuestion(question);
  };

  const handleSelectQuestion = (index) => {
    dispatch({ type: 'SET_CURRENT_SLIDE', payload: index });
  };

  if (!state.questions.length) {
    return <div style={{padding: '1rem'}}>No questions yet. Create your first question!</div>;
  }

  return (
    <div className="questions-list">
      {state.questions.map((q, i) => (
        <div 
          key={q.id} 
          className="question-card"
          onClick={() => handleSelectQuestion(i)}
          style={{cursor: 'pointer', marginBottom: '0.5rem'}}
        >
          <div>
            <strong>{i + 1}.</strong> {escapeHtml(q.text.substring(0, 50))}
            {q.image && ' 🖼️'}
          </div>
          <div>
            <button 
              className="edit-q" 
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(q);
              }}
              style={{marginRight: '0.5rem'}}
            >
              ✏️
            </button>
            <button 
              className="delete-q" 
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(q.id);
              }}
            >
              🗑️
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
