"use client";

import { Building2, Calendar, AlertTriangle, MapPin, CheckCircle2 } from "lucide-react";
import { ScoreBadge } from "@/components/leads/ScoreBadge";
import type { Lead } from "@/lib/types";
import { cn } from "@/lib/utils";

interface LeadCardProps {
  lead: Lead;
  onClick: (lead: Lead) => void;
  isTagged?: boolean;
  onToggleTag?: (lead: Lead) => void;
}

function getAccentColor(tag: Lead["risk_profile_tag"]): string {
  const map: Record<string, string> = {
    HIGH_CRIME_ZONE: "bg-red-500",
    ELEVATED_CRIME: "bg-orange-500",
    NEW_BUSINESS: "bg-blue-500",
    PREMIUM_RETAIL: "bg-purple-500",
    INDUSTRIAL_TARGET: "bg-slate-500",
    AUTOMOTIVE: "bg-cyan-500",
    HOSPITALITY: "bg-amber-500",
    HEALTHCARE: "bg-emerald-500",
    STANDARD: "bg-slate-600",
  };
  return map[tag ?? "STANDARD"] ?? "bg-slate-600";
}

export function LeadCard({ lead, onClick, isTagged = false, onToggleTag }: LeadCardProps) {
  const incTime = lead.incorporation_date ? new Date(lead.incorporation_date).getTime() : 0;
  const ageDays = incTime ? Math.floor((Date.now() - incTime) / (1000 * 60 * 60 * 24)) : null;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl transition-all duration-200 cursor-pointer group",
        "bg-[var(--color-bg-surface)] border",
        isTagged
          ? "border-[var(--color-accent)]/40 shadow-[0_0_12px_var(--color-accent-glow)]"
          : "border-[var(--color-border)] hover:border-[var(--color-border-subtle)]",
        "active:scale-[0.98]"
      )}
    >
      {/* Left accent strip */}
      <div className={`accent-strip ${getAccentColor(lead.risk_profile_tag)}`} />

      {/* Visited overlay */}
      {lead.visited && (
        <div className="absolute top-2.5 right-2.5 z-10">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 uppercase tracking-wider">
            <CheckCircle2 className="w-3 h-3" /> Visited
          </span>
        </div>
      )}

      <div className="flex items-stretch">
        {/* Tag checkbox area */}
        {onToggleTag && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleTag(lead);
            }}
            className={cn(
              "flex items-center justify-center w-12 flex-shrink-0 border-r transition-colors touch-target",
              isTagged
                ? "bg-[var(--color-accent)]/8 border-[var(--color-accent)]/20"
                : "bg-transparent border-[var(--color-border)]"
            )}
            aria-label={isTagged ? "Remove from map" : "Tag for map"}
          >
            <div
              className={cn(
                "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200",
                isTagged
                  ? "bg-[var(--color-accent)] border-[var(--color-accent)] scale-100"
                  : "border-slate-600 bg-transparent group-hover:border-slate-500"
              )}
            >
              {isTagged && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </button>
        )}

        {/* Main card content */}
        <div className="flex-1 p-4 pl-5" onClick={() => onClick(lead)}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-white text-[15px] leading-tight line-clamp-1 font-display">
                {lead.company_name}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5 text-slate-500 text-xs">
                <Building2 className="w-3 h-3 flex-shrink-0" />
                <span>{lead.company_number}</span>
              </div>
            </div>
            <ScoreBadge score={lead.lead_score} size="sm" />
          </div>

          {/* Tags row */}
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {lead.risk_profile_tag && (
              <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 text-[10px] font-semibold uppercase tracking-wide border border-indigo-500/15">
                {lead.risk_profile_tag.replace(/_/g, " ")}
              </span>
            )}

            {ageDays !== null && (
              <span className={cn(
                "px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide flex items-center gap-1 border",
                ageDays < 30 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/15" :
                ageDays < 90 ? "bg-blue-500/10 text-blue-400 border-blue-500/15" :
                "bg-[var(--color-bg-overlay)] text-slate-500 border-[var(--color-border)]"
              )}>
                <Calendar className="w-2.5 h-2.5" />
                {ageDays < 30 ? "Fit-Out" : `${ageDays}d`}
              </span>
            )}
          </div>

          {/* Bottom metadata row */}
          <div className="flex items-center gap-3 mt-2.5">
            <div className="flex items-center gap-1 text-slate-400 text-xs min-w-0">
              <MapPin className="w-3 h-3 flex-shrink-0 text-slate-600" />
              <span className="truncate">{lead.postcode}</span>
            </div>

            {(lead.recent_burglaries_count ?? 0) > 0 && (
              <div className="flex items-center gap-1 text-orange-400 text-xs font-semibold whitespace-nowrap bg-orange-500/8 px-2 py-0.5 rounded-md border border-orange-500/15">
                <AlertTriangle className="w-3 h-3" />
                {lead.recent_burglaries_count}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
