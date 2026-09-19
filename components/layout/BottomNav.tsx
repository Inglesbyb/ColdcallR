"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, List, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/list",  label: "Leads", icon: List,          aliases: ["/"] },
  { href: "/map",   label: "Map",   icon: MapPin,         aliases: [] },
  { href: "/today", label: "Today", icon: CalendarClock,  aliases: [] },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[999] h-16 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 pb-safe"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around h-full max-w-lg mx-auto px-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon, aliases }) => {
          const isActive =
            pathname === href ||
            pathname.startsWith(href + "/") ||
            aliases.includes(pathname as never);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 px-5 py-2 rounded-xl transition-all duration-200",
                "focus:outline-none focus:ring-2 focus:ring-blue-500/50",
                isActive
                  ? "text-blue-400"
                  : "text-slate-500 hover:text-slate-300"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon
                className={cn(
                  "w-5 h-5 transition-transform duration-200",
                  isActive && "scale-110"
                )}
              />
              <span className="text-[10px] font-medium tracking-wide">{label}</span>
              {isActive && (
                <span className="absolute bottom-2 w-1 h-1 rounded-full bg-blue-400" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
