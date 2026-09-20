import type { CrimeRecord } from "../types";

const BASE_URL = "https://data.police.uk/api";

// Merseyside force ID
const MERSEYSIDE_FORCE = "merseyside";

// Target crime categories (commercial security focus)
const TARGET_CATEGORIES = [
  "burglary",
  "robbery",
  "vehicle-crime",
  "theft-from-the-person",
  "other-theft",
];

/**
 * Fetch street-level crimes within a radius of a lat/lng point.
 * Uses data.police.uk street crimes endpoint.
 * Returns the count of target-category crimes in the past 12 months.
 */
export async function getNearbyCrimeCount(
  lat: number,
  lng: number,
  radiusMeters = 400
): Promise<number> {
  // data.police.uk uses a polygon for radius queries
  // Approximate a circle as a square bounding box (simplified for performance)
  const radiusDeg = radiusMeters / 111_320; // rough metres → degrees

  const poly = buildPolygon(lat, lng, radiusDeg);
  const months = getLast12Months();

  let totalCount = 0;

  // Query one month at a time (API limit: one date param per request)
  for (const month of months.slice(0, 12)) {
    // Lookback 12 months
    try {
      const params = new URLSearchParams({ poly, date: month });
      const res = await fetch(
        `${BASE_URL}/crimes-street/all-crime?${params}`,
        { next: { revalidate: 86400 * 7 } } // Cache 7 days
      );

      if (!res.ok) continue;

      const crimes: CrimeRecord[] = await res.json();
      const relevant = crimes.filter((c) =>
        TARGET_CATEGORIES.includes(c.category)
      );
      totalCount += relevant.length;

      // Respect rate limits
      await new Promise((r) => setTimeout(r, 150));
    } catch {
      // Non-fatal — crime data is enrichment, not critical
      continue;
    }
  }

  return totalCount;
}

/**
 * Get crime count using the crimes-at-location endpoint for speed.
 * Less precise than polygon but much faster for bulk seeding.
 */
export async function getCrimeCountAtLocation(
  lat: number,
  lng: number
): Promise<number> {
  try {
    const months = getLast12Months();
    let count = 0;

    // Query full 12 months for comprehensive data
    for (const month of months.slice(0, 12)) {
      const params = new URLSearchParams({
        lat: String(lat),
        lng: String(lng),
        date: month,
      });

      const res = await fetch(
        `${BASE_URL}/crimes-at-location?${params}`,
        { next: { revalidate: 86400 * 7 } }
      );

      if (!res.ok) continue;

      const crimes: CrimeRecord[] = await res.json();
      count += crimes.filter((c) => TARGET_CATEGORIES.includes(c.category)).length;

      await new Promise((r) => setTimeout(r, 100));
    }

    return count;
  } catch {
    return 0;
  }
}

/**
 * Proxy-friendly crime count fetch (called via our /api/crime route
 * to avoid CORS from the browser).
 */
export async function getCrimeCountProxy(
  lat: number,
  lng: number
): Promise<number> {
  // This is called server-side so can hit data.police.uk directly
  return getCrimeCountAtLocation(lat, lng);
}

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

function getLast12Months(): string[] {
  const months: string[] = [];
  const now = new Date();

  for (let i = 1; i <= 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    months.push(`${year}-${month}`);
  }

  return months;
}

function buildPolygon(
  lat: number,
  lng: number,
  radiusDeg: number
): string {
  // Approximate circle as 8-point polygon for data.police.uk
  const points: string[] = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * 2 * Math.PI;
    const pLat = lat + radiusDeg * Math.cos(angle);
    const pLng = lng + (radiusDeg / Math.cos((lat * Math.PI) / 180)) * Math.sin(angle);
    points.push(`${pLat.toFixed(6)},${pLng.toFixed(6)}`);
  }
  return points.join(":");
}

export { MERSEYSIDE_FORCE, TARGET_CATEGORIES };
