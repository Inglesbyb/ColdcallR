"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { FilterDrawer } from "@/components/FilterDrawer";
import type { LeadFilter } from "@/lib/types";

// Dynamic import of the full Leaflet map (no SSR)
const LeafletMap = dynamic(() => import("@/components/map/LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-full bg-slate-950">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

function MapContent() {
  const searchParams = useSearchParams();
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  
  const [filter, setFilter] = useState<LeadFilter>({
    visit_status: "all",
    unvisited_only: false,
    min_score: undefined,
    limit: 500,
    searchQuery: "",
  });

  // Initialize filter from URL
  useEffect(() => {
    const ageParam = searchParams.get("max_age_days");
    const crimeParam = searchParams.get("min_burglaries");
    const tagsParam = searchParams.get("risk_tags");
    const qParam = searchParams.get("q") || searchParams.get("search") || "";
    const unvisitedParam = searchParams.get("unvisited_only");
    const minScoreParam = searchParams.get("min_score");
    const visitStatusParam = searchParams.get("visit_status");
    const visitStatusesParam = searchParams.get("visit_statuses");
    
    // New parameters
    const postcodesParam = searchParams.get("postcodes");
    const postcode = searchParams.get("postcode_prefix");
    const companyAgeParam = searchParams.get("company_age");
    const scoreTier = searchParams.get("score_tier") as any;
    const followUpDue = searchParams.get("follow_up_due");
    const hasPhone = searchParams.get("has_phone");
    const hasWebsite = searchParams.get("has_website");
    const hasDirector = searchParams.get("has_director");
    const commercialOnly = searchParams.get("commercial_only");
    
    setFilter(prev => ({
      ...prev,
      max_age_days: ageParam ? Number(ageParam) : undefined,
      min_burglaries: crimeParam ? Number(crimeParam) : undefined,
      risk_tags: tagsParam ? tagsParam.split(',') : undefined,
      searchQuery: qParam,
      unvisited_only: unvisitedParam === "true",
      min_score: minScoreParam ? Number(minScoreParam) : undefined,
      visit_status: visitStatusParam as LeadFilter["visit_status"] || "all",
      visit_statuses: visitStatusesParam ? (visitStatusesParam.split(',') as any) : undefined,
      postcodes: postcodesParam ? postcodesParam.split(',') : (postcode ? [postcode] : undefined),
      company_age: companyAgeParam || undefined,
      score_tier: scoreTier || undefined,
      follow_up_due: followUpDue === "true",
      has_phone: hasPhone === "true",
      has_website: hasWebsite === "true",
      has_director: hasDirector === "true",
      commercial_only: commercialOnly === "true",
    }));
  }, [searchParams]);

  const handleFilterChange = useCallback((update: Partial<LeadFilter>) => {
    setFilter((prev) => ({ ...prev, ...update }));
  }, []);

  return (
    <>
      <TopBar 
        filter={filter} 
        onFilterChange={handleFilterChange} 
        onOpenFilterDrawer={() => setFilterDrawerOpen(true)}
      />

      <div className="absolute inset-0 top-[96px] bottom-[64px]">
        <LeafletMap filter={filter} />
      </div>

      <FilterDrawer
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        filter={filter}
        onApplyFilters={handleFilterChange}
      />
    </>
  );
}

export default function MapPage() {
  return (
    <main className="relative w-full h-svh overflow-hidden bg-slate-950">
      <Suspense fallback={<div className="w-full h-full bg-slate-950" />}>
        <MapContent />
      </Suspense>
      <BottomNav />
    </main>
  );
}
