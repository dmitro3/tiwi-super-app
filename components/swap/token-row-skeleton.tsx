"use client";

/**
 * TokenRowSkeleton Component
 * 
 * Skeleton loader that matches the structure of TokenRow.
 * Used during initial loading to show a preview of the token list layout.
 */

export default function TokenRowSkeleton() {
  return (
    <div className="flex items-center justify-between px-4 sm:px-6 lg:px-[24px] py-3 sm:py-4 lg:py-[16px] w-full">
      {/* Left Side - Token Info Skeleton */}
      <div className="flex gap-2 sm:gap-[8px] items-center relative shrink-0 min-w-0 flex-1">
        {/* Token Logo Skeleton */}
        <div className="relative shrink-0 size-8 sm:size-10 lg:size-[40px]">
          <div className="rounded-full w-full h-full bg-[#121712] animate-pulse"></div>
          {/* Chain Logo Skeleton */}
          <div className="absolute -bottom-0.5 -right-0.5 size-4 sm:size-5">
            <div className="rounded-full w-full h-full bg-[#121712] border-2 border-[#0b0f0a] animate-pulse"></div>
          </div>
        </div>

        {/* Token Details Skeleton */}
        <div className="flex flex-col gap-1 sm:gap-[4px] items-start justify-center relative shrink-0 min-w-0 flex-1">
          {/* Token Name Skeleton */}
          <div className="h-5 sm:h-6 lg:h-[20px] bg-[#121712] rounded animate-pulse w-[120px] sm:w-[180px] lg:w-[200px]"></div>

          {/* Symbol and Address Skeleton */}
          <div className="flex gap-1.5 sm:gap-[8px] items-start leading-0 relative shrink-0 min-w-0">
            {/* Symbol Skeleton */}
            <div className="h-4 sm:h-5 lg:h-[20px] bg-[#121712] rounded animate-pulse w-[40px] sm:w-[50px]"></div>
            {/* Address Skeleton */}
            <div className="h-4 sm:h-5 lg:h-[20px] bg-[#121712] rounded animate-pulse w-[60px] sm:w-[80px] lg:w-[100px]"></div>
          </div>
        </div>
      </div>

      {/* Right Side - Balance and USD Value Skeleton */}
      <div className="flex flex-col gap-1 sm:gap-[4px] items-end justify-center leading-0 relative shrink-0 text-right min-w-0 ml-2">
        {/* Balance Skeleton */}
        <div className="h-5 sm:h-6 lg:h-[20px] bg-[#121712] rounded animate-pulse w-[60px] sm:w-[80px] lg:w-[100px]"></div>
        {/* USD Value Skeleton */}
        <div className="h-4 sm:h-5 lg:h-[16px] bg-[#121712] rounded animate-pulse w-[50px] sm:w-[70px] lg:w-[90px]"></div>
      </div>
    </div>
  );
}

