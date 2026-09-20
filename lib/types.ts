// ─────────────────────────────────────────────
// Core Domain Types
// ─────────────────────────────────────────────

export type VisitStatus =
  | "unvisited"
  | "attempted_no_answer"
  | "pitched_follow_up"
  | "not_interested"
  | "spoke_to_owner"
  | "gatekeeper_blocked"
  | "ghost_address";

export type RiskTag =
  | "HIGH_CRIME_ZONE"
  | "ELEVATED_CRIME"
  | "NEW_BUSINESS"
  | "PREMIUM_RETAIL"
  | "INDUSTRIAL_TARGET"
  | "AUTOMOTIVE"
  | "HOSPITALITY"
  | "HEALTHCARE"
  | "STANDARD";

export interface Lead {
  id: string;
  company_number: string;
  company_name: string;
  company_status: string;
  incorporation_date: string; // ISO date string
  sic_codes: string[] | null;
  sic_description: string | null;

  // Address
  address_line_1: string | null;
  locality: string | null;
  postcode: string;
  is_residential_or_admin: boolean;
  is_commercial_unit: boolean;

  // Geolocation
  lat: number | null;
  lng: number | null;

  // Scoring & Intelligence
  lead_score: number;
  risk_profile_tag: RiskTag | null;
  sales_hook: string | null;
  recent_burglaries_count: number;
  crime_burglary_count: number;
  crime_robbery_count: number;
  crime_vehicle_count: number;
  crime_theft_person_count: number;
  crime_other_theft_count: number;
  crime_arson_count: number;
  crime_shoplifting_count: number;
  crime_asb_count: number;
  crime_violent_count: number;

  // Visit Tracking
  visited: boolean;
  visit_status: VisitStatus;
  revisit_date: string | null; // ISO datetime string
  notes: string | null;

  // Enrichment Data
  director_name: string | null;
  director_role: string | null;
  phone: string | null;
  website: string | null;
  social_links: string[] | null;

  created_at: string;
}

// ─────────────────────────────────────────────
// API Payload Types
// ─────────────────────────────────────────────

export interface LeadFilter {
  bbox?: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  postcodes?: string[]; // Array of outcodes
  radius_km?: number;
  visit_status?: VisitStatus | "all"; // Legacy single status
  visit_statuses?: VisitStatus[]; // Array of statuses from Drawer
  min_score?: number;
  unvisited_only?: boolean;
  limit?: number;
  offset?: number;
  
  // New Drawer Filters
  commercial_only?: boolean;
  company_age?: string;
  max_age_days?: number | null;
  min_burglaries?: number;
  risk_tags?: string[];
  sort_by?: string;
  searchQuery?: string;
  
  // Contact & Enrichment
  has_phone?: boolean;
  has_website?: boolean;
  has_director?: boolean;
  
  // Pipeline & Revisit
  follow_up_due?: boolean;
  
  // Score Tiers
  score_tier?: "hot" | "warm" | "cold";
}

export interface UpdateLeadPayload {
  visit_status?: VisitStatus;
  visited?: boolean;
  notes?: string;
  revisit_date?: string | null;
}

// ─────────────────────────────────────────────
// Companies House API Types
// ─────────────────────────────────────────────

export interface CHCompany {
  company_number: string;
  title: string; // company name
  company_status: string;
  date_of_creation: string;
  sic_codes?: string[];
  registered_office_address?: {
    address_line_1?: string;
    locality?: string;
    postal_code?: string;
  };
}

export interface CHSearchResponse {
  items: CHCompany[];
  total_results: number;
  items_per_page: number;
  start_index: number;
}

// ─────────────────────────────────────────────
// postcodes.io Types
// ─────────────────────────────────────────────

export interface PostcodeResult {
  postcode: string;
  latitude: number;
  longitude: number;
  admin_district: string | null;
}

export interface PostcodeLookupResponse {
  status: number;
  result: PostcodeResult | null;
}

export interface BulkPostcodeResponse {
  status: number;
  result: Array<{
    query: string;
    result: PostcodeResult | null;
  }>;
}

// ─────────────────────────────────────────────
// data.police.uk Types
// ─────────────────────────────────────────────

export interface CrimeRecord {
  category: string;
  location_type: string;
  location: {
    latitude: string;
    longitude: string;
    street: {
      id: number;
      name: string;
    };
  };
  context: string;
  outcome_status: {
    category: string;
    date: string;
  } | null;
  persistent_id: string;
  id: number;
  month: string;
}

// ─────────────────────────────────────────────
// Scoring Types
// ─────────────────────────────────────────────

export interface ScoringInput {
  sic_codes?: string[];
  incorporation_date: string;
  company_status: string;
  is_commercial_unit: boolean;
  recent_burglaries_count: number;
  crime_burglary_count?: number;
  crime_robbery_count?: number;
  crime_vehicle_count?: number;
  crime_theft_person_count?: number;
  crime_other_theft_count?: number;
  crime_arson_count?: number;
  crime_shoplifting_count?: number;
  crime_asb_count?: number;
  crime_violent_count?: number;
  visit_status: VisitStatus;
}

export interface ScoringOutput {
  lead_score: number;
  risk_profile_tag: RiskTag;
  sales_hook: string;
}
