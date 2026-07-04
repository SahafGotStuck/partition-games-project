# Partition Games 3D

A comprehensive web application featuring **12 combinatorial partition games**, built to support research in combinatorial game theory at **Rhodes College** — now with an interactive **3D, motion-driven** front end.

> **What's new — the 3D redesign**
> - **Interactive 3D hero** — the landing page renders a partition as a real-time WebGL "corner" of stacked cubes (Three.js) that reacts to your cursor.
> - **Dimensional game boards** — every game's tiles are now extruded 3D blocks that lift on hover and topple as they're removed (visual-only; the game engines are untouched).
> - **Motion everywhere** — scroll-progress bar, scroll-triggered reveals, hero parallax, 3D tilt-on-hover game cards, and a dark-first glass aesthetic with light-mode support.
> - **Filterable catalogue** — browse all 12 games or filter by impartial / partizan family.
>
> Key files: [`index.html`](index.html), [`assets/css/landing.css`](assets/css/landing.css), [`assets/js/landing.js`](assets/js/landing.js), and the shared board upgrade in [`assets/css/unified_game_styles.css`](assets/css/unified_game_styles.css).

Developed under the **Rhodes College Summer Fellowship '25** by [Soumitro](mailto:dwiso-28@rhodes.edu) and [Aayan](mailto:debaa-28@rhodes.edu), supervised by [Prof. Eric Gottlieb](https://www.rhodes.edu/bio/eric-gottlieb). LLM models (ChatGPT, Gemini, Claude) were used to craft and modify some parts of the project under the supervision of the developers.

If you find any bug or want to learn more, please reach out to us.

---

## Available Games

### Impartial Games

| Game | Description |
|------|-------------|
| **LCTR** (Left Column Top Row) | Remove the leftmost column or the top row. Classic impartial game with Sprague-Grundy AI. |
| **CRIM** (Column Row Immediate Merge) | Remove any row or column; divided parts merge after each move. |
| **CRIS** (Column Row Independent Splits) | Same moves as CRIM, but fragments remain independent. |
| **Sato-Welter** | Remove a hook shape (upside-down L) from any square, eliminating all squares to the right and below. |
| **RIT** (Row Inequality Theorem) | Remove cells from a row if it has equal or more cells than the row below. |
| **Corner** | Remove random subsets of corner pieces from uniform partitions. |
| **AntiCorner** | Sato-Welter style moves targeting anti-corner positions. |
| **Continuous Corner** | Select consecutive ranges of corner pieces. |
| **CRIT** (Column Row Inequality Theorem) | Enhanced RIT with both row and column comparison moves. |
| **SCC** (Strict Continuous Corner) | Must begin with topmost or bottommost corner; sequential subset selection. |

### Partizan Games

| Game | Description |
|------|-------------|
| **CRPM** (Column Row Partizan Merge) | Player A removes rows, Player B removes columns. Partizan version of CRIM. |
| **CRPS** (Column Row Partizan Splits) | Player A controls rows, Player B controls columns in fragment partitions. |

---

## Features

- **12 Unique Games** — Comprehensive collection of partition-based combinatorial games
- **Advanced AI** — Smart opponents using Sprague-Grundy theorem, minimax, and other game theory algorithms
- **Multiple Themes** — Customizable visual themes with retro 8-bit aesthetics
- **Dark/Light Modes** — Automatic system preference detection with manual toggle
- **Sound Effects** — Immersive audio feedback for game interactions
- **Multiplayer Support** — Real-time multiplayer with room codes (Corner & LCTR games)
- **Fully Responsive** — Optimized for desktop, tablet, and mobile
- **Comprehensive Documentation** — Detailed game rules and strategy guides
- **Educational Focus** — Designed to support combinatorial game theory research

---

## Project Structure

```
Partition-Games/
│
├── index.html                  # Main landing page
├── wiki.html                   # Game documentation hub
├── developers.html             # Developer / team information
├── config.js                   # App configuration
│
├── games/                      # Each game in its own folder
│   ├── corner/
│   │   ├── corner_page.html
│   │   ├── corner_script.js
│   │   └── corner_multiplayer_auth.js
│   ├── lctr/
│   │   ├── lctr_page.html
│   │   ├── lctr_script.js
│   │   └── lctr_multiplayer_auth.js
│   ├── crim/
│   ├── cris/
│   ├── crit/
│   ├── crpm/
│   ├── crps/
│   ├── rit/
│   ├── sato-welter/
│   ├── anticorners/
│   ├── continuous-corner/
│   └── scc/
│
├── assets/                     # Shared static resources
│   ├── css/                    # Global stylesheets
│   │   ├── style.css
│   │   └── unified_game_styles.css
│   ├── js/                     # Shared JavaScript
│   │   └── script.js
│   ├── images/                 # Logos and headshots
│   │   ├── headshots/
│   │   └── logo/
│   └── data/                   # Analysis mode data & scripts
│       └── analysis-mode/
│
├── multiplayer/                # Multiplayer landing page
│   ├── multiplayer_landing.html
│   ├── multiplayer_landing.css
│   └── multiplayer_landing.js
│
├── wiki/                       # Per-game documentation & figures
│   ├── corner/
│   ├── lctr/
│   ├── crim/
│   ├── cris/
│   ├── crit/
│   ├── crpm/
│   ├── crps/
│   ├── rit/
│   ├── anticorner/
│   ├── continuous_corner/
│   ├── Sato-Walter/
│   └── sicc/
│
├── reports/                    # Report generator
│   └── generator/
│
├── server/                     # Node.js backend (multiplayer)
│   ├── server.js
│   ├── schema.sql
│   ├── helpers/
│   ├── database-utils.js
│   ├── add-database-integration.js
│   └── tests/
│
├── docs/                       # Research papers & deployment guides
│   ├── papers/
│   ├── bib/
│   ├── DEPLOYMENT_GUIDE.md
│   ├── MULTIPLAYER_SETUP.md
│   └── PRODUCTION_DEPLOYMENT.md
│
└── .github/
    └── workflows/
        └── ci.yml
```

---

## Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- [Node.js](https://nodejs.org/) (for multiplayer server)

### Running Locally

**1. Clone the repository:**

```bash
git clone https://github.com/labibibnmuzahid/Partition-Games.git
cd Partition-Games
```

**2. For single-player games:**

Open `index.html` directly in your browser, or start a local server:

```bash
# Python 3
python -m http.server 8000

# Node.js
npx serve .
```

Then visit `http://localhost:8000`.

**3. For multiplayer functionality:**

```bash
cd server
npm install
npm start
```

---

## Multiplayer

Real-time competitive play powered by WebSocket connections.

- **Room-based matching** with shareable room codes
- **Cross-platform** — play on any device
- **Synchronized game state** with automatic reconnection
- **Spectator mode** for observing matches

**How to play:**
1. Navigate to the multiplayer landing page
2. Create a new room or join with a room code
3. Share the code with your opponent
4. Play once both players have joined

Currently available for **Corner** and **LCTR** games.

---

## Technologies

| Layer | Stack |
|-------|-------|
| **Frontend** | HTML5, CSS3 (Grid, Flexbox, Variables), Vanilla JavaScript (ES6+), MathJax |
| **Backend** | Node.js, Express.js, Socket.io, PostgreSQL |
| **Testing** | Jest (unit), Cypress (E2E) |
| **CI/CD** | GitHub Actions |

---

## Deployment

**Static hosting** (single-player): GitHub Pages, Netlify, Vercel

**Full-stack** (multiplayer): Render, Railway, Heroku

See [`docs/DEPLOYMENT_GUIDE.md`](docs/DEPLOYMENT_GUIDE.md) for detailed instructions.

---

## Documentation

- [Wiki](wiki.html) — Game rules and strategies
- [Developer Guide](developers.html) — Team info and project details
- [Research Papers](docs/papers/) — Academic publications
- [Multiplayer Setup](docs/MULTIPLAYER_SETUP.md) — Server configuration
- [Multiplayer Tutorial](docs/MULTIPLAYER_TUTORIAL.md) — How to play online

---

## Contributing

This project is part of an academic research initiative. We welcome:

- Bug reports and issue submissions
- Suggestions for game improvements
- Academic collaboration on combinatorial game theory
- Educational use and adaptation

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- **Professor Eric Gottlieb** — Research supervision and combinatorial game theory expertise
- **Rhodes College** — Summer Fellowship Program support
- **Open Source Community** — Libraries and tools that made this project possible
