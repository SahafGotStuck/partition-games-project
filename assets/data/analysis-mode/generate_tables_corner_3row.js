// generate_tables_corner_3row.js

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
const MAX_R1 = 20; // The largest value for the first row
const MAX_R2 = 20; // The largest value for the second row
const MAX_R3 = 20; // The largest value for the third row
const OUTPUT_FILE = "3_row_analysis.csv";

// 3. --- CORE LOGIC: The main function to generate the data ---
async function generateAnalysisTable() {
  console.log("🚀 Starting 3-row analysis table generation...");
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

  // Iterate through all 3-row partitions (r1 >= r2 >= r3)
  for (let r1 = 1; r1 <= MAX_R1; r1++) {
    for (let r2 = 1; r2 <= Math.min(r1, MAX_R2); r2++) {
      for (let r3 = 1; r3 <= Math.min(r2, MAX_R3); r3++) {
        const partition = [r1, r2, r3];
        const positionTuple = JSON.stringify(partition);
        const board = new Board(partition);

        console.log(`Analyzing partition: [${r1}, ${r2}, ${r3}]`);

        // Calculate all the metrics
        const g = grundy(positionTuple);
        const misereVal = misereGrundy(positionTuple);
        const uptimality = getUptimality(positionTuple);
        const depth = getGameDepth(positionTuple);
        const winningMoveCount = countWinningMoves(positionTuple);
        const winningMoves = calculateOptimalMoves(board);

        // Format the row for the CSV
        const rowData = [
          `"${partition.join(" ")}"`, // e.g., "5 4 3"
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
  }

  // 4. --- OUTPUT: Write the results to a file ---
  fs.writeFileSync(OUTPUT_FILE, results.join("\n"));

  const duration = (Date.now() - startTime) / 1000;
  console.log(`\n✅ Success! Analysis table saved to ${OUTPUT_FILE}`);
  console.log(
    `Generated data for partitions up to [${MAX_R1}, ${MAX_R2}, ${MAX_R3}] in ${duration.toFixed(
      2
    )} seconds.`
  );
}

// Run the generator
generateAnalysisTable();
