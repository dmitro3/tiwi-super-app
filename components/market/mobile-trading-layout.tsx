"use client";

import { useState } from "react";
import TokenHeader from "./token-header";
import TradingForm from "./trading-form";
import ChartSectionMobile from "./chart-section-mobile";
import OrderbookSection from "./orderbook-section";
import OrdersTable from "./orders-table";

interface MobileTradingLayoutProps {
  tokenData: any;
  tokenStats: any;
  activeMarketTab: "Spot" | "Perp";
  setActiveMarketTab: (tab: "Spot" | "Perp") => void;
}

type MobileView = "chart" | "orderbook" | "orders";

/**
 * Mobile Trading Layout Component
 * 
 * Product Design Approach:
 * - Chart is primary view (traders need to see price action)
 * - Trading form is always accessible at bottom (most important action)
 * - Orderbook and Orders are secondary views accessible via tabs
 * - Sticky header for quick access to token info
 * - Bottom sheet pattern for trading form (doesn't block chart)
 */
export default function MobileTradingLayout({
  tokenData,
  tokenStats,
  activeMarketTab,
  setActiveMarketTab,
}: MobileTradingLayoutProps) {
  const [activeView, setActiveView] = useState<MobileView>("chart");

  return (
    <div className="lg:hidden flex flex-col min-h-screen bg-[#010501]">
      {/* Sticky Token Header */}
      <div className="sticky top-0 z-30 bg-[#010501] border-b border-[#1f261e]">
        <TokenHeader token={tokenData} stats={tokenStats} />
      </div>

      {/* View Tabs */}
      <div className="sticky top-[64px] z-20 bg-[#010501] border-b border-[#1f261e]">
        <div className="flex">
          <button
            onClick={() => setActiveView("chart")}
            className={`flex-1 py-3 px-4 text-sm font-semibold transition-colors ${
              activeView === "chart"
                ? "text-[#b1f128] border-b-2 border-[#b1f128]"
                : "text-[#b5b5b5]"
            }`}
          >
            Chart
          </button>
          <button
            onClick={() => setActiveView("orderbook")}
            className={`flex-1 py-3 px-4 text-sm font-semibold transition-colors ${
              activeView === "orderbook"
                ? "text-[#b1f128] border-b-2 border-[#b1f128]"
                : "text-[#b5b5b5]"
            }`}
          >
            Order Book
          </button>
          <button
            onClick={() => setActiveView("orders")}
            className={`flex-1 py-3 px-4 text-sm font-semibold transition-colors ${
              activeView === "orders"
                ? "text-[#b1f128] border-b-2 border-[#b1f128]"
                : "text-[#b5b5b5]"
            }`}
          >
            Orders
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto pb-[280px] min-h-0">
        {activeView === "chart" && (
          <div className="h-[400px] min-h-[400px]">
            <ChartSectionMobile pair={tokenData.pair} />
          </div>
        )}
        {activeView === "orderbook" && (
          <div className="p-0">
            <OrderbookSection
              baseSymbol={tokenData?.symbol}
              quoteSymbol={tokenData?.quoteSymbol || 'USDT'}
              currentPrice={tokenData?.currentPrice || 0}
              marketType={activeMarketTab.toLowerCase() as "spot" | "perp"}
            />
          </div>
        )}
        {activeView === "orders" && (
          <div className="p-4">
            <OrdersTable
              baseSymbol={tokenData?.symbol}
              quoteSymbol={tokenData?.quoteSymbol || 'USDT'}
            />
          </div>
        )}
      </div>

      {/* Sticky Trading Form - Bottom Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-[#010501] border-t border-[#1f261e] shadow-[0_-4px_24px_rgba(0,0,0,0.3)]">
        <div className="bg-[#121712] rounded-t-2xl p-4 max-h-[280px] overflow-y-auto">
          {/* Spot/Perp Tabs */}
          <div className="flex gap-4 mb-4 pb-4 border-b border-[#1f261e]">
            <button
              onClick={() => setActiveMarketTab("Spot")}
              className={`text-sm font-semibold transition-colors ${
                activeMarketTab === "Spot" ? "text-[#b1f128]" : "text-[#b5b5b5]"
              }`}
            >
              Spot
            </button>
            <button
              onClick={() => setActiveMarketTab("Perp")}
              className={`text-sm font-semibold transition-colors ${
                activeMarketTab === "Perp" ? "text-[#b1f128]" : "text-[#b5b5b5]"
              }`}
            >
              Perp
            </button>
          </div>
          <TradingForm
            marketType={activeMarketTab.toLowerCase() as "spot" | "perp"}
            baseSymbol={tokenData?.symbol || ''}
            quoteSymbol={tokenData?.quoteSymbol || 'USDT'}
            currentPrice={tokenData?.currentPrice || 0}
          />
        </div>
      </div>
    </div>
  );
}

