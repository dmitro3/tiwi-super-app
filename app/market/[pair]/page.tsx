"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import TokenHeader from "@/components/market/token-header";
import TradingForm from "@/components/market/trading-form";
import ChartSection from "@/components/market/chart-section";
import OrderbookSection from "@/components/market/orderbook-section";
import OrdersTable from "@/components/market/orders-table";
import MobileTradingLayout from "@/components/market/mobile-trading-layout";
import TokenHeaderSkeleton from "@/components/market/skeletons/token-header-skeleton";
import ChartSkeleton from "@/components/market/skeletons/chart-skeleton";
import OrderbookSkeleton from "@/components/market/skeletons/orderbook-skeleton";
import TradingFormSkeleton from "@/components/market/skeletons/trading-form-skeleton";
import OrdersTableSkeleton from "@/components/market/skeletons/orders-table-skeleton";
import Image from "next/image";
import { Lock } from "lucide-react";

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
import { useMarketStore } from "@/lib/frontend/store/market-store";

/**
 * Trading Page - Market Spot/Perp Active Trade with Chart
 */
export default function TradingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const pair = params.pair as string;
  const address = searchParams.get('address');
  const chainId = searchParams.get('chainId');
  const { setMarketDetail, getMarketDetail } = useMarketStore();

  const [activeMarketTab, setActiveMarketTab] = useState<"Spot" | "Perp">("Spot");
  const [tokenData, setTokenData] = useState<any>(null);
  const [tokenStats, setTokenStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fallback: populate token data from URL pair when API fails
  const setFallbackFromPair = (normalized: string, parts: string[]) => {
    const [baseSymbol, quoteSymbol] = parts;
    const fallback = {
      symbol: baseSymbol,
      pair: `${baseSymbol}/${quoteSymbol}`,
      icon: '',
      name: baseSymbol,
      address: '',
      chainId: 56,
      quoteSymbol,
      quoteIcon: '',
      marketCap: null,
      liquidity: null,
      circulatingSupply: null,
      currentPrice: 0,
      volume24h: null,
    };
    setTokenData(fallback);
    setTokenStats({
      price: '$--',
      change: '--',
      changePositive: true,
      vol24h: '$--',
      high24h: '$--',
      low24h: '$--',
    });
  };

  // Format a number to currency display
  const formatVol = (val: number) => {
    if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
    if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
    if (val > 0) return `$${val.toFixed(2)}`;
    return '$--';
  };

  const formatStatPrice = (val: number) => {
    if (val <= 0) return '$--';
    if (val >= 1) return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (val >= 0.0001) return `$${val.toFixed(6)}`;
    return `$${val.toFixed(8)}`;
  };

  // Fetch token data via server-side API
  useEffect(() => {
    setIsLoading(true);

    const fetchMarketData = async () => {
      try {
        const normalized = pair.replace("/", "-").replace("_", "-").toUpperCase();
        const pairToFetch = normalized.includes("-") ? normalized : `${normalized}-USD`;
        const parts = pairToFetch.split("-");
        const baseSymbol = parts[0];

        // Check cache first
        const cached = getMarketDetail(baseSymbol);
        if (cached) {
          // We still want fresh stats (price/vol), but can show metadata instantly
          setTokenData(cached);
        }

        // Build URL with enrichment clues
        let fetchUrl = `/api/v1/market/${pairToFetch}`;
        const queryParams = new URLSearchParams();
        if (address) queryParams.set('address', address);
        if (chainId) queryParams.set('chainId', chainId);
        if (queryParams.toString()) fetchUrl += `?${queryParams.toString()}`;

        const response = await fetch(fetchUrl);
        if (response.ok) {
          const json = await response.json();
          console.log("🚀 ~ fetchMarketData ~ response:", json)
          const priceData = json.data;

          const newTokenData = {
            symbol: priceData.symbol || priceData.baseToken?.symbol || baseSymbol,
            pair: priceData.pair,
            icon: priceData.metadata?.logo || priceData.baseToken?.logo || '',
            name: priceData.metadata?.name || priceData.baseToken?.name || baseSymbol,
            address: priceData.baseToken?.address || '',
            chainId: priceData.chainId || priceData.baseToken?.chainId,
            quoteSymbol: priceData.quoteToken?.symbol || parts[1] || 'USD',
            quoteIcon: priceData.quoteToken?.logo || '',
            marketCap: priceData.marketCap,
            fdv: priceData.fdv,
            liquidity: priceData.liquidity,
            circulatingSupply: priceData.circulatingSupply,
            totalSupply: priceData.totalSupply,
            currentPrice: priceData.price || priceData.priceUSD,
            volume24h: priceData.volume24h || null,
            description: priceData.metadata?.description || priceData.description || null,
            socials: priceData.metadata?.socials || priceData.baseToken?.socials || [],
            website: priceData.metadata?.website || priceData.baseToken?.website || null,
            websites: priceData.metadata?.websites || priceData.baseToken?.websites || [],
            decimals: priceData.decimals || priceData.baseToken?.decimals,
            baseToken: priceData.baseToken,
            quoteToken: priceData.quoteToken,
            marketType: priceData.marketType,
            provider: priceData.provider,
          };

          setTokenData(newTokenData);
          setMarketDetail(baseSymbol, newTokenData);

          const pairPrice = priceData.price || priceData.priceUSD || 0;
          const priceChange = priceData.priceChange24h || 0;
          const vol24h = priceData.volume24h || 0;
          const high = priceData.high24h || 0;
          const low = priceData.low24h || 0;

          setTokenStats({
            price: formatStatPrice(pairPrice),
            change: `${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)}%`,
            changePositive: priceChange >= 0,
            vol24h: formatVol(vol24h),
            high24h: high,
            low24h: low,
          });
        } else {
          setFallbackFromPair(normalized, parts);
        }
      } catch (error) {
        console.error('[TradingPage] Error fetching market data:', error);
        const normalized = pair.replace("/", "-").replace("_", "-").toUpperCase();
        const parts = normalized.split("-");
        if (parts.length >= 2) {
          setFallbackFromPair(normalized, parts);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchMarketData();
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
                    <ChartSection pair={tokenData.pair || ""} tokenData={tokenData} />
                  </div>

                  {/* Orderbook Section - Scaled proportionally */}
                  <div className="w-[424px] lg:w-[308px] xl:w-[344px] 2xl:w-[424px] border-l border-[#1f261e] shrink-0">
                    <OrderbookSection
                      baseSymbol={tokenData.symbol}
                      quoteSymbol={tokenData.quoteSymbol || 'USDT'}
                      currentPrice={tokenData.currentPrice || 0}
                      marketType={activeMarketTab.toLowerCase() as "spot" | "perp"}
                    />
                  </div>
                </div>

                {/* Orders/History Section */}
                <div className="flex-1">
                  <OrdersTable baseSymbol={tokenData.symbol} quoteSymbol={tokenData.quoteSymbol || 'USDT'} />
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
                    className="flex flex-col gap-4 lg:gap-3 xl:gap-3.5 2xl:gap-4 items-center cursor-pointer group"
                  >
                    <div className="flex items-center gap-1.5 px-1">
                      <span className={`text-lg lg:text-sm xl:text-base 2xl:text-lg font-medium leading-normal text-center whitespace-nowrap ${activeMarketTab === "Perp" ? "text-[#b1f128]" : "text-[#b5b5b5]"
                        }`}>
                        Perp
                      </span>
                      <div className="flex items-center bg-[#1f261e] px-1.5 py-0.5 rounded text-[10px] text-[#7c7c7c]">
                        <Lock size={10} className="mr-1" />
                        <span>Soon</span>
                      </div>
                    </div>
                    {activeMarketTab === "Perp" && (
                      <div className="h-0 w-full border-t border-[#b1f128]"></div>
                    )}
                  </button>
                  <button
                    className="flex flex-col gap-4 lg:gap-3 xl:gap-3.5 2xl:gap-4 items-center cursor-not-allowed group opacity-60"
                  >
                    <div className="flex items-center gap-1.5 px-1">
                      <span className="text-lg lg:text-sm xl:text-base 2xl:text-lg font-medium leading-normal text-center whitespace-nowrap text-[#b5b5b5]">
                        Cross
                      </span>
                      <div className="flex items-center bg-[#1f261e] px-1.5 py-0.5 rounded text-[10px] text-[#7c7c7c]">
                        <Lock size={10} className="mr-1" />
                        <span>Soon</span>
                      </div>
                    </div>
                  </button>
                </div>

                {/* Trading Form */}
                <div className="px-6 lg:px-4 xl:px-5 2xl:px-6">
                  <TradingForm
                    marketType={activeMarketTab.toLowerCase() as "spot" | "perp"}
                    baseSymbol={tokenData?.symbol || ''}
                    quoteSymbol={tokenData?.quoteSymbol || 'USDT'}
                    currentPrice={tokenData?.currentPrice || 0}
                  />
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

