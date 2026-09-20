import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const CH_API_KEY = process.env.COMPANIES_HOUSE_API_KEY;

if (!CH_API_KEY) {
  console.error("Missing CH API KEY");
  process.exit(1);
}

function getAuthHeader() {
  const encoded = Buffer.from(`${CH_API_KEY}:`).toString("base64");
  return { Authorization: `Basic ${encoded}` };
}

async function run() {
  console.log("Testing CH API for L20");
  const params = new URLSearchParams({
    company_status: "active",
    location: "L20",
    start_index: "0",
    size: "1", // just want the total count
  });

  const res = await fetch(`https://api.company-information.service.gov.uk/advanced-search/companies?${params}`, {
    headers: {
      ...getAuthHeader(),
      "Content-Type": "application/json",
      "User-Agent": "SecureMap-Ingestion-Script/1.0",
    },
  });

  if (!res.ok) {
    console.error(`CH API Error: ${res.status} ${res.statusText}`);
    return;
  }

  const data = await res.json();
  console.log(`Total hits for L20 according to CH Advanced Search API:`, data.hits);
  
  // also try with L20 
  const params2 = new URLSearchParams({
    company_status: "active",
    location: "L20 ",
    start_index: "0",
    size: "1",
  });
  
  const res2 = await fetch(`https://api.company-information.service.gov.uk/advanced-search/companies?${params2}`, {
    headers: {
      ...getAuthHeader(),
      "Content-Type": "application/json",
      "User-Agent": "SecureMap-Ingestion-Script/1.0",
    },
  });
  const data2 = await res2.json();
  console.log(`Total hits for "L20 " according to CH Advanced Search API:`, data2.hits);
}

run();
