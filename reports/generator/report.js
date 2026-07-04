// Final, verified version of report.js

document.addEventListener('DOMContentLoaded', () => {
  const gameSelect = document.getElementById('game-select');
  const generateBtn = document.getElementById('generate-report-btn');
  const inputArea = document.getElementById('game-states-input');
  const reportContainer = document.getElementById('report-container');
  
  const chartWrapper = document.getElementById('chart-wrapper');
  const chartCanvas = document.getElementById('g-number-chart');
  let gNumberChart = null;

  function loadFromStorage() {
    const cornerKey = 'cornerGameStatesForReport';
    const lctrKey = 'lctrGameStatesForReport';
    const crimKey = 'crimGameStatesForReport';
    const cornerModeKey = 'cornerReportMode';
    const lctrModeKey = 'lctrReportMode';
    const crimModeKey = 'crimReportMode';
    const corner = localStorage.getItem(cornerKey);
    const lctr = localStorage.getItem(lctrKey);
    const crim = localStorage.getItem(crimKey);
    if (corner) {
      gameSelect.value = 'Corner';
      inputArea.value = corner;
      localStorage.removeItem(cornerKey);
      const mode = localStorage.getItem(cornerModeKey);
      if (mode === 'misere' || mode === 'normal') {
        document.getElementById('game-mode-select').value = mode;
        localStorage.removeItem(cornerModeKey);
      }
    } else if (lctr) {
      gameSelect.value = 'LCTR';
      inputArea.value = lctr;
      localStorage.removeItem(lctrKey);
      const mode = localStorage.getItem(lctrModeKey);
      if (mode === 'misere' || mode === 'normal') {
        document.getElementById('game-mode-select').value = mode;
        localStorage.removeItem(lctrModeKey);
      }
    } else if (crim) {
      gameSelect.value = 'CRIM';
      inputArea.value = crim;
      localStorage.removeItem(crimKey);
      const mode = localStorage.getItem(crimModeKey);
      if (mode === 'misere' || mode === 'normal') {
        document.getElementById('game-mode-select').value = mode;
        localStorage.removeItem(crimModeKey);
      }
    }
  }

  function generateGraphFromDOM() {
    const mode = document.getElementById('game-mode-select').value;
    
    if (gNumberChart) { gNumberChart.destroy(); }

    if (mode !== 'normal') {
      chartWrapper.style.display = 'none';
      return;
    }

    const labels = [];
    const gNumbers = [];

    const cards = reportContainer.querySelectorAll('.report-card');
    
    cards.forEach((card) => {
      const titleEl = card.querySelector('.report-header h3');
      const gLabelEl = Array.from(card.querySelectorAll('.label'))
        .find(el => /grundy/i.test(el.textContent) && !/misere/i.test(el.textContent));

      if (titleEl && gLabelEl && gLabelEl.nextElementSibling) {
        const label = titleEl.textContent.trim();
        const gNumber = Number(gLabelEl.nextElementSibling.textContent);
        if (!Number.isNaN(gNumber)) {
          labels.push(label);
          gNumbers.push(gNumber);
        }
      }
    });

    if (gNumbers.length > 0) {
      chartWrapper.style.display = 'block';
      const white = '#ffffff';
      const gridWhite = 'rgba(255,255,255,0.2)';
      gNumberChart = new Chart(chartCanvas, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'g-number per Game State',
            data: gNumbers,
            borderColor: white,
            backgroundColor: white,
            pointBackgroundColor: white,
            pointBorderColor: white,
            tension: 0.1
          }]
        },
        options: {
          responsive: true,
          plugins: {
            title: { display: true, text: 'G-Number Progression', color: white, font: { size: 16 } },
            legend: { labels: { color: white } }
          },
          scales: {
            y: { beginAtZero: true, ticks: { color: white, stepSize: 1 }, grid: { color: gridWhite } },
            x: { ticks: { color: white }, grid: { color: gridWhite } }
          }
        }
      });
    } else {
      chartWrapper.style.display = 'none';
    }
  }

  function render() {
    const game = gameSelect.value;
    const mode = document.getElementById('game-mode-select').value;
    
    try {
      if (game === 'Corner') {
        window.CornerReport.render(reportContainer, inputArea.value, mode);
      } else if (game === 'LCTR') {
        window.LctrReport.render(reportContainer, inputArea.value, mode);
      } else if (game === 'CRIM') {
        window.CrimReport.render(reportContainer, inputArea.value, mode);
      }
    } catch (error) {
      console.error("An error occurred in a game-specific render function:", error);
    }
    
    generateGraphFromDOM();
  }

  generateBtn.addEventListener('click', render);
  loadFromStorage();
  if (inputArea.value.trim().length > 0) {
    render();
  }
});