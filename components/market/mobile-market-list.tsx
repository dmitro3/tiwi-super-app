"use client";

import MobileMarketCard from "./mobile-market-card";
import type { Token } from "@/lib/frontend/types/tokens";

interface MobileMarketListProps {
  tokens: Token[];
  isLoading?: boolean;
}

export default function MobileMarketList({ tokens, isLoading = false }: MobileMarketListProps) {
  // Default leverage mapping (can be made dynamic later)
  const getLeverage = (token: Token): string => {
    // Some tokens have different leverage in the design
    if (token.symbol.includes("TWC") || token.symbol.includes("LINK") || token.symbol.includes("TIWI")) {
      return "5X";
    }
    return "10X";
  };


  if (isLoading) {
    return (
      <div className="flex flex-col items-start px-[20px] py-0 w-full">
        {Array.from({ length: 10 }).map((_, idx) => (
          <div
            key={`skeleton-${idx}`}
            className="flex items-center overflow-hidden px-0 py-[10px] w-full"
          >
            <div className="flex flex-[1_0_0] gap-[10px] items-center min-h-px min-w-px w-full">
              <div className="flex flex-[1_0_0] flex-col items-start justify-center min-h-px min-w-px gap-2">
                <div className="h-4 bg-[#121712] rounded animate-pulse w-24"></div>
                <div className="h-3 bg-[#121712] rounded animate-pulse w-16"></div>
              </div>
              <div className="flex flex-col items-end justify-center gap-2 shrink-0">
                <div className="h-4 bg-[#121712] rounded animate-pulse w-16"></div>
                <div className="h-3 bg-[#121712] rounded animate-pulse w-12"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start px-[20px] sm:px-[24px] py-0 w-full">
      {tokens.map((token) => (
        <MobileMarketCard
          key={token.symbol}
          token={token}
          leverage={getLeverage(token)}
        />
      ))}
    </div>
  );
}

