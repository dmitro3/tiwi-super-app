"use client";

import Skeleton from "@/components/ui/skeleton";

/**
 * Balance Skeleton
 * For total balance + daily change section
 */
export function BalanceSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-9 w-32 skeleton-shimmer" />
      <Skeleton className="h-5 w-40 skeleton-shimmer" />
    </div>
  );
}

/**
 * Asset List Skeleton
 * For assets list in left panel (desktop) or main content (mobile)
 */
export function AssetListSkeleton({ isMobile = false }: { isMobile?: boolean }) {
  const gridCols = isMobile 
    ? "grid-cols-[32px_120px_60px_1fr]" 
    : "grid-cols-[20px_120px_80px_1fr]";
  const padding = isMobile ? "p-3" : "px-2 py-3";
  const bgColor = isMobile ? "bg-[#0F120F]" : "bg-[#0E1310]";
  const border = isMobile ? "border border-[#1A1F1A]" : "";
  const rounded = isMobile ? "rounded-2xl" : "rounded-xl";

  return (
    <ul className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <li
          key={i}
          className={`grid ${gridCols} gap-3 items-center ${rounded} ${bgColor} ${padding} ${border}`}
        >
          <Skeleton className={`${isMobile ? 'h-8 w-8' : 'h-5 w-5'} rounded-full skeleton-shimmer`} />
          <div className="space-y-1">
            <Skeleton className="h-4 w-16 skeleton-shimmer" />
            <Skeleton className="h-3 w-24 skeleton-shimmer" />
          </div>
          <div className="flex justify-start">
            <Skeleton className={`${isMobile ? 'h-5 w-16' : 'h-7 w-20'} skeleton-shimmer`} />
          </div>
          <div className="text-right space-y-1">
            <Skeleton className="h-4 w-16 skeleton-shimmer" />
            <Skeleton className="h-3 w-20 skeleton-shimmer" />
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * NFT Grid Skeleton
 * For NFT grid in left panel
 */
export function NFTGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="aspect-square rounded-xl bg-[#0E1310] overflow-hidden"
        >
          <Skeleton className="h-full w-full skeleton-shimmer" />
        </div>
      ))}
    </div>
  );
}

/**
 * Send Form Skeleton
 * For send tab form fields
 */
export function SendFormSkeleton() {
  return (
    <div className="space-y-4">
      {/* Token selector */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-20 skeleton-shimmer" />
        <Skeleton className="h-12 w-full rounded-xl skeleton-shimmer" />
      </div>
      
      {/* Amount input */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-24 skeleton-shimmer" />
        <Skeleton className="h-12 w-full rounded-xl skeleton-shimmer" />
      </div>
      
      {/* Recipient address */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-32 skeleton-shimmer" />
        <Skeleton className="h-12 w-full rounded-xl skeleton-shimmer" />
      </div>
      
      {/* Send button */}
      <Skeleton className="h-12 w-full rounded-xl skeleton-shimmer" />
    </div>
  );
}

/**
 * Receive Tab Skeleton
 * For receive tab (QR code + address)
 */
export function ReceiveSkeleton() {
  return (
    <div className="flex flex-col items-center gap-4">
      {/* QR Code */}
      <Skeleton className="h-48 w-48 rounded-md skeleton-shimmer" />
      
      {/* Address */}
      <div className="w-full space-y-2">
        <Skeleton className="h-4 w-20 mx-auto skeleton-shimmer" />
        <Skeleton className="h-12 w-full rounded-xl skeleton-shimmer" />
      </div>
      
      {/* Buttons */}
      <div className="flex gap-2 w-full">
        <Skeleton className="h-10 flex-1 rounded-full skeleton-shimmer" />
        <Skeleton className="h-10 flex-1 rounded-full skeleton-shimmer" />
      </div>
    </div>
  );
}

/**
 * Transaction List Skeleton
 * For activities/transactions list
 */
export function TransactionListSkeleton() {
  return (
    <div className="flex flex-col gap-6 mt-2">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div key={i} className="flex justify-between items-start">
          <div className="flex flex-col gap-1">
            <Skeleton className="h-5 w-20 skeleton-shimmer" />
            <Skeleton className="h-4 w-24 skeleton-shimmer" />
          </div>
          <div className="flex flex-col gap-1 items-end">
            <Skeleton className="h-5 w-24 skeleton-shimmer" />
            <Skeleton className="h-4 w-20 skeleton-shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}

