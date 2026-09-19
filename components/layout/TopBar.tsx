"use client";

import React, { useState, useCallback } from "react";
import { Search, SlidersHorizontal, X, Flame, Eye, EyeOff } from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import type { LeadFilter } from "@/lib/types";
import { useDebounce } from "@/lib/hooks/useDebounce";

interface TopBarProps {
  filter: LeadFilter;
  onFilterChange: (filter: Partial<LeadFilter>) => void;
  onOpenFilterDrawer: () => void;
}

export function TopBar({ filter, onFilterChange, onOpenFilterDrawer }: TopBarProps) {
  const [searchValue, setSearchValue] = useState(filter.searchQuery || "");

  // Update input if filter.searchQuery changes externally (e.g. from URL)
  React.useEffect(() => {
    if (filter.searchQuery !== undefined) {
      setSearchValue(filter.searchQuery);
    }
  }, [filter.searchQuery]);

  // Debounce the search input so we don't spam the API/filter
  const debouncedSearch = useDebounce(searchValue, 300);

  React.useEffect(() => {
    onFilterChange({ searchQuery: debouncedSearch });
  }, [debouncedSearch, onFilterChange]);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const syncToUrl = useCallback((update: Partial<LeadFilter>, mergeSearch: boolean = false) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if ('min_score' in update) {
      if (update.min_score === undefined) params.delete("min_score");
      else params.set("min_score", String(update.min_score));
    }
    
    if ('unvisited_only' in update) {
      if (update.unvisited_only === false) params.delete("unvisited_only");
      else params.set("unvisited_only", "true");
    }

    if (mergeSearch && 'searchQuery' in update) {
      if (!update.searchQuery) params.delete("q");
      else params.set("q", update.searchQuery);
    }

    if ('visit_status' in update && update.visit_status === "all") {
      params.delete("visit_status");
    }

    router.replace(`${pathname}?${params.toString()}`);
  }, [searchParams, router, pathname]);

  const handleHotToggle = useCallback(() => {
    const newScore = filter.min_score === 75 ? undefined : 75;
    onFilterChange({ min_score: newScore });
    syncToUrl({ min_score: newScore });
  }, [filter.min_score, onFilterChange, syncToUrl]);

  const handleUnvisitedToggle = useCallback(() => {
    const newUnvisited = !filter.unvisited_only;
    onFilterChange({ unvisited_only: newUnvisited });
    syncToUrl({ unvisited_only: newUnvisited });
  }, [filter.unvisited_only, onFilterChange, syncToUrl]);

  const handleClearFilters = useCallback(() => {
    onFilterChange({
      min_score: undefined,
      unvisited_only: false,
      visit_status: "all",
    });
    setSearchValue("");
    syncToUrl({ min_score: undefined, unvisited_only: false, visit_status: "all" });
  }, [onFilterChange, syncToUrl]);

  const hasActiveFilters = filter.min_score !== undefined || filter.unvisited_only;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[999] bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/80 px-3 py-3 pt-safe"
      role="search"
      aria-label="Lead filters"
    >
      {/* Search bar */}
      <div className="relative mb-2.5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="search"
          placeholder="Search company, postcode…"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="w-full h-10 pl-9 pr-4 rounded-xl bg-slate-800/80 border border-slate-700/60 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
          aria-label="Search leads"
        />
        {searchValue && (
          <button
            onClick={() => setSearchValue("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-0.5">
        {/* Hot leads */}
        <FilterPill
          active={filter.min_score === 75}
          onClick={handleHotToggle}
          icon={<Flame className="w-3.5 h-3.5" />}
          label="Hot Only"
          activeClassName="bg-red-600/30 border-red-500/60 text-red-300"
        />

        {/* Unvisited */}
        <FilterPill
          active={!!filter.unvisited_only}
          onClick={handleUnvisitedToggle}
          icon={
            filter.unvisited_only ? (
              <EyeOff className="w-3.5 h-3.5" />
            ) : (
              <Eye className="w-3.5 h-3.5" />
            )
          }
          label="Unvisited"
          activeClassName="bg-blue-600/30 border-blue-500/60 text-blue-300"
        />

        {/* Clear all */}
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-600/60 bg-slate-700/50 text-slate-300 text-xs font-medium whitespace-nowrap transition-all hover:bg-slate-600/50"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        )}

        {/* Spacer + filter icon */}
        <div className="ml-auto flex-shrink-0">
          <button
            onClick={onOpenFilterDrawer}
            className="w-8 h-8 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
            aria-label="More filters"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

interface FilterPillProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  activeClassName: string;
}

function FilterPill({ active, onClick, icon, label, activeClassName }: FilterPillProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium whitespace-nowrap transition-all duration-150",
        "focus:outline-none focus:ring-2 focus:ring-blue-500/50",
        active
          ? activeClassName
          : "border-slate-700/60 bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 hover:text-slate-300"
      )}
      aria-pressed={active}
    >
      {icon}
      {label}
    </button>
  );
}
