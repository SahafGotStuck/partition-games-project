# Complete Guide: Adding Online Multiplayer to LCTR Game

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Backend Implementation](#backend-implementation)
4. [Frontend Modifications](#frontend-modifications)
5. [Real-Time Communication](#real-time-communication)
6. [Game State Management](#game-state-management)
7. [User Authentication](#user-authentication)
8. [Security Implementation](#security-implementation)
9. [Deployment](#deployment)
10. [Testing](#testing)
11. [Advanced Features](#advanced-features)

---

## Architecture Overview

### System Components
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client A      │    │   Game Server   │    │   Client B      │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │LCTR Game UI │ │◄──►│ │Game Engine  │ │◄──►│ │LCTR Game UI │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │Socket Client│ │◄──►│ │Socket Server│ │◄──►│ │Socket Client│ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │ Auth System │ │◄──►│ │   Database  │ │◄──►│ │ Auth System │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Message Flow
1. **Game Creation**: Player A creates a game room
2. **Game Joining**: Player B joins the room
3. **Turn Management**: Server enforces turn order
4. **Move Validation**: Server validates all moves
5. **State Broadcast**: Server updates all clients
6. **Game Completion**: Server records results

---

## Technology Stack

### Recommended Stack
- **Backend**: Node.js + Express + Socket.io
- **Database**: PostgreSQL + Redis
- **Authentication**: JWT
- **Deployment**: Docker + Railway/Heroku
- **Frontend**: Existing JavaScript + Socket.io-client

### Alternative Stacks
```javascript
// Minimal Stack (Good for learning)
Backend: Node.js + Express + ws
Database: SQLite + Memory store
Auth: Simple sessions
Deployment: Railway

// Production Stack (Scalable)
Backend: Node.js + Express + Socket.io
Database: PostgreSQL + Redis Cluster
Auth: JWT + OAuth
Deployment: Docker + AWS/GCP
```

---

## Backend Implementation

### Project Structure
```
lctr-multiplayer-server/
├── src/
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── gameController.js
│   │   └── userController.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── rateLimiter.js
│   │   └── validation.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Game.js
│   │   └── GameState.js
│   ├── services/
│   │   ├── gameService.js
│   │   ├── socketService.js
│   │   └── matchmakingService.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── games.js
│   │   └── users.js
│   ├── utils/
│   │   ├── gameLogic.js
│   │   ├── logger.js
│   │   └── helpers.js
│   └── app.js
├── package.json
├── Dockerfile
└── docker-compose.yml
```

### 1. Initialize Server Project

```bash
mkdir lctr-multiplayer-server
cd lctr-multiplayer-server
npm init -y

# Install dependencies
npm install express socket.io cors helmet bcrypt jsonwebtoken
npm install sequelize pg pg-hstore redis ioredis
npm install express-rate-limit express-validator
npm install --save-dev nodemon jest supertest
```

### 2. Basic Server Setup (`src/app.js`)

```javascript
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/games');
const socketService = require('./services/socketService');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);

// Socket handling
socketService.initialize(io);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, server, io };
```

### 3. Game Logic Implementation (`src/utils/gameLogic.js`)

```javascript
class LCTRGame {
  constructor(initialPartition, playerA, playerB) {
    this.id = this.generateId();
    this.board = [...initialPartition];
    this.players = { A: playerA, B: playerB };
    this.currentPlayer = 'A';
    this.gameState = 'waiting'; // waiting, active, finished
    this.winner = null;
    this.moves = [];
    this.createdAt = new Date();
    this.lastActivity = new Date();
  }

  generateId() {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  isValidMove(move) {
    if (this.gameState !== 'active') return false;
    if (this.board.length === 0) return false;
    
    if (move.type === 'row') {
      return this.board.length > 0;
    } else if (move.type === 'col') {
      return this.board.length > 0 && Math.max(...this.board) > 0;
    }
    return false;
  }

  makeMove(playerId, move) {
    if (this.players[this.currentPlayer] !== playerId) {
      throw new Error('Not your turn');
    }
    
    if (!this.isValidMove(move)) {
      throw new Error('Invalid move');
    }

    // Execute move
    if (move.type === 'row') {
      this.board.shift(); // Remove top row
    } else if (move.type === 'col') {
      this.board = this.board.map(row => row - 1).filter(row => row > 0);
    }

    // Record move
    this.moves.push({
      player: this.currentPlayer,
      playerId,
      move,
      boardState: [...this.board],
      timestamp: new Date()
    });

    // Check win condition
    if (this.board.length === 0) {
      this.gameState = 'finished';
      this.winner = this.currentPlayer;
    } else {
      // Switch turns
      this.currentPlayer = this.currentPlayer === 'A' ? 'B' : 'A';
    }

    this.lastActivity = new Date();
    return this.getGameState();
  }

  getGameState() {
    return {
      id: this.id,
      board: [...this.board],
      currentPlayer: this.currentPlayer,
      gameState: this.gameState,
      winner: this.winner,
      players: this.players,
      moveCount: this.moves.length,
      lastActivity: this.lastActivity
    };
  }

  isPlayerInGame(playerId) {
    return Object.values(this.players).includes(playerId);
  }
}

module.exports = { LCTRGame };
```

### 4. Socket Service (`src/services/socketService.js`)

```javascript
const jwt = require('jsonwebtoken');
const { LCTRGame } = require('../utils/gameLogic');

class SocketService {
  constructor() {
    this.io = null;
    this.games = new Map(); // In production, use Redis
    this.waitingPlayers = new Set();
    this.playerSockets = new Map(); // playerId -> socketId
  }

  initialize(io) {
    this.io = io;
    
    // Authentication middleware
    io.use((socket, next) => {
      const token = socket.handshake.auth.token;
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.userId;
        socket.username = decoded.username;
        next();
      } catch (err) {
        next(new Error('Authentication failed'));
      }
    });

    io.on('connection', (socket) => {
      console.log(`User ${socket.username} connected`);
      this.playerSockets.set(socket.userId, socket.id);

      this.setupSocketHandlers(socket);
    });
  }

  setupSocketHandlers(socket) {
    // Join matchmaking queue
    socket.on('findGame', (data) => {
      this.handleFindGame(socket, data);
    });

    // Create private game
    socket.on('createGame', (data) => {
      this.handleCreateGame(socket, data);
    });

    // Join specific game
    socket.on('joinGame', (data) => {
      this.handleJoinGame(socket, data);
    });

    // Make a move
    socket.on('makeMove', (data) => {
      this.handleMakeMove(socket, data);
    });

    // Chat message
    socket.on('chatMessage', (data) => {
      this.handleChatMessage(socket, data);
    });

    // Leave game
    socket.on('leaveGame', () => {
      this.handleLeaveGame(socket);
    });

    // Disconnect
    socket.on('disconnect', () => {
      this.handleDisconnect(socket);
    });
  }

  handleFindGame(socket, data) {
    const { partition, gameMode } = data;
    
    // Add to waiting queue
    this.waitingPlayers.add({
      userId: socket.userId,
      username: socket.username,
      socketId: socket.id,
      partition,
      gameMode,
      timestamp: Date.now()
    });

    // Try to match with another player
    this.attemptMatchmaking();
  }

  attemptMatchmaking() {
    const players = Array.from(this.waitingPlayers);
    
    if (players.length >= 2) {
      const playerA = players[0];
      const playerB = players[1];
      
      // Remove from waiting queue
      this.waitingPlayers.delete(playerA);
      this.waitingPlayers.delete(playerB);
      
      // Create game
      const game = new LCTRGame(
        playerA.partition,
        playerA.userId,
        playerB.userId
      );
      
      this.games.set(game.id, game);
      
      // Join both players to game room
      this.io.sockets.sockets.get(playerA.socketId)?.join(game.id);
      this.io.sockets.sockets.get(playerB.socketId)?.join(game.id);
      
      // Start game
      game.gameState = 'active';
      
      // Notify players
      this.io.to(game.id).emit('gameFound', {
        gameId: game.id,
        gameState: game.getGameState(),
        playerRole: null // Will be set individually
      });
      
      // Set individual roles
      this.io.to(playerA.socketId).emit('gameFound', {
        gameId: game.id,
        gameState: game.getGameState(),
        playerRole: 'A'
      });
      
      this.io.to(playerB.socketId).emit('gameFound', {
        gameId: game.id,
        gameState: game.getGameState(),
        playerRole: 'B'
      });
    }
  }

  handleMakeMove(socket, data) {
    const { gameId, move } = data;
    const game = this.games.get(gameId);
    
    if (!game) {
      socket.emit('error', { message: 'Game not found' });
      return;
    }
    
    if (!game.isPlayerInGame(socket.userId)) {
      socket.emit('error', { message: 'You are not in this game' });
      return;
    }
    
    try {
      const newGameState = game.makeMove(socket.userId, move);
      
      // Broadcast to all players in the game
      this.io.to(gameId).emit('gameUpdate', {
        gameState: newGameState,
        lastMove: {
          player: game.currentPlayer === 'A' ? 'B' : 'A', // Previous player
          move,
          username: socket.username
        }
      });
      
      // If game is finished, handle cleanup
      if (game.gameState === 'finished') {
        this.handleGameEnd(game);
      }
      
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  }

  handleGameEnd(game) {
    // Save to database (implement with your database service)
    // this.gameService.saveGame(game);
    
    // Remove from active games after a delay
    setTimeout(() => {
      this.games.delete(game.id);
    }, 30000); // Keep for 30 seconds for final state
  }

  handleDisconnect(socket) {
    console.log(`User ${socket.username} disconnected`);
    this.playerSockets.delete(socket.userId);
    
    // Remove from waiting queue if present
    for (const player of this.waitingPlayers) {
      if (player.userId === socket.userId) {
        this.waitingPlayers.delete(player);
        break;
      }
    }
    
    // Handle game abandonment
    for (const [gameId, game] of this.games) {
      if (game.isPlayerInGame(socket.userId) && game.gameState === 'active') {
        // Notify other player of disconnection
        socket.to(gameId).emit('playerDisconnected', {
          disconnectedPlayer: socket.username,
          message: 'Your opponent has disconnected'
        });
        
        // Mark game as abandoned
        game.gameState = 'abandoned';
        
        // Clean up after delay (give chance to reconnect)
        setTimeout(() => {
          this.games.delete(gameId);
        }, 60000);
      }
    }
  }
}

module.exports = new SocketService();
```

### 5. Authentication (`src/routes/auth.js`)

```javascript
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../models/User');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Register
router.post('/register', [
  body('username').isLength({ min: 3, max: 20 }).trim().escape(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ email }, { username }]
      }
    });
    
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await User.create({
      username,
      email,
      password: hashedPassword
    });

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
router.post('/login', [
  body('login').trim().escape(), // Can be email or username
  body('password').exists()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { login, password } = req.body;

    // Find user by email or username
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { email: login },
          { username: login }
        ]
      }
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Guest login (optional - for quick play)
router.post('/guest', async (req, res) => {
  try {
    const guestUsername = `Guest_${Math.random().toString(36).substring(7)}`;
    
    const token = jwt.sign(
      { userId: `guest_${Date.now()}`, username: guestUsername, isGuest: true },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      message: 'Guest session created',
      token,
      user: {
        username: guestUsername,
        isGuest: true
      }
    });

  } catch (error) {
    console.error('Guest login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
```

---

## Frontend Modifications

### 1. Install Socket.io Client

```bash
# In your existing frontend directory
npm install socket.io-client
```

### 2. Create Multiplayer Manager (`multiplayer.js`)

```javascript
import io from 'socket.io-client';

class MultiplayerManager {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.currentGame = null;
    this.playerRole = null;
    this.gameCallbacks = {};
  }

  connect(token) {
    this.socket = io(process.env.SERVER_URL || 'http://localhost:3001', {
      auth: { token }
    });

    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.isConnected = true;
      this.emit('connected');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.isConnected = false;
      this.emit('disconnected');
    });

    this.socket.on('gameFound', (data) => {
      console.log('Game found:', data);
      this.currentGame = data.gameId;
      this.playerRole = data.playerRole;
      this.emit('gameFound', data);
    });

    this.socket.on('gameUpdate', (data) => {
      console.log('Game update:', data);
      this.emit('gameUpdate', data);
    });

    this.socket.on('playerDisconnected', (data) => {
      console.log('Player disconnected:', data);
      this.emit('playerDisconnected', data);
    });

    this.socket.on('error', (data) => {
      console.error('Socket error:', data);
      this.emit('error', data);
    });

    this.socket.on('chatMessage', (data) => {
      this.emit('chatMessage', data);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.currentGame = null;
      this.playerRole = null;
    }
  }

  findGame(partition, gameMode = 'normal') {
    if (!this.isConnected) {
      throw new Error('Not connected to server');
    }
    
    this.socket.emit('findGame', { partition, gameMode });
  }

  makeMove(move) {
    if (!this.currentGame) {
      throw new Error('No active game');
    }
    
    this.socket.emit('makeMove', {
      gameId: this.currentGame,
      move
    });
  }

  sendChatMessage(message) {
    if (!this.currentGame) return;
    
    this.socket.emit('chatMessage', {
      gameId: this.currentGame,
      message
    });
  }

  leaveGame() {
    if (this.currentGame) {
      this.socket.emit('leaveGame');
      this.currentGame = null;
      this.playerRole = null;
    }
  }

  // Event handling
  on(event, callback) {
    if (!this.gameCallbacks[event]) {
      this.gameCallbacks[event] = [];
    }
    this.gameCallbacks[event].push(callback);
  }

  off(event, callback) {
    if (this.gameCallbacks[event]) {
      this.gameCallbacks[event] = this.gameCallbacks[event].filter(cb => cb !== callback);
    }
  }

  emit(event, data) {
    if (this.gameCallbacks[event]) {
      this.gameCallbacks[event].forEach(callback => callback(data));
    }
  }
}

// Export singleton instance
export default new MultiplayerManager();
```

### 3. Modify LCTR Game Class

```javascript
// Add to existing ProLCTRGui class
class ProLCTRGui {
  constructor() {
    // ... existing code ...
    this.isMultiplayer = false;
    this.multiplayerManager = null;
    this.playerRole = null;
    this.opponentInfo = null;
    
    // Add multiplayer UI elements
    this.setupMultiplayerUI();
  }

  setupMultiplayerUI() {
    // Add multiplayer button to setup modal
    const multiplayerBtn = document.createElement('button');
    multiplayerBtn.id = 'multiplayer-btn';
    multiplayerBtn.className = 'modal-btn';
    multiplayerBtn.textContent = 'Play Online';
    multiplayerBtn.addEventListener('click', () => this.showMultiplayerModal());
    
    // Insert before start game button
    const startBtn = document.getElementById('start-game-btn');
    startBtn.parentNode.insertBefore(multiplayerBtn, startBtn);
  }

  async showMultiplayerModal() {
    // Check for authentication
    const token = localStorage.getItem('authToken');
    if (!token) {
      this.showAuthModal();
      return;
    }

    try {
      // Import and connect to multiplayer
      const { default: MultiplayerManager } = await import('./multiplayer.js');
      this.multiplayerManager = MultiplayerManager;
      
      // Setup event listeners
      this.setupMultiplayerEvents();
      
      // Connect to server
      this.multiplayerManager.connect(token);
      
      // Show multiplayer options
      this.showMultiplayerOptions();
      
    } catch (error) {
      console.error('Failed to initialize multiplayer:', error);
      alert('Failed to connect to multiplayer server');
    }
  }

  setupMultiplayerEvents() {
    this.multiplayerManager.on('connected', () => {
      console.log('Connected to multiplayer server');
    });

    this.multiplayerManager.on('gameFound', (data) => {
      this.handleGameFound(data);
    });

    this.multiplayerManager.on('gameUpdate', (data) => {
      this.handleGameUpdate(data);
    });

    this.multiplayerManager.on('playerDisconnected', (data) => {
      this.handlePlayerDisconnected(data);
    });

    this.multiplayerManager.on('error', (data) => {
      console.error('Multiplayer error:', data);
      this.showMessage(data.message, 'error');
    });
  }

  showMultiplayerOptions() {
    // Hide single player setup
    this.setupModal.style.display = 'none';
    
    // Show matchmaking interface
    this.showMatchmakingModal();
  }

  showMatchmakingModal() {
    // Create matchmaking modal
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop visible';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h2>Find Online Game</h2>
          <button id="close-matchmaking" class="icon-button">×</button>
        </div>
        
        <label for="mp-rows-input">Board Configuration</label>
        <input type="text" id="mp-rows-input" value="5 4 4 2" placeholder="e.g., 5 4 4 2">
        
        <div id="matchmaking-status" class="status-message">
          Ready to search for opponent
        </div>
        
        <button id="find-game-btn" class="modal-btn">Find Game</button>
        <button id="cancel-search-btn" class="modal-btn secondary-button" style="display:none;">Cancel Search</button>
        <button id="back-to-single-btn" class="modal-btn secondary-button">Back to Single Player</button>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Event listeners
    document.getElementById('close-matchmaking').addEventListener('click', () => {
      document.body.removeChild(modal);
      this.showSetupModal();
    });
    
    document.getElementById('find-game-btn').addEventListener('click', () => {
      this.startMatchmaking(modal);
    });
    
    document.getElementById('back-to-single-btn').addEventListener('click', () => {
      document.body.removeChild(modal);
      this.showSetupModal();
    });
  }

  startMatchmaking(modal) {
    const partition = this.parsePartition(document.getElementById('mp-rows-input').value);
    const statusEl = document.getElementById('matchmaking-status');
    const findBtn = document.getElementById('find-game-btn');
    const cancelBtn = document.getElementById('cancel-search-btn');
    
    // Update UI
    statusEl.textContent = 'Searching for opponent...';
    statusEl.className = 'status-message searching';
    findBtn.style.display = 'none';
    cancelBtn.style.display = 'block';
    
    // Start search
    this.multiplayerManager.findGame(partition);
    
    // Handle cancel
    cancelBtn.addEventListener('click', () => {
      // Reset UI
      statusEl.textContent = 'Ready to search for opponent';
      statusEl.className = 'status-message';
      findBtn.style.display = 'block';
      cancelBtn.style.display = 'none';
    });
  }

  handleGameFound(data) {
    console.log('Game found!', data);
    this.isMultiplayer = true;
    this.playerRole = data.playerRole;
    
    // Close matchmaking modal
    const modal = document.querySelector('.modal-backdrop');
    if (modal) document.body.removeChild(modal);
    
    // Start the game
    this.startMultiplayerGame(data.gameState);
  }

  startMultiplayerGame(gameState) {
    // Initialize game from server state
    this.game = new Game(new Board(gameState.board), null); // No AI in multiplayer
    this.game.currentIndex = gameState.currentPlayer === 'A' ? 0 : 1;
    
    // Update UI to show multiplayer state
    this.updateMultiplayerUI(gameState);
    
    // Redraw board
    this.redrawBoard();
    this.updateStatus();
  }

  updateMultiplayerUI(gameState) {
    // Update status to show player roles and turn
    const isMyTurn = gameState.currentPlayer === this.playerRole;
    const opponentRole = this.playerRole === 'A' ? 'B' : 'A';
    
    this.statusLabel.textContent = isMyTurn ? 
      `Your turn (Player ${this.playerRole})` : 
      `Opponent's turn (Player ${opponentRole})`;
    
    // Disable interactions if not your turn
    if (!isMyTurn) {
      this.boardArea.style.pointerEvents = 'none';
    } else {
      this.boardArea.style.pointerEvents = 'auto';
    }
  }

  handleGameUpdate(data) {
    console.log('Game update received:', data);
    
    // Update game state
    this.game.board.rows = [...data.gameState.board];
    this.game.currentIndex = data.gameState.currentPlayer === 'A' ? 0 : 1;
    
    // Show move animation if it was opponent's move
    if (data.lastMove && data.lastMove.player !== this.playerRole) {
      this.showOpponentMove(data.lastMove);
    }
    
    // Update UI
    this.updateMultiplayerUI(data.gameState);
    this.redrawBoard();
    
    // Check for game end
    if (data.gameState.gameState === 'finished') {
      this.handleMultiplayerGameEnd(data.gameState);
    }
  }

  showOpponentMove(moveData) {
    // Show a brief message about opponent's move
    const message = `${moveData.username} removed ${moveData.move.type}`;
    this.showMessage(message, 'info', 2000);
  }

  handleMultiplayerGameEnd(gameState) {
    const isWinner = gameState.winner === this.playerRole;
    const message = isWinner ? 'You won!' : 'You lost!';
    
    // Show game over modal
    this.gameOverMessage.textContent = message;
    this.gameOverModal.classList.add('visible');
    
    // Reset multiplayer state
    this.isMultiplayer = false;
    this.playerRole = null;
  }

  // Override the original makeMove to handle multiplayer
  executeWithAnimation(moveKind) {
    if (this.isMultiplayer) {
      // Send move to server instead of executing locally
      this.multiplayerManager.makeMove({ type: moveKind });
      return;
    }
    
    // Call original single-player logic
    this.originalExecuteWithAnimation(moveKind);
  }

  // Store original method
  originalExecuteWithAnimation = this.executeWithAnimation;

  showMessage(message, type = 'info', duration = 3000) {
    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `toast-message ${type}`;
    messageDiv.textContent = message;
    
    // Style based on type
    const styles = {
      info: { background: '#e3f2fd', color: '#0c5460' },
      error: { background: '#f8d7da', color: '#721c24' },
      success: { background: '#d4edda', color: '#155724' }
    };
    
    Object.assign(messageDiv.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '12px 20px',
      borderRadius: '8px',
      zIndex: '1000',
      fontSize: '14px',
      fontWeight: 'bold',
      minWidth: '200px',
      textAlign: 'center',
      ...styles[type]
    });
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.parentNode.removeChild(messageDiv);
      }
    }, duration);
  }
}
```

### 4. Authentication Modal

```javascript
// Add to ProLCTRGui class
showAuthModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop visible';
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h2 id="auth-modal-title">Login</h2>
        <button id="close-auth" class="icon-button">×</button>
      </div>
      
      <div id="login-form">
        <label for="auth-login">Username or Email</label>
        <input type="text" id="auth-login" placeholder="Enter username or email">
        
        <label for="auth-password">Password</label>
        <input type="password" id="auth-password" placeholder="Enter password">
        
        <button id="login-btn" class="modal-btn">Login</button>
        <button id="guest-login-btn" class="modal-btn secondary-button">Play as Guest</button>
        <button id="show-register-btn" class="modal-btn secondary-button">Create Account</button>
      </div>
      
      <div id="register-form" style="display:none;">
        <label for="reg-username">Username</label>
        <input type="text" id="reg-username" placeholder="Choose username">
        
        <label for="reg-email">Email</label>
        <input type="email" id="reg-email" placeholder="Enter email">
        
        <label for="reg-password">Password</label>
        <input type="password" id="reg-password" placeholder="Create password">
        
        <button id="register-btn" class="modal-btn">Create Account</button>
        <button id="show-login-btn" class="modal-btn secondary-button">Back to Login</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Event listeners
  this.setupAuthModalEvents(modal);
}

setupAuthModalEvents(modal) {
  const closeBtn = document.getElementById('close-auth');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const title = document.getElementById('auth-modal-title');
  
  closeBtn.addEventListener('click', () => {
    document.body.removeChild(modal);
  });
  
  // Switch between login and register
  document.getElementById('show-register-btn').addEventListener('click', () => {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
    title.textContent = 'Create Account';
  });
  
  document.getElementById('show-login-btn').addEventListener('click', () => {
    registerForm.style.display = 'none';
    loginForm.style.display = 'block';
    title.textContent = 'Login';
  });
  
  // Login
  document.getElementById('login-btn').addEventListener('click', async () => {
    const login = document.getElementById('auth-login').value;
    const password = document.getElementById('auth-password').value;
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('username', data.user.username);
        document.body.removeChild(modal);
        this.showMultiplayerModal();
      } else {
        this.showMessage(data.message, 'error');
      }
    } catch (error) {
      this.showMessage('Login failed', 'error');
    }
  });
  
  // Guest login
  document.getElementById('guest-login-btn').addEventListener('click', async () => {
    try {
      const response = await fetch('/api/auth/guest', {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('username', data.user.username);
        document.body.removeChild(modal);
        this.showMultiplayerModal();
      } else {
        this.showMessage(data.message, 'error');
      }
    } catch (error) {
      this.showMessage('Guest login failed', 'error');
    }
  });
  
  // Register
  document.getElementById('register-btn').addEventListener('click', async () => {
    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('username', data.user.username);
        document.body.removeChild(modal);
        this.showMultiplayerModal();
      } else {
        this.showMessage(data.message, 'error');
      }
    } catch (error) {
      this.showMessage('Registration failed', 'error');
    }
  });
}
```

---

## Database Setup

### 1. Environment Variables (`.env`)

```bash
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/lctr_game
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-here

# Server
NODE_ENV=development
PORT=3001
CLIENT_URL=http://localhost:3000

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 2. Database Models (`src/models/`)

```javascript
// User.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  username: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    validate: {
      len: [3, 20],
      isAlphanumeric: true
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  rating: {
    type: DataTypes.INTEGER,
    defaultValue: 1200
  },
  gamesPlayed: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  gamesWon: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  lastLogin: {
    type: DataTypes.DATE
  }
}, {
  timestamps: true,
  indexes: [
    { fields: ['username'] },
    { fields: ['email'] },
    { fields: ['rating'] }
  ]
});

module.exports = { User };
```

```javascript
// Game.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Game = sequelize.define('Game', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  playerAId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  playerBId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  winnerId: {
    type: DataTypes.UUID,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  initialBoard: {
    type: DataTypes.JSON,
    allowNull: false
  },
  moves: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  gameState: {
    type: DataTypes.ENUM('active', 'finished', 'abandoned'),
    defaultValue: 'active'
  },
  startedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  finishedAt: {
    type: DataTypes.DATE
  },
  duration: {
    type: DataTypes.INTEGER // seconds
  }
}, {
  timestamps: true,
  indexes: [
    { fields: ['playerAId'] },
    { fields: ['playerBId'] },
    { fields: ['winnerId'] },
    { fields: ['gameState'] },
    { fields: ['startedAt'] }
  ]
});

module.exports = { Game };
```

### 3. Database Migrations

```javascript
// migrations/001-create-users.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Users', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      username: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false
      },
      rating: {
        type: Sequelize.INTEGER,
        defaultValue: 1200
      },
      gamesPlayed: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      gamesWon: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      lastLogin: {
        type: Sequelize.DATE
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex('Users', ['username']);
    await queryInterface.addIndex('Users', ['email']);
    await queryInterface.addIndex('Users', ['rating']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Users');
  }
};
```

---

## Security Implementation

### 1. Rate Limiting

```javascript
// src/middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');

const redisClient = new Redis(process.env.REDIS_URL);

const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    store: new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
    }),
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

const authLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts
  'Too many authentication attempts, please try again later'
);

const gameLimiter = createRateLimiter(
  60 * 1000, // 1 minute
  30, // 30 moves per minute max
  'Too many game actions, please slow down'
);

module.exports = { authLimiter, gameLimiter };
```

### 2. Input Validation

```javascript
// src/middleware/validation.js
const { body, param, validationResult } = require('express-validator');

const validateGameMove = [
  body('gameId').isUUID().withMessage('Invalid game ID'),
  body('move.type').isIn(['row', 'col']).withMessage('Invalid move type'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

const validatePartition = [
  body('partition').isArray().withMessage('Partition must be an array'),
  body('partition.*').isInt({ min: 1, max: 50 }).withMessage('Invalid partition values'),
  body('partition').custom((value) => {
    if (value.length === 0 || value.length > 20) {
      throw new Error('Partition must have 1-20 rows');
    }
    // Check if properly sorted (descending)
    for (let i = 1; i < value.length; i++) {
      if (value[i] > value[i-1]) {
        throw new Error('Partition must be in descending order');
      }
    }
    return true;
  }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

module.exports = { validateGameMove, validatePartition };
```

### 3. Authentication Middleware

```javascript
// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const { User } = require('../models/User');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // For guest users
    if (decoded.isGuest) {
      req.user = {
        id: decoded.userId,
        username: decoded.username,
        isGuest: true
      };
      return next();
    }

    // For registered users, verify they still exist
    const user = await User.findByPk(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      rating: user.rating
    };
    
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token' });
  }
};

const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next(); // Continue without user info
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.isGuest) {
      req.user = {
        id: decoded.userId,
        username: decoded.username,
        isGuest: true
      };
    } else {
      const user = await User.findByPk(decoded.userId);
      if (user) {
        req.user = {
          id: user.id,
          username: user.username,
          email: user.email,
          rating: user.rating
        };
      }
    }
  } catch (error) {
    // Invalid token, but continue without user info
  }
  
  next();
};

module.exports = { authenticateToken, optionalAuth };
```

---

## Deployment

### 1. Docker Configuration

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

USER nodejs

EXPOSE 3001

CMD ["node", "src/app.js"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/lctr_game
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - db
      - redis

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=lctr_game
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### 2. Environment Setup

```bash
# Production environment variables
NODE_ENV=production
PORT=3001

# Database
DATABASE_URL=postgresql://user:pass@host:port/dbname
REDIS_URL=redis://host:port

# Security
JWT_SECRET=your-production-jwt-secret-here

# CORS
CLIENT_URL=https://your-frontend-domain.com

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 3. Railway Deployment

```json
// railway.json
{
  "build": {
    "builder": "DOCKERFILE"
  },
  "deploy": {
    "numReplicas": 1,
    "sleepApplication": false,
    "restartPolicyType": "ON_FAILURE"
  }
}
```

```bash
# Deploy to Railway
npm install -g @railway/cli
railway login
railway init
railway add postgresql
railway add redis
railway deploy
```

---

## Testing

### 1. Unit Tests (`tests/gameLogic.test.js`)

```javascript
const { LCTRGame } = require('../src/utils/gameLogic');

describe('LCTRGame', () => {
  let game;
  
  beforeEach(() => {
    game = new LCTRGame([5, 4, 3], 'player1', 'player2');
  });

  test('should create game with correct initial state', () => {
    expect(game.board).toEqual([5, 4, 3]);
    expect(game.currentPlayer).toBe('A');
    expect(game.gameState).toBe('waiting');
  });

  test('should validate moves correctly', () => {
    game.gameState = 'active';
    
    expect(game.isValidMove({ type: 'row' })).toBe(true);
    expect(game.isValidMove({ type: 'col' })).toBe(true);
    expect(game.isValidMove({ type: 'invalid' })).toBe(false);
  });

  test('should execute row move correctly', () => {
    game.gameState = 'active';
    const result = game.makeMove('player1', { type: 'row' });
    
    expect(game.board).toEqual([4, 3]);
    expect(game.currentPlayer).toBe('B');
    expect(result.moveCount).toBe(1);
  });

  test('should execute column move correctly', () => {
    game.gameState = 'active';
    const result = game.makeMove('player1', { type: 'col' });
    
    expect(game.board).toEqual([4, 3, 2]);
    expect(game.currentPlayer).toBe('B');
  });

  test('should detect game end', () => {
    game.gameState = 'active';
    game.board = [1];
    
    const result = game.makeMove('player1', { type: 'row' });
    
    expect(game.gameState).toBe('finished');
    expect(game.winner).toBe('A');
    expect(game.board).toEqual([]);
  });

  test('should reject moves from wrong player', () => {
    game.gameState = 'active';
    
    expect(() => {
      game.makeMove('player2', { type: 'row' });
    }).toThrow('Not your turn');
  });
});
```

### 2. Integration Tests (`tests/api.test.js`)

```javascript
const request = require('supertest');
const { app } = require('../src/app');

describe('Authentication API', () => {
  test('should register new user', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('token');
    expect(response.body.user.username).toBe('testuser');
  });

  test('should login existing user', async () => {
    // First register
    await request(app)
      .post('/api/auth/register')
      .send({
        username: 'logintest',
        email: 'login@example.com',
        password: 'password123'
      });

    // Then login
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        login: 'logintest',
        password: 'password123'
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
  });

  test('should reject invalid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        login: 'nonexistent',
        password: 'wrongpassword'
      });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Invalid credentials');
  });
});
```

### 3. Socket Tests (`tests/socket.test.js`)

```javascript
const Client = require('socket.io-client');
const { server } = require('../src/app');

describe('Socket.io', () => {
  let clientSocket;
  let serverSocket;

  beforeAll((done) => {
    server.listen(() => {
      const port = server.address().port;
      clientSocket = new Client(`http://localhost:${port}`, {
        auth: {
          token: 'test-jwt-token'
        }
      });
      
      server.on('connection', (socket) => {
        serverSocket = socket;
      });
      
      clientSocket.on('connect', done);
    });
  });

  afterAll(() => {
    server.close();
    clientSocket.close();
  });

  test('should handle findGame event', (done) => {
    clientSocket.emit('findGame', {
      partition: [4, 3, 2],
      gameMode: 'normal'
    });

    clientSocket.on('gameFound', (data) => {
      expect(data).toHaveProperty('gameId');
      expect(data).toHaveProperty('gameState');
      done();
    });
  });

  test('should handle makeMove event', (done) => {
    // Setup game first
    clientSocket.emit('findGame', { partition: [3, 2, 1] });
    
    clientSocket.on('gameFound', (data) => {
      clientSocket.emit('makeMove', {
        gameId: data.gameId,
        move: { type: 'row' }
      });
    });

    clientSocket.on('gameUpdate', (data) => {
      expect(data.gameState.board).toEqual([2, 1]);
      done();
    });
  });
});
```

### 4. Load Testing (`tests/load.test.js`)

```javascript
const io = require('socket.io-client');

describe('Load Testing', () => {
  test('should handle multiple concurrent connections', async () => {
    const numClients = 50;
    const clients = [];
    
    const connectPromises = Array.from({ length: numClients }, (_, i) => {
      return new Promise((resolve) => {
        const client = io('http://localhost:3001', {
          auth: { token: `test-token-${i}` }
        });
        
        client.on('connect', () => {
          clients.push(client);
          resolve();
        });
      });
    });

    await Promise.all(connectPromises);
    
    expect(clients.length).toBe(numClients);
    
    // Cleanup
    clients.forEach(client => client.disconnect());
  });

  test('should handle rapid game creation', async () => {
    const numGames = 10;
    const gamePromises = [];

    for (let i = 0; i < numGames; i++) {
      const promise = new Promise((resolve) => {
        const client = io('http://localhost:3001', {
          auth: { token: `load-test-${i}` }
        });
        
        client.on('connect', () => {
          client.emit('findGame', { partition: [4, 3, 2] });
        });
        
        client.on('gameFound', (data) => {
          expect(data.gameId).toBeDefined();
          client.disconnect();
          resolve();
        });
      });
      
      gamePromises.push(promise);
    }

    await Promise.all(gamePromises);
  });
});
```

---

## Advanced Features

### 1. Spectator Mode

```javascript
// Add to socket service
handleSpectateGame(socket, data) {
  const { gameId } = data;
  const game = this.games.get(gameId);
  
  if (!game) {
    socket.emit('error', { message: 'Game not found' });
    return;
  }
  
  // Join as spectator
  socket.join(`${gameId}-spectators`);
  
  // Send current game state
  socket.emit('spectatorJoined', {
    gameId,
    gameState: game.getGameState(),
    isSpectator: true
  });
}

// Broadcast moves to spectators too
broadcastGameUpdate(gameId, gameState, lastMove) {
  this.io.to(gameId).emit('gameUpdate', { gameState, lastMove });
  this.io.to(`${gameId}-spectators`).emit('gameUpdate', { gameState, lastMove });
}
```

### 2. Tournament System

```javascript
// Tournament model
const Tournament = sequelize.define('Tournament', {
  id: { type: DataTypes.UUID, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  maxPlayers: { type: DataTypes.INTEGER, defaultValue: 8 },
  status: { 
    type: DataTypes.ENUM('registration', 'active', 'finished'),
    defaultValue: 'registration'
  },
  bracket: { type: DataTypes.JSON },
  prizes: { type: DataTypes.JSON },
  startTime: { type: DataTypes.DATE },
  endTime: { type: DataTypes.DATE }
});

// Tournament service
class TournamentService {
  createTournament(name, maxPlayers) {
    const tournament = new Tournament({
      name,
      maxPlayers,
      bracket: this.generateBracket(maxPlayers)
    });
    return tournament;
  }

  generateBracket(playerCount) {
    // Generate single-elimination bracket
    const rounds = Math.ceil(Math.log2(playerCount));
    const bracket = [];
    
    for (let round = 0; round < rounds; round++) {
      const matchesInRound = Math.pow(2, rounds - round - 1);
      bracket[round] = Array(matchesInRound).fill(null);
    }
    
    return bracket;
  }

  advancePlayer(tournamentId, winnerId, roundIndex, matchIndex) {
    // Advance winner to next round
    const tournament = this.tournaments.get(tournamentId);
    const nextRound = roundIndex + 1;
    const nextMatch = Math.floor(matchIndex / 2);
    
    if (tournament.bracket[nextRound]) {
      tournament.bracket[nextRound][nextMatch] = winnerId;
    }
  }
}
```

### 3. Rating System (Elo)

```javascript
class RatingService {
  static calculateEloRating(playerRating, opponentRating, gameResult) {
    const K = 32; // K-factor
    const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
    const actualScore = gameResult; // 1 for win, 0.5 for draw, 0 for loss
    
    const newRating = playerRating + K * (actualScore - expectedScore);
    return Math.round(newRating);
  }

  static async updateRatings(winnerId, loserId) {
    const winner = await User.findByPk(winnerId);
    const loser = await User.findByPk(loserId);
    
    const newWinnerRating = this.calculateEloRating(winner.rating, loser.rating, 1);
    const newLoserRating = this.calculateEloRating(loser.rating, winner.rating, 0);
    
    await winner.update({ 
      rating: newWinnerRating,
      gamesWon: winner.gamesWon + 1,
      gamesPlayed: winner.gamesPlayed + 1
    });
    
    await loser.update({ 
      rating: newLoserRating,
      gamesPlayed: loser.gamesPlayed + 1
    });
    
    return { newWinnerRating, newLoserRating };
  }
}
```

### 4. Leaderboards

```javascript
// Add to user routes
router.get('/leaderboard', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    
    const users = await User.findAndCountAll({
      attributes: ['username', 'rating', 'gamesWon', 'gamesPlayed'],
      where: {
        gamesPlayed: { [Op.gte]: 5 } // Minimum games for ranking
      },
      order: [['rating', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    const leaderboard = users.rows.map((user, index) => ({
      rank: offset + index + 1,
      username: user.username,
      rating: user.rating,
      gamesWon: user.gamesWon,
      gamesPlayed: user.gamesPlayed,
      winRate: user.gamesPlayed > 0 ? (user.gamesWon / user.gamesPlayed * 100).toFixed(1) : 0
    }));
    
    res.json({
      leaderboard,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: users.count,
        pages: Math.ceil(users.count / limit)
      }
    });
    
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});
```

### 5. Game Replay System

```javascript
// Enhanced game download with viewer
generateAdvancedReplayHTML(gameData) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>LCTR Game Replay</title>
    <style>
        body { font-family: system-ui; margin: 0; background: #f5f5f5; }
        .replay-container { max-width: 1000px; margin: 0 auto; padding: 20px; }
        .game-info { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .player-info { display: flex; justify-content: space-between; margin: 10px 0; }
        .controls { background: white; padding: 15px; border-radius: 8px; text-align: center; }
        .board-container { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .board { display: inline-block; margin: 0 auto; }
        .cell { width: 30px; height: 30px; background: #3498db; margin: 1px; display: inline-block; }
        .empty { background: #ecf0f1; }
        button { margin: 0 5px; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; }
        .primary { background: #3498db; color: white; }
        .move-list { background: white; padding: 20px; border-radius: 8px; }
        .move-item { padding: 5px; margin: 2px 0; border-radius: 3px; }
        .move-item.active { background: #e3f2fd; }
    </style>
</head>
<body>
    <div class="replay-container">
        <div class="game-info">
            <h1>LCTR Game Replay</h1>
            <div class="player-info">
                <div>Player A: ${gameData.playerA.username} (${gameData.playerA.rating})</div>
                <div>Player B: ${gameData.playerB.username} (${gameData.playerB.rating})</div>
            </div>
            <div>Winner: ${gameData.winner.username}</div>
            <div>Game Duration: ${gameData.duration}</div>
        </div>

        <div class="controls">
            <button onclick="goToMove(0)" class="primary">Start</button>
            <button onclick="previousMove()">← Previous</button>
            <button onclick="toggleAutoplay()" id="play-btn">▶ Play</button>
            <button onclick="nextMove()">Next →</button>
            <button onclick="goToMove(moves.length-1)" class="primary">End</button>
            <span>Move: <span id="current-move">0</span> / <span id="total-moves">${gameData.moves.length}</span></span>
        </div>

        <div class="board-container">
            <div id="board" class="board"></div>
        </div>

        <div class="move-list">
            <h3>Move History</h3>
            <div id="moves-container"></div>
        </div>
    </div>

    <script>
        const gameData = ${JSON.stringify(gameData)};
        const moves = gameData.moves;
        let currentMoveIndex = 0;
        let autoplay = false;
        let autoplayInterval;

        function renderBoard(boardState) {
            const boardEl = document.getElementById('board');
            boardEl.innerHTML = '';
            
            if (!boardState || boardState.length === 0) {
                boardEl.innerHTML = '<div>Game Over</div>';
                return;
            }

            const maxLength = Math.max(...boardState);
            
            for (let row = 0; row < boardState.length; row++) {
                for (let col = 0; col < maxLength; col++) {
                    const cell = document.createElement('div');
                    cell.className = col < boardState[row] ? 'cell' : 'cell empty';
                    boardEl.appendChild(cell);
                }
                boardEl.appendChild(document.createElement('br'));
            }
        }

        function updateMoveList() {
            const container = document.getElementById('moves-container');
            container.innerHTML = '';
            
            moves.forEach((move, index) => {
                const div = document.createElement('div');
                div.className = 'move-item' + (index === currentMoveIndex - 1 ? ' active' : '');
                div.textContent = \`\${index + 1}. Player \${move.player}: \${move.move.type}\`;
                div.onclick = () => goToMove(index + 1);
                container.appendChild(div);
            });
        }

        function goToMove(index) {
            currentMoveIndex = Math.max(0, Math.min(index, moves.length));
            
            let boardState = gameData.initialBoard;
            for (let i = 0; i < currentMoveIndex; i++) {
                boardState = moves[i].boardState;
            }
            
            renderBoard(boardState);
            document.getElementById('current-move').textContent = currentMoveIndex;
            updateMoveList();
        }

        function nextMove() { goToMove(currentMoveIndex + 1); }
        function previousMove() { goToMove(currentMoveIndex - 1); }

        function toggleAutoplay() {
            const btn = document.getElementById('play-btn');
            if (autoplay) {
                clearInterval(autoplayInterval);
                autoplay = false;
                btn.textContent = '▶ Play';
            } else {
                autoplay = true;
                btn.textContent = '⏸ Pause';
                autoplayInterval = setInterval(() => {
                    if (currentMoveIndex >= moves.length) {
                        toggleAutoplay();
                    } else {
                        nextMove();
                    }
                }, 1000);
            }
        }

        // Initialize
        document.getElementById('total-moves').textContent = moves.length;
        goToMove(0);
    </script>
</body>
</html>`;
}
```

---

## Summary

This comprehensive guide covers all aspects of adding online multiplayer functionality to your LCTR game:

### **Key Implementation Points:**
1. **Real-time Communication** via Socket.io for instant game updates
2. **Secure Authentication** with JWT tokens and proper validation
3. **Game State Management** with authoritative server validation
4. **Scalable Architecture** using proper separation of concerns
5. **Production-Ready Deployment** with Docker and cloud platforms

### **Next Steps:**
1. Start with the basic server setup and authentication
2. Implement the core game logic and socket communication
3. Add the frontend multiplayer interface
4. Test thoroughly with multiple concurrent users
5. Deploy to a cloud platform for public access

### **Estimated Development Time:**
- **Basic Multiplayer**: 2-3 weeks
- **Full Feature Set**: 4-6 weeks
- **Production Polish**: Additional 2-3 weeks

This implementation provides a solid foundation that can be extended with additional features like tournaments, advanced matchmaking, and social features as your player base grows. 