// Multiplayer Landing Page JavaScript
// Handles authentication, modal management, and game redirection

class MultiplayerLanding {
    constructor() {
        this.serverUrl = window.GameConfig ? window.GameConfig.getServerUrl() : 'http://localhost:3001';
        this.token = localStorage.getItem('jwt');
        this.userId = null;
        this.username = null;
        this.userStats = { wins: 0, losses: 0, winrate: 0 };

        this.initializeElements();
        this.setupEventListeners();
        this.checkAuthStatus();
        this.setupThemeToggle();
    }

    initializeElements() {
        // Authentication elements
        this.authStatus = document.getElementById('auth-status');
        this.userProfile = document.getElementById('user-profile');
        this.authBtn = document.getElementById('auth-btn');
        this.logoutBtn = document.getElementById('logout-btn');
        this.authStatusText = document.getElementById('auth-status-text');
        
        // User profile elements
        this.userDisplayName = document.getElementById('user-display-name');
        this.userWinsDisplay = document.getElementById('user-wins-display');
        this.userLossesDisplay = document.getElementById('user-losses-display');
        this.userWinrateDisplay = document.getElementById('user-winrate-display');
        
        // Modal elements
        this.authModal = document.getElementById('auth-modal');
        this.closeModal = document.getElementById('close-modal');
        this.modalTitle = document.getElementById('modal-title');
        
        // Form elements
        this.loginForm = document.getElementById('login-form');
        this.registerForm = document.getElementById('register-form');
        this.showRegisterBtn = document.getElementById('show-register-btn');
        this.showLoginBtn = document.getElementById('show-login-btn');
        this.authMessage = document.getElementById('auth-message');
        
        // Game buttons
        this.lctrMultiplayerBtn = document.getElementById('lctr-multiplayer-btn');
        this.cornerMultiplayerBtn = document.getElementById('corner-multiplayer-btn');
    }

    setupEventListeners() {
        // Authentication
        this.authBtn.addEventListener('click', () => this.showAuthModal());
        this.logoutBtn.addEventListener('click', () => this.handleLogout());
        this.closeModal.addEventListener('click', () => this.hideAuthModal());
        
        // Form switching
        this.showRegisterBtn.addEventListener('click', () => this.showRegisterForm());
        this.showLoginBtn.addEventListener('click', () => this.showLoginForm());
        
        // Form submissions
        this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        this.registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        
        // Game buttons
        this.lctrMultiplayerBtn.addEventListener('click', () => this.redirectToGame('lctr'));
        this.cornerMultiplayerBtn.addEventListener('click', () => this.redirectToGame('corner'));
        
        // Close modal when clicking outside
        this.authModal.addEventListener('click', (e) => {
            if (e.target === this.authModal) {
                this.hideAuthModal();
            }
        });
        
        // Enter key support for forms
        document.getElementById('login-username').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleLogin(e);
        });
        document.getElementById('login-password').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleLogin(e);
        });
        document.getElementById('register-username').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleRegister(e);
        });
        document.getElementById('register-password').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleRegister(e);
        });
        document.getElementById('register-confirm-password').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleRegister(e);
        });
    }

    setupThemeToggle() {
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                const currentTheme = document.documentElement.getAttribute('data-theme');
                const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                document.documentElement.setAttribute('data-theme', newTheme);
                localStorage.setItem('theme', newTheme);
                
                // Update button text
                const themeIcon = themeToggle.querySelector('.theme-icon');
                if (themeIcon) {
                    themeToggle.innerHTML = themeIcon.outerHTML + ` [${newTheme === 'dark' ? 'dark' : 'light'}]`;
                }
            });
            
            // Set initial theme
            const savedTheme = localStorage.getItem('theme') || 'light';
            document.documentElement.setAttribute('data-theme', savedTheme);
            const themeIcon = themeToggle.querySelector('.theme-icon');
            if (themeIcon) {
                themeToggle.innerHTML = themeIcon.outerHTML + ` [${savedTheme}]`;
            }
        }
    }

    checkAuthStatus() {
        if (this.token) {
            this.validateToken();
        } else {
            this.showAuthSection();
        }
    }

    async validateToken() {
        try {
            const response = await fetch(`${this.serverUrl}/api/profile/me`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (response.ok) {
                const user = await response.json();
                this.userId = user.id;
                this.username = user.username;
                await this.loadUserStats();
                this.showUserProfile();
            } else {
                this.clearAuth();
                this.showAuthSection();
            }
        } catch (error) {
            console.error('Token validation failed:', error);
            this.clearAuth();
            this.showAuthSection();
        }
    }

    async loadUserStats() {
        try {
            const response = await fetch(`${this.serverUrl}/api/profile/stats`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (response.ok) {
                this.userStats = await response.json();
            }
        } catch (error) {
            console.error('Failed to load user stats:', error);
        }
    }

    showAuthSection() {
        this.authStatus.classList.remove('hidden');
        this.userProfile.classList.add('hidden');
        this.enableGameButtons(false);
    }

    showUserProfile() {
        this.authStatus.classList.add('hidden');
        this.userProfile.classList.remove('hidden');
        
        this.userDisplayName.textContent = `Welcome, ${this.username}!`;
        this.userWinsDisplay.textContent = `Wins: ${this.userStats.wins || 0}`;
        this.userLossesDisplay.textContent = `Losses: ${this.userStats.losses || 0}`;
        this.userWinrateDisplay.textContent = `Win Rate: ${this.userStats.winrate || 0}%`;
        
        this.enableGameButtons(true);
    }

    enableGameButtons(enabled) {
        this.lctrMultiplayerBtn.disabled = !enabled;
        this.cornerMultiplayerBtn.disabled = !enabled;
        
        if (!enabled) {
            this.lctrMultiplayerBtn.title = 'Please log in to play multiplayer';
            this.cornerMultiplayerBtn.title = 'Please log in to play multiplayer';
        } else {
            this.lctrMultiplayerBtn.title = '';
            this.cornerMultiplayerBtn.title = '';
        }
    }

    showAuthModal() {
        this.authModal.classList.remove('hidden');
        this.showLoginForm();
        document.body.style.overflow = 'hidden';
    }

    hideAuthModal() {
        this.authModal.classList.add('hidden');
        document.body.style.overflow = 'auto';
        this.clearAuthMessage();
    }

    showLoginForm() {
        this.loginForm.classList.remove('hidden');
        this.registerForm.classList.add('hidden');
        this.modalTitle.textContent = 'Login';
        this.clearAuthMessage();
    }

    showRegisterForm() {
        this.loginForm.classList.add('hidden');
        this.registerForm.classList.remove('hidden');
        this.modalTitle.textContent = 'Register';
        this.clearAuthMessage();
    }

    async handleLogin(event) {
        event.preventDefault();
        
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        
        try {
            const response = await fetch(`${this.serverUrl}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            
            if (response.ok) {
                const data = await response.json();
                this.token = data.token;
                localStorage.setItem('jwt', this.token);
                
                this.showAuthMessage('Login successful!', 'success');
                setTimeout(() => {
                    this.hideAuthModal();
                    this.checkAuthStatus();
                }, 1000);
            } else {
                const error = await response.json();
                this.showAuthMessage(error.message || 'Login failed', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showAuthMessage('Network error. Please try again.', 'error');
        }
    }

    async handleRegister(event) {
        event.preventDefault();
        
        const username = document.getElementById('register-username').value;
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm-password').value;
        
        if (password !== confirmPassword) {
            this.showAuthMessage('Passwords do not match', 'error');
            return;
        }
        
        try {
            const response = await fetch(`${this.serverUrl}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            
            if (response.ok) {
                const data = await response.json();
                this.token = data.token;
                localStorage.setItem('jwt', this.token);
                
                this.showAuthMessage('Registration successful!', 'success');
                setTimeout(() => {
                    this.hideAuthModal();
                    this.checkAuthStatus();
                }, 1000);
            } else {
                const error = await response.json();
                this.showAuthMessage(error.message || 'Registration failed', 'error');
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showAuthMessage('Network error. Please try again.', 'error');
        }
    }

    handleLogout() {
        this.clearAuth();
        this.showAuthSection();
    }

    clearAuth() {
        this.token = null;
        this.userId = null;
        this.username = null;
        this.userStats = { wins: 0, losses: 0, winrate: 0 };
        localStorage.removeItem('jwt');
    }

    showAuthMessage(message, type = 'info') {
        this.authMessage.textContent = message;
        this.authMessage.className = `auth-message ${type}`;
    }

    clearAuthMessage() {
        this.authMessage.textContent = '';
        this.authMessage.className = 'auth-message';
    }

    redirectToGame(gameType) {
        if (!this.token) {
            this.showAuthMessage('Please log in to play multiplayer games', 'error');
            return;
        }
        
        // Redirect to the appropriate multiplayer game page
        switch (gameType) {
            case 'lctr':
                window.location.href = '../games/lctr/lctr_page.html';
                break;
            case 'corner':
                window.location.href = '../games/corner/corner_page.html';
                break;
            default:
                console.error('Unknown game type:', gameType);
        }
    }
}

// Initialize the multiplayer landing page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MultiplayerLanding();
});
