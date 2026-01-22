"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import MarketTabs from "@/components/market/market-tabs";
import MarketSubTabs from "@/components/market/market-sub-tabs";
import MarketTable from "@/components/market/market-table";
import MobileMarketList from "@/components/market/mobile-market-list";
import { NetworkSelector } from "@/components/home/network-selector";
import { useNetworkFilterStore } from "@/lib/frontend/store/network-store";
import { useMarketPairsBatch } from "@/hooks/useMarketPairsBatch";
import { usePrefetchMarkets } from "@/hooks/usePrefetchMarkets";
import { marketPairToToken } from "@/lib/frontend/utils/market-utils";
import type { MarketTokenPair } from "@/lib/backend/types/backend-tokens";
import type { Token } from "@/lib/frontend/types/tokens";

type MarketTab = "Spot" | "Perp";
type SubTabKey = "Favourite" | "Top" | "Spotlight" | "New" | "Gainers" | "Losers";

export default function MarketPage() {

  usePrefetchMarkets();

  const [activeTab, setActiveTab] = useState<MarketTab>("Spot");
  const [activeSubTab, setActiveSubTab] = useState<SubTabKey>("Top");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<'volume' | 'liquidity' | 'performance' | 'none'>('none');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 60;

  const { selectedNetworkSlug } = useNetworkFilterStore();

  // Mapping subtabs to API categories
  const categoryMap: Record<string, 'hot' | 'new' | 'gainers' | 'losers' | null> = {
    Top: 'hot',
    Spotlight: 'hot',
    New: 'new',
    Gainers: 'gainers',
    Losers: 'losers',
    Favourite: null,
  };

  const activeCategory = categoryMap[activeSubTab] || 'hot';

  // Fetch real data in batches (60 items)
  const {
    pairs: marketPairs,
    isLoading,
    total
  } = useMarketPairsBatch({
    category: activeCategory,
    network: selectedNetworkSlug || undefined,
    uiPage: currentPage,
    uiRowsPerPage: rowsPerPage,
  });

  // Transform and filter tokens
  const tokens = useMemo(() => {
    let result = marketPairs.map(marketPairToToken);

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        t => t.symbol.toLowerCase().includes(query) || t.name.toLowerCase().includes(query)
      );
    }

    if (sortBy !== 'none') {
      result.sort((a, b) => {
        if (sortBy === 'volume') return (b.volume24h || 0) - (a.volume24h || 0);
        if (sortBy === 'liquidity') return (b.liquidity || 0) - (a.liquidity || 0);
        if (sortBy === 'performance') return (b.priceChange24h || 0) - (a.priceChange24h || 0);
        return 0;
      });
    }

    return result;
  }, [marketPairs, searchQuery, sortBy]);

  // Reset page when category or network changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeSubTab, selectedNetworkSlug]);

  return (
    <>
      {/* Desktop Layout */}
      <div className="hidden lg:block">
        <div className="mx-auto max-w-[1728px]">
          <div className="flex flex-col gap-6 lg:gap-8 xl:gap-10 items-start justify-between pt-8 lg:pt-0 pb-8">
            {/* Main Content Area */}
            <div className="flex flex-col gap-4 lg:gap-6 items-start flex-1 min-w-0 w-full px-4 lg:px-6 xl:px-8 2xl:px-12">
              {/* Main Tabs (Spot/Perp) */}
              <div className="w-full">
                <MarketTabs activeTab={activeTab} onTabChange={setActiveTab} />
              </div>

              {/* Sub Tabs (Favourite, Top, New, etc.) and Search */}
              <div className="w-full flex items-center justify-between gap-3 lg:gap-4 xl:gap-4 2xl:gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <NetworkSelector />
                  <MarketSubTabs activeTab={activeSubTab} onTabChange={setActiveSubTab} />
                </div>
                <div className="hidden lg:block">
                  <div className="bg-[#0b0f0a] border border-[#1f261e] rounded-full px-3 lg:px-3.5 xl:px-4 2xl:px-4 py-2.5 lg:py-3 xl:py-3 2xl:py-[13px] flex items-center gap-1.5 lg:gap-2 xl:gap-2 2xl:gap-2 w-[400px] xl:w-[500px] 2xl:w-[600px]">
                    <Image
                      src="/assets/icons/search-01.svg"
                      alt="Search"
                      width={20}
                      height={20}
                      className="w-4 lg:w-4 xl:w-5 2xl:w-5 h-4 lg:h-4 xl:h-5 2xl:h-5 shrink-0"
                    />
                    <input
                      placeholder="Search by tokens"
                      className="bg-transparent text-xs lg:text-sm xl:text-base 2xl:text-base text-[#7c7c7c] outline-none w-full"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Market Table */}
              <div className="flex-1 border border-[#1f261e] rounded-xl overflow-hidden flex flex-col min-h-0 w-full" style={{ minHeight: '600px', maxHeight: 'calc(100vh - 250px)' }}>
                <MarketTable
                  tokens={tokens}
                  isLoading={isLoading}
                  total={total}
                  currentPage={currentPage}
                  onPageChange={setCurrentPage}
                  sortBy={sortBy}
                  onSortChange={setSortBy}
                  marketType={activeTab.toLowerCase() as "spot" | "perp"}
                />
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Mobile Layout */}
      <div className="flex lg:hidden flex-col items-start w-screen relative min-h-screen bg-[#010501] z-20" style={{ marginLeft: 'calc(-50vw + 50%)', marginRight: 'calc(-50vw + 50%)' }}>
        {/* Sticky Header */}
        <div className="bg-[#010501] sticky top-0 z-30 w-full">
          {/* Main Tabs (Spot/Perp) and Search */}
          <div className="flex items-start justify-between px-[20px] sm:px-[24px] py-0 border-b-[0.5px] border-[#1f261e] pt-4">
            <div className="flex gap-4 sm:gap-5 items-start">
              <div className="flex flex-col gap-2.5 items-center">
                <button
                  onClick={() => setActiveTab("Spot")}
                  className={`text-sm sm:text-base font-semibold leading-normal text-center transition-colors cursor-pointer ${activeTab === "Spot" ? "text-[#b1f128]" : "text-[#7c7c7c]"
                    }`}
                >
                  Spot
                </button>
                {activeTab === "Spot" && (
                  <div className="h-0 w-full border-t border-[#b1f128]"></div>
                )}
              </div>
              <div className="flex flex-col gap-2.5 items-center">
                <button
                  onClick={() => setActiveTab("Perp")}
                  className={`text-sm sm:text-base font-semibold leading-normal text-center transition-colors cursor-pointer ${activeTab === "Perp" ? "text-[#b1f128]" : "text-[#7c7c7c]"
                    }`}
                >
                  Perp
                </button>
                {activeTab === "Perp" && (
                  <div className="h-0 w-full border-t border-[#b1f128]"></div>
                )}
              </div>
            </div>
            <div className="relative shrink-0 size-6 sm:size-7">
              <Image
                src="/assets/icons/search-01.svg"
                alt="Search"
                width={24}
                height={24}
                className="w-full h-full"
              />
            </div>
          </div>

          {/* Sub Tabs (Favourite, Top, Spotlight, etc.) - Horizontally scrollable */}
          <div className="flex gap-2 sm:gap-2.5 items-center px-[20px] sm:px-[24px] py-2 sm:py-2.5 overflow-x-auto scrollbar-hide">
            {(["Favourite", "Top", "Spotlight", "New", "Gainers", "Losers"] as SubTabKey[]).map((tab) => {
              const isActive = activeSubTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveSubTab(tab)}
                  className={`px-[10px] sm:px-3 py-1.5 sm:py-2 rounded-[100px] text-xs sm:text-sm font-medium leading-normal tracking-[0.012px] whitespace-nowrap shrink-0 transition-colors cursor-pointer ${isActive
                    ? "bg-[#081f02] text-[#b1f128]"
                    : "bg-[#0b0f0a] text-[#b5b5b5]"
                    }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>
        </div>

        {/* Market List - Card-based */}
        <div className="flex-1 w-full overflow-y-auto">
          <MobileMarketList
            tokens={tokens}
            isLoading={isLoading}
          />
        </div>
      </div>
    </>
  );
}
