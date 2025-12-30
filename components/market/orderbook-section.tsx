"use client";

import { useState } from "react";
import Image from "next/image";
import { MOCK_ASKS, MOCK_BIDS } from "@/lib/market/trading-mock-data";

type OrderbookTab = "Order Book" | "Trades";

/**
 * Orderbook Section Component
 * Displays order book with depth visualization and recent trades
 * Ready for real-time updates via WebSocket
 */
export default function OrderbookSection() {
  const [activeTab, setActiveTab] = useState<OrderbookTab>("Order Book");
  const [depthLevel, setDepthLevel] = useState(1);

  // Current market price (would come from API)
  const currentPrice = "89,000.02";

  // Calculate depth visualization heights (mock data - would be calculated from orderbook)
  const getDepthHeight = (index: number, side: "ask" | "bid") => {
    // Mock calculation - in real implementation, this would be based on orderbook depth
    const heights = side === "ask" 
      ? [49, 49, 183, 97, 37, 70, 97, 49]
      : [41, 63, 123, 226, 364, 70, 97, 161];
    return heights[index] || 50;
  };

  return (
    <div className="bg-[#0b0f0a] border-b border-l border-r-0 border-[#1f261e] border-t-0 flex flex-col h-[599px] lg:h-[435px] xl:h-[490px] 2xl:h-[599px] lg:min-h-[435px] xl:min-h-[490px] 2xl:min-h-[599px] max-lg:h-auto max-lg:min-h-[500px]">
      {/* Tabs */}
      <div className="border-b border-[#1f261e] flex items-start pb-0 pt-4 lg:pt-3 xl:pt-3.5 2xl:pt-4 px-6 lg:px-4 xl:px-5 2xl:px-6">
        <div className="flex gap-6 lg:gap-4 xl:gap-5 2xl:gap-6 items-start">
          <button
            onClick={() => setActiveTab("Order Book")}
            className="flex flex-col gap-2 lg:gap-1.5 xl:gap-1.5 2xl:gap-2 items-center cursor-pointer"
          >
            <span className={`text-base lg:text-xs xl:text-sm 2xl:text-base font-medium leading-normal text-center whitespace-nowrap ${
              activeTab === "Order Book" ? "text-white" : "text-[#b5b5b5]"
            }`}>
              Order Book
            </span>
            {activeTab === "Order Book" && (
              <div className="h-0 w-full border-t border-[#b1f128]"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab("Trades")}
            className="flex flex-col gap-2 lg:gap-1.5 xl:gap-1.5 2xl:gap-2 items-center cursor-pointer"
          >
            <span className={`text-base lg:text-xs xl:text-sm 2xl:text-base font-medium leading-normal whitespace-nowrap ${
              activeTab === "Trades" ? "text-white" : "text-[#b5b5b5]"
            }`}>
              Trades
            </span>
            {activeTab === "Trades" && (
              <div className="h-0 w-full border-t border-[#b1f128]"></div>
            )}
          </button>
        </div>
      </div>

      {activeTab === "Order Book" ? (
        <>
          {/* Controls */}
          <div className="flex items-center justify-between px-6 lg:px-4 xl:px-5 2xl:px-6 py-4 lg:py-3 xl:py-3.5 2xl:py-4">
            <div className="flex gap-2 items-center">
              <button className="w-6 h-6 cursor-pointer hover:opacity-80 transition-opacity">
              <span className="size-6">
                    <Image
                        src="/assets/icons/market/dashboard-square-01.svg"
                        alt="Dropdown"
                        width={24}
                        height={24}
                        className="w-full h-full object-contain"
                      />
                  </span>
              </button>
              <button className="w-6 h-6 cursor-pointer hover:opacity-80 transition-opacity">
              <span className="size-6">
                    <Image
                        src="/assets/icons/market/dashboard-square-02.svg"
                        alt="Dropdown"
                        width={24}
                        height={24}
                        className="w-full h-full object-contain"
                      />
                  </span>
              </button>
            </div>
            <div className="bg-[#1f261e] flex items-center justify-between px-4 lg:px-3 xl:px-3.5 2xl:px-4 py-1 rounded-lg w-[72px] lg:w-[52px] xl:w-[58px] 2xl:w-[72px]">
              <span className="text-[#b5b5b5] text-base lg:text-xs xl:text-sm 2xl:text-base font-medium tracking-[0.016px]">
                {depthLevel}
              </span>
              <Image
                src="/assets/icons/market/Vector.svg"
                alt="Depth selector"
                width={12}
                height={6}
                className="w-3 h-1.5 lg:w-2.5 lg:h-1.25 xl:w-2.5 xl:h-1.25 2xl:w-3 2xl:h-1.5"
              />
            </div>
          </div>

          {/* Column Headers */}
          <div className="flex items-center justify-between px-6 lg:px-4 xl:px-5 2xl:px-6 py-0">
            <span className="text-[#7c7c7c] text-[15px] lg:text-xs xl:text-sm 2xl:text-[15px] font-semibold whitespace-nowrap">
              Price(USDT)
            </span>
            <span className="text-[#7c7c7c] text-[15px] lg:text-xs xl:text-sm 2xl:text-[15px] font-semibold w-[71px] lg:w-[52px] xl:w-[58px] 2xl:w-[71px] whitespace-nowrap">
              Qty(BTC)
            </span>
            <div className="flex gap-0.5 items-center">
              <span className="text-[#7c7c7c] text-[15px] lg:text-xs xl:text-sm 2xl:text-[15px] font-semibold text-right whitespace-nowrap">
                Total(BTC)
              </span>
              <Image
                src="/assets/icons/arrow-down.svg"
                alt="Sort"
                width={12}
                height={6}
                className="w-3 h-1.5 lg:w-2.5 lg:h-1.25 xl:w-2.5 xl:h-1.25 2xl:w-3 2xl:h-1.5"
              />
            </div>
          </div>

          {/* Order Book Content - No overflow, fixed height to match design */}
          <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
            {/* Depth Visualization Container - Rotated 90deg */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[376px] xl:w-[340px] 2xl:w-[376px] h-[376px] xl:h-[340px] 2xl:h-[376px] pointer-events-none z-0">
              {/* Asks Depth - Rotated */}
              <div className="absolute top-0 left-0 w-full h-1/2 flex items-end rotate-90 origin-center">
                {MOCK_ASKS.map((_, index) => (
                  <div
                    key={`ask-depth-${index}`}
                    className="bg-[#2b0000] shrink-0"
                    style={{
                      width: `${376 / MOCK_ASKS.length}px`,
                      height: `${getDepthHeight(index, "ask")}px`,
                    }}
                  />
                ))}
              </div>
              {/* Bids Depth - Rotated */}
              <div className="absolute bottom-0 left-0 w-full h-1/2 flex items-end rotate-90 origin-center">
                {MOCK_BIDS.map((_, index) => (
                  <div
                    key={`bid-depth-${index}`}
                    className="bg-[#002e19] shrink-0"
                    style={{
                      width: `${376 / MOCK_BIDS.length}px`,
                      height: `${getDepthHeight(index, "bid")}px`,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Content Container - Scrollable if needed */}
            <div className="flex-1 flex flex-col overflow-y-auto min-h-0 orderbook-scrollbar relative z-10">
              {/* Sell Orders (Asks) */}
              <div className="flex flex-col gap-1.5 lg:gap-1 xl:gap-1 2xl:gap-1.5 items-start justify-center px-6 lg:px-4 xl:px-5 2xl:px-6 py-0">
                {MOCK_ASKS.map((ask, index) => (
                  <div
                    key={`ask-${index}`}
                    className="flex items-center justify-between w-full relative"
                  >
                    <span className="text-[#ff5c5c] text-[15px] lg:text-xs xl:text-sm 2xl:text-[15px] font-medium w-[87px] lg:w-[63px] xl:w-[71px] 2xl:w-[87px]">
                      {ask.price}
                    </span>
                    <span className="text-white text-[15px] lg:text-xs xl:text-sm 2xl:text-[15px] font-medium w-[71px] lg:w-[52px] xl:w-[58px] 2xl:w-[71px]">
                      {ask.quantity}
                    </span>
                    <span className="text-white text-[15px] lg:text-xs xl:text-sm 2xl:text-[15px] font-medium text-right w-[92px] lg:w-[67px] xl:w-[75px] 2xl:w-[92px]">
                      {ask.total}
                    </span>
                  </div>
                ))}
              </div>

              {/* Current Price */}
              <div className="flex items-center justify-between px-6 lg:px-4 xl:px-5 2xl:px-6 py-2 lg:py-1.5 xl:py-1.5 2xl:py-2 border-y border-[#1f261e] my-2 lg:my-1.5 xl:my-1.5 2xl:my-2">
                <span className="text-white text-xl lg:text-base xl:text-lg 2xl:text-xl font-bold whitespace-nowrap">
                  {currentPrice}
                </span>
                <Image
                  src="/assets/icons/arrow-down.svg"
                  alt="Toggle"
                  width={24}
                  height={24}
                  className="w-6 h-6 lg:w-5 lg:h-5 xl:w-5 xl:h-5 2xl:w-6 2xl:h-6 rotate-180"
                />
              </div>

              {/* Buy Orders (Bids) */}
              <div className="flex flex-col gap-1.5 lg:gap-1 xl:gap-1 2xl:gap-1.5 items-start justify-center px-6 lg:px-4 xl:px-5 2xl:px-6 py-0">
                {MOCK_BIDS.map((bid, index) => (
                  <div
                    key={`bid-${index}`}
                    className="flex items-center justify-between w-full relative"
                  >
                    <span className="text-[#3fea9b] text-[15px] lg:text-xs xl:text-sm 2xl:text-[15px] font-medium w-[87px] lg:w-[63px] xl:w-[71px] 2xl:w-[87px]">
                      {bid.price}
                    </span>
                    <span className="text-white text-[15px] lg:text-xs xl:text-sm 2xl:text-[15px] font-medium w-[71px] lg:w-[52px] xl:w-[58px] 2xl:w-[71px]">
                      {bid.quantity}
                    </span>
                    <span className="text-white text-[15px] lg:text-xs xl:text-sm 2xl:text-[15px] font-medium text-right w-[92px] lg:w-[67px] xl:w-[75px] 2xl:w-[92px]">
                      {bid.total}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-[#7c7c7c] text-sm">Trades view coming soon...</div>
        </div>
      )}
    </div>
  );
}

