import { NextRequest, NextResponse } from "next/server";

const POLICE_API = "https://data.police.uk/api";

// GET /api/crime?lat=53.4&lng=-2.99&date=2024-01
// Server-side CORS proxy for data.police.uk
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const date = searchParams.get("date");

  if (!lat || !lng) {
    return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
  }

  const params = new URLSearchParams({ lat, lng });
  if (date) params.set("date", date);

  try {
    const res = await fetch(
      `${POLICE_API}/crimes-at-location?${params}`,
      { next: { revalidate: 86400 * 7 } } // Cache 7 days
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: `Police API error: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch crime data", details: String(err) },
      { status: 502 }
    );
  }
}
