import { useState } from 'react';
import { useQuiz } from '../context/QuizContext';
import { escapeHtml, toRoman, isAnswerCorrect } from '../utils/helpers.js';

export default function QuizDisplay() {
  const { state, dispatch } = useQuiz();
  const [userAnswer, setUserAnswer] = useState(null);

  const handlePrev = () => {
    if (state.currentSlideIndex > 0) {
      dispatch({ type: 'SET_CURRENT_SLIDE', payload: state.currentSlideIndex - 1 });
      setUserAnswer(null);
    }
  };

  const handleNext = () => {
    if (state.currentSlideIndex < state.questions.length - 1) {
      dispatch({ type: 'SET_CURRENT_SLIDE', payload: state.currentSlideIndex + 1 });
      setUserAnswer(null);
    }
  };

  const handleSubmitAnswer = () => {
    const q = state.questions[state.currentSlideIndex];
    let answer = null;

    if (q.type === 'open') {
      answer = userAnswer || '';
    } else if (q.type === 'slider') {
      answer = parseInt(userAnswer);
    } else {
      answer = userAnswer || [];
    }

    if ((q.type !== 'open' && q.type !== 'slider' && (!answer || answer.length === 0)) || 
        (q.type === 'open' && !answer?.trim())) {
      alert('Provide an answer');
      return;
    }

    const correct = isAnswerCorrect(q, answer);
    alert(correct ? '✅ Matches expected! Open grading panel.' : '❌ Differs from expected. Open grading panel.');
    
    // Open grading modal would be handled by parent component
    if (window.openGradingModal) {
      window.openGradingModal(q, answer);
    }
  };

  const handleSliderChange = (e) => {
    setUserAnswer(parseInt(e.target.value));
  };

  const handleOptionSelect = (index, type) => {
    if (type === 'single') {
      setUserAnswer([index]);
    } else {
      setUserAnswer(prev => {
        const current = prev || [];
        if (current.includes(index)) {
          return current.filter(i => i !== index);
        }
        return [...current, index];
      });
    }
  };

  if (!state.questions.length) {
    return <div className="empty-message">Add questions to start the quiz</div>;
  }

  const q = state.questions[state.currentSlideIndex];

  return (
    <div className="slide-card">
      <div className="slide-header">
        <span>Q{state.currentSlideIndex + 1}/{state.questions.length}</span>
        <span>⭐ Teacher decides points</span>
      </div>
      
      <div className="slide-question-text">{escapeHtml(q.text)}</div>
      
      {q.image && q.image.imageUrl && (
        <img 
          src={q.image.imageUrl} 
          alt="Question image" 
          style={{maxWidth: '100%', maxHeight: '300px', borderRadius: '1rem', marginBottom: '1rem'}} 
        />
      )}

      {q.type === 'open' && (
        <textarea
          value={userAnswer || ''}
          onChange={(e) => setUserAnswer(e.target.value)}
          rows="4"
          style={{width: '100%', padding: '0.8rem', borderRadius: '1rem'}}
          placeholder="Type your answer here..."
        />
      )}

      {q.type === 'slider' && (
        <div style={{margin: '2rem 0', position: 'relative'}}>
          <input
            type="range"
            min={q.sliderMin}
            max={q.sliderMax}
            value={userAnswer ?? q.sliderMin}
            onChange={handleSliderChange}
            style={{width: '100%'}}
          />
          <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '1.2rem'}}>
            <span>Min: <strong>{toRoman(q.sliderMin)}</strong></span>
            <div className="slider-bubble" style={{position: 'absolute', left: '50%', transform: 'translateX(-50%)'}}>
              {toRoman(userAnswer ?? q.sliderMin)}
            </div>
            <span>Max: <strong>{toRoman(q.sliderMax)}</strong></span>
          </div>
        </div>
      )}

      {(q.type === 'single' || q.type === 'multiple') && (
        <div>
          {q.options.map((opt, i) => (
            <div key={i} className="slide-option">
              <input
                type={q.type === 'single' ? 'radio' : 'checkbox'}
                name="quizOption"
                value={i}
                checked={(userAnswer || []).includes(i)}
                onChange={() => handleOptionSelect(i, q.type)}
              />
              <label>{escapeHtml(opt.text)}</label>
            </div>
          ))}
        </div>
      )}

      <button className="submit-answer-btn" onClick={handleSubmitAnswer}>
        📝 Submit & Grade
      </button>

      <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '1rem'}}>
        <button 
          className="nav-btn" 
          onClick={handlePrev} 
          disabled={state.currentSlideIndex === 0}
        >
          ← Prev
        </button>
        <span>{state.currentSlideIndex + 1}/{state.questions.length}</span>
        <button 
          className="nav-btn" 
          onClick={handleNext} 
          disabled={state.currentSlideIndex === state.questions.length - 1}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
