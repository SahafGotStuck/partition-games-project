// report.js — renders a played game's move history as a two-column table,
// one column per player. Moves strictly alternate, so column position alone
// identifies who moved (no separate "Move #"/"Player" columns are needed).

document.addEventListener('DOMContentLoaded', () => {
  const gameSelect = document.getElementById('game-select');
  const generateBtn = document.getElementById('generate-report-btn');
  const inputArea = document.getElementById('game-states-input');
  const reportContainer = document.getElementById('report-container');

  // Every non-iChess game always calls its first mover "Alice" and its second
  // mover "Bob" (see e.g. games/lctr/lctr_script.js `Game.PLAYERS`), regardless
  // of which side is AI-controlled — so those names are fixed. iChess has no
  // such fixed identity (only the AI, if any, gets a name); its actual names
  // are written to localStorage by assets/js/ichess.js at report-open time.
  const GAME_STORAGE_KEYS = [
    { select: 'Corner', stateKey: 'cornerGameStatesForReport' },
    { select: 'LCTR', stateKey: 'lctrGameStatesForReport' },
    { select: 'CRIM', stateKey: 'crimGameStatesForReport' },
    { select: 'Anticorners', stateKey: 'anticornersGameStatesForReport' },
    { select: 'ContinuousCorner', stateKey: 'continuousCornerGameStatesForReport' },
    { select: 'CRIT', stateKey: 'critGameStatesForReport' },
    { select: 'CRIS', stateKey: 'crisGameStatesForReport' },
    { select: 'RIT', stateKey: 'ritGameStatesForReport' },
    { select: 'SatoWelter', stateKey: 'satoWelterGameStatesForReport' },
    { select: 'SICC', stateKey: 'siccGameStatesForReport' },
    { select: 'iChessRook', stateKey: 'rookGameStatesForReport', playersKey: 'rookReportPlayers' },
    { select: 'iChessBishop', stateKey: 'bishopGameStatesForReport', playersKey: 'bishopReportPlayers' },
    { select: 'iChessQueen', stateKey: 'queenGameStatesForReport', playersKey: 'queenReportPlayers' },
    { select: 'iChessKing', stateKey: 'kingGameStatesForReport', playersKey: 'kingReportPlayers' },
    { select: 'iChessKnight', stateKey: 'knightGameStatesForReport', playersKey: 'knightReportPlayers' },
    { select: 'iChessPawn', stateKey: 'pawnGameStatesForReport', playersKey: 'pawnReportPlayers' },
    { select: 'iChessGeneral', stateKey: 'generalGameStatesForReport', playersKey: 'generalReportPlayers' },
  ];

  const ICHESS_PIECE_BY_SELECT = {
    iChessRook: 'rook', iChessBishop: 'bishop', iChessQueen: 'queen',
    iChessKing: 'king', iChessKnight: 'knight', iChessPawn: 'pawn', iChessGeneral: 'general',
  };

  let storedPlayerNames = null;   // set by loadFromStorage() when opened from a live game

  const formatHint = document.getElementById('format-hint');
  function updateFormatHint() {
    const game = gameSelect.value;
    if (ICHESS_PIECE_BY_SELECT[game]) {
      formatHint.textContent = 'Format: row lengths, then "@ col,row" for the piece’s cell — e.g. "6 5 4 3 2 @ 2,1". The first line is the starting position.';
      formatHint.style.display = 'block';
    } else if (game === 'CRIS') {
      formatHint.textContent = 'Format: space-separated "HxW" fragments — e.g. "3x4 2x2". The first line is the starting position.';
      formatHint.style.display = 'block';
    } else {
      formatHint.textContent = 'The first line is the starting position; each line after it is the position left after that player\'s move.';
      formatHint.style.display = 'block';
    }
  }
  gameSelect.addEventListener('change', updateFormatHint);
  updateFormatHint();

  function loadFromStorage() {
    storedPlayerNames = null;
    for (const { select, stateKey, playersKey } of GAME_STORAGE_KEYS) {
      const states = localStorage.getItem(stateKey);
      if (!states) continue;
      gameSelect.value = select;
      inputArea.value = states;
      localStorage.removeItem(stateKey);
      if (playersKey) {
        const players = localStorage.getItem(playersKey);
        if (players) {
          storedPlayerNames = players.split('|');
          localStorage.removeItem(playersKey);
        }
      }
      updateFormatHint();
      return;
    }
  }

  function defaultPlayerNames(game) {
    return ICHESS_PIECE_BY_SELECT[game] ? ['Player 1', 'Player 2'] : ['Alice', 'Bob'];
  }

  // iChess states look like "6 5 4 3 2 @ 2,1" — pull out just the piece's cell
  // and show it in algebraic form (e.g. "c2"), reusing the exact parsing/labeling
  // ichess_report.js already ships (loaded on this page for that purpose).
  function formatStateLine(line) {
    if (line.indexOf('@') !== -1 && typeof window.ichessParseState === 'function') {
      try {
        const { c, r } = window.ichessParseState(line);
        return window.ichessCellLabel(c, r);
      } catch (e) { /* fall through to raw line */ }
    }
    return line;
  }

  function renderMoveTable(container, inputText, game) {
    container.innerHTML = '';
    const lines = inputText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) {
      container.innerHTML = '<p>Please enter at least one game state (the starting position, then one line per move).</p>';
      return;
    }
    const moves = lines.slice(1);   // line 0 is the starting position, not a move
    if (moves.length === 0) {
      container.innerHTML = '<p>Only a starting position was entered — no moves to show yet.</p>';
      return;
    }

    const names = storedPlayerNames || defaultPlayerNames(game);
    const cell = (line) => line
      ? '<div class="move-table-cell">' + formatStateLine(line) + '</div>'
      : '<div class="move-table-cell empty"></div>';

    const totalRounds = Math.ceil(moves.length / 2);
    let html = '<div class="move-table"><div class="move-table-head"><span>' + names[0] + '</span><span>' + names[1] + '</span></div>';
    for (let round = 1; round <= totalRounds; round++) {
      html += '<div class="move-table-row">' + cell(moves[2 * round - 2]) + cell(moves[2 * round - 1]) + '</div>';
    }
    html += '</div>';
    container.innerHTML = html;
  }

  function render() {
    const game = gameSelect.value;
    try {
      renderMoveTable(reportContainer, inputArea.value, game);
    } catch (error) {
      console.error("Could not render the move table:", error);
      reportContainer.innerHTML = '<p>Could not render the move table — check the state format.</p>';
    }
  }

  generateBtn.addEventListener('click', render);
  loadFromStorage();
  if (inputArea.value.trim().length > 0) {
    render();
  }
});
