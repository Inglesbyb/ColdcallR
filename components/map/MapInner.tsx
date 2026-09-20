"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
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
  selectedLeadId: string | null;
  selectedLead: Lead | null;
  drawerOpen: boolean;
  onMarkerClick: (lead: Lead) => void;
  onLeadUpdate: (lead: Lead) => void;
  onDrawerClose: () => void;
}

// Component to fly to selected marker
function FlyToSelected({ lead }: { lead: Lead | null }) {
  const map = useMap();
  useEffect(() => {
    if (lead?.lat && lead?.lng) {
      // Pan up slightly so marker isn't hidden behind drawer
      map.flyTo([lead.lat - 0.003, lead.lng], Math.max(map.getZoom(), 15), {
        duration: 0.5,
      });
    }
  }, [lead, map]);
  return null;
}

// Component to fit map bounds to the loaded leads
function FitBoundsToLeads({ leads }: { leads: Lead[] }) {
  const map = useMap();
  useEffect(() => {
    if (leads.length === 0) return;
    const validLeads = leads.filter(l => l.lat && l.lng);
    if (validLeads.length === 0) return;

    const bounds = L.latLngBounds(validLeads.map(l => [l.lat!, l.lng!]));
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
  }, [leads, map]);
  
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
  selectedLeadId,
  selectedLead,
  drawerOpen,
  onMarkerClick,
  onLeadUpdate,
  onDrawerClose,
}: MapInnerProps) {
  const { isInRoute } = useRouteStore();

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

        {/* Fit map to loaded leads */}
        <FitBoundsToLeads leads={leads} />

        {/* Clustered markers */}
        <MarkerClusterGroup
          key={`cluster-${leads.map(l => l.id).join('-').slice(0, 100)}-${leads.length}`}
          chunkedLoading
          iconCreateFunction={createClusterIcon}
          maxClusterRadius={50}
          spiderfyOnMaxZoom
          showCoverageOnHover={false}
        >
          {leads.map((lead) => {
            if (!lead.lat || !lead.lng) return null;
            return (
              <Marker
                key={lead.id}
                position={[lead.lat, lead.lng]}
                icon={createLeadIcon(lead, lead.id === selectedLeadId, isInRoute(lead.id))}
                zIndexOffset={lead.id === selectedLeadId ? 1000 : (isInRoute(lead.id) ? 500 : (lead.lead_score >= 75 ? 100 : 0))}
                eventHandlers={{
                  click: (e) => {
                    L.DomEvent.stopPropagation(e as any);
                    onMarkerClick(lead);
                  },
                }}
                aria-label={`${lead.company_name} — score ${lead.lead_score}`}
              />
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
