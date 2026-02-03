"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { TradingViewChart } from "@/components/charts/tradingview-chart";
import { fetchTokens } from "@/lib/frontend/api/tokens";
import type { Token } from "@/lib/frontend/types/tokens";
import OverviewSection from "./overview-section";
import { ResolutionString } from "@/public/charts/charting_library/datafeed-api";

interface ChartSectionProps {
  pair: string; // e.g., "BTC/USDT" or "WBNB/USDT"
  tokenData?: any; // Enriched token data from API
}

// Common USDT addresses by chainId
function getUsdtAddress(chainId: number): string {
  const usdtAddresses: Record<number, string> = {
    1: '0xdAC17F958D2ee523a2206206994597C13D831ec7', // Ethereum
    56: '0x55d398326f99059fF775485246999027B3197955', // BSC
    137: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', // Polygon
    42161: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', // Arbitrum
    10: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', // Optimism
    8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base (USDC)
    43114: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7', // Avalanche
  };
  return usdtAddresses[chainId] || usdtAddresses[56]; // Default to BSC USDT
}

type ChartTab = "Chart" | "Overview";
type TimePeriod = "15m" | "1h" | "4h" | "6h" | "1D" | "3D" | "More";

/**
 * Chart Section Component
 * Displays trading chart with TradingView Advanced Charts (using our custom datafeed)
 */
export default function ChartSection({ pair, tokenData }: ChartSectionProps) {
  const [activeTab, setActiveTab] = useState<ChartTab>("Chart");
  const [activeTimePeriod, setActiveTimePeriod] = useState<TimePeriod>("1D");
  const [baseToken, setBaseToken] = useState<Token | null>(null);
  const [quoteToken, setQuoteToken] = useState<Token | null>(null);
  const [isLoadingTokens, setIsLoadingTokens] = useState(true);
  const [chartError, setChartError] = useState<Error | null>(null);

  // Parse pair to get base and quote symbols
  const { baseSymbol, quoteSymbol } = useMemo(() => {
    const normalized = pair.replace("/", "-").replace("_", "-").toUpperCase();
    const parts = normalized.split("-");
    if (parts.length >= 2) {
      return {
        baseSymbol: parts[0], // e.g., "WBNB", "BTC"
        quoteSymbol: parts[1], // e.g., "USDT", "BNB"
      };
    }
    return { baseSymbol: "", quoteSymbol: "" };
  }, [pair]);

  // Fetch token data by symbols
  // If tokenData is provided (from page), use it directly
  useEffect(() => {
    if (!baseSymbol || !quoteSymbol) {
      setIsLoadingTokens(false);
      return;
    }

    // If we have token addresses from the page's API call, use them directly
    // This ensures we get the correct tokens on the correct chain
    if (tokenData?.address && tokenData?.chainId) {
      console.log('[ChartSection] Using tokenData from page:', tokenData.symbol, tokenData.chainId);

      // Create Token objects from tokenData
      const baseTokenFromData: Token = {
        address: tokenData.address,
        symbol: tokenData.symbol,
        name: tokenData.name || tokenData.symbol,
        chainId: tokenData.chainId,
        logoURI: tokenData.icon || '',
        decimals: 18, // Default, will be overridden by chart if needed
      };

      // For quote token, fetch by symbol but filter by the same chainId
      setIsLoadingTokens(true);
      fetchTokens({ query: quoteSymbol, chains: [tokenData.chainId], limit: 5 })
        .then((quoteResults) => {
          const quote = quoteResults.find(
            (t) => t.symbol.toUpperCase() === quoteSymbol.toUpperCase()
          );

          if (quote) {
            setBaseToken(baseTokenFromData);
            setQuoteToken(quote);
            setChartError(null);
          } else {
            // Fallback: create a USDT token for the same chain
            console.warn('[ChartSection] Quote token not found, using fallback');
            const fallbackQuote: Token = {
              address: getUsdtAddress(tokenData.chainId),
              symbol: 'USDT',
              name: 'Tether USD',
              chainId: tokenData.chainId,
              logoURI: '',
              decimals: 18,
            };
            setBaseToken(baseTokenFromData);
            setQuoteToken(fallbackQuote);
            setChartError(null);
          }
        })
        .catch((error) => {
          console.error('[ChartSection] Error fetching quote token:', error);
          setChartError(error instanceof Error ? error : new Error('Failed to load quote token'));
        })
        .finally(() => {
          setIsLoadingTokens(false);
        });
      return;
    }

    // Fallback: search for both tokens (may get wrong chain)
    setIsLoadingTokens(true);

    // Fetch both tokens in parallel
    Promise.all([
      fetchTokens({ query: baseSymbol, limit: 5 }),
      fetchTokens({ query: quoteSymbol, limit: 5 }),
    ])
      .then(([baseResults, quoteResults]) => {
        // Find exact symbol match (case-insensitive)
        // Prefer BSC (chainId 56) for common pairs
        const base = baseResults.find(
          (t) => t.symbol.toUpperCase() === baseSymbol.toUpperCase() && t.chainId === 56
        ) || baseResults.find(
          (t) => t.symbol.toUpperCase() === baseSymbol.toUpperCase()
        );
        const quote = quoteResults.find(
          (t) => t.symbol.toUpperCase() === quoteSymbol.toUpperCase() && t.chainId === 56
        ) || quoteResults.find(
          (t) => t.symbol.toUpperCase() === quoteSymbol.toUpperCase()
        );

        if (base && quote) {
          setBaseToken(base);
          setQuoteToken(quote);
          setChartError(null);
        } else {
          console.warn(`[ChartSection] Could not find tokens: ${baseSymbol}/${quoteSymbol}`);
          setChartError(new Error(`Tokens not found: ${baseSymbol}/${quoteSymbol}`));
        }
      })
      .catch((error) => {
        console.error("[ChartSection] Error fetching tokens:", error);
        setChartError(error instanceof Error ? error : new Error("Failed to load tokens"));
      })
      .finally(() => {
        setIsLoadingTokens(false);
      });
  }, [baseSymbol, quoteSymbol, tokenData]);

  // Map time period to resolution
  const resolution = useMemo<ResolutionString>(() => {
    switch (activeTimePeriod) {
      case "15m":
        return "15";
      case "1h":
        return "60";
      case "4h":
        return "240";
      case "6h":
        return "360";
      case "1D":
        return "1D";
      case "3D":
        return "3D";
      default:
        return "1D";
    }
  }, [activeTimePeriod]);

  const timePeriods: TimePeriod[] = ["15m", "1h", "4h", "6h", "1D", "3D", "More"];

  return (
    <div className="flex flex-col h-[599px] lg:h-[435px] xl:h-[490px] 2xl:h-[599px] lg:min-h-[435px] xl:min-h-[490px] 2xl:min-h-[599px]">
      {/* Tabs and Time Period Selector - Allow overflow and scroll */}
      <div className="border-b-[0.5px] border-[#1f261e] flex  items-center justify-between px-10 lg:px-7 xl:px-8 2xl:px-10 2xl:pt-4 overflow-x-auto scrollbar-hide">
        {/* Chart/Overview Tabs */}
        <div className="flex gap-6 lg:gap-4 xl:gap-5 2xl:gap-6 items-start shrink-0">
          <button
            onClick={() => setActiveTab("Chart")}
            className="flex flex-col gap-2 lg:gap-1.5 xl:gap-1.5 2xl:gap-2 items-center cursor-pointer shrink-0"
          >
            <span className={`text-lg lg:text-sm xl:text-base 2xl:text-lg font-semibold leading-normal text-center whitespace-nowrap ${
              activeTab === "Chart" ? "text-[#b1f128]" : "text-[#b5b5b5]"
            }`}>
              Chart
            </span>
            {activeTab === "Chart" && (
              <div className="h-0 w-full border-t border-[#b1f128]"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab("Overview")}
            className="flex flex-col gap-2 lg:gap-1.5 xl:gap-1.5 2xl:gap-2 items-center cursor-pointer shrink-0"
          >
            <span className={`text-lg lg:text-sm xl:text-base 2xl:text-lg font-medium leading-normal whitespace-nowrap ${
              activeTab === "Overview" ? "text-[#b1f128]" : "text-[#b5b5b5]"
            }`}>
              Overview
            </span>
            {activeTab === "Overview" && (
              <div className="h-0 w-full border-t border-[#b1f128]"></div>
            )}
          </button>
        </div>

        {/* Time Period Selector - Allow overflow and scroll */}
        <div className="flex gap-6 lg:gap-4 xl:gap-5 2xl:gap-6 items-center rounded-lg lg:rounded-md xl:rounded-md 2xl:rounded-lg shrink-0">
          {timePeriods.map((period) => (
            <button
              key={period}
              onClick={() => period !== "More" && setActiveTimePeriod(period)}
              className={`flex flex-col items-start justify-center px-0 py-2 lg:py-1.5 xl:py-1.5 2xl:py-2 rounded-lg lg:rounded-md xl:rounded-md 2xl:rounded-lg cursor-pointer shrink-0 ${
                activeTimePeriod === period && period !== "More"
                  ? "text-[#b1f128] font-semibold"
                  : "text-[#b5b5b5] font-medium"
              }`}
            >
              <span className="text-base lg:text-xs xl:text-sm 2xl:text-base leading-4 whitespace-nowrap items-center flex">
                {period}
                {period === "More" && (
                  <span className="ml-0.5 xl:ml-0.5 2xl:ml-0.5 inline-block size-4">
                    <Image
                        src="/assets/icons/arrow-down-01.svg"
                        alt="Dropdown"
                        width={12}
                        height={12}
                        className="w-full h-full object-contain"
                      />
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Chart Container */}
      <div className="flex-1 min-h-0 relative border-b border-[#1f261e] mt-2 lg:mt-1.5 xl:mt-1.5 2xl:mt-2">
        {activeTab === "Chart" ? (
          <>
            {isLoadingTokens ? (
              <div className="absolute inset-0 flex items-center justify-center bg-[#0b0f0a] z-10">
                <div className="flex flex-col gap-4 items-center">
                  <div className="w-12 h-12 border-4 border-[#1f261e] border-t-[#b1f128] rounded-full animate-spin"></div>
                  <div className="text-[#7c7c7c] text-sm font-medium">Loading tokens...</div>
                </div>
              </div>
            ) : chartError ? (
              <div className="absolute inset-0 flex items-center justify-center bg-[#0b0f0a] z-10">
                <div className="text-center px-4">
                  <p className="text-[#b5b5b5] text-sm mb-2">Chart unavailable</p>
                  <p className="text-[#7c7c7c] text-xs">{chartError.message}</p>
                </div>
              </div>
            ) : baseToken && quoteToken ? (
              <TradingViewChart
                baseToken={baseToken.address}
                quoteToken={quoteToken.address}
                chainId={baseToken.chainId === quoteToken.chainId ? baseToken.chainId : undefined}
                baseChainId={baseToken.chainId}
                quoteChainId={quoteToken.chainId}
                height="100%"
                theme="dark"
                interval={resolution}
                onError={(error) => {
                  console.error("[ChartSection] Chart error:", error);
                  setChartError(error);
                }}
                onReady={() => {
                  setChartError(null);
                }}
                className="w-full h-full"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-[#0b0f0a] z-10">
                <div className="text-center px-4">
                  <p className="text-[#b5b5b5] text-sm">Unable to load chart data</p>
                  <p className="text-[#7c7c7c] text-xs">Please check the pair format: {pair}</p>
                </div>
              </div>
            )}
          </>
        ) : (
          <OverviewSection pair={pair} tokenData={tokenData} />
        )}
      </div>
    </div>
  );
}

