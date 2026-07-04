// generate_tables_corner_rectangles.js

// 1. --- SETUP: Import necessary modules and your game logic ---
const fs = require("fs");

// IMPORTANT: You'll need to export these functions from your game files.
// For example, in your main file, you might have `module.exports = { Board, grundy, ... }`
const {
  Board,
  grundy, // Assuming grundy is available
  misereGrundy, // Assuming misereGrundy is available
  allCornerMoves, // Assuming allCornerMoves is available
} = require("./game.js"); // Adjust the path to your main game logic file

const {
  getUptimality,
  getGameDepth,
  calculateOptimalMoves,
  countWinningMoves,
} = require("./corner_analysis.js"); // Adjust the path to your analysis file

// 2. --- CONFIGURATION: Define the limits for the table ---
const MAX_ROWS = 10; // The maximum number of rows
const MAX_COLS = 10; // The maximum number of columns
const OUTPUT_FILE = "rectangles_analysis.csv";

// 3. --- CORE LOGIC: The main function to generate the data ---
async function generateAnalysisTable() {
  console.log("🚀 Starting rectangular partitions analysis table generation...");
  const results = [];
  const startTime = Date.now();

  // Define the headers for our CSV file
  const headers = [
    "Partition",
    "Rows",
    "Columns",
    "Grundy (g)",
    "P/N-Position (Normal)",
    "Misere Value",
    "P/N-Position (Misere)",
    "Uptimality",
    "Game Depth",
    "Winning Move Count",
    "Winning Moves (Normal)",
  ];
  results.push(headers.join(","));

  // Iterate through all rectangular partitions (all rows have same length)
  for (let rows = 1; rows <= MAX_ROWS; rows++) {
    for (let cols = 1; cols <= MAX_COLS; cols++) {
      // Create rectangular partition: [cols, cols, cols, ...] with 'rows' elements
      const partition = new Array(rows).fill(cols);
      const positionTuple = JSON.stringify(partition);
      const board = new Board(partition);

      console.log(`Analyzing rectangular partition: [${rows}×${cols}] = [${partition.join(", ")}]`);

      // Calculate all the metrics
      const g = grundy(positionTuple);
      const misereVal = misereGrundy(positionTuple);
      const uptimality = getUptimality(positionTuple);
      const depth = getGameDepth(positionTuple);
      const winningMoveCount = countWinningMoves(positionTuple);
      const winningMoves = calculateOptimalMoves(board);

      // Format the row for the CSV
      const rowData = [
        `"${partition.join(" ")}"`, // e.g., "5 5 5"
        rows, // Number of rows
        cols, // Number of columns
        g,
        g > 0 ? "N" : "P",
        misereVal === 1 ? "Winning" : "Losing",
        misereVal === 1 ? "N" : "P",
        uptimality,
        depth,
        winningMoveCount,
        `"${winningMoves}"`,
      ];
      results.push(rowData.join(","));
    }
  }

  // 4. --- OUTPUT: Write the results to a file ---
  fs.writeFileSync(OUTPUT_FILE, results.join("\n"));

  const duration = (Date.now() - startTime) / 1000;
  console.log(`\n✅ Success! Analysis table saved to ${OUTPUT_FILE}`);
  console.log(
    `Generated data for rectangular partitions up to [${MAX_ROWS}×${MAX_COLS}] in ${duration.toFixed(
      2
    )} seconds.`
  );
}

// Run the generator
generateAnalysisTable();
