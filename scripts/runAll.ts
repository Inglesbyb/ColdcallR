import { execSync } from 'child_process';

console.log("=== Phase 1: Ingestion ===");
try {
  execSync('npx tsx scripts/ingestFullLiverpool.ts', { stdio: 'inherit' });
} catch (e) {
  console.error("Ingestion failed:", e);
  process.exit(1);
}

console.log("\n=== Phase 2: Crime Enrichment ===");
try {
  execSync('npx tsx scripts/enrichCrimeData.ts', { stdio: 'inherit' });
} catch (e) {
  console.error("Crime enrichment failed:", e);
  process.exit(1);
}

console.log("\n=== All Background Tasks Complete ===");
