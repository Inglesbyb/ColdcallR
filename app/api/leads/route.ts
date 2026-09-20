import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, getSupabaseAdminClient } from "@/lib/supabase/server";
import type { LeadFilter } from "@/lib/types";

// Helper: get the authenticated user's ID from the session cookie
async function getAuthenticatedUserId(): Promise<string | null> {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// GET /api/leads — fetch leads with optional filters
export async function GET(request: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdminClient();
  const { searchParams } = new URL(request.url);

  const filter: LeadFilter = {
    visit_status:
      (searchParams.get("visit_status") as LeadFilter["visit_status"]) ??
      "all",
    min_score: searchParams.get("min_score")
      ? Number(searchParams.get("min_score"))
      : undefined,
    unvisited_only: searchParams.get("unvisited_only") === "true",
    limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : 200,
    offset: searchParams.get("offset")
      ? Number(searchParams.get("offset"))
      : 0,
  };

  // Bounding box filter: minLng,minLat,maxLng,maxLat
  const bbox = searchParams.get("bbox");
  let bboxArray: [number, number, number, number] | undefined;
  if (bbox) {
    const parts = bbox.split(",").map(Number);
    if (parts.length === 4) {
      bboxArray = parts as [number, number, number, number];
    }
  }

  // Parse new Drawer filters
  const visit_statuses = searchParams.get("visit_statuses");
  const commercial_only = searchParams.get("commercial_only") === "true";
  const max_age_days = searchParams.get("max_age_days") ? Number(searchParams.get("max_age_days")) : null;
  const min_burglaries = searchParams.get("min_burglaries") ? Number(searchParams.get("min_burglaries")) : undefined;
  const sort_by = searchParams.get("sort_by") || "score";
  const search = searchParams.get("q") || searchParams.get("search");

  // Contact / Pipeline / Score Tier / Location
  const has_phone = searchParams.get("has_phone") === "true";
  const has_website = searchParams.get("has_website") === "true";
  const has_director = searchParams.get("has_director") === "true";
  const follow_up_due = searchParams.get("follow_up_due") === "true";
  const score_tier = searchParams.get("score_tier");
  const rawPostcodes = searchParams.get("postcodes") || searchParams.get("outcode") || searchParams.get("postcode_prefix");
  const company_age = searchParams.get("company_age");

  // Individual crime minimums
  const min_crime_burglary = searchParams.get("min_crime_burglary") ? Number(searchParams.get("min_crime_burglary")) : undefined;
  const min_crime_robbery = searchParams.get("min_crime_robbery") ? Number(searchParams.get("min_crime_robbery")) : undefined;
  const min_crime_vehicle = searchParams.get("min_crime_vehicle") ? Number(searchParams.get("min_crime_vehicle")) : undefined;
  const min_crime_theft_person = searchParams.get("min_crime_theft_person") ? Number(searchParams.get("min_crime_theft_person")) : undefined;
  const min_crime_other_theft = searchParams.get("min_crime_other_theft") ? Number(searchParams.get("min_crime_other_theft")) : undefined;
  const min_crime_arson = searchParams.get("min_crime_arson") ? Number(searchParams.get("min_crime_arson")) : undefined;
  const min_crime_shoplifting = searchParams.get("min_crime_shoplifting") ? Number(searchParams.get("min_crime_shoplifting")) : undefined;
  const min_crime_asb = searchParams.get("min_crime_asb") ? Number(searchParams.get("min_crime_asb")) : undefined;
  const min_crime_violent = searchParams.get("min_crime_violent") ? Number(searchParams.get("min_crime_violent")) : undefined;

  // Company age range (years)
  const company_age_min_years = searchParams.get("company_age_min_years") ? Number(searchParams.get("company_age_min_years")) : undefined;
  const company_age_max_years = searchParams.get("company_age_max_years") ? Number(searchParams.get("company_age_max_years")) : undefined;

  // Min lead score override
  const min_score_override = searchParams.get("min_score_val") ? Number(searchParams.get("min_score_val")) : undefined;

  // Base query scoped to this user, with exact count
  let query = supabase
    .from("leads")
    .select("*", { count: "exact" })
    .or(`user_id.eq.${userId},user_id.is.null`)
    .not("lat", "is", null)
    .not("lng", "is", null)
    .range(filter.offset!, filter.offset! + filter.limit! - 1);

  // Primary sort
  switch (sort_by) {
    case "burglaries":
      query = query.order("recent_burglaries_count", { ascending: false, nullsFirst: false });
      break;
    case "newest":
      query = query.order("incorporation_date", { ascending: false, nullsFirst: false });
      break;
    case "oldest":
      query = query.order("incorporation_date", { ascending: true, nullsFirst: false });
      break;
    default: // "score"
      query = query.order("lead_score", { ascending: false, nullsFirst: false });
  }
  // Secondary deterministic ordering for stable pagination
  query = query.order("company_number", { ascending: true });

  // Status filters
  if (visit_statuses) {
    const statuses = visit_statuses.split(",");
    query = query.in("visit_status", statuses);
  } else if (filter.visit_status && filter.visit_status !== "all") {
    query = query.eq("visit_status", filter.visit_status);
  }

  // Unvisited only
  if (filter.unvisited_only) {
    query = query.eq("visited", false);
  }

  // Score: slider override takes priority over pill-based tiers
  if (min_score_override !== undefined && min_score_override > 0) {
    query = query.gte("lead_score", min_score_override);
  } else if (score_tier === "hot") {
    query = query.gte("lead_score", 80);
  } else if (score_tier === "warm") {
    query = query.gte("lead_score", 50).lt("lead_score", 80);
  } else if (score_tier === "cold") {
    query = query.lt("lead_score", 50);
  } else if (filter.min_score !== undefined) {
    query = query.gte("lead_score", filter.min_score);
  }

  // Commercial only
  if (commercial_only) {
    query = query.eq("is_commercial_unit", true);
  }

  // Min burglaries
  if (min_burglaries !== undefined && min_burglaries > 0) {
    query = query.gte("recent_burglaries_count", min_burglaries);
  }

  // Company Age Range Filter (slider: min/max years)
  if (company_age_min_years !== undefined || company_age_max_years !== undefined) {
    const today = new Date();
    // Older than max_years (incorporated before this date)
    if (company_age_min_years !== undefined && company_age_min_years > 0) {
      const maxDate = new Date(today);
      maxDate.setFullYear(maxDate.getFullYear() - company_age_min_years);
      query = query.lte("incorporation_date", maxDate.toISOString());
    }
    // Younger than max_years (incorporated after this date)
    if (company_age_max_years !== undefined && company_age_max_years < 30) {
      const minDate = new Date(today);
      minDate.setFullYear(minDate.getFullYear() - company_age_max_years);
      query = query.gte("incorporation_date", minDate.toISOString());
    }
  } else if (company_age) {
    // Legacy pill button fallback
    const today = new Date();
    switch(company_age) {
      case "gt_30d": { const d = new Date(today); d.setDate(d.getDate() - 30); query = query.lte("incorporation_date", d.toISOString()); break; }
      case "gt_90d": { const d = new Date(today); d.setDate(d.getDate() - 90); query = query.lte("incorporation_date", d.toISOString()); break; }
      case "gt_1y": { const d = new Date(today); d.setFullYear(d.getFullYear() - 1); query = query.lte("incorporation_date", d.toISOString()); break; }
      case "lt_30d": { const d = new Date(today); d.setDate(d.getDate() - 30); query = query.gte("incorporation_date", d.toISOString()); break; }
    }
  } else if (max_age_days !== null) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - max_age_days);
    query = max_age_days === 365
      ? query.lte("incorporation_date", cutoffDate.toISOString())
      : query.gte("incorporation_date", cutoffDate.toISOString());
  }

  // Individual crime minimum filters
  if (min_crime_burglary && min_crime_burglary > 0) query = query.gte("crime_burglary_count", min_crime_burglary);
  if (min_crime_robbery && min_crime_robbery > 0) query = query.gte("crime_robbery_count", min_crime_robbery);
  if (min_crime_vehicle && min_crime_vehicle > 0) query = query.gte("crime_vehicle_count", min_crime_vehicle);
  if (min_crime_theft_person && min_crime_theft_person > 0) query = query.gte("crime_theft_person_count", min_crime_theft_person);
  if (min_crime_other_theft && min_crime_other_theft > 0) query = query.gte("crime_other_theft_count", min_crime_other_theft);
  if (min_crime_arson && min_crime_arson > 0) query = query.gte("crime_arson_count", min_crime_arson);
  if (min_crime_shoplifting && min_crime_shoplifting > 0) query = query.gte("crime_shoplifting_count", min_crime_shoplifting);
  if (min_crime_asb && min_crime_asb > 0) query = query.gte("crime_asb_count", min_crime_asb);
  if (min_crime_violent && min_crime_violent > 0) query = query.gte("crime_violent_count", min_crime_violent);

  // Sectors & Crime Risks (mapped to risk_profile_tag)
  const risk_tags = searchParams.get("risk_tags");
  if (risk_tags) {
    const tags = risk_tags.split(",");
    if (tags.length > 0) {
      query = query.in("risk_profile_tag", tags);
    }
  }
  
  // Contact Availability
  if (has_phone) query = (query as any).not("phone", "is", null);
  if (has_website) query = (query as any).not("website", "is", null);
  if (has_director) query = (query as any).not("director_name", "is", null);

  // Pipeline (Follow-up Due)
  if (follow_up_due) {
    const today = new Date().toISOString();
    query = (query as any).not("revisit_date", "is", null).lte("revisit_date", today);
  }
  
  // Location
  if (rawPostcodes) {
    const codes = rawPostcodes.split(',').map(c => c.trim().toUpperCase()).filter(Boolean);
    if (codes.length > 0) {
      const conditions = codes.flatMap(code => [
        `postcode.ilike.${code} %`,
        `postcode.eq.${code}`
      ]);
      query = (query as any).or(conditions.join(','));
    }
  }

  // Bounding box spatial filter
  if (bboxArray) {
    const [minLng, minLat, maxLng, maxLat] = bboxArray;
    query = (query as any)
      .gte("lat", minLat)
      .lte("lat", maxLat)
      .gte("lng", minLng)
      .lte("lng", maxLng);
  }

  // Text Search
  if (search && search.trim() !== "") {
    const cleanSearch = search.trim();
    query = (query as any).or(
      `company_name.ilike.%${cleanSearch}%,postcode.ilike.%${cleanSearch}%,address_line_1.ilike.%${cleanSearch}%`
    );
  }

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ leads: data, count: data?.length ?? 0, totalCount: count ?? 0 });
}

// POST /api/leads — create a new lead manually
export async function POST(request: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdminClient();

  let body: Partial<Record<string, unknown>>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const required = ["company_number", "company_name", "company_status", "incorporation_date", "postcode"];
  for (const field of required) {
    if (!body[field]) {
      return NextResponse.json(
        { error: `Missing required field: ${field}` },
        { status: 400 }
      );
    }
  }

  const { data, error } = await supabase
    .from("leads")
    .insert({
      ...body,
      user_id: userId,
      visit_status: "unvisited",
      visited: false,
      lead_score: body.lead_score ?? 50,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Company already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ lead: data }, { status: 201 });
}
