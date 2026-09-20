import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, getSupabaseAdminClient } from "@/lib/supabase/server";
import { fetchLiverpoolLeads } from "@/lib/api/companiesHouse";
import { bulkLookupPostcodes } from "@/lib/api/postcodes";
import { getCrimeCountAtLocation } from "@/lib/api/crime";
import { scoreLead, getSicDescription } from "@/lib/scoring";
import type { CHCompany } from "@/lib/types";

// GET /api/seed — orchestrate the full data pipeline
// This should only be called once per user (or when refreshing lead data)
export async function GET(request: NextRequest) {
  // Authenticate the user making the request
  const sessionClient = await getSupabaseServerClient();
  const { data: { user } } = await sessionClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = user.id;

  const { searchParams } = new URL(request.url);
  const maxCompanies = Number(searchParams.get("max") ?? "1000");
  const skipCrime = searchParams.get("skip_crime") === "true";

  console.log(`[Seed] Starting pipeline — max ${maxCompanies} companies`);

  // ─── Step 1: Fetch from Companies House ──────────────────────
  let companies: CHCompany[] = [];
  try {
    companies = await fetchLiverpoolLeads(maxCompanies);
    console.log(`[Seed] Fetched ${companies.length} companies from CH`);
  } catch (err) {
    console.error("[Seed] Companies House fetch failed:", err);
    return NextResponse.json(
      {
        error: "Companies House fetch failed. Check your API key in .env.local.",
        details: String(err),
      },
      { status: 502 }
    );
  }

  if (companies.length === 0) {
    return NextResponse.json({
      message: "No companies found. Check your CH API key and filters.",
      seeded: 0,
    });
  }

  // ─── Step 2: Batch geocode postcodes ─────────────────────────
  const postcodes = [
    ...new Set(
      companies
        .map((c) => c.registered_office_address?.postal_code ?? "")
        .filter(Boolean)
    ),
  ];

  console.log(`[Seed] Geocoding ${postcodes.length} unique postcodes`);

  const geocodeMap = await bulkLookupPostcodes(postcodes).catch((err) => {
    console.error("[Seed] Geocoding failed:", err);
    return new Map<string, null>();
  });

  // ─── Step 3: Build leads + enrich with crime data ────────────
  const supabase = getSupabaseAdminClient();
  let seeded = 0;
  let skipped = 0;

  for (const company of companies) {
    const postcode = company.registered_office_address?.postal_code ?? "";
    const normalised = postcode.replace(/\s/g, "").toUpperCase();
    const geo = geocodeMap.get(normalised);

    if (!geo) {
      skipped++;
      continue; // Can't place on map without coordinates
    }

    const lat = geo.latitude;
    const lng = geo.longitude;

    // Crime enrichment (skip if requested for speed)
    let recentBurglaries = 0;
    if (!skipCrime) {
      recentBurglaries = await getCrimeCountAtLocation(lat, lng);
    }

    // Score this lead
    const scoring = scoreLead({
      sic_codes: company.sic_codes,
      incorporation_date: company.date_of_creation,
      company_status: company.company_status,
      is_commercial_unit: true, // Assume commercial for CH-registered businesses
      recent_burglaries_count: recentBurglaries,
      visit_status: "unvisited",
    });

    const sicDescription = getSicDescription(company.sic_codes);

    // ─── Upsert into Supabase ────────────────────────────────
    const { error } = await supabase.from("leads").upsert(
      {
        company_number: company.company_number,
        user_id: userId,
        company_name: (company as any).company_name || company.title,
        company_status: company.company_status,
        incorporation_date: company.date_of_creation,
        sic_codes: company.sic_codes ?? [],
        sic_description: sicDescription,
        address_line_1: company.registered_office_address?.address_line_1 ?? null,
        locality: company.registered_office_address?.locality ?? null,
        postcode,
        is_commercial_unit: true,
        lat,
        lng,
        // PostGIS geometry — stored as WKT point
        geom: `POINT(${lng} ${lat})`,
        lead_score: scoring.lead_score,
        risk_profile_tag: scoring.risk_profile_tag,
        sales_hook: scoring.sales_hook,
        recent_burglaries_count: recentBurglaries,
        visit_status: "unvisited",
        visited: false,
      },
      { onConflict: "company_number,user_id" }
    );

    if (error) {
      console.error(`[Seed] Failed to upsert ${company.company_number}:`, error.message);
      skipped++;
    } else {
      seeded++;
    }

    // Throttle to avoid hammering Supabase
    if (seeded % 10 === 0) {
      await new Promise((r) => setTimeout(r, 50));
    }
  }

  console.log(`[Seed] Done — seeded: ${seeded}, skipped: ${skipped}`);

  return NextResponse.json({
    message: "Seed pipeline complete",
    seeded,
    skipped,
    total_fetched: companies.length,
  });
}
