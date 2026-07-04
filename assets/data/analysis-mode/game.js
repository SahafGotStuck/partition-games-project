// game.js - Node/CommonJS adapter for Corner core logic

// Extracted minimal, DOM-free logic from corner_script.js for offline analysis.
// Provides: Board, allCornerMoves, grundy, misereGrundy

class Board {
  constructor(rows) {
    this.rows = [...rows];
  }
  isEmpty() {
    return this.rows.length === 0 || this.rows.every((r) => r === 0);
  }
  height() {
    return this.rows.length;
  }
  width() {
    return this.rows.length ? Math.max(...this.rows) : 0;
  }
  makeCornerMoveWithSelection(selectedPieces) {
    if (this.isEmpty() || selectedPieces.length === 0) return;
    for (const piece of selectedPieces) {
      if (piece.row < this.rows.length && piece.col < this.rows[piece.row]) {
        if (piece.col === this.rows[piece.row] - 1) {
          this.rows[piece.row]--;
        }
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
    const selectable = [];
    for (const group of groups) {
      const lastRowInGroup = group[group.length - 1];
      if (this.rows[lastRowInGroup] > 0) {
        selectable.push({ row: lastRowInGroup, col: this.rows[lastRowInGroup] - 1 });
      }
    }
    return selectable;
  }
  asTuple() {
    return JSON.stringify(this.rows);
  }
}

const grundyMemo = new Map();
const misereGrundyMemo = new Map();

function* allCornerMoves(board) {
  const selectable = board.getSelectableLastPieces();
  const n = selectable.length;
  for (let mask = 1; mask < 1 << n; mask++) {
    const move = [];
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        move.push(selectable[i]);
      }
    }
    yield move;
  }
}

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

function misereGrundy(position) {
  // Terminal position is WINNING (value 1) for current player in misere play
  if (position === "[]") return 1;
  if (misereGrundyMemo.has(position)) return misereGrundyMemo.get(position);
  const board = new Board(JSON.parse(position));
  if (board.getSelectableLastPieces().length === 0) {
    misereGrundyMemo.set(position, 1);
    return 1;
  }
  let hasWinningChild = false;
  for (const move of allCornerMoves(board)) {
    const child = new Board([...board.rows]);
    child.makeCornerMoveWithSelection(move);
    const childValue = misereGrundy(child.asTuple());
    if (childValue === 0) {
      hasWinningChild = true;
      break;
    }
  }
  const value = hasWinningChild ? 1 : 0;
  misereGrundyMemo.set(position, value);
  return value;
}

module.exports = {
  Board,
  allCornerMoves,
  grundy,
  misereGrundy,
};
