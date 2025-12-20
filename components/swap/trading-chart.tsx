"use client";

import Image from "next/image";

interface TradingChartProps {
  pair?: string;
  timeframe?: string;
  exchange?: string;
  priceData?: string;
  className?: string;
}

export default function TradingChart({
  pair = "BTCUSDT Spot - 1D Bybit",
  timeframe = "1D",
  exchange = "Bybit",
  priceData = "O90,486.0 H91,955.5 L90,090.6 C91,552.5 +1,066.5 (+1.18%)",
  className = "",
}: TradingChartProps) {
  return (
    <div className={`bg-[#010501] border border-[#1f261e] rounded-xl lg:rounded-2xl overflow-hidden backdrop-blur-sm ${className}`}>
      <div className="p-3 sm:p-3.5 md:p-4 border-b border-[#1f261e]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-semibold text-sm sm:text-base">
              {pair}
            </h3>
            <p className="text-[#b5b5b5] text-xs sm:text-sm mt-0.5 sm:mt-1">
              {priceData}
            </p>
          </div>
        </div>
      </div>
      {/* Chart */}
      <div className="h-[320px] lg:h-[400px] xl:h-[450px] 2xl:h-[500px] bg-[#0b0f0a] flex items-center justify-center overflow-hidden">
        <Image
          src="/assets/images/tradingview.svg"
          alt="Trading Chart"
          width={1200}
          height={600}
          className="w-full h-full object-contain"
          priority
        />
      </div>
    </div>
  );
}

