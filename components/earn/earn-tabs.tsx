"use client";

type EarnTab = "Staking" | "Farming" | "Lend & Borrow" | "NFT Staking";

interface EarnTabsProps {
  activeTab?: EarnTab;
  onTabChange?: (tab: EarnTab) => void;
}

const tabs: EarnTab[] = ["Staking", "Farming", "Lend & Borrow", "NFT Staking"];

export default function EarnTabs({ activeTab = "Staking", onTabChange }: EarnTabsProps) {
  return (
    <div className="border-[#1f261e] border-b-[0.5px] border-l-0 border-r-0 border-solid border-t-0 flex items-start justify-between relative shrink-0 w-full">
      {tabs.map((tab) => {
        const isActive = activeTab === tab;
        return (
          <button
            key={tab}
            onClick={() => onTabChange?.(tab)}
            className="flex-1 flex flex-col gap-4 items-center min-h-px min-w-px relative shrink-0 cursor-pointer"
          >
            {isActive ? (
              <>
                <p className="font-['Manrope',sans-serif] font-semibold leading-normal relative shrink-0 text-[#b1f128] text-sm lg:text-base text-center">
                  {tab}
                </p>
                <div className="h-0 relative shrink-0 w-full">
                  <div className="absolute inset-[-1.5px_0_0_0]">
                    <div className="h-[2px] w-full bg-[#b1f128]" />
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center relative shrink-0">
                <p className="font-['Manrope',sans-serif] font-medium leading-normal relative shrink-0 text-[#b5b5b5] text-sm lg:text-base text-left">
                  {tab}
                </p>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

