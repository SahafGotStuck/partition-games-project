// crim_analysis.js

// Misere value for CRIM: 1=win, 0=loss
const crimMisereMemo = new Map();
function crimMisereValue(position) {
  if (position === '[]') return 1;
  if (crimMisereMemo.has(position)) return crimMisereMemo.get(position);
  const posArray = JSON.parse(position);
  const width = posArray.length > 0 ? posArray[0] : 0;
  // Rows
  for (let i = 0; i < posArray.length; i++) {
    const nextPos = [...posArray];
    nextPos.splice(i, 1);
    if (crimMisereValue(JSON.stringify(nextPos.sort((a, b) => b - a))) === 0) {
      crimMisereMemo.set(position, 1); return 1;
    }
  }
  // Cols
  for (let j = 0; j < width; j++) {
    const nextPos = posArray.map(len => (len > j ? len - 1 : len)).filter(len => len > 0);
    if (crimMisereValue(JSON.stringify(nextPos.sort((a, b) => b - a))) === 0) {
      crimMisereMemo.set(position, 1); return 1;
    }
  }
  crimMisereMemo.set(position, 0); return 0;
}

// --- Additional CRIM metrics: Uptimality and Game Depth ---
const crimUptMemo = new Map();
const crimDepthMemo = new Map();

function crimChildrenFromTuple(position) {
  const posArray = JSON.parse(position); // sorted desc
  const children = [];
  const width = posArray.length > 0 ? posArray[0] : 0;
  // Remove any row
  for (let i = 0; i < posArray.length; i++) {
    const nextPos = [...posArray];
    nextPos.splice(i, 1);
    children.push(JSON.stringify(nextPos.sort((a, b) => b - a)));
  }
  // Remove any column
  for (let j = 0; j < width; j++) {
    const nextPos = posArray.map(len => (len > j ? len - 1 : len)).filter(len => len > 0);
    children.push(JSON.stringify(nextPos.sort((a, b) => b - a)));
  }
  return children;
}

function crimGetUptimality(position) {
  if (position === '[]') return 0;
  if (crimUptMemo.has(position)) return crimUptMemo.get(position);
  const g = grundy(position);
  const childPositions = crimChildrenFromTuple(position);
  let value;
  if (g > 0) {
    const winningUpts = childPositions.map(p => (grundy(p) === 0 ? crimGetUptimality(p) : Infinity));
    value = 1 + Math.min(...winningUpts);
  } else {
    const childUpts = childPositions.map(p => crimGetUptimality(p));
    value = 1 + (childUpts.length ? Math.max(...childUpts) : -1);
  }
  crimUptMemo.set(position, value);
  return value;
}

function crimGetGameDepth(position) {
  if (position === '[]') return 0;
  if (crimDepthMemo.has(position)) return crimDepthMemo.get(position);
  const childPositions = crimChildrenFromTuple(position);
  const childDepths = childPositions.map(p => crimGetGameDepth(p));
  const value = 1 + (childDepths.length ? Math.max(...childDepths) : -1);
  crimDepthMemo.set(position, value);
  return value;
}

function crimAllMoves(board) {
  const moves = [];
  for (const r of board.rowsAlive()) moves.push({ type: 'row', index: r });
  for (const c of board.colsAlive()) moves.push({ type: 'col', index: c });
  return moves;
}

function crimChildTuple(board, move) {
  const rows = board.getRows();
  if (move.type === 'row') {
    const next = [...rows];
    next.splice(move.index, 1);
    return JSON.stringify(next.sort((a, b) => b - a));
  }
  if (move.type === 'col') {
    const j = move.index;
    const next = rows.map(len => (len > j ? len - 1 : len)).filter(len => len > 0);
    return JSON.stringify(next.sort((a, b) => b - a));
  }
  return board.asTuple();
}

class CrimAnalysis {
  constructor(gui) {
    this.gui = gui;
    this.isEnabled = false;
    this.valueHistory = [];
    this.getDOMElements();
    this.bindEventListeners();
    this.updateToggleButton();
  }

  getDOMElements() {
    this.analysisContainer = document.getElementById('analysis-container');
    if (this.analysisContainer && this.analysisContainer.children.length === 0) {
      this.analysisContainer.innerHTML = `
        <div class="analysis-header"><h3>Analysis Mode</h3>
          <button id="analysis-info-btn" class="icon-button" aria-label="Analysis Info" title="Analysis Field Descriptions">[i]</button>
        </div>
        <p><span class="label">Position Status:</span> <span id="p-n-status">N/A</span></p>
        <p><span class="label" id="g-value-label">Grundy Value:</span> <span id="g-value">N/A</span></p>
        <p><span class="label">Uptimality:</span> <span id="uptimality-value">N/A</span></p>
        <p><span class="label">Reachable Moves:</span> <span id="reachable-moves">N/A</span></p>
        <p><span class="label">Game Depth:</span> <span id="game-depth">N/A</span></p>
        <p><span class="label">Move Incentive (Min/Max):</span> <span id="move-incentive">N/A</span></p>
        <div class="optimal-moves-container">
          <span class="label">Optimal Moves:</span>
          <div id="optimal-moves" class="optimal-moves-list">N/A</div>
        </div>
        <div class="chart-container">
          <span class="label">History:</span>
          <canvas id="g-number-chart" width="250" height="120"></canvas>
        </div>
      `;
    }
    this.undoBtn = document.getElementById('undo-btn');
    this.analysisToggle = document.getElementById('analysis-mode-toggle');
    this.analysisInfoBtn = document.getElementById('analysis-info-btn');
    this.p_n_status = document.getElementById('p-n-status');
    this.g_value_label = document.getElementById('g-value-label');
    this.g_value = document.getElementById('g-value');
    this.uptimality = document.getElementById('uptimality-value');
    this.reachable_moves = document.getElementById('reachable-moves');
    this.game_depth = document.getElementById('game-depth');
    this.optimal_moves = document.getElementById('optimal-moves');
    this.move_incentive = document.getElementById('move-incentive');
    this.gNumberChart = document.getElementById('g-number-chart');
  }

  bindEventListeners() {
    if (this.analysisToggle) {
      this.analysisToggle.addEventListener('click', () => {
        this.isEnabled = !this.isEnabled;
        this.updateToggleButton();
        this.toggleVisibility(this.isEnabled);
        if (this.isEnabled && this.gui.game) this.updatePanel();
        if (this.gui.game) this.gui.redrawBoard();
      });
    }
    if (this.undoBtn) this.undoBtn.addEventListener('click', () => this.gui.undoMove());
    if (this.analysisInfoBtn) this.analysisInfoBtn.addEventListener('click', () => window.open('docs/analysis_doc.html', '_blank'));
  }

  updateToggleButton() {
    if (!this.analysisToggle) return;
    this.analysisToggle.classList.toggle('active', this.isEnabled);
    this.analysisToggle.classList.toggle('panel-visible', this.isEnabled);
    this.analysisToggle.textContent = this.isEnabled ? '☝️🤓' : '☝️🤓 [analysis-mode]';
  }

  toggleVisibility(show) {
    this.analysisContainer?.classList.toggle('visible', show);
    this.undoBtn?.classList.toggle('visible', show);
  }

  onGameStart() {
    this.valueHistory = [];
    crimMisereMemo.clear();
    crimUptMemo.clear();
    crimDepthMemo.clear();
    if (this.isEnabled && this.gui.game && this.gui.game.board) {
      const isMisere = this.gui.game.gameMode === 'misere';
      const tuple = this.gui.game.board.asTuple();
      const v = isMisere ? crimMisereValue(tuple) : grundy(tuple);
      this.valueHistory.push(v);
      this.toggleVisibility(true);
      this.updatePanel();
    } else {
      this.toggleVisibility(false);
    }
  }

  onMoveMade() {
    if (!this.isEnabled || !this.gui.game || !this.gui.game.board) return;
    const isMisere = this.gui.game.gameMode === 'misere';
    const tuple = this.gui.game.board.asTuple();
    const v = isMisere ? crimMisereValue(tuple) : grundy(tuple);
    this.valueHistory.push(v);
    this.updatePanel();
  }

  drawChart() {
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
      this.reachable_moves.textContent = '-';
      this.optimal_moves.textContent = 'N/A';
      this.drawChart();
      return;
    }
    const tuple = board.asTuple();
    const reach = board.rowsAlive().length + board.colsAlive().length;
    this.reachable_moves.textContent = String(reach);
    if (isMisere) {
      const mv = crimMisereValue(tuple);
      this.p_n_status.textContent = mv === 1 ? 'N-Position' : 'P-Position';
      this.g_value_label.textContent = 'Misere Value:';
      this.g_value.textContent = mv === 1 ? 'Winning' : 'Losing';
      this.uptimality.textContent = 'N/A';
      // Optimal moves under misere
      const opts = [];
      for (const m of crimAllMoves(board)) {
        const childTuple = crimChildTuple(board, m);
        if (crimMisereValue(childTuple) === 0) opts.push(m.type.toUpperCase() + ' ' + m.index);
      }
      this.optimal_moves.textContent = opts.length ? opts.join(' / ') : 'No winning moves found.';
      this.game_depth.textContent = 'N/A';
      this.move_incentive.textContent = 'N/A';
    } else {
      const g = grundy(tuple);
      this.p_n_status.textContent = g > 0 ? 'N-Position' : 'P-Position';
      this.g_value_label.textContent = 'Grundy Value:';
      this.g_value.textContent = g;
      this.uptimality.textContent = crimGetUptimality(tuple);
      this.game_depth.textContent = crimGetGameDepth(tuple);
      const opts = [];
      for (const m of crimAllMoves(board)) {
        const childTuple = crimChildTuple(board, m);
        if (grundy(childTuple) === 0) opts.push(m.type.toUpperCase() + ' ' + m.index);
      }
      this.optimal_moves.textContent = g === 0 ? 'N/A (P-position)' : (opts.length ? opts.join(' / ') : 'No winning moves found.');
      // Move incentive min/max
      let minInc = Infinity;
      let maxInc = -Infinity;
      for (const m of crimAllMoves(board)) {
        const childTuple = crimChildTuple(board, m);
        const inc = g - grundy(childTuple);
        minInc = Math.min(minInc, inc);
        maxInc = Math.max(maxInc, inc);
      }
      this.move_incentive.textContent = isFinite(minInc) ? `${minInc} / ${maxInc}` : 'N/A';
    }
    this.drawChart();
  }
}


