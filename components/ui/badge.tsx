import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-blue-600 text-white",
        secondary: "bg-slate-700 text-slate-200",
        destructive: "bg-red-600/20 text-red-400 border border-red-600/30",
        outline: "border border-slate-600 text-slate-300",
        hot: "bg-red-600 text-white",
        warm: "bg-orange-500 text-white",
        cool: "bg-yellow-500 text-black",
        visited: "bg-slate-600 text-slate-300",
        success: "bg-emerald-600 text-white",
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
