import type { CHSearchResponse, CHCompany } from "../types";

const BASE_URL = "https://api.company-information.service.gov.uk";
const API_KEY = process.env.COMPANIES_HOUSE_API_KEY;

// Liverpool L1–L38 target area — broad enough for fuzzy matching
const LIVERPOOL_LOCATION = "Liverpool";

// High-value SIC codes to specifically search for
const TARGET_SIC_CODES = [
  "47110", "47190", "47210", "47300", "47410", "47770",
  "45111", "45112", "45200",
  "52100", "49410",
  "55100", "56101", "56301", "56302",
  "86210", "86230", "87100",
];

if (!API_KEY) {
  console.warn(
    "[Companies House] COMPANIES_HOUSE_API_KEY is not set. " +
      "Set it in .env.local. Seeding will fail."
  );
} else {
  console.log("[Companies House] API_KEY found:", API_KEY.substring(0, 5) + "...");
}

function getAuthHeader(): HeadersInit {
  // CH API uses Basic Auth with API key as username, empty password
  const encoded = Buffer.from(`${API_KEY}:`).toString("base64");
  return { Authorization: `Basic ${encoded}` };
}

/**
 * Search for active companies in Liverpool filtered to a specific SIC code.
 * Returns up to `maxResults` companies.
 */
export async function searchByLocation(
  location: string = LIVERPOOL_LOCATION,
  startIndex = 0,
  itemsPerPage = 100
): Promise<CHCompany[]> {
  const fromDate = new Date();
  fromDate.setFullYear(fromDate.getFullYear() - 2); // Pull active companies incorporated in the last 2 years for a good spread

  const params = new URLSearchParams({
    location: location,
    company_status: "active",
    sic_codes: TARGET_SIC_CODES.join(","),
    incorporated_from: fromDate.toISOString().split("T")[0],
    start_index: String(startIndex),
    size: String(itemsPerPage),
  });

  const res = await fetch(`${BASE_URL}/advanced-search/companies?${params}&cb=${Date.now()}`, {
    headers: {
      ...getAuthHeader(),
      "Content-Type": "application/json",
      "User-Agent": "ColdCallr-App/1.0",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(
      `Companies House API error: ${res.status} ${res.statusText}\n${errorText}`
    );
  }

  const data: CHSearchResponse = await res.json();
  return data.items ?? [];
}

/**
 * Fetch multiple pages of Liverpool companies, filtering to target SIC codes.
 * Will pull up to maxCompanies total leads.
 */
export async function fetchLiverpoolLeads(
  maxCompanies = 500
): Promise<CHCompany[]> {
  const results: CHCompany[] = [];
  const targetSicSet = new Set(TARGET_SIC_CODES);
  let startIndex = 0;
  const batchSize = 100;

  while (results.length < maxCompanies) {
    console.log(`[CH Search] Fetching start_index=${startIndex}, batchSize=${batchSize}`);
    const batch = await searchByLocation(
      LIVERPOOL_LOCATION,
      startIndex,
      batchSize
    );

    console.log(`[CH Search] Returned ${batch.length} items`);
    if (batch.length === 0) break;

    if (startIndex === 0 && batch.length > 0) {
      console.log("[CH Search] First company sample:", JSON.stringify(batch[0], null, 2));
    }

    for (const company of batch) {
      if (company.company_status?.toLowerCase() !== 'active') {
        continue; // drop immediately
      }

      // Only include companies with target SIC codes
      const hasSic =
        company.sic_codes?.some((c) => targetSicSet.has(c)) ?? false;

      // Filter to Liverpool postcodes L1–L38
      const postcode =
        company.registered_office_address?.postal_code?.toUpperCase() ?? "";
      const isLiverpool = /^L\d{1,2}/.test(postcode);

      if (hasSic && isLiverpool) {
        results.push(company);
        if (results.length >= maxCompanies) break;
      }
    }

    startIndex += batchSize;
    if (startIndex > 5000) {
      console.log("[CH Search] Hit 5000 start_index limit. Stopping.");
      break;
    }

    // Rate limit — CH API allows 600 req/5min (2 req/s)
    await new Promise((r) => setTimeout(r, 600));
  }

  return results;
}

export interface CHOfficer {
  name: string;
  officer_role: string;
  resigned_on?: string;
}

export async function getCompanyOfficers(companyNumber: string) {
  if (!API_KEY) return null;
  
  try {
    const res = await fetch(`${BASE_URL}/company/${companyNumber}/officers`, {
      headers: { ...getAuthHeader(), "User-Agent": "ColdCallr-App/1.0" },
      cache: "no-store",
    });

    if (!res.ok) return null;
    
    const data = await res.json();
    const items: CHOfficer[] = data.items || [];
    
    const activeDirector = items.find(o => 
      !o.resigned_on && 
      o.officer_role.toLowerCase().includes("director")
    );

    if (!activeDirector) return null;

    // Format "SURNAME, Forename Middle" -> "Forename Middle Surname"
    let formattedName = activeDirector.name;
    if (formattedName.includes(",")) {
      const parts = formattedName.split(",");
      formattedName = `${parts[1].trim()} ${parts[0].trim()}`;
    }

    // Optional: Capitalize properly (e.g. "GARY PAUL DAVIES" -> "Gary Paul Davies")
    formattedName = formattedName
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    return {
      director_name: formattedName,
      director_role: activeDirector.officer_role,
    };
  } catch (err) {
    console.error(`[Companies House] Error fetching officers for ${companyNumber}:`, err);
    return null;
  }
}

