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
  const { data: exactCount, error: err1, count: c1 } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .ilike('postcode', 'L20 %');

  const { data: exactCount2, error: err2, count: c2 } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('postcode', 'L20');

  const { data: containsCount, error: err3, count: c3 } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .ilike('postcode', '%L20%');

  console.log(`Count for "L20 %": ${c1}`);
  console.log(`Count for "L20": ${c2}`);
  console.log(`Count for "%L20%": ${c3}`);
  
  const { count: total } = await supabase.from('leads').select('*', { count: 'exact', head: true });
  console.log(`Total businesses in DB: ${total}`);
  
  const { data: sample } = await supabase.from('leads').select('postcode').ilike('postcode', '%L20%').limit(5);
  console.log(`Sample postcodes containing L20:`, sample);
}

run();
