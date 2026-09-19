import type { ScoringInput, ScoringOutput, RiskTag } from "./types";

// ─────────────────────────────────────────────────────────────────
// SIC Code Category Mapping
// High-value targets for commercial security (CCTV, access control,
// intruder alarms, safes) in the Liverpool metro area
// ─────────────────────────────────────────────────────────────────

const PREMIUM_SIC_CODES = new Set([
  "47110", // Supermarkets / convenience stores
  "47190", // General retail (non-specialised)
  "47210", // Off licences / newsagents
  "47220", // Meat / fish / veg retailers
  "47260", // Tobacconists
  "47300", // Fuel stations
  "47410", // Computers & electronics retail
  "47430", // Audio/photo/video retail
  "47510", // Textile retail
  "47540", // Electrical household appliances retail
  "47590", // Furniture / household goods retail
  "47610", // Books & music retail
  "47630", // Music & video retail
  "47640", // Sports goods retail
  "47650", // Games / toys retail
  "47710", // Clothing retail
  "47720", // Footwear & leather retail
  "47730", // Dispensing chemists
  "47740", // Medical / orthopaedic goods retail
  "47750", // Cosmetics & toiletries retail
  "47760", // Flowers / plants retail
  "47770", // Watches & jewellery retail — extremely high priority
  "47789", // Other retail nec
  "47910", // Online / mail order retail
  "47990", // Other retail nec
]);

const AUTOMOTIVE_SIC_CODES = new Set([
  "45111", // Dealerships — new cars
  "45112", // Dealerships — used cars
  "45190", // Other motor vehicles
  "45200", // Maintenance and repair of motor vehicles
  "45310", // Wholesale of motor vehicle parts
  "45320", // Retail of motor vehicle parts
  "45400", // Sale / maintenance of motorcycles
]);

const WAREHOUSE_SIC_CODES = new Set([
  "52100", // Warehousing & storage
  "52210", // Freight transport — road
  "52290", // Other transport support
  "52241", // Cargo handling — sea/inland
  "49410", // Road freight transport
]);

const HOSPITALITY_SIC_CODES = new Set([
  "55100", // Hotels
  "55201", // Holiday centres / villages
  "55209", // Other holiday accommodation
  "55300", // Camping / caravan parks
  "56101", // Licenced restaurants
  "56102", // Unlicenced restaurants / cafes
  "56103", // Takeaway food shops
  "56210", // Event catering
  "56301", // Licenced clubs
  "56302", // Public houses / bars
]);

const HEALTHCARE_SIC_CODES = new Set([
  "86100", // Hospital activities
  "86210", // General medical practice
  "86220", // Specialist medical practice
  "86230", // Dental practice
  "86900", // Other human health activities
  "87100", // Residential nursing care
  "87200", // Residential care for learning difficulties
  "87300", // Residential care for elderly / disabled
]);

type SicCategory =
  | "premium_retail"
  | "automotive"
  | "warehouse"
  | "hospitality"
  | "healthcare"
  | "standard";

function categorizeSic(sicCodes?: string[]): SicCategory {
  if (!sicCodes || sicCodes.length === 0) return "standard";
  for (const code of sicCodes) {
    if (PREMIUM_SIC_CODES.has(code)) return "premium_retail";
    if (AUTOMOTIVE_SIC_CODES.has(code)) return "automotive";
    if (WAREHOUSE_SIC_CODES.has(code)) return "warehouse";
    if (HOSPITALITY_SIC_CODES.has(code)) return "hospitality";
    if (HEALTHCARE_SIC_CODES.has(code)) return "healthcare";
  }
  return "standard";
}

// ─────────────────────────────────────────────────────────────────
// Scoring Algorithm (0–100)
// ─────────────────────────────────────────────────────────────────

const SCORE_WEIGHTS = {
  // Crime signals (max 30 pts)
  crime_high: 30,    // 9+ burglaries in radius
  crime_medium: 18,  // 4–8 burglaries
  crime_low: 8,      // 1–3 burglaries

  // SIC category (max 25 pts)
  sic_premium_retail: 25,
  sic_automotive: 22,
  sic_warehouse: 20,
  sic_hospitality: 18,
  sic_healthcare: 15,
  sic_standard: 8,

  // Company freshness (max 10 pts)
  new_business: 10,     // < 2 years
  recent_business: 5,   // 2–5 years

  // Status (max 10 pts)
  active_company: 10,

  // Premises type (max 15 pts)
  commercial_unit: 15,

  // Engagement bonus (max 10 pts)
  unvisited: 10,
} as const;

function getCompanyAgeYears(incorporationDate: string): number {
  const inc = new Date(incorporationDate);
  const now = new Date();
  return (now.getTime() - inc.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
}

export function scoreLead(input: ScoringInput): ScoringOutput {
  let score = 0;

  // 1. Crime signal
  const burglaries = input.recent_burglaries_count;
  if (burglaries >= 9) score += SCORE_WEIGHTS.crime_high;
  else if (burglaries >= 4) score += SCORE_WEIGHTS.crime_medium;
  else if (burglaries >= 1) score += SCORE_WEIGHTS.crime_low;

  // 2. SIC category
  const category = categorizeSic(input.sic_codes);
  const sicScoreMap: Record<SicCategory, number> = {
    premium_retail: SCORE_WEIGHTS.sic_premium_retail,
    automotive: SCORE_WEIGHTS.sic_automotive,
    warehouse: SCORE_WEIGHTS.sic_warehouse,
    hospitality: SCORE_WEIGHTS.sic_hospitality,
    healthcare: SCORE_WEIGHTS.sic_healthcare,
    standard: SCORE_WEIGHTS.sic_standard,
  };
  score += sicScoreMap[category];

  // 3. Company age
  const ageYears = getCompanyAgeYears(input.incorporation_date);
  if (ageYears < 2) score += SCORE_WEIGHTS.new_business;
  else if (ageYears < 5) score += SCORE_WEIGHTS.recent_business;

  // 4. Active status
  if (input.company_status.toLowerCase() === "active") {
    score += SCORE_WEIGHTS.active_company;
  }

  // 5. Premises type
  if (input.is_commercial_unit) score += SCORE_WEIGHTS.commercial_unit;

  // 6. Engagement
  if (input.visit_status === "unvisited") score += SCORE_WEIGHTS.unvisited;

  // Clamp to 0–100
  const lead_score = Math.min(100, Math.max(0, score));

  // ─── Risk Tag ───────────────────────────────
  let risk_profile_tag: RiskTag = "STANDARD";
  if (burglaries >= 9) risk_profile_tag = "HIGH_CRIME_ZONE";
  else if (burglaries >= 4) risk_profile_tag = "ELEVATED_CRIME";
  else if (category === "premium_retail") risk_profile_tag = "PREMIUM_RETAIL";
  else if (category === "automotive") risk_profile_tag = "AUTOMOTIVE";
  else if (category === "warehouse") risk_profile_tag = "INDUSTRIAL_TARGET";
  else if (category === "hospitality") risk_profile_tag = "HOSPITALITY";
  else if (category === "healthcare") risk_profile_tag = "HEALTHCARE";
  else if (ageYears < 2) risk_profile_tag = "NEW_BUSINESS";

  // ─── Sales Hook ────────────────────────────
  const sales_hook = buildSalesHook(
    risk_profile_tag,
    burglaries,
    category,
    ageYears
  );

  return { lead_score, risk_profile_tag, sales_hook };
}

function buildSalesHook(
  tag: RiskTag,
  burglaries: number,
  category: SicCategory,
  ageYears: number
): string {
  const hooks: Record<RiskTag, string> = {
    HIGH_CRIME_ZONE: `This area recorded ${burglaries} burglaries in the past 12 months — one of Liverpool's highest-risk zones. Position CCTV + intruder alarm as essential, not optional.`,
    ELEVATED_CRIME: `${burglaries} burglaries reported nearby. Lead with crime trend data — offer a free vulnerability survey to get through the door.`,
    PREMIUM_RETAIL: `Retail premises with high-value stock. CCTV with AI retail analytics (theft detection, footfall) is a strong upsell beyond basic intruder alarms.`,
    AUTOMOTIVE: `Car dealerships hold significant overnight stock value. Remote CCTV monitoring + perimeter detection is the key pitch — insurance premium reduction is a compelling hook.`,
    INDUSTRIAL_TARGET: `Warehouses and logistics sites are prime targets for organised commercial burglary. Pitch perimeter CCTV + 24/7 monitoring on a recurring contract.`,
    HOSPITALITY: `Hospitality venues run late nights and handle cash. CCTV with cloud access lets owners monitor remotely — pitch the peace-of-mind angle.`,
    HEALTHCARE: `Healthcare premises hold pharmaceuticals and sensitive data. Pitch access control + audit trail compliance as a regulatory requirement.`,
    NEW_BUSINESS: `Business registered ${Math.round(ageYears * 12)} months ago — founders are in fit-out mode and likely haven't locked down security yet. Be first through the door.`,
    STANDARD: `Standard commercial premises. Lead with a free security audit and local crime statistics to create urgency.`,
  };
  return hooks[tag];
}

// ─────────────────────────────────────────────────────────────────
// SIC Code → Human-readable description
// ─────────────────────────────────────────────────────────────────

const SIC_DESCRIPTIONS: Record<string, string> = {
  "47110": "Supermarket / Convenience Store",
  "47190": "General Retail",
  "47210": "Off Licence / Newsagent",
  "47300": "Fuel Station",
  "47410": "Electronics Retail",
  "47770": "Jewellery & Watches",
  "45111": "New Car Dealership",
  "45112": "Used Car Dealership",
  "45200": "Vehicle Repair & Maintenance",
  "52100": "Warehousing & Storage",
  "49410": "Road Freight Transport",
  "55100": "Hotel",
  "56101": "Licensed Restaurant",
  "56301": "Licensed Club",
  "56302": "Public House / Bar",
  "86210": "General Medical Practice",
  "86230": "Dental Practice",
  "87100": "Residential Nursing Care",
};

export function getSicDescription(sicCodes?: string[]): string {
  if (!sicCodes || sicCodes.length === 0) return "Business";
  for (const code of sicCodes) {
    if (SIC_DESCRIPTIONS[code]) return SIC_DESCRIPTIONS[code];
  }
  return `SIC ${sicCodes[0]}`;
}
