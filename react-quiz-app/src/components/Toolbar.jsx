import { useState } from 'react';
import { useQuiz } from '../context/QuizContext';
import { shuffleArray } from '../utils/helpers.js';

export default function Toolbar() {
  const { state, dispatch } = useQuiz();
  const fileInputRef = useState(null);

  const handleExport = () => {
    if (state.uploadedImages.length > 0 && (!state.githubConfig.owner || !state.githubConfig.repo || !state.githubConfig.token)) {
      alert('⚠️ Configure GitHub settings first (owner, repo, token)');
      return;
    }

    const shuffledQuestions = shuffleArray([...state.questions]);
    const data = {
      questions: shuffledQuestions,
      participants: state.participants,
      scoreRecords: state.scoreRecords,
      uploadedImages: state.uploadedImages
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'quiz_' + Date.now() + '.json';
    a.click();
    URL.revokeObjectURL(url);
    alert('✅ Exported with ' + state.uploadedImages.length + ' image(s)');
  };

  const handleShuffle = () => {
    const shuffled = shuffleArray([...state.questions]);
    dispatch({ type: 'SHUFFLE_QUESTIONS', payload: shuffled });
    alert('Questions shuffled');
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        dispatch({ type: 'IMPORT_DATA', payload: data });
        alert('Imported successfully');
      } catch (err) {
        alert('Invalid file format');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="toolbar">
      <button onClick={handleExport} className="btn-export">
        💾 Export
      </button>
      
      <button onClick={handleShuffle} className="btn-secondary">
        🔀 Shuffle Questions
      </button>
      
      <label className="file-input-label" htmlFor="importFile" style={{cursor: 'pointer', padding: '0.5rem 1rem', background: '#6c757d', color: 'white', borderRadius: '0.5rem'}}>
        📂 Import
      </label>
      <input
        type="file"
        id="importFile"
        accept=".json"
        onChange={handleImport}
        style={{display: 'none'}}
      />
    </div>
  );
}
