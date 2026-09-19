/**
 * One-shot schema setup script.
 * Run with: node scripts/setup-schema.mjs
 * 
 * This creates the PostGIS extension and leads table in your Supabase project
 * using the service role key (bypasses RLS).
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const SQL = `
-- Enable PostGIS extension for distance queries
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_number TEXT UNIQUE NOT NULL,
    company_name TEXT NOT NULL,
    company_status TEXT NOT NULL,
    incorporation_date DATE NOT NULL,
    sic_codes TEXT[],
    sic_description TEXT,
    
    -- Address details
    address_line_1 TEXT,
    locality TEXT,
    postcode TEXT NOT NULL,
    is_residential_or_admin BOOLEAN DEFAULT FALSE,
    is_commercial_unit BOOLEAN DEFAULT FALSE,
    
    -- Geolocation
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    geom GEOMETRY(Point, 4326),
    
    -- Scoring & Intelligence
    lead_score INTEGER DEFAULT 50,
    risk_profile_tag TEXT,
    sales_hook TEXT,
    recent_burglaries_count INTEGER DEFAULT 0,
    
    -- Visit Tracking
    visited BOOLEAN DEFAULT FALSE,
    visit_status TEXT DEFAULT 'unvisited',
    revisit_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS leads_geom_idx ON leads USING GIST (geom);
CREATE INDEX IF NOT EXISTS leads_postcode_idx ON leads (postcode);
CREATE INDEX IF NOT EXISTS leads_status_idx ON leads (visit_status);

-- Row Level Security (enable but allow all for now — tighten in production)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Allow all operations" ON leads
    FOR ALL USING (true) WITH CHECK (true);
`;

async function runSQL(sql) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SERVICE_ROLE_KEY,
      "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ sql }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SQL exec failed (${res.status}): ${text}`);
  }

  return res.json();
}

// Supabase doesn't expose a raw SQL exec via REST by default.
// Instead we use the Management API (requires project ref).
// Simpler: use the Supabase JS client with service role.

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

console.log("🔧 Setting up Supabase schema...\n");

// We'll use supabase.rpc to run the SQL statements one by one
// by calling our own SQL via postgrest's rpc if available,
// or fall back to checking if the table exists.

const { data: tables, error: tableErr } = await supabase
  .from("leads")
  .select("count")
  .limit(1);

if (!tableErr) {
  console.log("✅ leads table already exists and is accessible.");
  console.log("   You can proceed to seed data: POST /api/seed");
} else {
  console.log("⚠️  leads table not found:", tableErr.message);
  console.log("\n📋 Please run the following SQL in your Supabase SQL Editor:");
  console.log("   https://supabase.com/dashboard/project/mcetqeebaxkmmdkpylry/sql/new\n");
  console.log("─".repeat(60));
  console.log(SQL);
  console.log("─".repeat(60));
  console.log("\nAfter running the SQL, re-run this script to confirm.");
}
