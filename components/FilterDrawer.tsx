"use client";

import { useState, useEffect } from "react";
import { Drawer } from "vaul";
import {
  X, AlertTriangle, SlidersHorizontal, Check, MapPin, Phone,
  Building2, TrendingUp, ShieldAlert, Car, ShoppingCart, Flame,
  UserX, Frown, Wallet, PersonStanding,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { LeadFilter } from "@/lib/types";

interface FilterDrawerProps {
  open: boolean;
  onClose: () => void;
  filter: LeadFilter;
  onApplyFilters: (filter: Partial<LeadFilter>) => void;
}

export const LIVERPOOL_OUTCODES = [
  { group: "Liverpool — City Centre & Waterfront", codes: ["L1", "L2", "L3", "L8"] },
  { group: "Liverpool — North & Docks", codes: ["L4", "L5", "L6", "L9", "L20"] },
  { group: "Liverpool — East & Inner Suburbs", codes: ["L7", "L11", "L12", "L13", "L14"] },
  { group: "Liverpool — South Suburbs", codes: ["L15", "L16", "L17", "L18", "L19"] },
  { group: "Liverpool — South & Airport", codes: ["L24", "L25", "L26", "L27"] },
  { group: "Sefton / North Merseyside", codes: ["L10", "L21", "L22", "L23", "L29", "L30", "L31", "L37", "L38", "PR8", "PR9"] },
  { group: "Knowsley & Prescot", codes: ["L28", "L32", "L33", "L34", "L35", "L36"] },
  { group: "Wirral", codes: ["CH41", "CH42", "CH43", "CH44", "CH45", "CH46", "CH47", "CH48", "CH49", "CH60", "CH61", "CH62", "CH63"] },
  { group: "St Helens & Halton", codes: ["WA7", "WA8", "WA9", "WA10", "WA11", "WA12"] },
];

// ── Generic range slider ──────────────────────────────────────────
function FilterSlider({
  label, icon, value, min, max, step = 1, onChange, formatValue, accentColor = "var(--color-accent)",
}: {
  label: string; icon?: React.ReactNode; value: number; min: number; max: number;
  step?: number; onChange: (v: number) => void; formatValue?: (v: number) => string; accentColor?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  const isActive = value > min;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between min-h-[20px]">
        {label && (
          <span className="flex items-center gap-1.5 text-xs text-slate-400">{icon}{label}</span>
        )}
        <span className={cn("text-xs font-bold tabular-nums ml-auto", isActive ? "text-white" : "text-slate-600")}>
          {isActive ? `${formatValue ? formatValue(value) : value}+` : "Any"}
        </span>
      </div>
      <div className="relative h-6 flex items-center group">
        <div className="absolute w-full h-1.5 rounded-full bg-slate-800" />
        <div className="absolute h-1.5 rounded-full" style={{ width: `${pct}%`, background: isActive ? accentColor : "#1e293b" }} />
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute w-full h-6 opacity-0 cursor-pointer"
          style={{ zIndex: 2 }}
        />
        <div
          className="absolute w-4 h-4 rounded-full border-2 shadow-lg pointer-events-none transition-colors"
          style={{ left: `calc(${pct}% - 8px)`, background: isActive ? accentColor : "#475569", borderColor: isActive ? accentColor : "#334155" }}
        />
      </div>
    </div>
  );
}

// ── Visit Status Checkboxes ───────────────────────────────────────
const VISIT_STATUS_OPTIONS = [
  { value: "unvisited", label: "Not Yet Visited", color: "text-slate-300" },
  { value: "attempted_no_answer", label: "No Answer", color: "text-amber-400" },
  { value: "pitched_follow_up", label: "Pitched — Follow Up", color: "text-blue-400" },
  { value: "spoke_to_owner", label: "Spoke to Owner", color: "text-emerald-400" },
  { value: "not_interested", label: "Not Interested", color: "text-red-400" },
  { value: "gatekeeper_blocked", label: "Gatekeeper Blocked", color: "text-orange-400" },
  { value: "ghost_address", label: "Ghost Address", color: "text-slate-500" },
];

// ── Crime slider definitions ──────────────────────────────────────
const CRIME_SLIDERS = [
  { key: "min_crime_burglary" as const, label: "Burglary", icon: <ShieldAlert className="w-3 h-3 text-red-400" />, color: "#ef4444" },
  { key: "min_crime_shoplifting" as const, label: "Shoplifting", icon: <ShoppingCart className="w-3 h-3 text-amber-400" />, color: "#f59e0b" },
  { key: "min_crime_arson" as const, label: "Criminal Damage / Arson", icon: <Flame className="w-3 h-3 text-orange-400" />, color: "#f97316" },
  { key: "min_crime_vehicle" as const, label: "Vehicle Crime", icon: <Car className="w-3 h-3 text-sky-400" />, color: "#38bdf8" },
  { key: "min_crime_violent" as const, label: "Violent Crime", icon: <UserX className="w-3 h-3 text-red-500" />, color: "#dc2626" },
  { key: "min_crime_asb" as const, label: "Anti-Social Behaviour", icon: <Frown className="w-3 h-3 text-yellow-400" />, color: "#eab308" },
  { key: "min_crime_robbery" as const, label: "Robbery", icon: <Wallet className="w-3 h-3 text-purple-400" />, color: "#a855f7" },
  { key: "min_crime_theft_person" as const, label: "Theft from Person", icon: <PersonStanding className="w-3 h-3 text-pink-400" />, color: "#ec4899" },
];
const DEFAULT_CRIME = Object.fromEntries(CRIME_SLIDERS.map((s) => [s.key, 0]));

// ─────────────────────────────────────────────────────────────────
export function FilterDrawer({ open, onClose, filter, onApplyFilters }: FilterDrawerProps) {
  const [localFilter, setLocalFilter] = useState<LeadFilter>(filter);
  const [postcodeInput, setPostcodeInput] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [ageMin, setAgeMin] = useState(0);
  const [ageMax, setAgeMax] = useState(30);
  const [crime, setCrime] = useState<Record<string, number>>(DEFAULT_CRIME);

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    setLocalFilter(filter);
    setMinScore(filter.min_score ?? 0);
    setAgeMin(filter.company_age_min_years ?? 0);
    setAgeMax(filter.company_age_max_years ?? 30);
    const cv: Record<string, number> = { ...DEFAULT_CRIME };
    for (const s of CRIME_SLIDERS) cv[s.key] = (filter as any)[s.key] ?? 0;
    setCrime(cv);
  }, [open, filter]);

  const anyCrimeActive = CRIME_SLIDERS.some((s) => (crime[s.key] ?? 0) > 0);
  const formatAge = (y: number) => {
    if (y === 0) return "New";
    if (y === 1) return "1 yr";
    return `${y} yrs`;
  };
  const ageLabel =
    ageMin === 0 && ageMax === 30 ? "Any Age"
    : ageMin === 0 ? `Up to ${formatAge(ageMax)}`
    : ageMax === 30 ? `${formatAge(ageMin)}+`
    : `${formatAge(ageMin)} – ${formatAge(ageMax)}`;

  const activeFilterCount = [
    minScore > 0,
    ageMin > 0 || ageMax < 30,
    anyCrimeActive,
    (localFilter.postcodes?.length ?? 0) > 0,
    (localFilter.visit_statuses?.length ?? 0) > 0,
    (localFilter.risk_tags?.length ?? 0) > 0,
    localFilter.has_phone,
    localFilter.has_website,
    localFilter.has_director,
    localFilter.follow_up_due,
  ].filter(Boolean).length;

  const handleApply = () => {
    const crimeFilters: Partial<LeadFilter> = {};
    for (const s of CRIME_SLIDERS) (crimeFilters as any)[s.key] = crime[s.key] > 0 ? crime[s.key] : undefined;
    onApplyFilters({
      ...localFilter,
      min_score: minScore > 0 ? minScore : undefined,
      score_tier: undefined,
      company_age_min_years: ageMin > 0 ? ageMin : undefined,
      company_age_max_years: ageMax < 30 ? ageMax : undefined,
      company_age: undefined,
      max_age_days: null,
      ...crimeFilters,
    });
    onClose();
  };

  const handleClear = () => {
    const reset: LeadFilter = {
      ...localFilter,
      max_age_days: null, company_age: undefined, company_age_min_years: undefined,
      company_age_max_years: undefined, min_burglaries: undefined, risk_tags: undefined,
      postcodes: undefined, has_phone: undefined, has_website: undefined, has_director: undefined,
      visit_statuses: undefined, follow_up_due: undefined, commercial_only: undefined,
      score_tier: undefined, min_score: undefined,
      ...Object.fromEntries(CRIME_SLIDERS.map((s) => [s.key, undefined])),
    };
    setLocalFilter(reset);
    setMinScore(0); setAgeMin(0); setAgeMax(30);
    setCrime({ ...DEFAULT_CRIME });
    onApplyFilters(reset);
    router.replace(pathname);
    onClose();
  };

  const pillBase = "py-2 px-3 rounded-xl border text-xs font-medium transition-all flex items-center gap-2 active:scale-95";
  const pillActive = "bg-[var(--color-accent)]/15 border-[var(--color-accent)]/40 text-[var(--color-accent-hover)]";
  const pillInactive = "bg-[var(--color-bg-surface)] border-[var(--color-border)] text-slate-400 hover:text-slate-300 hover:bg-[var(--color-bg-overlay)]";

  return (
    <Drawer.Root open={open} onOpenChange={(o) => !o && onClose()} shouldScaleBackground={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000]" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-[1001] pointer-events-auto flex flex-col rounded-t-3xl bg-[var(--color-bg-raised)] border-t border-[var(--glass-border)] shadow-2xl max-h-[92vh] focus:outline-none">
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
            <div className="w-12 h-1.5 rounded-full bg-slate-700" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pb-3 border-b border-[var(--color-border)]">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-[var(--color-accent)]" />
              Filters
              {activeFilterCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-[var(--color-accent)]/20 text-[var(--color-accent)] text-xs font-bold">
                  {activeFilterCount}
                </span>
              )}
            </h2>
            <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-[var(--color-bg-overlay)] transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-6">

            {/* ── LEAD SCORE SLIDER ─────────────────────── */}
            <section className="space-y-2 p-4 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border)]">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-red-400" /> Min. Lead Score
                </h3>
                <span className={cn("text-sm font-bold", minScore > 0 ? "text-white" : "text-slate-600")}>
                  {minScore > 0 ? `${minScore}+` : "Any"}
                </span>
              </div>
              <FilterSlider label="" value={minScore} min={0} max={100} step={5} onChange={setMinScore} accentColor="var(--color-accent)" />
              <div className="flex justify-between text-[10px] text-slate-600 px-0.5 select-none pt-1">
                <span>Any</span><span>🟡 50</span><span>🔥 80</span><span>100</span>
              </div>
            </section>

            {/* ── POSTCODE ──────────────────────────────── */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" /> Postcode Area
                </h3>
                {(localFilter.postcodes?.length ?? 0) > 0 && (
                  <button onClick={() => setLocalFilter({ ...localFilter, postcodes: undefined })} className="text-[11px] text-slate-500 hover:text-white">Clear all</button>
                )}
              </div>
              <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-xl p-2.5 focus-within:border-emerald-500/40 transition-colors">
                <div className="flex flex-wrap gap-2 mb-1">
                  {localFilter.postcodes?.map((code) => (
                    <span key={code} className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-1 rounded-lg text-sm flex items-center gap-1">
                      {code}
                      <button onClick={() => {
                        const n = localFilter.postcodes?.filter((c) => c !== code);
                        setLocalFilter({ ...localFilter, postcodes: n?.length ? n : undefined });
                      }}><X className="w-3 h-3 hover:text-white" /></button>
                    </span>
                  ))}
                  <input
                    type="text" value={postcodeInput}
                    onChange={(e) => setPostcodeInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        const val = postcodeInput.trim().toUpperCase();
                        if (val && !localFilter.postcodes?.includes(val))
                          setLocalFilter({ ...localFilter, postcodes: [...(localFilter.postcodes || []), val] });
                        setPostcodeInput("");
                      }
                    }}
                    placeholder={localFilter.postcodes?.length ? "Add another…" : "e.g. L1, CH41…"}
                    className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-600 focus:outline-none min-w-[120px] px-1 py-1"
                  />
                </div>
                {postcodeInput && (
                  <div className="mt-2 border-t border-[var(--color-border)] pt-2 max-h-36 overflow-y-auto">
                    {LIVERPOOL_OUTCODES.flatMap((g) => g.codes)
                      .filter((c) => c.startsWith(postcodeInput) && !localFilter.postcodes?.includes(c))
                      .map((code) => (
                        <button key={code} onClick={() => {
                          setLocalFilter({ ...localFilter, postcodes: [...(localFilter.postcodes || []), code] });
                          setPostcodeInput("");
                        }} className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-[var(--color-bg-overlay)] rounded-lg transition-colors">
                          <span className="font-medium text-white mr-2">{code}</span>
                          <span className="text-slate-500">{LIVERPOOL_OUTCODES.find((g) => g.codes.includes(code))?.group}</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </section>

            {/* ── COMPANY AGE SLIDERS ───────────────────── */}
            <section className="space-y-3 p-4 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border)]">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-purple-400" /> Company Age
                </h3>
                <span className={cn("text-sm font-semibold", (ageMin > 0 || ageMax < 30) ? "text-white" : "text-slate-600")}>
                  {ageLabel}
                </span>
              </div>
              <FilterSlider
                label="From (min age)" value={ageMin} min={0} max={29} onChange={(v) => setAgeMin(Math.min(v, ageMax - 1))}
                formatValue={formatAge} accentColor="#a855f7"
              />
              <FilterSlider
                label="To (max age)" value={ageMax} min={1} max={30}
                onChange={(v) => setAgeMax(Math.max(v, ageMin + 1))}
                formatValue={(v) => v === 30 ? "30+ yrs" : formatAge(v)} accentColor="#7c3aed"
              />
            </section>

            {/* ── CRIME SLIDERS ─────────────────────────── */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-orange-400" /> Crime Activity (Min. Incidents)
                </h3>
                {anyCrimeActive && (
                  <button onClick={() => setCrime({ ...DEFAULT_CRIME })} className="text-[11px] text-slate-500 hover:text-white">Reset</button>
                )}
              </div>
              <div className="space-y-4 p-4 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border)]">
                {CRIME_SLIDERS.map((s) => (
                  <FilterSlider
                    key={s.key} label={s.label} icon={s.icon}
                    value={crime[s.key] ?? 0} min={0} max={30}
                    onChange={(v) => setCrime((prev) => ({ ...prev, [s.key]: v }))}
                    accentColor={s.color}
                  />
                ))}
              </div>
            </section>

            {/* ── TARGET SEGMENTS ───────────────────────── */}
            <section className="space-y-3">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-orange-400" /> Target Segments
              </h3>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "HIGH_CRIME_ZONE", label: "🔴 High Crime" },
                  { value: "ELEVATED_CRIME", label: "🟠 Elevated Crime" },
                  { value: "PREMIUM_RETAIL", label: "🛒 Retail" },
                  { value: "HOSPITALITY", label: "🍺 Hospitality" },
                  { value: "INDUSTRIAL_TARGET", label: "📦 Industrial" },
                  { value: "AUTOMOTIVE", label: "🚗 Automotive" },
                  { value: "HEALTHCARE", label: "🏥 Healthcare" },
                  { value: "NEW_BUSINESS", label: "🚀 New Business" },
                ].map((opt) => {
                  const isActive = localFilter.risk_tags?.includes(opt.value);
                  return (
                    <button key={opt.value}
                      onClick={() => {
                        const t = localFilter.risk_tags || [];
                        setLocalFilter({ ...localFilter, risk_tags: isActive ? t.filter((x) => x !== opt.value) : [...t, opt.value] });
                      }}
                      className={cn(pillBase, isActive ? pillActive : pillInactive)}
                    >
                      {isActive && <Check className="w-3 h-3" />}
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* ── VISIT STATUS ──────────────────────────── */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Visit Status</h3>
                {(localFilter.visit_statuses?.length ?? 0) > 0 && (
                  <button onClick={() => setLocalFilter({ ...localFilter, visit_statuses: undefined })} className="text-[11px] text-slate-500 hover:text-white">Clear</button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {VISIT_STATUS_OPTIONS.map((opt) => {
                  const isActive = localFilter.visit_statuses?.includes(opt.value as any);
                  return (
                    <button key={opt.value}
                      onClick={() => {
                        const cur = localFilter.visit_statuses ?? [];
                        const next = isActive ? cur.filter((v) => v !== opt.value) : [...cur, opt.value as any];
                        setLocalFilter({ ...localFilter, visit_statuses: next.length > 0 ? next : undefined });
                      }}
                      className={cn("py-2.5 px-3 rounded-xl border text-xs font-medium transition-all flex items-center gap-2 active:scale-[0.97]", isActive ? pillActive : pillInactive)}
                    >
                      <div className={cn("w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center", isActive ? "bg-[var(--color-accent)] border-[var(--color-accent)]" : "border-slate-600")}>
                        {isActive && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <span className={opt.color}>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* ── CONTACT DATA ──────────────────────────── */}
            <section className="space-y-3">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-sky-400" /> Contact Data
              </h3>
              <div className="flex flex-col gap-2">
                {[
                  { key: "has_director", label: "Has Known Director Name" },
                  { key: "has_phone", label: "Has Phone Number" },
                  { key: "has_website", label: "Has Website" },
                  { key: "follow_up_due", label: "Follow-Up Due Today" },
                ].map((opt) => {
                  const isActive = !!localFilter[opt.key as keyof LeadFilter];
                  return (
                    <button key={opt.key}
                      onClick={() => setLocalFilter({ ...localFilter, [opt.key]: !isActive ? true : undefined })}
                      className={cn("py-2.5 px-4 rounded-xl border text-sm font-medium transition-all flex items-center gap-3 active:scale-[0.98]", isActive ? pillActive : pillInactive)}
                    >
                      <div className={cn("w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center", isActive ? "bg-[var(--color-accent)] border-[var(--color-accent)]" : "border-slate-600")}>
                        {isActive && <Check className="w-3 h-3 text-white" />}
                      </div>
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </section>

            <div className="h-6" />
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-[var(--color-border)] flex gap-3 pb-safe bg-[var(--color-bg-raised)]">
            <button onClick={handleClear} className="px-5 py-3 rounded-xl font-semibold text-slate-300 border border-[var(--color-border)] hover:bg-[var(--color-bg-surface)] transition-colors active:scale-95 text-sm">
              Reset All
            </button>
            <button onClick={handleApply} className="flex-1 px-6 py-3 rounded-xl font-semibold text-white bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] transition-colors shadow-lg active:scale-95 text-sm">
              Apply Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

