"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import { BottomNav } from "@/components/layout/BottomNav";
import { X, MapPin, Navigation } from "lucide-react";
import type { Lead } from "@/lib/types";

// Dynamic import of the full Leaflet map (no SSR)
const MapInner = dynamic(() => import("@/components/map/MapInner"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-full bg-[var(--color-bg-base)]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500">Loading map…</p>
      </div>
    </div>
  ),
});

// ─── Session storage helpers ──────────────────────────────
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

function MapContent() {
  const [taggedIds, setTaggedIds] = useState<Set<string>>(new Set());
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Load tagged IDs from session storage
  useEffect(() => {
    setTaggedIds(getTaggedFromStorage());
  }, []);

  // Fetch only the tagged leads
  useEffect(() => {
    if (taggedIds.size === 0) {
      setLeads([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const ids = [...taggedIds];

    // Fetch all leads and filter to tagged ones
    // Since we may have many tagged leads, fetch a large batch
    const params = new URLSearchParams();
    params.set("limit", "500");
    params.set("sort_by", "score");

    fetch(`/api/leads?${params}`)
      .then(res => res.json())
      .then(({ leads: data }) => {
        const tagged = (data ?? []).filter((l: Lead) => taggedIds.has(l.id));
        setLeads(tagged);
      })
      .catch(err => console.error("Failed to load leads:", err))
      .finally(() => setLoading(false));
  }, [taggedIds]);

  const handleClearAll = useCallback(() => {
    setTaggedIds(new Set());
    saveTaggedToStorage(new Set());
    setLeads([]);
  }, []);

  const handleMarkerClick = useCallback((lead: Lead) => {
    setSelectedLead(lead);
    setDrawerOpen(true);
  }, []);

  const handleLeadUpdate = useCallback((updatedLead: Lead) => {
    setLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l));
    setSelectedLead(updatedLead);
  }, []);

  const handleDrawerClose = useCallback(() => {
    setDrawerOpen(false);
    setTimeout(() => setSelectedLead(null), 300);
  }, []);

  const handlePlotRoute = useCallback(() => {
    if (leads.length < 2) return;

    // Sort by score desc — hottest stops first
    const sorted = [...leads].sort((a, b) => b.lead_score - a.lead_score);

    const toAddress = (lead: Lead) =>
      [lead.address_line_1, lead.locality, lead.postcode]
        .filter(Boolean)
        .join(", ");

    const origin = encodeURIComponent(toAddress(sorted[0]));
    const destination = encodeURIComponent(toAddress(sorted[sorted.length - 1]));
    const waypoints = sorted
      .slice(1, -1)
      .map((l) => encodeURIComponent(toAddress(l)))
      .join("|");

    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
    if (waypoints) url += `&waypoints=${waypoints}`;

    window.open(url, "_blank");
  }, [leads]);

  return (
    <>
      {/* Floating status pill */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1001]">
        {loading ? (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full glass shadow-lg">
            <div className="w-3 h-3 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-slate-300 font-medium">Loading…</span>
          </div>
        ) : leads.length > 0 ? (
          <div className="flex items-center gap-2">
            {/* Lead count pill */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-full glass shadow-lg">
              <MapPin className="w-3.5 h-3.5 text-[var(--color-accent)]" />
              <span className="text-xs text-white font-semibold">
                {leads.length} tagged lead{leads.length !== 1 ? "s" : ""}
              </span>
              <button
                onClick={handleClearAll}
                className="ml-1 w-5 h-5 rounded-full bg-slate-700 hover:bg-red-500/30 flex items-center justify-center transition-colors"
              >
                <X className="w-3 h-3 text-slate-400 hover:text-red-300" />
              </button>
            </div>

            {/* Plot Route button — only when 2+ leads */}
            {leads.length >= 2 && (
              <button
                onClick={handlePlotRoute}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full glass shadow-lg border border-[var(--color-accent)]/30 text-[var(--color-accent)] text-xs font-semibold hover:bg-[var(--color-accent)]/10 active:scale-95 transition-all"
              >
                <Navigation className="w-3.5 h-3.5" />
                Plot Route
              </button>
            )}
          </div>
        ) : null}
      </div>

      {/* Empty state */}
      {!loading && leads.length === 0 && (
        <div className="absolute inset-0 top-0 bottom-[64px] flex items-center justify-center z-[1001] pointer-events-none">
          <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-2xl p-8 shadow-xl text-center max-w-xs mx-4 pointer-events-auto animate-scale-in">
            <div className="w-16 h-16 bg-[var(--color-bg-overlay)] rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-slate-500" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2 font-display">No leads tagged</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Tag leads from the <span className="text-[var(--color-accent)] font-medium">Leads</span> tab to plot them on the map.
            </p>
          </div>
        </div>
      )}

      {/* Map canvas */}
      <div className="absolute inset-0 bottom-[64px]">
        <MapInner
          leads={leads}
          selectedLeadId={selectedLead?.id ?? null}
          selectedLead={selectedLead}
          drawerOpen={drawerOpen}
          onMarkerClick={handleMarkerClick}
          onLeadUpdate={handleLeadUpdate}
          onDrawerClose={handleDrawerClose}
        />
      </div>
    </>
  );
}

export default function MapPage() {
  const [taggedCount, setTaggedCount] = useState(0);

  useEffect(() => {
    setTaggedCount(getTaggedFromStorage().size);
  }, []);

  return (
    <main className="relative w-full h-svh overflow-hidden bg-[var(--color-bg-base)]">
      <Suspense fallback={<div className="w-full h-full bg-[var(--color-bg-base)]" />}>
        <MapContent />
      </Suspense>
      <BottomNav taggedCount={taggedCount} />
    </main>
  );
}
