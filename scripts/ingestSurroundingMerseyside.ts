import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role for bulk ingest bypassing RLS
const CH_API_KEY = process.env.COMPANIES_HOUSE_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !CH_API_KEY) {
  console.error("Missing required environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, COMPANIES_HOUSE_API_KEY).");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const MERSEYSIDE_POSTCODES = [
  'WA8', 'WA9', 'WA10', 'WA11', 'WA12', 'L39', 'L40', 'WN8'
];

function getAuthHeader() {
  const encoded = Buffer.from(`${CH_API_KEY}:`).toString("base64");
  return { Authorization: `Basic ${encoded}` };
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function geocodePostcodes(postcodes: string[]) {
  // Postcodes.io bulk lookup endpoint allows up to 100 postcodes per request
  const uniquePostcodes = [...new Set(postcodes)];
  const result: Record<string, { lat: number; lng: number } | null> = {};

  for (let i = 0; i < uniquePostcodes.length; i += 100) {
    const batch = uniquePostcodes.slice(i, i + 100);
    try {
      const res = await fetch("https://api.postcodes.io/postcodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postcodes: batch }),
      });

      if (!res.ok) {
        console.warn(`[Geocode] Bulk request failed with status ${res.status}`);
        continue;
      }

      const data = await res.json();
      for (const item of data.result) {
        if (item.result) {
          result[item.query] = { lat: item.result.latitude, lng: item.result.longitude };
        } else {
          result[item.query] = null;
        }
      }
    } catch (err) {
      console.error("[Geocode] Error fetching bulk postcodes:", err);
    }
  }

  return result;
}

async function ingestPostcode(prefix: string) {
  console.log(`\n--- Starting ingestion for Postcode Prefix: ${prefix} ---`);
  let startIndex = 0;
  const batchSize = 100; // Max allowed by Companies House
  let totalForPrefix = 0;
  let hasMore = true;
  let retryCount = 0;

  while (hasMore) {
    try {
      const params = new URLSearchParams({
        company_status: "active",
        location: prefix,
        start_index: String(startIndex),
        size: String(batchSize),
      });

      let res;
      try {
        res = await fetch(`https://api.company-information.service.gov.uk/advanced-search/companies?${params}`, {
          headers: {
            ...getAuthHeader(),
            "Content-Type": "application/json",
            "User-Agent": "SecureMap-Ingestion-Script/1.0",
          },
        });
      } catch (fetchErr) {
        console.error(`[${prefix}] Network error:`, fetchErr);
        if (retryCount < 5) {
          retryCount++;
          console.log(`[${prefix}] Retrying in 3 seconds... (Attempt ${retryCount}/5)`);
          await sleep(3000);
          continue;
        } else {
          console.error(`[${prefix}] Max retries reached for network error. Skipping batch.`);
          break;
        }
      }

      if (res.status === 429) {
        console.log(`[${prefix}] Rate limited (429). Sleeping for 30s...`);
        await sleep(30000);
        continue;
      }

      if (!res.ok) {
        console.error(`[${prefix}] CH API Error: ${res.status} ${res.statusText}`);
        // Backoff for 500 errors or other issues
        if (retryCount < 5) {
          retryCount++;
          console.log(`[${prefix}] Retrying in 3 seconds... (Attempt ${retryCount}/5)`);
          await sleep(3000);
          continue;
        } else {
          console.error(`[${prefix}] Max retries reached. Skipping batch.`);
          break; // Give up on this batch and move to next
        }
      }

      retryCount = 0; // reset on success
      const data = await res.json();
      const items = data.items || [];
      
      if (items.length === 0) {
        hasMore = false;
        break;
      }

      // Filter out items without creation date (required by Supabase schema)
      const validItems = items.filter((item: any) => item.date_of_creation);

      // Collect postcodes to geocode
      const postcodesToGeocode = validItems
        .map((item: any) => item.registered_office_address?.postal_code)
        .filter(Boolean);

      const geocodeMap = await geocodePostcodes(postcodesToGeocode);

      const recordsToUpsert = validItems.map((item: any) => {
        const address = item.registered_office_address || {};
        const postcode = address.postal_code || "";
        const coords = geocodeMap[postcode];

        const incDate = new Date(item.date_of_creation).toISOString();
        const sicCodes = item.sic_codes || [];

        // Assign risk tag based on SIC code
        let riskTag = "DEFAULT";
        if (sicCodes.includes("47110") || sicCodes.includes("47190") || sicCodes.includes("47210")) {
           riskTag = "PREMIUM_RETAIL";
        } else if (sicCodes.includes("45111") || sicCodes.includes("45200") || sicCodes.includes("47300")) {
           riskTag = "AUTOMOTIVE";
        } else if (sicCodes.includes("52100") || sicCodes.includes("49410") || sicCodes.includes("47410")) {
           riskTag = "INDUSTRIAL_TARGET";
        } else if (sicCodes.includes("55100") || sicCodes.includes("56101") || sicCodes.includes("56301")) {
           riskTag = "HOSPITALITY";
        }

        return {
          company_number: item.company_number,
          company_name: item.company_name,
          company_status: item.company_status,
          incorporation_date: incDate,
          sic_codes: sicCodes,
          address_line_1: address.address_line_1 || "",
          postcode: postcode,
          lat: coords?.lat || null,
          lng: coords?.lng || null,
          risk_profile_tag: riskTag,
          lead_score: 50, // Default baseline score
          visit_status: 'unvisited',
          visited: false
        };
      });

      // Bulk upsert to Supabase
      const { error } = await supabase
        .from('leads')
        .upsert(recordsToUpsert, { onConflict: 'company_number' });

      if (error) {
        console.error(`[${prefix}] Supabase upsert error:`, error.message);
      } else {
        totalForPrefix += recordsToUpsert.length;
        console.log(`[${prefix}] Upserted ${recordsToUpsert.length} companies. Total for ${prefix}: ${totalForPrefix}`);
      }

      startIndex += batchSize;
      
      // Companies House max limit
      if (startIndex >= 5000) {
        console.log(`[${prefix}] Reached CH API max start_index (5000). Moving to next prefix.`);
        hasMore = false;
        break;
      }

      // Small delay to respect CH rate limits (600 per 5 min ~ 2 per second)
      await sleep(1000);

    } catch (err) {
      console.error(`[${prefix}] Unexpected error during loop:`, err);
      break;
    }
  }
  return totalForPrefix;
}

async function run() {
  console.log("Starting Surrounding Merseyside Territory Ingestion (Resume from CH46)...");
  let totalOverall = 0;

  for (const prefix of MERSEYSIDE_POSTCODES) {
    const totalForPrefix = await ingestPostcode(prefix);
    totalOverall += totalForPrefix;
    console.log(`[PROGRESS] Completed ${prefix}. Total businesses ingested in this run: ${totalOverall}`);
  }

  console.log(`\n=== INGESTION COMPLETE ===`);
  console.log(`Total active businesses upserted in this run: ${totalOverall}`);
  process.exit(0);
}

run();
