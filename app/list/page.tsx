"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/layout/BottomNav";
import { FilterDrawer } from "@/components/FilterDrawer";
import { LeadCard } from "@/components/leads/LeadCard";
import { LeadDrawer } from "@/components/leads/LeadDrawer";
import {
  Search, SlidersHorizontal, Map as MapIcon, Loader2, SearchX,
  Flame, AlertTriangle, Sparkles, Eye, X, LogOut
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Lead, LeadFilter } from "@/lib/types";
import { useDebounce } from "@/lib/hooks/useDebounce";

// ─── Session storage helpers for tagged leads ───────────────
const TAGGED_KEY = "coldcallr_tagged_leads";

function getTaggedFromStorage(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(TAGGED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function saveTaggedToStorage(ids: Set<string>) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(TAGGED_KEY, JSON.stringify([...ids]));
}

// ─── Quick filter chips config ──────────────────────────────
const QUICK_FILTERS = [
  { key: "hot", label: "Hot", icon: Flame, color: "text-red-400", activeBg: "bg-red-500/15 border-red-500/30 text-red-300" },
  { key: "high_crime", label: "High Crime", icon: AlertTriangle, color: "text-orange-400", activeBg: "bg-orange-500/15 border-orange-500/30 text-orange-300" },
  { key: "new_business", label: "New Business", icon: Sparkles, color: "text-blue-400", activeBg: "bg-blue-500/15 border-blue-500/30 text-blue-300" },
  { key: "unvisited", label: "Unvisited", icon: Eye, color: "text-emerald-400", activeBg: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300" },
] as const;

export default function ListPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const LIMIT = 25;

  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [filter, setFilter] = useState<LeadFilter>({ visit_status: "all" });
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 250);
  const [sortBy, setSortBy] = useState<string>("score");

  // Quick filter state
  const [activeQuickFilters, setActiveQuickFilters] = useState<Set<string>>(new Set());

  // Tagged leads for map
  const [taggedIds, setTaggedIds] = useState<Set<string>>(new Set());

  // Load tagged leads from session on mount
  useEffect(() => {
    setTaggedIds(getTaggedFromStorage());
  }, []);

  // ─── Toggle tag ─────────────────────────────────────────────
  const toggleTag = useCallback((lead: Lead) => {
    setTaggedIds(prev => {
      const next = new Set(prev);
      if (next.has(lead.id)) next.delete(lead.id);
      else next.add(lead.id);
      saveTaggedToStorage(next);
      return next;
    });
  }, []);

  const clearTags = useCallback(() => {
    setTaggedIds(new Set());
    saveTaggedToStorage(new Set());
  }, []);

  const tagAllVisible = useCallback(() => {
    setTaggedIds(prev => {
      const next = new Set(prev);
      leads.forEach(l => next.add(l.id));
      saveTaggedToStorage(next);
      return next;
    });
  }, [leads]);

  // ─── Quick filter toggle ──────────────────────────────────
  const toggleQuickFilter = useCallback((key: string) => {
    setActiveQuickFilters(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // Build effective filter from quick filters + advanced filter
  const effectiveFilter: LeadFilter = {
    ...filter,
    min_score: activeQuickFilters.has("hot") ? 75 : filter.min_score,
    risk_tags: activeQuickFilters.has("high_crime")
      ? [...(filter.risk_tags || []), "HIGH_CRIME_ZONE", "ELEVATED_CRIME"]
      : activeQuickFilters.has("new_business")
        ? [...(filter.risk_tags || []), "NEW_BUSINESS"]
        : filter.risk_tags,
    unvisited_only: activeQuickFilters.has("unvisited") ? true : filter.unvisited_only,
  };

  // ─── Fetch leads ──────────────────────────────────────────
  const fetchLeads = useCallback(async (currentFilter: LeadFilter, pageNum: number, search: string, sort: string, append = false) => {
    if (!append) setLoading(true);
    else setLoadingMore(true);

    try {
      const params = new URLSearchParams();
      params.set("limit", String(LIMIT));
      params.set("offset", String(pageNum * LIMIT));
      params.set("sort_by", sort);

      if (currentFilter.max_age_days) params.set("max_age_days", String(currentFilter.max_age_days));
      if (currentFilter.min_burglaries) params.set("min_burglaries", String(currentFilter.min_burglaries));
      if (currentFilter.risk_tags && currentFilter.risk_tags.length > 0) {
        params.set("risk_tags", currentFilter.risk_tags.join(","));
      }
      // Score — slider takes priority
      if (currentFilter.min_score !== undefined && currentFilter.min_score > 0) {
        params.set("min_score_val", String(currentFilter.min_score));
      } else if (currentFilter.score_tier) {
        params.set("score_tier", currentFilter.score_tier);
      }
      if (currentFilter.unvisited_only) params.set("unvisited_only", "true");
      if (currentFilter.visit_status && currentFilter.visit_status !== "all") {
        params.set("visit_status", currentFilter.visit_status);
      }
      if (currentFilter.postcodes && currentFilter.postcodes.length > 0) {
        params.set("postcodes", currentFilter.postcodes.join(","));
      }
      // Company age range slider
      if (currentFilter.company_age_min_years !== undefined) params.set("company_age_min_years", String(currentFilter.company_age_min_years));
      if (currentFilter.company_age_max_years !== undefined) params.set("company_age_max_years", String(currentFilter.company_age_max_years));
      if (currentFilter.company_age) params.set("company_age", currentFilter.company_age);
      if (currentFilter.visit_statuses && currentFilter.visit_statuses.length > 0) {
        params.set("visit_statuses", currentFilter.visit_statuses.join(","));
      }
      if (currentFilter.follow_up_due) params.set("follow_up_due", "true");
      if (currentFilter.has_phone) params.set("has_phone", "true");
      if (currentFilter.has_website) params.set("has_website", "true");
      if (currentFilter.has_director) params.set("has_director", "true");
      if (currentFilter.commercial_only) params.set("commercial_only", "true");
      if (search) params.set("q", search);
      // Individual crime minimum sliders
      const crimeKeys = ["min_crime_burglary","min_crime_robbery","min_crime_vehicle","min_crime_theft_person","min_crime_other_theft","min_crime_arson","min_crime_shoplifting","min_crime_asb","min_crime_violent"] as const;
      for (const k of crimeKeys) {
        const v = (currentFilter as any)[k];
        if (v && v > 0) params.set(k, String(v));
      }

      const res = await fetch(`/api/leads?${params}`);
      if (!res.ok) throw new Error("Failed to fetch leads");
      const { leads: data, totalCount: count } = await res.json();

      if (append) {
        setLeads(prev => [...prev, ...data]);
      } else {
        setLeads(data ?? []);
      }

      const newLeadsLength = append ? leads.length + (data?.length ?? 0) : (data?.length ?? 0);
      setTotalCount(count ?? 0);
      setHasMore(newLeadsLength < (count ?? 0));
    } catch (err) {
      console.error("Failed to load leads:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Reset page and fetch when filter/search/sort changes
  useEffect(() => {
    setPage(0);
    fetchLeads(effectiveFilter, 0, debouncedSearch, sortBy, false);
  }, [filter, activeQuickFilters, debouncedSearch, sortBy, fetchLeads]);

  const loadMore = () => {
    if (loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchLeads(effectiveFilter, nextPage, debouncedSearch, sortBy, true);
  };

  const handleFilterChange = useCallback((update: Partial<LeadFilter>) => {
    setFilter((prev) => ({ ...prev, ...update }));
  }, []);

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
    setDrawerOpen(true);
  };

  const handleLeadUpdate = (updatedLead: Lead) => {
    setLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l));
    setSelectedLead(updatedLead);
  };

  const handlePlotOnMap = () => {
    router.push("/map");
  };

  const handleLogout = async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/login");
  };

  // Sync sortBy → URL on change
  const handleSortChange = useCallback((value: string) => {
    setSortBy(value);
    setPage(0);
    const url = new URL(window.location.href);
    url.searchParams.set("sort_by", value);
    router.replace(url.pathname + "?" + url.searchParams.toString());
  }, [router]);

  // Read initial sort from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlSort = params.get("sort_by");
    if (urlSort) setSortBy(urlSort);
  }, []);

  const activeFiltersCount = [
    filter.max_age_days,
    filter.min_burglaries,
    filter.min_score,
    filter.unvisited_only,
    filter.risk_tags?.length,
  ].filter(Boolean).length;

  const SORT_OPTIONS = [
    { value: "score",      label: "Score" },
    { value: "burglaries", label: "Crime" },
    { value: "newest",     label: "Newest" },
    { value: "oldest",     label: "Established" },
  ] as const;

  return (
    <main className="min-h-svh bg-[var(--color-bg-base)] pb-32">
      {/* ═══ STICKY HEADER ═══ */}
      <div className="sticky top-0 z-50 glass pt-safe">
        {/* Title row */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <div>
            <h1 className="text-lg font-bold text-white font-display tracking-tight">
              ColdcallR
            </h1>
            {!loading && (
              <p className="text-[11px] text-slate-500 font-medium">
                {totalCount.toLocaleString()} leads
                {taggedIds.size > 0 && (
                  <span className="text-[var(--color-accent)] ml-1">
                    · {taggedIds.size} tagged
                  </span>
                )}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Sort dropdown */}
            <select
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value)}
              className="h-9 px-3 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border)] text-xs font-medium text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none cursor-pointer"
            >
              {SORT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {/* Filter Toggle */}
            <button
              onClick={() => setFilterDrawerOpen(true)}
              className="relative w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--color-bg-overlay)] hover:bg-[var(--color-bg-surface)] border border-[var(--glass-border)] transition-colors active:scale-95"
            >
              <SlidersHorizontal className="w-4 h-4 text-slate-300" />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-[var(--color-accent)] rounded-full border-2 border-[var(--color-bg-base)]" />
              )}
            </button>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors active:scale-95"
              title="Sign out"
            >
              <LogOut className="w-4 h-4 text-red-400" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative px-4 pb-2">
          <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
          <input
            type="text"
            placeholder="Search company or postcode…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40 focus:border-[var(--color-accent)]/40 transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-7 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Quick filter chips */}
        <div className="flex items-center gap-2 px-4 pb-3 overflow-x-auto scrollbar-none">
          {QUICK_FILTERS.map((qf) => {
            const isActive = activeQuickFilters.has(qf.key);
            const Icon = qf.icon;
            return (
              <button
                key={qf.key}
                onClick={() => toggleQuickFilter(qf.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold whitespace-nowrap transition-all duration-150 active:scale-95 ${
                  isActive
                    ? qf.activeBg
                    : "border-[var(--color-border)] bg-[var(--color-bg-surface)] text-slate-500 hover:text-slate-300"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {qf.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ TAG ACTIONS BAR ═══ */}
      {!loading && leads.length > 0 && (
        <div className="flex items-center justify-between px-4 pt-2 pb-1">
          <p className="text-[11px] text-slate-600">
            Showing {leads.length.toLocaleString()} of {totalCount.toLocaleString()}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={tagAllVisible}
              className="text-[11px] text-[var(--color-accent)] font-medium hover:underline"
            >
              Tag all
            </button>
            {taggedIds.size > 0 && (
              <button
                onClick={clearTags}
                className="text-[11px] text-slate-500 font-medium hover:text-red-400"
              >
                Clear tags
              </button>
            )}
          </div>
        </div>
      )}

      {/* ═══ LEAD LIST ═══ */}
      <div className="px-4 space-y-2 pb-4">
        {loading && page === 0 ? (
          <div className="flex items-center justify-center h-40">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--color-accent)]" />
              <p className="text-xs text-slate-500">Loading leads…</p>
            </div>
          </div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] text-center bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-2xl p-6 mt-4 animate-fade-in-up">
            <div className="w-14 h-14 bg-[var(--color-bg-overlay)] rounded-full flex items-center justify-center mb-4">
              <SearchX className="w-7 h-7 text-slate-500" />
            </div>
            <h3 className="font-bold text-white text-lg mb-2 font-display">No leads found</h3>
            <p className="text-slate-500 text-sm mb-6 max-w-[260px] leading-relaxed">
              {totalCount === 0 && !searchTerm && activeQuickFilters.size === 0 && filter.visit_status === "all"
                ? "Your database is completely empty. Let's pull your initial leads."
                : "Try expanding your postcode area, clearing search keywords, or removing filters."}
            </p>
            {totalCount === 0 && !searchTerm && activeQuickFilters.size === 0 && filter.visit_status === "all" ? (
              <button
                onClick={() => router.push("/welcome")}
                className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white rounded-xl px-5 py-2.5 font-semibold text-sm transition-colors"
              >
                Setup Workspace
              </button>
            ) : (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setFilter({ visit_status: "all" });
                  setActiveQuickFilters(new Set());
                  router.replace("/list");
                }}
                className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white rounded-xl px-5 py-2.5 font-semibold text-sm transition-colors"
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : (
          <>
            {leads.map((lead, i) => (
              <div key={lead.id} className="animate-fade-in-up" style={{ animationDelay: `${Math.min(i, 10) * 0.03}s` }}>
                <LeadCard
                  lead={lead}
                  onClick={handleLeadClick}
                  isTagged={taggedIds.has(lead.id)}
                  onToggleTag={toggleTag}
                />
              </div>
            ))}

            {hasMore && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full py-3 rounded-xl border border-[var(--color-border)] text-slate-500 font-medium hover:bg-[var(--color-bg-surface)] transition-colors flex items-center justify-center gap-2"
              >
                {loadingMore ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Loading…</>
                ) : (
                  "Load More"
                )}
              </button>
            )}
          </>
        )}
      </div>

      {/* ═══ FLOATING ACTION BAR — Plot Tagged on Map ═══ */}
      {taggedIds.size > 0 && (
        <div className="fixed bottom-[80px] left-0 right-0 px-4 z-[900] pointer-events-none flex justify-center animate-slide-in-bottom">
          <button
            onClick={handlePlotOnMap}
            className="pointer-events-auto shadow-2xl shadow-blue-900/30 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white px-6 py-3.5 rounded-full font-bold flex items-center gap-2.5 transition-all active:scale-95 text-[15px]"
          >
            <MapIcon className="w-5 h-5" />
            Plot {taggedIds.size} on Map
          </button>
        </div>
      )}

      <BottomNav taggedCount={taggedIds.size} />

      <FilterDrawer
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        filter={filter}
        onApplyFilters={handleFilterChange}
      />

      <LeadDrawer
        lead={selectedLead}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setTimeout(() => setSelectedLead(null), 300);
        }}
        onLeadUpdate={handleLeadUpdate}
      />
    </main>
  );
}
