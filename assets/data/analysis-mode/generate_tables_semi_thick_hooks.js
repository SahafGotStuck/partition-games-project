// generate_tables_semi_thick_hooks.js
// Generates analysis for semi-thick hook partitions
// Definition: [c, λ2, 1^(r-2)] where λ2 ≥ 2 and r ≥ 3

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

// 2. --- CONFIGURATION: Define the limits for semi-thick hooks ---
const MAX_C = 20;        // Maximum value for the first row
const MAX_LAMBDA2 = 20;  // Maximum value for the second row (λ2)
const MAX_R = 15;        // Maximum number of rows
const MIN_LAMBDA2 = 2;   // λ2 ≥ 2 (from definition)
const MIN_R = 3;         // r ≥ 3 (from definition)
const OUTPUT_FILE = "semi_thick_hooks_analysis.csv";

// 3. --- CORE LOGIC: Generate semi-thick hook partitions ---
function generateSemiThickHook(c, lambda2, r) {
  // Create partition of form [c, λ2, 1, 1, 1, ..., 1]
  // where there are (r-2) ones at the end
  const partition = [c, lambda2];
  const numOnes = r - 2;
  for (let i = 0; i < numOnes; i++) {
    partition.push(1);
  }
  return partition;
}

async function generateAnalysisTable() {
  console.log("🚀 Starting semi-thick hooks analysis table generation...");
  console.log(`Definition: [c, λ2, 1^(r-2)] where λ2 ≥ 2 and r ≥ 3`);
  console.log(`Ranges: c ∈ [2,${MAX_C}], λ2 ∈ [${MIN_LAMBDA2},${MAX_LAMBDA2}], r ∈ [${MIN_R},${MAX_R}]`);
  console.log();
  
  const results = [];
  const startTime = Date.now();

  // Define the headers for our CSV file
  const headers = [
    "Partition",
    "c",
    "λ2",
    "r",
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
  
  // Iterate through all valid semi-thick hook parameters
  for (let r = MIN_R; r <= MAX_R; r++) {
    for (let lambda2 = MIN_LAMBDA2; lambda2 <= MAX_LAMBDA2; lambda2++) {
      for (let c = lambda2; c <= MAX_C; c++) {
        // Generate the partition [c, λ2, 1^(r-2)]
        const partition = generateSemiThickHook(c, lambda2, r);
        const positionTuple = JSON.stringify(partition);
        const board = new Board(partition);

        count++;
        if (count % 200 === 0) {
          console.log(`Analyzed ${count} semi-thick hooks... Current: [${partition.join(", ")}]`);
        }

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
          c,
          lambda2,
          r,
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
    `Generated data for ${count} semi-thick hooks with parameters: c ≤ ${MAX_C}, λ2 ≤ ${MAX_LAMBDA2}, r ≤ ${MAX_R} in ${duration.toFixed(
      2
    )} seconds.`
  );
  console.log(`\nSample partitions analyzed:`);
  console.log(`  Smallest: [${MIN_LAMBDA2}, ${MIN_LAMBDA2}, ${'1 '.repeat(MIN_R - 2).trim()}]`);
  console.log(`  Example: [10, 5, 1, 1, 1, 1, 1] (r=7)`);
  console.log(`  Largest: [${MAX_C}, ${MAX_LAMBDA2}, ${'1 '.repeat(MAX_R - 2).trim()}]`);
}

// Run the generator
generateAnalysisTable();

