"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/layout/BottomNav";
import { FilterDrawer } from "@/components/FilterDrawer";
import { LeadCard } from "@/components/leads/LeadCard";
import { LeadDrawer } from "@/components/leads/LeadDrawer";
import { List, Search, SlidersHorizontal, Map as MapIcon, Loader2, SearchX } from "lucide-react";
import type { Lead, LeadFilter } from "@/lib/types";
import { useDebounce } from "@/lib/hooks/useDebounce";

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
  
  const [filter, setFilter] = useState<LeadFilter>({
    visit_status: "all",
  });
  
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 250);

  // Sort state — sourced from URL, defaults to "score"
  const [sortBy, setSortBy] = useState<string>("score");

  const SORT_OPTIONS = [
    { value: "score",      label: "Highest Score",      emoji: "🔥" },
    { value: "burglaries", label: "Most Burglaries",    emoji: "🚨" },
    { value: "newest",     label: "Newest Incorporated", emoji: "🆕" },
    { value: "oldest",     label: "Most Established",   emoji: "🏛️" },
  ] as const;

  // Sync sortBy → URL on change
  const handleSortChange = useCallback((value: string) => {
    setSortBy(value);
    setPage(0); // reset pagination

    // Update URL without full navigation
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
      if (currentFilter.min_score !== undefined) params.set("min_score", String(currentFilter.min_score));
      if (currentFilter.unvisited_only) params.set("unvisited_only", "true");
      if (currentFilter.visit_status && currentFilter.visit_status !== "all") {
        params.set("visit_status", currentFilter.visit_status);
      }
      
      // New filters
      if (currentFilter.postcodes && currentFilter.postcodes.length > 0) {
        params.set("postcodes", currentFilter.postcodes.join(","));
      }
      if (currentFilter.company_age) params.set("company_age", currentFilter.company_age);
      if (currentFilter.score_tier) params.set("score_tier", currentFilter.score_tier);
      if (currentFilter.visit_statuses && currentFilter.visit_statuses.length > 0) {
        params.set("visit_statuses", currentFilter.visit_statuses.join(","));
      }
      if (currentFilter.follow_up_due) params.set("follow_up_due", "true");
      if (currentFilter.has_phone) params.set("has_phone", "true");
      if (currentFilter.has_website) params.set("has_website", "true");
      if (currentFilter.has_director) params.set("has_director", "true");
      if (currentFilter.commercial_only) params.set("commercial_only", "true");

      if (search) params.set("q", search);

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
    fetchLeads(filter, 0, debouncedSearch, sortBy, false);
  }, [filter, debouncedSearch, sortBy, fetchLeads]);

  const loadMore = () => {
    if (loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchLeads(filter, nextPage, debouncedSearch, sortBy, true);
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
    const params = new URLSearchParams();
    params.set("sort_by", sortBy);
    if (filter.max_age_days) params.set("max_age_days", String(filter.max_age_days));
    if (filter.min_burglaries) params.set("min_burglaries", String(filter.min_burglaries));
    if (filter.min_score !== undefined) params.set("min_score", String(filter.min_score));
    if (filter.unvisited_only) params.set("unvisited_only", "true");
    if (filter.visit_status && filter.visit_status !== "all") params.set("visit_status", filter.visit_status);
    if (filter.risk_tags && filter.risk_tags.length > 0) params.set("risk_tags", filter.risk_tags.join(","));
    if (filter.postcodes && filter.postcodes.length > 0) {
      params.set("postcodes", filter.postcodes.join(","));
    }
    if (filter.company_age) params.set("company_age", filter.company_age);
    if (filter.score_tier) params.set("score_tier", filter.score_tier);
    if (filter.visit_statuses && filter.visit_statuses.length > 0) params.set("visit_statuses", filter.visit_statuses.join(","));
    if (filter.follow_up_due) params.set("follow_up_due", "true");
    if (filter.has_phone) params.set("has_phone", "true");
    if (filter.has_website) params.set("has_website", "true");
    if (filter.has_director) params.set("has_director", "true");
    if (filter.commercial_only) params.set("commercial_only", "true");
    if (debouncedSearch) params.set("q", debouncedSearch);
    router.push(`/map?${params.toString()}`);
  };

  const activeFiltersCount = [
    filter.max_age_days,
    filter.min_burglaries,
    filter.min_score,
    filter.unvisited_only,
    filter.risk_tags?.length,
  ].filter(Boolean).length;

  return (
    <main className="min-h-svh bg-slate-950 pb-32">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur border-b border-slate-800/80 px-4 py-4 pt-safe">
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <List className="w-5 h-5 text-blue-400" />
              <h1 className="text-lg font-bold text-white">Lead Discovery</h1>
            </div>
            {!loading && (
              <p className="text-sm text-slate-400">
                {totalCount.toLocaleString()} Active Liverpool Businesses
              </p>
            )}
          </div>
          <button
            onClick={() => setFilterDrawerOpen(true)}
            className="w-9 h-9 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all relative"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-slate-900 text-[9px] font-bold text-white flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search company or postcode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900/50 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>

        {/* Sort Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none">
          <span className="text-xs text-slate-500 shrink-0 font-medium">Sort by:</span>
          <div className="flex gap-1.5 shrink-0">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                id={`sort-${opt.value}`}
                onClick={() => handleSortChange(opt.value)}
                className={[
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium whitespace-nowrap transition-all",
                  sortBy === opt.value
                    ? "bg-sky-500/20 border-sky-500/50 text-sky-300"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200",
                ].join(" ")}
              >
                <span role="img" aria-hidden>{opt.emoji}</span>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results counter */}
      {!loading && leads.length > 0 && (
        <div className="px-4 pt-3 pb-1">
          <p className="text-xs text-slate-500">
            Showing {leads.length.toLocaleString()} of {totalCount.toLocaleString()} leads
          </p>
        </div>
      )}

      {/* List Content */}
      <div className="p-4 space-y-3">
        {loading && page === 0 ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] text-center bg-slate-900/50 border border-slate-800 rounded-2xl p-6 mt-4">
            <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <SearchX className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className="font-bold text-white text-lg mb-2">No commercial leads found</h3>
            <p className="text-slate-400 text-sm mb-6 max-w-[250px] leading-relaxed">
              Try expanding your postcode area, clearing search keywords, or lowering the minimum score.
            </p>
            <button
              onClick={() => {
                setSearchTerm("");
                setFilter({ visit_status: "all" });
                router.replace("/list");
              }}
              className="bg-sky-600 hover:bg-sky-500 text-white rounded-lg px-4 py-2 font-medium text-sm transition-colors"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <>
            {leads.map((lead) => (
              <LeadCard key={lead.id} lead={lead} onClick={handleLeadClick} />
            ))}
            
            {hasMore && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full py-3 rounded-xl border border-slate-800 text-slate-400 font-medium hover:bg-slate-900 transition-colors flex items-center justify-center gap-2"
              >
                {loadingMore ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Loading...</>
                ) : (
                  "Load More Leads"
                )}
              </button>
            )}
          </>
        )}
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-[80px] left-0 right-0 px-4 z-[900] pointer-events-none flex justify-center">
        <button
          onClick={handlePlotOnMap}
          className="pointer-events-auto shadow-2xl shadow-blue-900/20 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3.5 rounded-full font-semibold flex items-center gap-2 transition-transform active:scale-95"
        >
          <MapIcon className="w-5 h-5" />
          Plot Matching on Map
        </button>
      </div>

      <BottomNav />

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
