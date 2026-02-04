"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { getCryptoMetadata } from "@/lib/backend/data/crypto-metadata";
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

  // Fallback: populate token data from URL pair when API fails
  const setFallbackFromPair = (normalized: string, parts: string[]) => {
    const [baseSymbol, quoteSymbol] = parts;
    setTokenData({
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
    });
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
    if (val >= 1) return `$${val.toFixed(2)}`;
    if (val >= 0.0001) return `$${val.toFixed(6)}`;
    return `$${val.toFixed(8)}`;
  };

  // Fetch real token data directly from Binance (client-side)
  useEffect(() => {
    setIsLoading(true);

    const fetchMarketData = async () => {
      try {
        const normalized = pair.replace("/", "-").replace("_", "-").toUpperCase();
        const parts = normalized.split("-");

        if (parts.length < 2) {
          console.error('[MarketPage] Invalid pair format:', pair);
          setIsLoading(false);
          return;
        }

        const [baseSymbol, quoteSymbol] = parts;

        // Fetch directly from Binance in the browser (try multiple endpoints)
        if (quoteSymbol === 'USDT') {
          try {
            const binanceSymbol = `${baseSymbol}${quoteSymbol}`;
            const spotEndpoints = [
              'https://api.binance.com',
              'https://api1.binance.com',
              'https://api2.binance.com',
              'https://api3.binance.com',
              'https://api4.binance.com',
              'https://data-api.binance.vision',
            ];
            let response: Response | null = null;
            for (const base of spotEndpoints) {
              try {
                response = await fetch(`${base}/api/v3/ticker/24hr?symbol=${binanceSymbol}`, {
                  signal: AbortSignal.timeout(10000),
                });
                if (response.ok) break;
                response = null;
              } catch {
                response = null;
              }
            }

            if (response && response.ok) {
              const ticker = await response.json();
              const meta = getCryptoMetadata(baseSymbol);

              const lastPrice = parseFloat(ticker.lastPrice);
              const priceChange = parseFloat(ticker.priceChangePercent);
              const highPrice = parseFloat(ticker.highPrice);
              const lowPrice = parseFloat(ticker.lowPrice);
              const vol = parseFloat(ticker.quoteVolume);

              setTokenData({
                symbol: baseSymbol,
                pair: `${baseSymbol}/${quoteSymbol}`,
                icon: meta.logo,
                name: meta.name,
                address: '',
                chainId: 0,
                quoteSymbol,
                quoteIcon: '',
                marketCap: null,
                liquidity: null,
                circulatingSupply: null,
                currentPrice: lastPrice,
                volume24h: vol,
                description: meta.description || null,
              });

              setTokenStats({
                price: formatStatPrice(lastPrice),
                change: `${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)}%`,
                changePositive: priceChange >= 0,
                vol24h: formatVol(vol),
                high24h: formatStatPrice(highPrice),
                low24h: formatStatPrice(lowPrice),
              });

              setIsLoading(false);
              return;
            }
          } catch (binanceErr) {
            console.warn('[MarketPage] Binance direct fetch failed, trying API:', binanceErr);
          }
        }

        // Fallback: try our API route (for non-Binance pairs or if Binance fetch fails)
        try {
          const response = await fetch(`/api/v1/market/${pair}/price`);
          if (response.ok) {
            const priceData = await response.json();

            setTokenData({
              symbol: priceData.baseToken.symbol,
              pair: priceData.pair,
              icon: priceData.baseToken.logo || '',
              name: priceData.baseToken.name || priceData.baseToken.symbol,
              address: priceData.baseToken.address || '',
              chainId: priceData.baseToken.chainId,
              quoteSymbol: priceData.quoteToken.symbol,
              quoteIcon: priceData.quoteToken.logo || '',
              marketCap: priceData.baseToken.marketCap,
              liquidity: priceData.baseToken.liquidity,
              circulatingSupply: priceData.baseToken.circulatingSupply,
              currentPrice: priceData.priceUSD || priceData.price,
              volume24h: priceData.volume24h || null,
              description: priceData.description || null,
            });

            const pairPrice = priceData.priceUSD || priceData.price || 0;
            const priceChange = priceData.priceChange24h || 0;
            const vol24h = priceData.volume24h || 0;
            const high = priceData.high24h || 0;
            const low = priceData.low24h || 0;

            setTokenStats({
              price: formatStatPrice(pairPrice),
              change: `${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)}%`,
              changePositive: priceChange >= 0,
              vol24h: formatVol(vol24h),
              high24h: formatStatPrice(high),
              low24h: formatStatPrice(low),
            });
          } else {
            setFallbackFromPair(normalized, parts);
          }
        } catch {
          setFallbackFromPair(normalized, parts);
        }
      } catch (error) {
        console.error('[MarketPage] Error fetching market data:', error);
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

