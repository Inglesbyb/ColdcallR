"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import type { Lead, VisitStatus } from "@/lib/types";

// Score → marker colour mapping
function getMarkerColor(lead: Lead): string {
  if (lead.visit_status !== "unvisited") {
    return "#64748b"; // slate-500 — already visited
  }
  if (lead.lead_score >= 75 || lead.risk_profile_tag === "HIGH_CRIME_ZONE") return "#ef4444"; // red-500
  if (lead.risk_profile_tag === "ELEVATED_CRIME" || lead.risk_profile_tag === "NEW_BUSINESS") return "#f59e0b"; // amber-500
  
  const tealTags = ["PREMIUM_RETAIL", "HOSPITALITY", "INDUSTRIAL_TARGET", "AUTOMOTIVE", "HEALTHCARE"];
  if (lead.risk_profile_tag && tealTags.includes(lead.risk_profile_tag)) return "#0ea5e9"; // sky-500
  
  return "#64748b"; // slate-500 default
}

function getVisitStatusIcon(status: VisitStatus): string {
  const icons: Record<VisitStatus, string> = {
    unvisited: "",
    attempted_no_answer: "📞",
    pitched_follow_up: "💬",
    spoke_to_owner: "✓",
    gatekeeper_blocked: "🛡",
    not_interested: "✗",
    ghost_address: "👻",
  };
  return icons[status];
}

export function createLeadIcon(lead: Lead, isSelected: boolean = false, inRoute: boolean = false): L.DivIcon {
  const color = getMarkerColor(lead);
  const statusIcon = getVisitStatusIcon(lead.visit_status);
  const isHot = lead.lead_score >= 75 && lead.visit_status === "unvisited";
  const scale = isSelected ? "scale(1.25)" : "scale(1)";
  
  let ringStyle = `box-shadow: 0 2px 8px rgba(0,0,0,0.4), 0 0 0 ${isHot ? "3px" : "0"} ${isHot ? color + "60" : "transparent"};`;
  
  if (isSelected) {
    ringStyle = "box-shadow: 0 0 0 4px rgba(255,255,255,0.8), 0 4px 12px rgba(0,0,0,0.5);";
  } else if (inRoute) {
    ringStyle = "box-shadow: 0 0 0 3px #fbbf24, 0 4px 12px rgba(0,0,0,0.5);"; // Gold ring for route
  }

  return L.divIcon({
    className: "",
    html: `
      <div class="lead-marker" style="
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg) ${scale};
        transform-origin: bottom center;
        background: ${color};
        border: 2px solid rgba(255,255,255,0.25);
        ${ringStyle}
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;
      ">
        <span style="
          transform: rotate(45deg);
          font-size: ${statusIcon ? "12px" : "10px"};
          color: white;
          font-weight: 700;
          line-height: 1;
        ">${statusIcon || lead.lead_score}</span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
}

// Hook to update a marker icon when lead state changes
export function useLeadMarkerIcon(lead: Lead, isSelected: boolean = false, inRoute: boolean = false) {
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setIcon(createLeadIcon(lead, isSelected, inRoute));
    }
  }, [lead.lead_score, lead.visit_status, isSelected, inRoute]);

  return markerRef;
}
