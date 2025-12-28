"use client";

import RecommendedPools from "./recommended-pools";
import { Megaphone } from "lucide-react";

export default function EarnSidebar() {
  return (
    <div className="flex flex-col gap-4 items-center justify-center px-0 py-4 h-full w-full">
      {/* Promotional Banner */}
      <div className="bg-[#121712] h-24 overflow-clip relative rounded-lg shrink-0 w-full">
        <div className="flex h-full items-center gap-2.5 px-4">
          <div className="relative shrink-0 size-6">
            <Megaphone className="size-6 text-white" />
          </div>
          <div className="flex flex-col font-['Manrope',sans-serif] font-medium items-start justify-center leading-normal relative shrink-0 whitespace-pre-wrap">
            <p className="relative shrink-0 text-[#7c7c7c] text-xs">
              Stake
            </p>
            <p className="relative shrink-0 text-base text-left text-white">
              Maximize Your Yields
            </p>
          </div>
        </div>
      </div>

      {/* Recommended Pools */}
      <RecommendedPools />

      {/* Create Pool Button */}
      <button className="bg-[#081f02] flex items-center justify-center px-6 py-4 relative rounded-full shrink-0 w-full cursor-pointer hover:opacity-90 transition-opacity">
        <p className="font-['Manrope',sans-serif] font-semibold leading-normal relative shrink-0 text-[#b1f128] text-lg tracking-[0.018px] whitespace-pre-wrap">
          Create Pool
        </p>
      </button>
    </div>
  );
}

