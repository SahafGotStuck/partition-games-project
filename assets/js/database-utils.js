/**
 * Database Utilities for Partition Games
 * Shared functions for saving game data to the database
 */

// Game type mappings
const GAME_TYPE_CODES = {
    'LCTR': 'LCTR',
    'CRIM': 'CRIM', 
    'CRIS': 'CRIS',
    'ANTI': 'ANTI',
    'SATO_WELTER': 'SATO',
    'CORNER': 'CORN',
    'SCC': 'SCC',
    'CONTINUOUS_CORNER': 'CCORN',
    'RIT': 'RIT',
    'CRIT': 'CRIT',
    'CRPM': 'CRPM',
    'CRPS': 'CRPS'
};

/**
 * Store game data in the database
 * @param {string} gameTypeKey - Key from GAME_TYPE_CODES
 * @param {Array|string} initialPartition - Initial partition data
 * @param {Array} movesSequence - Array of move strings
 * @param {string} winner - Winner ('A' or 'B')
 * @param {Date} gameStartTime - When the game started
 */
// NOTE: Extra trailing args are accepted for forward compatibility (e.g., moveContexts)
async function storeGameInDatabase(gameTypeKey, initialPartition, movesSequence, winner, gameStartTime = new Date(), moveContexts = null, isMisere = false, starter = 'A') {
    try {
        // Prepare game data in the required format
        const gameData = {
            gameType: GAME_TYPE_CODES[gameTypeKey] || gameTypeKey,
            partitionData: Array.isArray(initialPartition) ? initialPartition.join(' ') : initialPartition,
            timestampPlayed: gameStartTime.toISOString(),
            movesSequence: Array.isArray(movesSequence) ? movesSequence.join(' ') : movesSequence,
            gameOutcome: winner,
            moveContexts: moveContexts || undefined,
            isMisere: !!isMisere,
            starter: (starter === 'B') ? 'B' : 'A'
        };

        // Get server URL from global config
        const serverUrl = typeof window.GameConfig !== 'undefined' 
            ? window.GameConfig.getServerUrl() 
            : 'http://localhost:3001'; // fallback for local development

        const url = `${serverUrl.replace(/\/$/, '')}/api/game-records`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(gameData)
        });

        if (response.ok) {
            const result = await response.json().catch(() => ({}));
            console.log(`${gameTypeKey} game successfully stored in database:`, result?.record?.id || '(no id)');
            return result.record || null;
        } else {
            let errorDetail;
            try { errorDetail = await response.json(); } catch { errorDetail = await response.text(); }
            console.warn(`Failed to store ${gameTypeKey} game in database:`, errorDetail);
            return null;
        }
    } catch (error) {
        console.warn(`Could not connect to database server for ${gameTypeKey} game:`, error.message);
        // Game continues normally even if database storage fails
        return null;
    }
}

/**
 * Format moves for different game types
 */
const MoveFormatters = {
    // For games like LCTR where moves are simple strings like 'R' or 'C'
    simple: (moves) => moves,
    
    // For games like Anticorners where moves are coordinates like [r, c] -> 'R2C3'
    coordinates: (moves) => moves.map(move => `R${move[0]}C${move[1]}`),
    
    // For games with row/column operations
    rowCol: (moves) => moves.map(move => move.type === 'row' ? `R${move.index}` : `C${move.index}`),
    
    // For games with hook removals like Sato-Welter
    hooks: (moves) => moves.map(move => `R${move.r}C${move.c}`)
};

// Make utilities available globally
if (typeof window !== 'undefined') {
    window.DatabaseUtils = {
        storeGameInDatabase,
        MoveFormatters,
        GAME_TYPE_CODES
    };
}