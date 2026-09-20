"use client";

import { MapPin, CheckCircle2, ShieldOff, GripVertical } from "lucide-react";
import type { Lead } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useRouteStore } from "@/store/routeStore";

interface RouteCardProps {
  lead: Lead;
  index: number;
  onUpdateStatus: (leadId: string, status: string) => Promise<void>;
  onClick: (lead: Lead) => void;
  dragHandleProps?: any; // from @hello-pangea/dnd
}

export function RouteCard({ lead, index, onUpdateStatus, onClick, dragHandleProps }: RouteCardProps) {
  const { removeFromRoute } = useRouteStore();
  const [isUpdating, setIsUpdating] = useState(false);
  
  const handleQuickStatus = async (e: React.MouseEvent, status: string) => {
    e.stopPropagation();
    setIsUpdating(true);
    await onUpdateStatus(lead.id, status);
    removeFromRoute(lead.id); // Remove from route after logging
    setIsUpdating(false);
  };

  return (
    <div 
      className={cn(
        "relative rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-3 overflow-hidden transition-all duration-200",
        isUpdating && "opacity-50 pointer-events-none"
      )}
      onClick={() => onClick(lead)}
    >
      <div className="flex items-center gap-3">
        {/* Drag Handle */}
        <div 
          className="p-1 -ml-1 text-slate-500 hover:text-slate-300 active:text-white cursor-grab active:cursor-grabbing"
          {...dragHandleProps}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-5 h-5" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-slate-400">
              {index + 1}.
            </span>
            <h3 className="text-sm font-bold text-white truncate">
              {lead.company_name}
            </h3>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{lead.address_line_1 || lead.postcode}</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-1.5 ml-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => handleQuickStatus(e, 'not_interested')}
            className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
            aria-label="Mark Not Interested"
          >
            <ShieldOff className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => handleQuickStatus(e, 'pitched_follow_up')}
            className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
            aria-label="Mark Pitched"
          >
            <CheckCircle2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
