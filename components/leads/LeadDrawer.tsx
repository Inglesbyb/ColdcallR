"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Drawer } from "vaul";
import {
  MapPin,
  Building2,
  Calendar,
  AlertTriangle,
  ExternalLink,
  X,
  Lightbulb,
  CalendarClock,
  User,
  Phone,
  Globe,
  MessageCircle,
  Copy,
  CheckCheck,
  ShieldAlert,
  Crosshair,
  Briefcase,
  Clock,
  ChevronRight,
} from "lucide-react";
import { format, parseISO, formatDistanceToNowStrict } from "date-fns";
import { ScoreBadge, RiskTagBadge } from "@/components/leads/ScoreBadge";
import { VisitStatusPicker } from "@/components/leads/VisitStatusPicker";
import { Button } from "@/components/ui/button";
import type { Lead, VisitStatus } from "@/lib/types";

// ─── SIC plain-text lookup (subset — extend as needed) ────────────
const SIC_DESCRIPTIONS: Record<string, string> = {
  "47110": "Supermarket / Convenience Store",
  "47190": "General Retail",
  "47210": "Off Licence / Newsagent",
  "47220": "Specialist Food Retailer",
  "47260": "Tobacconist",
  "47300": "Fuel Station",
  "47410": "Electronics Retail",
  "47430": "Audio / Photo / Video Retail",
  "47540": "Electrical Household Appliances",
  "47590": "Furniture & Household Goods",
  "47710": "Clothing Retail",
  "47720": "Footwear & Leather Goods",
  "47730": "Dispensing Chemist",
  "47750": "Cosmetics & Toiletries",
  "47770": "Jewellery & Watches",
  "47789": "Specialist Retail (Other)",
  "47910": "Online / Mail-Order Retail",
  "47990": "Other Retail",
  "45111": "New Car Dealership",
  "45112": "Used Car Dealership",
  "45200": "Vehicle Repair & Maintenance",
  "45310": "Motor Parts Wholesale",
  "45320": "Motor Parts Retail",
  "45400": "Motorcycle Sales & Service",
  "52100": "Warehousing & Storage",
  "52210": "Road Freight Support",
  "52290": "Transport Support (Other)",
  "49410": "Road Freight Transport",
  "55100": "Hotel",
  "55201": "Holiday Centre / Village",
  "56101": "Licensed Restaurant",
  "56102": "Café / Unlicensed Restaurant",
  "56103": "Takeaway Food Shop",
  "56210": "Event Catering",
  "56301": "Licensed Club",
  "56302": "Public House / Bar",
  "86100": "Hospital",
  "86210": "General Medical Practice",
  "86220": "Specialist Medical Practice",
  "86230": "Dental Practice",
  "86900": "Other Health Activities",
  "87100": "Residential Nursing Care",
  "87200": "Residential Care (Learning Difficulties)",
  "87300": "Residential Care (Elderly / Disabled)",
};

// ─── Crime threat chips by risk tag ───────────────────────────────
const CRIME_CHIPS: Record<string, { label: string; icon: string; color: string }[]> = {
  HIGH_CRIME_ZONE: [
    { label: "Burglary", icon: "🔓", color: "bg-red-950/60 border-red-700/60 text-red-300" },
    { label: "Criminal Damage", icon: "💥", color: "bg-orange-950/60 border-orange-700/60 text-orange-300" },
    { label: "Vehicle Crime", icon: "🚗", color: "bg-amber-950/60 border-amber-700/60 text-amber-300" },
  ],
  ELEVATED_CRIME: [
    { label: "Burglary", icon: "🔓", color: "bg-orange-950/60 border-orange-700/60 text-orange-300" },
    { label: "Shoplifting", icon: "🛒", color: "bg-amber-950/60 border-amber-700/60 text-amber-300" },
  ],
  PREMIUM_RETAIL: [
    { label: "Retail Theft", icon: "🛒", color: "bg-amber-950/60 border-amber-700/60 text-amber-300" },
    { label: "Smash & Grab", icon: "💎", color: "bg-red-950/60 border-red-700/60 text-red-300" },
  ],
  AUTOMOTIVE: [
    { label: "Vehicle Crime", icon: "🚗", color: "bg-blue-950/60 border-blue-700/60 text-blue-300" },
    { label: "Parts Theft", icon: "🔧", color: "bg-slate-800/60 border-slate-700/60 text-slate-300" },
  ],
  INDUSTRIAL_TARGET: [
    { label: "Organised Burglary", icon: "📦", color: "bg-orange-950/60 border-orange-700/60 text-orange-300" },
    { label: "Copper/Metal Theft", icon: "⚙️", color: "bg-amber-950/60 border-amber-700/60 text-amber-300" },
  ],
  HOSPITALITY: [
    { label: "Cash Handling Risk", icon: "💵", color: "bg-green-950/60 border-green-700/60 text-green-300" },
    { label: "CCTV Compliance", icon: "📷", color: "bg-slate-800/60 border-slate-700/60 text-slate-300" },
  ],
  HEALTHCARE: [
    { label: "Drug Theft Risk", icon: "💊", color: "bg-blue-950/60 border-blue-700/60 text-blue-300" },
    { label: "Data Security", icon: "🔐", color: "bg-indigo-950/60 border-indigo-700/60 text-indigo-300" },
  ],
  NEW_BUSINESS: [
    { label: "No Security Installed", icon: "🚧", color: "bg-yellow-950/60 border-yellow-700/60 text-yellow-300" },
    { label: "High Conversion Rate", icon: "✅", color: "bg-green-950/60 border-green-700/60 text-green-300" },
  ],
  STANDARD: [
    { label: "General Risk", icon: "🏢", color: "bg-slate-800/60 border-slate-700/60 text-slate-300" },
  ],
};

// ─── Target system by category ────────────────────────────────────
function getTargetSystem(tag: string | null): string {
  if (!tag) return "CCTV + Intruder Alarm";
  const map: Record<string, string> = {
    HIGH_CRIME_ZONE: "CCTV + Intruder Alarm + 24/7 Monitoring",
    ELEVATED_CRIME: "CCTV + Intruder Alarm",
    PREMIUM_RETAIL: "CCTV with AI Retail Analytics + EAS",
    AUTOMOTIVE: "Perimeter CCTV + Motion Detection",
    INDUSTRIAL_TARGET: "Perimeter CCTV + 24/7 Monitoring Contract",
    HOSPITALITY: "CCTV with Remote Access + Panic Alarms",
    HEALTHCARE: "Access Control + Audit Trail + CCTV",
    NEW_BUSINESS: "Starter Security Package (CCTV + Alarm)",
    STANDARD: "CCTV + Intruder Alarm",
  };
  return map[tag] ?? "CCTV + Intruder Alarm";
}

// ─── Officer type returned from API ───────────────────────────────
interface Officer {
  name: string;
  role: string;
  appointed_on: string | null;
  nationality: string | null;
}

// ─────────────────────────────────────────────────────────────────
// Component props
// ─────────────────────────────────────────────────────────────────
interface LeadDrawerProps {
  lead: Lead | null;
  open: boolean;
  onClose: () => void;
  onLeadUpdate: (updatedLead: Lead) => void;
}

// ─────────────────────────────────────────────────────────────────
// Small sub-components
// ─────────────────────────────────────────────────────────────────

function OfficerSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      {[1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/40">
          <div className="w-8 h-8 rounded-full bg-slate-700/50 flex-shrink-0" />
          <div className="space-y-1.5 flex-1">
            <div className="h-3.5 bg-slate-700/50 rounded w-2/5" />
            <div className="h-3 bg-slate-700/50 rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function OfficerCard({ officer }: { officer: Officer }) {
  const ageLabel = officer.appointed_on
    ? formatDistanceToNowStrict(parseISO(officer.appointed_on), { addSuffix: false })
    : null;

  const tenure = officer.appointed_on
    ? parseISO(officer.appointed_on).getFullYear() <=
      new Date().getFullYear() - 5
      ? "Long-term Director"
      : `Appointed ${ageLabel} ago`
    : null;

  const firstName = officer.name.split(" ")[0];

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-indigo-950/40 border border-indigo-800/30">
      <div className="w-8 h-8 rounded-full bg-indigo-900/60 flex items-center justify-center flex-shrink-0">
        <User className="w-4 h-4 text-indigo-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{officer.name}</p>
        <p className="text-xs text-indigo-400 capitalize">{officer.role.replace(/-/g, " ")}</p>
        {tenure && (
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {tenure}
          </p>
        )}
        <p className="text-xs text-indigo-400/70 italic mt-1">
          💡 Ask for {firstName} at the counter
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Main LeadDrawer
// ─────────────────────────────────────────────────────────────────
export function LeadDrawer({ lead, open, onClose, onLeadUpdate }: LeadDrawerProps) {
  const [notes, setNotes] = useState(lead?.notes ?? "");
  const [revisitDate, setRevisitDate] = useState(
    lead?.revisit_date ? lead.revisit_date.slice(0, 10) : ""
  );
  const [savingNotes, setSavingNotes] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [copied, setCopied] = useState(false);

  // Officers state
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [officersLoading, setOfficersLoading] = useState(false);
  const [officersFetched, setOfficersFetched] = useState<string | null>(null); // track by company_number

  const notesTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Sync local state when lead changes ──────────────────────────
  const prevLeadId = useRef<string | null>(null);
  if (lead && lead.id !== prevLeadId.current) {
    prevLeadId.current = lead.id;
    setNotes(lead.notes ?? "");
    setRevisitDate(lead.revisit_date ? lead.revisit_date.slice(0, 10) : "");
  }

  // ── Auto-enrich (DuckDuckGo) if not yet done ────────────────────
  useEffect(() => {
    if (lead && open && lead.director_name === null) {
      setIsEnriching(true);
      fetch(`/api/leads/${lead.id}/enrich`, { method: "POST" })
        .then((res) => res.json())
        .then((data) => {
          if (data.lead) onLeadUpdate(data.lead);
        })
        .catch(console.error)
        .finally(() => setIsEnriching(false));
    }
  }, [lead?.id, open]);

  // ── Fetch officers from Companies House ─────────────────────────
  useEffect(() => {
    if (!lead || !open) return;
    if (officersFetched === lead.company_number) return; // already fetched for this company

    setOfficersLoading(true);
    setOfficers([]);
    setOfficersFetched(null);

    fetch(`/api/leads/${lead.company_number}/officers`)
      .then((res) => res.json())
      .then((data) => {
        setOfficers(data.officers ?? []);
        setOfficersFetched(lead.company_number);
      })
      .catch(() => {
        setOfficers([]);
        setOfficersFetched(lead.company_number);
      })
      .finally(() => setOfficersLoading(false));
  }, [lead?.company_number, open]);

  // ── API helpers ─────────────────────────────────────────────────
  const patchLead = useCallback(
    async (payload: Partial<Lead>) => {
      if (!lead) return;
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const { lead: updated } = await res.json();
        onLeadUpdate(updated);
      }
    },
    [lead, onLeadUpdate]
  );

  const handleStatusChange = useCallback(
    async (status: VisitStatus) => {
      await patchLead({ visit_status: status });
    },
    [patchLead]
  );

  const handleNotesChange = (value: string) => {
    setNotes(value);
    if (notesTimeout.current) clearTimeout(notesTimeout.current);
    notesTimeout.current = setTimeout(async () => {
      setSavingNotes(true);
      await patchLead({ notes: value });
      setSavingNotes(false);
    }, 1500);
  };

  const handleRevisitDateChange = async (value: string) => {
    setRevisitDate(value);
    await patchLead({ revisit_date: value ? new Date(value).toISOString() : null });
  };

  // ── Copy address ────────────────────────────────────────────────
  const handleCopyAddress = () => {
    if (!lead) return;
    const addr = [lead.address_line_1, lead.locality, lead.postcode]
      .filter(Boolean)
      .join(", ");
    navigator.clipboard.writeText(addr).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ── URLs ────────────────────────────────────────────────────────
  const googleMapsUrl = lead
    ? lead.lat && lead.lng
      ? `https://www.google.com/maps/dir/?api=1&destination=${lead.lat},${lead.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${lead.address_line_1 ?? ""} ${lead.postcode}`.trim()
        )}`
    : "#";

  const streetViewUrl = lead
    ? `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lead.lat},${lead.lng}`
    : "#";

  // ── Derived display values ───────────────────────────────────────
  const companyAgeLabel = lead?.incorporation_date
    ? formatDistanceToNowStrict(parseISO(lead.incorporation_date), { addSuffix: false })
    : null;

  const crimeChips =
    CRIME_CHIPS[lead?.risk_profile_tag ?? "STANDARD"] ?? CRIME_CHIPS["STANDARD"];

  const targetSystem = getTargetSystem(lead?.risk_profile_tag ?? null);

  // SIC descriptions
  const sicWithLabels = (lead?.sic_codes ?? []).map((code) => ({
    code,
    label: SIC_DESCRIPTIONS[code] ?? `SIC ${code}`,
  }));

  // ─────────────────────────────────────────────────────────────────
  return (
    <Drawer.Root
      open={open}
      onOpenChange={(o) => !o && onClose()}
      snapPoints={[0.5, 0.95]}
      shouldScaleBackground={false}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40" />

        <Drawer.Content
          className="fixed bottom-0 left-0 right-0 z-[9999] pointer-events-auto flex flex-col rounded-t-2xl bg-slate-900 border-t border-slate-700/60 shadow-2xl max-h-[95vh] focus:outline-none"
          aria-label={`Lead detail for ${lead?.company_name}`}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-10 h-1 rounded-full bg-slate-600" />
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-700 text-slate-400 hover:text-white hover:bg-slate-600 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          {!lead ? (
            <div className="flex items-center justify-center h-40 text-slate-500">
              No lead selected
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto overscroll-contain pb-safe">

              {/* ═══════════════════════════════════════
                  SECTION 1 — Header & Fast Metrics
              ═══════════════════════════════════════ */}
              <div className="px-4 pt-2 pb-4 border-b border-slate-700/60">
                {/* Name + Score */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold text-white leading-tight">
                      {lead.company_name}
                    </h2>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {/* Active status pill */}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-900/50 border border-green-700/50 text-green-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                        {lead.company_status?.charAt(0).toUpperCase() +
                          (lead.company_status?.slice(1) ?? "")}
                      </span>
                      {/* Age */}
                      {companyAgeLabel && (
                        <span className="text-xs text-slate-500">
                          Est. {companyAgeLabel} ago
                        </span>
                      )}
                    </div>
                  </div>
                  <ScoreBadge score={lead.lead_score} size="lg" />
                </div>

                {/* Risk tag */}
                {lead.risk_profile_tag && (
                  <div className="mb-3">
                    <RiskTagBadge tag={lead.risk_profile_tag} />
                  </div>
                )}

                {/* Address + Copy */}
                <div className="flex items-start gap-2 text-sm text-slate-300 mb-3">
                  <MapPin className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    {lead.address_line_1 && <p>{lead.address_line_1}</p>}
                    <p>
                      {lead.locality ? `${lead.locality}, ` : ""}
                      {lead.postcode}
                    </p>
                  </div>
                  <button
                    onClick={handleCopyAddress}
                    className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-800 border border-slate-700 text-xs text-slate-400 hover:text-white hover:border-slate-500 transition-colors flex-shrink-0"
                    aria-label="Copy address"
                  >
                    {copied ? (
                      <>
                        <CheckCheck className="w-3 h-3 text-green-400" />
                        <span className="text-green-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        Copy
                      </>
                    )}
                  </button>
                </div>

                {/* Action Bar */}
                <div
                  className="flex gap-2"
                  onPointerDownCapture={(e) => e.stopPropagation()}
                  onClickCapture={(e) => e.stopPropagation()}
                >
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1"
                  >
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full gap-2 bg-sky-600 hover:bg-sky-500 text-white border-0"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      Navigate
                    </Button>
                  </a>
                  <a
                    href={streetViewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1"
                  >
                    <Button variant="outline" size="sm" className="w-full gap-2">
                      <ExternalLink className="w-3.5 h-3.5" />
                      Street View
                    </Button>
                  </a>
                  {lead.phone && (
                    <a
                      href={`tel:${lead.phone.replace(/\s+/g, "")}`}
                      className="flex-shrink-0"
                    >
                      <Button variant="outline" size="sm" className="gap-2 text-green-400 border-green-800/60 hover:bg-green-950/40">
                        <Phone className="w-3.5 h-3.5" />
                        Call
                      </Button>
                    </a>
                  )}
                </div>
              </div>

              {/* Intelligence panels */}
              <div className="px-4 py-4 space-y-4">

                {/* ═══════════════════════════════════════
                    SECTION 2 — 10-Second Pitch Brief
                ═══════════════════════════════════════ */}
                <div className="rounded-xl bg-slate-800/80 border border-slate-700/60 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-lg bg-blue-900/50">
                      <Lightbulb className="w-4 h-4 text-blue-400" />
                    </div>
                    <h3 className="text-sm font-bold text-white tracking-tight">
                      10-Second Pitch Brief
                    </h3>
                  </div>
                  <ul className="space-y-2.5 text-sm">
                    {/* Primary Vulnerability */}
                    <li className="flex items-start gap-2">
                      <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">
                          Primary Vulnerability
                        </span>
                        <p className="text-slate-200 mt-0.5">
                          {lead.risk_profile_tag?.replace(/_/g, " ")} area
                          {lead.recent_burglaries_count > 0
                            ? ` — ${lead.recent_burglaries_count} burglaries in past 6 months`
                            : ""}
                        </p>
                      </div>
                    </li>
                    {/* Opening Angle */}
                    {lead.sales_hook && (
                      <li className="flex items-start gap-2">
                        <MessageCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">
                            Opening Angle
                          </span>
                          <p className="text-slate-200 mt-0.5 leading-relaxed">
                            {lead.sales_hook}
                          </p>
                        </div>
                      </li>
                    )}
                    {/* Target System */}
                    <li className="flex items-start gap-2">
                      <Crosshair className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">
                          Target System
                        </span>
                        <p className="text-teal-300 font-medium mt-0.5">{targetSystem}</p>
                      </div>
                    </li>
                  </ul>
                </div>

                {/* ═══════════════════════════════════════
                    SECTION 3 — Decision Makers
                ═══════════════════════════════════════ */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-sm font-semibold text-slate-300">
                      Decision Makers
                    </h3>
                    {officersLoading && (
                      <span className="text-xs text-slate-500 animate-pulse ml-auto">
                        Loading…
                      </span>
                    )}
                  </div>

                  {officersLoading ? (
                    <OfficerSkeleton />
                  ) : officers.length > 0 ? (
                    <div className="space-y-2">
                      {officers.map((officer, idx) => (
                        <OfficerCard key={idx} officer={officer} />
                      ))}
                    </div>
                  ) : isEnriching ? (
                    <OfficerSkeleton />
                  ) : (
                    /* Fallback: show single director from enrichment data */
                    lead.director_name ? (
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-indigo-950/40 border border-indigo-800/30">
                        <div className="w-8 h-8 rounded-full bg-indigo-900/60 flex items-center justify-center">
                          <User className="w-4 h-4 text-indigo-400" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{lead.director_name}</p>
                          <p className="text-xs text-indigo-400 capitalize">{lead.director_role ?? "Director"}</p>
                          <p className="text-xs text-indigo-400/70 italic mt-1">
                            💡 Ask for {lead.director_name.split(" ")[0]} at the counter
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-600 italic px-1">
                        No officer data available from Companies House
                      </p>
                    )
                  )}
                </div>

                {/* ═══════════════════════════════════════
                    SECTION 4 — Commercial Risk Profile
                ═══════════════════════════════════════ */}
                <div className="rounded-xl bg-red-950/30 border border-red-800/30 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <h3 className="text-sm font-semibold text-red-300">
                      Commercial Risk Profile
                    </h3>
                  </div>

                  {/* Crime count headline */}
                  {lead.recent_burglaries_count > 0 && (
                    <p className="text-sm text-slate-300 mb-3">
                      <span className="font-bold text-red-300">
                        {lead.recent_burglaries_count}{" "}
                        {lead.recent_burglaries_count === 1
                          ? "burglary/theft"
                          : "burglaries/thefts"}
                      </span>{" "}
                      recorded within 500m in the past 6 months.
                    </p>
                  )}

                  {/* Crime type chips */}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {crimeChips.map((chip) => (
                      <span
                        key={chip.label}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-medium ${chip.color}`}
                      >
                        {chip.icon} {chip.label}
                      </span>
                    ))}
                  </div>

                  {/* Risk tag */}
                  {lead.risk_profile_tag && (
                    <div className="mt-2">
                      <RiskTagBadge tag={lead.risk_profile_tag} />
                    </div>
                  )}
                </div>

                {/* ═══════════════════════════════════════
                    SECTION 5 — Industry & SIC Codes
                ═══════════════════════════════════════ */}
                {sicWithLabels.length > 0 && (
                  <div className="rounded-xl bg-slate-800/60 border border-slate-700/40 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Briefcase className="w-4 h-4 text-slate-400" />
                      <h3 className="text-sm font-semibold text-slate-300">
                        Industry & SIC Codes
                      </h3>
                    </div>
                    <div className="space-y-1.5">
                      {sicWithLabels.map(({ code, label }) => (
                        <div
                          key={code}
                          className="flex items-center justify-between gap-2 text-xs"
                        >
                          <span className="text-slate-200">{label}</span>
                          <span className="text-slate-500 font-mono bg-slate-900/50 px-1.5 py-0.5 rounded">
                            {code}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ═══════════════════════════════════════
                    SECTION 6 — Company Info
                ═══════════════════════════════════════ */}
                <div className="rounded-xl bg-slate-800/60 border border-slate-700/40 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <h3 className="text-sm font-semibold text-slate-300">Company Info</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-slate-500">Status</p>
                      <p className="text-slate-200 font-medium capitalize">
                        {lead.company_status}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Incorporated</p>
                      <p className="text-slate-200 font-medium">
                        {format(parseISO(lead.incorporation_date), "MMM yyyy")}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Company No.</p>
                      <p className="text-slate-200 font-medium font-mono">
                        {lead.company_number}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Age</p>
                      <p className="text-slate-200 font-medium">
                        {companyAgeLabel ?? "—"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* ═══════════════════════════════════════
                    SECTION 7 — Contact links
                ═══════════════════════════════════════ */}
                {(lead.website ||
                  (lead.social_links && lead.social_links.length > 0)) && (
                  <div className="flex flex-wrap gap-2">
                    {lead.website && (
                      <a
                        href={lead.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Globe className="w-4 h-4" />
                        <span className="text-sm font-medium">Website</span>
                        <ChevronRight className="w-3 h-3 text-slate-500" />
                      </a>
                    )}
                    {lead.social_links?.map((link, idx) => {
                      const isFb = link.includes("facebook");
                      const isInsta = link.includes("instagram");
                      const label = isFb
                        ? "Facebook"
                        : isInsta
                        ? "Instagram"
                        : "Social";
                      return (
                        <a
                          key={idx}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span className="text-sm font-medium">{label}</span>
                        </a>
                      );
                    })}
                  </div>
                )}

                {/* ═══════════════════════════════════════
                    SECTION 8 — Visit tracking
                ═══════════════════════════════════════ */}
                <VisitStatusPicker
                  currentStatus={lead.visit_status}
                  onStatusChange={handleStatusChange}
                />

                {/* Revisit Date */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    <CalendarClock className="w-3.5 h-3.5" />
                    Schedule Revisit
                  </label>
                  <input
                    type="date"
                    value={revisitDate}
                    onChange={(e) => handleRevisitDateChange(e.target.value)}
                    className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 [color-scheme:dark]"
                  />
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-400 uppercase tracking-wider">
                      <Calendar className="w-3.5 h-3.5" />
                      Notes
                    </label>
                    {savingNotes && (
                      <span className="text-[10px] text-slate-500 animate-pulse">
                        Saving…
                      </span>
                    )}
                  </div>
                  <textarea
                    value={notes}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    placeholder="Visit notes, contacts, quotes given…"
                    rows={4}
                    className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                  />
                </div>

                {/* Bottom padding for safe area */}
                <div className="h-6" />
              </div>
            </div>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
