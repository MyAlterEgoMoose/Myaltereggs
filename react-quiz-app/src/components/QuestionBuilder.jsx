import { useState } from 'react';
import { useQuiz } from '../context/QuizContext';
import { generateId, escapeHtml, toRoman } from '../utils/helpers.js';

export default function QuestionBuilder() {
  const { state, dispatch } = useQuiz();
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState([{ text: '', isCorrect: false }, { text: '', isCorrect: false }]);
  const [correctAnswers, setCorrectAnswers] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [sliderMin, setSliderMin] = useState('');
  const [sliderMax, setSliderMax] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleAddOption = () => {
    setOptions([...options, { text: '', isCorrect: false }]);
  };

  const handleRemoveOption = (index) => {
    if (options.length > 1) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index, field, value) => {
    const newOptions = [...options];
    newOptions[index][field] = value;
    setOptions(newOptions);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target.result);
      reader.readAsDataURL(file);
    } else {
      setImageFile(null);
      setImagePreview(null);
    }
  };

  const validateAndGatherData = () => {
    const text = questionText.trim();
    if (!text) {
      alert('Enter question text');
      return null;
    }

    let questionData = null;

    if (state.currentType === 'open') {
      const answers = correctAnswers.trim().split('\n').map(l => l.trim()).filter(l => l);
      if (answers.length === 0) {
        alert('Enter at least one correct answer');
        return null;
      }
      questionData = {
        id: state.editingId || generateId(),
        text,
        type: 'open',
        correctAnswers: answers,
        caseSensitive
      };
    } else if (state.currentType === 'slider') {
      const minVal = parseInt(sliderMin);
      const maxVal = parseInt(sliderMax);
      if (isNaN(minVal) || isNaN(maxVal)) {
        alert('Enter min and max values');
        return null;
      }
      if (!Number.isInteger(minVal) || !Number.isInteger(maxVal)) {
        alert('Min and max must be integers');
        return null;
      }
      if (minVal >= maxVal) {
        alert('Min must be less than max');
        return null;
      }
      questionData = {
        id: state.editingId || generateId(),
        text,
        type: 'slider',
        sliderMin: minVal,
        sliderMax: maxVal
      };
    } else {
      const opts = options.map(o => ({ text: o.text.trim(), isCorrect: o.isCorrect }));
      if (opts.some(o => !o.text)) {
        alert('All options need text');
        return null;
      }
      if (opts.length < 2) {
        alert('At least 2 options required');
        return null;
      }
      if (state.currentType === 'single' && opts.filter(o => o.isCorrect).length !== 1) {
        alert('Single choice: exactly one correct answer');
        return null;
      }
      if (state.currentType === 'multiple' && !opts.some(o => o.isCorrect)) {
        alert('Select at least one correct answer');
        return null;
      }
      questionData = {
        id: state.editingId || generateId(),
        text,
        type: state.currentType,
        options: opts
      };
    }

    return questionData;
  };

  const handleSave = async () => {
    const questionData = validateAndGatherData();
    if (!questionData) return;

    if (imageFile) {
      setUploading(true);
      try {
        const { uploadImageToGitHub } = await import('../utils/helpers');
        const imageUrl = await uploadImageToGitHub(imageFile, state.githubConfig);
        questionData.image = { fileName: imageFile.name, imageUrl };
        
        if (state.editingId) {
          dispatch({ type: 'UPDATE_QUESTION', payload: questionData });
        } else {
          dispatch({ type: 'ADD_QUESTION', payload: questionData });
        }
      } catch (err) {
        alert('Image upload failed: ' + err.message);
        questionData.image = null;
        if (state.editingId) {
          // Preserve existing image when editing
          const existingQ = state.questions.find(q => q.id === state.editingId);
          if (existingQ?.image) {
            questionData.image = existingQ.image;
          }
          dispatch({ type: 'UPDATE_QUESTION', payload: questionData });
        } else {
          dispatch({ type: 'ADD_QUESTION', payload: questionData });
        }
      }
      setUploading(false);
    } else {
      // Preserve existing image when editing without new image
      if (state.editingId) {
        const existingQ = state.questions.find(q => q.id === state.editingId);
        if (existingQ?.image) {
          questionData.image = existingQ.image;
        }
        dispatch({ type: 'UPDATE_QUESTION', payload: questionData });
      } else {
        dispatch({ type: 'ADD_QUESTION', payload: questionData });
      }
    }

    clearForm();
  };

  const clearForm = () => {
    setQuestionText('');
    setOptions([{ text: '', isCorrect: false }, { text: '', isCorrect: false }]);
    setCorrectAnswers('');
    setSliderMin('');
    setSliderMax('');
    setCaseSensitive(false);
    setImageFile(null);
    setImagePreview(null);
    dispatch({ type: 'CLEAR_FORM' });
    dispatch({ type: 'SET_CURRENT_TYPE', payload: 'single' });
  };

  const handleTypeToggle = (type) => {
    dispatch({ type: 'SET_CURRENT_TYPE', payload: type });
    clearForm();
  };

  return (
    <div className="builder-panel" id="builderPanel">
      <button 
        className="close-sidebar" 
        onClick={() => dispatch({ type: 'CLOSE_SIDEBAR' })}
        aria-label="Close sidebar"
      >
        ✕
      </button>
      
      <div className="section-title">✏️ Build Test</div>
      
      <div className="question-form">
        <div className="input-group">
          <label>📌 Question Text</label>
          <input 
            type="text" 
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            placeholder="e.g., What is capital of France?"
          />
        </div>

        <div className="input-group">
          <label>🖼️ Attach Image (optional)</label>
          <div className="image-upload-wrapper">
            <input 
              type="file" 
              id="questionImage" 
              accept="image/*" 
              className="image-input"
              onChange={handleImageChange}
            />
            <button type="button" className="btn-upload">📤 Upload Image</button>
          </div>
          {imagePreview && (
            <div id="imagePreviewContainer">
              <img src={imagePreview} alt="Preview" style={{maxWidth: '200px', maxHeight: '150px', borderRadius: '0.5rem', marginTop: '0.5rem'}} />
            </div>
          )}
        </div>

        {state.currentType !== 'open' && state.currentType !== 'slider' && (
          <div id="optionsGroup">
            <label>🔘 Options</label>
            <div id="optionsContainer">
              {options.map((opt, index) => (
                <div key={index} className="option-row">
                  <input
                    type="text"
                    className="option-text"
                    value={opt.text}
                    onChange={(e) => handleOptionChange(index, 'text', e.target.value)}
                    placeholder={`Option ${index + 1}`}
                  />
                  <input
                    type="checkbox"
                    className="option-correct"
                    checked={opt.isCorrect}
                    onChange={(e) => handleOptionChange(index, 'isCorrect', e.target.checked)}
                  />
                  <span>✓</span>
                  <button type="button" className="btn-icon" onClick={() => handleRemoveOption(index)}>✖</button>
                </div>
              ))}
            </div>
            <button type="button" className="btn-icon" onClick={handleAddOption}>+ Add Option</button>
          </div>
        )}

        {state.currentType === 'open' && (
          <div id="openAnswerGroup">
            <label>✏️ Correct Answers (reference)</label>
            <textarea 
              value={correctAnswers}
              onChange={(e) => setCorrectAnswers(e.target.value)}
              rows="2"
            />
            <div>
              <input 
                type="checkbox" 
                id="caseSensitive"
                checked={caseSensitive}
                onChange={(e) => setCaseSensitive(e.target.checked)}
              />
              <label htmlFor="caseSensitive">Case sensitive</label>
            </div>
          </div>
        )}

        {state.currentType === 'slider' && (
          <div id="sliderRangeGroup">
            <label>📊 Slider Range (integers)</label>
            <div style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
              <input 
                type="number" 
                value={sliderMin}
                onChange={(e) => setSliderMin(e.target.value)}
                placeholder="Min" 
                style={{flex: 1}}
              />
              <span>to</span>
              <input 
                type="number" 
                value={sliderMax}
                onChange={(e) => setSliderMax(e.target.value)}
                placeholder="Max" 
                style={{flex: 1}}
              />
            </div>
          </div>
        )}

        <div className="type-toggle" id="typeToggleGroup">
          {['single', 'multiple', 'open', 'slider'].map(type => (
            <div 
              key={type}
              data-type={type}
              className={`type-option ${state.currentType === type ? 'active' : ''}`}
              onClick={() => handleTypeToggle(type)}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </div>
          ))}
        </div>

        <div className="form-actions">
          <button className="btn-primary" onClick={handleSave} disabled={uploading}>
            {uploading ? '⏳ Uploading...' : (state.editingId ? '✏️ Update' : '➕ Save')}
          </button>
          <button className="btn-secondary" onClick={clearForm}>🗑️ Clear</button>
        </div>
      </div>
    </div>
  );
}
