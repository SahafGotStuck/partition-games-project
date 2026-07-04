// generate_tables_staircases.js
// Generates analysis for staircase partitions
// Definition: [n, n-1, n-2, ..., 2, 1] where each row decreases by 1

// 1. --- SETUP: Import necessary modules and your game logic ---
const fs = require("fs");

const {
  Board,
  grundy,
  misereGrundy,
  allCornerMoves,
} = require("./game.js");

const {
  getUptimality,
  getGameDepth,
  calculateOptimalMoves,
  countWinningMoves,
} = require("./corner_analysis.js");

// 2. --- CONFIGURATION: Define the limits for staircases ---
const MAX_N = 10;        // Maximum value for the first row (n)
const MIN_N = 1;         // Minimum value (at least [1])
const OUTPUT_FILE = "staircases_analysis.csv";

// 3. --- CORE LOGIC: Generate staircase partitions ---
function generateStaircase(n) {
  // Create partition of form [n, n-1, n-2, ..., 2, 1]
  const partition = [];
  for (let i = n; i >= 1; i--) {
    partition.push(i);
  }
  return partition;
}

async function generateAnalysisTable() {
  console.log("🚀 Starting staircase partitions analysis table generation...");
  console.log(`Definition: [n, n-1, n-2, ..., 2, 1]`);
  console.log(`Range: n ∈ [${MIN_N}, ${MAX_N}]`);
  console.log();
  
  const results = [];
  const startTime = Date.now();

  // Define the headers for our CSV file
  const headers = [
    "Partition",
    "n",
    "Number of Rows",
    "Total Cells",
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

  let count = 0;
  
  // Iterate through all staircase sizes
  for (let n = MIN_N; n <= MAX_N; n++) {
    // Generate the staircase partition [n, n-1, ..., 2, 1]
    const partition = generateStaircase(n);
    const positionTuple = JSON.stringify(partition);
    const board = new Board(partition);
    
    // Calculate total number of cells (triangular number)
    const totalCells = (n * (n + 1)) / 2;

    count++;
    console.log(`Analyzing staircase ${count}/${MAX_N}: [${partition.join(", ")}] (${totalCells} cells)`);

    // Calculate all the metrics
    const g = grundy(positionTuple);
    const misereVal = misereGrundy(positionTuple);
    const uptimality = getUptimality(positionTuple);
    const depth = getGameDepth(positionTuple);
    const winningMoveCount = countWinningMoves(positionTuple);
    const winningMoves = calculateOptimalMoves(board);

    // Format the row for the CSV
    const rowData = [
      `"${partition.join(" ")}"`,
      n,
      n,  // Number of rows equals n
      totalCells,
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

  // 4. --- OUTPUT: Write the results to a file ---
  fs.writeFileSync(OUTPUT_FILE, results.join("\n"));

  const duration = (Date.now() - startTime) / 1000;
  console.log(`\n✅ Success! Analysis table saved to ${OUTPUT_FILE}`);
  console.log(
    `Generated data for ${count} staircase partitions with n ≤ ${MAX_N} in ${duration.toFixed(
      2
    )} seconds.`
  );
  console.log(`\nPartitions analyzed:`);
  console.log(`  Smallest: [1]`);
  console.log(`  Example: [5, 4, 3, 2, 1] (15 cells)`);
  console.log(`  Largest: [${MAX_N}, ${MAX_N-1}, ..., 2, 1] (${(MAX_N * (MAX_N + 1)) / 2} cells)`);
}

// Run the generator
generateAnalysisTable();
