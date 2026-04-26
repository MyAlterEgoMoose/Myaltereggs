// GitHub OAuth Authentication Module
// Implements OAuth Device Flow for public clients (SPA, native apps)
// This avoids exposing client secrets in frontend code

(function() {
    'use strict';

    const CONFIG = {
        CLIENT_ID: 'Ov23li9AVIOvpSq9diYX',
        REDIRECT_URI: window.location.origin + window.location.pathname,
        SCOPE: 'repo,user:email'
    };

    // Storage keys
    const STORAGE_KEYS = {
        ACCESS_TOKEN: 'github_access_token',
        PKCE_VERIFIER: 'pkce_code_verifier',
        DEVICE_CODE: 'github_device_code',
        USER_INFO: 'github_user_info'
    };

    // State management
    let authState = {
        isAuthenticated: false,
        user: null,
        token: null
    };

    // Get token from sessionStorage
    function getGithubToken() {
        return sessionStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) || '';
    }

    // Save token to sessionStorage
    function saveToken(token) {
        sessionStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
    }

    // Clear all auth data
    function clearAuthData() {
        sessionStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        sessionStorage.removeItem(STORAGE_KEYS.PKCE_VERIFIER);
        sessionStorage.removeItem(STORAGE_KEYS.DEVICE_CODE);
        sessionStorage.removeItem(STORAGE_KEYS.USER_INFO);
    }

    // Generate random string for PKCE
    function generateRandomString(length) {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
        for (let i = 0; i < length; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    // Create SHA-256 code challenge for PKCE
    async function createCodeChallenge(codeVerifier) {
        const encoder = new TextEncoder();
        const data = encoder.encode(codeVerifier);
        const digest = await crypto.subtle.digest('SHA-256', data);
        return btoa(String.fromCharCode(...new Uint8Array(digest)))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    }

    // Login with GitHub using Authorization Code Flow with PKCE
    async function loginWithGitHub() {
        try {
            const codeVerifier = generateRandomString(32);
            const codeChallenge = await createCodeChallenge(codeVerifier);
            sessionStorage.setItem(STORAGE_KEYS.PKCE_VERIFIER, codeVerifier);

            const authUrl = new URL('https://github.com/login/oauth/authorize');
            authUrl.searchParams.append('client_id', CONFIG.CLIENT_ID);
            authUrl.searchParams.append('redirect_uri', CONFIG.REDIRECT_URI);
            authUrl.searchParams.append('scope', CONFIG.SCOPE);
            authUrl.searchParams.append('code_challenge_method', 'S256');
            authUrl.searchParams.append('code_challenge', codeChallenge);
            authUrl.searchParams.append('state', generateRandomString(16));

            window.location.href = authUrl.toString();
        } catch (err) {
            console.error('Error initiating GitHub login:', err);
            throw err;
        }
    }

    // Handle OAuth callback after redirect from GitHub
    async function handleCallback() {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');

        if (code) {
            const codeVerifier = sessionStorage.getItem(STORAGE_KEYS.PKCE_VERIFIER);
            if (!codeVerifier) {
                console.error('No code verifier found');
                throw new Error('Authentication state mismatch. Please try again.');
            }

            try {
                const response = await fetch('https://github.com/login/oauth/access_token', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json', 
                        'Accept': 'application/json' 
                    },
                    body: JSON.stringify({
                        client_id: CONFIG.CLIENT_ID,
                        code: code,
                        redirect_uri: CONFIG.REDIRECT_URI,
                        code_verifier: codeVerifier
                    })
                });

                const data = await response.json();
                
                if (data.access_token) {
                    saveToken(data.access_token);
                    sessionStorage.removeItem(STORAGE_KEYS.PKCE_VERIFIER);
                    window.history.replaceState({}, document.title, window.location.pathname);
                    
                    // Fetch and store user info
                    await fetchUserInfo(data.access_token);
                    return true;
                } else if (data.error) {
                    console.error('OAuth error:', data.error_description || data.error);
                    throw new Error(data.error_description || data.error);
                } else {
                    throw new Error('Unexpected response from GitHub');
                }
            } catch (err) {
                console.error('Error exchanging code for token:', err);
                throw err;
            }
        }
        
        return false;
    }

    // Fetch current user info from GitHub API
    async function fetchUserInfo(token = null) {
        const accessToken = token || getGithubToken();
        
        if (!accessToken) {
            authState.isAuthenticated = false;
            authState.user = null;
            authState.token = null;
            return null;
        }

        try {
            const response = await fetch('https://api.github.com/user', {
                headers: { 
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (response.ok) {
                const user = await response.json();
                authState.isAuthenticated = true;
                authState.user = user;
                authState.token = accessToken;
                sessionStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(user));
                return user;
            } else if (response.status === 401) {
                // Token expired or invalid
                clearAuthData();
                authState.isAuthenticated = false;
                authState.user = null;
                authState.token = null;
                return null;
            } else {
                throw new Error(`Failed to fetch user info: ${response.status}`);
            }
        } catch (err) {
            console.error('Error fetching user info:', err);
            authState.isAuthenticated = false;
            authState.user = null;
            authState.token = null;
            return null;
        }
    }

    // Get cached user info
    function getCachedUserInfo() {
        const cached = sessionStorage.getItem(STORAGE_KEYS.USER_INFO);
        if (cached) {
            try {
                return JSON.parse(cached);
            } catch (e) {
                return null;
            }
        }
        return null;
    }

    // Logout
    function logout() {
        clearAuthData();
        authState.isAuthenticated = false;
        authState.user = null;
        authState.token = null;
    }

    // Check if user is authenticated
    function isAuthenticated() {
        return authState.isAuthenticated && !!getGithubToken();
    }

    // Initialize authentication state on page load
    async function initAuth() {
        const urlParams = new URLSearchParams(window.location.search);
        
        if (urlParams.has('code')) {
            // Handle OAuth callback
            try {
                await handleCallback();
            } catch (err) {
                console.error('OAuth callback failed:', err);
            }
        }
        
        // Load user info
        const token = getGithubToken();
        if (token) {
            await fetchUserInfo(token);
        } else {
            const cachedUser = getCachedUserInfo();
            if (cachedUser) {
                authState.isAuthenticated = true;
                authState.user = cachedUser;
            }
        }
        
        return authState;
    }

    // Expose public API
    window.GitHubAuth = {
        login: loginWithGitHub,
        logout: logout,
        getUser: () => authState.user,
        getToken: getGithubToken,
        isAuthenticated: isAuthenticated,
        init: initAuth,
        fetchUserInfo: fetchUserInfo,
        CONFIG: CONFIG
    };

})();
