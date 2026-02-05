"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import MarketTabs from "@/components/market/market-tabs";
import MarketSubTabs from "@/components/market/market-sub-tabs";
import MarketTable from "@/components/market/market-table";
import MobileMarketList from "@/components/market/mobile-market-list";
import { useEnrichedMarkets } from "@/hooks/useEnrichedMarkets";
import { usePrefetchMarkets } from "@/hooks/usePrefetchMarkets";
import type { Token } from "@/lib/frontend/types/tokens";

type MarketTab = "Spot" | "Perp";
type SubTabKey = "Favourite" | "Top" | "Spotlight" | "New" | "Gainers" | "Losers";

interface SpotlightToken {
  id: string;
  symbol: string;
  name?: string;
  address?: string;
  logo?: string;
  rank: number;
  startDate: string;
  endDate: string;
}

export default function MarketPage() {

  usePrefetchMarkets();

  const [activeTab, setActiveTab] = useState<MarketTab>("Spot");
  const [activeSubTab, setActiveSubTab] = useState<SubTabKey>("Top");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<'volume' | 'rank' | 'performance' | 'none'>('none');
  const [currentPage, setCurrentPage] = useState(1);
  const [favourites, setFavourites] = useState<string[]>([]);
  const [spotlightTokens, setSpotlightTokens] = useState<SpotlightToken[]>([]);
  const [spotlightTokensData, setSpotlightTokensData] = useState<Token[]>([]);
  const [isSpotlightLoading, setIsSpotlightLoading] = useState(false);
  const rowsPerPage = 60;

  // Load favourites from localStorage
  useEffect(() => {
    const TWC_ADDRESS = '0xDA1060158F7D593667cCE0a15DB346BB3FfB3596';
    const TWC_CHAIN_ID = 56; // BNB Chain
    const TWC_ID = `${TWC_CHAIN_ID}-${TWC_ADDRESS.toLowerCase()}`;

    const stored = localStorage.getItem('favouriteTokens');
    let favouritesList: string[] = [];

    if (stored) {
      try {
        favouritesList = JSON.parse(stored);
      } catch (e) {
        console.error('[MarketPage] Error parsing favourites:', e);
      }
    }

    if (!favouritesList.includes(TWC_ID)) {
      favouritesList.unshift(TWC_ID);
      localStorage.setItem('favouriteTokens', JSON.stringify(favouritesList));
    }

    setFavourites(favouritesList);
  }, []);

  // Fetch unified enriched markets (Spot and Perp)
  const {
    data: allEnrichedTokens = [],
    isLoading: isEnrichedLoading,
  } = useEnrichedMarkets({
    marketType: activeTab.toLowerCase() as 'spot' | 'perp',
  });

  // Fetch spotlight tokens separately as they are DB-driven
  useEffect(() => {
    if (activeSubTab !== "Spotlight") {
      setSpotlightTokensData([]);
      return;
    }

    const loadSpotlightTokens = async () => {
      setIsSpotlightLoading(true);
      try {
        const response = await fetch(`/api/v1/token-spotlight?activeOnly=true`);
        if (!response.ok) throw new Error("Failed to fetch spotlight tokens");
        const data = await response.json();
        const today = new Date().toISOString().split('T')[0];
        const activeTokens = (data.tokens || [])
          .filter((token: SpotlightToken) => token.startDate <= today && token.endDate >= today)
          .sort((a: SpotlightToken, b: SpotlightToken) => a.rank - b.rank);

        setSpotlightTokens(activeTokens);

        // Map spotlight database tokens to our enriched data if possible
        const results = activeTokens.map((st: SpotlightToken) => {
          const enriched = allEnrichedTokens.find(et =>
            et.symbol.toUpperCase() === st.symbol.toUpperCase()
          );

          if (enriched) return enriched;

          return {
            id: st.id,
            symbol: st.symbol,
            name: st.name || st.symbol,
            address: st.address || '',
            logo: st.logo || '',
            logoURI: st.logo || '',
            chainId: 0,
            price: '0',
            priceChange24h: 0,
            volume24h: 0,
          } as Token;
        });

        setSpotlightTokensData(results);
      } catch (error) {
        console.error("Error spotlight:", error);
      } finally {
        setIsSpotlightLoading(false);
      }
    };

    if (allEnrichedTokens.length > 0) {
      loadSpotlightTokens();
    }
  }, [activeSubTab, allEnrichedTokens]);

  // Determine filtering based on activeSubTab
  const filteredTickers = useMemo(() => {
    let list = Array.isArray(allEnrichedTokens) ? [...allEnrichedTokens] : [];

    if (activeSubTab === "Gainers") {
      return list.filter(t => t.priceChange24h > 0).sort((a, b) => b.priceChange24h - a.priceChange24h);
    }
    if (activeSubTab === "Losers") {
      return list.filter(t => t.priceChange24h < 0).sort((a, b) => a.priceChange24h - b.priceChange24h);
    }
    if (activeSubTab === "New") {
      // For now, we don't have a strict 'new' date, so just sort by something else or randomized
      return list;
    }

    return list; // Default to Top (already sorted by volume in API)
  }, [allEnrichedTokens, activeSubTab]);

  // Main token list logic
  const rawTokens: Token[] = useMemo(() => {
    if (activeSubTab === "Favourite") {
      return allEnrichedTokens.filter(t => favourites.includes(t.id));
    }
    if (activeSubTab === "Spotlight") {
      return spotlightTokensData;
    }
    return filteredTickers;
  }, [activeSubTab, allEnrichedTokens, favourites, spotlightTokensData, filteredTickers]);

  const isLoading = activeSubTab === "Spotlight" ? isSpotlightLoading : isEnrichedLoading;

  // Transform, filter, sort, and paginate tokens
  const tokens = useMemo(() => {
    let result: Token[] = [...rawTokens];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        t => t.symbol?.toLowerCase().includes(query) || t.name?.toLowerCase().includes(query)
      );
    }

    if (sortBy !== 'none') {
      result.sort((a, b) => {
        if (sortBy === 'volume') return (b.volume24h || 0) - (a.volume24h || 0);
        if (sortBy === 'rank') {
          const rankA = a.marketCapRank ?? 999999;
          const rankB = b.marketCapRank ?? 999999;
          return rankA - rankB;
        }
        if (sortBy === 'performance') return (b.priceChange24h || 0) - (a.priceChange24h || 0);
        return 0;
      });
    }

    return result;
  }, [rawTokens, searchQuery, sortBy]);

  // Pagination logic - calculate which pages to show (like home page)
  const getVisiblePages = (): number[] => {
    const pages: number[] = [];
    const totalPages = Math.ceil(tokens.length / rowsPerPage);

    if (totalPages <= 5) {
      // Show all pages if 5 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show page 1
      pages.push(1);

      if (currentPage <= 3) {
        // Show 1, 2, 3, 4, ... if on early pages
        pages.push(2, 3, 4);
      } else if (currentPage >= totalPages - 2) {
        // Show ..., n-3, n-2, n-1, n if on late pages
        pages.push(totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        // Show ..., current-1, current, current+1, ... if in middle
        pages.push(currentPage - 1, currentPage, currentPage + 1);
      }

      // Always show last page if not already included
      if (!pages.includes(totalPages)) {
        pages.push(totalPages);
      }
    }

    // Remove duplicates and sort
    return [...new Set(pages)].sort((a, b) => a - b);
  };

  const visiblePages = getVisiblePages();
  const totalPages = Math.ceil(tokens.length / rowsPerPage);
  const paginatedTokens = tokens.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );
  const total = tokens.length;

  // Reset page when category changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeSubTab, activeTab]);

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
                  tokens={paginatedTokens}
                  isLoading={isLoading}
                  total={total}
                  currentPage={currentPage}
                  onPageChange={setCurrentPage}
                  sortBy={sortBy}
                  onSortChange={setSortBy}
                  marketType={activeTab.toLowerCase() as "spot" | "perp"}
                  favourites={favourites}
                  onFavouriteToggle={(tokenId) => {
                    const newFavourites = [...favourites];
                    const index = newFavourites.indexOf(tokenId);
                    if (index > -1) {
                      newFavourites.splice(index, 1);
                    } else {
                      newFavourites.push(tokenId);
                    }
                    setFavourites(newFavourites);
                    localStorage.setItem('favouriteTokens', JSON.stringify(newFavourites));
                  }}
                  visiblePages={visiblePages}
                  totalPages={totalPages}
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
            <div className="flex gap-4 sm:gap-5 items-start relative">
              <div className="flex flex-col gap-2.5 items-center relative">
                <button
                  onClick={() => setActiveTab("Spot")}
                  className={`text-sm sm:text-base font-semibold leading-normal text-center transition-colors cursor-pointer ${activeTab === "Spot" ? "text-[#b1f128]" : "text-[#7c7c7c]"
                    }`}
                >
                  Spot
                </button>
                <div className={`absolute bottom-0 h-0 w-full border-t border-[#b1f128] transition-all duration-300 ${activeTab === "Spot" ? "opacity-100" : "opacity-0 w-0"
                  }`}></div>
              </div>
              <div className="flex flex-col gap-2.5 items-center relative">
                <button
                  onClick={() => setActiveTab("Perp")}
                  className={`text-sm sm:text-base font-semibold leading-normal text-center transition-colors cursor-pointer ${activeTab === "Perp" ? "text-[#b1f128]" : "text-[#7c7c7c]"
                    }`}
                >
                  Perp
                </button>
                <div className={`absolute bottom-0 h-0 w-full border-t border-[#b1f128] transition-all duration-300 ${activeTab === "Perp" ? "opacity-100" : "opacity-0 w-0"
                  }`}></div>
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
            tokens={paginatedTokens}
            isLoading={isLoading}
          />
        </div>
      </div>
    </>
  );
}
