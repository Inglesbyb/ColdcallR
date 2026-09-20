"use client";

import { useState } from "react";
import {
  MessageCircle,
  ShieldOff,
  ThumbsDown,
  Ghost,
  MapPin,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { VisitStatus } from "@/lib/types";

interface VisitStatusPickerProps {
  currentStatus: VisitStatus;
  onStatusChange: (status: VisitStatus) => Promise<void>;
  disabled?: boolean;
}

const STATUS_OPTIONS: Array<{
  value: VisitStatus;
  label: string;
  icon: React.ReactNode;
  className: string;
  activeClassName: string;
}> = [
  {
    value: "unvisited",
    label: "Not Yet Visited",
    icon: <MapPin className="w-4 h-4" />,
    className: "border-[var(--color-border)] text-slate-400",
    activeClassName: "border-[var(--color-accent)]/50 bg-[var(--color-accent)]/10 text-[var(--color-accent)]",
  },
  {
    value: "attempted_no_answer",
    label: "Attempted (No Answer)",
    icon: <ShieldOff className="w-4 h-4" />,
    className: "border-[var(--color-border)] text-slate-400",
    activeClassName: "border-orange-500/50 bg-orange-500/10 text-orange-300",
  },
  {
    value: "pitched_follow_up",
    label: "Pitched / Follow-up",
    icon: <MessageCircle className="w-4 h-4" />,
    className: "border-[var(--color-border)] text-slate-400",
    activeClassName: "border-purple-500/50 bg-purple-500/10 text-purple-300",
  },
  {
    value: "spoke_to_owner",
    label: "Spoke to Owner",
    icon: <CheckCircle2 className="w-4 h-4" />,
    className: "border-[var(--color-border)] text-slate-400",
    activeClassName: "border-emerald-500/50 bg-emerald-500/10 text-emerald-300",
  },
  {
    value: "gatekeeper_blocked",
    label: "Gatekeeper Blocked",
    icon: <ShieldOff className="w-4 h-4" />,
    className: "border-[var(--color-border)] text-slate-400",
    activeClassName: "border-orange-500/50 bg-orange-500/10 text-orange-300",
  },
  {
    value: "not_interested",
    label: "Not Interested",
    icon: <ThumbsDown className="w-4 h-4" />,
    className: "border-[var(--color-border)] text-slate-400",
    activeClassName: "border-red-500/50 bg-red-500/10 text-red-300",
  },
  {
    value: "ghost_address",
    label: "Ghost Address",
    icon: <Ghost className="w-4 h-4" />,
    className: "border-[var(--color-border)] text-slate-400",
    activeClassName: "border-slate-500/50 bg-[var(--color-bg-overlay)] text-slate-300",
  },
];

export function VisitStatusPicker({
  currentStatus,
  onStatusChange,
  disabled = false,
}: VisitStatusPickerProps) {
  const [loading, setLoading] = useState<VisitStatus | null>(null);

  async function handleSelect(status: VisitStatus) {
    if (status === currentStatus || disabled) return;
    setLoading(status);
    try {
      await onStatusChange(status);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div 
      className="space-y-2"
      onPointerDownCapture={(e) => e.stopPropagation()}
      onClickCapture={(e) => e.stopPropagation()}
    >
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
        Visit Status
      </p>
      <div className="grid grid-cols-1 gap-2">
        {STATUS_OPTIONS.map((option) => {
          const isActive = currentStatus === option.value;
          const isLoading = loading === option.value;

          return (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              disabled={disabled || loading !== null}
              className={cn(
                "flex items-center gap-3 w-full rounded-xl border px-3 py-2.5 text-sm font-medium transition-all duration-150",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                isActive ? option.activeClassName : option.className,
                !isActive && "hover:bg-[var(--color-bg-surface)] hover:text-slate-300"
              )}
            >
              <span className={cn("flex-shrink-0", isLoading && "animate-pulse")}>
                {option.icon}
              </span>
              <span className="flex-1 text-left">{option.label}</span>
              {isActive && (
                <span className="flex-shrink-0 text-[10px] font-semibold uppercase tracking-wider opacity-75">
                  Current
                </span>
              )}
              {isLoading && (
                <span className="flex-shrink-0 w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Compact inline status display (for markers, cards)
export function VisitStatusDot({ status }: { status: VisitStatus }) {
  const dotColors: Record<VisitStatus, string> = {
    unvisited: "bg-slate-500",
    attempted_no_answer: "bg-orange-400",
    pitched_follow_up: "bg-purple-400",
    spoke_to_owner: "bg-emerald-400",
    gatekeeper_blocked: "bg-orange-400",
    not_interested: "bg-red-400",
    ghost_address: "bg-slate-600",
  };

  const labels: Record<VisitStatus, string> = {
    unvisited: "Unvisited",
    attempted_no_answer: "No Answer",
    pitched_follow_up: "Pitched",
    spoke_to_owner: "Spoke to Owner",
    gatekeeper_blocked: "Gatekeeper",
    not_interested: "Not Interested",
    ghost_address: "Ghost Address",
  };

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("w-2 h-2 rounded-full", dotColors[status])} />
      <span className="text-xs text-slate-400">{labels[status]}</span>
    </span>
  );
}
