"use client";

import { useState, useEffect, useRef } from "react";
import Script from "next/script";
import Image from "next/image";
import OverviewSection from "./overview-section";

interface ChartSectionProps {
  pair: string; // e.g., "BTC/USDT"
}

type ChartTab = "Chart" | "Overview";
type TimePeriod = "15m" | "1h" | "4h" | "6h" | "1D" | "3D" | "More";

/**
 * Chart Section Component
 * Displays trading chart with TradingView widget integration
 */
export default function ChartSection({ pair }: ChartSectionProps) {
  const [activeTab, setActiveTab] = useState<ChartTab>("Chart");
  const [activeTimePeriod, setActiveTimePeriod] = useState<TimePeriod>("1D");
  const [tradingViewLoaded, setTradingViewLoaded] = useState(false);
  const [chartRendered, setChartRendered] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);

  // TradingView widget configuration - only create once, update interval when needed
  useEffect(() => {
    if (tradingViewLoaded && chartContainerRef.current && activeTab === "Chart" && (window as any).TradingView) {
      // If widget already exists, just update the interval
      if (widgetRef.current && chartRendered) {
        try {
          widgetRef.current.setInterval(
            activeTimePeriod === "1D" ? "D" : activeTimePeriod === "15m" ? "15" : activeTimePeriod === "1h" ? "60" : activeTimePeriod === "4h" ? "240" : activeTimePeriod === "6h" ? "360" : "D"
          );
        } catch (error) {
          console.error("Error updating TradingView interval:", error);
        }
        return;
      }

      // Clear previous widget only if not rendered yet
      if (!chartRendered && chartContainerRef.current) {
        chartContainerRef.current.innerHTML = "";
      }

      // Create TradingView widget only once
      if (!widgetRef.current) {
        try {
          const widget = new (window as any).TradingView.widget({
            autosize: true,
            symbol: pair.replace("/", ""), // Convert "BTC/USDT" to "BTCUSDT"
            interval: activeTimePeriod === "1D" ? "D" : activeTimePeriod === "15m" ? "15" : activeTimePeriod === "1h" ? "60" : activeTimePeriod === "4h" ? "240" : activeTimePeriod === "6h" ? "360" : "D",
            timezone: "Etc/UTC",
            theme: "dark",
            style: "1",
            locale: "en",
            toolbar_bg: "#010501",
            enable_publishing: false,
            hide_top_toolbar: false,
            hide_legend: false,
            save_image: false,
            container_id: "tradingview-chart",
            backgroundColor: "#010501",
            gridColor: "#1f261e",
            onready: () => {
              setChartRendered(true);
            },
          });
          widgetRef.current = widget;

          // Fallback timeout: Hide loader after 600ms even if onready doesn't fire
          const timeoutId = setTimeout(() => {
            setChartRendered(true);
          }, 6000);

          // Also check if chart has rendered by checking container content
          const checkInterval = setInterval(() => {
            if (chartContainerRef.current && chartContainerRef.current.children.length > 0) {
              setChartRendered(true);
              clearInterval(checkInterval);
              clearTimeout(timeoutId);
            }
          }, 100);

          // Clean up interval after 2 seconds max
          setTimeout(() => {
            clearInterval(checkInterval);
          }, 2000);

          return () => {
            clearTimeout(timeoutId);
            clearInterval(checkInterval);
          };
        } catch (error) {
          console.error("Error loading TradingView widget:", error);
          // If widget creation fails, still hide loader after timeout
          setTimeout(() => {
            setChartRendered(true);
          }, 600);
        }
      }

      return () => {
        // Don't cleanup on tab switch - keep widget alive
      };
    }
  }, [tradingViewLoaded, pair, activeTab, activeTimePeriod, chartRendered]);

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
            {/* TradingView Script */}
            <Script
              src="https://s3.tradingview.com/tv.js"
              strategy="lazyOnload"
              onLoad={() => setTradingViewLoaded(true)}
            />
            
            {/* Chart Container */}
            <div
              id="tradingview-chart"
              ref={chartContainerRef}
              className="w-full h-full bg-[#0b0f0a]"
            />
            
            {/* Loading Skeleton - Shows until chart is rendered (non-blocking) */}
            {!chartRendered && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#0b0f0a] z-10 pointer-events-none">
                <div className="flex flex-col gap-4 items-center">
                  <div className="w-12 h-12 border-4 border-[#1f261e] border-t-[#b1f128] rounded-full animate-spin"></div>
                  <div className="text-[#7c7c7c] text-sm font-medium">Loading chart...</div>
                </div>
              </div>
            )}
          </>
        ) : (
          <OverviewSection pair={pair} />
        )}
      </div>
    </div>
  );
}

