// generate_tables_thick_hooks.js
// Generates analysis for thick hook partitions
// Definition: [c, λ2, 2^k, 1^j] where λ2 ≥ 2, k ≥ 1, and j ≥ 0

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

// 2. --- CONFIGURATION: Define the limits for thick hooks ---
const MAX_C = 20;        // Maximum value for the first row
const MAX_LAMBDA2 = 20;  // Maximum value for the second row (λ2)
const MAX_K = 10;        // Maximum number of rows with value 2
const MAX_J = 10;        // Maximum number of rows with value 1
const MIN_LAMBDA2 = 2;   // λ2 ≥ 2 (from definition)
const MIN_K = 1;         // k ≥ 1 (from definition)
const MIN_J = 0;         // j ≥ 0 (from definition)
const OUTPUT_FILE = "thick_hooks_analysis.csv";

// 3. --- CORE LOGIC: Generate thick hook partitions ---
function generateThickHook(c, lambda2, k, j) {
  // Create partition of form [c, λ2, 2, 2, ..., 2 (k times), 1, 1, ..., 1 (j times)]
  const partition = [c, lambda2];
  
  // Add k rows of 2s
  for (let i = 0; i < k; i++) {
    partition.push(2);
  }
  
  // Add j rows of 1s
  for (let i = 0; i < j; i++) {
    partition.push(1);
  }
  
  return partition;
}

async function generateAnalysisTable() {
  console.log("🚀 Starting thick hooks analysis table generation...");
  console.log(`Definition: [c, λ2, 2^k, 1^j] where λ2 ≥ 2, k ≥ 1, and j ≥ 0`);
  console.log(`Ranges: c ∈ [2,${MAX_C}], λ2 ∈ [${MIN_LAMBDA2},${MAX_LAMBDA2}], k ∈ [${MIN_K},${MAX_K}], j ∈ [${MIN_J},${MAX_J}]`);
  console.log();
  
  const results = [];
  const startTime = Date.now();

  // Define the headers for our CSV file
  const headers = [
    "Partition",
    "c",
    "λ2",
    "k",
    "j",
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
  
  // Iterate through all valid thick hook parameters
  for (let j = MIN_J; j <= MAX_J; j++) {
    for (let k = MIN_K; k <= MAX_K; k++) {
      for (let lambda2 = MIN_LAMBDA2; lambda2 <= MAX_LAMBDA2; lambda2++) {
        for (let c = lambda2; c <= MAX_C; c++) {
          // Generate the partition [c, λ2, 2^k, 1^j]
          const partition = generateThickHook(c, lambda2, k, j);
          const positionTuple = JSON.stringify(partition);
          const board = new Board(partition);

          count++;
          if (count % 500 === 0) {
            console.log(`Analyzed ${count} thick hooks... Current: [${partition.join(", ")}]`);
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
            k,
            j,
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
  }

  // 4. --- OUTPUT: Write the results to a file ---
  fs.writeFileSync(OUTPUT_FILE, results.join("\n"));

  const duration = (Date.now() - startTime) / 1000;
  console.log(`\n✅ Success! Analysis table saved to ${OUTPUT_FILE}`);
  console.log(
    `Generated data for ${count} thick hooks with parameters: c ≤ ${MAX_C}, λ2 ≤ ${MAX_LAMBDA2}, k ≤ ${MAX_K}, j ≤ ${MAX_J} in ${duration.toFixed(
      2
    )} seconds.`
  );
  console.log(`\nSample partitions analyzed:`);
  console.log(`  Smallest (j=0): [${MIN_LAMBDA2}, ${MIN_LAMBDA2}, 2]`);
  console.log(`  Example: [10, 5, 2, 2, 2, 1, 1] (k=3, j=2)`);
  console.log(`  Largest: [${MAX_C}, ${MAX_LAMBDA2}, ${'2 '.repeat(MAX_K).trim()}, ${'1 '.repeat(MAX_J).trim()}]`);
}

// Run the generator
generateAnalysisTable();

