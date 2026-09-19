"use client";

import { Building2, Calendar, AlertTriangle, MapPin, ChevronRight, CheckCircle2 } from "lucide-react";
import type { Lead } from "@/lib/types";
import { cn } from "@/lib/utils";

interface LeadCardProps {
  lead: Lead;
  onClick: (lead: Lead) => void;
}

export function LeadCard({ lead, onClick }: LeadCardProps) {
  const incTime = lead.incorporation_date ? new Date(lead.incorporation_date).getTime() : 0;
  const ageDays = incTime ? Math.floor((Date.now() - incTime) / (1000 * 60 * 60 * 24)) : null;

  return (
    <div 
      onClick={() => onClick(lead)}
      className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3 active:scale-[0.98] transition-transform cursor-pointer shadow-sm relative overflow-hidden"
    >
      {lead.visited && (
        <div className="absolute top-0 right-0 bg-emerald-500/20 px-3 py-1 rounded-bl-xl border-b border-l border-emerald-500/30">
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Visited
          </span>
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-bold text-white text-base leading-tight pr-12 line-clamp-2">
            {lead.company_name}
          </h3>
          <div className="flex items-center gap-1.5 mt-1 text-slate-400 text-sm">
            <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{lead.company_number}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-1">
        {lead.risk_profile_tag && (
          <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-xs font-semibold uppercase tracking-wide border border-indigo-500/30">
            {lead.risk_profile_tag.replace(/_/g, " ")}
          </span>
        )}
        
        {ageDays !== null && (
          <span className={cn(
            "px-2 py-0.5 rounded-md text-xs font-semibold uppercase tracking-wide flex items-center gap-1 border",
            ageDays < 30 ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : 
            ageDays < 90 ? "bg-blue-500/20 text-blue-300 border-blue-500/30" : 
            "bg-slate-800 text-slate-400 border-slate-700"
          )}>
            <Calendar className="w-3 h-3" />
            {ageDays < 30 ? "Fit-Out" : `${ageDays} Days`}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4 mt-1">
        {/* Address */}
        <div className="flex items-center gap-1.5 text-slate-300 text-sm flex-1 min-w-0">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-slate-500" />
          <span className="truncate">{lead.postcode}</span>
        </div>

        {/* Burglaries */}
        {(lead.recent_burglaries_count ?? 0) > 0 && (
          <div className="flex items-center gap-1 text-orange-400 text-sm font-medium whitespace-nowrap bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
            <AlertTriangle className="w-3.5 h-3.5" />
            {lead.recent_burglaries_count} Crime
          </div>
        )}
      </div>
      
    </div>
  );
}
