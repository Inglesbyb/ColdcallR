import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getCrimeCountAtLocation, type CrimeCounts } from '../lib/api/crime.js';
import { scoreLead } from '../lib/scoring.js';

// Need to load environment variables from Next.js context
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing required environment variables.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Custom retry wrapper for getCrimeCountAtLocation since it suppresses errors
async function fetchCrimeWithRetry(lat: number, lng: number): Promise<CrimeCounts> {
  // getCrimeCountAtLocation handles its own retries/suppression, returning 0 on failure.
  // We'll just call it, but add a 150ms delay.
  const counts = await getCrimeCountAtLocation(lat, lng);
  await sleep(150);
  return counts;
}

async function run() {
  console.log("Starting batch crime enrichment by postcode sector...");

  // 1. Get all distinct postcode sectors from leads
  // Since Supabase doesn't have a direct SQL query endpoint from JS without a function,
  // we'll fetch postcodes, lat, lng and aggregate in memory.
  console.log("Fetching all leads to aggregate sectors...");
  let allLeads: any[] = [];
  let page = 0;
  const pageSize = 1000;
  
  while (true) {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .not('lat', 'is', null)
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error("Error fetching leads:", error);
      process.exit(1);
    }

    if (!data || data.length === 0) break;
    allLeads.push(...data);
    page++;
  }

  console.log(`Loaded ${allLeads.length} geocoded leads. Grouping by sector...`);

  // Group by sector (e.g. L1 4)
  const sectors = new Map<string, { latSum: number, lngSum: number, count: number, leads: any[] }>();

  for (const lead of allLeads) {
    if (!lead.postcode) continue;
    // Postcode format: outward + space + first digit of inward
    // E.g. "L1 4DN" -> "L1 4"
    // "CH41 1AA" -> "CH41 1"
    const match = lead.postcode.match(/^([A-Z]{1,2}\d[A-Z\d]?)\s*(\d)/i);
    if (!match) continue;

    const sector = `${match[1].toUpperCase()} ${match[2]}`;
    const entry = sectors.get(sector) || { latSum: 0, lngSum: 0, count: 0, leads: [] };
    
    entry.latSum += lead.lat;
    entry.lngSum += lead.lng;
    entry.count++;
    entry.leads.push(lead);
    
    sectors.set(sector, entry);
  }

  console.log(`Found ${sectors.size} distinct postcode sectors.`);

  let processedSectors = 0;
  let updatedLeads = 0;
  let hotLeads = 0;
  const tagBreakdown: Record<string, number> = {};

  for (const [sector, data] of sectors.entries()) {
    const avgLat = data.latSum / data.count;
    const avgLng = data.lngSum / data.count;

    // Fetch crime for the centroid
    const crimeData = await fetchCrimeWithRetry(avgLat, avgLng);

    // Calculate score for each lead and prepare bulk update
    const updates = data.leads.map(lead => {
      const scoring = scoreLead({
        sic_codes: lead.sic_codes,
        incorporation_date: lead.incorporation_date,
        company_status: lead.company_status,
        is_commercial_unit: lead.is_commercial_unit,
        recent_burglaries_count: crimeData.total,
        visit_status: lead.visit_status,
      });

      // Track stats
      tagBreakdown[scoring.risk_profile_tag] = (tagBreakdown[scoring.risk_profile_tag] || 0) + 1;
      if (scoring.lead_score >= 75) {
        hotLeads++;
      }

      return {
        ...lead,
        recent_burglaries_count: crimeData.total,
        crime_burglary_count: crimeData.burglary,
        crime_robbery_count: crimeData.robbery,
        crime_vehicle_count: crimeData.vehicle,
        crime_theft_person_count: crimeData.theftPerson,
        crime_other_theft_count: crimeData.otherTheft,
        crime_arson_count: crimeData.arson,
        crime_shoplifting_count: crimeData.shoplifting,
        crime_asb_count: crimeData.asb,
        crime_violent_count: crimeData.violent,
        lead_score: scoring.lead_score,
        risk_profile_tag: scoring.risk_profile_tag,
        sales_hook: scoring.sales_hook
      };
    });

    // Update in Supabase
    // Supabase JS upsert allows bulk updating by passing an array of objects with the primary key
    // We must chunk it in case of large sectors (e.g. 500+ leads)
    for (let i = 0; i < updates.length; i += 500) {
      const chunk = updates.slice(i, i + 500);
      const { error } = await supabase
        .from('leads')
        .upsert(chunk, { onConflict: 'id' });

      if (error) {
        console.error(`[Sector ${sector}] Error updating chunk:`, error);
      }
    }

    updatedLeads += updates.length;
    processedSectors++;
    console.log(`[Sector ${sector}] ${crimeData.total} crimes -> Updated ${updates.length} leads. Progress: ${processedSectors}/${sectors.size}`);
  }

  console.log(`\n=== CRIME ENRICHMENT COMPLETE ===`);
  console.log(`Total postcode sectors processed: ${processedSectors}`);
  console.log(`Total leads updated: ${updatedLeads}`);
  console.log(`Total hot leads (>= 75 score): ${hotLeads}`);
  console.log(`Risk Profile Breakdown:`);
  Object.entries(tagBreakdown)
    .sort((a, b) => b[1] - a[1])
    .forEach(([tag, count]) => {
      console.log(`  - ${tag}: ${count}`);
    });
}

run().catch(console.error);
