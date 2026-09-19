"use client";

import { useState, useEffect } from "react";
import { Drawer } from "vaul";
import { X, Calendar, AlertTriangle, SlidersHorizontal, Check, MapPin, Phone, Building2, TrendingUp, Goal } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { LeadFilter, VisitStatus } from "@/lib/types";

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
export function FilterDrawer({ open, onClose, filter, onApplyFilters }: FilterDrawerProps) {
  const [localFilter, setLocalFilter] = useState<LeadFilter>(filter);
  const [postcodeInput, setPostcodeInput] = useState("");

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (open) {
      setLocalFilter(filter);
    }
  }, [open, filter]);

  const handleApply = () => {
    onApplyFilters(localFilter);
    onClose();
  };

  const handleClear = () => {
    const resetFilter: LeadFilter = {
      ...localFilter,
      max_age_days: null,
      company_age: undefined,
      min_burglaries: undefined,
      risk_tags: undefined,
      postcodes: undefined,
      has_phone: undefined,
      has_website: undefined,
      has_director: undefined,
      visit_statuses: undefined,
      follow_up_due: undefined,
      commercial_only: undefined,
      score_tier: undefined,
    };
    setLocalFilter(resetFilter);
    onApplyFilters(resetFilter);
    
    // Clear URL params completely by replacing with just the pathname
    router.replace(pathname);
    
    onClose();
  };

  const toggleArrayItem = <T,>(arr: T[] | undefined, item: T): T[] | undefined => {
    const current = arr || [];
    const isSelected = current.includes(item);
    const updated = isSelected ? current.filter(i => i !== item) : [...current, item];
    return updated.length > 0 ? updated : undefined;
  };

  return (
    <Drawer.Root open={open} onOpenChange={(o) => !o && onClose()} shouldScaleBackground={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000]" />
        
        <Drawer.Content
          className="fixed bottom-0 left-0 right-0 z-[1001] pointer-events-auto flex flex-col rounded-t-3xl bg-slate-900 border-t border-slate-700/60 shadow-2xl max-h-[90vh] focus:outline-none"
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
            <div className="w-12 h-1.5 rounded-full bg-slate-700" />
          </div>

          <div className="flex items-center justify-between px-5 pb-2 border-b border-slate-800">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-blue-400" />
              Advanced Filters
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-8">
            
            {/* LOCATION */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-400" /> Postcode Area
                </h3>
                {localFilter.postcodes && localFilter.postcodes.length > 0 && (
                  <button 
                    onClick={() => setLocalFilter({ ...localFilter, postcodes: undefined })}
                    className="text-xs text-slate-500 hover:text-white"
                  >
                    Clear all
                  </button>
                )}
              </div>
              
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-2 focus-within:border-emerald-500/50 transition-colors">
                <div className="flex flex-wrap gap-2 mb-2">
                  {localFilter.postcodes?.map((code) => (
                    <span key={code} className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-1 rounded-md text-sm flex items-center gap-1">
                      {code}
                      <button onClick={() => {
                        const newCodes = localFilter.postcodes?.filter(c => c !== code);
                        setLocalFilter({ ...localFilter, postcodes: newCodes?.length ? newCodes : undefined });
                      }}>
                        <X className="w-3 h-3 hover:text-white" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={postcodeInput}
                    onChange={(e) => setPostcodeInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        const val = postcodeInput.trim().toUpperCase();
                        if (val && !localFilter.postcodes?.includes(val)) {
                          setLocalFilter({ ...localFilter, postcodes: [...(localFilter.postcodes || []), val] });
                        }
                        setPostcodeInput("");
                      }
                    }}
                    placeholder={localFilter.postcodes?.length ? "Add another..." : "e.g. L1, CH41..."}
                    className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none min-w-[120px] px-1 py-1"
                  />
                </div>
                
                {postcodeInput && (
                  <div className="mt-2 border-t border-slate-700/50 pt-2 max-h-40 overflow-y-auto">
                    {LIVERPOOL_OUTCODES.flatMap(g => g.codes)
                      .filter(c => c.startsWith(postcodeInput) && !localFilter.postcodes?.includes(c))
                      .map(code => (
                        <button
                          key={code}
                          onClick={() => {
                            setLocalFilter({ ...localFilter, postcodes: [...(localFilter.postcodes || []), code] });
                            setPostcodeInput("");
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 rounded-md transition-colors"
                        >
                          <span className="font-medium text-white mr-2">{code}</span>
                          <span className="text-slate-500">{LIVERPOOL_OUTCODES.find(g => g.codes.includes(code))?.group}</span>
                        </button>
                    ))}
                    {LIVERPOOL_OUTCODES.flatMap(g => g.codes).filter(c => c.startsWith(postcodeInput) && !localFilter.postcodes?.includes(c)).length === 0 && (
                      <div className="px-3 py-2 text-sm text-slate-500">Press Enter to add custom "{postcodeInput}"</div>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* SCORE TIERS */}
            <section className="space-y-3">
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-red-400" /> Lead Temperature
              </h3>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: undefined, label: "Any Score" },
                  { value: "hot", label: "🔥 Hot (80+)" },
                  { value: "warm", label: "🟡 Warm (50-79)" },
                  { value: "cold", label: "❄️ Cold (<50)" },
                ].map((opt) => (
                  <button
                    key={String(opt.value)}
                    onClick={() => setLocalFilter({ ...localFilter, score_tier: opt.value as any })}
                    className={cn(
                      "py-2 px-4 rounded-full border text-sm font-medium transition-all flex items-center gap-2",
                      localFilter.score_tier === opt.value
                        ? "bg-red-600/20 border-red-500/50 text-red-300"
                        : "bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-700"
                    )}
                  >
                    {localFilter.score_tier === opt.value && <Check className="w-3 h-3" />}
                    {opt.label}
                  </button>
                ))}
              </div>
            </section>

            {/* COMPANY AGE */}
            <section className="space-y-3">
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-purple-400" /> Company Age
              </h3>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: undefined, label: "Any Age" },
                  { value: "gt_30d", label: "> 30 Days" },
                  { value: "gt_90d", label: "> 90 Days" },
                  { value: "gt_1y", label: "> 1 Year" },
                  { value: "lt_30d", label: "< 30 Days (Brand New)" },
                ].map((opt) => (
                  <button
                    key={String(opt.value)}
                    onClick={() => setLocalFilter({ ...localFilter, company_age: opt.value as any })}
                    className={cn(
                      "py-2 px-4 rounded-full border text-sm font-medium transition-all flex items-center gap-2",
                      localFilter.company_age === opt.value
                        ? "bg-sky-600 border-sky-500 text-white"
                        : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600"
                    )}
                  >
                    {localFilter.company_age === opt.value && <Check className="w-3 h-3" />}
                    {opt.label}
                  </button>
                ))}
              </div>
            </section>


            {/* CONTACT DATA */}
            <section className="space-y-3">
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Phone className="w-4 h-4 text-sky-400" /> Contact Data
              </h3>
              <div className="flex flex-col gap-2">
                {[
                  { key: "has_director", label: "Has Known Director Name" },
                  { key: "has_phone", label: "Has Phone Number" },
                  { key: "has_website", label: "Has Website" },
                ].map((opt) => {
                  const isActive = !!localFilter[opt.key as keyof LeadFilter];
                  return (
                    <button
                      key={opt.key}
                      onClick={() => setLocalFilter({ ...localFilter, [opt.key]: !isActive })}
                      className={cn(
                        "py-2.5 px-4 rounded-xl border text-sm font-medium transition-all flex items-center gap-3",
                        isActive
                          ? "bg-sky-600/20 border-sky-500/50 text-sky-300"
                          : "bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-700"
                      )}
                    >
                      {isActive ? <Check className="w-4 h-4" /> : <div className="w-4 h-4 rounded-full border border-slate-500" />}
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </section>


            {/* CRIME ACTIVITY */}
            <section className="space-y-3">
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-400" /> Crime Activity (Burglaries)
              </h3>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: undefined, label: "Any" },
                  { value: 1, label: "1+ Nearby" },
                  { value: 3, label: "3+ Hotspot" },
                ].map((opt) => (
                  <button
                    key={String(opt.value)}
                    onClick={() => setLocalFilter({ ...localFilter, min_burglaries: opt.value })}
                    className={cn(
                      "py-2 px-4 rounded-full border text-sm font-medium transition-all flex items-center gap-2",
                      localFilter.min_burglaries === opt.value
                        ? "bg-orange-600/20 border-orange-500/50 text-orange-300"
                        : "bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-700"
                    )}
                  >
                    {localFilter.min_burglaries === opt.value && <Check className="w-3 h-3" />}
                    {opt.label}
                  </button>
                ))}
              </div>
            </section>

            {/* TARGET SEGMENTS */}
            <section className="space-y-3">
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-400" /> Target Segments
              </h3>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "HIGH_CRIME_ZONE", label: "High Crime Zones" },
                  { value: "ELEVATED_CRIME", label: "Elevated Crime" },
                  { value: "PREMIUM_RETAIL", label: "Retail" },
                  { value: "HOSPITALITY", label: "Hospitality" },
                  { value: "INDUSTRIAL_TARGET", label: "Industrial/Trades" },
                  { value: "AUTOMOTIVE", label: "Automotive" },
                  { value: "HEALTHCARE", label: "Healthcare" },
                  { value: "NEW_BUSINESS", label: "New Business" },
                ].map((opt) => {
                  const isActive = localFilter.risk_tags?.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      onClick={() => {
                        const currentTags = localFilter.risk_tags || [];
                        const newTags = isActive
                          ? currentTags.filter((t) => t !== opt.value)
                          : [...currentTags, opt.value];
                        setLocalFilter({ ...localFilter, risk_tags: newTags.length > 0 ? newTags : undefined });
                      }}
                      className={cn(
                        "py-2 px-4 rounded-full border text-sm font-medium transition-all flex items-center gap-2",
                        isActive
                          ? "bg-blue-600/20 border-blue-500/50 text-blue-300"
                          : "bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-700"
                      )}
                    >
                      {isActive && <Check className="w-3 h-3" />}
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </section>
            
            <div className="h-6" /> {/* padding bottom safe area spacer */}
          </div>
          
          {/* Footer actions */}
          <div className="p-4 border-t border-slate-800 flex gap-3 pb-safe bg-slate-900">
            <button
              onClick={handleClear}
              className="px-6 py-3 rounded-xl font-medium text-slate-300 border border-slate-700 hover:bg-slate-800 transition-colors"
            >
              Reset
            </button>
            <button
              onClick={handleApply}
              className="flex-1 px-6 py-3 rounded-xl font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-900/20"
            >
              Apply Filters
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
