import { useState } from 'react';
import { useQuiz } from '../context/QuizContext';
import { generateId, escapeHtml } from '../utils/helpers.js';

export default function ParticipantManager() {
  const { state, dispatch } = useQuiz();
  const [newParticipantName, setNewParticipantName] = useState('');

  const handleAddParticipant = () => {
    const name = newParticipantName.trim();
    if (!name) {
      alert('Enter a name');
      return;
    }
    
    if (state.participants.find(p => p.name === name)) {
      alert('Participant already exists');
      return;
    }
    
    dispatch({ type: 'ADD_PARTICIPANT', payload: name });
    setNewParticipantName('');
  };

  const handleDeleteParticipant = (name) => {
    if (confirm(`Delete ${name}?`)) {
      dispatch({ type: 'DELETE_PARTICIPANT', payload: name });
    }
  };

  return (
    <div className="participant-management">
      <div className="section-title" style={{fontSize: '1.2rem'}}>👥 Participants</div>
      
      <div style={{display: 'flex', gap: '0.5rem', marginBottom: '1rem'}}>
        <input
          type="text"
          value={newParticipantName}
          onChange={(e) => setNewParticipantName(e.target.value)}
          placeholder="Name / Number"
          style={{flex: 1, padding: '0.5rem', borderRadius: '0.5rem'}}
          onKeyPress={(e) => e.key === 'Enter' && handleAddParticipant()}
        />
        <button 
          onClick={handleAddParticipant} 
          className="btn-sm"
        >
          ➕ Add
        </button>
      </div>
      
      <div id="participantsList" className="participants-list-sidebar">
        {!state.participants.length ? (
          <div style={{color: '#666'}}>No participants yet</div>
        ) : (
          state.participants.map(p => {
            const totalScore = state.scoreRecords
              .filter(r => r.participantName === p.name)
              .reduce((sum, r) => sum + r.pointsEarned, 0);
            
            return (
              <div key={p.name} className="participant-item-sidebar" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem'}}>
                <span>👤 {escapeHtml(p.name)}</span>
                <span style={{background: '#ffc107', padding: '0.2rem 0.5rem', borderRadius: '1rem'}}>
                  {totalScore} pts
                </span>
                <button
                  className="delete-participant-side"
                  onClick={() => handleDeleteParticipant(p.name)}
                  style={{background: '#dc3545', border: 'none', borderRadius: '1rem', padding: '0.2rem 0.5rem', marginLeft: '0.5rem'}}
                >
                  🗑️
                </button>
              </div>
            );
          })
        )}
      </div>
      
      <button 
        onClick={() => {
          if (confirm('Delete all questions?')) {
            dispatch({ type: 'RESET_ALL_QUESTIONS' });
          }
        }}
        className="btn-danger"
        style={{width: '100%', marginTop: '1rem'}}
      >
        🗑️ Reset All Questions
      </button>
      
      <button 
        onClick={() => {
          if (confirm('Reset all scores?')) {
            dispatch({ type: 'RESET_ALL_SCORES' });
          }
        }}
        className="btn-danger"
        style={{width: '100%', marginTop: '0.5rem', background: '#dc3545'}}
      >
        🔄 Reset All Scores
      </button>
      
      <div className="section-title" style={{fontSize: '1.2rem', marginTop: '1rem'}}>⚙️ Settings</div>
      <GitHubSettings />
    </div>
  );
}

function GitHubSettings() {
  const { state, dispatch } = useQuiz();
  const [owner, setOwner] = useState(state.githubConfig.owner);
  const [repo, setRepo] = useState(state.githubConfig.repo);
  const [token, setToken] = useState(state.githubConfig.token);

  const handleSave = () => {
    if (!owner.trim() || !repo.trim() || !token.trim()) {
      alert('Please fill in all GitHub settings');
      return;
    }
    
    const config = {
      owner: owner.trim(),
      repo: repo.trim(),
      branch: 'main',
      token: token.trim()
    };
    
    dispatch({ type: 'SAVE_GITHUB_CONFIG', payload: config });
    alert('✅ GitHub settings saved!');
  };

  return (
    <div>
      <div className="input-group">
        <label>GitHub Owner</label>
        <input
          type="text"
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          placeholder="your-username"
          style={{width: '100%', padding: '0.5rem', marginTop: '0.25rem'}}
        />
      </div>
      
      <div className="input-group">
        <label>GitHub Repo</label>
        <input
          type="text"
          value={repo}
          onChange={(e) => setRepo(e.target.value)}
          placeholder="your-repo-name"
          style={{width: '100%', padding: '0.5rem', marginTop: '0.25rem'}}
        />
      </div>
      
      <div className="input-group">
        <label>GitHub Token (fine-grained PAT)</label>
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="ghp_..."
          style={{width: '100%', padding: '0.5rem', marginTop: '0.25rem'}}
        />
      </div>
      
      <button 
        onClick={handleSave}
        className="btn-primary"
        style={{width: '100%', marginTop: '0.5rem'}}
      >
        💾 Save GitHub Settings
      </button>
    </div>
  );
}
