import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

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

const LIVERPOOL_POSTCODES = [
  'L1','L2','L3','L4','L5','L6','L7','L8','L9','L11','L12','L13','L14','L15',
  'L16','L17','L18','L19','L20','L21','L22','L23','L24','L25','L26','L27',
  'L28','L29','L30','L31','L32','L33','L34','L35','L36','L37','L38'
];

const STATE_FILE = path.join(__dirname, 'ingest_state.json');

interface IngestState {
  currentPrefixIndex: number;
  currentStartIndex: number;
  totalOverall: number;
  totalForPrefix: number;
}

function loadState(): IngestState {
  if (fs.existsSync(STATE_FILE)) {
    try {
      const data = fs.readFileSync(STATE_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (e) {
      console.warn("Failed to parse state file, starting fresh.");
    }
  }
  return {
    currentPrefixIndex: 0,
    currentStartIndex: 0,
    totalOverall: 0,
    totalForPrefix: 0
  };
}

function saveState(state: IngestState) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function getAuthHeader() {
  const encoded = Buffer.from(`${CH_API_KEY}:`).toString("base64");
  return { Authorization: `Basic ${encoded}` };
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function geocodePostcodes(postcodes: string[]) {
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

async function run() {
  console.log("Starting Liverpool Territory Ingestion with Checkpointing...");
  
  let state = loadState();
  const batchSize = 100;

  for (let i = state.currentPrefixIndex; i < LIVERPOOL_POSTCODES.length; i++) {
    const prefix = LIVERPOOL_POSTCODES[i];
    console.log(`\n--- Resuming ingestion for Postcode Prefix: ${prefix} (from start_index: ${state.currentStartIndex}) ---`);
    
    let hasMore = true;
    let retryCount = 0;

    while (hasMore) {
      try {
        const params = new URLSearchParams({
          company_status: "active",
          location: prefix,
          start_index: String(state.currentStartIndex),
          size: String(batchSize),
        });

        const res = await fetch(`https://api.company-information.service.gov.uk/advanced-search/companies?${params}`, {
          headers: {
            ...getAuthHeader(),
            "Content-Type": "application/json",
            "User-Agent": "SecureMap-Ingestion-Script/1.0",
          },
        });

        if (res.status === 429) {
          console.log(`[${prefix}] Rate limited (429). Sleeping for 30s...`);
          await sleep(30000);
          continue;
        }

        if (!res.ok) {
          console.error(`[${prefix}] CH API Error: ${res.status} ${res.statusText}`);
          if (retryCount < 3) {
            retryCount++;
            await sleep(5000);
            continue;
          } else {
            console.error(`[${prefix}] Max retries reached. Moving to next prefix to avoid total blockage.`);
            hasMore = false;
            break;
          }
        }

        retryCount = 0;
        const data = await res.json();
        const items = data.items || [];
        
        if (items.length === 0) {
          hasMore = false;
          break;
        }

        const validItems = items.filter((item: any) => item.date_of_creation);

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
            lead_score: 50,
            visit_status: 'unvisited',
            visited: false
          };
        });

        // Safe Insert: Check for existing company_numbers first to avoid missing unique constraint errors
        const companyNumbers = recordsToUpsert.map(r => r.company_number);
        const { data: existing } = await supabase
          .from('leads')
          .select('company_number')
          .in('company_number', companyNumbers);
        
        const existingSet = new Set(existing?.map(e => e.company_number) || []);
        const toInsert = recordsToUpsert.filter(r => !existingSet.has(r.company_number));

        let error = null;
        if (toInsert.length > 0) {
          const { error: insertError } = await supabase
            .from('leads')
            .insert(toInsert);
          error = insertError;
        }

        if (error) {
          console.error(`[${prefix}] Supabase upsert error:`, error.message);
        } else {
          state.totalForPrefix += recordsToUpsert.length;
          state.totalOverall += recordsToUpsert.length;
          console.log(`[${prefix}] Upserted ${recordsToUpsert.length} companies. Total for ${prefix}: ${state.totalForPrefix} (Overall: ${state.totalOverall})`);
        }

        state.currentStartIndex += batchSize;
        saveState(state); // Checkpoint here!
        
        // Companies House max limit
        if (state.currentStartIndex >= 5000) {
          console.log(`[${prefix}] Reached CH API max start_index (5000). Moving to next prefix.`);
          hasMore = false;
          break;
        }

        // Small delay to respect CH rate limits (600 per 5 min ~ 2 per second)
        await sleep(1000);

      } catch (err) {
        console.error(`[${prefix}] Unexpected error during loop:`, err);
        process.exit(1);
      }
    }
    
    // Prepare state for the next prefix
    state.currentPrefixIndex = i + 1;
    state.currentStartIndex = 0;
    state.totalForPrefix = 0;
    saveState(state);
    
    console.log(`[PROGRESS] Completed ${prefix}. Moving to next.`);
  }

  console.log(`\n=== INGESTION COMPLETE ===`);
  console.log(`Total active businesses upserted: ${state.totalOverall}`);
  
  // Clean up state file since we are entirely done
  if (fs.existsSync(STATE_FILE)) {
    fs.unlinkSync(STATE_FILE);
  }
  
  process.exit(0);
}

run();
