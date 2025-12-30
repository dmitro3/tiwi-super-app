"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { STATS, SIDEBAR_ICONS } from "@/lib/home/mock-data";
import { fetchChains } from "@/lib/frontend/api/chains";
import type { Chain } from "@/lib/frontend/types/tokens";

/**
 * Mobile Stats Grid component
 * - 2-column grid for top row
 * - 3-column grid for bottom row
 * - Cards with icon, value, and label
 * - Active Chains card fetches from API and displays with marquee animation
 */
export function MobileStatsGrid() {
  const [chains, setChains] = useState<Chain[]>([]);
  const [isLoadingChains, setIsLoadingChains] = useState(true);

  // Fetch chains from API
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await fetchChains();
        if (mounted) {
          setChains(data);
          setIsLoadingChains(false);
        }
      } catch (error) {
        console.error("[MobileStatsGrid] Error fetching chains:", error);
        if (mounted) {
          setIsLoadingChains(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Get chain icon - try to use logo from API, fallback to numbered chain icons
  const getChainIcon = (chain: Chain, index: number): string => {
    if (chain.logo) {
      return chain.logo;
    }
    // Fallback to numbered chain icons (1-9, then cycle)
    const chainNum = (index % 9) + 1;
    return `/assets/chains/chain-${chainNum}.svg`;
  };

  // Duplicate chains for seamless marquee animation (same pattern as status bar)
  const displayChains = chains.length > 0 ? chains : [];
  const duplicatedChains = [...displayChains, ...displayChains, ...displayChains];

  return (
    <div className="w-full flex flex-col gap-2">
      {/* Title */}
      <div className="flex flex-col items-start">
        <p className="text-white text-base font-semibold">Trade Without Limits</p>
      </div>

      {/* Top Row - 2 columns */}
      <div className="flex gap-2 items-start w-full">
        {/* TWC Token Price */}
        <div className="bg-[#121712] flex flex-[1_0_0] items-center min-w-0 min-h-0 overflow-hidden p-3 rounded-2xl">
          <div className="flex flex-col gap-2.5 items-start justify-center shrink-0">
            <Image
              src="/assets/logos/twc-token.svg"
              alt="TWC"
              width={24}
              height={24}
              className="w-6 h-6"
            />
            <div className="flex flex-col gap-0.5 items-start leading-normal shrink-0">
              <p className="text-white text-lg font-semibold">$0.0001</p>
              <p className="text-[#b5b5b5] text-xs font-medium">TWC Token Price</p>
            </div>
          </div>
        </div>

        {/* Active Chains with Marquee Animation */}
        <div className="bg-[#121712] flex flex-[1_0_0] items-center min-w-0 min-h-0 overflow-hidden px-0 py-3 rounded-2xl">
          <div className="flex flex-col gap-2.5 items-start justify-center shrink-0 w-full">
            {/* Chain Icons with Marquee */}
            <div className="overflow-hidden w-full h-6 relative">
              {isLoadingChains ? (
                <div className="flex items-center gap-2 animate-marquee whitespace-nowrap">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                    <div key={`skeleton-chain-${i}`} className="w-6 h-6 rounded-full bg-[#1f261e] animate-shimmer shrink-0" />
                  ))}
                </div>
              ) : duplicatedChains.length > 0 ? (
                <div className="flex items-center gap-2 animate-marquee whitespace-nowrap">
                  {duplicatedChains.map((chain, index) => (
                    <Image
                      key={`chain-${chain.id}-${index}`}
                      src={getChainIcon(chain, index)}
                      alt={chain.name}
                      width={24}
                      height={24}
                      className="rounded-full w-6 h-6 shrink-0"
                      unoptimized
                    />
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#1f261e]" />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-0.5 items-start leading-normal px-3 py-0 shrink-0">
              {isLoadingChains ? (
                <>
                  <div className="h-5 w-12 bg-[#1f261e] rounded animate-shimmer" />
                  <div className="h-3 w-20 bg-[#1f261e] rounded animate-shimmer" />
                </>
              ) : (
                <>
                  <p className="text-white text-lg font-semibold">
                    {chains.length > 0 ? `${chains.length}+` : "50+"}
                  </p>
                  <p className="text-[#b5b5b5] text-xs font-medium">Active Chains</p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row - 3 columns */}
      <div className="flex gap-2 items-start w-full">
        {/* Trading Volume */}
        <div className="bg-[#121712] flex flex-[1_0_0] items-center min-w-0 min-h-0 overflow-hidden p-3 rounded-2xl">
          <div className="flex flex-col gap-2.5 items-start justify-center shrink-0">
            <Image
              src="/assets/icons/home/trade-up.svg"
              alt="Trading Volume"
              width={20}
              height={20}
              className="w-5 h-5"
            />
            <div className="flex flex-col gap-0.5 items-start leading-normal shrink-0">
              <p className="text-white text-base font-semibold">$1.4M</p>
              <p className="text-[#b5b5b5] text-xs font-medium">Trading Volume</p>
            </div>
          </div>
        </div>

        {/* Trans. Count */}
        <div className="bg-[#121712] flex flex-[1_0_0] items-center min-w-0 min-h-0 overflow-hidden p-3 rounded-2xl">
          <div className="flex flex-col gap-2.5 items-start justify-center shrink-0">
            <Image
              src="/assets/icons/home/coins-02.svg"
              alt="Transaction Count"
              width={20}
              height={20}
              className="w-5 h-5"
            />
            <div className="flex flex-col gap-0.5 items-start leading-normal shrink-0">
              <p className="text-white text-base font-semibold">12,500</p>
              <p className="text-[#b5b5b5] text-xs font-medium">Trans. Count</p>
            </div>
          </div>
        </div>

        {/* Total Vol Locked */}
        <div className="bg-[#121712] flex flex-[1_0_0] items-center min-w-0 min-h-0 overflow-hidden p-3 rounded-2xl">
          <div className="flex flex-col gap-2.5 items-start justify-center shrink-0">
            <Image
              src="/assets/icons/home/locked.svg"
              alt="Total Vol Locked"
              width={20}
              height={20}
              className="w-5 h-5"
            />
            <div className="flex flex-col gap-0.5 items-start leading-normal shrink-0">
              <p className="text-white text-base font-semibold">$1M</p>
              <p className="text-[#b5b5b5] text-xs font-medium">Total Vol Locked</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

