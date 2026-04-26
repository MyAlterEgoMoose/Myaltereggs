// GitHub OAuth 2.0 Authorization Code Flow with PKCE
// Designed for Single Page Applications (SPAs) without a backend
// Uses PKCE (Proof Key for Code Exchange) for security without client secret

(function() {
    'use strict';

    const CONFIG = {
        CLIENT_ID: '',
        SCOPE: 'repo,user:email',
        REDIRECT_URI: window.location.origin + window.location.pathname,
        AUTH_URL: 'https://github.com/login/oauth/authorize',
        TOKEN_URL: 'https://github.com/login/oauth/access_token'
    };
    
    // Storage keys
    const STORAGE_KEYS = {
        ACCESS_TOKEN: 'github_access_token',
        USER_INFO: 'github_user_info',
        PKCE_CODE_VERIFIER: 'github_pkce_code_verifier',
        PKCE_STATE: 'github_pkce_state'
    };
    
    // State management
    let authState = {
        isAuthenticated: false,
        user: null,
        token: null
    };
    
    // Generate cryptographically random string for PKCE
    function generateRandomString(length) {
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }
    
    // Generate code challenge for PKCE
    async function generateCodeChallenge(codeVerifier) {
        const encoder = new TextEncoder();
        const data = encoder.encode(codeVerifier);
        const digest = await crypto.subtle.digest('SHA-256', data);
        return btoa(String.fromCharCode(...new Uint8Array(digest)))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    }
    
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
        sessionStorage.removeItem(STORAGE_KEYS.USER_INFO);
        sessionStorage.removeItem(STORAGE_KEYS.PKCE_CODE_VERIFIER);
        sessionStorage.removeItem(STORAGE_KEYS.PKCE_STATE);
    }
    
    // Handle OAuth callback using Netlify Function
    async function handleCallback(code, state) {
        try {
            // Verify state matches
            const savedState = sessionStorage.getItem(STORAGE_KEYS.PKCE_STATE);
            if (!savedState || savedState !== state) {
                throw new Error('State mismatch - possible CSRF attack');
            }
            
            // Get code verifier
            const codeVerifier = sessionStorage.getItem(STORAGE_KEYS.PKCE_CODE_VERIFIER);
            if (!codeVerifier) {
                throw new Error('Code verifier not found');
            }
            
            // Exchange code for token using Netlify Function (server-side)
            const tokenResponse = await fetch('/.netlify/functions/github-callback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    code: code,
                    state: state,
                    redirect_uri: CONFIG.REDIRECT_URI
                })
            });
            
            if (!tokenResponse.ok) {
                const errorData = await tokenResponse.json();
                throw new Error(errorData.error_description || errorData.error || 'Failed to get access token');
            }
            
            const data = await tokenResponse.json();
            
            if (data.access_token) {
                saveToken(data.access_token);
                sessionStorage.removeItem(STORAGE_KEYS.PKCE_CODE_VERIFIER);
                sessionStorage.removeItem(STORAGE_KEYS.PKCE_STATE);
                
                // Clean URL without reload
                const cleanUrl = window.location.protocol + '//' + window.location.host + window.location.pathname;
                window.history.replaceState({}, document.title, cleanUrl);
                
                // Fetch and store user info
                await fetchUserInfo(data.access_token);
                return true;
            } else {
                throw new Error(data.error_description || data.error || 'No access token received');
            }
        } catch (err) {
            console.error('Error handling OAuth callback:', err);
            clearAuthData();
            throw err;
        }
    }
    
    // Check for OAuth callback on page load
    async function checkForCallback() {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');
        
        if (error) {
            console.error('OAuth error:', urlParams.get('error_description') || error);
            clearAuthData();
            return false;
        }
        
        if (code && state) {
            return await handleCallback(code, state);
        }
        
        return false;
    }
    
    // Login with GitHub using OAuth 2.0 PKCE
    async function loginWithGitHub() {
        try {
            // Generate PKCE parameters
            const codeVerifier = generateRandomString(32);
            const codeChallenge = await generateCodeChallenge(codeVerifier);
            const state = generateRandomString(16);
            
            // Store for callback verification
            sessionStorage.setItem(STORAGE_KEYS.PKCE_CODE_VERIFIER, codeVerifier);
            sessionStorage.setItem(STORAGE_KEYS.PKCE_STATE, state);
            
            // Build authorization URL
            const authUrl = new URL(CONFIG.AUTH_URL);
            authUrl.searchParams.set('client_id', CONFIG.CLIENT_ID);
            authUrl.searchParams.set('redirect_uri', CONFIG.REDIRECT_URI);
            authUrl.searchParams.set('scope', CONFIG.SCOPE);
            authUrl.searchParams.set('state', state);
            authUrl.searchParams.set('code_challenge', codeChallenge);
            authUrl.searchParams.set('code_challenge_method', 'S256');
            
            // Redirect to GitHub for authorization
            window.location.href = authUrl.toString();
            
        } catch (err) {
            console.error('Error initiating GitHub OAuth:', err);
            clearAuthData();
            throw err;
        }
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
        // First check for OAuth callback
        const handledCallback = await checkForCallback();
        
        if (handledCallback) {
            return authState;
        }
        
        // Load user info from existing token
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
