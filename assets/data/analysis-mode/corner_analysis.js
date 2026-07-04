// corner_analysis.js

// --- Caching for new calculations ---
const uptimalityMemo = new Map();
const gameDepthMemo = new Map();

/**
 * Calculates the Uptimality (also called Remoteness or Smith Value).
 * - If winning (g > 0), it's the minimum number of moves to a guaranteed win.
 * - If losing (g = 0), it's the maximum number of moves the opponent can force.
 * @param {string} position - The board state as a JSON string tuple.
 * @returns {number} The uptimality value.
 */
function getUptimality(position) {
  if (position === "[]") return 0;
  if (uptimalityMemo.has(position)) return uptimalityMemo.get(position);

  const g = grundy(position);
  const board = new Board(JSON.parse(position));
  let value;

  const childUptimalities = [...allCornerMoves(board)].map((move) => {
    const child = new Board([...board.rows]);
    child.makeCornerMoveWithSelection(move);
    return getUptimality(child.asTuple());
  });

  if (g > 0) {
    // Winning position: find the fastest win.
    const winningMovesUptimalities = [...allCornerMoves(board)].map((move) => {
      const child = new Board([...board.rows]);
      child.makeCornerMoveWithSelection(move);
      const childTuple = child.asTuple();
      if (grundy(childTuple) === 0) {
        return getUptimality(childTuple);
      }
      return Infinity; // Not a winning move
    });
    value = 1 + Math.min(...winningMovesUptimalities);
  } else {
    // Losing position: opponent will try to prolong the game.
    value =
      1 + (childUptimalities.length > 0 ? Math.max(...childUptimalities) : -1);
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
  if (position === "[]") return 0;
  if (gameDepthMemo.has(position)) return gameDepthMemo.get(position);

  const board = new Board(JSON.parse(position));
  const childDepths = [...allCornerMoves(board)].map((move) => {
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
 * Calculates and formats optimal winning moves for NORMAL play.
 * @param {Board} board - The current board state.
 * @returns {string} Formatted optimal moves string.
 */
function calculateOptimalMoves(board) {
  const currentG = grundy(board.asTuple());
  if (currentG === 0) return "N/A (P-position)";

  const optimalMoves = [];
  for (const move of allCornerMoves(board)) {
    const childBoard = new Board([...board.rows]);
    childBoard.makeCornerMoveWithSelection(move);
    if (grundy(childBoard.asTuple()) === 0) {
      const moveString = move
        .map((piece) => `R${piece.row}C${piece.col}`)
        .join(",");
      optimalMoves.push(`[${moveString}]`);
    }
  }
  return optimalMoves.join(" / ") || "No winning moves found.";
}

/**
 * Counts the number of winning moves in NORMAL play from a position.
 * A winning move is any move to a child with Grundy value 0.
 * @param {string} position - The board state as a JSON string tuple.
 * @returns {number} Count of winning moves.
 */
function countWinningMoves(position) {
  if (position === "[]") return 0;
  const board = new Board(JSON.parse(position));
  let count = 0;
  for (const move of allCornerMoves(board)) {
    const childBoard = new Board([...board.rows]);
    childBoard.makeCornerMoveWithSelection(move);
    if (grundy(childBoard.asTuple()) === 0) count++;
  }
  return count;
}

/**
 * Calculates and formats optimal winning moves for MISERE play.
 * @param {Board} board - The current board state.
 * @returns {string} Formatted optimal moves string.
 */
function calculateMisereOptimalMoves(board) {
  const isWinning = misereGrundy(board.asTuple()) === 1;
  if (!isWinning) return "N/A (P-position)";

  const optimalMoves = [];
  for (const move of allCornerMoves(board)) {
    const childBoard = new Board([...board.rows]);
    childBoard.makeCornerMoveWithSelection(move);
    if (misereGrundy(childBoard.asTuple()) === 0) {
      // A winning move leads to a losing state for opponent
      const moveString = move.map((p) => `R${p.row}C${p.col}`).join(",");
      optimalMoves.push(`[${moveString}]`);
    }
  }
  return optimalMoves.join(" / ") || "No winning moves found.";
}

class CornerAnalysis {
  constructor(gui) {
    this.gui = gui;
    this.isEnabled = false;
    this.valueHistory = []; // Generic history for g-number or misere value
    this.getDOMElements();
    this.bindEventListeners();
    this.updateToggleButton();
  }

  getDOMElements() {
    this.analysisContainer = document.getElementById("analysis-container");
    this.undoBtn = document.getElementById("undo-btn");
    this.analysisToggle = document.getElementById("analysis-mode-toggle");
    this.analysisInfoBtn = document.getElementById("analysis-info-btn");

    this.p_n_status = document.getElementById("p-n-status");
    this.g_value_label =
      document.querySelector("#g-value").previousElementSibling;
    this.g_value = document.getElementById("g-value");
    this.uptimality = document.getElementById("uptimality-value");
    this.reachable_moves = document.getElementById("reachable-moves");
    this.game_depth = document.getElementById("game-depth");
    this.reversible_moves = document.getElementById("reversible-moves");
    this.move_incentive = document.getElementById("move-incentive");
    this.optimal_moves = document.getElementById("optimal-moves");
    this.gNumberChart = document.getElementById("g-number-chart");

    if (
      this.gNumberChart &&
      (!this.gNumberChart.width || !this.gNumberChart.height)
    ) {
      this.gNumberChart.width = 250;
      this.gNumberChart.height = 120;
    }
  }

  bindEventListeners() {
    if (this.analysisToggle) {
      this.analysisToggle.addEventListener("click", () => {
        this.isEnabled = !this.isEnabled;
        this.updateToggleButton();
        this.toggleVisibility(this.isEnabled);
        if (this.isEnabled && this.gui.game) {
          this.updatePanel();
        }
        if (this.gui.game) {
          this.gui.redrawBoard();
        }
      });
    }
    if (this.undoBtn) {
      this.undoBtn.addEventListener("click", () => this.undoMove());
    }
    if (this.analysisInfoBtn) {
      this.analysisInfoBtn.addEventListener("click", () =>
        this.openAnalysisDoc()
      );
    }
  }

  updateToggleButton() {
    if (this.analysisToggle) {
      this.analysisToggle.classList.toggle("active", this.isEnabled);
      this.analysisToggle.classList.toggle("panel-visible", this.isEnabled);
      // Update label when active/inactive
      if (this.isEnabled) {
        this.analysisToggle.textContent = "☝️🤓";
      } else {
        this.analysisToggle.textContent = "☝️🤓 [analysis-mode]";
      }
    }
  }

  onGameStart() {
    if (this.isEnabled) {
      uptimalityMemo.clear();
      gameDepthMemo.clear();
      this.valueHistory = [];

      if (this.gui.game && this.gui.game.board) {
        const isMisere = this.gui.game.gameMode === "misere";
        const initialValue = isMisere
          ? misereGrundy(this.gui.game.board.asTuple())
          : grundy(this.gui.game.board.asTuple());
        this.valueHistory.push(initialValue);
      }

      this.toggleVisibility(true);
      this.updatePanel();
    } else {
      this.toggleVisibility(false);
    }
  }

  toggleVisibility(show) {
    this.analysisContainer?.classList.toggle("visible", show);
    this.undoBtn?.classList.toggle("visible", show);
    if (!show) {
      this.clearHighlights();
    }
  }

  undoMove() {
    if (this.gui.gameHistory.length > 0) {
      const lastState = this.gui.gameHistory.pop();
      this.gui.loadState(lastState);
      if (this.valueHistory.length > 0) {
        this.valueHistory.pop();
      }
      this.updatePanel();
    }
  }

  onMoveMade() {
    if (this.isEnabled && this.gui.game && this.gui.game.board) {
      const isMisere = this.gui.game.gameMode === "misere";
      const currentValue = isMisere
        ? misereGrundy(this.gui.game.board.asTuple())
        : grundy(this.gui.game.board.asTuple());
      this.valueHistory.push(currentValue);
      this.updatePanel();
    }
  }

  drawAdvantageChart() {
    if (!this.gNumberChart) return;
    const isMisere = this.gui.game.gameMode === "misere";
    const ctx = this.gNumberChart.getContext("2d");
    const width = this.gNumberChart.width;
    const height = this.gNumberChart.height;

    ctx.clearRect(0, 0, width, height);

    const padding = 20;
    ctx.strokeStyle = getComputedStyle(document.body).color || "#E0E0E0";
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = 2;
    ctx.font = "10px monospace";

    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    if (this.valueHistory.length === 0) {
      ctx.fillText("No data", padding + 5, height / 2);
      return;
    }

    const maxVal = isMisere ? 1 : Math.max(...this.valueHistory, 1);
    const minVal = 0;
    const range = Math.max(maxVal - minVal, 1);

    if (this.valueHistory.length > 1) {
      ctx.beginPath();
      for (let i = 0; i < this.valueHistory.length; i++) {
        const x =
          padding +
          (i / (this.valueHistory.length - 1)) * (width - 2 * padding);
        const y =
          height -
          padding -
          ((this.valueHistory[i] - minVal) / range) * (height - 2 * padding);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        ctx.fillRect(x - 2, y - 2, 4, 4);
      }
      ctx.stroke();
    } else {
      const x = padding + (width - 2 * padding) / 2;
      const y =
        height -
        padding -
        ((this.valueHistory[0] - minVal) / range) * (height - 2 * padding);
      ctx.fillRect(x - 3, y - 3, 6, 6);
    }

    const currentVal = this.valueHistory[this.valueHistory.length - 1];
    const label = isMisere
      ? currentVal === 1
        ? "Win"
        : "Loss"
      : `G:${currentVal}`;
    ctx.fillText(`Current: ${label}`, padding + 5, padding + 15);
    ctx.fillText(
      `Moves: ${this.valueHistory.length - 1}`,
      padding + 5,
      height - 5
    );
  }

  updatePanel() {
    if (!this.isEnabled || !this.gui.game) return;

    const board = this.gui.game.board;
    const isMisere = this.gui.game.gameMode === "misere";

    if (board.isEmpty()) {
      this.p_n_status.textContent = "Game Over";
      this.g_value.textContent = "-";
      this.uptimality.textContent = "-";
      this.reachable_moves.textContent = "-";
      this.game_depth.textContent = "-";
      this.reversible_moves.textContent = "-";
      this.optimal_moves.textContent = "N/A";
      this.move_incentive.textContent = "-";
      this.drawAdvantageChart();
      return;
    }

    const positionTuple = board.asTuple();
    const moves = board.getSelectableLastPieces().length;
    const totalMoves =
      moves > 0 ? (BigInt(1) << BigInt(moves)) - BigInt(1) : BigInt(0);
    this.reachable_moves.textContent = totalMoves.toString();
    this.reversible_moves.textContent = calculateReversibleMoves(board);

    if (isMisere) {
      const misereValue = misereGrundy(positionTuple);
      this.p_n_status.textContent =
        misereValue === 1 ? "N-Position" : "P-Position";
      this.g_value_label.textContent = "Misere Value:";
      this.g_value.textContent = misereValue === 1 ? "Winning" : "Losing";
      this.optimal_moves.textContent = calculateMisereOptimalMoves(board);

      // These metrics are not applicable to misere play in the same way
      this.uptimality.textContent = "N/A";
      this.game_depth.textContent = "N/A";
      this.move_incentive.textContent = "N/A";
    } else {
      // Normal play logic
      const g = grundy(positionTuple);
      this.p_n_status.textContent = g > 0 ? "N-Position" : "P-Position";
      this.g_value_label.textContent = "Grundy Value:";
      this.g_value.textContent = g;
      this.uptimality.textContent = getUptimality(positionTuple);
      this.game_depth.textContent = getGameDepth(positionTuple);
      this.optimal_moves.textContent = calculateOptimalMoves(board);

      let minIncentive = Infinity,
        maxIncentive = -Infinity,
        hasValidMoves = false;
      for (const move of allCornerMoves(board)) {
        const childBoard = new Board([...board.rows]);
        childBoard.makeCornerMoveWithSelection(move);
        const incentive = g - grundy(childBoard.asTuple());
        minIncentive = Math.min(minIncentive, incentive);
        maxIncentive = Math.max(maxIncentive, incentive);
        hasValidMoves = true;
      }
      this.move_incentive.textContent = hasValidMoves
        ? `${minIncentive} / ${maxIncentive}`
        : "N/A";
    }

    this.drawAdvantageChart();
  }

  updateHover(selectedPieces) {
    this.clearHighlights();
    if (!this.isEnabled || selectedPieces.length === 0) return;

    const isMisere = this.gui.game.gameMode === "misere";
    const board = this.gui.game.board;
    const childBoard = new Board([...board.rows]);
    childBoard.makeCornerMoveWithSelection(selectedPieces);

    let highlightClass = "";

    if (isMisere) {
      const isWinning = misereGrundy(board.asTuple()) === 1;
      const childIsLosing = misereGrundy(childBoard.asTuple()) === 0;
      if (isWinning) {
        highlightClass = childIsLosing
          ? "winning-move-highlight"
          : "blunder-move-highlight";
      } else {
        highlightClass = "neutral-move-highlight";
      }
    } else {
      const currentGrundy = grundy(board.asTuple());
      const childGrundy = grundy(childBoard.asTuple());
      if (currentGrundy > 0) {
        highlightClass =
          childGrundy === 0
            ? "winning-move-highlight"
            : "blunder-move-highlight";
      } else {
        highlightClass = "neutral-move-highlight";
      }
    }

    selectedPieces.forEach((p) => {
      const tile = document.getElementById(`tile-${p.row}-${p.col}`);
      if (tile) tile.classList.add(highlightClass);
    });
  }

  clearHighlights() {
    this.gui.boardArea.querySelectorAll(".tile").forEach((t) => {
      t.classList.remove(
        "winning-move-highlight",
        "blunder-move-highlight",
        "neutral-move-highlight"
      );
    });
  }

  openAnalysisDoc() {
    window.open("docs/analysis_doc.html", "_blank");
  }
}

// Node/CommonJS export support for offline table generation
// This preserves browser behavior while enabling `require('./corner_analysis.js')`
// from scripts like `generate_tables_corner.js`.
if (typeof module !== "undefined" && module.exports) {
  // Best-effort: load game primitives if available alongside this file.
  // These are referenced by helper functions above (e.g., Board, grundy).
  try {
    // eslint-disable-next-line global-require, import/no-unresolved
    const game = require("./game.js");
    if (typeof Board === "undefined" && game.Board) global.Board = game.Board;
    if (typeof grundy === "undefined" && game.grundy)
      global.grundy = game.grundy;
    if (typeof misereGrundy === "undefined" && game.misereGrundy)
      global.misereGrundy = game.misereGrundy;
    if (typeof allCornerMoves === "undefined" && game.allCornerMoves)
      global.allCornerMoves = game.allCornerMoves;
  } catch (e) {
    // If game.js is not present in this context, the consumer must provide
    // Board/grundy/misereGrundy/allCornerMoves globally before calling.
  }

  module.exports = {
    getUptimality,
    getGameDepth,
    calculateOptimalMoves,
    countWinningMoves,
    calculateMisereOptimalMoves,
    CornerAnalysis,
  };
}
