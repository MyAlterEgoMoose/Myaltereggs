// Teacher Grading System - Quiz with Scoreboard (Refactored)
(function() {
    'use strict';
    const state = { questions: [], participants: [], scoreRecords: [], currentSlideIndex: 0, editingId: null, currentType: 'single', isSidebarOpen: false };
    function generateId() { return Date.now() + '-' + Math.random().toString(36).substr(2, 8); }
    function escapeHtml(str) { if (!str) return ''; return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m])); }
    function toRoman(num) {
        if (num <= 0 || num > 3999) return num.toString();
        const roman = [
            { value: 1000, symbol: 'M' }, { value: 900, symbol: 'CM' },
            { value: 500, symbol: 'D' }, { value: 400, symbol: 'CD' },
            { value: 100, symbol: 'C' }, { value: 90, symbol: 'XC' },
            { value: 50, symbol: 'L' }, { value: 40, symbol: 'XL' },
            { value: 10, symbol: 'X' }, { value: 9, symbol: 'IX' },
            { value: 5, symbol: 'V' }, { value: 4, symbol: 'IV' },
            { value: 1, symbol: 'I' }
        ];
        let result = '';
        for (let i = 0; i < roman.length; i++) {
            while (num >= roman[i].value) {
                result += roman[i].symbol;
                num -= roman[i].value;
            }
        }
        return result;
    }
    function showMessage(msg, isError = false) { let d = document.querySelector('.status-msg'); if (d) d.remove(); let div = document.createElement('div'); div.className = 'status-msg'; div.style.background = isError ? '#b91c1c' : '#2c7da0'; div.textContent = msg; document.body.appendChild(div); setTimeout(() => div.remove(), 3000); }
    function celebrate() { if (typeof confetti === 'function') confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } }); }
    function isAnswerCorrect(q, ans) {
        if (q.type === 'open') { let u = (ans || '').trim(); if (!u) return false; let c = q.correctAnswers || []; let cs = q.caseSensitive || false; return c.some(x => cs ? u === x : u.toLowerCase() === x.toLowerCase()); }
        else if (q.type === 'slider') { let userVal = parseInt(ans); return !isNaN(userVal) && userVal >= q.sliderMin && userVal <= q.sliderMax; }
        else { let sel = ans || []; let ci = q.options.reduce((a, o, i) => { if (o.isCorrect) a.push(i); return a; }, []); if (q.type === 'single') return sel.length === 1 && ci.length === 1 && sel[0] === ci[0]; return sel.length === ci.length && sel.every(v => ci.includes(v)) && ci.every(c => sel.includes(c)); }
    }
    function updateParticipantTotal(name) { let p = state.participants.find(p => p.name === name); if (p) { let t = state.scoreRecords.filter(r => r.participantName === name).reduce((s, r) => s + r.pointsEarned, 0); p.totalScore = t; } }
    function updateAllTotals() { state.participants.forEach(p => updateParticipantTotal(p.name)); }
    function renderParticipantsSidebar() { let c = document.getElementById('participantsList'); if (!c) return; if (!state.participants.length) { c.innerHTML = '<div style="color:#666;">No participants</div>'; return; } c.innerHTML = state.participants.map(p => '<div class="participant-item-sidebar"><span>👤 ' + escapeHtml(p.name) + '</span><span style="background:#ffc107;padding:0.2rem 0.5rem;border-radius:1rem;">' + (p.totalScore || 0) + ' pts</span><button class="delete-participant-side" data-name="' + escapeHtml(p.name) + '" style="background:#dc3545;border:none;border-radius:1rem;padding:0.2rem 0.5rem;">🗑️</button></div>').join(''); document.querySelectorAll('.delete-participant-side').forEach(b => b.addEventListener('click', () => { let n = b.dataset.name; if (confirm('Delete ' + n + '?')) { state.participants = state.participants.filter(p => p.name !== n); state.scoreRecords = state.scoreRecords.filter(r => r.participantName !== n); renderParticipantsSidebar(); renderScoreboard(); updateDatalist(); showMessage('Deleted ' + n); } })); }
    function updateDatalist() { let d = document.getElementById('participantsDatalist'); if (d) d.innerHTML = state.participants.map(p => '<option value="' + escapeHtml(p.name) + '">').join(''); }
    function renderQuestionsList() { let a = document.getElementById('questionsListArea'); if (!state.questions.length) { a.innerHTML = '<div style="padding:1rem;">No questions</div>'; return; } a.innerHTML = state.questions.map((q, i) => '<div class="question-card" data-idx="' + i + '"><div><strong>' + (i + 1) + '.</strong> ' + escapeHtml(q.text.substring(0, 50)) + '</div><div><button class="edit-q" data-id="' + q.id + '">✏️</button><button class="delete-q" data-id="' + q.id + '">🗑️</button></div></div>').join(''); document.querySelectorAll('.delete-q').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); let id = b.dataset.id; if (confirm('Delete?')) { state.questions = state.questions.filter(q => q.id !== id); if (state.currentSlideIndex >= state.questions.length) state.currentSlideIndex = Math.max(0, state.questions.length - 1); renderQuestionsList(); renderSlideQuiz(); showMessage('Deleted'); } })); document.querySelectorAll('.edit-q').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); let q = state.questions.find(q => q.id === b.dataset.id); if (q) { state.editingId = q.id; state.currentType = q.type; document.getElementById('questionText').value = q.text; updateTypeToggleUI(); if (q.type === 'open') { document.getElementById('correctAnswers').value = (q.correctAnswers || []).join('\n'); document.getElementById('caseSensitive').checked = q.caseSensitive || false; } else if (q.type === 'slider') { document.getElementById('sliderMin').value = toRoman(q.sliderMin); document.getElementById('sliderMax').value = toRoman(q.sliderMax); } else renderOptionInputs(q.options); openSidebar(); } })); document.querySelectorAll('.question-card').forEach(c => c.addEventListener('click', () => { let i = parseInt(c.dataset.idx); if (!isNaN(i)) { state.currentSlideIndex = i; renderSlideQuiz(); } })); }
    function renderOptionInputs(opts = null) { let c = document.getElementById('optionsContainer'); let arr = opts || [{ text: '', isCorrect: false }, { text: '', isCorrect: false }]; c.innerHTML = ''; arr.forEach((o, i) => { let d = document.createElement('div'); d.className = 'option-row'; d.innerHTML = '<input type="text" class="option-text" value="' + escapeHtml(o.text) + '" placeholder="Option ' + (i + 1) + '"><input type="checkbox" class="option-correct" ' + (o.isCorrect ? 'checked' : '') + '> <span>✓</span><button type="button" class="btn-icon">✖</button>'; d.querySelector('button').addEventListener('click', () => { if (c.children.length > 1) d.remove(); else showMessage('Need at least one option', true); }); c.appendChild(d); }); }
    function updateTypeToggleUI() { document.querySelectorAll('.type-option').forEach(o => { if (o.dataset.type === state.currentType) o.classList.add('active'); else o.classList.remove('active'); }); document.getElementById('optionsGroup').style.display = state.currentType === 'open' || state.currentType === 'slider' ? 'none' : 'block'; document.getElementById('openAnswerGroup').style.display = state.currentType === 'open' ? 'block' : 'none'; document.getElementById('sliderRangeGroup').style.display = state.currentType === 'slider' ? 'block' : 'none'; }
    function gatherFormData() { let t = document.getElementById('questionText').value.trim(); if (!t) { showMessage('Enter text', true); return null; } if (state.currentType === 'open') { let c = document.getElementById('correctAnswers').value.trim().split('\n').map(l => l.trim()).filter(l => l); return { text: t, type: 'open', correctAnswers: c, caseSensitive: document.getElementById('caseSensitive').checked }; } else if (state.currentType === 'slider') { let minVal = parseInt(document.getElementById('sliderMin').value); let maxVal = parseInt(document.getElementById('sliderMax').value); if (isNaN(minVal) || isNaN(maxVal)) { showMessage('Enter min and max values', true); return null; } if (!Number.isInteger(minVal) || !Number.isInteger(maxVal)) { showMessage('Min and max must be integers', true); return null; } if (minVal >= maxVal) { showMessage('Min must be less than max', true); return null; } return { text: t, type: 'slider', sliderMin: minVal, sliderMax: maxVal }; } else { let rows = document.querySelectorAll('#optionsContainer .option-row'); let opts = []; for (let r of rows) { let txt = r.querySelector('.option-text').value.trim(); if (!txt) { showMessage('All options need text', true); return null; } opts.push({ text: txt, isCorrect: r.querySelector('.option-correct').checked }); } if (opts.length < 2) { showMessage('At least 2 options', true); return null; } if (state.currentType === 'single' && opts.filter(o => o.isCorrect).length !== 1) { showMessage('Single: exactly one correct', true); return null; } if (state.currentType === 'multiple' && !opts.some(o => o.isCorrect)) { showMessage('Select at least one correct', true); return null; } return { text: t, options: opts, type: state.currentType }; } }
    function saveQuestion() { let d = gatherFormData(); if (!d) return; if (state.editingId) { let i = state.questions.findIndex(q => q.id === state.editingId); if (i !== -1) state.questions[i] = { ...state.questions[i], ...d, id: state.editingId }; state.editingId = null; } else state.questions.push({ id: generateId(), ...d }); clearForm(); renderQuestionsList(); renderSlideQuiz(); convertSliderToRoman(); showMessage('Saved'); if (window.innerWidth <= 768) closeSidebar(); }
    function convertSliderToRoman() {
        let minInput = document.getElementById('sliderMin');
        let maxInput = document.getElementById('sliderMax');
        if (minInput && maxInput) {
            let minVal = parseInt(minInput.value);
            let maxVal = parseInt(maxInput.value);
            if (!isNaN(minVal) && !isNaN(maxVal)) {
                minInput.value = toRoman(minVal);
                maxInput.value = toRoman(maxVal);
            }
        }
    }
    function clearForm() { document.getElementById('questionText').value = ''; renderOptionInputs(); document.getElementById('correctAnswers').value = ''; document.getElementById('sliderMin').value = ''; document.getElementById('sliderMax').value = ''; document.getElementById('caseSensitive').checked = false; state.editingId = null; state.currentType = 'single'; updateTypeToggleUI(); }
    function renderSlideQuiz() { let c = document.getElementById('slideQuizContainer'); if (!state.questions.length) { c.innerHTML = '<div class="empty-message">Add questions</div>'; return; } let q = state.questions[state.currentSlideIndex]; let h = '<div class="slide-card"><div class="slide-header"><span>Q' + (state.currentSlideIndex + 1) + '/' + state.questions.length + '</span><span>⭐ Teacher decides points</span></div><div class="slide-question-text">' + escapeHtml(q.text) + '</div>'; if (q.type === 'open') h += '<textarea id="userAnswerInput" rows="4" style="width:100%;padding:0.8rem;border-radius:1rem;"></textarea>'; else if (q.type === 'slider') { h += '<div style="margin:2rem 0;"><input type="range" id="sliderAnswer" min="' + q.sliderMin + '" max="' + q.sliderMax + '" value="' + q.sliderMin + '" style="width:100%;"><div style="display:flex;justify-content:space-between;margin-top:0.5rem;font-size:1.2rem;"><span>Min: <strong>' + toRoman(q.sliderMin) + '</strong></span><span id="sliderValueDisplay" style="color:#2c7da0;font-weight:bold;">' + toRoman(q.sliderMin) + '</span><span>Max: <strong>' + toRoman(q.sliderMax) + '</strong></span></div></div>'; } else { let it = q.type === 'single' ? 'radio' : 'checkbox'; h += '<div>' + q.options.map((o, i) => '<div class="slide-option"><input type="' + it + '" name="qOpt" value="' + i + '"><label>' + escapeHtml(o.text) + '</label></div>').join('') + '</div>'; } h += '<button class="submit-answer-btn" id="submitAnswerBtn">📝 Submit & Grade</button><div style="display:flex;justify-content:space-between;margin-top:1rem;"><button class="nav-btn" id="prevBtn" ' + (state.currentSlideIndex === 0 ? 'disabled' : '') + '>← Prev</button><span>' + (state.currentSlideIndex + 1) + '/' + state.questions.length + '</span><button class="nav-btn" id="nextBtn" ' + (state.currentSlideIndex === state.questions.length - 1 ? 'disabled' : '') + '>Next →</button></div></div>'; c.innerHTML = h; if (q.type === 'slider') { let slider = document.getElementById('sliderAnswer'); let display = document.getElementById('sliderValueDisplay'); slider.addEventListener('input', () => { display.textContent = toRoman(parseInt(slider.value)); }); } document.getElementById('submitAnswerBtn').addEventListener('click', () => { let ans = null; if (q.type === 'open') ans = document.getElementById('userAnswerInput').value || ''; else if (q.type === 'slider') ans = parseInt(document.getElementById('sliderAnswer').value); else { let chk = [...document.querySelectorAll('.slide-option input:checked')].map(cb => parseInt(cb.value)); ans = chk; } if ((q.type !== 'open' && q.type !== 'slider' && (!ans || ans.length === 0)) || (q.type === 'open' && !ans.trim())) { showMessage('Provide answer', true); return; } let cf = isAnswerCorrect(q, ans); if (cf) celebrate(); showMessage(cf ? '✅ Matches expected! Open grading panel.' : '❌ Differs from expected. Open grading panel.'); openGradingModal(q, ans); }); document.getElementById('prevBtn').addEventListener('click', () => { if (state.currentSlideIndex > 0) { state.currentSlideIndex--; renderSlideQuiz(); } }); document.getElementById('nextBtn').addEventListener('click', () => { if (state.currentSlideIndex < state.questions.length - 1) { state.currentSlideIndex++; renderSlideQuiz(); } }); }
    function openGradingModal(q, ua) { 
        let m = document.getElementById('gradingModal'); 
        document.getElementById('modalQuestionInfo').innerHTML = '<strong>Question:</strong> ' + escapeHtml(q.text) + '<br><strong>Answer:</strong> ' + escapeHtml(JSON.stringify(ua)) + '<br><small>Select participant and points below.</small>'; 
        document.getElementById('modalNotes').value = ''; 
        m.dataset.questionId = q.id; 
        m.dataset.questionText = q.text; 
        renderParticipantButtons();
        m.classList.add('active');
    }
    
    function renderParticipantButtons() {
        let container = document.getElementById('participantButtonsList');
        if (!container) return;
        
        if (!state.participants.length) {
            container.innerHTML = '<div style="color:#666;text-align:center;padding:2rem;">No participants yet. Add participants from the sidebar.</div>';
            return;
        }
        
        let pointsOptions = [0.5, 1, 2, 3, 5, 7.5, 10];
        
        container.innerHTML = state.participants.map(p => {
            let pointsBtns = pointsOptions.map(pts => 
                '<span class="points-badge" data-participant="' + escapeHtml(p.name) + '" data-points="' + pts + '">+' + pts + '</span>'
            ).join('');
            
            return '<div class="participant-btn">' +
                '<div class="participant-name">👤 ' + escapeHtml(p.name) + '</div>' +
                '<div class="points-options">' + pointsBtns + '</div>' +
                '</div>';
        }).join('');
        
        container.querySelectorAll('.points-badge').forEach(btn => {
            btn.addEventListener('click', () => {
                let participantName = btn.dataset.participant;
                let points = parseFloat(btn.dataset.points);
                saveScore(participantName, points);
            });
        });
    }
    
    function saveScore(participantName, points) {
        let nt = document.getElementById('modalNotes').value.trim();
        let qi = document.getElementById('gradingModal').dataset.questionId;
        let qt = document.getElementById('gradingModal').dataset.questionText;
        
        let part = state.participants.find(x => x.name === participantName);
        if (!part) {
            state.participants.push({ id: generateId(), name: participantName, totalScore: 0 });
            renderParticipantsSidebar();
            part = state.participants.find(x => x.name === participantName);
        }
        
        state.scoreRecords.push({
            id: generateId(),
            participantName: participantName,
            questionId: qi,
            questionText: qt,
            pointsEarned: points,
            notes: nt,
            timestamp: new Date().toISOString()
        });
        
        updateParticipantTotal(participantName);
        renderParticipantsSidebar();
        renderScoreboard();
        showMessage('✅ Saved ' + points + ' pts for ' + participantName);
        closeGradingModal();
    }
    
    function closeGradingModal() { 
        document.getElementById('gradingModal').classList.remove('active'); 
    }
    function renderScoreboard() { renderRankings(); renderParticipantSelect(); renderStatistics(); }
    function renderRankings() { let c = document.getElementById('rankingsList'); if (!c) return; updateAllTotals(); if (!state.scoreRecords.length) { c.innerHTML = '<div class="empty-message">No scores yet</div>'; return; } let sv = (document.getElementById('searchParticipant')?.value || '').toLowerCase(); let sb = document.getElementById('sortBySelect')?.value || 'score'; let f = state.participants.filter(p => p.name.toLowerCase().includes(sv)); if (sb === 'score') f.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0)); else f.sort((a, b) => a.name.localeCompare(b.name)); c.innerHTML = f.map((p, i) => { let sc = state.scoreRecords.filter(r => r.participantName === p.name); let av = sc.length ? (p.totalScore / sc.length).toFixed(1) : 0; let rc = '', md = ''; if (i === 0 && !sv) { rc = 'top-1'; md = '👑'; } else if (i === 1 && !sv) { rc = 'top-2'; md = '🥈'; } else if (i === 2 && !sv) { rc = 'top-3'; md = '🥉'; } return '<div class="rank-card ' + rc + '" onclick="selectParticipant(\'' + escapeHtml(p.name) + '\')"><div class="rank-header"><div><strong>' + (md || (i + 1)) + '. ' + escapeHtml(p.name) + '</strong></div><div class="rank-score">' + (p.totalScore || 0) + ' pts</div></div><div style="font-size:0.8rem;">📝 ' + sc.length + ' answers | avg ' + av + ' pts</div></div>'; }).join(''); }
    window.selectParticipant = function(n) { document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active')); document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active')); document.getElementById('detailsTab').classList.add('active'); document.querySelector('[data-tab="details"]').classList.add('active'); let s = document.getElementById('participantSelectDetail'); if (s) s.value = n; renderParticipantDetails(n); };
    function renderParticipantSelect() { let s = document.getElementById('participantSelectDetail'); if (!s) return; s.innerHTML = '<option value="">-- Select Participant --</option>' + state.participants.map(p => '<option value="' + escapeHtml(p.name) + '">' + escapeHtml(p.name) + ' (' + (p.totalScore || 0) + ' pts)</option>').join(''); s.onchange = e => { if (e.target.value) renderParticipantDetails(e.target.value); }; }
    function renderParticipantDetails(n) { let c = document.getElementById('participantDetailView'); if (!n) { c.innerHTML = '<div class="empty-message">Select participant</div>'; return; } let r = state.scoreRecords.filter(x => x.participantName === n); let t = r.reduce((s, x) => s + x.pointsEarned, 0); let h = '<div style="background:#2c7da0;color:white;padding:1rem;border-radius:1rem;margin-bottom:1rem;"><h3>' + escapeHtml(n) + '</h3><div style="font-size:2rem;">' + t + ' pts</div><div>' + r.length + ' questions</div></div>'; r.forEach((x, i) => { h += '<div style="background:#f8fafc;padding:0.8rem;border-radius:0.8rem;margin-bottom:0.5rem;"><div><strong>Q' + (i + 1) + ':</strong> ' + escapeHtml(x.questionText.substring(0, 70)) + '</div><div>🏆 ' + x.pointsEarned + ' pts</div>' + (x.notes ? '<div style="font-size:0.75rem;">💬 ' + escapeHtml(x.notes) + '</div>' : '') + '</div>'; }); c.innerHTML = h; }
    function renderStatistics() { let c = document.getElementById('statsContent'); if (!state.scoreRecords.length) { c.innerHTML = '<div class="empty-message">No data</div>'; return; } let tp = state.participants.length, ts = state.scoreRecords.length, tot = state.scoreRecords.reduce((s, r) => s + r.pointsEarned, 0), apq = ts ? (tot / ts).toFixed(1) : 0, top = state.participants.reduce((b, p) => (p.totalScore || 0) > (b.totalScore || 0) ? p : b, { totalScore: 0 }), qs = {}; state.scoreRecords.forEach(r => { if (!qs[r.questionId]) qs[r.questionId] = { text: r.questionText, pts: [], count: 0, total: 0 }; qs[r.questionId].pts.push(r.pointsEarned); qs[r.questionId].total += r.pointsEarned; qs[r.questionId].count++; }); let h = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.8rem;"><div class="stat-card" style="background:#f8fafc;padding:1rem;border-radius:1rem;"><div class="stat-value" style="font-size:2rem;font-weight:bold;">' + tp + '</div><div>Participants</div></div><div class="stat-card" style="background:#f8fafc;padding:1rem;border-radius:1rem;"><div class="stat-value" style="font-size:2rem;">' + tot + '</div><div>Total Points</div></div></div>'; if (top.name) h += '<div style="background:#fff9e6;padding:1rem;border-radius:1rem;margin:1rem 0;text-align:center;"><div>👑 TOP PERFORMER</div><div style="font-size:1.2rem;font-weight:bold;">' + escapeHtml(top.name) + '</div><div>' + (top.totalScore || 0) + ' points</div></div>'; h += '<div><strong>📊 Question Averages</strong></div>'; for (let q of Object.values(qs)) h += '<div style="background:#f8fafc;margin-top:0.5rem;padding:0.5rem;border-radius:0.8rem;"><div>' + escapeHtml(q.text.substring(0, 60)) + '</div><div>Avg: ' + (q.total / q.count).toFixed(1) + ' pts (' + q.count + ' responses)</div></div>'; c.innerHTML = h; }
    function exportData() { let d = { questions: state.questions, participants: state.participants, scoreRecords: state.scoreRecords }, b = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' }), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'quiz_' + Date.now() + '.json'; a.click(); URL.revokeObjectURL(a.href); }
    function importData(f) { let r = new FileReader(); r.onload = e => { try { let d = JSON.parse(e.target.result); if (d.questions) state.questions = d.questions; if (d.participants) state.participants = d.participants; if (d.scoreRecords) state.scoreRecords = d.scoreRecords; renderQuestionsList(); renderSlideQuiz(); renderParticipantsSidebar(); renderScoreboard(); updateDatalist(); showMessage('Imported'); } catch (err) { showMessage('Invalid file', true); } }; r.readAsText(f); }
    function resetAllScores() { if (confirm('Reset all scores?')) { state.scoreRecords = []; state.participants.forEach(p => p.totalScore = 0); renderParticipantsSidebar(); renderScoreboard(); showMessage('All scores reset'); } }
    function resetAllQuestions() { if (confirm('Delete all questions?')) { state.questions = []; state.scoreRecords = []; state.participants.forEach(p => p.totalScore = 0); renderQuestionsList(); renderSlideQuiz(); renderParticipantsSidebar(); renderScoreboard(); showMessage('Questions cleared'); } }
    function openSidebar() { document.getElementById('builderPanel').classList.add('open'); document.getElementById('overlay').classList.add('active'); state.isSidebarOpen = true; }
    function closeSidebar() { document.getElementById('builderPanel').classList.remove('open'); document.getElementById('overlay').classList.remove('active'); state.isSidebarOpen = false; }
    function toggleSidebar() { state.isSidebarOpen ? closeSidebar() : openSidebar(); }
    function toggleScoreboard() { let sb = document.getElementById('scoreboard'); sb.classList.toggle('open'); let io = sb.classList.contains('open'); document.getElementById('toggleScoreboardBtn').innerHTML = io ? '📊 Hide Scoreboard ✕' : '📊 Show Scoreboard 🏆'; if (io) renderScoreboard(); }
    function initEventListeners() {
        document.getElementById('hamburgerBtn').addEventListener('click', toggleSidebar);
        document.getElementById('closeSidebarBtn').addEventListener('click', closeSidebar);
        document.getElementById('overlay').addEventListener('click', closeSidebar);
        document.getElementById('addOptionBtn').addEventListener('click', () => { let c = document.getElementById('optionsContainer'), d = document.createElement('div'); d.className = 'option-row'; d.innerHTML = '<input type="text" class="option-text" placeholder="New option"><input type="checkbox" class="option-correct"> <span>✓</span><button type="button" class="btn-icon">✖</button>'; d.querySelector('button').addEventListener('click', () => { if (c.children.length > 1) d.remove(); else showMessage('Need at least one option', true); }); c.appendChild(d); });
        document.getElementById('saveQuestionBtn').addEventListener('click', saveQuestion);
        document.getElementById('clearFormBtn').addEventListener('click', clearForm);
        document.getElementById('addParticipantBtn').addEventListener('click', () => { let n = document.getElementById('newParticipantName').value.trim(); if (n) { if (!state.participants.find(p => p.name === n)) { state.participants.push({ id: generateId(), name: n, totalScore: 0 }); renderParticipantsSidebar(); updateDatalist(); showMessage('Added ' + n); } else showMessage('Exists', true); } else showMessage('Enter name', true); document.getElementById('newParticipantName').value = ''; });
        document.getElementById('resetAllQuestionsBtn').addEventListener('click', resetAllQuestions);
        document.getElementById('resetAllScoresBtn').addEventListener('click', resetAllScores);
        document.getElementById('exportBtn').addEventListener('click', exportData);
        document.getElementById('resetScoresBtn').addEventListener('click', resetAllScores);
        document.getElementById('importFile').addEventListener('change', e => { if (e.target.files.length) importData(e.target.files[0]); e.target.value = ''; });
        document.getElementById('typeToggleGroup').addEventListener('click', e => { let t = e.target.closest('.type-option'); if (t) { state.currentType = t.dataset.type; updateTypeToggleUI(); } });
        document.getElementById('modalCancelBtn').addEventListener('click', closeGradingModal);
        document.querySelector('.modal-close').addEventListener('click', closeGradingModal);
        window.addEventListener('click', e => { if (e.target === document.getElementById('gradingModal')) closeGradingModal(); });
        document.getElementById('toggleScoreboardBtn').addEventListener('click', toggleScoreboard);
        document.getElementById('closeScoreboardBtn').addEventListener('click', toggleScoreboard);
        document.querySelectorAll('.tab-btn').forEach(b => { b.addEventListener('click', () => { let t = b.dataset.tab; document.querySelectorAll('.tab-btn').forEach(x => x.classList.remove('active')); document.querySelectorAll('.tab-content').forEach(x => x.classList.remove('active')); b.classList.add('active'); document.getElementById(t + 'Tab').classList.add('active'); if (t === 'rankings') renderRankings(); if (t === 'details') renderParticipantSelect(); if (t === 'stats') renderStatistics(); }); });
        if (document.getElementById('searchParticipant')) document.getElementById('searchParticipant').addEventListener('input', renderRankings);
        if (document.getElementById('sortBySelect')) document.getElementById('sortBySelect').addEventListener('change', renderRankings);
    }
    function init() { renderOptionInputs(); renderQuestionsList(); renderSlideQuiz(); renderParticipantsSidebar(); renderScoreboard(); updateDatalist(); }
    initEventListeners();
    init();
})();