"use client";

import { useTranslation } from "@/lib/i18n/useTranslation";

type TabKey = "Favourite" | "Hot" | "New" | "Gainers" | "Losers";

const tabs: TabKey[] = ["Favourite", "Hot", "New", "Gainers", "Losers"];

// Map TabKey to translation key
const tabTranslationMap: Record<TabKey, "home.favourite" | "home.hot" | "home.new" | "home.gainers" | "home.losers"> = {
  "Favourite": "home.favourite",
  "Hot": "home.hot",
  "New": "home.new",
  "Gainers": "home.gainers",
  "Losers": "home.losers",
};

interface TabBarProps {
  active: TabKey;
  onChange: (tab: TabKey) => void;
}

export function TabBar({ active, onChange }: TabBarProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2">
      {tabs.map((tab) => {
        const isActive = active === tab;
        const translationKey = tabTranslationMap[tab];
        return (
          <button
            key={tab}
            onClick={() => onChange(tab)}
            className={`px-3 lg:px-4 xl:px-5 2xl:px-6 py-1.5 lg:py-2 rounded-lg text-xs lg:text-sm font-semibold transition-colors cursor-pointer ${
              isActive ? "bg-[#081f02] text-[#b1f128]" : "bg-[#0b0f0a] text-[#b5b5b5]"
            }`}
          >
            {t(translationKey)}
          </button>
        );
      })}
    </div>
  );
}
