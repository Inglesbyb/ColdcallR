"use client";

import { Check } from "lucide-react";

export const CRIME_CATEGORIES = [
  { id: "all-crime", label: "All Crime" },
  { id: "anti-social-behaviour", label: "Anti-social behaviour" },
  { id: "burglary", label: "Burglary" },
  { id: "criminal-damage-arson", label: "Criminal damage and arson" },
  { id: "drugs", label: "Drugs" },
  { id: "other-theft", label: "Other theft" },
  { id: "possession-of-weapons", label: "Possession of weapons" },
  { id: "public-order", label: "Public order" },
  { id: "robbery", label: "Robbery" },
  { id: "shoplifting", label: "Shoplifting" },
  { id: "theft-from-the-person", label: "Theft from the person" },
  { id: "vehicle-crime", label: "Vehicle crime" },
  { id: "violent-crime", label: "Violence and sexual offences" },
  { id: "other-crime", label: "Other crime" },
];

interface CrimeCategoryFilterProps {
  selectedCategories: string[];
  onChange: (categories: string[]) => void;
}

export default function CrimeCategoryFilter({ selectedCategories, onChange }: CrimeCategoryFilterProps) {
  
  const toggleCategory = (id: string) => {
    if (id === "all-crime") {
      // If turning on "All Crime", just pass that
      if (!selectedCategories.includes("all-crime")) {
        onChange(["all-crime"]);
      }
      return;
    }

    let newCategories = selectedCategories.filter(c => c !== "all-crime");
    
    if (newCategories.includes(id)) {
      newCategories = newCategories.filter(c => c !== id);
    } else {
      newCategories.push(id);
    }

    if (newCategories.length === 0) {
      newCategories = ["all-crime"];
    }

    onChange(newCategories);
  };

  return (
    <div className="bg-[#0F1722]/90 backdrop-blur-md p-4 rounded-xl border border-white/10 shadow-2xl space-y-3 pointer-events-auto max-h-[50vh] overflow-y-auto w-64">
      <h3 className="text-white font-semibold text-sm mb-2">Filter Crime Types</h3>
      <div className="space-y-2">
        {CRIME_CATEGORIES.map(cat => {
          const isSelected = selectedCategories.includes(cat.id) || (cat.id !== "all-crime" && selectedCategories.includes("all-crime"));
          
          return (
            <button
              key={cat.id}
              onClick={() => toggleCategory(cat.id)}
              className="flex items-center space-x-3 w-full group"
            >
              <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-500 group-hover:border-gray-400'}`}>
                {isSelected && <Check className="w-3 h-3 text-white" />}
              </div>
              <span className={`text-sm ${isSelected ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'}`}>
                {cat.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  );
}
