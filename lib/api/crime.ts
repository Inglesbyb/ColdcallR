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
  "criminal-damage-arson",
  "shoplifting",
  "anti-social-behaviour",
  "violent-crime"
];

export interface CrimeCounts {
  total: number;
  burglary: number;
  robbery: number;
  vehicle: number;
  theftPerson: number;
  otherTheft: number;
  arson: number;
  shoplifting: number;
  asb: number;
  violent: number;
}

const emptyCounts = (): CrimeCounts => ({
  total: 0,
  burglary: 0,
  robbery: 0,
  vehicle: 0,
  theftPerson: 0,
  otherTheft: 0,
  arson: 0,
  shoplifting: 0,
  asb: 0,
  violent: 0,
});

/**
 * Fetch street-level crimes within a radius of a lat/lng point.
 * Uses data.police.uk street crimes endpoint.
 * Returns the count of target-category crimes in the past 12 months.
 */
export async function getNearbyCrimeCount(
  lat: number,
  lng: number,
  radiusMeters = 400
): Promise<CrimeCounts> {
  // data.police.uk uses a polygon for radius queries
  // Approximate a circle as a square bounding box (simplified for performance)
  const radiusDeg = radiusMeters / 111_320; // rough metres → degrees

  const poly = buildPolygon(lat, lng, radiusDeg);
  const months = getLast12Months();

  let counts = emptyCounts();

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
      
      for (const c of crimes) {
        if (!TARGET_CATEGORIES.includes(c.category)) continue;
        counts.total++;
        if (c.category === "burglary") counts.burglary++;
        else if (c.category === "robbery") counts.robbery++;
        else if (c.category === "vehicle-crime") counts.vehicle++;
        else if (c.category === "theft-from-the-person") counts.theftPerson++;
        else if (c.category === "other-theft") counts.otherTheft++;
        else if (c.category === "criminal-damage-arson") counts.arson++;
        else if (c.category === "shoplifting") counts.shoplifting++;
        else if (c.category === "anti-social-behaviour") counts.asb++;
        else if (c.category === "violent-crime") counts.violent++;
      }

      // Respect rate limits
      await new Promise((r) => setTimeout(r, 150));
    } catch {
      // Non-fatal — crime data is enrichment, not critical
      continue;
    }
  }

  return counts;
}

/**
 * Get crime count using the crimes-at-location endpoint for speed.
 * Less precise than polygon but much faster for bulk seeding.
 */
export async function getCrimeCountAtLocation(
  lat: number,
  lng: number
): Promise<CrimeCounts> {
  try {
    const months = getLast12Months();
    let counts = emptyCounts();

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
      for (const c of crimes) {
        if (!TARGET_CATEGORIES.includes(c.category)) continue;
        counts.total++;
        if (c.category === "burglary") counts.burglary++;
        else if (c.category === "robbery") counts.robbery++;
        else if (c.category === "vehicle-crime") counts.vehicle++;
        else if (c.category === "theft-from-the-person") counts.theftPerson++;
        else if (c.category === "other-theft") counts.otherTheft++;
        else if (c.category === "criminal-damage-arson") counts.arson++;
        else if (c.category === "shoplifting") counts.shoplifting++;
        else if (c.category === "anti-social-behaviour") counts.asb++;
        else if (c.category === "violent-crime") counts.violent++;
      }

      await new Promise((r) => setTimeout(r, 100));
    }

    return counts;
  } catch {
    return emptyCounts();
  }
}

/**
 * Proxy-friendly crime count fetch (called via our /api/crime route
 * to avoid CORS from the browser).
 */
export async function getCrimeCountProxy(
  lat: number,
  lng: number
): Promise<CrimeCounts> {
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
