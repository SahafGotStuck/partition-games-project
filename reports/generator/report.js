// report.js — renders a played game's move history as a two-column table,
// one column per player, with each move's full Grundy analysis (P/N-position,
// Grundy value, uptimality, max game depth, reachable moves) attached. Moves
// strictly alternate, so column position alone identifies who moved (no
// separate "Move #"/"Player" columns are needed).
//
// The actual analysis is delegated to each game's existing *_report.js module
// (e.g. window.CornerReport) exactly as before — this file just runs it into
// a detached scratch container and pulls the resulting stat rows back out, so
// the well-tested per-game engines stay the single source of truth.

document.addEventListener('DOMContentLoaded', () => {
  const gameSelect = document.getElementById('game-select');
  const modeSelect = document.getElementById('game-mode-select');
  const generateBtn = document.getElementById('generate-report-btn');
  const inputArea = document.getElementById('game-states-input');
  const reportContainer = document.getElementById('report-container');

  const chartWrapper = document.getElementById('chart-wrapper');
  const chartCanvas = document.getElementById('g-number-chart');
  let gNumberChart = null;

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

  // Only these four stats are shown per move (in this order); anything else
  // a game's card produces (Reversible Moves, Optimal Moves, ...) is skipped.
  const WANTED_STATS = [
    { key: 'grundy', match: /grundy value|misere value/i },
    { key: 'uptimality', match: /^uptimality$/i },
    { key: 'depth', match: /max game depth/i },
    { key: 'reachable', match: /reachable moves/i },
  ];

  // Runs the selected game's own analysis engine (unchanged) over every line
  // — including the starting position, so the Grundy graph below matches what
  // it always plotted — into a detached container, and pulls each state's
  // P-Position/N-Position badge plus its label:value stat rows back out, in
  // the same order the lines were given.
  function computeAnalyses(game, linesText, mode) {
    const scratch = document.createElement('div');
    try {
      if (game === 'Corner') window.CornerReport.render(scratch, linesText, mode);
      else if (game === 'LCTR') window.LctrReport.render(scratch, linesText, mode);
      else if (game === 'CRIM') window.CrimReport.render(scratch, linesText, mode);
      else if (game === 'Anticorners') window.AnticornersReport.render(scratch, linesText, mode);
      else if (game === 'ContinuousCorner') window.ContinuousCornerReport.render(scratch, linesText, mode);
      else if (game === 'CRIT') window.CritReport.render(scratch, linesText, mode);
      else if (game === 'CRIS') window.CrisReport.render(scratch, linesText, mode);
      else if (game === 'RIT') window.RitReport.render(scratch, linesText, mode);
      else if (game === 'SatoWelter') window.SatoWelterReport.render(scratch, linesText, mode);
      else if (game === 'SICC') window.SiccReport.render(scratch, linesText, mode);
      else if (ICHESS_PIECE_BY_SELECT[game]) window.IChessReport.render(scratch, linesText, mode, ICHESS_PIECE_BY_SELECT[game]);
    } catch (error) {
      console.error("Analysis engine failed:", error);
    }
    return Array.from(scratch.querySelectorAll('.report-card')).map(card => {
      const statusEl = card.querySelector('.p-n-status');
      const rows = Array.from(card.querySelectorAll('p')).map(p => {
        const labelEl = p.querySelector('.label'), valueEl = p.querySelector('.value');
        return labelEl && valueEl ? { label: labelEl.textContent.replace(/:\s*$/, '').trim(), value: valueEl.textContent.trim() } : null;
      }).filter(Boolean);
      const stats = WANTED_STATS.map(w => {
        const found = rows.find(r => w.match.test(r.label));
        return found ? { label: found.label, value: found.value } : null;
      }).filter(Boolean);
      return { status: statusEl ? statusEl.textContent.trim() : null, rows, stats };
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
      chartWrapper.style.display = 'none';
      return;
    }
    const totalMoves = lines.length - 1;   // line 0 is the starting position, not a move
    if (totalMoves === 0) {
      container.innerHTML = '<p>Only a starting position was entered — no moves to show yet.</p>';
      chartWrapper.style.display = 'none';
      return;
    }

    const names = storedPlayerNames || defaultPlayerNames(game);
    const analyses = computeAnalyses(game, lines.join('\n'), mode);   // one entry per line, incl. the starting position

    const cell = (lineIdx) => {
      if (lineIdx > totalMoves) return '<div class="move-table-cell empty"></div>';
      const a = analyses[lineIdx] || { status: null, stats: [] };
      const statsHTML = a.stats.map(s =>
        '<div class="move-table-stat"><span class="move-table-stat-label">' + s.label + ':</span> <span class="move-table-stat-value">' + s.value + '</span></div>'
      ).join('');
      return '<div class="move-table-cell">' +
        '<div class="move-table-cell-top"><span class="move-table-pos">' + formatStateLine(lines[lineIdx]) + '</span>' + statusBadge(a.status) + '</div>' +
        (statsHTML ? '<div class="move-table-stats">' + statsHTML + '</div>' : '') +
        '</div>';
    };

    const totalRounds = Math.ceil(totalMoves / 2);
    let html = '<div class="move-table"><div class="move-table-head"><span>' + names[0] + '</span><span>' + names[1] + '</span></div>';
    for (let round = 1; round <= totalRounds; round++) {
      html += '<div class="move-table-row">' + cell(2 * round - 1) + cell(2 * round) + '</div>';
    }
    html += '</div>';
    container.innerHTML = html;

    renderChart(lines, analyses, mode);
  }

  // G-number progression graph — one point per game state (including the
  // starting position), plotted in play order. Only meaningful in normal
  // play (misère flips what "g=0" means game-to-game), so it's hidden there,
  // exactly as it always was.
  function renderChart(lines, analyses, mode) {
    if (gNumberChart) { gNumberChart.destroy(); gNumberChart = null; }
    if (mode !== 'normal') { chartWrapper.style.display = 'none'; return; }

    const labels = [], gNumbers = [];
    analyses.forEach((a, idx) => {
      const gRow = a.rows.find(r => /grundy value/i.test(r.label));
      if (!gRow) return;
      const num = Number(gRow.value);
      if (Number.isNaN(num)) return;
      labels.push(formatStateLine(lines[idx]));
      gNumbers.push(num);
    });

    if (gNumbers.length === 0) { chartWrapper.style.display = 'none'; return; }
    chartWrapper.style.display = 'block';
    const white = '#ffffff', gridWhite = 'rgba(255,255,255,0.2)';
    gNumberChart = new Chart(chartCanvas, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'g-number per Game State',
          data: gNumbers,
          borderColor: white, backgroundColor: white,
          pointBackgroundColor: white, pointBorderColor: white,
          tension: 0.1,
        }],
      },
      options: {
        responsive: true,
        plugins: {
          title: { display: true, text: 'G-Number Progression', color: white, font: { size: 16 } },
          legend: { labels: { color: white } },
        },
        scales: {
          y: { beginAtZero: true, ticks: { color: white, stepSize: 1 }, grid: { color: gridWhite } },
          x: { ticks: { color: white }, grid: { color: gridWhite } },
        },
      },
    });
  }

  function render() {
    const game = gameSelect.value;
    const mode = modeSelect.value;
    try {
      renderMoveTable(reportContainer, inputArea.value, game, mode);
    } catch (error) {
      console.error("Could not render the move table:", error);
      reportContainer.innerHTML = '<p>Could not render the move table — check the state format.</p>';
      chartWrapper.style.display = 'none';
    }
  }

  generateBtn.addEventListener('click', render);
  loadFromStorage();
  if (inputArea.value.trim().length > 0) {
    render();
  }
});
