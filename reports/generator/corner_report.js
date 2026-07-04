// script.js

// --- Caching for calculations ---
const grundyMemo = new Map();
const uptimalityMemo = new Map();
const gameDepthMemo = new Map();

// --- CORE GAME LOGIC (from corner_script.js) ---
class Board {
    constructor(rows) {
        this.rows = [...rows].filter(r => r > 0).sort((a, b) => b - a);
    }
    isEmpty() {
        return this.rows.length === 0;
    }
    asTuple() {
        return JSON.stringify(this.rows);
    }
    makeCornerMoveWithSelection(selectedPieces) {
        if (this.isEmpty() || selectedPieces.length === 0) return;
        for (const piece of selectedPieces) {
            if (piece.row < this.rows.length && piece.col === this.rows[piece.row] - 1) {
                this.rows[piece.row]--;
            }
        }
        this.rows = this.rows.filter((r) => r > 0);
    }
    getSelectableLastPieces() {
        if (this.isEmpty()) return [];
        const groups = [];
        if (this.rows.length > 0) {
            let currentGroup = [0];
            for (let i = 1; i < this.rows.length; i++) {
                if (this.rows[i] === this.rows[i - 1]) {
                    currentGroup.push(i);
                } else {
                    groups.push(currentGroup);
                    currentGroup = [i];
                }
            }
            groups.push(currentGroup);
        }
        const selectablePieces = [];
        for (const group of groups) {
            const lastRowInGroup = group[group.length - 1];
            if (this.rows[lastRowInGroup] > 0) {
                selectablePieces.push({
                    row: lastRowInGroup,
                    col: this.rows[lastRowInGroup] - 1,
                });
            }
        }
        return selectablePieces;
    }
}

// --- ANALYSIS FUNCTIONS (from corner_script.js and corner_analysis.js) ---

/**
 * Generates all possible corner moves (non-empty subsets of selectable pieces).
 * @param {Board} board - The current board object.
 * @returns {Generator<object[]>} A generator for all possible moves.
 */
function* allCornerMoves(board) {
    const selectable = board.getSelectableLastPieces();
    const n = selectable.length;
    for (let mask = 1; mask < (1 << n); mask++) {
        const move = [];
        for (let i = 0; i < n; i++) {
            if (mask & (1 << i)) {
                move.push(selectable[i]);
            }
        }
        yield move;
    }
}

/**
 * Calculates the Grundy number (g-value) for a Corner position.
 * @param {string} position - The board state as a JSON string tuple.
 * @returns {number} The Grundy value.
 */
function grundy(position) {
    if (position === "[]") return 0;
    if (grundyMemo.has(position)) return grundyMemo.get(position);

    const board = new Board(JSON.parse(position));
    if (board.getSelectableLastPieces().length === 0) {
        grundyMemo.set(position, 0);
        return 0;
    }

    const childValues = new Set();
    for (const move of allCornerMoves(board)) {
        const child = new Board([...board.rows]);
        child.makeCornerMoveWithSelection(move);
        childValues.add(grundy(child.asTuple()));
    }

    let g = 0;
    while (childValues.has(g)) g++;
    grundyMemo.set(position, g);
    return g;
}

/**
 * Calculates the Uptimality (Remoteness).
 * @param {string} position - The board state as a JSON string tuple.
 * @returns {number} The uptimality value.
 */
function getUptimality(position) {
    if (position === '[]') return 0;
    if (uptimalityMemo.has(position)) return uptimalityMemo.get(position);

    const g = grundy(position);
    const board = new Board(JSON.parse(position));
    let value;

    const childUptimalities = [...allCornerMoves(board)].map(move => {
        const child = new Board([...board.rows]);
        child.makeCornerMoveWithSelection(move);
        return getUptimality(child.asTuple());
    });

    if (g > 0) { // Winning position
        const winningMovesUptimalities = [...allCornerMoves(board)]
            .map(move => {
                const child = new Board([...board.rows]);
                child.makeCornerMoveWithSelection(move);
                if (grundy(child.asTuple()) === 0) {
                    return getUptimality(child.asTuple());
                }
                return Infinity;
            });
        value = 1 + Math.min(...winningMovesUptimalities);
    } else { // Losing position
        value = 1 + (childUptimalities.length > 0 ? Math.max(...childUptimalities) : -1);
    }

    uptimalityMemo.set(position, value);
    return value;
}

/**
 * Calculates the maximum possible length of the game from the current position.
 * @param {string} position - The board state as a JSON string tuple.
 * @returns {number} The maximum depth of the game tree.
 */
function getGameDepth(position) {
    if (position === '[]') return 0;
    if (gameDepthMemo.has(position)) return gameDepthMemo.get(position);

    const board = new Board(JSON.parse(position));
    const childDepths = [...allCornerMoves(board)].map(move => {
        const child = new Board([...board.rows]);
        child.makeCornerMoveWithSelection(move);
        return getGameDepth(child.asTuple());
    });

    const maxDepth = childDepths.length > 0 ? Math.max(...childDepths) : -1;
    const value = 1 + maxDepth;

    gameDepthMemo.set(position, value);
    return value;
}

/**
 * Calculates the number of moves that can be immediately reversed by an opponent.
 * @param {Board} board - The current board state.
 * @returns {number} The count of reversible moves.
 */
function calculateReversibleMoves(board) {
    const originalTuple = board.asTuple();
    let reversibleCount = 0;

    for (const move of allCornerMoves(board)) {
        const childBoard = new Board([...board.rows]);
        childBoard.makeCornerMoveWithSelection(move);
        for (const counterMove of allCornerMoves(childBoard)) {
            const grandchildBoard = new Board([...childBoard.rows]);
            grandchildBoard.makeCornerMoveWithSelection(counterMove);
            if (grandchildBoard.asTuple() === originalTuple) {
                reversibleCount++;
                break;
            }
        }
    }
    return reversibleCount;
}

/**
 * Calculates and formats optimal winning moves as coordinate strings.
 * @param {Board} board - The current board state.
 * @returns {string} Formatted optimal moves string.
 */
function calculateOptimalMoves(board) {
    const currentG = grundy(board.asTuple());
    if (currentG === 0) {
        return "N/A (P-Position)";
    }
    const optimalMoves = [];
    for (const move of allCornerMoves(board)) {
        const childBoard = new Board([...board.rows]);
        childBoard.makeCornerMoveWithSelection(move);
        if (grundy(childBoard.asTuple()) === 0) {
            const moveString = move.map(p => `R${p.row}C${p.col}`).join(', ');
            optimalMoves.push(`[${moveString}]`);
        }
    }
    return optimalMoves.join(' / ') || "No winning moves found.";
}


// --- Public API (for unified report) ---
// Misere support for report (value 1=win, 0=loss)
const reportMisereMemo = new Map();
function reportMisereGrundy(position) {
    if (position === '[]') return 1;
    if (reportMisereMemo.has(position)) return reportMisereMemo.get(position);
    const board = new Board(JSON.parse(position));
    if (board.getSelectableLastPieces().length === 0) {
        reportMisereMemo.set(position, 1);
        return 1;
    }
    for (const move of allCornerMoves(board)) {
        const child = new Board([...board.rows]);
        child.makeCornerMoveWithSelection(move);
        if (reportMisereGrundy(child.asTuple()) === 0) {
            reportMisereMemo.set(position, 1);
            return 1;
        }
    }
    reportMisereMemo.set(position, 0);
    return 0;
}

window.CornerReport = {
    parseInput(rawInput) {
        return rawInput.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    },
    performAnalysis,
    createReportCard,
    createErrorCard,
    render(container, inputText, mode = 'normal') {
        container.innerHTML = '';
        grundyMemo.clear();
        uptimalityMemo.clear();
        gameDepthMemo.clear();
        reportMisereMemo.clear();
        const states = this.parseInput(inputText);
        if (states.length === 0) {
            container.innerHTML = '<p>Please enter at least one valid game state.</p>';
            return;
        }
        states.forEach(stateStr => {
            try {
                const partition = stateStr.split(/\s+/).map(Number);
                if (partition.some(isNaN)) throw new Error(`Invalid characters in state: "${stateStr}"`);
                let analysis;
                if (mode === 'misere') {
                    const board = new Board(partition);
                    const positionTuple = board.asTuple();
                    const val = reportMisereGrundy(positionTuple);
                    const selectableCount = board.getSelectableLastPieces().length;
                    analysis = {
                        isMisere: true,
                        valueLabel: 'Misere Value',
                        gValue: val,
                        pnStatus: val === 1 ? 'N-Position' : 'P-Position',
                        reachableMoves: (selectableCount > 0 ? (BigInt(1) << BigInt(selectableCount)) - BigInt(1) : 0n).toString(),
                        optimalMoves: (() => {
                            const optimalMoves = [];
                            for (const move of allCornerMoves(board)) {
                                const childBoard = new Board([...board.rows]);
                                childBoard.makeCornerMoveWithSelection(move);
                                if (reportMisereGrundy(childBoard.asTuple()) === 0) {
                                    const moveString = move.map(p => `R${p.row}C${p.col}`).join(', ');
                                    optimalMoves.push(`[${moveString}]`);
                                }
                            }
                            return optimalMoves.join(' / ') || 'No winning moves found.';
                        })()
                    };
                } else {
                    analysis = { valueLabel: 'Grundy Value (g)', ...performAnalysis(partition) };
                }
                const reportCard = createReportCard(stateStr, analysis);
                container.appendChild(reportCard);
            } catch (error) {
                const errorCard = createErrorCard(stateStr, error.message);
                container.appendChild(errorCard);
            }
        });
    }
};

// --- Standalone page wiring (corner_report.html) ---
if (!window.UNIFIED_REPORT) {
    document.addEventListener('DOMContentLoaded', () => {
        const generateBtn = document.getElementById('generate-report-btn');
        const inputArea = document.getElementById('game-states-input');
        const reportContainer = document.getElementById('report-container');

        function loadAndRunReport() {
            const gameStates = localStorage.getItem('cornerGameStatesForReport');
            if (gameStates) {
                inputArea.value = gameStates;
                localStorage.removeItem('cornerGameStatesForReport');
                generateBtn.click();
            }
        }

        generateBtn.addEventListener('click', () => {
            window.CornerReport.render(reportContainer, inputArea.value, 'normal');
        });

        loadAndRunReport();
    });
}

/**
 * Performs all analysis for a given partition.
 * @param {number[]} partition - The partition to analyze.
 * @returns {object} An object containing all analysis results.
 */
function performAnalysis(partition) {
    const board = new Board(partition);
    const positionTuple = board.asTuple();
    const g = grundy(positionTuple);
    const selectableCount = board.getSelectableLastPieces().length;
    const reachableMoves = selectableCount > 0 ? (BigInt(1) << BigInt(selectableCount)) - BigInt(1) : BigInt(0);

    return {
        gValue: g,
        pnStatus: g > 0 ? 'N-Position' : 'P-Position',
        uptimality: getUptimality(positionTuple),
        gameDepth: getGameDepth(positionTuple),
        reachableMoves: reachableMoves.toString(),
        reversibleMoves: calculateReversibleMoves(board),
        optimalMoves: calculateOptimalMoves(board),
    };
}

/**
 * Creates the HTML element for a single analysis report card.
 * @param {string} stateStr - The original input string for the state.
 * @param {object} analysis - The object with analysis results.
 * @returns {HTMLElement} The generated div element.
 */
function createReportCard(stateStr, analysis) {
    const card = document.createElement('div');
    card.className = 'report-card';
    
    const pnClass = analysis.pnStatus === 'N-Position' ? 'n-position' : 'p-position';

    const valueLabel = analysis.valueLabel || 'Grundy Value (g)';
    let content = `
        <div class="report-header">
            <h3>[${stateStr}]</h3>
            <span class="p-n-status ${pnClass}">${analysis.pnStatus}</span>
        </div>
        <p><span class="label">${valueLabel}:</span> <span class="value">${analysis.gValue}</span></p>
    `;

    const addRow = (label, value) => {
        if (value !== undefined && value !== 'N/A') {
            content += `<p><span class=\"label\">${label}:</span> <span class=\"value\">${value}</span></p>`;
        }
    };

    addRow('Uptimality', analysis.uptimality);
    addRow('Max Game Depth', analysis.gameDepth);
    addRow('Reachable Moves', analysis.reachableMoves);
    addRow('Reversible Moves', analysis.reversibleMoves);

    if (analysis.optimalMoves !== undefined && analysis.optimalMoves !== 'N/A') {
        content += `
            <div class="optimal-moves-container">
                <span class="label">Optimal Moves (to g=0):</span>
                <div class="optimal-moves-list">${analysis.optimalMoves}</div>
            </div>
        `;
    }

    card.innerHTML = content;
    return card;
}

/**
 * Creates an error card for invalid input.
 * @param {string} stateStr - The invalid input string.
 * @param {string} errorMessage - The error message to display.
 * @returns {HTMLElement} The generated div element for the error.
 */
function createErrorCard(stateStr, errorMessage) {
    const card = document.createElement('div');
    card.className = 'report-card';
    card.innerHTML = `
        <div class="report-header">
            <h3>[${stateStr}]</h3>
            <span class="p-n-status p-position">Error</span>
        </div>
        <p>Could not analyze this state.</p>
        <p><span class="label">Reason:</span> <span class="value">${errorMessage}</span></p>
    `;
    return card;
}