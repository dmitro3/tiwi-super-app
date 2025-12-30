"use client";

import { useEffect, useState } from "react";
import type { SmartMarket } from "@/lib/frontend/api/smart-markets";
import { fetchSmartMarkets } from "@/lib/frontend/api/smart-markets";
import Image from "next/image";

/**
 * Smart Markets Marquee component
 * - Two rows with opposite-direction animations
 * - Top row: left → right (entering from left, exiting right)
 * - Bottom row: right → left (entering from right, exiting left)
 * - Infinite loop animation
 * - Fetches data from API (mocked for now, ready for backend integration)
 */
export function SmartMarketsMarquee() {
  const [markets, setMarkets] = useState<SmartMarket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch smart markets from API
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await fetchSmartMarkets();
        if (mounted) {
          setMarkets(data);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("[SmartMarkets] Error fetching markets:", error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Duplicate markets for seamless infinite loop animation
  // We duplicate 3 times to ensure smooth continuous scrolling
  const duplicatedMarkets = markets.length > 0 
    ? [...markets, ...markets, ...markets]
    : [];

  // Loading state - show skeleton loader
  if (isLoading || markets.length === 0) {
    return (
      <div className="w-full flex flex-col gap-2">
        <div className="flex flex-col items-start">
          <p className="text-white text-base font-semibold">Smart Markets</p>
        </div>
        <div className="flex flex-col gap-2 items-start w-full min-h-[84px]">
          {/* Skeleton rows */}
          <div className="overflow-hidden w-full">
            <div className="flex gap-2 items-center w-max">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={`skeleton-top-${i}`}
                  className="border border-[#1f261e] flex items-center overflow-hidden pl-4 pr-4 py-2.5 rounded-full shrink-0"
                >
                  <div className="flex gap-2 items-center shrink-0">
                    <div className="w-5 h-5 rounded-full bg-[#1f261e] animate-shimmer" />
                    <div className="h-4 w-16 bg-[#1f261e] rounded animate-shimmer" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="overflow-hidden w-full">
            <div className="flex gap-2 items-center w-max">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={`skeleton-bottom-${i}`}
                  className="border border-[#1f261e] flex items-center overflow-hidden pl-4 pr-4 py-2.5 rounded-full shrink-0"
                >
                  <div className="flex gap-2 items-center shrink-0">
                    <div className="w-5 h-5 rounded-full bg-[#1f261e] animate-shimmer" />
                    <div className="h-4 w-16 bg-[#1f261e] rounded animate-shimmer" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-2">
      {/* Title */}
      <div className="flex flex-col items-start">
        <p className="text-white text-base font-semibold">Smart Markets</p>
      </div>

      {/* Markets Container */}
      <div className="flex flex-col gap-2 items-start w-full">
        {/* Top Row - Left to Right */}
        <div className="overflow-hidden w-full">
          <div className="flex gap-2 items-center w-max smart-markets-row-top">
            {duplicatedMarkets.map((market, index) => (
              <div
                key={`top-${market.id}-${index}`}
                className="border border-[#1f261e] flex items-center overflow-hidden pl-4 pr-4 py-2.5 rounded-full shrink-0"
              >
                <div className="flex gap-2 items-center shrink-0">
                  <div className="relative rounded-full w-5 h-5 shrink-0">
                    <Image
                      src={market.icon}
                      alt={market.name}
                      width={20}
                      height={20}
                      className="absolute inset-0 max-w-none object-cover rounded-full w-full h-full pointer-events-none"
                      unoptimized
                    />
                  </div>
                  <p className="text-white text-sm font-medium">{market.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Row - Right to Left */}
        <div className="overflow-hidden w-full">
          <div className="flex gap-2 items-center w-max smart-markets-row-bottom">
            {duplicatedMarkets.map((market, index) => (
              <div
                key={`bottom-${market.id}-${index}`}
                className="border border-[#1f261e] flex items-center overflow-hidden pl-4 pr-4 py-2.5 rounded-full shrink-0"
              >
                <div className="flex gap-2 items-center shrink-0">
                  <div className="relative rounded-full w-5 h-5 shrink-0">
                    <Image
                      src={market.icon}
                      alt={market.name}
                      width={20}
                      height={20}
                      className="absolute inset-0 max-w-none object-cover rounded-full w-full h-full pointer-events-none"
                      unoptimized
                    />
                  </div>
                  <p className="text-white text-sm font-medium">{market.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

