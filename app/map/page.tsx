"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import { BottomNav } from "@/components/layout/BottomNav";
import { X, MapPin, Navigation } from "lucide-react";
import type { Lead } from "@/lib/types";
import { useRouteStore } from "@/store/routeStore";

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
  const { items, clearRoute } = useRouteStore();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Derive residential route from store
  const resRoute = items
    .filter((i) => i.type === "residential")
    .map((i) => ({ lat: (i as any).lat, lng: (i as any).lng, title: (i as any).title }));

  // Derive tagged commercial IDs from store
  const storeLeadIds = new Set(
    items.filter((i) => i.type === "commercial").map((i) => (i as any).id)
  );

  // Load tagged IDs from session storage (legacy map-tag flow)
  useEffect(() => {
    setTaggedIds(getTaggedFromStorage());
  }, []);

  // Fetch only the tagged leads
  useEffect(() => {
    // Combine sessionStorage tags (legacy map-tag) + store commercial IDs
    const combined = new Set([...taggedIds, ...storeLeadIds]);
    if (combined.size === 0) {
      setLeads([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const ids = [...combined];

    fetch(`/api/leads?limit=500&sort_by=score`)
      .then(res => res.json())
      .then(({ leads: data }) => {
        const tagged = (data ?? []).filter((l: Lead) => combined.has(l.id));
        setLeads(tagged);
      })
      .catch(err => console.error("Failed to load leads:", err))
      .finally(() => setLoading(false));
  }, [taggedIds, items]);

  const handleClearAll = useCallback(() => {
    // Clear legacy sessionStorage tags
    setTaggedIds(new Set());
    saveTaggedToStorage(new Set());
    setLeads([]);
    // Clear Planner store too so map pins disappear
    clearRoute();
  }, [clearRoute]);

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
    // Merge commercial leads and residential hotspots
    const sortedLeads = [...leads].sort((a, b) => b.lead_score - a.lead_score);

    const toAddress = (lead: Lead) =>
      [lead.address_line_1, lead.locality, lead.postcode]
        .filter(Boolean)
        .join(", ");

    const commWaypoints = sortedLeads.map((l) => encodeURIComponent(toAddress(l)));
    const resWaypoints = resRoute.map((r) => `${r.lat},${r.lng}`);

    const waypoints = [...commWaypoints, ...resWaypoints];

    if (waypoints.length < 1) return;

    if (waypoints.length === 1) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${waypoints[0]}`, "_blank");
      return;
    }

    const origin = waypoints[0];
    const destination = waypoints[waypoints.length - 1];
    const middle = waypoints.slice(1, -1).join("|");

    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
    if (middle) url += `&waypoints=${middle}`;

    window.open(url, "_blank");
  }, [leads, resRoute]);

  const totalStops = leads.length + resRoute.length;

  return (
    <>
      {/* Floating status pill */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1001]">
        {loading ? (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full glass shadow-lg">
            <div className="w-3 h-3 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-slate-300 font-medium">Loading…</span>
          </div>
        ) : totalStops > 0 ? (
          <div className="flex items-center gap-2">
            {/* Lead count pill */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-full glass shadow-lg border border-[var(--color-accent)]/30">
              <MapPin className="w-3.5 h-3.5 text-[var(--color-accent)]" />
              <span className="text-xs text-white font-semibold">
                {totalStops} Route Stop{totalStops !== 1 ? "s" : ""}
              </span>
              <button
                onClick={handleClearAll}
                className="ml-1 w-5 h-5 rounded-full bg-slate-700 hover:bg-red-500/30 flex items-center justify-center transition-colors"
                title="Clear Entire Route"
              >
                <X className="w-3 h-3 text-slate-400 hover:text-red-300" />
              </button>
            </div>

            {/* Plot Route button */}
            {totalStops >= 1 && (
              <button
                onClick={handlePlotRoute}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full glass shadow-lg border border-[var(--color-accent)]/50 bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90 text-white text-xs font-semibold active:scale-95 transition-all"
              >
                <Navigation className="w-3.5 h-3.5" />
                Plot Route
              </button>
            )}
          </div>
        ) : null}
      </div>

      {/* Empty state */}
      {!loading && totalStops === 0 && (
        <div className="absolute inset-0 top-0 bottom-[64px] flex items-center justify-center z-[1001] pointer-events-none">
          <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-2xl p-8 shadow-xl text-center max-w-xs mx-4 pointer-events-auto animate-scale-in">
            <div className="w-16 h-16 bg-[var(--color-bg-overlay)] rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-slate-500" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2 font-display">Map is empty</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Tag leads from the <span className="text-[var(--color-accent)] font-medium">Commercial</span> tab, or add areas from <span className="text-blue-400 font-medium">Residential</span> — they'll appear here automatically.
            </p>
          </div>
        </div>
      )}

      {/* Map canvas */}
      <div className="absolute inset-0 bottom-[64px]">
        <MapInner
          leads={leads}
          resRoute={resRoute}
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
  // Reactively read planner count from store for the Map tab badge
  const { items } = useRouteStore();
  const taggedCount = items.filter(i => i.type === "commercial").length;

  return (
    <main className="relative w-full h-svh overflow-hidden bg-[var(--color-bg-base)]">
      <Suspense fallback={<div className="w-full h-full bg-[var(--color-bg-base)]" />}>
        <MapContent />
      </Suspense>
      <BottomNav taggedCount={taggedCount} />
    </main>
  );
}
