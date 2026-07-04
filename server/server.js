require('dotenv').config();
const path = require('path');
const cors = require('cors');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { generateToken, hashPassword, verifyPassword } = require('./helpers/auth');

// Database connection - ADD THIS SECTION
const { Pool } = require('pg');

// Create a new pool instance using the environment variable
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Neon connections
  }
});

// Test the connection
pool.connect((err, client, release) => {
  if (err) {
    return console.error('Error acquiring client', err.stack);
  }
  console.log('Successfully connected to the PostgreSQL database!');
  // Ensure schema updates exist
  client.query("ALTER TABLE game_records ADD COLUMN IF NOT EXISTS is_misere boolean DEFAULT false;")
    .then(() => console.log('Ensured column game_records.is_misere exists'))
    .catch(e => console.warn('Could not ensure is_misere column:', e.message))
    .finally(() => client.release());
});

const app = express();
// This serves all the static files (html, css, js) from the parent directory
app.use(express.static(path.join(__dirname, '..')));

const server = http.createServer(app);

// Environment configuration
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = isProduction
  ? ['https://partitiongames.netlify.app', 'https://www.partitiongames.netlify.app']
  : ['http://localhost:8000', 'http://127.0.0.1:8000', 'http://localhost:3000', 'http://localhost:8080', 'http://127.0.0.1:8080', 'null', '*']; // Allow file:// protocol in development

// Enable CORS for Socket.IO
const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    allowedHeaders: ["*"],
    credentials: true
  },
  allowEIO3: true
});

// Enable CORS for Express
app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST", "OPTIONS"],
  credentials: true
}));

app.use(express.json());

// JWT middleware for REST endpoints
function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.replace('Bearer ', '');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    return next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

// In-memory storage for active games (will be replaced with database later)
const activeGames = {};
const activeCornerGames = {};

// Game logic functions (copied from frontend for server-side validation)
class Board {
  constructor(rows) {
    this.rows = [...rows];
  }

  isEmpty() {
    return this.rows.length === 0;
  }

  height() {
    return this.rows.length;
  }

  width() {
    return this.rows.length ? Math.max(...this.rows) : 0;
  }

  removeTopRow() {
    this.rows.shift();
  }

  removeLeftColumn() {
    this.rows = this.rows.map(r => r - 1).filter(r => r > 0);
  }

  asTuple() {
    return JSON.stringify(this.rows);
  }
}

// Generate a unique 5-character room ID
function generateRoomId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Validate move
function isValidMove(board, moveKind) {
  if (moveKind === 'row') {
    return board.height() > 0;
  } else if (moveKind === 'col') {
    return board.width() > 0;
  }
  return false;
}

// This handles the root route and sends the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'lctr_page.html'));
});


// Authentication routes
app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });

  try {
    const hashed = await hashPassword(password);
    const { rows } = await pool.query(
      'INSERT INTO users (username, password_hash) VALUES ($1,$2) RETURNING id',
      [username, hashed]
    );
    const token = generateToken(rows[0].id);
    res.status(201).json({ token });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Username taken' }); // UNIQUE violation
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });

  try {
    const { rows } = await pool.query('SELECT id, password_hash FROM users WHERE username=$1', [username]);
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await verifyPassword(password, rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = generateToken(rows[0].id);
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Protected profile endpoint
app.get('/api/profile/me', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, username, created_at FROM users WHERE id=$1',
      [req.userId]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Leaderboard endpoint
app.get('/api/leaderboard', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT u.username, COUNT(g.id) as wins
      FROM users u
      LEFT JOIN games g ON u.id = g.winner_id
      GROUP BY u.id, u.username
      ORDER BY wins DESC
      LIMIT 10
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Game history endpoint
app.get('/api/games/my-history', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT g.*, 
             w.username as winner_username,
             l.username as loser_username
      FROM games g
      JOIN users w ON g.winner_id = w.id
      JOIN users l ON g.loser_id = l.id
      WHERE g.winner_id = $1 OR g.loser_id = $1
      ORDER BY g.created_at DESC
    `, [req.userId]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch game history' });
  }
});

// === GAME RECORDS API ENDPOINTS ===
// These endpoints handle the new game records format for all partition games

// Store a new game record
app.post('/api/game-records', async (req, res) => {
  try {
    const { gameType, partitionData, timestampPlayed, movesSequence, gameOutcome, isMisere, starter } = req.body;
    
    // Validate required fields
    if (!gameType || !partitionData) {
      return res.status(400).json({ error: 'Missing required fields: gameType and partitionData' });
    }
    
    // Validate game outcome if provided
    if (gameOutcome && !['A', 'B'].includes(gameOutcome)) {
      return res.status(400).json({ error: 'Game outcome must be "A" or "B"' });
    }
    
    // Compute is_misere using parity if not explicitly boolean
    // Starter defaults to 'A' (Alice) in our games
    const startPlayer = (starter === 'B') ? 'B' : 'A';
    const movesCount = Array.isArray(movesSequence)
      ? movesSequence.length
      : (typeof movesSequence === 'string' && movesSequence.trim().length)
        ? movesSequence.trim().split(/\s+/).length
        : 0;
    
    // In normal play: last player to move wins
    // If movesCount is odd, starter (A) made the last move and wins
    // If movesCount is even, second player (B) made the last move and wins
    const expectedNormalWinner = (movesCount % 2 === 1) ? startPlayer : (startPlayer === 'A' ? 'B' : 'A');
    
    // If actual winner differs from expected normal winner, it's misere
    const computedIsMisere = (gameOutcome === 'A' || gameOutcome === 'B')
      ? (gameOutcome !== expectedNormalWinner)
      : false;
    
    // Use explicit boolean if provided, otherwise use computed value
    const isMisereFinal = (typeof isMisere === 'boolean' && isMisere === true) ? true : computedIsMisere;

    const { rows } = await pool.query(`
      INSERT INTO game_records (game_type, partition_data, timestamp_played, moves_sequence, game_outcome, is_misere)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      gameType,
      partitionData,
      timestampPlayed || new Date(),
      Array.isArray(movesSequence) ? movesSequence.join(' ') : (movesSequence || ''),
      gameOutcome || null,
      isMisereFinal
    ]);
    
    res.status(201).json({
      success: true,
      record: rows[0]
    });
  } catch (err) {
    console.error('Error storing game record:', err);
    res.status(500).json({ error: 'Failed to store game record' });
  }
});

// Get game records with optional filtering
app.get('/api/game-records', async (req, res) => {
  try {
    const { gameType, limit = 50, offset = 0 } = req.query;
    
    let query = 'SELECT * FROM game_records';
    let params = [];
    
    if (gameType) {
      query += ' WHERE game_type = $1';
      params.push(gameType);
      query += ' ORDER BY timestamp_played DESC LIMIT $2 OFFSET $3';
      params.push(parseInt(limit), parseInt(offset));
    } else {
      query += ' ORDER BY timestamp_played DESC LIMIT $1 OFFSET $2';
      params.push(parseInt(limit), parseInt(offset));
    }
    
    const { rows } = await pool.query(query, params);
    
    res.json({
      success: true,
      records: rows,
      total: rows.length
    });
  } catch (err) {
    console.error('Error fetching game records:', err);
    res.status(500).json({ error: 'Failed to fetch game records' });
  }
});

// Get a specific game record by ID
app.get('/api/game-records/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { rows } = await pool.query('SELECT * FROM game_records WHERE id = $1', [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Game record not found' });
    }
    
    res.json({
      success: true,
      record: rows[0]
    });
  } catch (err) {
    console.error('Error fetching game record:', err);
    res.status(500).json({ error: 'Failed to fetch game record' });
  }
});

// Get game statistics
app.get('/api/game-records/stats/:gameType', async (req, res) => {
  try {
    const { gameType } = req.params;
    
    const { rows } = await pool.query(`
      SELECT 
        COUNT(*) as total_games,
        COUNT(CASE WHEN game_outcome = 'A' THEN 1 END) as player_a_wins,
        COUNT(CASE WHEN game_outcome = 'B' THEN 1 END) as player_b_wins,
        COUNT(CASE WHEN game_outcome IS NULL THEN 1 END) as incomplete_games
      FROM game_records 
      WHERE game_type = $1
    `, [gameType]);
    
    res.json({
      success: true,
      stats: rows[0]
    });
  } catch (err) {
    console.error('Error fetching game stats:', err);
    res.status(500).json({ error: 'Failed to fetch game statistics' });
  }
});

// Socket.IO authentication middleware (optional for basic gameplay)
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
    } catch {
      // Token is invalid, but allow connection for basic gameplay
      console.log(`Invalid token for socket ${socket.id}, allowing connection for basic gameplay`);
    }
  }
  return next();
});

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);
  
  // Handle creating a new game
  socket.on('createGame', (initialBoard) => {
    try {
      console.log(`Creating game for ${socket.id} with board:`, initialBoard);
      // Generate unique room ID
      let roomId;
      do {
        roomId = generateRoomId();
      } while (activeGames[roomId]);

      // Create new game object
      const gameState = {
        roomId,
        board: new Board(initialBoard),
        players: [socket.id], // Creator is first player (Alice)
        currentPlayerIndex: 0, // Alice starts first
        gameStarted: false
      };

      activeGames[roomId] = gameState;
      socket.join(roomId);

      console.log(`Game created with room ID: ${roomId}`);
      socket.emit('gameCreated', { roomId });
    } catch (error) {
      console.error('Error creating game:', error);
      socket.emit('error', 'Failed to create game');
    }
  });

  // Handle joining an existing game
  socket.on('joinGame', (roomId) => {
    try {
      console.log(`${socket.id} attempting to join room: ${roomId}`);
      const game = activeGames[roomId];

      // Check if room exists
      if (!game) {
        socket.emit('error', 'Game room not found');
        return;
      }

      // Check if room has space for another player
      if (game.players.length >= 2) {
        socket.emit('error', 'Game room is full');
        return;
      }

      // Check if game has already started
      if (game.gameStarted) {
        socket.emit('error', 'Game has already started');
        return;
      }

      // Add player to the game
      game.players.push(socket.id);
      socket.join(roomId);
      game.gameStarted = true;

      console.log(`Game starting in room ${roomId} with players:`, game.players);

      // Notify both players that the game is starting
      io.to(roomId).emit('gameStart', {
        board: game.board.rows,
        players: game.players,
        currentPlayer: game.currentPlayerIndex // Alice (index 0) starts first
      });
    } catch (error) {
      console.error('Error joining game:', error);
      socket.emit('error', 'Failed to join game');
    }
  });

  // Handle player moves
  socket.on('makeMove', async ({ roomId, moveKind }) => {
    try {
      console.log(`${socket.id} making move ${moveKind} in room ${roomId}`);
      const game = activeGames[roomId];

      // Validate game exists
      if (!game) {
        socket.emit('error', 'Game not found');
        return;
      }

      // Validate game has started
      if (!game.gameStarted) {
        socket.emit('error', 'Game has not started yet');
        return;
      }

      // Validate it's the correct player's turn
      const currentPlayerSocketId = game.players[game.currentPlayerIndex];
      console.log(`Move validation - Current player: ${currentPlayerSocketId}, Requesting player: ${socket.id}`);
      if (socket.id !== currentPlayerSocketId) {
        console.log(`REJECTED: Not player's turn`);
        socket.emit('error', 'Not your turn');
        return;
      }

      // Validate the move is legal
      if (!isValidMove(game.board, moveKind)) {
        console.log(`REJECTED: Invalid move ${moveKind} for board:`, game.board.rows);
        socket.emit('error', 'Invalid move');
        return;
      }

      // Apply the move to the server's board state
      console.log(`Before move - Board:`, game.board.rows, `Player: ${game.currentPlayerIndex}`);
      if (moveKind === 'row') {
        game.board.removeTopRow();
      } else if (moveKind === 'col') {
        game.board.removeLeftColumn();
      }

      // Check if the game is over
      const gameEnded = game.board.isEmpty();
      if (!gameEnded) {
        // Switch to the other player
        game.currentPlayerIndex = 1 - game.currentPlayerIndex;
      }

      console.log(`After move - Board:`, game.board.rows, `Game ended: ${gameEnded}, Current player: ${game.currentPlayerIndex}`);

      // Send update to both players
      io.to(roomId).emit('gameStateUpdate', {
        board: game.board.rows,
        moveKind,
        currentPlayer: game.currentPlayerIndex,
        gameEnded,
        winner: gameEnded ? game.currentPlayerIndex : null // Current player wins since they made the last move
      });

      // Record game result in database if game ended
      if (gameEnded) {
        try {
          const winnerSocketId = game.players[game.currentPlayerIndex];
          const loserSocketId = game.players[1 - game.currentPlayerIndex];
          
          console.log(`Recording game result: Winner socket ${winnerSocketId}, Loser socket ${loserSocketId}`);
          
          // Get user IDs from socket IDs
          const winnerSocket = io.sockets.sockets.get(winnerSocketId);
          const loserSocket = io.sockets.sockets.get(loserSocketId);
          
          console.log(`Winner socket exists: ${!!winnerSocket}, Loser socket exists: ${!!loserSocket}`);
          
          if (winnerSocket && loserSocket && winnerSocket.userId && loserSocket.userId) {
            console.log(`Inserting game result: Winner ID ${winnerSocket.userId}, Loser ID ${loserSocket.userId}`);
            
            const result = await pool.query(
              'INSERT INTO games (winner_id, loser_id, game_type) VALUES ($1, $2, $3) RETURNING id',
              [winnerSocket.userId, loserSocket.userId, 'LCTR']
            );
            
            console.log(`Game result recorded successfully with ID ${result.rows[0].id}: Winner ${winnerSocket.userId}, Loser ${loserSocket.userId}`);
          } else {
            console.log('Game completed but not recording result - players not authenticated');
            console.log(`Winner socket: ${winnerSocket ? 'exists' : 'missing'}, userId: ${winnerSocket?.userId}`);
            console.log(`Loser socket: ${loserSocket ? 'exists' : 'missing'}, userId: ${loserSocket?.userId}`);
          }
        } catch (err) {
          console.error('Error recording game result:', err);
        }
        
        // Clean up finished games
        setTimeout(() => {
          delete activeGames[roomId];
          console.log(`Cleaned up finished game: ${roomId}`);
        }, 30000); // Clean up after 30 seconds
      }
    } catch (error) {
      console.error('Error making move:', error);
      socket.emit('error', 'Failed to make move');
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    // Find and clean up any games this player was in
    for (const [roomId, game] of Object.entries(activeGames)) {
      if (game.players.includes(socket.id)) {
        // Notify other players in the room
        socket.to(roomId).emit('playerDisconnected', {
          message: 'Your opponent has disconnected'
        });
        // Clean up the game
        delete activeGames[roomId];
        console.log(`Cleaned up game ${roomId} due to player disconnect`);
        break;
      }
    }

    // Clean up Corner games
    for (const [roomId, game] of Object.entries(activeCornerGames)) {
      if (game.players.includes(socket.id)) {
        socket.to(roomId).emit('corner:playerDisconnected', {
          message: 'Your opponent has disconnected'
        });
        delete activeCornerGames[roomId];
        console.log(`Cleaned up Corner game ${roomId} due to player disconnect`);
        break;
      }
    }
  });

  // ===== CORNER Multiplayer (selection-based) =====
  class BoardCorner {
    constructor(rows) {
      this.rows = [...rows];
    }
    isEmpty() {
      return this.rows.length === 0 || this.rows.every(r => r === 0);
    }
    height() { return this.rows.length; }
    width() { return this.rows.length ? Math.max(...this.rows) : 0; }
    // Server-side validation: compute selectable last pieces
    getSelectableLastPieces() {
      if (this.isEmpty()) return [];
      const groups = [];
      if (this.rows.length > 0) {
        let currentGroup = [0];
        for (let i = 1; i < this.rows.length; i++) {
          if (this.rows[i] === this.rows[i - 1]) currentGroup.push(i);
          else { groups.push(currentGroup); currentGroup = [i]; }
        }
        groups.push(currentGroup);
      }
      const selectable = [];
      for (const group of groups) {
        const lastRow = group[group.length - 1];
        if (this.rows[lastRow] > 0) selectable.push({ row: lastRow, col: this.rows[lastRow] - 1 });
      }
      return selectable;
    }
    // Apply a move given an array of {row,col} that must be subset of selectable
    applySelectionMove(selectedPieces) {
      if (!Array.isArray(selectedPieces) || selectedPieces.length === 0) return false;
      const selectable = this.getSelectableLastPieces();
      const set = new Set(selectable.map(p => `${p.row}:${p.col}`));
      for (const p of selectedPieces) {
        if (!set.has(`${p.row}:${p.col}`)) return false; // invalid move
      }
      // Apply
      for (const p of selectedPieces) {
        if (p.row < this.rows.length && p.col === this.rows[p.row] - 1 && this.rows[p.row] > 0) {
          this.rows[p.row] -= 1;
        } else {
          return false;
        }
      }
      // Remove zeros
      this.rows = this.rows.filter(r => r > 0);
      return true;
    }
  }

  // Create Corner game
  socket.on('corner:createGame', (initialBoard) => {
    try {
      let roomId;
      do { roomId = generateRoomId(); } while (activeCornerGames[roomId]);
      const gameState = {
        roomId,
        board: new BoardCorner(initialBoard),
        players: [socket.id], // Alice
        currentPlayerIndex: 0,
        gameStarted: false
      };
      activeCornerGames[roomId] = gameState;
      socket.join(roomId);
      socket.emit('corner:gameCreated', { roomId });
    } catch (err) {
      console.error('Error creating Corner game:', err);
      socket.emit('corner:error', 'Failed to create game');
    }
  });

  // Join Corner game
  socket.on('corner:joinGame', (roomId) => {
    try {
      const game = activeCornerGames[roomId];
      if (!game) { socket.emit('corner:error', 'Game room not found'); return; }
      if (game.players.length >= 2) { socket.emit('corner:error', 'Game room is full'); return; }
      if (game.gameStarted) { socket.emit('corner:error', 'Game has already started'); return; }
      game.players.push(socket.id);
      socket.join(roomId);
      game.gameStarted = true;
      io.to(roomId).emit('corner:gameStart', {
        board: game.board.rows,
        players: game.players,
        currentPlayer: game.currentPlayerIndex
      });
    } catch (err) {
      console.error('Error joining Corner game:', err);
      socket.emit('corner:error', 'Failed to join game');
    }
  });

  // Make Corner move
  socket.on('corner:makeMove', async ({ roomId, selectedPieces }) => {
    try {
      const game = activeCornerGames[roomId];
      if (!game) { socket.emit('corner:error', 'Game not found'); return; }
      if (!game.gameStarted) { socket.emit('corner:error', 'Game has not started'); return; }
      const currentPlayerSocketId = game.players[game.currentPlayerIndex];
      if (socket.id !== currentPlayerSocketId) { socket.emit('corner:error', 'Not your turn'); return; }

      // Validate and apply move
      const ok = game.board.applySelectionMove(selectedPieces);
      if (!ok) { socket.emit('corner:error', 'Invalid move'); return; }

      const gameEnded = game.board.isEmpty();
      if (!gameEnded) game.currentPlayerIndex = 1 - game.currentPlayerIndex;

      io.to(roomId).emit('corner:gameStateUpdate', {
        board: game.board.rows,
        currentPlayer: game.currentPlayerIndex,
        gameEnded,
        winner: gameEnded ? game.currentPlayerIndex : null
      });

      if (gameEnded) {
        try {
          const winnerSocketId = game.players[game.currentPlayerIndex];
          const loserSocketId = game.players[1 - game.currentPlayerIndex];
          const winnerSocket = io.sockets.sockets.get(winnerSocketId);
          const loserSocket = io.sockets.sockets.get(loserSocketId);
          if (winnerSocket && loserSocket && winnerSocket.userId && loserSocket.userId) {
            await pool.query(
              'INSERT INTO games (winner_id, loser_id, game_type) VALUES ($1, $2, $3)',
              [winnerSocket.userId, loserSocket.userId, 'CORNER']
            );
          }
        } catch (err) { console.error('Error recording Corner game result:', err); }
        setTimeout(() => { delete activeCornerGames[roomId]; }, 30000);
      }
    } catch (err) {
      console.error('Error making Corner move:', err);
      socket.emit('corner:error', 'Failed to make move');
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`LCTR Multiplayer Server running on port ${PORT}`);
  console.log(`Environment: ${isProduction ? 'Production' : 'Development'}`);
  console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
  console.log(`Active games will be stored in memory`);
});

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    activeGames: Object.keys(activeGames).length,
    timestamp: new Date().toISOString(),
    environment: isProduction ? 'production' : 'development'
  });
});

// Root endpoint for basic info
app.get('/', (req, res) => {
  res.json({
    service: 'LCTR Multiplayer Server',
    version: '1.0.0',
    status: 'running',
    environment: isProduction ? 'production' : 'development',
    activeGames: Object.keys(activeGames).length
  });
});

// Get active games info (for debugging)
app.get('/games', (req, res) => {
  const gamesInfo = {};
  for (const [roomId, game] of Object.entries(activeGames)) {
    gamesInfo[roomId] = {
      players: game.players.length,
      gameStarted: game.gameStarted,
      currentPlayer: game.currentPlayerIndex,
      boardState: game.board.rows
    };
  }
  res.json(gamesInfo);
});

// Test database connectivity
app.get('/test-db', async (req, res) => {
  try {
    // Test users table
    const usersResult = await pool.query('SELECT COUNT(*) as user_count FROM users');
    
    // Test games table
    const gamesResult = await pool.query('SELECT COUNT(*) as game_count FROM games');
    
    res.json({
      status: 'Database connected successfully',
      users: usersResult.rows[0].user_count,
      games: gamesResult.rows[0].game_count,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Database test failed:', err);
    res.status(500).json({
      error: 'Database connection failed',
      details: err.message
    });
  }
});
