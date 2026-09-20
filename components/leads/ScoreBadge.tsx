"use client";

import type { Lead } from "@/lib/types";

interface ScoreBadgeProps {
  score: number;
  riskTag?: Lead["risk_profile_tag"];
  size?: "sm" | "md" | "lg";
}

function getScoreColor(score: number): string {
  if (score >= 75) return "from-red-500 to-orange-400";
  if (score >= 50) return "from-orange-500 to-amber-400";
  if (score >= 25) return "from-blue-500 to-cyan-400";
  return "from-slate-600 to-slate-500";
}

function getScoreRing(score: number): string {
  if (score >= 75) return "ring-red-500/30";
  if (score >= 50) return "ring-orange-500/30";
  if (score >= 25) return "ring-blue-500/30";
  return "ring-slate-500/20";
}

const sizeMap = {
  sm: "w-8 h-8 text-[10px]",
  md: "w-10 h-10 text-xs",
  lg: "w-12 h-12 text-sm",
};

export function ScoreBadge({ score, size = "md" }: ScoreBadgeProps) {
  return (
    <div
      className={`${sizeMap[size]} rounded-full bg-gradient-to-br ${getScoreColor(score)} ring-2 ${getScoreRing(score)} flex items-center justify-center font-bold text-white shadow-md flex-shrink-0`}
    >
      {score}
    </div>
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
      className: "bg-red-500/10 text-red-400 border border-red-500/20",
    },
    ELEVATED_CRIME: {
      label: "⚠️ Elevated Crime",
      className: "bg-orange-500/10 text-orange-400 border border-orange-500/20",
    },
    NEW_BUSINESS: {
      label: "✨ New Business",
      className: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
    },
    PREMIUM_RETAIL: {
      label: "💎 Premium Retail",
      className: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
    },
    INDUSTRIAL_TARGET: {
      label: "🏭 Industrial",
      className: "bg-slate-500/10 text-slate-400 border border-slate-500/20",
    },
    AUTOMOTIVE: {
      label: "🚗 Automotive",
      className: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20",
    },
    HOSPITALITY: {
      label: "🍺 Hospitality",
      className: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    },
    HEALTHCARE: {
      label: "🏥 Healthcare",
      className: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    },
    STANDARD: {
      label: "📋 Standard",
      className: "bg-slate-500/10 text-slate-500 border border-slate-600/20",
    },
  };

  const config = tagConfig[tag];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${config.className}`}
    >
      {config.label}
    </span>
  );
}
