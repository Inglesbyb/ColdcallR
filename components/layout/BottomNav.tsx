"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, List } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/list",  label: "Leads", icon: List,    aliases: ["/"] },
  { href: "/map",   label: "Map",   icon: MapPin,  aliases: [] },
] as const;

interface BottomNavProps {
  taggedCount?: number;
}

export function BottomNav({ taggedCount = 0 }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[999] glass pb-safe"
      aria-label="Main navigation"
      style={{ borderTop: '1px solid var(--glass-border)' }}
    >
      <div className="flex items-center justify-around h-[64px] max-w-lg mx-auto px-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon, aliases }) => {
          const isActive =
            pathname === href ||
            pathname.startsWith(href + "/") ||
            aliases.includes(pathname as never);

          const showBadge = href === "/map" && taggedCount > 0;

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex flex-col items-center gap-1 px-6 py-2 rounded-2xl transition-all duration-200",
                "focus:outline-none focus:ring-2 focus:ring-blue-500/50",
                "active:scale-90",
                isActive
                  ? "text-[var(--color-accent)]"
                  : "text-slate-500 hover:text-slate-300"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    "w-[22px] h-[22px] transition-all duration-200",
                    isActive && "scale-110"
                  )}
                />
                {showBadge && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 bg-[var(--color-accent)] rounded-full text-[10px] font-bold text-white flex items-center justify-center border-2 border-[var(--color-bg-base)] animate-scale-in">
                    {taggedCount}
                  </span>
                )}
              </div>
              <span className={cn(
                "text-[11px] font-semibold tracking-wide transition-colors",
                isActive ? "text-[var(--color-accent)]" : "text-slate-500"
              )}>
                {label}
              </span>
              {isActive && (
                <span className="absolute -bottom-0 w-5 h-[3px] rounded-full bg-[var(--color-accent)]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
