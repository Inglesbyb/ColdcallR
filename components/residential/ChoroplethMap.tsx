"use client";

import dynamic from "next/dynamic";

const ChoroplethMapInner = dynamic(
  () => import("./ChoroplethMapInner"),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#0B1015] gap-4">
        <div className="w-10 h-10 border-4 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
        <span className="text-slate-400 font-medium text-sm animate-pulse">Loading City Data...</span>
      </div>
    )
  }
);

export default ChoroplethMapInner;
