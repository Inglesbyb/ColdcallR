import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing required environment variables.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  console.log('Fetching total count...');
  const { count, error } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Error fetching count:', error);
    process.exit(1);
  }

  console.log(`Current Total Row Count: ${count}`);

  const { count: coordsCount, error: coordsError } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .not('lat', 'is', null)
    .not('lng', 'is', null);

  if (coordsError) {
    console.error('Error fetching coords count:', coordsError);
    process.exit(1);
  }

  console.log(`Current Total Row Count with valid lat/lng: ${coordsCount}`);

  console.log('Fetching distinct postcode prefixes (this may take a moment)...');
  // Since we don't have a direct SQL query, we can pull the outward postcodes 
  // by parsing the postcode field. We can fetch all postcodes to do it locally.
  const { data: postcodesData, error: pcError } = await supabase
    .from('leads')
    .select('postcode');

  if (pcError) {
    console.error('Error fetching postcodes:', pcError);
    process.exit(1);
  }

  const prefixCounts: Record<string, number> = {};
  for (const row of postcodesData || []) {
    const pc = row.postcode || '';
    const prefix = pc.split(' ')[0];
    if (prefix) {
      prefixCounts[prefix] = (prefixCounts[prefix] || 0) + 1;
    }
  }

  console.log('\nDistinct Count by Postcode Prefix:');
  const sortedPrefixes = Object.entries(prefixCounts).sort((a, b) => b[1] - a[1]);
  for (const [prefix, pCount] of sortedPrefixes) {
    console.log(`${prefix}: ${pCount}`);
  }
}

run();
