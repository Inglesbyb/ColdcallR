"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/layout/BottomNav";
import { NewsRecommendations } from "@/components/residential/NewsRecommendations";
import { Bell, MapPin, Building2, Search, LogOut, ArrowRight, TrendingUp, Users, CheckCircle2, ChevronRight, Activity, AlertTriangle, X, Star, Shield, Zap, Target, Loader2, Navigation } from "lucide-react";
import { useRouteStore } from "@/store/routeStore";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import dynamic from "next/dynamic";
import ChoroplethMap from "@/components/residential/ChoroplethMap";
import PostcodeSelector from "@/components/residential/PostcodeSelector";
import CrimeCategoryFilter from "@/components/residential/CrimeCategoryFilter";

const ResidentialMapInner = dynamic(() => import("@/components/residential/ResidentialMapInner"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-full bg-[var(--color-bg-base)]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500">Loading map…</p>
      </div>
    </div>
  ),
});

export default function ResidentialPage() {
  const router = useRouter();
  const [activeView, setActiveView] = useState<"news" | "stats">("news");
  // Start collapsed on mobile so news is immediately readable
  const [mapCollapsed, setMapCollapsed] = useState(true);
  
  const [news, setNews] = useState<any[]>([]);
  const [loadingNews, setLoadingNews] = useState(true);
  const [selectedNewsId, setSelectedNewsId] = useState<string | null>(null);

  // Choropleth Stats State
  const [outcodeStats, setOutcodeStats] = useState<Record<string, any>>({});
  const [loadingStats, setLoadingStats] = useState(true);
  const [minPrice, setMinPrice] = useState(100000);
  const [maxCrime, setMaxCrime] = useState(1000);
  const [selectedOutcodeInfo, setSelectedOutcodeInfo] = useState<{outcode: string, stat: any, latLng: [number, number]} | null>(null);

  // New Search & Filter State
  const [selectedCategories, setSelectedCategories] = useState<string[]>(["all-crime"]);
  const [searchedOutcode, setSearchedOutcode] = useState<string | null>(null);

  // Routing State — now backed by routeStore
  const { addResidentialStop, removeResidentialStop, isResidentialInPlan } = useRouteStore();

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await fetch("/api/crime-news");
        if (res.ok) {
          const data = await res.json();
          setNews(data.articles || []);
        }
      } catch (err) {
        console.error("Failed to fetch news", err);
      } finally {
        setLoadingNews(false);
      }
    };

    const fetchStats = async () => {
      try {
        const res = await fetch("/api/outcodes");
        if (res.ok) {
          const data = await res.json();
          setOutcodeStats(data.stats || {});
        }
      } catch (err) {
        console.error("Failed to fetch stats", err);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchNews();
    fetchStats();
  }, []);

  const handleAddToRoute = (loc: { lat: number, lng: number, title: string }) => {
    addResidentialStop(loc);
  };
  
  const handleLogout = async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/login");
  };

  // Dynamically calculate the filtered crime count for each outcode based on selectedCategories
  const filteredOutcodeStats = Object.keys(outcodeStats).reduce((acc, outcode) => {
    const stat = outcodeStats[outcode];
    let filteredCount = stat.crime_count;

    if (!selectedCategories.includes("all-crime") && stat.crime_breakdown) {
      filteredCount = 0;
      selectedCategories.forEach(cat => {
        if (stat.crime_breakdown[cat]) {
          filteredCount += stat.crime_breakdown[cat];
        }
      });
    }

    acc[outcode] = {
      ...stat,
      filtered_crime_count: filteredCount
    };
    return acc;
  }, {} as Record<string, any>);

  return (
    <main className="h-svh flex flex-col bg-[var(--color-bg-base)] overflow-hidden">
      {/* ═══ STICKY HEADER ═══ */}
      <div className="shrink-0 z-50 glass pt-safe">
        <div className="flex items-center justify-between px-4 pt-3 pb-3 border-b border-white/10">
          <div>
            <h1 className="text-lg font-bold text-white font-display tracking-tight flex items-center gap-2">
              ColdcallR
            </h1>
            <p className="text-[11px] text-slate-400 font-medium tracking-wide uppercase">Residential Mode</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors active:scale-95"
              title="Sign out"
            >
              <LogOut className="w-4 h-4 text-red-400" />
            </button>
          </div>
        </div>

        {/* ═══ VIEW TOGGLE ═══ */}
        <div className="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg-base)]">
          <div className="flex bg-[#1E293B]/80 backdrop-blur-md p-1 rounded-xl border border-white/5 shadow-inner max-w-sm mx-auto">
            <button
              onClick={() => setActiveView("news")}
              className={`flex-1 py-1.5 px-4 text-xs font-semibold rounded-lg transition-all duration-300 ${
                activeView === "news" 
                  ? "bg-gradient-to-br from-rose-500 to-orange-500 text-white shadow-md shadow-rose-500/20" 
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              📰 Breaking News
            </button>
            <button
              onClick={() => setActiveView("stats")}
              className={`flex-1 py-1.5 px-4 text-xs font-semibold rounded-lg transition-all duration-300 ${
                activeView === "stats" 
                  ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20" 
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              🗺️ Area Insights
            </button>
          </div>
        </div>
      </div>

      {/* ═══ MAP SECTION (collapsible) ═══ */}
      <div
        className={`shrink-0 border-b border-[var(--color-border)] relative transition-all duration-300 ease-in-out ${
          mapCollapsed ? "h-[28vh]" : "h-[38vh]"
        }`}
      >
        {activeView === "news" ? (
          <>
            <ResidentialMapInner 
              key="news-map"
              news={news} 
              selectedNewsId={selectedNewsId} 
              onNewsClick={setSelectedNewsId} 
            />
            {/* Map Overlay Stats */}
            <div className="absolute top-3 left-3 z-[400] pointer-events-none">
              <div className="glass px-3 py-1.5 rounded-full border border-white/5 flex items-center gap-2 shadow-lg">
                <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
                <span className="text-xs font-semibold text-white">
                  {news.filter(n => n.lat).length} Hotspots
                </span>
              </div>
            </div>
          </>
        ) : (
          <>
            {loadingStats ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-[#0B1015]">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                <span className="text-sm text-slate-400">Loading City Data...</span>
              </div>
            ) : (
              <ChoroplethMap 
                stats={filteredOutcodeStats}
                minPrice={minPrice}
                maxCrime={maxCrime}
                searchedOutcode={searchedOutcode}
                onPolygonClick={(outcode, stat, latLng) => {
                  setSelectedOutcodeInfo({ outcode, stat, latLng });
                }}
              />
            )}
            
            {/* Search Bar Overlay */}
            <div className="absolute top-4 left-0 right-0 z-[400] px-4 pointer-events-none">
              <div className="pointer-events-auto">
                <PostcodeSelector onSelect={setSearchedOutcode} />
              </div>
            </div>

            {/* Overlay Sliders & Filters */}
            <div className="absolute bottom-4 left-4 right-4 z-[400] pointer-events-none flex justify-between items-end">
              
              {/* Filter Sidebar (Left) */}
              <div className="pointer-events-auto hidden md:block">
                <CrimeCategoryFilter selectedCategories={selectedCategories} onChange={setSelectedCategories} />
              </div>

              {/* Sliders (Right / Center) */}
              <div className="max-w-xs ml-auto relative flex flex-col gap-2 pointer-events-auto">
                <div className="glass p-3 rounded-2xl border border-white/10 shadow-2xl bg-[#0B1015]/90 backdrop-blur-xl space-y-3">
                  
                  {/* Price Slider */}
                  <div>
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">
                      <span>Min Price</span>
                      <span className="text-green-400">£{minPrice.toLocaleString()}</span>
                    </div>
                    <input 
                      type="range" 
                      min="50000" 
                      max="500000" 
                      step="10000"
                      value={minPrice} 
                      onChange={(e) => setMinPrice(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-700/50 rounded-lg appearance-none cursor-pointer accent-green-500" 
                    />
                  </div>

                  {/* Crime Slider */}
                  <div>
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">
                      <span>Max Crime</span>
                      <span className="text-red-400">{maxCrime} incidents</span>
                    </div>
                    <input 
                      type="range" 
                      min="50" 
                      max="1500" 
                      step="50"
                      value={maxCrime} 
                      onChange={(e) => setMaxCrime(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-700/50 rounded-lg appearance-none cursor-pointer accent-red-500" 
                    />
                  </div>

                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Drag handle pill — tap to toggle map size */}
      <button
        onClick={() => setMapCollapsed(c => !c)}
        className="shrink-0 flex items-center justify-center py-3 bg-[#0B1015] w-full active:bg-slate-800/50 transition-colors"
        aria-label={mapCollapsed ? "Expand map" : "Collapse map"}
      >
        <div className="w-12 h-1.5 rounded-full bg-slate-600" />
      </button>

      {/* ═══ LIST SECTION ═══ */}
      <div
        className="flex-1 overflow-y-auto pb-28 scrollbar-none bg-[#0B1015]"
        onScroll={(e) => {
          const el = e.currentTarget;
          // Collapse map when scrolling down, expand when at top
          if (el.scrollTop > 60 && !mapCollapsed) setMapCollapsed(true);
          if (el.scrollTop < 10 && mapCollapsed) setMapCollapsed(false);
        }}
      >
        {activeView === "news" ? (
          <NewsRecommendations 
            news={news} 
            loading={loadingNews}
            selectedNewsId={selectedNewsId}
            onNewsClick={setSelectedNewsId}
            onAddToRoute={handleAddToRoute}
          />
        ) : (
          <div className="p-4">
            {selectedOutcodeInfo ? (
              <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black text-white">{selectedOutcodeInfo.outcode} Area</h3>
                  <button 
                    onClick={() => setSelectedOutcodeInfo(null)}
                    className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#1A232E] border border-green-500/20 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
                    <TrendingUp className="w-6 h-6 text-green-500 mb-2" />
                    <span className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Avg Price</span>
                    <span className="text-lg font-black text-green-400">£{(selectedOutcodeInfo.stat?.avg_house_price || 0).toLocaleString()}</span>
                  </div>
                  
                  <div className="bg-[#1A232E] border border-orange-500/20 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
                    <AlertTriangle className="w-6 h-6 text-orange-500 mb-2" />
                    <span className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Crime Level</span>
                    <span className="text-lg font-black text-orange-400">{selectedOutcodeInfo.stat?.filtered_crime_count ?? selectedOutcodeInfo.stat?.crime_count ?? 0} incidents</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const lat = selectedOutcodeInfo.latLng[0];
                    const lng = selectedOutcodeInfo.latLng[1];
                    const title = `Target Area ${selectedOutcodeInfo.outcode}`;
                    if (isResidentialInPlan(lat, lng)) {
                      removeResidentialStop(lat, lng);
                    } else {
                      handleAddToRoute({ lat, lng, title });
                    }
                    setSelectedOutcodeInfo(null);
                  }}
                  className="w-full py-4 mt-2 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <MapPin className="w-4 h-4" />
                  {isResidentialInPlan(selectedOutcodeInfo.latLng[0], selectedOutcodeInfo.latLng[1])
                    ? `Remove ${selectedOutcodeInfo.outcode} from Plan`
                    : `Add ${selectedOutcodeInfo.outcode} to Plan`}
                </button>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center pt-8 text-slate-500 text-center px-6">
                <Target className="w-12 h-12 text-slate-700 mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">City-Wide Targeting</h3>
                <p className="text-sm text-slate-400">
                  Use the sliders on the map to filter neighborhoods by wealth and crime levels. Click any highlighted area to add it to your route.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
