"use client";

type MarketTab = "Spot" | "Perp";

interface MarketTabsProps {
  activeTab: MarketTab;
  onTabChange: (tab: MarketTab) => void;
}

const tabs: MarketTab[] = ["Spot", "Perp"];

export default function MarketTabs({ activeTab, onTabChange }: MarketTabsProps) {
  return (
    <div className="flex items-center gap-4 lg:gap-5 xl:gap-6 2xl:gap-6 relative">
      {tabs.map((tab) => {
        const isActive = activeTab === tab;
        return (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className="flex flex-col gap-1.5 lg:gap-2 xl:gap-2 2xl:gap-2 items-center relative"
          >
            <span className={`text-sm lg:text-base xl:text-base 2xl:text-lg font-semibold transition-colors cursor-pointer ${
              isActive ? "text-[#b1f128]" : "text-[#7c7c7c]"
            }`}>
              {tab}
            </span>
            {/* Underline that moves */}
            <div className={`absolute bottom-0 h-[1px] lg:h-[1.5px] xl:h-[1.5px] 2xl:h-[1.5px] bg-[#b1f128] transition-all duration-300 ${
              isActive ? "w-full opacity-100" : "w-0 opacity-0"
            }`}></div>
          </button>
        );
      })}
    </div>
  );
}


