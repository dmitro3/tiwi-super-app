"use client";

import RecommendedPools from "./recommended-pools";
import { Megaphone } from "lucide-react";

export default function EarnSidebar() {
  return (
    <div className="flex flex-col gap-4 items-center justify-center px-0 py-4 h-full">
      {/* Promotional Banner */}
      <div className="bg-[#121712] h-24 overflow-clip relative rounded-lg shrink-0 w-[310px]">
        <div className="absolute left-4 size-6 top-1/2 translate-y-[-50%]">
          <Megaphone className="size-6 text-white" />
        </div>
        <div className="absolute flex items-end left-14 top-1/2 translate-y-[-50%]">
          <div className="flex flex-col font-['Manrope',sans-serif] font-medium items-start leading-normal relative shrink-0 whitespace-pre-wrap">
            <p className="relative shrink-0 text-[#7c7c7c] text-xs w-full">
              Stake
            </p>
            <p className="relative shrink-0 text-base text-center text-white w-full">
              Maximize Your Yields
            </p>
          </div>
        </div>
      </div>

      {/* Recommended Pools */}
      <RecommendedPools />

      {/* Create Pool Button */}
      <button className="bg-[#081f02] flex items-center justify-center px-6 py-4 relative rounded-full shrink-0 w-[310px] cursor-pointer hover:opacity-90 transition-opacity">
        <p className="font-['Manrope',sans-serif] font-semibold leading-normal relative shrink-0 text-[#b1f128] text-lg tracking-[0.018px] w-[111px] whitespace-pre-wrap">
          Create Pool
        </p>
      </button>
    </div>
  );
}

