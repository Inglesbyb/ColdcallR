"use client";

import { useState, useEffect } from "react";
import { Search } from "lucide-react";

interface PostcodeSelectorProps {
  onSelect: (outcode: string) => void;
}

export default function PostcodeSelector({ onSelect }: PostcodeSelectorProps) {
  const [outcodes, setOutcodes] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetch("/api/available-outcodes")
      .then(res => res.json())
      .then(data => {
        if (data.outcodes) setOutcodes(data.outcodes);
      })
      .catch(err => console.error("Failed to load outcodes:", err));
  }, []);

  const filteredOutcodes = outcodes.filter(oc => oc.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="relative w-full max-w-md mx-auto z-50">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          placeholder="Search available postcodes (e.g. L1)..."
          className="w-full bg-[#0F1722] border border-white/10 text-white rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-blue-500 shadow-xl"
        />
        <Search className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
      </div>
      
      {isOpen && filteredOutcodes.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[#0F1722] border border-white/10 rounded-lg shadow-2xl max-h-60 overflow-y-auto">
          {filteredOutcodes.map(oc => (
            <button
              key={oc}
              onMouseDown={(e) => {
                e.preventDefault(); // Prevent blur
                setQuery(oc);
                setIsOpen(false);
                onSelect(oc);
              }}
              className="w-full text-left px-4 py-3 hover:bg-white/5 text-gray-200 transition-colors flex items-center justify-between"
            >
              <span className="font-semibold text-white">{oc}</span>
              <span className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded">App Lead</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
