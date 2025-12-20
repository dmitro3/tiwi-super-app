"use client";

interface SwapTabsProps {
  activeTab?: "swap" | "limit";
  onTabChange?: (tab: "swap" | "limit") => void;
}

export default function SwapTabs({
  activeTab = "swap",
  onTabChange,
}: SwapTabsProps) {
  return (
    <div className="bg-[#010501] border border-[#1f261e] rounded-2xl lg:rounded-3xl p-1.5 sm:p-2 flex gap-1.5 sm:gap-2">
      <button
        onClick={() => onTabChange?.("swap")}
        aria-pressed={activeTab === "swap"}
        className={`flex-1 font-semibold text-base sm:text-lg py-3 px-4 sm:py-3.5 sm:px-5 lg:py-4 lg:px-6 rounded-xl sm:rounded-2xl transition-colors cursor-pointer ${
          activeTab === "swap"
            ? "bg-[#081f02] text-[#b1f128]"
            : "bg-[#0b0f0a] text-[#b5b5b5] hover:bg-[#121712]"
        }`}
      >
        Swap
      </button>
      <button
        onClick={() => onTabChange?.("limit")}
        aria-pressed={activeTab === "limit"}
        className={`flex-1 font-medium text-base sm:text-lg py-3 px-4 sm:py-3.5 sm:px-5 lg:py-4 lg:px-6 rounded-xl sm:rounded-2xl transition-colors cursor-pointer ${
          activeTab === "limit"
            ? "bg-[#081f02] text-[#b1f128]"
            : "bg-[#0b0f0a] text-[#b5b5b5] hover:bg-[#121712]"
        }`}
      >
        Limit
      </button>
    </div>
  );
}

