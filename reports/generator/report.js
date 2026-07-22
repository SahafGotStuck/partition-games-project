// report.js — renders a played game's move history as a two-column table,
// one column per player, with each move's Grundy (P-Position/N-Position)
// analysis attached. Moves strictly alternate, so column position alone
// identifies who moved (no separate "Move #"/"Player" columns are needed).
//
// The actual Grundy/P-N-position computation is delegated to each game's
// existing *_report.js module (e.g. window.CornerReport) exactly as before —
// this file just runs that analysis into a detached scratch container and
// pulls the resulting ".p-n-status" badge back out, so the well-tested
// per-game engines stay the single source of truth for what's a win/loss.

document.addEventListener('DOMContentLoaded', () => {
  const gameSelect = document.getElementById('game-select');
  const modeSelect = document.getElementById('game-mode-select');
  const generateBtn = document.getElementById('generate-report-btn');
  const inputArea = document.getElementById('game-states-input');
  const reportContainer = document.getElementById('report-container');

  // Every non-iChess game always calls its first mover "Alice" and its second
  // mover "Bob" (see e.g. games/lctr/lctr_script.js `Game.PLAYERS`), regardless
  // of which side is AI-controlled — so those names are fixed. iChess has no
  // such fixed identity (only the AI, if any, gets a name); its actual names
  // are written to localStorage by assets/js/ichess.js at report-open time.
  const GAME_STORAGE_KEYS = [
    { select: 'Corner', stateKey: 'cornerGameStatesForReport', modeKey: 'cornerReportMode' },
    { select: 'LCTR', stateKey: 'lctrGameStatesForReport', modeKey: 'lctrReportMode' },
    { select: 'CRIM', stateKey: 'crimGameStatesForReport', modeKey: 'crimReportMode' },
    { select: 'Anticorners', stateKey: 'anticornersGameStatesForReport', modeKey: 'anticornersReportMode' },
    { select: 'ContinuousCorner', stateKey: 'continuousCornerGameStatesForReport', modeKey: 'continuousCornerReportMode' },
    { select: 'CRIT', stateKey: 'critGameStatesForReport', modeKey: 'critReportMode' },
    { select: 'CRIS', stateKey: 'crisGameStatesForReport', modeKey: 'crisReportMode' },
    { select: 'RIT', stateKey: 'ritGameStatesForReport', modeKey: 'ritReportMode' },
    { select: 'SatoWelter', stateKey: 'satoWelterGameStatesForReport', modeKey: 'satoWelterReportMode' },
    { select: 'SICC', stateKey: 'siccGameStatesForReport', modeKey: 'siccReportMode' },
    { select: 'iChessRook', stateKey: 'rookGameStatesForReport', modeKey: 'rookReportMode', playersKey: 'rookReportPlayers' },
    { select: 'iChessBishop', stateKey: 'bishopGameStatesForReport', modeKey: 'bishopReportMode', playersKey: 'bishopReportPlayers' },
    { select: 'iChessQueen', stateKey: 'queenGameStatesForReport', modeKey: 'queenReportMode', playersKey: 'queenReportPlayers' },
    { select: 'iChessKing', stateKey: 'kingGameStatesForReport', modeKey: 'kingReportMode', playersKey: 'kingReportPlayers' },
    { select: 'iChessKnight', stateKey: 'knightGameStatesForReport', modeKey: 'knightReportMode', playersKey: 'knightReportPlayers' },
    { select: 'iChessPawn', stateKey: 'pawnGameStatesForReport', modeKey: 'pawnReportMode', playersKey: 'pawnReportPlayers' },
    { select: 'iChessGeneral', stateKey: 'generalGameStatesForReport', modeKey: 'generalReportMode', playersKey: 'generalReportPlayers' },
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
    for (const { select, stateKey, modeKey, playersKey } of GAME_STORAGE_KEYS) {
      const states = localStorage.getItem(stateKey);
      if (!states) continue;
      gameSelect.value = select;
      inputArea.value = states;
      localStorage.removeItem(stateKey);
      const mode = localStorage.getItem(modeKey);
      if (mode === 'misere' || mode === 'normal') {
        modeSelect.value = mode;
        localStorage.removeItem(modeKey);
      }
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

  // Runs the selected game's own analysis engine (unchanged) over just the
  // move states, into a detached container, and pulls out each state's
  // P-Position/N-Position badge in the same order the lines were given.
  function computeStatuses(game, movesText, mode) {
    const scratch = document.createElement('div');
    try {
      if (game === 'Corner') window.CornerReport.render(scratch, movesText, mode);
      else if (game === 'LCTR') window.LctrReport.render(scratch, movesText, mode);
      else if (game === 'CRIM') window.CrimReport.render(scratch, movesText, mode);
      else if (game === 'Anticorners') window.AnticornersReport.render(scratch, movesText, mode);
      else if (game === 'ContinuousCorner') window.ContinuousCornerReport.render(scratch, movesText, mode);
      else if (game === 'CRIT') window.CritReport.render(scratch, movesText, mode);
      else if (game === 'CRIS') window.CrisReport.render(scratch, movesText, mode);
      else if (game === 'RIT') window.RitReport.render(scratch, movesText, mode);
      else if (game === 'SatoWelter') window.SatoWelterReport.render(scratch, movesText, mode);
      else if (game === 'SICC') window.SiccReport.render(scratch, movesText, mode);
      else if (ICHESS_PIECE_BY_SELECT[game]) window.IChessReport.render(scratch, movesText, mode, ICHESS_PIECE_BY_SELECT[game]);
    } catch (error) {
      console.error("Analysis engine failed:", error);
    }
    return Array.from(scratch.querySelectorAll('.report-card')).map(card => {
      const statusEl = card.querySelector('.p-n-status');
      return statusEl ? statusEl.textContent.trim() : null;
    });
  }

  function statusBadge(status) {
    if (!status) return '';
    const cls = status === 'N-Position' ? 'n-position' : 'p-position';
    return '<span class="p-n-status ' + cls + '">' + status + '</span>';
  }

  function renderMoveTable(container, inputText, game, mode) {
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
    const statuses = computeStatuses(game, moves.join('\n'), mode);
    const cell = (line, idx) => {
      if (!line) return '<div class="move-table-cell empty"></div>';
      return '<div class="move-table-cell">' +
        '<span class="move-table-pos">' + formatStateLine(line) + '</span>' +
        statusBadge(statuses[idx]) +
        '</div>';
    };

    const totalRounds = Math.ceil(moves.length / 2);
    let html = '<div class="move-table"><div class="move-table-head"><span>' + names[0] + '</span><span>' + names[1] + '</span></div>';
    for (let round = 1; round <= totalRounds; round++) {
      const i1 = 2 * round - 2, i2 = 2 * round - 1;
      html += '<div class="move-table-row">' + cell(moves[i1], i1) + cell(moves[i2], i2) + '</div>';
    }
    html += '</div>';
    container.innerHTML = html;
  }

  function render() {
    const game = gameSelect.value;
    const mode = modeSelect.value;
    try {
      renderMoveTable(reportContainer, inputArea.value, game, mode);
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
