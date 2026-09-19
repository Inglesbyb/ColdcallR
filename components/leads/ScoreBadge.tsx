"use client";

import { Badge } from "@/components/ui/badge";
import type { Lead } from "@/lib/types";

interface ScoreBadgeProps {
  score: number;
  riskTag?: Lead["risk_profile_tag"];
  size?: "sm" | "md" | "lg";
}

function getScoreVariant(score: number) {
  if (score >= 75) return "hot" as const;
  if (score >= 50) return "warm" as const;
  if (score >= 25) return "cool" as const;
  return "visited" as const;
}

function getScoreLabel(score: number): string {
  if (score >= 75) return "🔥 HOT";
  if (score >= 50) return "🟠 WARM";
  if (score >= 25) return "🟡 COOL";
  return "⚫ COLD";
}

const sizeClasses = {
  sm: "text-[10px] px-2 py-0.5",
  md: "text-xs px-2.5 py-0.5",
  lg: "text-sm px-3 py-1",
};

export function ScoreBadge({ score, size = "md" }: ScoreBadgeProps) {
  return (
    <Badge
      variant={getScoreVariant(score)}
      className={sizeClasses[size]}
    >
      {getScoreLabel(score)} · {score}
    </Badge>
  );
}

export function RiskTagBadge({ tag }: { tag: Lead["risk_profile_tag"] }) {
  if (!tag) return null;

  const tagConfig: Record<
    NonNullable<Lead["risk_profile_tag"]>,
    { label: string; className: string }
  > = {
    HIGH_CRIME_ZONE: {
      label: "🚨 High Crime Zone",
      className: "bg-red-900/60 text-red-300 border border-red-600/40",
    },
    ELEVATED_CRIME: {
      label: "⚠️ Elevated Crime",
      className: "bg-orange-900/60 text-orange-300 border border-orange-600/40",
    },
    NEW_BUSINESS: {
      label: "✨ New Business",
      className: "bg-blue-900/60 text-blue-300 border border-blue-600/40",
    },
    PREMIUM_RETAIL: {
      label: "💎 Premium Retail",
      className: "bg-purple-900/60 text-purple-300 border border-purple-600/40",
    },
    INDUSTRIAL_TARGET: {
      label: "🏭 Industrial",
      className: "bg-slate-700/60 text-slate-300 border border-slate-500/40",
    },
    AUTOMOTIVE: {
      label: "🚗 Automotive",
      className: "bg-cyan-900/60 text-cyan-300 border border-cyan-600/40",
    },
    HOSPITALITY: {
      label: "🍺 Hospitality",
      className: "bg-amber-900/60 text-amber-300 border border-amber-600/40",
    },
    HEALTHCARE: {
      label: "🏥 Healthcare",
      className: "bg-emerald-900/60 text-emerald-300 border border-emerald-600/40",
    },
    STANDARD: {
      label: "📋 Standard",
      className: "bg-slate-700/60 text-slate-400 border border-slate-600/40",
    },
  };

  const config = tagConfig[tag];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
