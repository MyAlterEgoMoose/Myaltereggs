import { useState } from 'react';
import { useQuiz } from '../context/QuizContext';
import { generateId, escapeHtml } from '../utils/helpers.js';

export default function Scoreboard() {
  const { state, dispatch } = useQuiz();
  const [activeTab, setActiveTab] = useState('rankings');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('score');
  const [selectedParticipant, setSelectedParticipant] = useState('');

  // Calculate participant totals
  const calculateTotals = () => {
    return state.participants.map(p => {
      const records = state.scoreRecords.filter(r => r.participantName === p.name);
      const totalScore = records.reduce((sum, r) => sum + r.pointsEarned, 0);
      return { ...p, totalScore, answerCount: records.length };
    });
  };

  const participantsWithTotals = calculateTotals();

  // Filter and sort participants
  const filteredParticipants = participantsWithTotals
    .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'score') {
        return b.totalScore - a.totalScore;
      }
      return a.name.localeCompare(b.name);
    });

  const handleResetScores = () => {
    if (confirm('Reset all scores?')) {
      dispatch({ type: 'RESET_ALL_SCORES' });
    }
  };

  const getParticipantDetails = (name) => {
    return state.scoreRecords.filter(r => r.participantName === name);
  };

  const renderRankings = () => {
    if (!state.scoreRecords.length) {
      return <div className="empty-message">No scores yet</div>;
    }

    return (
      <div>
        <div style={{display: 'flex', gap: '0.5rem', marginBottom: '1rem'}}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="🔍 Search"
            style={{flex: 1, padding: '0.5rem', borderRadius: '0.5rem'}}
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{padding: '0.5rem', borderRadius: '0.5rem'}}
          >
            <option value="score">Sort by Score</option>
            <option value="name">Sort by Name</option>
          </select>
        </div>
        
        {filteredParticipants.map((p, index) => {
          const records = state.scoreRecords.filter(r => r.participantName === p.name);
          const avgScore = records.length ? (p.totalScore / records.length).toFixed(1) : 0;
          let rankClass = '';
          let medal = '';
          
          if (index === 0 && !searchTerm) {
            rankClass = 'top-1';
            medal = '👑';
          } else if (index === 1 && !searchTerm) {
            rankClass = 'top-2';
            medal = '🥈';
          } else if (index === 2 && !searchTerm) {
            rankClass = 'top-3';
            medal = '🥉';
          }

          return (
            <div 
              key={p.name} 
              className={`rank-card ${rankClass}`}
              onClick={() => {
                setSelectedParticipant(p.name);
                setActiveTab('details');
              }}
              style={{cursor: 'pointer', marginBottom: '0.5rem'}}
            >
              <div className="rank-header" style={{display: 'flex', justifyContent: 'space-between'}}>
                <div><strong>{medal || (index + 1)}. {escapeHtml(p.name)}</strong></div>
                <div className="rank-score">{p.totalScore} pts</div>
              </div>
              <div style={{fontSize: '0.8rem'}}>
                📝 {records.length} answers | avg {avgScore} pts
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderDetails = () => {
    if (!selectedParticipant) {
      return (
        <div>
          <select
            value={selectedParticipant}
            onChange={(e) => setSelectedParticipant(e.target.value)}
            style={{width: '100%', padding: '0.5rem', borderRadius: '1rem', marginBottom: '1rem'}}
          >
            <option value="">-- Select Participant --</option>
            {participantsWithTotals.map(p => (
              <option key={p.name} value={p.name}>
                {escapeHtml(p.name)} ({p.totalScore} pts)
              </option>
            ))}
          </select>
          <div className="empty-message">Select a participant to view details</div>
        </div>
      );
    }

    const records = getParticipantDetails(selectedParticipant);
    const totalScore = records.reduce((sum, r) => sum + r.pointsEarned, 0);

    return (
      <div>
        <div style={{background: '#2c7da0', color: 'white', padding: '1rem', borderRadius: '1rem', marginBottom: '1rem'}}>
          <h3>{escapeHtml(selectedParticipant)}</h3>
          <div style={{fontSize: '2rem'}}>{totalScore} pts</div>
          <div>{records.length} questions</div>
        </div>
        
        {records.map((r, i) => (
          <div 
            key={r.id} 
            style={{background: '#f8fafc', padding: '0.8rem', borderRadius: '0.8rem', marginBottom: '0.5rem'}}
          >
            <div><strong>Q{i + 1}:</strong> {escapeHtml(r.questionText.substring(0, 70))}</div>
            <div>🏆 {r.pointsEarned} pts</div>
            {r.notes && <div style={{fontSize: '0.75rem'}}>💬 {escapeHtml(r.notes)}</div>}
          </div>
        ))}
      </div>
    );
  };

  const renderStats = () => {
    if (!state.scoreRecords.length) {
      return <div className="empty-message">No data available</div>;
    }

    const totalParticipants = state.participants.length;
    const totalScores = state.scoreRecords.length;
    const totalPoints = state.scoreRecords.reduce((sum, r) => sum + r.pointsEarned, 0);
    const avgPerQuestion = totalScores ? (totalPoints / totalScores).toFixed(1) : 0;
    
    const topPerformer = participantsWithTotals.reduce((best, p) => 
      (p.totalScore || 0) > (best.totalScore || 0) ? p : best, 
      { totalScore: 0 }
    );

    // Group by question
    const questionStats = {};
    state.scoreRecords.forEach(r => {
      if (!questionStats[r.questionId]) {
        questionStats[r.questionId] = { text: r.questionText, points: [], total: 0, count: 0 };
      }
      questionStats[r.questionId].points.push(r.pointsEarned);
      questionStats[r.questionId].total += r.pointsEarned;
      questionStats[r.questionId].count++;
    });

    return (
      <div>
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem'}}>
          <div className="stat-card" style={{background: '#f8fafc', padding: '1rem', borderRadius: '1rem'}}>
            <div className="stat-value" style={{fontSize: '2rem', fontWeight: 'bold'}}>{totalParticipants}</div>
            <div>Participants</div>
          </div>
          <div className="stat-card" style={{background: '#f8fafc', padding: '1rem', borderRadius: '1rem'}}>
            <div className="stat-value" style={{fontSize: '2rem'}}>{totalPoints}</div>
            <div>Total Points</div>
          </div>
        </div>
        
        {topPerformer.name && (
          <div style={{background: '#fff9e6', padding: '1rem', borderRadius: '1rem', margin: '1rem 0', textAlign: 'center'}}>
            <div>👑 TOP PERFORMER</div>
            <div style={{fontSize: '1.2rem', fontWeight: 'bold'}}>{escapeHtml(topPerformer.name)}</div>
            <div>{topPerformer.totalScore} points</div>
          </div>
        )}
        
        <div><strong>📊 Question Averages</strong></div>
        {Object.values(questionStats).map(q => (
          <div 
            key={q.text} 
            style={{background: '#f8fafc', marginTop: '0.5rem', padding: '0.5rem', borderRadius: '0.8rem'}}
          >
            <div>{escapeHtml(q.text.substring(0, 60))}</div>
            <div>Avg: {(q.total / q.count).toFixed(1)} pts ({q.count} responses)</div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div id="scoreboard" className="scoreboard">
      <div className="scoreboard-header">
        <h3>🏆 LIVE SCOREBOARD</h3>
        <button 
          onClick={() => dispatch({ type: 'CLOSE_SIDEBAR' })}
          style={{background: 'none', border: 'none', color: 'white', fontSize: '1.5rem'}}
          aria-label="Close scoreboard"
        >
          ✕
        </button>
      </div>
      
      <div className="scoreboard-tabs" role="tablist">
        <button 
          className={`tab-btn ${activeTab === 'rankings' ? 'active' : ''}`}
          onClick={() => setActiveTab('rankings')}
          role="tab"
        >
          🏅 Rankings
        </button>
        <button 
          className={`tab-btn ${activeTab === 'details' ? 'active' : ''}`}
          onClick={() => setActiveTab('details')}
          role="tab"
        >
          📊 Details
        </button>
        <button 
          className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
          role="tab"
        >
          📈 Stats
        </button>
      </div>
      
      <div id="rankingsTab" className={`tab-content ${activeTab === 'rankings' ? 'active' : ''}`}>
        {renderRankings()}
      </div>
      
      <div id="detailsTab" className={`tab-content ${activeTab === 'details' ? 'active' : ''}`}>
        {renderDetails()}
      </div>
      
      <div id="statsTab" className={`tab-content ${activeTab === 'stats' ? 'active' : ''}`}>
        {renderStats()}
      </div>
      
      <div className="scoreboard-footer">
        <button onClick={handleResetScores} className="btn-sm" style={{background: '#dc3545'}}>
          Reset Scores
        </button>
      </div>
    </div>
  );
}
