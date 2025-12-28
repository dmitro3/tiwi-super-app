"use client";

export default function StakingCardSkeleton() {
  return (
    <div className="bg-[#0b0f0a] h-18 overflow-clip relative rounded-2xl shrink-0 w-full">
      <div className="flex h-full items-center justify-between px-4 sm:px-6 py-4">
        {/* Left side - Token icon and label skeleton */}
        <div className="flex gap-2 items-center shrink-0">
          <div className="relative shrink-0 size-10">
            <div className="rounded-full w-full h-full bg-[#121712] animate-pulse"></div>
          </div>
          <div className="flex flex-col items-start justify-center relative shrink-0">
            <div className="h-5 bg-[#121712] rounded animate-pulse w-16"></div>
          </div>
        </div>

        {/* Center - APY skeleton */}
        <div className="flex-1 flex items-center justify-center">
          <div className="h-5 bg-[#121712] rounded animate-pulse w-20"></div>
        </div>

        {/* Right side - Dropdown arrow skeleton */}
        <div className="flex items-center justify-center shrink-0">
          <div className="relative size-6">
            <div className="rounded w-full h-full bg-[#121712] animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

