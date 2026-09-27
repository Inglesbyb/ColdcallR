"use client";

import React, { useEffect, useRef } from "react";
import { AlertTriangle, Clock, MapPin, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface NewsRecommendationsProps {
  news: any[];
  loading: boolean;
  selectedNewsId: string | null;
  onNewsClick: (id: string) => void;
  onAddToRoute?: (loc: { lat: number, lng: number, title: string }) => void;
}

export function NewsRecommendations({ news, loading, selectedNewsId, onNewsClick, onAddToRoute }: NewsRecommendationsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll to selected item
  useEffect(() => {
    if (selectedNewsId && containerRef.current) {
      const el = containerRef.current.querySelector(`[data-news-id="${selectedNewsId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [selectedNewsId]);

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="h-6 w-48 bg-slate-800 rounded animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (news.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-3">
          <AlertTriangle className="w-6 h-6 text-slate-500" />
        </div>
        <p className="text-slate-300 font-medium">No recent incidents found.</p>
        <p className="text-slate-500 text-sm mt-1">
          The scraper didn't find any recent local crime news with identifiable locations.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4" ref={containerRef}>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          Recommended Hotspots
        </h2>
        <span className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded-full">
          Based on News
        </span>
      </div>

      <div className="space-y-3 pb-8">
        {news.map((item) => (
          <div
            key={item.id}
            data-news-id={item.id}
            onClick={() => onNewsClick(item.id)}
            className={cn(
              "block p-4 rounded-xl border transition-all cursor-pointer",
              selectedNewsId === item.id 
                ? "bg-red-500/10 border-red-500/30 ring-1 ring-red-500/50" 
                : "bg-slate-800/60 border-slate-700/60 hover:bg-slate-700/80"
            )}
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/20">
                {item.crime_type || "Incident"}
              </span>
              {item.published_at && (
                <span className="text-xs text-slate-400 flex items-center gap-1 shrink-0">
                  <Clock className="w-3 h-3" />
                  {formatDistanceToNow(new Date(item.published_at), { addSuffix: true })}
                </span>
              )}
            </div>
            
            <h3 className="text-sm font-semibold text-slate-200 line-clamp-2 leading-snug mb-3">
              {item.title}
            </h3>
            
            <div className="flex items-center justify-between mt-auto">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                {item.extracted_location || "Unknown Area"}
              </div>
              
              <div className="flex items-center gap-3">
                {item.lat && item.lng && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onAddToRoute) {
                        onAddToRoute({ lat: item.lat, lng: item.lng, title: item.title });
                      }
                    }}
                    className="text-xs font-bold text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-2 py-1 rounded transition-colors"
                  >
                    + Route
                  </button>
                )}
                <a 
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-300"
                >
                  Source <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
