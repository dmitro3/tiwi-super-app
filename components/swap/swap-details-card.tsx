"use client";

interface SwapDetailsCardProps {
  isExpanded: boolean;
  gasFee?: string;
  sourceLabel?: string;
  slippageTolerance?: string;
  tiwiFee?: string;
}

export default function SwapDetailsCard({
  isExpanded,
  gasFee = "0.001%",
  sourceLabel = "TWC",
  slippageTolerance = "2%",
  tiwiFee = "0.40%",
}: SwapDetailsCardProps) {
  return (
    <div
      className={`limit-collapse mt-3 sm:mt-0 ${
        isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
      }`}
    >
      <div className="bg-[#0b0f0a] border border-[#1f261e] rounded-2xl p-4 sm:p-6 w-full">
        <div className="space-y-3 sm:space-y-4">
          {/* Gas Fee */}
          <div className="flex items-center justify-between text-sm sm:text-base">
            <span className="text-[#b5b5b5]">Gas Fee</span>
            <span className="text-[#b1f128] font-medium">{gasFee}</span>
          </div>

          {/* Source */}
          <div className="flex items-end justify-between text-sm sm:text-base">
            <span className="text-[#b5b5b5]">Source</span>
            <div className="inline-flex text-[12px] leading-none">
              <span className="bg-[#156200] text-black px-3 py-1 rounded-l-[4px] font-medium">
                Best
              </span>
              <span className="border border-[#b1f128] text-[#b1f128] px-3 py-1 rounded-r-[4px] font-medium">
                {sourceLabel}
              </span>
            </div>
          </div>

          {/* Slippage Tolerance */}
          <div className="flex items-center justify-between text-sm sm:text-base">
            <span className="text-[#b5b5b5]">Slippage Tolerance</span>
            <span className="text-[#b1f128] font-medium">
              {slippageTolerance}
            </span>
          </div>

          {/* TIWI Fee */}
          <div className="flex items-center justify-between text-sm sm:text-base">
            <span className="text-[#b5b5b5]">TIWI Fee</span>
            <span className="text-[#b1f128] font-medium">{tiwiFee}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

