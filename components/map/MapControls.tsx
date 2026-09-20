"use client";

import { useState, useCallback } from "react";
import { Locate, Layers, ZoomIn, ZoomOut } from "lucide-react";
import { useMap } from "react-leaflet";
import { cn } from "@/lib/utils";

// Liverpool bounding box
const LIVERPOOL_CENTER: [number, number] = [53.4084, -2.9916];
const LIVERPOOL_ZOOM = 12;

export function MapControls() {
  const map = useMap();
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState(false);

  const handleLocate = useCallback(() => {
    setLocating(true);
    setLocateError(false);

    map.locate({ setView: true, maxZoom: 15 });

    const onSuccess = () => {
      setLocating(false);
      map.off("locationerror", onError);
    };
    const onError = () => {
      setLocating(false);
      setLocateError(true);
      map.off("locationfound", onSuccess);
      // Fall back to Liverpool centre
      map.setView(LIVERPOOL_CENTER, LIVERPOOL_ZOOM);
    };

    map.once("locationfound", onSuccess);
    map.once("locationerror", onError);
  }, [map]);

  const handleReset = useCallback(() => {
    map.setView(LIVERPOOL_CENTER, LIVERPOOL_ZOOM);
  }, [map]);

  const btnClass = cn(
    "w-11 h-11 rounded-2xl glass flex items-center justify-center shadow-lg",
    "text-slate-300 hover:text-white hover:bg-[var(--color-bg-overlay)] transition-all",
    "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] active:scale-90"
  );

  return (
    <div className="absolute right-3 top-20 z-[1000] flex flex-col gap-2">
      {/* Locate Me */}
      <button
        onClick={handleLocate}
        title="Find my location"
        className={cn(btnClass, locating && "text-[var(--color-accent)] animate-pulse")}
      >
        <Locate className={cn("w-5 h-5", locateError && "text-red-400")} />
      </button>

      {/* Zoom In */}
      <button onClick={() => map.zoomIn()} title="Zoom in" className={btnClass}>
        <ZoomIn className="w-5 h-5" />
      </button>

      {/* Zoom Out */}
      <button onClick={() => map.zoomOut()} title="Zoom out" className={btnClass}>
        <ZoomOut className="w-5 h-5" />
      </button>

      {/* Reset to Liverpool */}
      <button onClick={handleReset} title="Reset to Liverpool" className={btnClass}>
        <Layers className="w-5 h-5" />
      </button>
    </div>
  );
}
