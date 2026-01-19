"use client";

import Skeleton from "@/components/ui/skeleton";

export default function ChainRowSkeleton() {
  return (
    <div className="flex items-center justify-between p-[8px] w-full rounded-[16px]">
      {/* Left Side - Chain Info Skeleton */}
      <div className="flex gap-[8px] items-center relative shrink-0">
        {/* Chain Logo Skeleton - Circular */}
        <Skeleton
          className="size-[40px]"
          rounded="full"
        />
        
        {/* Chain Name Skeleton */}
        <Skeleton
          className="h-[20px] w-[120px]"
          rounded="md"
        />
      </div>
    </div>
  );
}

