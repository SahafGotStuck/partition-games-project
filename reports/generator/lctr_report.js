// lctr_report.js

// Simple LCTR analysis using existing LCTR logic (two moves: row/col)
const lctrGrundyMemo = new Map();
function lctrGrundy(position) {
  if (position === '[]') return 0;
  if (lctrGrundyMemo.has(position)) return lctrGrundyMemo.get(position);
  const posArray = JSON.parse(position);
  const childRow = JSON.stringify(posArray.slice(1));
  const childCol = JSON.stringify(posArray.map(r => r - 1).filter(r => r > 0));
  const childValues = new Set([lctrGrundy(childRow), lctrGrundy(childCol)]);
  let g = 0; while (childValues.has(g)) g++;
  lctrGrundyMemo.set(position, g);
  return g;
}

class LctrBoard {
  constructor(rows) { this.rows = [...rows].filter(r => r > 0); }
  height() { return this.rows.length; }
  width() { return this.rows.length ? Math.max(...this.rows) : 0; }
  asTuple() { return JSON.stringify(this.rows); }
}

function lctrAllMoves(board) {
  const moves = [];
  if (board.height() > 0) moves.push('row');
  if (board.width() > 0) moves.push('col');
  return moves;
}

function lctrChildBoard(board, move) {
  const child = new LctrBoard(board.rows);
  if (move === 'row') child.rows = child.rows.slice(1);
  else if (move === 'col') child.rows = child.rows.map(r => r - 1).filter(r => r > 0);
  return child;
}

function lctrGetUptimality(position) {
  if (position === '[]') return 0;
  if (!window._lctrUpt) window._lctrUpt = new Map();
  const memo = window._lctrUpt;
  if (memo.has(position)) return memo.get(position);
  const g = lctrGrundy(position);
  const board = new LctrBoard(JSON.parse(position));
  const childVals = lctrAllMoves(board).map(m => lctrGetUptimality(lctrChildBoard(board, m).asTuple()));
  let value;
  if (g > 0) {
    const winning = lctrAllMoves(board).map(m => {
      const ch = lctrChildBoard(board, m);
      return lctrGrundy(ch.asTuple()) === 0 ? lctrGetUptimality(ch.asTuple()) : Infinity;
    });
    value = 1 + Math.min(...winning);
  } else {
    value = 1 + (childVals.length ? Math.max(...childVals) : -1);
  }
  memo.set(position, value);
  return value;
}

function lctrGetGameDepth(position) {
  if (position === '[]') return 0;
  if (!window._lctrDepth) window._lctrDepth = new Map();
  const memo = window._lctrDepth;
  if (memo.has(position)) return memo.get(position);
  const board = new LctrBoard(JSON.parse(position));
  const childDepths = lctrAllMoves(board).map(m => lctrGetGameDepth(lctrChildBoard(board, m).asTuple()));
  const value = 1 + (childDepths.length ? Math.max(...childDepths) : -1);
  memo.set(position, value);
  return value;
}

function lctrPerformAnalysis(partition) {
  const board = new LctrBoard(partition);
  const pos = board.asTuple();
  const g = lctrGrundy(pos);
  const moveCount = lctrAllMoves(board).length;
  return {
    gValue: g,
    pnStatus: g > 0 ? 'N-Position' : 'P-Position',
    uptimality: lctrGetUptimality(pos),
    gameDepth: lctrGetGameDepth(pos),
    reachableMoves: String(moveCount),
    optimalMoves: lctrAllMoves(board).filter(m => lctrGrundy(lctrChildBoard(board, m).asTuple()) === 0).map(m => m.toUpperCase()).join(' / ') || 'N/A'
  };
}

function lctrCreateReportCard(stateStr, analysis) {
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

function lctrCreateErrorCard(stateStr, errorMessage) {
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

// Misere value for LCTR: 1=win, 0=loss
const lctrMisereMemo = new Map();
function lctrMisereGrundy(position) {
  if (position === '[]') return 1;
  if (lctrMisereMemo.has(position)) return lctrMisereMemo.get(position);
  const posArray = JSON.parse(position);
  const childRow = JSON.stringify(posArray.slice(1));
  const childCol = JSON.stringify(posArray.map(r => r - 1).filter(r => r > 0));
  const win = (lctrMisereGrundy(childRow) === 0) || (lctrMisereGrundy(childCol) === 0);
  const val = win ? 1 : 0;
  lctrMisereMemo.set(position, val);
  return val;
}

window.LctrReport = {
  parseInput(rawInput) {
    return rawInput.split('\n').map(s => s.trim()).filter(Boolean);
  },
  render(container, inputText, mode = 'normal') {
    container.innerHTML = '';
    lctrGrundyMemo.clear();
    if (window._lctrUpt) window._lctrUpt.clear();
    if (window._lctrDepth) window._lctrDepth.clear();
    lctrMisereMemo.clear();
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
          const board = new LctrBoard(partition);
          const pos = board.asTuple();
          const val = lctrMisereGrundy(pos);
          const moveCount = lctrAllMoves(board).length;
          analysis = {
            valueLabel: 'Misere Value',
            gValue: val,
            pnStatus: val === 1 ? 'N-Position' : 'P-Position',
            reachableMoves: String(moveCount),
            optimalMoves: lctrAllMoves(board).filter(m => lctrMisereGrundy(lctrChildBoard(board, m).asTuple()) === 0).map(m => m.toUpperCase()).join(' / ') || 'No winning moves found.'
          };
        } else {
          analysis = { valueLabel: 'Grundy Value (g)', ...lctrPerformAnalysis(partition) };
        }
        container.appendChild(lctrCreateReportCard(stateStr, analysis));
      } catch (e) {
        container.appendChild(lctrCreateErrorCard(stateStr, e.message));
      }
    });
  }
};


