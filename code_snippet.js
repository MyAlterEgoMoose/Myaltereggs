const state = { questions: [], participants: [], scoreRecords: [], currentSlideIndex: 0, editingId: null, currentType: 'single', isSidebarOpen: false, uploadedImages: [] };
const GITHUB_CONFIG = {
    owner: '', // Will be set by user
    repo: '',  // Will be set by user
    branch: 'main',
    token: ''  // Will be set by user
};

// Image upload to GitHub
async function uploadImageToGitHub(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const base64Content = e.target.result.split(',')[1];
                const fileName = 'images/' + Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9._-]/g, '_');

                // Create the file in GitHub using API
                const apiUrl = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${fileName}`;

                const response = await fetch(apiUrl, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `token ${GITHUB_CONFIG.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: 'Upload image via quiz app',
                        content: base64Content,
                        branch: GITHUB_CONFIG.branch
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    const imageUrl = `https://raw.githubusercontent.com/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/${GITHUB_CONFIG.branch}/${fileName}`;
                    state.uploadedImages.push({ originalName: file.name, githubUrl: imageUrl, uploadedAt: new Date().toISOString() });
                    resolve(imageUrl);
                } else {
                    const err = await response.json();
                    reject(new Error(err.message || 'Upload failed'));
                }
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

let imageData = null;
let imageInput = document.getElementById('questionImage');
if (imageInput && imageInput.files && imageInput.files[0]) {
    imageData = { fileName: imageInput.files[0].name, file: imageInput.files[0] };
}

async function saveQuestion() {
    let d = gatherFormData();
    if (!d) return;

    // Handle image upload if present
    if (d.image && d.image.file) {
        try {
            showMessage('⏳ Uploading image...');
            let imageUrl = await uploadImageToGitHub(d.image.file);
            d.image = { fileName: d.image.fileName, imageUrl: imageUrl };
        } catch (err) {
            showMessage('⚠️ Image upload failed: ' + err.message, true);
            d.image = null;
        }
    } else if (state.editingId) {
        // Preserve existing image when editing without new image
        let existingQ = state.questions.find(q => q.id === state.editingId);
        if (existingQ && existingQ.image) {
            d.image = existingQ.image;
        }
    }

    let imgInput = document.getElementById('questionImage');
    if (imgInput) imgInput.value = '';
    let preview = document.getElementById('imagePreviewContainer');
    if (preview) preview.innerHTML = '';
}

async function exportData() {
    // Upload any images associated with questions to GitHub
    if (state.uploadedImages.length > 0 && (!GITHUB_CONFIG.owner || !GITHUB_CONFIG.repo || !GITHUB_CONFIG.token)) {
        showMessage('⚠️ Configure GitHub settings first (owner, repo, token)', true);
        return;
    }
    
    let shuffledQuestions = shuffleArray([...state.questions]);
    let d = {
        questions: shuffledQuestions,
        participants: state.participants,
        scoreRecords: state.scoreRecords,
        uploadedImages: state.uploadedImages
    };
    showMessage('✅ Exported with ' + state.uploadedImages.length + ' image(s)');
}

// Image preview handler
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

// GitHub settings handler
document.getElementById('saveGithubSettingsBtn').addEventListener('click', () => {
    let owner = document.getElementById('githubOwner').value.trim();
    let repo = document.getElementById('githubRepo').value.trim();
    let token = document.getElementById('githubToken').value.trim();
    if (!owner || !repo || !token) {
        showMessage('⚠️ Please fill in all GitHub settings', true);
        return;
    }
    GITHUB_CONFIG.owner = owner;
    GITHUB_CONFIG.repo = repo;
    GITHUB_CONFIG.token = token;
    showMessage('✅ GitHub settings saved!');
});

// Helper function to render question with image indicator
function getQuestionDisplayText(q) {
    return (q.image ? ' 🖼️' : '');
}

// Helper function to render question HTML with image
function renderQuestionImage(q) {
    let h = '';
    if (q.image && q.image.imageUrl) {
        h += '<img src="' + escapeHtml(q.image.imageUrl) + '" alt="Question image" style="max-width:100%;max-height:300px;border-radius:1rem;margin-bottom:1rem;">';
    }
    return h;
}
