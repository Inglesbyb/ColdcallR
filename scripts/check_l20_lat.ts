import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing credentials");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const { count: c1 } = await supabase.from('leads').select('*', { count: 'exact', head: true }).ilike('postcode', 'L20 %');
  const { count: c1_lat } = await supabase.from('leads').select('*', { count: 'exact', head: true }).ilike('postcode', 'L20 %').not('lat', 'is', null);
  const { count: c1_nolat } = await supabase.from('leads').select('*', { count: 'exact', head: true }).ilike('postcode', 'L20 %').is('lat', null);

  console.log(`L20 total: ${c1}`);
  console.log(`L20 with lat/lng: ${c1_lat}`);
  console.log(`L20 without lat/lng: ${c1_nolat}`);
  
  const { count: total } = await supabase.from('leads').select('*', { count: 'exact', head: true });
  const { count: total_lat } = await supabase.from('leads').select('*', { count: 'exact', head: true }).not('lat', 'is', null);
  const { count: total_nolat } = await supabase.from('leads').select('*', { count: 'exact', head: true }).is('lat', null);

  console.log(`Total businesses: ${total}`);
  console.log(`Total businesses with lat/lng: ${total_lat}`);
  console.log(`Total businesses without lat/lng: ${total_nolat}`);
}

run();
