// generate_tables_corner.js

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
const MAX_R1 = 100; // The largest value for the first row
const MAX_R2 = 100; // The largest value for the second row
const OUTPUT_FILE = "2_row_analysis_100.csv";

// 3. --- CORE LOGIC: The main function to generate the data ---
async function generateAnalysisTable() {
  console.log("🚀 Starting analysis table generation...");
  const results = [];
  const startTime = Date.now();

  // Define the headers for our CSV file
  const headers = [
    "Partition",
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

  // Iterate through partitions, sorted by the second row (r2)
  for (let r2 = 1; r2 <= MAX_R2; r2++) {
    // Outer loop now iterates on r2
    for (let r1 = r2; r1 <= MAX_R1; r1++) {
      // Inner loop iterates on r1, starting from r2
      const partition = [r1, r2];
      const positionTuple = JSON.stringify(partition);
      const board = new Board(partition);

      console.log(`Analyzing partition: [${r1}, ${r2}]`);

      // Calculate all the metrics
      const g = grundy(positionTuple);
      const misereVal = misereGrundy(positionTuple);
      const uptimality = getUptimality(positionTuple);
      const depth = getGameDepth(positionTuple);
      const winningMoveCount = countWinningMoves(positionTuple);
      const winningMoves = calculateOptimalMoves(board);

      // Format the row for the CSV
      const rowData = [
        `"${partition.join(" ")}"`, // e.g., "5 4"
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
    `Generated data for partitions up to [${MAX_R1}, ${MAX_R2}] in ${duration.toFixed(
      2
    )} seconds.`
  );
}

// Run the generator
generateAnalysisTable();
