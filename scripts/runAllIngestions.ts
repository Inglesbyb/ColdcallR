import { execSync } from 'child_process';

console.log('--- Starting Full Liverpool Territory Ingestion ---');
execSync('npx tsx scripts/ingestFullLiverpool.ts', { stdio: 'inherit' });

console.log('\n--- Starting Surrounding Merseyside Territory Ingestion ---');
execSync('npx tsx scripts/ingestSurroundingMerseyside.ts', { stdio: 'inherit' });

console.log('\n=== ALL INGESTION SCRIPTS COMPLETED ===');
