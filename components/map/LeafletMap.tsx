"use client";

import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import type { Lead, LeadFilter } from "@/lib/types";

// Dynamically import everything Leaflet-related to avoid SSR issues
const MapInner = dynamic(() => import("./MapInner"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[var(--color-bg-base)]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500">Loading map…</p>
      </div>
    </div>
  ),
});

interface LeafletMapProps {
  filter: LeadFilter;
}

export default function LeafletMap({ filter }: LeafletMapProps) {
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fetchLeads = useCallback(async (currentFilter: LeadFilter) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (currentFilter.visit_status && currentFilter.visit_status !== "all") {
        params.set("visit_status", currentFilter.visit_status);
      }
      if (currentFilter.unvisited_only) params.set("unvisited_only", "true");
      
      // New Drawer Filters
      if (currentFilter.max_age_days !== null && currentFilter.max_age_days !== undefined) {
        params.set("max_age_days", String(currentFilter.max_age_days));
      }
      if (currentFilter.min_burglaries !== undefined) {
        params.set("min_burglaries", String(currentFilter.min_burglaries));
      }
      if (currentFilter.risk_tags && currentFilter.risk_tags.length > 0) {
        params.set("risk_tags", currentFilter.risk_tags.join(","));
      }
      if (currentFilter.searchQuery) {
        params.set("q", currentFilter.searchQuery);
      }
      
      params.set("limit", "500");

      const res = await fetch(`/api/leads?${params}`);
      if (!res.ok) throw new Error("Failed to fetch leads");
      const { leads: data } = await res.json();
      setAllLeads(data ?? []);
    } catch (err) {
      console.error("Failed to load leads:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads(filter);
  }, [fetchLeads, filter]);

  // Bulletproof client-side filtering
  const filteredLeads = React.useMemo(() => {
    return allLeads.filter((lead) => {
      // 1. Hard guarantee: active only
      if (lead.company_status?.toLowerCase() !== "active") return false;

      // Legacy top bar filters
      if (filter.visit_status && filter.visit_status !== "all" && lead.visit_status !== filter.visit_status) return false;
      if (filter.unvisited_only && lead.visited) return false;
      
      // 2. Business Age Filter
      if (filter.max_age_days) {
        if (!lead.incorporation_date) return false;
        const incTime = new Date(lead.incorporation_date).getTime();
        const ageInDays = (Date.now() - incTime) / (1000 * 60 * 60 * 24);
        if (filter.max_age_days === 365 && ageInDays < 365) return false; // 1+ years logic override
        if (filter.max_age_days < 365 && ageInDays > filter.max_age_days) return false;
      }

      // 3. Crime Stats Filter
      if (filter.min_burglaries && filter.min_burglaries > 0) {
        if ((lead.recent_burglaries_count || 0) < filter.min_burglaries) {
          return false;
        }
      }

      // 4. Risk / Sector Filter
      if (filter.risk_tags && filter.risk_tags.length > 0) {
        if (!lead.risk_profile_tag || !filter.risk_tags.includes(lead.risk_profile_tag)) {
          return false;
        }
      }

      return true;
    });
  }, [allLeads, filter]);

  const handleMarkerClick = useCallback((lead: Lead) => {
    setSelectedLead(lead);
    setDrawerOpen(true);
  }, []);

  const handleLeadUpdate = useCallback((updatedLead: Lead) => {
    setAllLeads((prev) =>
      prev.map((l) => (l.id === updatedLead.id ? updatedLead : l))
    );
    setSelectedLead(updatedLead);
  }, []);

  const handleDrawerClose = useCallback(() => {
    setDrawerOpen(false);
    // Small delay before clearing to avoid flicker during close animation
    setTimeout(() => setSelectedLead(null), 300);
  }, []);

  return (
    <div className="relative w-full h-full">
      {/* Loading indicator overlay */}
      {loading && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1001] flex items-center gap-2 px-3 py-1.5 rounded-full glass shadow-lg">
          <div className="w-3 h-3 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-300">Loading leads…</span>
        </div>
      )}

      {/* Lead count pill */}
      {!loading && filteredLeads.length > 0 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1001] px-3 py-1.5 rounded-full glass shadow-lg">
          <span className="text-xs text-slate-300 font-medium">
            {filteredLeads.length} leads on map
          </span>
        </div>
      )}

      {/* No leads state */}
      {!loading && filteredLeads.length === 0 && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1001] max-w-xs text-center">
          <div className="glass rounded-2xl p-6 shadow-xl border border-[var(--glass-border)] animate-scale-in">
            <p className="text-2xl mb-2">🗺️</p>
            <p className="text-white font-semibold mb-1">No leads yet</p>
            <p className="text-sm text-slate-400">
              Run <code className="text-[var(--color-accent)]">POST /api/seed</code> to pull
              live Liverpool business data onto the map.
            </p>
          </div>
        </div>
      )}

      <MapInner
        leads={filteredLeads}
        selectedLeadId={selectedLead?.id ?? null}
        selectedLead={selectedLead}
        drawerOpen={drawerOpen}
        onMarkerClick={handleMarkerClick}
        onLeadUpdate={handleLeadUpdate}
        onDrawerClose={handleDrawerClose}
      />
    </div>
  );
}
