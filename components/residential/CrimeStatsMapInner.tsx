"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface CrimeStatsMapInnerProps {
  stats: any[];
  selectedLocation: { lat: number; lng: number } | null;
  onMarkerClick: (loc: { lat: number; lng: number } | null) => void;
}

export default function CrimeStatsMapInner({ stats, selectedLocation, onMarkerClick }: CrimeStatsMapInnerProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Initialize map focused on Liverpool city center by default
    mapRef.current = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([53.4084, -2.9916], 12);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
      className: 'map-tiles-dark'
    }).addTo(mapRef.current);

    // Inject CSS for the dark mode filter if it doesn't exist
    if (!document.getElementById('map-dark-style')) {
      const style = document.createElement('style');
      style.id = 'map-dark-style';
      style.innerHTML = `
        .map-tiles-dark {
          filter: brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3) brightness(0.7);
        }
      `;
      document.head.appendChild(style);
    }

    layerGroupRef.current = L.layerGroup().addTo(mapRef.current);
    
    // Add custom zoom controls
    L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);
    
    // Clicking the map background clears the selection
    mapRef.current.on('click', () => {
      onMarkerClick(null);
    });
  }, [onMarkerClick]);

  useEffect(() => {
    if (!mapRef.current || !layerGroupRef.current) return;

    // Clear existing markers
    layerGroupRef.current.clearLayers();

    if (!stats || stats.length === 0) return;

    // Group stats by exact location to show density
    const locationCounts: Record<string, { count: number, lat: number, lng: number }> = {};
    
    stats.forEach(stat => {
      if (stat.location && stat.location.latitude && stat.location.longitude) {
        const key = `${stat.location.latitude},${stat.location.longitude}`;
        if (!locationCounts[key]) {
          locationCounts[key] = {
            count: 0,
            lat: parseFloat(stat.location.latitude),
            lng: parseFloat(stat.location.longitude)
          };
        }
        locationCounts[key].count++;
      }
    });

    // Determine min/max count to scale the markers
    const counts = Object.values(locationCounts).map(l => l.count);
    const maxCount = Math.max(...counts, 1);
    
    const bounds = L.latLngBounds([]);

    // Add markers to the map
    Object.values(locationCounts).forEach(loc => {
      // Calculate radius based on count (min 5, max 30)
      const radius = 5 + (loc.count / maxCount) * 25;
      
      const isSelected = selectedLocation?.lat === loc.lat && selectedLocation?.lng === loc.lng;

      const circle = L.circleMarker([loc.lat, loc.lng], {
        radius: radius,
        fillColor: isSelected ? "#ef4444" : "#3b82f6", // Red if selected, otherwise Blue
        color: isSelected ? "#f87171" : "#60a5fa",
        weight: isSelected ? 3 : 1,
        opacity: 0.8,
        fillOpacity: isSelected ? 0.8 : 0.5,
      });

      circle.bindTooltip(`<b>${loc.count} Incidents</b><br>at this location`, {
        className: 'bg-[#1A232E] text-white border-white/10 shadow-xl rounded-lg',
        direction: 'top'
      });

      circle.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        onMarkerClick({ lat: loc.lat, lng: loc.lng });
      });

      circle.addTo(layerGroupRef.current!);
      bounds.extend([loc.lat, loc.lng]);
    });

    // Only auto-fit bounds if we don't have a selected location
    if (Object.keys(locationCounts).length > 0 && !selectedLocation) {
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }

  }, [stats, selectedLocation, onMarkerClick]);

  return <div ref={containerRef} className="w-full h-full z-0" />;
}
