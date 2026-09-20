import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, getSupabaseAdminClient } from "@/lib/supabase/server";
import { getCompanyOfficers } from "@/lib/api/companiesHouse";
import { scrapeContactInfo } from "@/lib/api/webEnrichment";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing lead ID" }, { status: 400 });
  }

  // Authenticate
  const sessionClient = await getSupabaseServerClient();
  const { data: { user } } = await sessionClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdminClient();

  // 1. Fetch current lead
  const { data: lead, error: fetchError } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  // 2. Check if already enriched (we use director_name or phone as a proxy)
  // If it was already enriched, just return it.
  if (lead.director_name !== null || lead.phone !== null || lead.website !== null) {
    return NextResponse.json({ lead });
  }

  // 3. Perform enrichment concurrently
  const [officers, contactInfo] = await Promise.all([
    getCompanyOfficers(lead.company_number),
    scrapeContactInfo(lead.company_name, lead.postcode),
  ]);

  const updatePayload = {
    director_name: officers?.director_name || null,
    director_role: officers?.director_role || null,
    phone: contactInfo.phone || null,
    website: contactInfo.website || null,
    social_links: contactInfo.socialLinks.length > 0 ? contactInfo.socialLinks : null,
  };

  // 4. Save to Supabase
  const { data: updatedLead, error: updateError } = await supabase
    .from("leads")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    console.error(`[Enrichment] Failed to save enriched data for ${id}:`, updateError);
    return NextResponse.json({ error: "Failed to save enriched data" }, { status: 500 });
  }

  return NextResponse.json({ lead: updatedLead });
}
