import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const BASE_URL = "https://api.company-information.service.gov.uk";
const API_KEY = process.env.COMPANIES_HOUSE_API_KEY;

const ACTIVE_ROLES = new Set([
  "director",
  "corporate-director",
  "proprietor",
  "managing-officer",
  "managing-officer-corporate",
]);

interface CHRawOfficer {
  name: string;
  officer_role: string;
  resigned_on?: string;
  appointed_on?: string;
  nationality?: string;
}

function formatName(raw: string): string {
  // CH returns "SURNAME, Forename Middle" — invert and title-case
  let name = raw;
  if (name.includes(",")) {
    const [surname, forenames] = name.split(",");
    name = `${forenames.trim()} ${surname.trim()}`;
  }
  return name
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!API_KEY) {
    return NextResponse.json({ officers: [] });
  }

  try {
    let companyNumber = id;
    
    // Check if ID is a UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(id)) {
      const { data, error } = await supabase
        .from("leads")
        .select("company_number")
        .eq("id", id)
        .single();
        
      if (error || !data?.company_number) {
        return NextResponse.json({ officers: [] });
      }
      companyNumber = data.company_number;
    }

    const encoded = Buffer.from(`${API_KEY}:`).toString("base64");
    const res = await fetch(
      `${BASE_URL}/company/${companyNumber}/officers?items_per_page=50`,
      {
        headers: {
          Authorization: `Basic ${encoded}`,
          "User-Agent": "ColdCallr-App/1.0",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(6_000), // 6 s hard cap
      }
    );

    if (!res.ok) {
      return NextResponse.json({ officers: [] });
    }

    const data = await res.json();
    const items: CHRawOfficer[] = data.items ?? [];

    const officers = items
      .filter(
        (o) =>
          !o.resigned_on &&
          ACTIVE_ROLES.has(o.officer_role.toLowerCase().replace(/ /g, "-"))
      )
      .slice(0, 6) // cap at 6 active officers
      .map((o) => ({
        name: formatName(o.name),
        role: o.officer_role,
        appointed_on: o.appointed_on ?? null,
        nationality: o.nationality ?? null,
      }));

    return NextResponse.json({ officers });
  } catch {
    // Timeout, network error, or parse failure — return empty gracefully
    return NextResponse.json({ officers: [] });
  }
}
