// lctr_analysis.js

// Caching
const lctrUptimalityMemo = new Map();
const lctrGameDepthMemo = new Map();

function lctrAllMoves(board) {
  // For LCTR there are at most two moves if legal: 'row' and 'col'
  const moves = [];
  if (board.height() > 0) moves.push('row');
  if (board.width() > 0) moves.push('col');
  return moves;
}

function lctrChildBoard(board, move) {
  const child = new Board([...board.rows]);
  if (move === 'row') child.removeTopRow();
  else if (move === 'col') child.removeLeftColumn();
  return child;
}

function lctrGetUptimality(position) {
  if (position === '[]') return 0;
  if (lctrUptimalityMemo.has(position)) return lctrUptimalityMemo.get(position);
  const g = grundy(position);
  const board = new Board(JSON.parse(position));
  let value;

  const childUpts = lctrAllMoves(board).map(m => lctrGetUptimality(lctrChildBoard(board, m).asTuple()));
  if (g > 0) {
    const winning = lctrAllMoves(board).map(m => {
      const child = lctrChildBoard(board, m);
      return grundy(child.asTuple()) === 0 ? lctrGetUptimality(child.asTuple()) : Infinity;
    });
    value = 1 + Math.min(...winning);
  } else {
    value = 1 + (childUpts.length > 0 ? Math.max(...childUpts) : -1);
  }
  lctrUptimalityMemo.set(position, value);
  return value;
}

function lctrGetGameDepth(position) {
  if (position === '[]') return 0;
  if (lctrGameDepthMemo.has(position)) return lctrGameDepthMemo.get(position);
  const board = new Board(JSON.parse(position));
  const childDepths = lctrAllMoves(board).map(m => lctrGetGameDepth(lctrChildBoard(board, m).asTuple()));
  const maxDepth = childDepths.length > 0 ? Math.max(...childDepths) : -1;
  const value = 1 + maxDepth;
  lctrGameDepthMemo.set(position, value);
  return value;
}

function lctrCalculateOptimalMoves(board) {
  const g = grundy(board.asTuple());
  if (g === 0) return 'N/A (P-position)';
  const opts = [];
  for (const move of lctrAllMoves(board)) {
    const child = lctrChildBoard(board, move);
    if (grundy(child.asTuple()) === 0) opts.push(move.toUpperCase());
  }
  return opts.join(' / ') || 'No winning moves found.';
}

function lctrCalculateMisereOptimalMoves(board) {
  const isWinning = misereGrundy(board.asTuple()) === 1;
  if (!isWinning) return 'N/A (P-position)';
  const opts = [];
  for (const move of lctrAllMoves(board)) {
    const child = lctrChildBoard(board, move);
    if (misereGrundy(child.asTuple()) === 0) opts.push(move.toUpperCase());
  }
  return opts.join(' / ') || 'No winning moves found.';
}

class LctrAnalysis {
  constructor(gui) {
    this.gui = gui;
    this.isEnabled = false;
    this.valueHistory = [];
    this.getDOMElements();
    this.bindEventListeners();
    this.updateToggleButton();
  }

  getDOMElements() {
    // Reuse the same IDs as Corner where sensible
    this.analysisContainer = document.getElementById('analysis-container');
    // Build panel content if empty (no toggle/undo here — those live outside like Corner)
    if (this.analysisContainer && this.analysisContainer.children.length === 0) {
      this.analysisContainer.innerHTML = `
        <div class="analysis-header"><h3>Analysis Mode</h3>
          <button id="analysis-info-btn" class="icon-button" aria-label="Analysis Info" title="Analysis Field Descriptions">[i]</button>
        </div>
        <p><span class="label">Position Status:</span> <span id="p-n-status">N/A</span></p>
        <p><span class="label">Grundy Value:</span> <span id="g-value">N/A</span></p>
        <p><span class="label">Uptimality:</span> <span id="uptimality-value">N/A</span></p>
        <p><span class="label">Reachable Moves:</span> <span id="reachable-moves">N/A</span></p>
        <p><span class="label">Game Depth:</span> <span id="game-depth">N/A</span></p>
        <p><span class="label">Move Incentive (Min/Max):</span> <span id="move-incentive">N/A</span></p>
        <div class="optimal-moves-container">
          <span class="label">Optimal Moves:</span>
          <div id="optimal-moves" class="optimal-moves-list">N/A</div>
        </div>
        <div class="chart-container">
          <span class="label">G-Number History:</span>
          <canvas id="g-number-chart" width="250" height="120"></canvas>
        </div>
      `;
    }

    this.undoBtn = document.getElementById('undo-btn');
    this.analysisToggle = document.getElementById('analysis-mode-toggle');
    this.analysisInfoBtn = document.getElementById('analysis-info-btn');
    this.p_n_status = document.getElementById('p-n-status');
    this.g_value_label = document.querySelector('#g-value')?.previousElementSibling;
    this.g_value = document.getElementById('g-value');
    this.uptimality = document.getElementById('uptimality-value');
    this.reachable_moves = document.getElementById('reachable-moves');
    this.game_depth = document.getElementById('game-depth');
    this.move_incentive = document.getElementById('move-incentive');
    this.optimal_moves = document.getElementById('optimal-moves');
    this.gNumberChart = document.getElementById('g-number-chart');
  }

  bindEventListeners() {
    if (this.analysisToggle) {
      this.analysisToggle.addEventListener('click', () => {
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
      this.undoBtn.addEventListener('click', () => this.undoMove());
    }
    if (this.analysisInfoBtn) {
      this.analysisInfoBtn.addEventListener('click', () => this.openAnalysisDoc());
    }
  }

  updateToggleButton() {
    if (this.analysisToggle) {
      this.analysisToggle.classList.toggle('active', this.isEnabled);
      this.analysisToggle.classList.toggle('panel-visible', this.isEnabled);
      // Update label when active/inactive
      if (this.isEnabled) {
        this.analysisToggle.textContent = '☝️🤓';
      } else {
        this.analysisToggle.textContent = '☝️🤓 [analysis-mode]';
      }
    }
  }

  openAnalysisDoc() {
    window.open('docs/analysis_doc.html', '_blank');
  }

  onGameStart() {
    if (this.isEnabled) {
      lctrUptimalityMemo.clear();
      lctrGameDepthMemo.clear();
      this.valueHistory = [];
      if (this.gui.game && this.gui.game.board) {
        const isMisere = this.gui.game.gameMode === 'misere';
        const initialValue = isMisere ? misereGrundy(this.gui.game.board.asTuple()) : grundy(this.gui.game.board.asTuple());
        this.valueHistory.push(initialValue);
      }
      this.toggleVisibility(true);
      this.updatePanel();
    } else {
      this.toggleVisibility(false);
    }
  }

  toggleVisibility(show) {
    this.analysisContainer?.classList.toggle('visible', show);
    this.undoBtn?.classList.toggle('visible', show);
  }

  undoMove() {
    if (this.gui.gameHistory.length > 0) {
      const lastState = this.gui.gameHistory.pop();
      this.gui.loadState(lastState);
      if (this.valueHistory.length > 0) this.valueHistory.pop();
      this.updatePanel();
    }
  }

  onMoveMade() {
    if (this.isEnabled && this.gui.game && this.gui.game.board) {
      const isMisere = this.gui.game.gameMode === 'misere';
      const val = isMisere ? misereGrundy(this.gui.game.board.asTuple()) : grundy(this.gui.game.board.asTuple());
      this.valueHistory.push(val);
      this.updatePanel();
    }
  }

  drawAdvantageChart() {
    if (!this.gNumberChart) return;
    const isMisere = this.gui.game.gameMode === 'misere';
    const ctx = this.gNumberChart.getContext('2d');
    const width = this.gNumberChart.width;
    const height = this.gNumberChart.height;
    ctx.clearRect(0, 0, width, height);
    const padding = 20;
    ctx.strokeStyle = getComputedStyle(document.body).color || '#333';
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = 2;
    ctx.font = '10px monospace';
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();
    if (this.valueHistory.length === 0) { ctx.fillText('No data', padding + 5, height / 2); return; }
    const maxVal = isMisere ? 1 : Math.max(...this.valueHistory, 1);
    const minVal = 0;
    const range = Math.max(maxVal - minVal, 1);
    if (this.valueHistory.length > 1) {
      ctx.beginPath();
      for (let i = 0; i < this.valueHistory.length; i++) {
        const x = padding + (i / (this.valueHistory.length - 1)) * (width - 2 * padding);
        const y = height - padding - ((this.valueHistory[i] - minVal) / range) * (height - 2 * padding);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        ctx.fillRect(x - 2, y - 2, 4, 4);
      }
      ctx.stroke();
    } else {
      const x = padding + (width - 2 * padding) / 2;
      const y = height - padding - ((this.valueHistory[0] - minVal) / range) * (height - 2 * padding);
      ctx.fillRect(x - 3, y - 3, 6, 6);
    }
    const currentVal = this.valueHistory[this.valueHistory.length - 1];
    const label = isMisere ? (currentVal === 1 ? 'Win' : 'Loss') : `G:${currentVal}`;
    ctx.fillText(`Current: ${label}`, padding + 5, padding + 15);
    ctx.fillText(`Moves: ${this.valueHistory.length - 1}`, padding + 5, height - 5);
  }

  updatePanel() {
    if (!this.isEnabled || !this.gui.game) return;
    const board = this.gui.game.board;
    const isMisere = this.gui.game.gameMode === 'misere';
    if (board.isEmpty()) {
      this.p_n_status.textContent = 'Game Over';
      this.g_value.textContent = '-';
      this.uptimality.textContent = '-';
      this.reachable_moves.textContent = '-';
      this.game_depth.textContent = '-';
      this.optimal_moves.textContent = 'N/A';
      this.move_incentive.textContent = '-';
      this.drawAdvantageChart();
      return;
    }
    const positionTuple = board.asTuple();
    const moves = lctrAllMoves(board).length;
    this.reachable_moves.textContent = String(moves);

    if (isMisere) {
      const mv = misereGrundy(positionTuple);
      this.p_n_status.textContent = mv === 1 ? 'N-Position' : 'P-Position';
      if (this.g_value_label) this.g_value_label.textContent = 'Misere Value:';
      this.g_value.textContent = mv === 1 ? 'Winning' : 'Losing';
      this.optimal_moves.textContent = lctrCalculateMisereOptimalMoves(board);
      this.uptimality.textContent = 'N/A';
      this.game_depth.textContent = 'N/A';
      this.move_incentive.textContent = 'N/A';
    } else {
      const g = grundy(positionTuple);
      this.p_n_status.textContent = g > 0 ? 'N-Position' : 'P-Position';
      if (this.g_value_label) this.g_value_label.textContent = 'Grundy Value:';
      this.g_value.textContent = g;
      this.uptimality.textContent = lctrGetUptimality(positionTuple);
      this.game_depth.textContent = lctrGetGameDepth(positionTuple);
      this.optimal_moves.textContent = lctrCalculateOptimalMoves(board);
      // Incentives
      let minInc = Infinity, maxInc = -Infinity;
      for (const m of lctrAllMoves(board)) {
        const child = lctrChildBoard(board, m);
        const incentive = g - grundy(child.asTuple());
        minInc = Math.min(minInc, incentive);
        maxInc = Math.max(maxInc, incentive);
      }
      this.move_incentive.textContent = isFinite(minInc) ? `${minInc} / ${maxInc}` : 'N/A';
    }
    this.drawAdvantageChart();
  }

  updateHover(hoveredMove) {
    // Highlight top row or left column when hovering in normal UI
    if (!this.isEnabled || !hoveredMove) return;
    const board = this.gui.game.board;
    const tiles = this.gui.gameCard.querySelectorAll('.tile');
    tiles.forEach(t => t.classList.remove('winning-move-highlight', 'blunder-move-highlight', 'neutral-move-highlight'));
    const isMisere = this.gui.game.gameMode === 'misere';
    const currentVal = isMisere ? misereGrundy(board.asTuple()) : grundy(board.asTuple());
    const child = lctrChildBoard(board, hoveredMove);
    const childVal = isMisere ? misereGrundy(child.asTuple()) : grundy(child.asTuple());
    let klass = 'neutral-move-highlight';
    if (!isMisere) {
      if (currentVal > 0) klass = (childVal === 0) ? 'winning-move-highlight' : 'blunder-move-highlight';
    } else {
      if (currentVal === 1) klass = (childVal === 0) ? 'winning-move-highlight' : 'blunder-move-highlight';
    }
    if (hoveredMove === 'row') {
      for (let c = 0; c < board.rows[0]; c++) {
        document.getElementById(`tile-0-${c}`)?.classList.add(klass);
      }
    } else if (hoveredMove === 'col') {
      for (let r = 0; r < board.height(); r++) {
        document.getElementById(`tile-${r}-0`)?.classList.add(klass);
      }
    }
  }
}


