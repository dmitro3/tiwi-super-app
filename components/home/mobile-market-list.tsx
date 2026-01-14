"use client";

import { useMemo } from "react";
import Image from "next/image";
import { useTokensQuery } from "@/hooks/useTokensQuery";
import { useFavorites } from "@/hooks/useFavorites";
import { formatPrice } from "@/lib/shared/utils/formatting";
import { filterAndSortTokensByTab } from "@/lib/shared/utils/tokens";
import TokenIcon from "@/components/ui/token-icon";

type TabKey = "Favourite" | "Top" | "Spotlight" | "New" | "Gainers" | "Losers";

const tabs: TabKey[] = ["Favourite", "Top", "Spotlight", "New", "Gainers", "Losers"];

interface MobileMarketListProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

/**
 * Mobile Market List component
 * - Vertical list of market rows (not table)
 * - Horizontal scrollable tabs
 * - Each row shows: token icon, pair name, leverage, volume, price, change
 */
export function MobileMarketList({ activeTab, onTabChange }: MobileMarketListProps) {
  // Fetch real token data from DexScreener for market data
  const { data: allTokens = [], isLoading } = useTokensQuery({
    params: { limit: 100, source: 'market' as const }, // Use DexScreener market data
  });

  // Get favorites
  const { favoriteIds, toggleFavorite, isFavorited } = useFavorites();

  // Map mobile tab to desktop tab format for filtering
  const filterTab = activeTab === "Top" ? "Hot" : activeTab === "Spotlight" ? "Hot" : activeTab;

  // Filter and sort tokens based on active tab
  const filteredTokens = useMemo(() => {
    if (filterTab === "Spotlight" || filterTab === "Top") {
      // For Spotlight/Top, use Hot logic (sort by volume)
      return filterAndSortTokensByTab(allTokens, "Hot", favoriteIds);
    }
    return filterAndSortTokensByTab(allTokens, filterTab as "Favourite" | "Hot" | "New" | "Gainers" | "Losers", favoriteIds);
  }, [allTokens, filterTab, favoriteIds]);

  // Show first 5 tokens for mobile
  const displayTokens = filteredTokens.slice(0, 5);

  // Format volume helper
  const formatVolume = (vol: number | undefined): string => {
    if (!vol || vol === 0 || isNaN(vol)) return "$0.00M";
    if (vol >= 1_000_000_000) {
      return `$${(vol / 1_000_000_000).toFixed(2)}B`;
    } else if (vol >= 1_000_000) {
      return `$${(vol / 1_000_000).toFixed(2)}M`;
    } else if (vol >= 1_000) {
      return `$${(vol / 1_000).toFixed(2)}K`;
    } else {
      return `$${vol.toFixed(2)}`;
    }
  };

  // Format price change helper
  const formatChange = (change: number | undefined): { text: string; positive: boolean } => {
    if (change === undefined || change === null || isNaN(change)) {
      return { text: "0.00%", positive: true };
    }
    const sign = change >= 0 ? "+" : "";
    return {
      text: `${sign}${change.toFixed(2)}%`,
      positive: change >= 0,
    };
  };

  return (
    <div className="w-full flex flex-col gap-2">
      {/* Title */}
      <div className="">
        <p className="text-white text-base font-semibold">Market</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#1f261e] flex gap-4 items-start pb-0">
        {tabs.map((tab) => {
          const isActive = tab === activeTab;
          return (
            <div key={tab} className="flex flex-col gap-2.5 h-[26px] items-center shrink-0">
              <button
                onClick={() => onTabChange(tab)}
                className={`text-xs font-semibold leading-normal transition-colors cursor-pointer ${
                  isActive ? "text-[#b1f128]" : "text-[#b5b5b5]"
                }`}
              >
                {tab}
              </button>
              {isActive && (
                <div className="h-0 w-full border-t border-[#b1f128] mt-auto" />
              )}
            </div>
          );
        })}
      </div>

      {/* Market Rows */}
      <div className="flex flex-col items-start w-full">
        {isLoading ? (
          // Loading skeleton
          Array.from({ length: 5 }).map((_, idx) => (
            <div
              key={`skeleton-${idx}`}
              className="flex items-center overflow-hidden w-full p-2 rounded-2xl"
            >
              <div className="flex flex-[1_0_0] gap-2.5 items-center min-w-0 min-h-0">
                <div className="w-8 h-8 rounded-full bg-[#1f261e] animate-pulse" />
                <div className="flex flex-[1_0_0] flex-col items-start justify-center min-w-0 min-h-0 gap-2">
                  <div className="h-4 w-24 bg-[#1f261e] rounded animate-pulse" />
                  <div className="h-3 w-16 bg-[#1f261e] rounded animate-pulse" />
                </div>
                <div className="flex flex-col items-end justify-center leading-normal shrink-0 gap-2">
                  <div className="h-4 w-16 bg-[#1f261e] rounded animate-pulse" />
                  <div className="h-3 w-12 bg-[#1f261e] rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))
        ) : displayTokens.length === 0 ? (
          <div className="w-full text-center py-8 text-[#7c7c7c] text-sm">
            {activeTab === "Favourite" 
              ? "No favorite tokens. Click the star icon to add tokens to favorites."
              : "No tokens available"}
          </div>
        ) : (
          displayTokens.map((token) => {
            const change = formatChange(token.priceChange24h);
            return (
              <div
                key={token.id}
                className="flex items-center overflow-hidden w-full hover:bg-[#121712] transition-colors p-2 cursor-pointer rounded-2xl"
              >
                <div className="flex flex-[1_0_0] gap-2.5 items-center min-w-0 min-h-0">
                  <TokenIcon
                    logo={token.logo}
                    symbol={token.symbol}
                    address={token.address}
                    chainId={token.chainId}
                    size="md"
                    className="w-8 h-8"
                  />
                  <div className="flex flex-[1_0_0] flex-col items-start justify-center min-w-0 min-h-0">
                    <div className="flex gap-2 items-center">
                      <p className="text-white text-sm font-medium">
                        <span className="font-semibold">{token.symbol}</span>
                        <span className="text-[#b5b5b5]">/USDT</span>
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(token.id);
                        }}
                        className="shrink-0 hover:opacity-80 transition-opacity"
                        aria-label={isFavorited(token.id) ? "Remove from favorites" : "Add to favorites"}
                      >
                        <Image
                          src="/assets/icons/home/star.svg"
                          alt="star"
                          width={12}
                          height={12}
                          className={`w-3 h-3 ${isFavorited(token.id) ? "opacity-100" : "opacity-40"}`}
                        />
                      </button>
                    </div>
                    <p className="text-[#b5b5b5] text-xs font-medium">
                      Vol {formatVolume(token.volume24h).replace("$", "")}
                    </p>
                  </div>
                  <div className="flex flex-col items-end justify-center leading-normal shrink-0">
                    <p className="text-white text-sm font-semibold">{formatPrice(token.price)}</p>
                    <p
                      className={`text-xs font-medium ${
                        change.positive ? "text-[#3fea9b]" : "text-[#ff5c5c]"
                      }`}
                    >
                      {change.text}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* View All Button */}
      <div className="flex items-center justify-center w-full">
        <button className="bg-[#0d3600] flex gap-3 items-center justify-center overflow-hidden px-6 py-2.5 rounded-full w-full">
          <p className="text-white text-sm font-medium text-center leading-[1.6]">
            View all
          </p>
        </button>
      </div>
    </div>
  );
}

