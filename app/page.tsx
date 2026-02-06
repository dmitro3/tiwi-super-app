"use client";

import { useState, useMemo, useEffect } from "react";
import { Sidebar } from "@/components/home/sidebar";
import { MetricStrip } from "@/components/home/metric-strip";
import { HeroBanner } from "@/components/home/hero-banner";
import { TabBar } from "@/components/home/tab-bar";
import { CollapsibleSearchBar } from "@/components/home/collapsible-search-bar";
import { MarketTable } from "@/components/home/market-table";
import { RightRail } from "@/components/home/right-rail";
import { QuickActionButtons } from "@/components/home/quick-action-buttons";
import { MobileSpotlight } from "@/components/home/mobile-spotlight";
import { MobileMarketList } from "@/components/home/mobile-market-list";
import { MobileStatsGrid } from "@/components/home/mobile-stats-grid";
import { SmartMarketsMarquee } from "@/components/home/smart-markets-marquee";
import { NetworkSelector } from "@/components/home/network-selector";
import Image from "next/image";

import { usePrefetchMarkets } from "@/hooks/usePrefetchMarkets";
import { useEnrichedMarkets } from "@/hooks/useEnrichedMarkets";
import type { Token } from "@/lib/frontend/types/tokens";
import { formatTokenForHomepage } from "@/lib/home/token-formatter";
import { promoteTWC } from "@/lib/frontend/utils/market-promotion";

type TabKey = "Favourite" | "Hot" | "New" | "Gainers" | "Losers";
type MobileTabKey = "Favourite" | "Top" | "Spotlight" | "New" | "Gainers" | "Losers";

export default function HomePage() {
  usePrefetchMarkets();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [activeTab, setActiveTab] = useState<TabKey>("Hot");
  const [activeMobileTab, setActiveMobileTab] = useState<MobileTabKey>("Top");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<'volume' | 'rank' | 'performance' | 'none'>('none');
  const [currentPage, setCurrentPage] = useState(1);
  const [favourites, setFavourites] = useState<string[]>([]);
  const rowsPerPage = 20;

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
        console.error('[HomePage] Error parsing favourites:', e);
      }
    }

    if (!favouritesList.includes(TWC_ID)) {
      favouritesList.unshift(TWC_ID);
      localStorage.setItem('favouriteTokens', JSON.stringify(favouritesList));
    }

    setFavourites(favouritesList);
  }, []);

  // Fetch unified enriched markets (Spot only for Home)
  const {
    data: allEnrichedTokens = [],
    isLoading,
  } = useEnrichedMarkets({
    marketType: 'spot',
  });

  // Determine filtering based on activeTab or activeMobileTab
  const getFilteredTokens = (tab: string) => {
    let list = Array.isArray(allEnrichedTokens) ? [...allEnrichedTokens] : [];

    if (tab === "Gainers") {
      return list.filter(t => t.priceChange24h > 0).sort((a, b) => b.priceChange24h - a.priceChange24h);
    }
    if (tab === "Losers") {
      return list.filter(t => t.priceChange24h < 0).sort((a, b) => a.priceChange24h - b.priceChange24h);
    }
    if (tab === "New") {
      // Sort by something that represents 'newness' or just return list
      return list;
    }
    if (tab === "Favourite") {
      return list.filter(t => favourites.includes(t.id));
    }
    if (tab === "Spotlight") {
      return list;
    }

    return list; // Default to Hot/Top
  };

  const desktopFiltered = useMemo(() => getFilteredTokens(activeTab), [allEnrichedTokens, activeTab, favourites]);
  const mobileFiltered = useMemo(() => getFilteredTokens(activeMobileTab), [allEnrichedTokens, activeMobileTab, favourites]);

  // Transform, filter, sort for Desktop
  const tokens = useMemo(() => {
    let result: Token[] = [...desktopFiltered];

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

    // Promote TWC to 2nd position for better visibility
    if (!searchQuery.trim() && (activeTab === 'Hot' || activeTab === 'Gainers')) {
      result = promoteTWC(result, { position: 1 });
    }

    return result;
  }, [desktopFiltered, searchQuery, sortBy, activeTab]);

  // Transform for Mobile
  const mobileTokens = useMemo(() => {
    let list = [...mobileFiltered];

    // Promote TWC in mobile view too
    if (activeMobileTab === 'Top' || activeMobileTab === 'Gainers') {
      list = promoteTWC(list, { position: 1 });
    }

    return list.slice(0, 5).map(t => formatTokenForHomepage(t));
  }, [mobileFiltered, activeMobileTab]);

  const total = tokens.length;
  const paginatedTokens = tokens.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // Reset page when tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  return (
    <div className="bg-[#010501] text-white flex flex-col" style={{ height: '110vh', overflow: 'hidden' }}>
      {/* Desktop Layout (lg and above) */}
      <div className="hidden lg:flex flex-row flex-1 overflow-hidden w-full mx-auto justify-center" style={{ height: 'calc(110vh - 136px)' }}>
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((p) => !p)} />

        <main className="flex-1 px-4 lg:px-5 xl:px-5 2xl:px-6 py-4 lg:py-5 xl:py-5 2xl:py-6 flex flex-col gap-4 lg:gap-5 xl:gap-5 2xl:gap-6 overflow-hidden min-w-0 max-w-[1129px]">
          <HeroBanner />

          <div className="flex items-center shrink-0 gap-3 lg:gap-4 xl:gap-4">
            <div className="flex items-center gap-2 lg:gap-3 flex-1 min-w-0">
              {/* <NetworkSelector /> */}
              <TabBar active={activeTab} onChange={setActiveTab} />
            </div>
            <CollapsibleSearchBar value={searchQuery} onChange={setSearchQuery} />
          </div>

          <div className="flex-1 border border-[#1f261e] rounded-xl overflow-hidden flex flex-col min-h-0">
            <MarketTable
              tokens={paginatedTokens}
              isLoading={isLoading}
              total={total}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              activeTab={activeTab}
              searchQuery={searchQuery}
              sortBy={sortBy}
              onSortChange={setSortBy}
            />
          </div>
        </main>

        <aside className="flex-[0_0_21.875rem] min-w-[21.875rem] border-l border-[#1f261e] flex flex-col gap-4 overflow-hidden shrink-0 py-4">
          <RightRail />
        </aside>
      </div>

      {/* Mobile & Tablet Layout (below lg) */}
      <div className="flex lg:hidden flex-col overflow-y-auto" style={{ minHeight: '100vh', scrollbarWidth: 'none' }}>
        {/* Hero Banner */}
        <div className="px-[18px] pt-4 pb-2">
          <HeroBanner />
        </div>

        {/* Quick Action Buttons */}
        <div className="px-[18px] py-2">
          <QuickActionButtons />
        </div>

        {/* Stake Card */}
        <div className="px-[18px] py-2">
          <div className="relative border border-[#1f261e] flex items-center justify-between overflow-hidden px-3 py-2.5 rounded-2xl">
            {/* Gradient Background Ellipse - positioned as per Figma design */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[146px] h-[37px] pointer-events-none opacity-100">
              <Image
                src="/assets/icons/home/ellipse-gradient.svg"
                alt=""
                width={146}
                height={37}
                className="w-full h-full object-contain"
                unoptimized
              />
            </div>

            {/* Content */}
            <div className="relative flex items-center justify-between w-full z-10 cursor-pointer">
              <div className="flex gap-1 items-center shrink-0">
                <div className="relative w-[18px] h-[18px] shrink-0">
                  <Image
                    src="/assets/icons/home/stake-icon.svg"
                    alt="Stake"
                    width={18}
                    height={18}
                    className="w-full h-full object-contain"
                    unoptimized
                  />
                </div>
                <p className="text-[#b5b5b5] text-sm font-medium leading-normal">
                  Stake to earn <span className="text-white font-semibold">$TWC</span>
                </p>
              </div>
              <div className="flex items-center justify-center w-4 h-4 shrink-0">
                <div className="rotate-90 -scale-y-100">
                  <div className="relative w-4 h-4">
                    <Image
                      src="/assets/icons/home/arrow-down-01.svg"
                      alt=""
                      width={16}
                      height={16}
                      className="w-full h-full object-contain"
                      unoptimized
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Spotlight */}
        <div className="px-[18px] py-2">
          <MobileSpotlight />
        </div>

        {/* Market List */}
        <div className="px-[18px] py-2">
          <MobileMarketList
            tokens={mobileTokens}
            isLoading={isLoading}
            activeTab={activeMobileTab}
            onTabChange={setActiveMobileTab}
          />
        </div>

        {/* Stats Grid */}
        <div className="px-5 py-2">
          <MobileStatsGrid />
        </div>

        {/* Smart Markets */}
        <div className="px-5 py-2 pb-8">
          <SmartMarketsMarquee />
        </div>
      </div>
    </div>
  );
}
