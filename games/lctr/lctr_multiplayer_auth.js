// === LCTR Multiplayer Authentication Integration ===
// This script integrates authentication and multiplayer functionality into the existing LCTR page

class LCTRMultiplayerAuth {
    constructor() {
        this.serverUrl = window.GameConfig ? window.GameConfig.getServerUrl() : 'http://localhost:3001';
        console.log('LCTR Multiplayer Auth initialized with server URL:', this.serverUrl);
        this.socket = null;
        this.token = localStorage.getItem('jwt');
        this.userId = null;
        this.username = null;
        this.userStats = { wins: 0, losses: 0, winrate: 0 };
        
        this.roomId = null;
        this.playerNumber = null;
        this.currentPlayer = 0;
        this.gameEnded = false;
        this.winner = null;
        this.inMultiplayerGame = false;
        
        this.initializeElements();
        this.setupEventListeners();
        this.checkAuthStatus();
    }

    initializeElements() {
        // Authentication elements
        this.authSection = document.getElementById('auth-section');
        this.multiplayerSetupSection = document.getElementById('multiplayer-setup-section');
        this.loginForm = document.getElementById('login-form');
        this.registerForm = document.getElementById('register-form');
        this.authMessage = document.getElementById('auth-message');
        
        // User profile elements
        this.userDisplayName = document.getElementById('user-display-name');
        this.userWinsDisplay = document.getElementById('user-wins-display');
        this.userLossesDisplay = document.getElementById('user-losses-display');
        this.userWinrateDisplay = document.getElementById('user-winrate-display');
        
        // Connection status
        this.connectionStatus = document.getElementById('connection-status');
        
        // Form buttons
        this.loginBtn = document.getElementById('login-btn');
        this.registerBtn = document.getElementById('register-btn');
        this.showRegisterBtn = document.getElementById('show-register-btn');
        this.showLoginBtn = document.getElementById('show-login-btn');
        this.logoutBtn = document.getElementById('logout-btn');
        
        // Multiplayer buttons
        this.createGameBtn = document.getElementById('create-game-btn');
        this.joinGameBtn = document.getElementById('join-game-btn');
        this.joinRoomInput = document.getElementById('join-room-input');
        this.roomInfoLabel = document.getElementById('room-info-label');
        
        // Partition generation
        this.multiplayerRowsInput = document.getElementById('multiplayer-rows-input');
        this.multiplayerPartitionTypeSelect = document.getElementById('multiplayer-partition-type-select');
        this.multiplayerPartitionNumberInput = document.getElementById('multiplayer-partition-number-input');
        this.multiplayerGeneratePartitionBtn = document.getElementById('multiplayer-generate-partition-btn');
    }

    setupEventListeners() {
        // Authentication
        this.loginBtn.addEventListener('click', (e) => this.handleLogin(e));
        this.registerBtn.addEventListener('click', (e) => this.handleRegister(e));
        this.showRegisterBtn.addEventListener('click', () => this.showRegisterForm());
        this.showLoginBtn.addEventListener('click', () => this.showLoginForm());
        this.logoutBtn.addEventListener('click', () => this.handleLogout());
        
        // Multiplayer
        this.createGameBtn.addEventListener('click', () => this.createGame());
        this.joinGameBtn.addEventListener('click', () => this.joinGame());
        this.joinRoomInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.joinGame();
        });
        
        // Partition generation
        this.multiplayerGeneratePartitionBtn.addEventListener('click', () => this.generatePartition());
        this.multiplayerPartitionTypeSelect.addEventListener('change', () => {
            const isCustom = this.multiplayerPartitionTypeSelect.value === 'custom';
            this.multiplayerPartitionNumberInput.style.display = isCustom ? 'none' : 'inline-block';
            this.multiplayerGeneratePartitionBtn.style.display = isCustom ? 'none' : 'inline-block';
        });
        
        // Enter key support for auth forms
        document.getElementById('login-username').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleLogin(e);
        });
        document.getElementById('login-password').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleLogin(e);
        });
        document.getElementById('register-confirm-password').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleRegister(e);
        });
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
                const userData = await response.json();
                this.userId = userData.id;
                this.username = userData.username;
                await this.loadUserStats();
                this.showMultiplayerSetup();
                this.connectToServer();
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
            const response = await fetch(`${this.serverUrl}/api/games/my-history`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (response.ok) {
                const games = await response.json();
                this.calculateStats(games);
                this.updateUserStatsDisplay();
            }
        } catch (error) {
            console.error('Failed to load user stats:', error);
        }
    }

    calculateStats(games) {
        let wins = 0;
        let losses = 0;
        
        games.forEach(game => {
            if (game.winner_id === this.userId) {
                wins++;
            } else if (game.loser_id === this.userId) {
                losses++;
            }
        });
        
        this.userStats = {
            wins,
            losses,
            winrate: wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0
        };
    }

    updateUserStatsDisplay() {
        this.userDisplayName.textContent = this.username;
        this.userWinsDisplay.textContent = this.userStats.wins;
        this.userLossesDisplay.textContent = this.userStats.losses;
        this.userWinrateDisplay.textContent = `${this.userStats.winrate}%`;
    }

    async handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        
        if (!username || !password) {
            this.showMessage('Username and password are required', 'error');
            return;
        }
        
        console.log('Attempting login to server:', this.serverUrl);
        
        try {
            const response = await fetch(`${this.serverUrl}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.token = data.token;
                localStorage.setItem('jwt', this.token);
                this.showMessage('Login successful!', 'success');
                await this.validateToken();
            } else {
                this.showMessage(data.error || 'Login failed', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showMessage(`Login failed: ${error.message}`, 'error');
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        const username = document.getElementById('register-username').value.trim();
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm-password').value;
        
        if (!username || !password) {
            this.showMessage('Username and password are required', 'error');
            return;
        }
        
        if (password !== confirmPassword) {
            this.showMessage('Passwords do not match', 'error');
            return;
        }
        
        if (password.length < 6) {
            this.showMessage('Password must be at least 6 characters long', 'error');
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
            
            const data = await response.json();
            
            if (response.ok) {
                this.token = data.token;
                localStorage.setItem('jwt', this.token);
                this.showMessage('Registration successful!', 'success');
                await this.validateToken();
            } else {
                this.showMessage(data.error || 'Registration failed', 'error');
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showMessage(`Registration failed: ${error.message}`, 'error');
        }
    }

    handleLogout() {
        this.clearAuth();
        this.showAuthSection();
        this.disconnectFromServer();
    }

    clearAuth() {
        this.token = null;
        this.userId = null;
        this.username = null;
        localStorage.removeItem('jwt');
    }

    showAuthSection() {
        this.authSection.classList.remove('hidden');
        this.multiplayerSetupSection.classList.add('hidden');
    }

    showMultiplayerSetup() {
        this.authSection.classList.add('hidden');
        this.multiplayerSetupSection.classList.remove('hidden');
    }

    showLoginForm() {
        this.loginForm.classList.remove('hidden');
        this.registerForm.classList.add('hidden');
        this.authMessage.textContent = '';
    }

    showRegisterForm() {
        this.loginForm.classList.add('hidden');
        this.registerForm.classList.remove('hidden');
        this.authMessage.textContent = '';
    }

    showMessage(message, type = 'info') {
        this.authMessage.textContent = message;
        this.authMessage.className = type;
    }

    connectToServer() {
        if (this.socket) {
            this.socket.disconnect();
        }
        
        this.socket = io(this.serverUrl, {
            auth: { token: this.token }
        });
        
        this.socket.on('connect', () => {
            console.log('Connected to multiplayer server');
            this.updateConnectionStatus('Connected to server', 'connected');
        });
        
        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            this.updateConnectionStatus('Connection failed', 'disconnected');
        });
        
        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.updateConnectionStatus('Disconnected from server', 'disconnected');
        });
        
        this.socket.on('error', (error) => {
            console.error('Socket error:', error);
            this.roomInfoLabel.textContent = `Error: ${error.message || 'Connection error'}`;
        });
        
        this.socket.on('gameCreated', (data) => {
            console.log('Game created:', data);
            this.roomId = data.roomId;
            this.roomInfoLabel.textContent = `Game created! Room ID: ${this.roomId}`;
            this.roomInfoLabel.style.color = 'var(--orange)';
        });
        
        this.socket.on('gameStart', (data) => {
            console.log('Game starting:', data);
            this.playerNumber = data.players.indexOf(this.socket.id);
            this.currentPlayer = data.currentPlayer;
            this.startMultiplayerGame(data.board);
        });
        
        this.socket.on('gameStateUpdate', (data) => {
            console.log('Game state update:', data);
            this.currentPlayer = data.currentPlayer;
            this.gameEnded = data.gameEnded;
            this.winner = data.winner;
            
            // Update the board state in the main game
            if (window.lctrGame && data.board) {
                window.lctrGame.updateBoardFromServer(
                    data.board, 
                    data.currentPlayer, 
                    data.gameEnded, 
                    data.winner
                );
            }
            
            if (data.gameEnded) {
                this.handleGameEnd();
            } else {
                this.updateGameStatus();
            }
        });
        
        this.socket.on('playerDisconnected', (data) => {
            console.log('Player disconnected:', data);
            this.roomInfoLabel.textContent = 'Your opponent has disconnected';
            this.roomInfoLabel.style.color = 'var(--gray)';
            this.endMultiplayerGame();
        });
    }

    disconnectFromServer() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.updateConnectionStatus('Not connected to server', 'disconnected');
    }

    updateConnectionStatus(text, statusClass) {
        this.connectionStatus.textContent = text;
        this.connectionStatus.className = statusClass;
    }

    generatePartition() {
        const type = this.multiplayerPartitionTypeSelect.value;
        const number = parseInt(this.multiplayerPartitionNumberInput.value) || 25;
        
        let partition;
        switch (type) {
            case 'random':
                partition = this.generateRandomPartition(number);
                break;
            case 'staircase':
                partition = this.generateStaircasePartition(number);
                break;
            case 'square':
                partition = this.generateSquarePartition(number);
                break;
            case 'hook':
                partition = this.generateHookPartition(number);
                break;
            default:
                return;
        }
        
        this.multiplayerRowsInput.value = partition.join(' ');
    }

    generateRandomPartition(n) {
        const partition = [];
        let remaining = n;
        
        while (remaining > 0) {
            const part = Math.min(Math.floor(Math.random() * remaining) + 1, remaining);
            partition.push(part);
            remaining -= part;
        }
        
        return partition.sort((a, b) => b - a);
    }

    generateStaircasePartition(n) {
        const partition = [];
        let current = Math.floor(Math.sqrt(n));
        
        while (n > 0) {
            const part = Math.min(current, n);
            partition.push(part);
            n -= part;
            current = Math.max(1, current - 1);
        }
        
        return partition;
    }

    generateSquarePartition(n) {
        const side = Math.floor(Math.sqrt(n));
        const partition = [];
        
        for (let i = 0; i < side; i++) {
            partition.push(side);
        }
        
        return partition;
    }

    generateHookPartition(n) {
        const partition = [];
        const base = Math.floor(n / 2);
        
        partition.push(base);
        partition.push(n - base);
        
        return partition;
    }

    createGame() {
        const rowsInput = this.multiplayerRowsInput.value.trim();
        if (!rowsInput) {
            this.roomInfoLabel.textContent = 'Please enter row lengths';
            this.roomInfoLabel.style.color = 'var(--gray)';
            return;
        }
        
        const partition = this.parsePartition(rowsInput);
        if (!partition || partition.length === 0) {
            this.roomInfoLabel.textContent = 'Invalid partition format';
            this.roomInfoLabel.style.color = 'var(--gray)';
            return;
        }
        
        this.socket.emit('createGame', partition);
        this.roomInfoLabel.textContent = 'Creating game...';
        this.roomInfoLabel.style.color = 'var(--orange)';
    }

    joinGame() {
        const roomId = this.joinRoomInput.value.trim().toUpperCase();
        if (!roomId) {
            this.roomInfoLabel.textContent = 'Please enter a room ID';
            this.roomInfoLabel.style.color = 'var(--gray)';
            return;
        }
        
        // Set the roomId when joining
        this.roomId = roomId;
        
        this.socket.emit('joinGame', roomId);
        this.roomInfoLabel.textContent = 'Joining game...';
        this.roomInfoLabel.style.color = 'var(--orange)';
    }

    parsePartition(input) {
        try {
            const parts = input.split(/\s+/).map(s => parseInt(s.trim()));
            return parts.filter(n => !isNaN(n) && n > 0);
        } catch (error) {
            return null;
        }
    }

    startMultiplayerGame(boardData) {
        this.inMultiplayerGame = true;
        
        // Close the multiplayer modal
        document.getElementById('multiplayer-modal-backdrop').style.display = 'none';
        
        // Initialize the board with multiplayer data
        if (window.lctrGame) {
            window.lctrGame.initializeMultiplayerGame(boardData, this.playerNumber, this.currentPlayer);
        }
        
        this.updateGameStatus();
    }

    updateGameStatus() {
        if (!this.inMultiplayerGame || !window.lctrGame) return;
        
        if (this.gameEnded) {
            const isWinner = this.winner === this.playerNumber;
            window.lctrGame.endMultiplayerGame(isWinner ? 'You won!' : 'You lost!');
        } else {
            const isMyTurn = this.currentPlayer === this.playerNumber;
            const statusText = isMyTurn ? 'Your turn' : 'Opponent\'s turn';
            window.lctrGame.updateMultiplayerStatus(statusText, isMyTurn);
        }
    }

    makeMove(moveKind) {
        if (!this.inMultiplayerGame || this.gameEnded) return;
        
        this.socket.emit('makeMove', {
            roomId: this.roomId,
            moveKind: moveKind
        });
    }

    handleGameEnd() {
        this.loadUserStats(); // Refresh stats after game
        this.endMultiplayerGame(); // Clean up the multiplayer game state
    }

    endMultiplayerGame() {
        this.inMultiplayerGame = false;
        this.roomId = null;
        this.playerNumber = null;
        this.gameEnded = false;
        this.winner = null;
        
        // Update room info to show that the game has ended
        this.roomInfoLabel.textContent = 'Game ended. You can create or join a new game.';
        this.roomInfoLabel.style.color = 'var(--gray)';
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.lctrMultiplayerAuth = new LCTRMultiplayerAuth();
});