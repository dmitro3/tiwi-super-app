"use client";

import { useState } from "react";
import { Sidebar } from "@/components/home/sidebar";
import { MetricStrip } from "@/components/home/metric-strip";
import { HeroBanner } from "@/components/home/hero-banner";
import { TabBar } from "@/components/home/tab-bar";
import { SearchBar } from "@/components/home/search-bar";
import { MarketTable } from "@/components/home/market-table";
import { RightRail } from "@/components/home/right-rail";
import { QuickActionButtons } from "@/components/home/quick-action-buttons";
import { MobileSpotlight } from "@/components/home/mobile-spotlight";
import { MobileMarketList } from "@/components/home/mobile-market-list";
import { MobileStatsGrid } from "@/components/home/mobile-stats-grid";
import { SmartMarketsMarquee } from "@/components/home/smart-markets-marquee";
import Image from "next/image";

type TabKey = "Favourite" | "Hot" | "New" | "Gainers" | "Losers";
type MobileTabKey = "Favourite" | "Top" | "Spotlight" | "New" | "Gainers" | "Losers";

export default function HomePage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("Hot");
  const [activeMobileTab, setActiveMobileTab] = useState<MobileTabKey>("Top");

  return (
    <div className="bg-[#010501] text-white flex flex-col" style={{ height: '110vh', overflow: 'hidden' }}>
      {/* Desktop Layout (lg and above) */}
      <div className="hidden lg:flex flex-row flex-1 overflow-hidden w-full mx-auto justify-center" style={{ height: 'calc(110vh - 136px)' }}>
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((p) => !p)} />

        <main className="flex-1 px-4 lg:px-5 xl:px-5 2xl:px-6 py-4 lg:py-5 xl:py-5 2xl:py-6 flex flex-col gap-4 lg:gap-5 xl:gap-5 2xl:gap-6 overflow-hidden min-w-0 max-w-[1129px]">
          <HeroBanner />

          <div className="flex items-center justify-between shrink-0 gap-3 lg:gap-4 xl:gap-4">
            <TabBar active={activeTab} onChange={setActiveTab} />
            <SearchBar />
          </div>

          <div className="flex-1 border border-[#1f261e] rounded-xl overflow-hidden flex flex-col min-h-0">
            <MarketTable activeTab={activeTab} />
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
          <MobileMarketList activeTab={activeMobileTab} onTabChange={setActiveMobileTab} />
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
