/**
 * Script to add database integration to all partition games
 * This updates the remaining game scripts with database tracking
 */

// Game configurations - mapping script files to their game types
const GAMES_CONFIG = [
    { 
        script: 'sato_welter_script.js', 
        page: 'sato_welter_page.html',
        gameType: 'SATO_WELTER',
        moveFormat: 'hooks' // moves like R2C3 for hook at row 2, col 3
    },
    { 
        script: 'crim_script.js', 
        page: 'crim_page.html',
        gameType: 'CRIM',
        moveFormat: 'rowCol' // moves like R2 or C3 
    },
    { 
        script: 'cris_script.js', 
        page: 'cris_page.html',
        gameType: 'CRIS',
        moveFormat: 'rowCol'
    },
    { 
        script: 'rit_script.js',
page: 'rit_page.html',
gameType: 'RIT',
        moveFormat: 'coordinates' // moves like R2C3-R2C5 for range
    },
    { 
        script: 'crit_script.js', 
        page: 'crit_page.html',
        gameType: 'CRIT',
        moveFormat: 'coordinates'
    },
    { 
        script: 'crpm_script.js', 
        page: 'crpm_page.html',
        gameType: 'CRPM',
        moveFormat: 'rowCol'
    },
    { 
        script: 'crps_script.js', 
        page: 'crps_page.html',
        gameType: 'CRPS',
        moveFormat: 'rowCol'
    },
    { 
        script: 'scc_script.js',
page: 'scc_page.html',
gameType: 'SCC',
        moveFormat: 'coordinates'
    },
    { 
        script: 'continuous_corner_script.js', 
        page: 'continuous_corner_page.html',
        gameType: 'CONTINUOUS_CORNER',
        moveFormat: 'coordinates'
    }
];

// Template for database integration code to add to constructors
const CONSTRUCTOR_ADDITION = `
        // Database tracking properties
        this.movesSequence = [];
        this.gameStartTime = null;`;

// Template for startGame method addition
const STARTGAME_ADDITION = `
        this.movesSequence = []; // Reset moves tracking
        this.gameStartTime = new Date(); // Track when game started`;

// Template for storeGameInDatabase method
const STORE_METHOD = (gameType) => `
    async storeGameInDatabase(winner) {
        try {
            if (typeof window.DatabaseUtils !== 'undefined') {
                await window.DatabaseUtils.storeGameInDatabase(
                    '${gameType}',
                    this.initialPartition,
                    this.movesSequence,
                    winner,
                    this.gameStartTime
                );
            }
        } catch (error) {
            console.warn('Could not store ${gameType} game in database:', error.message);
        }
    }`;

// Template for tracking moves (to be added to move execution methods)
const MOVE_TRACKING = {
    hooks: `
        // Track move for database - format as R{row}C{col}
        this.movesSequence.push(\`R\${r}C\${c}\`);`,
    
    rowCol: `
        // Track move for database - format as R{index} or C{index}
        this.movesSequence.push(moveType === 'row' ? \`R\${moveIndex}\` : \`C\${moveIndex}\`);`,
    
    coordinates: `
        // Track move for database - format as R{row}C{col}
        if (selectedCells && selectedCells.length > 0) {
            const moveStr = selectedCells.map(cell => \`R\${cell.row}C\${cell.col}\`).join(',');
            this.movesSequence.push(moveStr);
        }`
};

// Template for database save call (to be added when game ends)
const DATABASE_SAVE_CALL = `
            // Save game to database
            this.storeGameInDatabase(this.game.currentPlayer);`;

console.log('Database integration templates ready!');
console.log('Games to integrate:', GAMES_CONFIG.map(g => g.gameType).join(', '));

// Instructions for manual integration:
console.log(`
MANUAL INTEGRATION STEPS:

For each game in GAMES_CONFIG:

1. Add to HTML page script section:
   <script src="config.js"></script>
   <script src="script.js"></script>
   <script src="database-utils.js"></script>

2. Add to constructor: ${CONSTRUCTOR_ADDITION}

3. Add to startGame method: ${STARTGAME_ADDITION}

4. Add storeGameInDatabase method to class

5. Add move tracking to move execution methods

6. Add database save call when game ends

This will enable database storage for all partition games!
`);