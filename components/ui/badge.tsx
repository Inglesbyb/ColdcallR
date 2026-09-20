import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        default: "bg-[var(--color-accent)]/20 text-[var(--color-accent)] border border-[var(--color-accent)]/30",
        secondary: "bg-[var(--color-bg-overlay)] text-slate-300 border border-[var(--color-border)]",
        destructive: "bg-red-500/15 text-red-400 border border-red-500/25",
        outline: "border border-[var(--color-border)] text-slate-400",
        hot: "bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-sm",
        warm: "bg-gradient-to-r from-orange-500 to-amber-400 text-white shadow-sm",
        cool: "bg-gradient-to-r from-blue-500 to-cyan-400 text-white shadow-sm",
        visited: "bg-slate-700/60 text-slate-400 border border-slate-600/40",
        success: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
