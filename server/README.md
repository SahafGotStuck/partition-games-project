# LCTR Multiplayer Server

A Node.js/Express/Socket.IO server for the LCTR partition game multiplayer functionality.

## Features

- Real-time multiplayer gameplay
- Room-based game sessions
- Server-side move validation
- Automatic game cleanup
- CORS support for production deployment

## Local Development

### Prerequisites
- Node.js (v14 or higher)
- npm

### Setup
1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the server:
   ```bash
   npm start
   ```

3. The server will run on `http://localhost:3001`

### Environment Variables
- `NODE_ENV`: Set to `production` for production deployment
- `PORT`: Server port (default: 3001, Render will override this)

## Production Deployment

See `DEPLOYMENT.md` for detailed deployment instructions.

### Quick Deploy to Render
1. Push your code to GitHub
2. Connect your repository to Render
3. Configure as a Web Service
4. Set environment variables
5. Deploy

## API Endpoints

- `GET /` - Server info
- `GET /health` - Health check
- `GET /games` - Active games info (debug)

## Socket.IO Events

### Client → Server
- `createGame(board)` - Create a new game room
- `joinGame(roomId)` - Join an existing game
- `makeMove({roomId, moveKind})` - Make a move

### Server → Client
- `gameCreated({roomId})` - Game created successfully
- `gameStart({board, players, currentPlayer})` - Game started
- `gameStateUpdate({board, moveKind, currentPlayer, gameEnded, winner})` - Game state update
- `playerDisconnected({message})` - Opponent disconnected
- `error(message)` - Error occurred

## Game Logic

The server implements the same game logic as the frontend:
- Players take turns removing entire rows or columns
- Last player to make a move wins
- Server validates all moves before applying them 