// === Corner Multiplayer Authentication Integration ===
// Mirrors LCTR auth but uses Corner-specific socket channels and selection-based moves

class CornerMultiplayerAuth {
  constructor() {
    this.serverUrl = window.GameConfig ? window.GameConfig.getServerUrl() : 'http://localhost:3001';
    this.socket = null;
    this.token = localStorage.getItem('jwt');
    this.userId = null;
    this.username = null;
    this.userStats = { wins: 0, losses: 0, winrate: 0 };

    this.roomId = null;
    this.playerNumber = null; // 0 for Alice, 1 for Bob
    this.currentPlayer = 0;
    this.gameEnded = false;
    this.winner = null;
    this.inMultiplayerGame = false;

    this.initializeElements();
    this.setupEventListeners();
    this.checkAuthStatus();
  }

  initializeElements() {
    this.authSection = document.getElementById('auth-section');
    this.multiplayerSetupSection = document.getElementById('multiplayer-setup-section');
    this.loginForm = document.getElementById('login-form');
    this.registerForm = document.getElementById('register-form');
    this.authMessage = document.getElementById('auth-message');

    this.userDisplayName = document.getElementById('user-display-name');
    this.userWinsDisplay = document.getElementById('user-wins-display');
    this.userLossesDisplay = document.getElementById('user-losses-display');
    this.userWinrateDisplay = document.getElementById('user-winrate-display');

    this.connectionStatus = document.getElementById('connection-status');

    this.loginBtn = document.getElementById('login-btn');
    this.registerBtn = document.getElementById('register-btn');
    this.showRegisterBtn = document.getElementById('show-register-btn');
    this.showLoginBtn = document.getElementById('show-login-btn');
    this.logoutBtn = document.getElementById('logout-btn');

    this.createGameBtn = document.getElementById('create-game-btn');
    this.joinGameBtn = document.getElementById('join-game-btn');
    this.joinRoomInput = document.getElementById('join-room-input');
    this.roomInfoLabel = document.getElementById('room-info-label');

    this.multiplayerRowsInput = document.getElementById('multiplayer-rows-input');
    this.multiplayerPartitionTypeSelect = document.getElementById('multiplayer-partition-type-select');
    this.multiplayerPartitionNumberInput = document.getElementById('multiplayer-partition-number-input');
    this.multiplayerGeneratePartitionBtn = document.getElementById('multiplayer-generate-partition-btn');
  }

  setupEventListeners() {
    this.loginBtn.addEventListener('click', (e) => this.handleLogin(e));
    this.registerBtn.addEventListener('click', (e) => this.handleRegister(e));
    this.showRegisterBtn.addEventListener('click', () => this.showRegisterForm());
    this.showLoginBtn.addEventListener('click', () => this.showLoginForm());
    this.logoutBtn.addEventListener('click', () => this.handleLogout());

    this.createGameBtn.addEventListener('click', () => this.createGame());
    this.joinGameBtn.addEventListener('click', () => this.joinGame());
    this.joinRoomInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.joinGame(); });

    this.multiplayerGeneratePartitionBtn.addEventListener('click', () => this.generatePartition());

    // Enter key support for auth forms
    document.getElementById('login-username').addEventListener('keypress', (e) => { if (e.key === 'Enter') this.handleLogin(e); });
    document.getElementById('login-password').addEventListener('keypress', (e) => { if (e.key === 'Enter') this.handleLogin(e); });
    document.getElementById('register-confirm-password').addEventListener('keypress', (e) => { if (e.key === 'Enter') this.handleRegister(e); });
  }

  checkAuthStatus() {
    if (this.token) this.validateToken(); else this.showAuthSection();
  }

  async validateToken() {
    try {
      const res = await fetch(`${this.serverUrl}/api/profile/me`, { headers: { 'Authorization': `Bearer ${this.token}` } });
      if (res.ok) {
        const user = await res.json();
        this.userId = user.id;
        this.username = user.username;
        await this.loadUserStats();
        this.showMultiplayerSetup();
        this.connectToServer();
      } else {
        this.clearAuth();
        this.showAuthSection();
      }
    } catch (err) {
      console.error('Token validation failed:', err);
      this.clearAuth();
      this.showAuthSection();
    }
  }

  async loadUserStats() {
    try {
      const res = await fetch(`${this.serverUrl}/api/games/my-history`, { headers: { 'Authorization': `Bearer ${this.token}` } });
      if (res.ok) {
        const games = await res.json();
        let wins = 0, losses = 0;
        games.forEach(g => {
          if (g.game_type === 'CORNER') {
            if (g.winner_id === this.userId) wins++; else if (g.loser_id === this.userId) losses++;
          }
        });
        const winrate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;
        this.userStats = { wins, losses, winrate };
        this.updateUserStatsDisplay();
      }
    } catch (err) {
      console.error('Failed to load user stats:', err);
    }
  }

  updateUserStatsDisplay() {
    if (!this.userDisplayName) return;
    this.userDisplayName.textContent = this.username || '';
    this.userWinsDisplay.textContent = this.userStats.wins;
    this.userLossesDisplay.textContent = this.userStats.losses;
    this.userWinrateDisplay.textContent = `${this.userStats.winrate}%`;
  }

  async handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    if (!username || !password) { this.showMessage('Username and password are required', 'error'); return; }
    try {
      const res = await fetch(`${this.serverUrl}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
      const data = await res.json();
      if (res.ok) {
        this.token = data.token; localStorage.setItem('jwt', this.token);
        this.showMessage('Login successful!', 'success');
        await this.validateToken();
      } else {
        this.showMessage(data.error || 'Login failed', 'error');
      }
    } catch (err) {
      console.error('Login error:', err);
      this.showMessage(`Login failed: ${err.message}`, 'error');
    }
  }

  async handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('register-username').value.trim();
    const password = document.getElementById('register-password').value;
    const confirm = document.getElementById('register-confirm-password').value;
    if (!username || !password) { this.showMessage('Username and password are required', 'error'); return; }
    if (password !== confirm) { this.showMessage('Passwords do not match', 'error'); return; }
    if (password.length < 6) { this.showMessage('Password must be at least 6 characters', 'error'); return; }
    try {
      const res = await fetch(`${this.serverUrl}/api/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
      const data = await res.json();
      if (res.ok) {
        this.token = data.token; localStorage.setItem('jwt', this.token);
        this.showMessage('Registration successful!', 'success');
        await this.validateToken();
      } else {
        this.showMessage(data.error || 'Registration failed', 'error');
      }
    } catch (err) {
      console.error('Registration error:', err);
      this.showMessage(`Registration failed: ${err.message}`, 'error');
    }
  }

  handleLogout() { this.clearAuth(); this.showAuthSection(); this.disconnectFromServer(); }
  clearAuth() { this.token = null; this.userId = null; this.username = null; localStorage.removeItem('jwt'); }
  showAuthSection() { this.authSection?.classList.remove('hidden'); this.multiplayerSetupSection?.classList.add('hidden'); }
  showMultiplayerSetup() { this.authSection?.classList.add('hidden'); this.multiplayerSetupSection?.classList.remove('hidden'); }
  showLoginForm() { this.loginForm?.classList.remove('hidden'); this.registerForm?.classList.add('hidden'); this.authMessage.textContent = ''; }
  showRegisterForm() { this.loginForm?.classList.add('hidden'); this.registerForm?.classList.remove('hidden'); this.authMessage.textContent = ''; }
  showMessage(message, type = 'info') { this.authMessage.textContent = message; this.authMessage.className = type; }

  connectToServer() {
    if (this.socket) this.socket.disconnect();
    this.socket = io(this.serverUrl, { auth: { token: this.token } });
    this.socket.on('connect', () => { this.updateConnectionStatus('Connected to server', 'connected'); });
    this.socket.on('connect_error', (e) => { this.updateConnectionStatus('Connection failed', 'disconnected'); });
    this.socket.on('disconnect', () => { this.updateConnectionStatus('Disconnected from server', 'disconnected'); });

    // Corner channels
    this.socket.on('corner:error', (err) => { this.roomInfoLabel.textContent = `Error: ${err}`; this.roomInfoLabel.style.color = 'var(--gray)'; });
    this.socket.on('corner:gameCreated', (data) => {
      this.roomId = data.roomId; this.roomInfoLabel.textContent = `Game created! Room ID: ${this.roomId}`; this.roomInfoLabel.style.color = 'var(--orange)';
    });
    this.socket.on('corner:gameStart', (data) => {
      console.log('corner:gameStart received:', data);
      this.playerNumber = data.players.indexOf(this.socket.id);
      this.currentPlayer = data.currentPlayer;
      console.log('Player number:', this.playerNumber, 'Current player:', this.currentPlayer);
      this.startMultiplayerGame(data.board);
    });
    this.socket.on('corner:gameStateUpdate', (data) => {
      this.currentPlayer = data.currentPlayer; this.gameEnded = data.gameEnded; this.winner = data.winner;
      if (window.cornerApp && data.board) {
        window.cornerApp.updateBoardFromServer(data.board, data.currentPlayer, data.gameEnded, data.winner);
      }
      if (data.gameEnded) this.handleGameEnd(); else this.updateGameStatus();
    });
    this.socket.on('corner:playerDisconnected', () => {
      this.roomInfoLabel.textContent = 'Your opponent has disconnected';
      this.roomInfoLabel.style.color = 'var(--gray)';
      this.endMultiplayerGame();
    });
  }

  disconnectFromServer() { if (this.socket) { this.socket.disconnect(); this.socket = null; } this.updateConnectionStatus('Not connected to server', 'disconnected'); }
  updateConnectionStatus(text, statusClass) { this.connectionStatus.textContent = text; this.connectionStatus.className = statusClass; }

  generatePartition() {
    const type = this.multiplayerPartitionTypeSelect.value;
    const number = parseInt(this.multiplayerPartitionNumberInput.value) || 25;
    let part;
    switch (type) {
      case 'random': part = this.randomPartition(number); break;
      case 'staircase': part = this.staircase(number); break;
      case 'square': part = this.square(number); break;
      case 'hook': part = this.hook(number); break;
      default: return;
    }
    this.multiplayerRowsInput.value = part.join(' ');
  }
  randomPartition(n) { const parts = []; let remaining = n, maxPart = n; while (remaining > 0) { const p = Math.min(Math.floor(Math.random() * remaining) + 1, remaining); parts.push(p); remaining -= p; maxPart = p; } return parts.sort((a,b)=>b-a); }
  staircase(n) { const parts = []; let t = n; while (t >= 1) { parts.push(t); t--; } return parts; }
  square(n) { const parts = []; let t = n; while (t >= 1) { parts.push(n); t--; } return parts; }
  hook(n) { const parts = [n]; let t = n; while (t >= 2) { parts.push(1); t--; } return parts; }

  createGame() {
    const rowsInput = this.multiplayerRowsInput.value.trim();
    if (!rowsInput) { this.roomInfoLabel.textContent = 'Please enter row lengths'; this.roomInfoLabel.style.color = 'var(--gray)'; return; }
    const partition = this.parsePartition(rowsInput);
    if (!partition.length) { this.roomInfoLabel.textContent = 'Invalid partition format'; this.roomInfoLabel.style.color = 'var(--gray)'; return; }
    this.socket.emit('corner:createGame', partition);
    this.roomInfoLabel.textContent = 'Creating game...'; this.roomInfoLabel.style.color = 'var(--orange)';
  }

  joinGame() {
    const roomId = this.joinRoomInput.value.trim().toUpperCase();
    if (!roomId) { this.roomInfoLabel.textContent = 'Please enter a room ID'; this.roomInfoLabel.style.color = 'var(--gray)'; return; }
    this.roomId = roomId;
    this.socket.emit('corner:joinGame', roomId);
    this.roomInfoLabel.textContent = 'Joining game...'; this.roomInfoLabel.style.color = 'var(--orange)';
  }

  parsePartition(input) { return input.split(/\s+/).map(s => parseInt(s, 10)).filter(n => !isNaN(n) && n > 0); }

  startMultiplayerGame(boardData) {
    console.log('startMultiplayerGame called with:', { boardData, playerNumber: this.playerNumber, currentPlayer: this.currentPlayer });
    this.inMultiplayerGame = true;
    const modal = document.getElementById('multiplayer-modal-backdrop');
    if (modal) {
      modal.classList.remove('visible');
      modal.style.opacity = "0";
      modal.style.visibility = "hidden";
      setTimeout(() => {
        modal.style.display = 'none';
      }, 300);
    }
    console.log('window.cornerApp exists:', !!window.cornerApp);
    if (window.cornerApp) {
      console.log('Calling initializeMultiplayerGame...');
      window.cornerApp.initializeMultiplayerGame(boardData, this.playerNumber, this.currentPlayer);
    } else {
      console.error('window.cornerApp is not available!');
      // Wait a bit and try again
      setTimeout(() => {
        if (window.cornerApp) {
          console.log('Retrying initializeMultiplayerGame after delay...');
          window.cornerApp.initializeMultiplayerGame(boardData, this.playerNumber, this.currentPlayer);
        } else {
          console.error('cornerApp still not available after delay');
        }
      }, 100);
    }
    this.updateGameStatus();
  }

  updateGameStatus() {
    if (!this.inMultiplayerGame || !window.cornerApp) return;
    if (this.gameEnded) {
      const isWinner = this.winner === this.playerNumber;
      window.cornerApp.endMultiplayerGame(isWinner ? 'You won!' : 'You lost!');
    } else {
      const isMyTurn = this.currentPlayer === this.playerNumber;
      const statusText = isMyTurn ? 'Your turn' : 'Opponent\'s turn';
      window.cornerApp.updateMultiplayerStatus(statusText, isMyTurn);
    }
  }

  makeMove(selectedPieces) {
    if (!this.inMultiplayerGame || this.gameEnded) return;
    this.socket.emit('corner:makeMove', { roomId: this.roomId, selectedPieces });
  }

  handleGameEnd() { this.loadUserStats(); this.endMultiplayerGame(); }
  endMultiplayerGame() { this.inMultiplayerGame = false; this.roomId = null; this.playerNumber = null; this.gameEnded = false; this.winner = null; this.roomInfoLabel.textContent = 'Game ended. You can create or join a new game.'; this.roomInfoLabel.style.color = 'var(--gray)'; }
}

// Wait for both DOM and window.cornerApp to be ready
function initializeMultiplayerAuth() {
  if (window.cornerApp) {
    window.cornerMultiplayerAuth = new CornerMultiplayerAuth();
  } else {
    // If cornerApp isn't ready yet, wait for it
    window.addEventListener('load', () => {
      if (window.cornerApp) {
        window.cornerMultiplayerAuth = new CornerMultiplayerAuth();
      } else {
        console.error('cornerApp still not available after load event');
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', initializeMultiplayerAuth);


