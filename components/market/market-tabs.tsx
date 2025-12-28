"use client";

type MarketTab = "Spot" | "Perp";

interface MarketTabsProps {
  activeTab: MarketTab;
  onTabChange: (tab: MarketTab) => void;
}

const tabs: MarketTab[] = ["Spot", "Perp"];

export default function MarketTabs({ activeTab, onTabChange }: MarketTabsProps) {
  return (
    <div className="flex items-center gap-2">
      {tabs.map((tab) => {
        const isActive = activeTab === tab;
        return (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`px-3 lg:px-4 xl:px-5 2xl:px-6 py-1.5 lg:py-2 rounded-lg text-xs lg:text-sm font-semibold transition-colors cursor-pointer ${
              isActive ? "bg-[#081f02] text-[#b1f128]" : "bg-[#0b0f0a] text-[#b5b5b5]"
            }`}
          >
            {tab}
          </button>
        );
      })}
    </div>
  );
}

