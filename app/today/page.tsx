import { BottomNav } from "@/components/layout/BottomNav";
import { CalendarClock, Map } from "lucide-react";
import Link from "next/link";

export default function TodayPage() {
  return (
    <main className="min-h-svh bg-slate-950 pb-32 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur border-b border-slate-800/80 px-4 py-4 pt-safe">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-5 h-5 text-blue-400" />
          <h1 className="text-lg font-bold text-white">Daily Route Planner</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-4">
          <Map className="w-8 h-8 text-slate-500" />
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">No visits scheduled</h2>
        <p className="text-slate-400 mb-6 max-w-sm">
          No scheduled visits for today. Select leads from the List or Map to build a targeted sales route.
        </p>
        <Link 
          href="/map"
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
        >
          Explore Map
        </Link>
      </div>

      <BottomNav />
    </main>
  );
}
