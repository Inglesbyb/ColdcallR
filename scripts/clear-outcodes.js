import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function clearOutcodes() {
  console.log('Clearing outcode_stats table...');
  const { data, error } = await supabase.from('outcode_stats').delete().neq('outcode', 'none');
  if (error) {
    console.error('Failed to clear outcodes:', error);
  } else {
    console.log('Successfully cleared outcodes.');
  }
}

clearOutcodes();
