"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import TokenHeader from "@/components/market/token-header";
import TradingForm from "@/components/market/trading-form";
import ChartSection from "@/components/market/chart-section";
import OrderbookSection from "@/components/market/orderbook-section";
import OrdersTable from "@/components/market/orders-table";
import StakeCard from "@/components/market/stake-card";
import MobileTradingLayout from "@/components/market/mobile-trading-layout";
import TokenHeaderSkeleton from "@/components/market/skeletons/token-header-skeleton";
import ChartSkeleton from "@/components/market/skeletons/chart-skeleton";
import OrderbookSkeleton from "@/components/market/skeletons/orderbook-skeleton";
import TradingFormSkeleton from "@/components/market/skeletons/trading-form-skeleton";
import OrdersTableSkeleton from "@/components/market/skeletons/orders-table-skeleton";
import { getTokenByPair, getTokenStats } from "@/lib/market/trading-mock-data";
import Image from "next/image";

/**
 * Trading Page - Market Spot/Perp Active Trade with Chart
 * 
 * Route: /market/[pair]
 * Example: /market/BTC-USDT
 * 
 * Features:
 * - Token header with price and stats
 * - Trading form (Buy/Sell, Market/Limit)
 * - Chart with TradingView widget
 * - Orderbook with depth visualization
 * - Orders and transaction history
 * - Stake to earn card
 */
export default function TradingPage() {
  const params = useParams();
  const pair = params.pair as string;

  const [activeMarketTab, setActiveMarketTab] = useState<"Spot" | "Perp">("Spot");
  const [tokenData, setTokenData] = useState<any>(null);
  const [tokenStats, setTokenStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch token data and stats
  useEffect(() => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      const token = getTokenByPair(pair);
      const stats = getTokenStats(pair);
      setTokenData(token);
      setTokenStats(stats);
      setIsLoading(false);
    }, 500);
  }, [pair]);

  useEffect(() => {
    // Hide StatusBar for this page (not Navbar)
    // StatusBar has unique class "status-bar", Navbar does not
    const statusBar = document.querySelector('.status-bar') as HTMLElement | null;
    if (statusBar) {
      statusBar.style.display = 'none';
    }

    return () => {
      // Show StatusBar when leaving this page
      const statusBar = document.querySelector('.status-bar') as HTMLElement | null;
      if (statusBar) {
        statusBar.style.display = '';
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#010501] w-full">
      <div className="mx-auto max-w-[1728px] w-full">
        {/* Desktop Layout */}
        <div className="hidden lg:flex flex-row gap-0">
          {/* LEFT SECTION - Main Content (1348px base, scaled for smaller screens) */}
          <main className="w-[1348px] lg:w-[980px] xl:w-[1100px] 2xl:w-[1348px] flex flex-col min-w-0 border-r border-[#1f261e]">
            {isLoading ? (
              <>
                <TokenHeaderSkeleton />
                <div className="flex flex-row border-b border-[#1f261e]">
                  <div className="flex-1 min-w-0">
                    <ChartSkeleton />
                  </div>
                  <div className="w-[424px] lg:w-[308px] xl:w-[344px] 2xl:w-[424px] border-l border-[#1f261e] shrink-0">
                    <OrderbookSkeleton />
                  </div>
                </div>
                <div className="flex-1">
                  <OrdersTableSkeleton />
                </div>
              </>
            ) : tokenData && tokenStats ? (
              <>
                {/* Token Header */}
                <TokenHeader
                  token={tokenData}
                  stats={tokenStats}
                />

                {/* Chart and Orderbook Section */}
                <div className="flex flex-row border-b border-[#1f261e]">
                  {/* Chart Section - Scaled proportionally */}
                  <div className="w-[924px] lg:w-[672px] xl:w-[756px] 2xl:w-[924px] min-w-0">
                    <ChartSection pair={tokenData.pair || ""} />
                  </div>

                  {/* Orderbook Section - Scaled proportionally */}
                  <div className="w-[424px] lg:w-[308px] xl:w-[344px] 2xl:w-[424px] border-l border-[#1f261e] shrink-0">
                    <OrderbookSection />
                  </div>
                </div>

                {/* Orders/History Section */}
                <div className="flex-1">
                  <OrdersTable />
                </div>
              </>
            ) : (
              <>
                <TokenHeaderSkeleton />
                <div className="flex flex-row border-b border-[#1f261e]">
                  <div className="flex-1 min-w-0">
                    <ChartSkeleton />
                  </div>
                  <div className="w-[424px] lg:w-[308px] xl:w-[344px] 2xl:w-[424px] border-l border-[#1f261e] shrink-0">
                    <OrderbookSkeleton />
                  </div>
                </div>
                <div className="flex-1">
                  <OrdersTableSkeleton />
                </div>
              </>
            )}
          </main>

          {/* RIGHT SECTION - Trading Form (380px base, scaled for smaller screens) */}
          <aside className="w-[380px] lg:w-[276px] xl:w-[310px] 2xl:w-[380px] flex flex-col shrink-0">
            {isLoading ? (
              <div className="bg-[#121712] border-b border-[#1f261e] flex flex-col gap-4 pb-10 pt-0">
                {/* Spot/Perp Tabs Skeleton */}
                <div className="flex gap-4 items-start px-6 pt-5 border-b border-[#252e24]">
                  <div className="h-6 w-12 bg-[#121712] rounded animate-pulse"></div>
                  <div className="h-6 w-12 bg-[#121712] rounded animate-pulse"></div>
                </div>
                {/* Trading Form Skeleton */}
                <div className="px-6">
                  <TradingFormSkeleton />
                </div>
              </div>
            ) : (
              <div className="bg-[#121712] border-b border-[#1f261e] flex flex-col gap-4 pb-10 pt-0">
                {/* Spot/Perp Tabs */}
                <div className="flex gap-4 lg:gap-3 xl:gap-3.5 2xl:gap-4 items-start px-6 lg:px-4 xl:px-5 2xl:px-6 pt-5 lg:pt-4 xl:pt-4.5 2xl:pt-5 border-b border-[#252e24]">
                  <button
                    onClick={() => setActiveMarketTab("Spot")}
                    className="flex flex-col gap-4 lg:gap-3 xl:gap-3.5 2xl:gap-4 items-center cursor-pointer"
                  >
                    <span className={`text-lg lg:text-sm xl:text-base 2xl:text-lg font-semibold leading-normal text-center whitespace-nowrap ${activeMarketTab === "Spot" ? "text-[#b1f128]" : "text-[#b5b5b5]"
                      }`}>
                      Spot
                    </span>
                    {activeMarketTab === "Spot" && (
                      <div className="h-0 w-full border-t border-[#b1f128]"></div>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveMarketTab("Perp")}
                    className="flex flex-col gap-4 lg:gap-3 xl:gap-3.5 2xl:gap-4 items-center cursor-pointer"
                  >
                    <span className={`text-lg lg:text-sm xl:text-base 2xl:text-lg font-medium leading-normal text-center whitespace-nowrap ${activeMarketTab === "Perp" ? "text-[#b1f128]" : "text-[#b5b5b5]"
                      }`}>
                      Perp
                    </span>
                    {activeMarketTab === "Perp" && (
                      <div className="h-0 w-full border-t border-[#b1f128]"></div>
                    )}
                  </button>
                </div>

                {/* Trading Form */}
                <div className="px-6 lg:px-4 xl:px-5 2xl:px-6">
                  <TradingForm marketType={activeMarketTab.toLowerCase() as "spot" | "perp"} />
                </div>
              </div>
            )}

            {/* Stake Card */}
            {!isLoading && (
              <div className="px-6 lg:px-4 xl:px-5 2xl:px-6 pt-6 lg:pt-4 xl:pt-5 2xl:pt-6 border-b pb-6 border-[#1F261E]">
                <Image
                  src="/assets/icons/home/claim-reward.svg"
                  alt="Stake to earn $TWC"
                  width={310}
                  height={96}
                  className="w-full h-auto object-contain"
                  priority
                />
              </div>
            )}
          </aside>
        </div>

        {/* Mobile Layout - Product Design Approach */}
        <div className="lg:hidden">
          {!isLoading && tokenData && tokenStats ? (
            <MobileTradingLayout
              tokenData={tokenData}
              tokenStats={tokenStats}
              activeMarketTab={activeMarketTab}
              setActiveMarketTab={setActiveMarketTab}
            />
          ) : (
            <div className="flex flex-col min-h-screen bg-[#010501]">
              <TokenHeaderSkeleton />
              <ChartSkeleton />
              <div className="p-4">
                <OrderbookSkeleton />
              </div>
              <div className="sticky bottom-0 bg-[#010501] border-t border-[#1f261e] p-4">
                <div className="bg-[#121712] rounded-xl p-4">
                  <TradingFormSkeleton />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

