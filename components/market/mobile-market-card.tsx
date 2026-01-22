"use client";

import type { Token } from "@/lib/frontend/types/tokens";
import { SubscriptPairPrice } from "@/components/ui/subscript-pair-price";
import { formatPercentageChange, formatNumber } from "@/lib/frontend/utils/price-formatter";

interface MobileMarketCardProps {
  token: Token;
  leverage?: string; // e.g., "10X", "5X"
}

/**
 * Mobile Market Card Component
 */
export default function MobileMarketCard({ token, leverage = "10X" }: MobileMarketCardProps) {
  const pair = token.pair;

  return (
    <div className="flex items-center overflow-hidden px-0 py-3 w-full border-b border-[#1f261e]/30">
      <div className="flex flex-[1_0_0] gap-[10px] items-center min-h-px min-w-px">
        {/* Left side: Token pair, leverage badge, and volume */}
        <div className="flex flex-[1_0_0] flex-col items-start justify-center min-h-px min-w-px">
          <div className="flex gap-[8px] items-center">
            <p className="text-white text-sm sm:text-base font-medium leading-normal">
              <span className="font-bold">{token.symbol}</span>
              <span className="text-[#b5b5b5]">/{pair?.quoteToken.symbol || 'USDT'}</span>
            </p>
            <div className="bg-[#1f261e] flex items-center justify-center px-[6px] py-[2px] rounded-[4px] shrink-0">
              <p className="text-[#b1f128] text-[10px] font-bold leading-normal">
                {leverage}
              </p>
            </div>
          </div>
          <p className="text-[#7c7c7c] text-xs font-medium leading-normal">
            Vol {formatNumber(token.volume24h)}
          </p>
        </div>

        {/* Right side: Price and 24h change */}
        <div className="flex flex-col items-end justify-center leading-normal shrink-0">
          <div className="text-white text-sm sm:text-base font-semibold leading-normal">
            <SubscriptPairPrice price={token.price || '0'} quoteSymbol={pair?.quoteToken.symbol || 'USDT'} />
          </div>
          <p
            className={`text-xs font-bold leading-normal ${(token.priceChange24h || 0) >= 0 ? "text-[#3fea9b]" : "text-[#ff5c5c]"
              }`}
          >
            {formatPercentageChange(token.priceChange24h).formatted}
          </p>
        </div>
      </div>
    </div>
  );
}


