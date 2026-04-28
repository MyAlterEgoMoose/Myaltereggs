// Teacher Grading System - Quiz with Scoreboard (Refactored)
(function() {
    'use strict';
    const state = { questions: [], participants: [], scoreRecords: [], currentSlideIndex: 0, editingId: null, currentType: 'single', isEditMode: false, uploadedImages: [], uploadedAudios: [] };
    let lastImportedFileName = null;
    
    // GitHub configuration
    let githubConfig = {
        token: null,
        username: null,
        repo: 'quiz-data',
        isLoggedIn: false
    };
    
    // Load configuration from localStorage on startup
    function loadGithubConfig() {
        // Load GitHub auth from localStorage
        const savedConfig = localStorage.getItem('githubConfig');
        if (savedConfig) {
            try {
                githubConfig = JSON.parse(savedConfig);
                updateGithubUI();
            } catch (e) {
                console.error('Failed to load GitHub config:', e);
            }
        }
        
        // Load last imported filename from localStorage
        const lastImported = localStorage.getItem('lastImportedFileName');
        if (lastImported) {
            lastImportedFileName = lastImported;
        }
        
        // Try to load state from cookie first (for imported files persistence)
        if (!loadStateFromCookie()) {
            // Load uploaded images and audios from localStorage as fallback
            const savedImages = localStorage.getItem('uploadedImages');
            if (savedImages) {
                try {
                    state.uploadedImages = JSON.parse(savedImages);
                } catch (e) {
                    console.error('Failed to load uploaded images:', e);
                }
            }
            
            const savedAudios = localStorage.getItem('uploadedAudios');
            if (savedAudios) {
                try {
                    state.uploadedAudios = JSON.parse(savedAudios);
                } catch (e) {
                    console.error('Failed to load uploaded audios:', e);
                }
            }
        }
    }
    
    // Save GitHub config to localStorage
    function saveGithubConfigToStorage() {
        localStorage.setItem('githubConfig', JSON.stringify(githubConfig));
        // Also save uploaded images and audios to localStorage
        localStorage.setItem('uploadedImages', JSON.stringify(state.uploadedImages));
        localStorage.setItem('uploadedAudios', JSON.stringify(state.uploadedAudios));
    }
    
    // Cookie helper functions
    function setCookie(name, value, days) {
        const expires = new Date(Date.now() + days * 864e5).toUTCString();
        try {
            document.cookie = name + '=' + encodeURIComponent(value) + '; expires=' + expires + '; path=/; SameSite=Lax';
        } catch (e) {
            console.warn('Cookie too large or failed to set:', e);
        }
    }
    
    function getCookie(name) {
        const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
        return match ? decodeURIComponent(match[2]) : null;
    }
    
    function saveStateToCookie() {
        const stateData = JSON.stringify({
            questions: state.questions,
            participants: state.participants,
            scoreRecords: state.scoreRecords,
            uploadedImages: state.uploadedImages,
            uploadedAudios: state.uploadedAudios
        });
        setCookie('quizState', stateData, 30); // Save for 30 days
    }
    
    function loadStateFromCookie() {
        const saved = getCookie('quizState');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                if (data.questions) state.questions = data.questions;
                if (data.participants) state.participants = data.participants;
                if (data.scoreRecords) state.scoreRecords = data.scoreRecords;
                if (data.uploadedImages) state.uploadedImages = data.uploadedImages;
                if (data.uploadedAudios) state.uploadedAudios = data.uploadedAudios;
                return true;
            } catch (e) {
                console.error('Failed to parse cookie data:', e);
            }
        }
        return false;
    }
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

    // GitHub API helper functions
    async function githubAPI(endpoint, method = 'GET', body = null) {
        const url = `https://api.github.com${endpoint}`;
        const headers = {
            'Authorization': `token ${githubConfig.token}`,
            'Accept': 'application/vnd.github.v3+json'
        };
        
        const options = { method, headers };
        if (body) {
            headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(body);
        }
        
        const response = await fetch(url, options);
        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(error.message || `GitHub API error: ${response.status}`);
        }
        return response.json();
    }
    
    // Get current user from GitHub
    async function getGithubUser() {
        const user = await githubAPI('/user');
        return user.login;
    }
    
    // Get or create repository
    async function getOrCreateRepo() {
        try {
            // Try to get existing repo
            await githubAPI(`/repos/${githubConfig.username}/${githubConfig.repo}`);
            return true;
        } catch (e) {
            if (e.message.includes('404')) {
                // Repo doesn't exist, create it
                await githubAPI('/user/repos', 'POST', {
                    name: githubConfig.repo,
                    private: false,
                    description: 'Quiz data storage'
                });
                return true;
            }
            throw e;
        }
    }
    
    // Get file content from GitHub
    async function getGithubFile(path) {
        const data = await githubAPI(`/repos/${githubConfig.username}/${githubConfig.repo}/contents/${path}`);
        // Decode base64 content with proper UTF-8 handling
        const binaryString = atob(data.content.replace(/\s/g, ''));
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        const content = new TextDecoder('utf-8').decode(bytes);
        return { content, sha: data.sha };
    }
    
    // Get list of files in a directory from GitHub
    async function getGithubDirectoryContents(path) {
        const data = await githubAPI(`/repos/${githubConfig.username}/${githubConfig.repo}/contents/${path}`);
        // Return array of files (filter out directories if needed)
        return Array.isArray(data) ? data : [data];
    }
    
    // Upload file to GitHub
    async function uploadToGithub(path, content, message, sha = null) {
        const body = {
            message: message,
            content: btoa(unescape(encodeURIComponent(content))),
            branch: 'main'
        };
        if (sha) {
            body.sha = sha;
        }
        
        await githubAPI(`/repos/${githubConfig.username}/${githubConfig.repo}/contents/${path}`, 'PUT', body);
    }
    
    // Image upload to GitHub
    async function uploadImageToGitHub(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const dataUrl = e.target.result;
                state.uploadedImages.push({ originalName: file.name, dataUrl: dataUrl, uploadedAt: new Date().toISOString() });
                saveGithubConfigToStorage();
                resolve(dataUrl);
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    }

    // Audio upload - store as DataURL locally
    async function uploadAudioToGitHub(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const dataUrl = e.target.result;
                state.uploadedAudios.push({ originalName: file.name, dataUrl: dataUrl, uploadedAt: new Date().toISOString() });
                saveGithubConfigToStorage();
                resolve(dataUrl);
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    }

    // Helper function to get question display text with image indicator
    function getQuestionDisplayText(q) {
        return q.text + (q.image ? ' 🖼️' : '') + (q.audio ? ' 🎵' : '');
    }

    // Helper function to render question image if present
    function renderQuestionImage(q) {
        if (q.image && q.image.imageUrl) {
            return '<img src="' + escapeHtml(q.image.imageUrl) + '" alt="Question image" style="max-width:100%;max-height:300px;border-radius:1rem;margin-bottom:1rem;">';
        }
        return '';
    }

    // Helper function to render question audio player if present
    function renderQuestionAudio(q) {
        if (q.audio && q.audio.audioUrl) {
            const audioId = 'audio-' + (q.id || Date.now());
            return '<div class="audio-player-container" data-audio-id="' + audioId + '">' +
                '<audio id="' + audioId + '" src="' + escapeHtml(q.audio.audioUrl) + '"></audio>' +
                '<div class="circular-audio-control">' +
                    '<svg class="circular-progress" viewBox="0 0 120 120">' +
                        '<circle class="progress-bg" cx="60" cy="60" r="52" />' +
                        '<circle class="progress-bar" cx="60" cy="60" r="52" />' +
                    '</svg>' +
                    '<button class="play-pause-btn" aria-label="Play/Pause">' +
                        '<svg class="play-icon" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg>' +
                        '<svg class="pause-icon" viewBox="0 0 24 24" style="display:none;"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>' +
                    '</button>' +
                    '<div class="audio-time-display"><span class="current-time">0:00</span><span class="duration-time">0:00</span></div>' +
                '</div>' +
            '</div>';
        }
        return '';
    }
    function updateParticipantTotal(name) { let p = state.participants.find(p => p.name === name); if (p) { let t = state.scoreRecords.filter(r => r.participantName === name).reduce((s, r) => s + r.pointsEarned, 0); p.totalScore = t; } }
    function updateAllTotals() { state.participants.forEach(p => updateParticipantTotal(p.name)); }
    function renderParticipantsSidebar() { let c = document.getElementById('participantsList'); if (!c) return; if (!state.participants.length) { c.innerHTML = '<div style="color:#666;">No participants</div>'; return; } c.innerHTML = state.participants.map(p => '<div class="participant-item-sidebar"><span>👤 ' + escapeHtml(p.name) + '</span><span style="background:#ffc107;padding:0.2rem 0.5rem;border-radius:1rem;">' + (p.totalScore || 0) + ' pts</span><button class="delete-participant-side" data-name="' + escapeHtml(p.name) + '" style="background:#dc3545;border:none;border-radius:1rem;padding:0.2rem 0.5rem;">🗑️</button></div>').join(''); document.querySelectorAll('.delete-participant-side').forEach(b => b.addEventListener('click', () => { let n = b.dataset.name; if (confirm('Delete ' + n + '?')) { state.participants = state.participants.filter(p => p.name !== n); state.scoreRecords = state.scoreRecords.filter(r => r.participantName !== n); renderParticipantsSidebar(); renderScoreboard(); updateDatalist(); saveStateToCookie(); showMessage('Deleted ' + n); } })); }
    function updateDatalist() { let d = document.getElementById('participantsDatalist'); if (d) d.innerHTML = state.participants.map(p => '<option value="' + escapeHtml(p.name) + '">').join(''); }
    function renderQuestionsList() { let a = document.getElementById('questionsListArea'); if (!state.questions.length) { a.innerHTML = '<div style="padding:1rem;">No questions</div>'; return; } a.innerHTML = state.questions.map((q, i) => '<div class="question-card" data-idx="' + i + '"><div><strong>' + (i + 1) + '.</strong> ' + escapeHtml(getQuestionDisplayText(q).substring(0, 50)) + '</div><div><button class="edit-q" data-id="' + q.id + '">✏️</button><button class="delete-q" data-id="' + q.id + '">🗑️</button></div></div>').join(''); document.querySelectorAll('.delete-q').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); let id = b.dataset.id; if (confirm('Delete?')) { state.questions = state.questions.filter(q => q.id !== id); if (state.currentSlideIndex >= state.questions.length) state.currentSlideIndex = Math.max(0, state.questions.length - 1); renderQuestionsList(); renderSlideQuiz(); saveStateToCookie(); showMessage('Deleted'); } })); document.querySelectorAll('.edit-q').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); let q = state.questions.find(q => q.id === b.dataset.id); if (q) { state.editingId = q.id; state.currentType = q.type; document.getElementById('questionText').value = q.text; updateTypeToggleUI(); if (q.type === 'open') { document.getElementById('correctAnswers').value = (q.correctAnswers || []).join('\n'); document.getElementById('caseSensitive').checked = q.caseSensitive || false; } else if (q.type === 'slider') { document.getElementById('sliderMin').value = q.sliderMin; document.getElementById('sliderMax').value = q.sliderMax; } else renderOptionInputs(q.options); openSidebar(); } })); document.querySelectorAll('.question-card').forEach(c => c.addEventListener('click', () => { let i = parseInt(c.dataset.idx); if (!isNaN(i)) { state.currentSlideIndex = i; renderSlideQuiz(); } })); }
    function renderOptionInputs(opts = null) { let c = document.getElementById('optionsContainer'); let arr = opts || [{ text: '', isCorrect: false }, { text: '', isCorrect: false }]; c.innerHTML = ''; arr.forEach((o, i) => { let d = document.createElement('div'); d.className = 'option-row'; d.innerHTML = '<input type="text" class="option-text" value="' + escapeHtml(o.text) + '" placeholder="Option ' + (i + 1) + '"><input type="checkbox" class="option-correct" ' + (o.isCorrect ? 'checked' : '') + '> <span>✓</span><button type="button" class="btn-icon">✖</button>'; d.querySelector('button').addEventListener('click', () => { if (c.children.length > 1) d.remove(); else showMessage('Need at least one option', true); }); c.appendChild(d); }); }
    function updateTypeToggleUI() { 
        document.querySelectorAll('.type-option').forEach(o => { 
            if (o.dataset.type === state.currentType) o.classList.add('active'); 
            else o.classList.remove('active'); 
        }); 
        document.getElementById('optionsGroup').style.display = state.currentType === 'open' || state.currentType === 'slider' || state.currentType === 'hide-image' ? 'none' : 'block'; 
        document.getElementById('openAnswerGroup').style.display = state.currentType === 'open' ? 'block' : 'none'; 
        document.getElementById('sliderRangeGroup').style.display = state.currentType === 'slider' ? 'block' : 'none'; 
        document.getElementById('hideImageGroup').style.display = state.currentType === 'hide-image' ? 'block' : 'none'; 
    }
    function gatherFormData() { 
        let t = document.getElementById('questionText').value.trim(); 
        if (!t) { showMessage('Enter text', true); return null; } 
        
        // Handle image file for regular questions
        let imageData = null;
        let imageInput = document.getElementById('questionImage');
        if (imageInput && imageInput.files && imageInput.files[0]) {
            imageData = { fileName: imageInput.files[0].name, file: imageInput.files[0] };
        }
        
        // Handle hide-image specific file
        let hideImageData = null;
        let hideImageInput = document.getElementById('hideImageInput');
        if (hideImageInput && hideImageInput.files && hideImageInput.files[0]) {
            hideImageData = { fileName: hideImageInput.files[0].name, file: hideImageInput.files[0] };
        }
        
        // Handle audio file
        let audioData = null;
        let audioInput = document.getElementById('questionAudio');
        if (audioInput && audioInput.files && audioInput.files[0]) {
            audioData = { fileName: audioInput.files[0].name, file: audioInput.files[0] };
        }
        
        if (state.currentType === 'open') { 
            let c = document.getElementById('correctAnswers').value.trim().split('\n').map(l => l.trim()).filter(l => l); 
            let result = { text: t, type: 'open', correctAnswers: c, caseSensitive: document.getElementById('caseSensitive').checked };
            if (imageData) result.image = imageData;
            if (audioData) result.audio = audioData;
            return result;
        } else if (state.currentType === 'slider') { 
            let minVal = parseInt(document.getElementById('sliderMin').value); 
            let maxVal = parseInt(document.getElementById('sliderMax').value); 
            if (isNaN(minVal) || isNaN(maxVal)) { showMessage('Enter min and max values', true); return null; } 
            if (!Number.isInteger(minVal) || !Number.isInteger(maxVal)) { showMessage('Min and max must be integers', true); return null; } 
            if (minVal >= maxVal) { showMessage('Min must be less than max', true); return null; } 
            let result = { text: t, type: 'slider', sliderMin: minVal, sliderMax: maxVal };
            if (imageData) result.image = imageData;
            if (audioData) result.audio = audioData;
            return result;
        } else if (state.currentType === 'hide-image') {
            if (!hideImageData) { showMessage('Upload an image for hide-image question', true); return null; }
            let result = { text: t, type: 'hide-image', hideImage: hideImageData };
            return result;
        } else { 
            let rows = document.querySelectorAll('#optionsContainer .option-row'); 
            let opts = []; 
            for (let r of rows) { 
                let txt = r.querySelector('.option-text').value.trim(); 
                if (!txt) { showMessage('All options need text', true); return null; } 
                opts.push({ text: txt, isCorrect: r.querySelector('.option-correct').checked }); 
            } 
            if (opts.length < 2) { showMessage('At least 2 options', true); return null; } 
            if (state.currentType === 'single' && opts.filter(o => o.isCorrect).length !== 1) { showMessage('Single: exactly one correct', true); return null; } 
            if (state.currentType === 'multiple' && !opts.some(o => o.isCorrect)) { showMessage('Select at least one correct', true); return null; } 
            let result = { text: t, options: opts, type: state.currentType };
            if (imageData) result.image = imageData;
            if (audioData) result.audio = audioData;
            return result;
        } 
    }
    function saveQuestion() {
        let d = gatherFormData();
        if (!d) return;

        // Handle image and audio uploads
        let uploadPromises = [];
        
        if (d.image && d.image.file) {
            uploadPromises.push(
                uploadImageToGitHub(d.image.file)
                    .then(imageUrl => { d.image = { fileName: d.image.fileName, imageUrl: imageUrl }; })
                    .catch(err => { showMessage('⚠️ Image upload failed: ' + err.message, true); d.image = null; })
            );
        }
        
        if (d.audio && d.audio.file) {
            uploadPromises.push(
                uploadAudioToGitHub(d.audio.file)
                    .then(audioUrl => { d.audio = { fileName: d.audio.fileName, audioUrl: audioUrl }; })
                    .catch(err => { showMessage('⚠️ Audio upload failed: ' + err.message, true); d.audio = null; })
            );
        }
        
        if (d.hideImage && d.hideImage.file) {
            uploadPromises.push(
                uploadImageToGitHub(d.hideImage.file)
                    .then(imageUrl => { d.hideImage = { fileName: d.hideImage.fileName, imageUrl: imageUrl }; })
                    .catch(err => { showMessage('⚠️ Hide image upload failed: ' + err.message, true); d.hideImage = null; })
            );
        }
        
        if (uploadPromises.length > 0) {
            showMessage('⏳ Uploading media...');
            Promise.all(uploadPromises).then(() => completeSave(d));
        } else if (state.editingId) {
            // Preserve existing media when editing without new files
            let existingQ = state.questions.find(q => q.id === state.editingId);
            if (existingQ) {
                if (existingQ.image && !d.image) d.image = existingQ.image;
                if (existingQ.audio && !d.audio) d.audio = existingQ.audio;
                if (existingQ.hideImage && !d.hideImage) d.hideImage = existingQ.hideImage;
            }
            completeSave(d);
        } else {
            completeSave(d);
        }

        function completeSave(data) {
            if (state.editingId) {
                let i = state.questions.findIndex(q => q.id === state.editingId);
                if (i !== -1) state.questions[i] = { ...state.questions[i], ...data, id: state.editingId };
                state.editingId = null;
            } else {
                state.questions.push({ id: generateId(), ...data });
            }
            clearForm();
            renderQuestionsList();
            renderSlideQuiz();
            saveStateToCookie();
            showMessage('Saved');
        }
    }
    function clearForm() { 
        document.getElementById('questionText').value = ''; 
        renderOptionInputs(); 
        document.getElementById('correctAnswers').value = ''; 
        document.getElementById('sliderMin').value = ''; 
        document.getElementById('sliderMax').value = ''; 
        document.getElementById('caseSensitive').checked = false; 
        state.editingId = null; 
        state.currentType = 'single'; 
        updateTypeToggleUI();
        // Clear image input and preview
        let imgInput = document.getElementById('questionImage');
        if (imgInput) imgInput.value = '';
        let preview = document.getElementById('imagePreviewContainer');
        if (preview) preview.innerHTML = '';
        // Clear audio input and preview
        let audioInput = document.getElementById('questionAudio');
        if (audioInput) audioInput.value = '';
        let audioPreview = document.getElementById('audioPreviewContainer');
        if (audioPreview) audioPreview.innerHTML = '';
        // Clear hide-image input and preview
        let hideImgInput = document.getElementById('hideImageInput');
        if (hideImgInput) hideImgInput.value = '';
        let hidePreview = document.getElementById('hideImagePreviewContainer');
        if (hidePreview) hidePreview.innerHTML = '';
    }
    function renderSlideQuiz() { 
        let c = document.getElementById('slideQuizContainer'); 
        if (!state.questions.length) { 
            c.innerHTML = '<div class="empty-message">Add questions</div>'; 
            return; 
        } 
        let q = state.questions[state.currentSlideIndex]; 
        let h = '<div class="slide-card"><div class="slide-header"><span>Q' + (state.currentSlideIndex + 1) + '/' + state.questions.length + '</span><span>⭐ Teacher decides points</span></div><div class="slide-question-text">' + escapeHtml(q.text) + '</div>'; 
        // Render image if present
        h += renderQuestionImage(q);
        // Render audio player if present
        h += renderQuestionAudio(q);
        
        if (q.type === 'hide-image') {
            // Render hide-image question type
            if (q.hideImage && q.hideImage.imageUrl) {
                h += '<div class="hide-image-wrapper" style="position:relative;display:inline-block;cursor:pointer;transition:transform 0.3s ease;" onclick="toggleHideImage(this)">';
                h += '<img src="' + escapeHtml(q.hideImage.imageUrl) + '" alt="Hide image question" class="hide-image-element" style="max-width:100%;max-height:300px;border-radius:8px;box-shadow:0 4px 15px rgba(0,0,0,0.15);transition:opacity 0.5s ease,visibility 0.5s ease;">';
                h += '<div class="hide-image-hint" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(102,126,234,0.9);color:white;padding:10px 20px;border-radius:5px;font-size:0.9rem;opacity:0;transition:opacity 0.3s ease;pointer-events:none;">Click to hide</div>';
                h += '</div>';
                h += '<div class="hide-image-status" style="margin-top:15px;padding:10px;border-radius:5px;background:#d4edda;color:#155724;font-size:0.9rem;text-align:center;">Image is visible</div>';
                h += '<button class="hide-image-reset" style="display:block;margin:20px auto 0;padding:12px 30px;background:#667eea;color:white;border:none;border-radius:5px;font-size:1rem;cursor:pointer;transition:background 0.3s ease;" onclick="resetHideImage(this)">Show Image Again</button>';
            }
        } else if (q.type === 'open') {
            h += '<textarea id="userAnswerInput" rows="4" style="width:100%;padding:0.8rem;border-radius:1rem;"></textarea>'; 
        } else if (q.type === 'slider') { 
            h += '<div class="slider-question-container"><input type="range" id="sliderAnswer" min="' + q.sliderMin + '" max="' + q.sliderMax + '" value="' + q.sliderMin + '"><div class="slider-labels"><span>Min: <strong>' + toRoman(q.sliderMin) + '</strong></span><div id="sliderValueDisplay" class="slider-value-display">' + toRoman(q.sliderMin) + '</div><span>Max: <strong>' + toRoman(q.sliderMax) + '</strong></span></div></div>'; 
        } else { 
            let it = q.type === 'single' ? 'radio' : 'checkbox'; 
            h += '<div class="options-grid">' + q.options.map((o, i) => '<div class="slide-option" data-index="' + i + '"><input type="' + it + '" name="qOpt" value="' + i + '" id="opt-' + i + '"><label for="opt-' + i + '">' + escapeHtml(o.text) + '</label></div>').join('') + '</div>'; 
            
            // Add click event to options for auto-submit
            setTimeout(() => {
                document.querySelectorAll('.slide-option').forEach(opt => {
                    opt.addEventListener('click', function(e) {
                        // Don't trigger if clicking directly on input
                        if (e.target.tagName === 'INPUT') return;
                        
                        const input = this.querySelector('input');
                        if (q.type === 'single') {
                            // For single choice, uncheck others and check this one
                            document.querySelectorAll('.slide-option input[type="radio"]').forEach(r => r.checked = false);
                            input.checked = true;
                        } else {
                            // For multiple choice, toggle
                            input.checked = !input.checked;
                        }
                    });
                });
            }, 0);
        } 
        h += '<div style="display:flex;justify-content:space-between;margin-top:1rem;"><button class="nav-btn" id="prevBtn" ' + (state.currentSlideIndex === 0 ? 'disabled' : '') + '>← Prev</button><span>' + (state.currentSlideIndex + 1) + '/' + state.questions.length + '</span><button class="nav-btn" id="nextBtn" ' + (state.currentSlideIndex === state.questions.length - 1 ? 'disabled' : '') + '>Next →</button></div></div>'; 
        c.innerHTML = h; 
        if (q.type === 'slider') { 
            let slider = document.getElementById('sliderAnswer'); 
            let display = document.getElementById('sliderValueDisplay'); 
            function updateBubble() { 
                let val = parseInt(slider.value); 
                display.textContent = toRoman(val); 
            } 
            updateBubble(); 
            slider.addEventListener('input', updateBubble); 
        } 
        // Add click listeners to answer options for single/multiple choice
        if (q.type === 'single' || q.type === 'multiple') {
            document.querySelectorAll('.slide-option').forEach(opt => {
                opt.addEventListener('click', () => {
                    setTimeout(() => {
                        openGradingSection(q);
                    }, 300);
                });
            });
        }
        // For open and slider types, add listener to input change
        if (q.type === 'open') {
            document.getElementById('userAnswerInput').addEventListener('change', () => {
                let ans = document.getElementById('userAnswerInput').value.trim();
                if (ans) {
                    openGradingSection(q);
                }
            });
        }
        if (q.type === 'slider') {
            document.getElementById('sliderAnswer').addEventListener('change', () => {
                openGradingSection(q);
            });
        }
        document.getElementById('prevBtn').addEventListener('click', () => { 
            if (state.currentSlideIndex > 0) { 
                state.currentSlideIndex--; 
                renderSlideQuiz(); 
            } 
        }); 
        document.getElementById('nextBtn').addEventListener('click', () => { 
            if (state.currentSlideIndex < state.questions.length - 1) { 
                state.currentSlideIndex++; 
                renderSlideQuiz(); 
            } 
        }); 
        
        // Initialize circular audio player controls
        initAudioPlayer();
    }
    
    function initAudioPlayer() {
        const audioContainer = document.querySelector('.audio-player-container');
        if (!audioContainer) return;
        
        const audio = audioContainer.querySelector('audio');
        const playPauseBtn = audioContainer.querySelector('.play-pause-btn');
        const playIcon = audioContainer.querySelector('.play-icon');
        const pauseIcon = audioContainer.querySelector('.pause-icon');
        const progressBar = audioContainer.querySelector('.progress-bar');
        const currentTimeEl = audioContainer.querySelector('.current-time');
        const durationTimeEl = audioContainer.querySelector('.duration-time');
        const svgElement = audioContainer.querySelector('.circular-progress');
        
        // Calculate circumference for progress circle
        const radius = 52;
        const circumference = 2 * Math.PI * radius;
        
        // Set up progress bar
        progressBar.style.strokeDasharray = circumference;
        progressBar.style.strokeDashoffset = circumference;
        progressBar.style.transition = 'stroke-dash-offset 0.1s linear';
        
        // Make SVG cursor pointer to indicate it's interactive
        svgElement.style.cursor = 'pointer';
        
        let isPlaying = false;
        let isDragging = false;
        
        function formatTime(seconds) {
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return mins + ':' + (secs < 10 ? '0' : '') + secs;
        }
        
        function updateProgress() {
            if (audio.duration) {
                const percent = audio.currentTime / audio.duration;
                const offset = circumference - (percent * circumference);
                progressBar.style.strokeDashoffset = offset;
                currentTimeEl.textContent = formatTime(audio.currentTime);
            }
        }
        
        function togglePlay() {
            if (isPlaying) {
                audio.pause();
                playIcon.style.display = 'block';
                pauseIcon.style.display = 'none';
            } else {
                audio.play();
                playIcon.style.display = 'none';
                pauseIcon.style.display = 'block';
            }
            isPlaying = !isPlaying;
        }
        
        function seekToPosition(clientX, clientY) {
            if (!audio.duration) return;
            
            const rect = svgElement.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            // Calculate angle from center to click position
            const dx = clientX - centerX;
            const dy = clientY - centerY;
            let angle = Math.atan2(dy, dx);
            
            // Convert to 0-360 degrees, starting from top (-90 degrees)
            angle = angle * (180 / Math.PI) + 90;
            if (angle < 0) angle += 360;
            
            // Calculate percentage (clockwise from top)
            const percent = angle / 360;
            const newTime = percent * audio.duration;
            
            audio.currentTime = newTime;
            updateProgress();
        }
        
        // Event listeners
        playPauseBtn.addEventListener('click', togglePlay);
        
        audio.addEventListener('timeupdate', updateProgress);
        
        audio.addEventListener('loadedmetadata', () => {
            durationTimeEl.textContent = formatTime(audio.duration);
        });
        
        audio.addEventListener('ended', () => {
            isPlaying = false;
            playIcon.style.display = 'block';
            pauseIcon.style.display = 'none';
            progressBar.style.strokeDashoffset = circumference;
            currentTimeEl.textContent = '0:00';
        });
        
        // Drag functionality for seeking
        svgElement.addEventListener('mousedown', (e) => {
            isDragging = true;
            seekToPosition(e.clientX, e.clientY);
        });
        
        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                seekToPosition(e.clientX, e.clientY);
            }
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
        
        // Touch support for mobile
        svgElement.addEventListener('touchstart', (e) => {
            isDragging = true;
            const touch = e.touches[0];
            seekToPosition(touch.clientX, touch.clientY);
            e.preventDefault();
        });
        
        document.addEventListener('touchmove', (e) => {
            if (isDragging) {
                const touch = e.touches[0];
                seekToPosition(touch.clientX, touch.clientY);
                e.preventDefault();
            }
        });
        
        document.addEventListener('touchend', () => {
            isDragging = false;
        });
    }
    
    function openGradingSection(q) {
        let section = document.getElementById('gradingSection');
        let info = document.getElementById('gradingSectionInfo');
        
        // Populate question info
        info.innerHTML = '<div style="font-weight:600;margin-bottom:0.5rem;">' + escapeHtml(q.text) + '</div>' +
            '<div style="font-size:0.85rem;color:#666;">Type: ' + q.type.toUpperCase() + '</div>';
        
        // Store current question data
        section.dataset.questionId = q.id;
        section.dataset.questionText = q.text;
        
        // Render participants with points
        renderParticipantsPointsList();
        
        // Show section and scroll to it
        section.style.display = 'block';
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    function renderParticipantsPointsList() {
        let container = document.getElementById('participantsPointsList');
        if (!container) return;
        
        if (!state.participants.length) {
            container.innerHTML = '<div style="color:#666;text-align:center;padding:2rem;">No participants yet. Add participants from the sidebar.</div>';
            return;
        }
        
        // Show participant circles initially
        container.innerHTML = '<div class="participants-points-horizontal">' + 
            state.participants.map(p => {
                let initials = p.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
                
                return '<div class="participant-circle-item" data-participant="' + escapeHtml(p.name) + '">' +
                    '<div class="circle-avatar">' + initials + '</div>' +
                    '<div class="circle-name">' + escapeHtml(p.name) + '</div>' +
                    '</div>';
            }).join('') +
            '</div>';
        
        // Add click listeners to participant circles
        container.querySelectorAll('.participant-circle-item').forEach(circle => {
            circle.addEventListener('click', () => {
                let participantName = circle.dataset.participant;
                showPointsForParticipant(participantName);
            });
        });
    }
    
    function showPointsForParticipant(participantName) {
        let container = document.getElementById('participantsPointsList');
        if (!container) return;
        
        let pointsOptions = [0.5, 1, 2, 3, 5, 7.5, 10];
        let p = state.participants.find(x => x.name === participantName);
        if (!p) return;
        
        let initials = p.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        
        let pointsBtns = pointsOptions.map(pts => 
            '<button class="points-circle-btn" data-participant="' + escapeHtml(p.name) + '" data-points="' + pts + '">+' + pts + '</button>'
        ).join('');
        
        container.innerHTML = '<div class="participants-points-horizontal">' +
            '<div class="participant-circle-item">' +
            '<div class="circle-avatar">' + initials + '</div>' +
            '<div class="circle-name">' + escapeHtml(p.name) + '</div>' +
            '<div class="points-row">' + pointsBtns + '</div>' +
            '</div>' +
            '</div>';
        
        container.querySelectorAll('.points-circle-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                let pts = parseFloat(btn.dataset.points);
                saveScoreFromSection(participantName, pts);
            });
        });
    }
    
    function saveScoreFromSection(participantName, points) {
        let qi = document.getElementById('gradingSection').dataset.questionId;
        let qt = document.getElementById('gradingSection').dataset.questionText;
        
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
            timestamp: new Date().toISOString()
        });
        
        updateParticipantTotal(participantName);
        renderParticipantsSidebar();
        renderScoreboard();
        saveStateToCookie();
        showMessage('✅ Saved ' + points + ' pts for ' + participantName);
        closeGradingSection();
    }
    
    function closeGradingSection() { 
        document.getElementById('gradingSection').style.display = 'none'; 
    }
    
    function renderScoreboard() { renderRankings(); renderParticipantSelect(); renderStatistics(); }
    function renderRankings() { let c = document.getElementById('rankingsList'); if (!c) return; updateAllTotals(); if (!state.scoreRecords.length) { c.innerHTML = '<div class="empty-message">No scores yet</div>'; return; } let sv = (document.getElementById('searchParticipant')?.value || '').toLowerCase(); let sb = document.getElementById('sortBySelect')?.value || 'score'; let f = state.participants.filter(p => p.name.toLowerCase().includes(sv)); if (sb === 'score') f.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0)); else f.sort((a, b) => a.name.localeCompare(b.name)); c.innerHTML = f.map((p, i) => { let sc = state.scoreRecords.filter(r => r.participantName === p.name); let av = sc.length ? (p.totalScore / sc.length).toFixed(1) : 0; let rc = '', md = ''; if (i === 0 && !sv) { rc = 'top-1'; md = '👑'; } else if (i === 1 && !sv) { rc = 'top-2'; md = '🥈'; } else if (i === 2 && !sv) { rc = 'top-3'; md = '🥉'; } return '<div class="rank-card ' + rc + '" onclick="selectParticipant(\'' + escapeHtml(p.name) + '\')"><div class="rank-header"><div><strong>' + (md || (i + 1)) + '. ' + escapeHtml(p.name) + '</strong></div><div class="rank-score">' + (p.totalScore || 0) + ' pts</div></div><div style="font-size:0.8rem;">📝 ' + sc.length + ' answers | avg ' + av + ' pts</div></div>'; }).join(''); }
    window.selectParticipant = function(n) { document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active')); document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active')); document.getElementById('detailsTab').classList.add('active'); document.querySelector('[data-tab="details"]').classList.add('active'); let s = document.getElementById('participantSelectDetail'); if (s) s.value = n; renderParticipantDetails(n); };
    function renderParticipantSelect() { let s = document.getElementById('participantSelectDetail'); if (!s) return; s.innerHTML = '<option value="">-- Select Participant --</option>' + state.participants.map(p => '<option value="' + escapeHtml(p.name) + '">' + escapeHtml(p.name) + ' (' + (p.totalScore || 0) + ' pts)</option>').join(''); s.onchange = e => { if (e.target.value) renderParticipantDetails(e.target.value); }; }
    function renderParticipantDetails(n) { let c = document.getElementById('participantDetailView'); if (!n) { c.innerHTML = '<div class="empty-message">Select participant</div>'; return; } let r = state.scoreRecords.filter(x => x.participantName === n); let t = r.reduce((s, x) => s + x.pointsEarned, 0); let h = '<div style="background:#2c7da0;color:white;padding:1rem;border-radius:1rem;margin-bottom:1rem;"><h3>' + escapeHtml(n) + '</h3><div style="font-size:2rem;">' + t + ' pts</div><div>' + r.length + ' questions</div></div>'; r.forEach((x, i) => { h += '<div style="background:#f8fafc;padding:0.8rem;border-radius:0.8rem;margin-bottom:0.5rem;"><div><strong>Q' + (i + 1) + ':</strong> ' + escapeHtml(x.questionText.substring(0, 70)) + '</div><div>🏆 ' + x.pointsEarned + ' pts</div>' + (x.notes ? '<div style="font-size:0.75rem;">💬 ' + escapeHtml(x.notes) + '</div>' : '') + '</div>'; }); c.innerHTML = h; }
    function renderStatistics() { let c = document.getElementById('statsContent'); if (!state.scoreRecords.length) { c.innerHTML = '<div class="empty-message">No data</div>'; return; } let tp = state.participants.length, ts = state.scoreRecords.length, tot = state.scoreRecords.reduce((s, r) => s + r.pointsEarned, 0), apq = ts ? (tot / ts).toFixed(1) : 0, top = state.participants.reduce((b, p) => (p.totalScore || 0) > (b.totalScore || 0) ? p : b, { totalScore: 0 }), qs = {}; state.scoreRecords.forEach(r => { if (!qs[r.questionId]) qs[r.questionId] = { text: r.questionText, pts: [], count: 0, total: 0 }; qs[r.questionId].pts.push(r.pointsEarned); qs[r.questionId].total += r.pointsEarned; qs[r.questionId].count++; }); let h = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.8rem;"><div class="stat-card" style="background:#f8fafc;padding:1rem;border-radius:1rem;"><div class="stat-value" style="font-size:2rem;font-weight:bold;">' + tp + '</div><div>Participants</div></div><div class="stat-card" style="background:#f8fafc;padding:1rem;border-radius:1rem;"><div class="stat-value" style="font-size:2rem;">' + tot + '</div><div>Total Points</div></div></div>'; if (top.name) h += '<div style="background:#fff9e6;padding:1rem;border-radius:1rem;margin:1rem 0;text-align:center;"><div>👑 TOP PERFORMER</div><div style="font-size:1.2rem;font-weight:bold;">' + escapeHtml(top.name) + '</div><div>' + (top.totalScore || 0) + ' points</div></div>'; h += '<div><strong>📊 Question Averages</strong></div>'; for (let q of Object.values(qs)) h += '<div style="background:#f8fafc;margin-top:0.5rem;padding:0.5rem;border-radius:0.8rem;"><div>' + escapeHtml(q.text.substring(0, 60)) + '</div><div>Avg: ' + (q.total / q.count).toFixed(1) + ' pts (' + q.count + ' responses)</div></div>'; c.innerHTML = h; }
    function shuffleArray(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }
    
    function exportData() {
        let shuffledQuestions = shuffleArray([...state.questions]);
        let d = { 
            questions: shuffledQuestions, 
            participants: state.participants, 
            scoreRecords: state.scoreRecords,
            uploadedImages: state.uploadedImages,
            uploadedAudios: state.uploadedAudios
        };
        
        // Export to local download
        let b = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
        let a = document.createElement('a');
        a.href = URL.createObjectURL(b);
        a.download = 'quiz_' + Date.now() + '.json';
        a.click();
        URL.revokeObjectURL(a.href);
        showMessage('✅ Exported locally with ' + state.uploadedImages.length + ' image(s) and ' + state.uploadedAudios.length + ' audio(s)');
    }
    
    // Export data to GitHub
    async function exportToGitHub() {
        if (!githubConfig.isLoggedIn) {
            showMessage('⚠️ Please login to GitHub first', true);
            return;
        }
        
        try {
            const statusDiv = document.getElementById('githubStatus');
            statusDiv.textContent = '🔄 Exporting to GitHub...';
            statusDiv.className = '';
            
            await getOrCreateRepo();
            
            let shuffledQuestions = shuffleArray([...state.questions]);
            let d = { 
                questions: shuffledQuestions, 
                participants: state.participants, 
                scoreRecords: state.scoreRecords,
                uploadedImages: state.uploadedImages,
                uploadedAudios: state.uploadedAudios,
                exportedAt: new Date().toISOString()
            };
            
            const content = JSON.stringify(d, null, 2);
            const filename = 'quiz_data/quiz_export_' + new Date().toISOString().replace(/[:.]/g, '-') + '.json';
            
            // Try to get existing file to update it (we'll always create a new file instead)
            // No need to check for existing file since we're using timestamp in filename
            
            await uploadToGithub(
                filename, 
                content, 
                `Update quiz data - ${new Date().toLocaleString()}`,
                null
            );
            
            statusDiv.textContent = '✅ Exported to GitHub successfully!';
            statusDiv.className = 'success';
            showMessage('✅ Exported to GitHub repository');
        } catch (err) {
            const statusDiv = document.getElementById('githubStatus');
            statusDiv.textContent = '❌ Export failed: ' + err.message;
            statusDiv.className = 'error';
            showMessage('❌ Export to GitHub failed: ' + err.message, true);
        }
    }
    
    // Import data from GitHub repository - fetch list of files and let user choose
    async function importFromGitHub() {
        if (!githubConfig.isLoggedIn) {
            showMessage('⚠️ Please login to GitHub first', true);
            return;
        }
        
        try {
            const statusDiv = document.getElementById('githubStatus');
            statusDiv.textContent = '🔄 Fetching file list from GitHub...';
            statusDiv.className = '';
            
            // Fetch the list of files in the quiz_data directory
            const dirContents = await getGithubDirectoryContents('quiz_data');
            
            // Filter for JSON files only
            const jsonFiles = dirContents.filter(item => item.type === 'file' && item.name.endsWith('.json'));
            
            if (jsonFiles.length === 0) {
                throw new Error('No JSON files found in quiz_data directory');
            }
            
            // Show file selection dialog
            const fileNames = jsonFiles.map(f => f.name);
            const selectedFileName = prompt(
                'Available quiz files:\n' + fileNames.join('\n') + '\n\nType the filename you want to import:',
                fileNames[0]
            );
            
            if (!selectedFileName) {
                statusDiv.textContent = '⚠️ Import cancelled';
                statusDiv.className = 'error';
                return;
            }
            
            // Verify the selected file exists
            const selectedFile = jsonFiles.find(f => f.name === selectedFileName);
            if (!selectedFile) {
                throw new Error('File not found: ' + selectedFileName);
            }
            
            statusDiv.textContent = '🔄 Importing ' + selectedFileName + ' from GitHub...';
            
            // Fetch the selected file content
            const fileData = await getGithubFile('quiz_data/' + selectedFileName);
            const d = JSON.parse(fileData.content);
            
            if (d.questions) state.questions = d.questions;
            if (d.participants) state.participants = d.participants;
            if (d.scoreRecords) state.scoreRecords = d.scoreRecords;
            if (d.uploadedImages) state.uploadedImages = d.uploadedImages;
            if (d.uploadedAudios) state.uploadedAudios = d.uploadedAudios;
            
            lastImportedFileName = selectedFileName + ' (from GitHub)';
            localStorage.setItem('lastImportedFileName', lastImportedFileName);
            
            renderQuestionsList();
            renderSlideQuiz();
            renderParticipantsSidebar();
            renderScoreboard();
            updateDatalist();
            saveStateToCookie();
            
            statusDiv.textContent = '✅ Imported ' + selectedFileName + ' from GitHub successfully!';
            statusDiv.className = 'success';
            showMessage('✅ Imported from GitHub: ' + state.questions.length + ' questions');
            
            // Automatically switch to play mode after import to see the quiz
            setPlayMode();
        } catch (err) {
            const statusDiv = document.getElementById('githubStatus');
            statusDiv.textContent = '❌ Import failed: ' + err.message;
            statusDiv.className = 'error';
            showMessage('❌ Import from GitHub failed: ' + err.message, true);
        }
    }
    
    function shuffleQuestionsInPlace() {
        state.questions = shuffleArray([...state.questions]);
        state.currentSlideIndex = 0;
        renderQuestionsList();
        renderSlideQuiz();
        showMessage('Questions shuffled');
    }
    
    // Shuffle questions for play mode only (doesn't modify the original order permanently)
    function shuffleForPlayMode() {
        state.questions = shuffleArray([...state.questions]);
        state.currentSlideIndex = 0;
        renderSlideQuiz();
        showMessage('Questions shuffled for play mode');
    }
    
    function importData(f) { 
        let r = new FileReader(); 
        r.onload = e => { 
            try { 
                let d = JSON.parse(e.target.result); 
                if (d.questions) state.questions = d.questions; 
                if (d.participants) state.participants = d.participants; 
                if (d.scoreRecords) state.scoreRecords = d.scoreRecords; 
                if (d.uploadedImages) state.uploadedImages = d.uploadedImages; 
                if (d.uploadedAudios) state.uploadedAudios = d.uploadedAudios; 
                
                // Save the imported filename for local files
                lastImportedFileName = f.name;
                localStorage.setItem('lastImportedFileName', f.name);
                
                renderQuestionsList(); 
                renderSlideQuiz(); 
                renderParticipantsSidebar(); 
                renderScoreboard(); 
                updateDatalist(); 
                saveStateToCookie(); 
                showMessage('Imported: ' + f.name); 
                
                // Automatically switch to play mode after import to see the quiz
                setPlayMode();
            } catch (err) { 
                showMessage('Invalid file', true); 
            } 
        }; 
        r.readAsText(f); 
    }
    function resetAllScores() { if (confirm('Reset all scores?')) { state.scoreRecords = []; state.participants.forEach(p => p.totalScore = 0); renderParticipantsSidebar(); renderScoreboard(); saveStateToCookie(); showMessage('All scores reset'); } }
    function resetAllQuestions() { if (confirm('Delete all questions?')) { state.questions = []; state.scoreRecords = []; state.participants.forEach(p => p.totalScore = 0); renderQuestionsList(); renderSlideQuiz(); renderParticipantsSidebar(); renderScoreboard(); saveStateToCookie(); showMessage('Questions cleared'); } }
    function openSidebar() { document.getElementById('builderPanel').classList.add('open'); document.getElementById('mainContent').classList.remove('open'); updateModeToggleUI(); }
    function closeSidebar() { document.getElementById('builderPanel').classList.remove('open'); document.getElementById('mainContent').classList.add('open'); updateModeToggleUI(); }
    function toggleSidebar() { state.isEditMode ? closeSidebar() : openSidebar(); }
    function updateModeToggleUI() {
        const playModeBtn = document.getElementById('playModeBtn');
        const editModeBtn = document.getElementById('editModeBtn');
        if (state.isEditMode) {
            playModeBtn.classList.remove('active');
            editModeBtn.classList.add('active');
        } else {
            playModeBtn.classList.add('active');
            editModeBtn.classList.remove('active');
        }
    }
    function setPlayMode() { state.isEditMode = false; closeSidebar(); renderSlideQuiz(); }
    function setEditMode() { state.isEditMode = true; openSidebar(); }
    
    // Global functions for hide-image question type (called from inline onclick handlers)
    window.toggleHideImage = function(wrapper) {
        const img = wrapper.querySelector('.hide-image-element');
        const statusIndicator = wrapper.parentElement.querySelector('.hide-image-status');
        
        if (img.classList.contains('image-hidden')) {
            // Show image
            img.classList.remove('image-hidden');
            statusIndicator.textContent = 'Image is visible';
            statusIndicator.style.background = '#d4edda';
            statusIndicator.style.color = '#155724';
        } else {
            // Hide image - set display to none as requested
            img.classList.add('image-hidden');
            statusIndicator.textContent = 'Image is hidden';
            statusIndicator.style.background = '#f8d7da';
            statusIndicator.style.color = '#721c24';
        }
    };
    
    window.resetHideImage = function(button) {
        const wrapper = button.parentElement.querySelector('.hide-image-wrapper');
        const img = wrapper.querySelector('.hide-image-element');
        const statusIndicator = wrapper.parentElement.querySelector('.hide-image-status');
        
        // Only reset if image is currently hidden
        if (img.classList.contains('image-hidden')) {
            img.classList.remove('image-hidden');
            statusIndicator.textContent = 'Image is visible';
            statusIndicator.style.background = '#d4edda';
            statusIndicator.style.color = '#155724';
        }
    };
    
    // Global functions for 4x4 grid hide image feature
    let gridHiddenCount = 0;
    let gridTotalCount = 0;
    
    // Function to get all available images from the images folder
    function getAvailableImages() {
        // Default historical images
        const defaultImages = [
            'images/Vladimir_I_of_Kiev.PNG',
            'images/YuanEmperorAlbumGenghisPortrait.jpg',
            'images/Joan_of_Arc_miniature_graded.jpg',
            'images/vsevolod_iii_the_big_nest.jpg',
            'images/genghis_portrait.webp'
        ];
        
        // Get stored images from localStorage
        const storedImages = localStorage.getItem('gridImages');
        let knownImages = [];
        if (storedImages) {
            try {
                knownImages = JSON.parse(storedImages);
            } catch (e) {
                console.error('Failed to parse stored images:', e);
            }
        }
        
        // Combine default images with any stored ones, removing duplicates
        const allImages = [...defaultImages];
        knownImages.forEach(img => {
            if (!allImages.includes(img)) {
                allImages.push(img);
            }
        });
        
        return allImages;
    }
    
    // Function to save current image list to localStorage
    function saveImageList(images) {
        localStorage.setItem('gridImages', JSON.stringify(images));
    }
    
    window.initHideImageGrid = function(imageUrls) {
        const gridContainer = document.getElementById('hideImageGrid');
        const hideSection = document.getElementById('hideImageGridSection');
        const mainContent = document.getElementById('mainContent');
        
        if (!gridContainer || !hideSection) return;
        
        // If no imageUrls provided, use dynamically detected images
        if (!imageUrls || imageUrls.length === 0) {
            imageUrls = getAvailableImages();
        }
        
        // Save the current list of images for future reference
        saveImageList(imageUrls);
        
        gridTotalCount = imageUrls.length;
        gridHiddenCount = 0;
        
        // Hide main content, show grid section
        if (mainContent) mainContent.style.display = 'none';
        hideSection.style.display = 'block';
        
        // Update total count display
        document.getElementById('totalCount').textContent = gridTotalCount;
        document.getElementById('hiddenCount').textContent = 0;
        
        // Generate grid items
        let html = '';
        imageUrls.forEach((url, index) => {
            html += '<div class="grid-image-wrapper" onclick="toggleGridImage(this)" data-index="' + index + '">';
            html += '<img src="' + escapeHtml(url) + '" alt="Historical Figure ' + (index + 1) + '" class="grid-historical-image">';
            html += '<div class="grid-click-hint">Click to hide</div>';
            html += '<div class="grid-status-indicator grid-status-visible">Visible</div>';
            html += '</div>';
        });
        
        gridContainer.innerHTML = html;
    };
    
    window.toggleGridImage = function(wrapper) {
        const img = wrapper.querySelector('.grid-historical-image');
        const statusIndicator = wrapper.querySelector('.grid-status-indicator');
        
        if (img.classList.contains('grid-image-hidden')) {
            // Show image
            img.classList.remove('grid-image-hidden');
            statusIndicator.textContent = 'Visible';
            statusIndicator.className = 'grid-status-indicator grid-status-visible';
            gridHiddenCount--;
        } else {
            // Hide image - set display to none as requested
            img.classList.add('grid-image-hidden');
            statusIndicator.textContent = 'Hidden';
            statusIndicator.className = 'grid-status-indicator grid-status-hidden';
            gridHiddenCount++;
        }
        
        // Update score display
        document.getElementById('hiddenCount').textContent = gridHiddenCount;
        
        // Check if all images are hidden
        if (gridHiddenCount === gridTotalCount) {
            setTimeout(() => {
                alert('🎉 Congratulations! You\'ve hidden all the historical figures!');
            }, 500);
        }
    };
    
    window.resetAllImages = function() {
        const wrappers = document.querySelectorAll('.grid-image-wrapper');
        wrappers.forEach(wrapper => {
            const img = wrapper.querySelector('.grid-historical-image');
            const statusIndicator = wrapper.querySelector('.grid-status-indicator');
            
            if (img.classList.contains('grid-image-hidden')) {
                img.classList.remove('grid-image-hidden');
                statusIndicator.textContent = 'Visible';
                statusIndicator.className = 'grid-status-indicator grid-status-visible';
            }
        });
        
        gridHiddenCount = 0;
        document.getElementById('hiddenCount').textContent = 0;
    };
    
    window.exitHideImageGrid = function() {
        const hideSection = document.getElementById('hideImageGridSection');
        const mainContent = document.getElementById('mainContent');
        
        if (hideSection) hideSection.style.display = 'none';
        if (mainContent) mainContent.style.display = 'block';
    };
    
    function toggleScoreboard() { let sb = document.getElementById('scoreboard'); sb.classList.toggle('open'); let io = sb.classList.contains('open'); document.getElementById('toggleScoreboardBtn').innerHTML = io ? '📊 Hide Scoreboard ✕' : '📊 Show Scoreboard 🏆'; if (io) renderScoreboard(); }
    // Update GitHub UI based on login state
    function updateGithubUI() {
        const loginBtn = document.getElementById('githubLoginBtn');
        const exportBtn = document.getElementById('exportGithubBtn');
        const importBtn = document.getElementById('importGithubBtn');
        const statusDiv = document.getElementById('githubStatus');
        
        if (!loginBtn || !exportBtn || !importBtn || !statusDiv) return;
        
        if (githubConfig.isLoggedIn && githubConfig.username) {
            loginBtn.textContent = '🔑 Logged in as ' + githubConfig.username;
            loginBtn.style.background = '#28a745';
            exportBtn.style.display = 'inline-block';
            importBtn.style.display = 'inline-block';
            statusDiv.textContent = '✅ Connected to GitHub';
            statusDiv.className = 'success';
        } else {
            loginBtn.textContent = '🔑 Login with GitHub Token';
            loginBtn.style.background = '#2c7da0';
            exportBtn.style.display = 'none';
            importBtn.style.display = 'none';
            statusDiv.textContent = '';
            statusDiv.className = '';
        }
    }
    
    // GitHub login handler
    async function handleGithubLogin() {
        const tokenInput = document.getElementById('githubTokenInput');
        const token = tokenInput ? tokenInput.value.trim() : '';
        
        if (!token) {
            showMessage('⚠️ Please enter a GitHub token', true);
            return;
        }
        
        try {
            // Temporarily set token to test it
            githubConfig.token = token;
            
            // Get username from GitHub
            const username = await getGithubUser();
            githubConfig.username = username;
            githubConfig.isLoggedIn = true;
            
            // Save to localStorage
            saveGithubConfigToStorage();
            
            // Update UI
            updateGithubUI();
            
            // Close modal
            const modal = document.getElementById('githubLoginModal');
            if (modal) modal.style.display = 'none';
            
            // Clear input
            if (tokenInput) tokenInput.value = '';
            
            showMessage('✅ Logged in as ' + username);
        } catch (err) {
            showMessage('❌ Login failed: ' + err.message, true);
            githubConfig.token = null;
            githubConfig.username = null;
            githubConfig.isLoggedIn = false;
        }
    }
    
    // GitHub logout handler
    function handleGithubLogout() {
        githubConfig.token = null;
        githubConfig.username = null;
        githubConfig.isLoggedIn = false;
        saveGithubConfigToStorage();
        updateGithubUI();
        showMessage('👋 Logged out from GitHub');
    }
    
    function initEventListeners() {
        document.getElementById('playModeBtn').addEventListener('click', setPlayMode);
        document.getElementById('editModeBtn').addEventListener('click', setEditMode);
        document.getElementById('shuffleBtn').addEventListener('click', shuffleForPlayMode);
        
        // Add button to launch 4x4 hide image grid with the 5 historical images
        const shuffleBtn = document.getElementById('shuffleBtn');
        if (shuffleBtn) {
            const gridBtn = document.createElement('button');
            gridBtn.className = 'mode-toggle-btn';
            gridBtn.id = 'gridModeBtn';
            gridBtn.setAttribute('aria-label', '4x4 Grid Mode');
            gridBtn.innerHTML = '🖼️ 4x4 Grid';
            gridBtn.addEventListener('click', () => {
                const historicalImages = [
                    'images/Vladimir_I_of_Kiev.PNG',
                    'images/YuanEmperorAlbumGenghisPortrait.jpg',
                    'images/Joan_of_Arc_miniature_graded.jpg',
                    'images/vsevolod_iii_the_big_nest.jpg',
                    'images/genghis_portrait.webp'
                ];
                window.initHideImageGrid(historicalImages);
            });
            shuffleBtn.parentNode.insertBefore(gridBtn, shuffleBtn.nextSibling);
        }
        
        document.getElementById('addOptionBtn').addEventListener('click', () => { let c = document.getElementById('optionsContainer'), d = document.createElement('div'); d.className = 'option-row'; d.innerHTML = '<input type="text" class="option-text" placeholder="New option"><input type="checkbox" class="option-correct"> <span>✓</span><button type="button" class="btn-icon">✖</button>'; d.querySelector('button').addEventListener('click', () => { if (c.children.length > 1) d.remove(); else showMessage('Need at least one option', true); }); c.appendChild(d); });
        document.getElementById('saveQuestionBtn').addEventListener('click', saveQuestion);
        document.getElementById('clearFormBtn').addEventListener('click', clearForm);
        document.getElementById('addParticipantBtn').addEventListener('click', () => { let n = document.getElementById('newParticipantName').value.trim(); if (n) { if (!state.participants.find(p => p.name === n)) { state.participants.push({ id: generateId(), name: n, totalScore: 0 }); renderParticipantsSidebar(); updateDatalist(); saveStateToCookie(); showMessage('Added ' + n); } else showMessage('Exists', true); } else showMessage('Enter name', true); document.getElementById('newParticipantName').value = ''; });
        document.getElementById('resetAllQuestionsBtn').addEventListener('click', resetAllQuestions);
        document.getElementById('resetAllScoresBtn').addEventListener('click', resetAllScores);
        document.getElementById('exportBtn').addEventListener('click', exportData);
        document.getElementById('resetScoresBtn').addEventListener('click', resetAllScores);
        
        // Import Local button
        if (document.getElementById('importLocalBtn')) {
            document.getElementById('importLocalBtn').addEventListener('click', () => {
                document.getElementById('importFile').click();
            });
        }
        
        document.getElementById('importFile').addEventListener('change', e => { if (e.target.files.length) importData(e.target.files[0]); e.target.value = ''; });
        
        // GitHub buttons
        if (document.getElementById('githubLoginBtn')) {
            document.getElementById('githubLoginBtn').addEventListener('click', () => {
                const modal = document.getElementById('githubLoginModal');
                if (modal) {
                    if (githubConfig.isLoggedIn) {
                        // If already logged in, ask for logout confirmation
                        if (confirm('Do you want to logout from GitHub?')) {
                            handleGithubLogout();
                        }
                    } else {
                        modal.style.display = 'block';
                    }
                }
            });
        }
        
        if (document.getElementById('exportGithubBtn')) {
            document.getElementById('exportGithubBtn').addEventListener('click', exportToGitHub);
        }
        
        if (document.getElementById('importGithubBtn')) {
            document.getElementById('importGithubBtn').addEventListener('click', importFromGitHub);
        }
        
        // Modal close handlers
        if (document.getElementById('closeGithubModalBtn')) {
            document.getElementById('closeGithubModalBtn').addEventListener('click', () => {
                const modal = document.getElementById('githubLoginModal');
                if (modal) modal.style.display = 'none';
            });
        }
        
        if (document.getElementById('confirmGithubLoginBtn')) {
            document.getElementById('confirmGithubLoginBtn').addEventListener('click', handleGithubLogin);
        }
        
        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('githubLoginModal');
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
        
        document.getElementById('typeToggleGroup').addEventListener('click', e => { let t = e.target.closest('.type-option'); if (t) { state.currentType = t.dataset.type; updateTypeToggleUI(); } });
        document.getElementById('toggleScoreboardBtn').addEventListener('click', toggleScoreboard);
        document.getElementById('closeScoreboardBtn').addEventListener('click', toggleScoreboard);
        document.querySelectorAll('.tab-btn').forEach(b => { b.addEventListener('click', () => { let t = b.dataset.tab; document.querySelectorAll('.tab-btn').forEach(x => x.classList.remove('active')); document.querySelectorAll('.tab-content').forEach(x => x.classList.remove('active')); b.classList.add('active'); document.getElementById(t + 'Tab').classList.add('active'); if (t === 'rankings') renderRankings(); if (t === 'details') renderParticipantSelect(); if (t === 'stats') renderStatistics(); }); });
        if (document.getElementById('searchParticipant')) document.getElementById('searchParticipant').addEventListener('input', renderRankings);
        if (document.getElementById('sortBySelect')) document.getElementById('sortBySelect').addEventListener('change', renderRankings);
        
        // Image preview handler
        if (document.getElementById('questionImage')) {
            document.getElementById('questionImage').addEventListener('change', e => {
                let file = e.target.files[0];
                let preview = document.getElementById('imagePreviewContainer');
                if (preview) {
                    if (file) {
                        let reader = new FileReader();
                        reader.onload = ev => {
                            preview.innerHTML = '<img src="' + ev.target.result + '" alt="Preview" style="max-width:200px;max-height:150px;border-radius:0.5rem;margin-top:0.5rem;">';
                        };
                        reader.readAsDataURL(file);
                    } else {
                        preview.innerHTML = '';
                    }
                }
            });
        }
        
        // Upload image button handler - trigger file input click
        if (document.getElementById('uploadImageBtn')) {
            document.getElementById('uploadImageBtn').addEventListener('click', () => {
                let fileInput = document.getElementById('questionImage');
                if (fileInput) {
                    fileInput.click();
                }
            });
        }
        
        // Audio preview handler
        if (document.getElementById('questionAudio')) {
            document.getElementById('questionAudio').addEventListener('change', e => {
                let file = e.target.files[0];
                let preview = document.getElementById('audioPreviewContainer');
                if (preview) {
                    if (file) {
                        let reader = new FileReader();
                        reader.onload = ev => {
                            preview.innerHTML = '<audio controls src="' + ev.target.result + '" style="max-width:300px;margin-top:0.5rem;"></audio>';
                        };
                        reader.readAsDataURL(file);
                    } else {
                        preview.innerHTML = '';
                    }
                }
            });
        }
        
        // Upload audio button handler - trigger file input click
        if (document.getElementById('uploadAudioBtn')) {
            document.getElementById('uploadAudioBtn').addEventListener('click', () => {
                let fileInput = document.getElementById('questionAudio');
                if (fileInput) {
                    fileInput.click();
                }
            });
        }
        
        // Load configuration from localStorage on page load
        loadGithubConfig();
    }

        // Hide Image input preview handler
        if (document.getElementById('hideImageInput')) {
            document.getElementById('hideImageInput').addEventListener('change', e => {
                let file = e.target.files[0];
                let preview = document.getElementById('hideImagePreviewContainer');
                if (preview) {
                    if (file) {
                        let reader = new FileReader();
                        reader.onload = ev => {
                            preview.innerHTML = '<img src="' + ev.target.result + '" alt="Preview" style="max-width:200px;max-height:150px;border-radius:0.5rem;margin-top:0.5rem;">';
                        };
                        reader.readAsDataURL(file);
                    } else {
                        preview.innerHTML = '';
                    }
                }
            });
        }
        
        // Upload hide image button handler - trigger file input click
        if (document.getElementById('uploadHideImageBtn')) {
            document.getElementById('uploadHideImageBtn').addEventListener('click', () => {
                let fileInput = document.getElementById('hideImageInput');
                if (fileInput) {
                    fileInput.click();
                }
            });
        }
        
        // Load configuration from localStorage on page load
        loadGithubConfig();
        
        // Check for new images in the images folder on page refresh
        checkForNewImages();
    }
    
    // Function to check for new images and add them to the grid
    function checkForNewImages() {
        // This function attempts to detect new images by trying to load common image formats
        // Since we can't directly scan the filesystem from browser JS, we use a predefined list
        // of potential image paths and check if they exist
        
        const potentialImagePaths = [
            'images/Vladimir_I_of_Kiev.PNG',
            'images/YuanEmperorAlbumGenghisPortrait.jpg',
            'images/Joan_of_Arc_miniature_graded.jpg',
            'images/vsevolod_iii_the_big_nest.jpg',
            'images/genghis_portrait.webp'
        ];
        
        // Get currently known images
        const storedImages = localStorage.getItem('gridImages');
        let knownImages = [];
        if (storedImages) {
            try {
                knownImages = JSON.parse(storedImages);
            } catch (e) {
                console.error('Failed to parse stored images:', e);
            }
        }
        
        // Track how many images we've checked
        let checkedCount = 0;
        const totalToCheck = potentialImagePaths.length;
        
        // Check each potential image path
        potentialImagePaths.forEach(path => {
            const img = new Image();
            img.onload = function() {
                // Image exists, add it if not already known
                if (!knownImages.includes(path)) {
                    knownImages.push(path);
                    saveImageList(knownImages);
                    console.log('New image detected and added:', path);
                }
                checkedCount++;
                // If all images checked and we have new ones, log summary
                if (checkedCount === totalToCheck && knownImages.length > 0) {
                    console.log('Total images available for grid:', knownImages.length);
                }
            };
            img.onerror = function() {
                // Image doesn't exist, ignore
                checkedCount++;
            };
            img.src = path + '?t=' + Date.now(); // Add timestamp to prevent caching
        });
    }
    
    function init() { renderOptionInputs(); renderQuestionsList(); renderSlideQuiz(); renderParticipantsSidebar(); renderScoreboard(); updateDatalist(); setPlayMode(); }
    initEventListeners();
    init();
})();
