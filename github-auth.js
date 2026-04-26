// GitHub Device Flow Authentication Module
// Implements GitHub Device Flow for public clients (SPA, native apps)
// This avoids exposing client secrets in frontend code and doesn't require redirects

(function() {
    'use strict';

    const CONFIG = {
        CLIENT_ID: 'Ov23li9AVIOvpSq9diYX',
        SCOPE: 'repo,user:email'
    };

    // Storage keys
    const STORAGE_KEYS = {
        ACCESS_TOKEN: 'github_access_token',
        DEVICE_CODE: 'github_device_code',
        USER_INFO: 'github_user_info',
        DEVICE_FLOW_STATE: 'github_device_flow_state'
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
        sessionStorage.removeItem(STORAGE_KEYS.DEVICE_CODE);
        sessionStorage.removeItem(STORAGE_KEYS.USER_INFO);
        sessionStorage.removeItem(STORAGE_KEYS.DEVICE_FLOW_STATE);
    }

    // Request device code from GitHub
    async function requestDeviceCode() {
        try {
            const params = new URLSearchParams();
            params.append('client_id', CONFIG.CLIENT_ID);
            params.append('scope', CONFIG.SCOPE);

            console.log('Requesting device code from GitHub...');
            console.log('Client ID:', CONFIG.CLIENT_ID);
            
            const response = await fetch('https://github.com/login/device/code', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json' 
                },
                body: params.toString(),
                mode: 'cors',
                credentials: 'omit'
            });

            console.log('Response status:', response.status, response.statusText);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('GitHub API error response:', errorText);
                let error;
                try {
                    error = JSON.parse(errorText);
                } catch (e) {
                    error = { error_description: errorText || 'Failed to get device code' };
                }
                throw new Error(error.error_description || error.error || 'Failed to get device code');
            }

            const data = await response.json();
            console.log('Device code received successfully');
            
            // Store device code and state
            sessionStorage.setItem(STORAGE_KEYS.DEVICE_CODE, data.device_code);
            sessionStorage.setItem(STORAGE_KEYS.DEVICE_FLOW_STATE, JSON.stringify({
                deviceCode: data.device_code,
                userCode: data.user_code,
                verificationUri: data.verification_uri,
                expiresIn: data.expires_in,
                interval: data.interval,
                startTime: Date.now()
            }));

            return {
                deviceCode: data.device_code,
                userCode: data.user_code,
                verificationUri: data.verification_uri,
                verificationUriComplete: data.verification_uri_complete,
                expiresIn: data.expires_in,
                interval: data.interval
            };
        } catch (err) {
            console.error('Error requesting device code:', err);
            throw err;
        }
    }

    // Poll for access token using device code
    async function pollForToken(deviceCode, interval, expiresAt) {
        return new Promise((resolve, reject) => {
            const checkToken = async () => {
                if (Date.now() >= expiresAt) {
                    clearInterval(pollInterval);
                    reject(new Error('Device code expired. Please try again.'));
                    return;
                }

                try {
                    const params = new URLSearchParams();
                    params.append('client_id', CONFIG.CLIENT_ID);
                    params.append('device_code', deviceCode);
                    params.append('grant_type', 'urn:ietf:params:oauth:grant-type:device_code');

                    console.log('Polling for token...');
                    
                    const response = await fetch('https://github.com/login/oauth/access_token', {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/x-www-form-urlencoded',
                            'Accept': 'application/json' 
                        },
                        body: params.toString(),
                        mode: 'cors',
                        credentials: 'omit'
                    });

                    console.log('Poll response status:', response.status, response.statusText);

                    const data = await response.json();
                    console.log('Poll response data:', data.error || 'success');

                    if (data.access_token) {
                        clearInterval(pollInterval);
                        resolve(data.access_token);
                    } else if (data.error === 'authorization_pending') {
                        // User hasn't authorized yet, continue polling
                        return;
                    } else if (data.error === 'slow_down') {
                        // GitHub is asking us to slow down polling
                        clearInterval(pollInterval);
                        pollInterval = setInterval(checkToken, (data.interval || interval + 5) * 1000);
                    } else if (data.error === 'expired_token') {
                        clearInterval(pollInterval);
                        reject(new Error('Device code expired. Please try again.'));
                    } else if (data.error) {
                        clearInterval(pollInterval);
                        reject(new Error(data.error_description || data.error));
                    }
                } catch (err) {
                    console.error('Error during polling:', err);
                    clearInterval(pollInterval);
                    reject(err);
                }
            };

            const pollInterval = setInterval(checkToken, interval * 1000);
            // Start first check immediately
            checkToken();
        });
    }

    // Login with GitHub using Device Flow
    async function loginWithGitHub() {
        try {
            // Request device code
            const deviceInfo = await requestDeviceCode();
            
            // Show user the verification code and URL
            const message = `To complete authentication:\n\n1. Visit: ${deviceInfo.verificationUri}\n2. Enter code: ${deviceInfo.userCode}\n\nClick OK after you've entered the code on GitHub.`;
            
            if (confirm(message)) {
                // Open verification URI in new window for convenience
                window.open(deviceInfo.verificationUriComplete, '_blank');
                
                // Start polling for token
                const expiresAt = Date.now() + (deviceInfo.expiresIn * 1000);
                
                try {
                    const token = await pollForToken(deviceInfo.deviceCode, deviceInfo.interval, expiresAt);
                    saveToken(token);
                    sessionStorage.removeItem(STORAGE_KEYS.DEVICE_CODE);
                    sessionStorage.removeItem(STORAGE_KEYS.DEVICE_FLOW_STATE);
                    
                    // Fetch and store user info
                    await fetchUserInfo(token);
                    return true;
                } catch (err) {
                    console.error('Device flow failed:', err);
                    clearAuthData();
                    throw err;
                }
            } else {
                clearAuthData();
                throw new Error('Authentication cancelled by user');
            }
        } catch (err) {
            console.error('Error initiating GitHub Device Flow:', err);
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
