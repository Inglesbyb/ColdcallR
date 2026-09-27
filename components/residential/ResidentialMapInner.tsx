"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { formatDistanceToNow } from "date-fns";
import L from "leaflet";
import { Clock } from "lucide-react";

// Fix Leaflet's default icon path issues
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface ResidentialMapInnerProps {
  news: any[];
  selectedNewsId: string | null;
  onNewsClick: (id: string) => void;
}

// Component to handle auto-panning to selected marker
function MapUpdater({ selectedNewsId, news }: { selectedNewsId: string | null, news: any[] }) {
  const map = useMap();
  useEffect(() => {
    if (selectedNewsId) {
      const selectedItem = news.find(n => n.id === selectedNewsId);
      if (selectedItem && selectedItem.lat && selectedItem.lng) {
        map.flyTo([selectedItem.lat, selectedItem.lng], 16, { animate: true, duration: 1.5 });
      }
    }
  }, [selectedNewsId, news, map]);
  return null;
}

// Component to automatically fit the map to the available data
function FitBoundsToHotspots({ news }: { news: any[] }) {
  const map = useMap();
  useEffect(() => {
    if (news.length === 0) return;
    const valid = news.filter(n => n.lat && n.lng);
    if (valid.length === 0) return;

    const bounds = L.latLngBounds(valid.map(n => [n.lat, n.lng]));
    // If only 1 point, fly to it, otherwise fit bounds
    if (valid.length === 1) {
      map.flyTo([valid[0].lat, valid[0].lng], 15, { animate: true });
    } else {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16, animate: true });
    }
  }, [news, map]);
  return null;
}

// Create a glowing, pulsing "Heat Signature" icon
function createHeatIcon(isSelected: boolean, isRecent: boolean) {
  const coreColor = isSelected ? "bg-red-500" : (isRecent ? "bg-rose-500" : "bg-orange-500");
  const glowColor = isSelected ? "bg-red-500/50" : (isRecent ? "bg-rose-500/40" : "bg-orange-500/30");
  const pingColor = isSelected ? "bg-red-400" : (isRecent ? "bg-rose-400" : "bg-orange-400");
  
  const size = isSelected ? 48 : (isRecent ? 36 : 24);
  const coreSize = isSelected ? 16 : (isRecent ? 12 : 8);

  return L.divIcon({
    className: "bg-transparent",
    html: `
      <div class="relative flex items-center justify-center" style="width: ${size}px; height: ${size}px;">
        <!-- Outer Glow / Ping -->
        <div class="absolute inset-0 rounded-full ${pingColor} ${isSelected || isRecent ? 'animate-ping' : ''} opacity-40"></div>
        
        <!-- Inner Glow -->
        <div class="absolute rounded-full ${glowColor} blur-sm" style="width: ${size * 0.8}px; height: ${size * 0.8}px;"></div>
        
        <!-- Core -->
        <div class="relative rounded-full ${coreColor} border border-white/50 shadow-[0_0_15px_rgba(255,0,0,0.5)]" style="width: ${coreSize}px; height: ${coreSize}px;"></div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

export default function ResidentialMapInner({ news, selectedNewsId, onNewsClick }: ResidentialMapInnerProps) {
  // Default center to Liverpool
  const center: [number, number] = [53.4084, -2.9916];
  
  const newsWithCoords = news.filter(n => n.lat && n.lng);

  return (
    <MapContainer
      center={center}
      zoom={12}
      className="w-full h-full"
      zoomControl={false}
      style={{ background: "#0f172a" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
        maxZoom={19}
        className="map-tiles-dark"
      />
      <style>{`
        .map-tiles-dark {
          filter: brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3) brightness(0.7);
        }
      `}</style>
      
      <MapUpdater selectedNewsId={selectedNewsId} news={newsWithCoords} />
      <FitBoundsToHotspots news={newsWithCoords} />

      {newsWithCoords.map((item) => {
        const isSelected = selectedNewsId === item.id;
        
        const hoursAgo = item.published_at 
          ? (new Date().getTime() - new Date(item.published_at).getTime()) / (1000 * 60 * 60)
          : 48;
        const isRecent = hoursAgo < 24;

        return (
          <Marker
            key={item.id}
            position={[item.lat, item.lng]}
            icon={createHeatIcon(isSelected, isRecent)}
            zIndexOffset={isSelected ? 1000 : (isRecent ? 500 : 0)}
            eventHandlers={{
              click: () => onNewsClick(item.id),
            }}
          >
            <Popup closeButton={false}>
              <div className="p-1 space-y-2 min-w-[180px]">
                <div className="flex items-center gap-2 mb-1">
                   <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500/20 text-red-400">
                    {item.crime_type || "Incident"}
                   </span>
                </div>
                <h4 className="font-semibold text-slate-200 text-sm leading-tight line-clamp-2">
                  {item.title}
                </h4>
                {item.published_at && (
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(item.published_at), { addSuffix: true })}
                  </span>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
