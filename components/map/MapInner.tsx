"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { createLeadIcon } from "./LeadMarker";
import { MapControls } from "./MapControls";
import { LeadDrawer } from "@/components/leads/LeadDrawer";
import type { Lead } from "@/lib/types";
import { useRouteStore } from "@/store/routeStore";

// Fix Leaflet default icon path broken by webpack
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const LIVERPOOL_CENTER: [number, number] = [53.4084, -2.9916];
const LIVERPOOL_ZOOM = 12;

// Free OSM tiles — we apply CSS dark-inversion via .leaflet-tile-pane filter
const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors';


interface MapInnerProps {
  leads: Lead[];
  crimeNews?: any[];
  resRoute?: {lat: number, lng: number, title: string}[];
  mode?: "commercial" | "residential";
  selectedLeadId: string | null;
  selectedLead: Lead | null;
  drawerOpen: boolean;
  onMarkerClick: (lead: Lead) => void;
  onLeadUpdate: (lead: Lead) => void;
  onDrawerClose: () => void;
}

// Component to fly to selected marker
function FlyToSelected({ lead, crimeNewsItem }: { lead?: Lead | null, crimeNewsItem?: any }) {
  const map = useMap();
  useEffect(() => {
    if (lead?.lat && lead?.lng) {
      // Pan up slightly so marker isn't hidden behind drawer
      map.flyTo([lead.lat - 0.003, lead.lng], Math.max(map.getZoom(), 15), {
        duration: 0.5,
      });
    } else if (crimeNewsItem?.lat && crimeNewsItem?.lng) {
      map.flyTo([crimeNewsItem.lat - 0.003, crimeNewsItem.lng], Math.max(map.getZoom(), 15), {
        duration: 0.5,
      });
    }
  }, [lead, crimeNewsItem, map]);
  return null;
}

// Component to fit map bounds to all loaded stops (leads + residential)
function FitBoundsToStops({ leads, resRoute = [] }: { leads: Lead[]; resRoute?: { lat: number; lng: number }[] }) {
  const map = useMap();
  useEffect(() => {
    const validLeads = leads.filter(l => l.lat && l.lng).map(l => [l.lat!, l.lng!] as [number, number]);
    const validRes = resRoute.filter(r => r.lat && r.lng).map(r => [r.lat, r.lng] as [number, number]);
    const all = [...validLeads, ...validRes];
    if (all.length === 0) return;

    const bounds = L.latLngBounds(all);
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
  }, [leads, resRoute, map]);
  
  return null;
}

// react-leaflet-cluster passes a cluster object — use a loose type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createClusterIcon(cluster: any) {
  const count = cluster.getChildCount();
  const size = count < 10 ? 36 : count < 100 ? 44 : 52;
  const color = count < 10 ? "#3b82f6" : count < 50 ? "#f97316" : "#ef4444";

  return L.divIcon({
    className: "",
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background: ${color};
        border: 2px solid rgba(255,255,255,0.2);
        box-shadow: 0 2px 12px rgba(0,0,0,0.5), 0 0 0 4px ${color}30;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: ${count < 10 ? "14" : "12"}px;
        font-weight: 700;
        font-family: system-ui, sans-serif;
      ">${count}</div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export default function MapInner({
  leads,
  crimeNews = [],
  resRoute = [],
  mode = "commercial",
  selectedLeadId,
  selectedLead,
  drawerOpen,
  onMarkerClick,
  onLeadUpdate,
  onDrawerClose,
}: MapInnerProps) {
  const { isInRoute } = useRouteStore();

  const handleCrimeNewsClick = (news: any) => {
    // For now we just alert, or we could have a NewsDrawer
    window.open(news.url, "_blank");
  };

  return (
    <>
      <MapContainer
        center={LIVERPOOL_CENTER}
        zoom={LIVERPOOL_ZOOM}
        className="w-full h-full"
        zoomControl={false}
        attributionControl={true}
        style={{ background: "#0f172a" }}
      >
        {/* Dark CartoDB tile layer */}
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} maxZoom={19} />

        {/* Custom controls */}
        <MapControls />

        {/* Fly to selected lead */}
        <FlyToSelected lead={selectedLead} />

        {/* Fit map to loaded stops */}
        <FitBoundsToStops leads={leads} resRoute={resRoute} />

        {/* Clustered markers */}
        <MarkerClusterGroup
          key={`cluster-${mode}-${mode === 'commercial' ? leads.map(l => l.id).join('-').slice(0, 100) : crimeNews.map((n: any) => n.id).join('-').slice(0, 100)}`}
          chunkedLoading
          iconCreateFunction={createClusterIcon}
          maxClusterRadius={50}
          spiderfyOnMaxZoom
          showCoverageOnHover={false}
        >
          {mode === "commercial" && leads.map((lead) => {
            if (!lead.lat || !lead.lng) return null;
            return (
              <Marker
                key={lead.id}
                position={[lead.lat, lead.lng]}
                icon={createLeadIcon(lead, lead.id === selectedLeadId, isInRoute(lead.id))}
                zIndexOffset={lead.id === selectedLeadId ? 1000 : (isInRoute(lead.id) ? 500 : (lead.lead_score >= 75 ? 100 : 0))}
                eventHandlers={{
                  click: (e) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    L.DomEvent.stopPropagation(e as any);
                    onMarkerClick(lead);
                  },
                }}
                aria-label={`${lead.company_name} — score ${lead.lead_score}`}
              />
            );
          })}
          
            {mode === "residential" && crimeNews.map((news) => {
            if (!news.lat || !news.lng) return null;
            
            // Create a simple pulsing siren icon for news
            const sirenIcon = L.divIcon({
              className: "bg-transparent",
              html: `
                <div class="relative w-8 h-8 flex items-center justify-center">
                  <div class="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75"></div>
                  <div class="relative w-6 h-6 bg-red-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-[10px]">
                    🚨
                  </div>
                </div>
              `,
              iconSize: [32, 32],
              iconAnchor: [16, 16],
            });

            return (
              <Marker
                key={news.id || news.url}
                position={[news.lat, news.lng]}
                icon={sirenIcon}
                zIndexOffset={1000}
                eventHandlers={{
                  click: (e) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    L.DomEvent.stopPropagation(e as any);
                    handleCrimeNewsClick(news);
                  },
                }}
              />
            );
          })}

          {resRoute?.map((routeItem, idx) => {
            if (!routeItem.lat || !routeItem.lng) return null;
            
            // Custom red hotspot marker
            const hotspotIcon = L.divIcon({
              className: "bg-transparent",
              html: `
                <div class="relative w-8 h-8 flex items-center justify-center">
                  <div class="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-60"></div>
                  <div class="relative w-6 h-6 bg-red-600 rounded-full border border-white shadow-[0_0_15px_rgba(255,0,0,0.8)] flex items-center justify-center text-white">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                  </div>
                </div>
              `,
              iconSize: [32, 32],
              iconAnchor: [16, 16],
            });

            return (
              <Marker
                key={`route-hotspot-${idx}`}
                position={[routeItem.lat, routeItem.lng]}
                icon={hotspotIcon}
                zIndexOffset={1000}
              >
                <Popup className="rounded-xl shadow-xl">
                  <div className="p-1 min-w-[160px]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500">
                      Residential Stop
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                      {routeItem.title}
                    </h4>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${routeItem.lat},${routeItem.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      Open in Google Maps &rarr;
                    </a>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MarkerClusterGroup>
      </MapContainer>

      {/* iOS Drawer (rendered outside the map canvas) */}
      <LeadDrawer
        lead={selectedLead}
        open={drawerOpen}
        onClose={onDrawerClose}
        onLeadUpdate={onLeadUpdate}
      />
    </>
  );
}
