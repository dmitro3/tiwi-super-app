"use client";

/**
 * Market Table Row Skeleton
 * 
 * Skeleton loader for market table rows (middle scrollable columns only)
 * Token and Buy/Sell columns have their own skeletons in separate tables
 */

interface MarketTableRowSkeletonProps {
  includePerpColumns?: boolean;
}

export default function MarketTableRowSkeleton({ includePerpColumns = false }: MarketTableRowSkeletonProps) {
  return (
    <tr className="border-b border-[#1f261e]/60">
      {/* Price Column */}
      <td className="w-[5rem] lg:w-[5.5rem] xl:w-[6.5625rem] 2xl:w-[6.875rem] px-3 lg:px-4 xl:px-5 2xl:px-6 py-2.5 lg:py-3 xl:py-4 text-right">
        <div className="h-4 lg:h-5 xl:h-6 bg-[#121712] rounded animate-pulse w-20 lg:w-24 ml-auto"></div>
      </td>
      
      {/* 24h Change Column */}
      <td className="w-[5rem] lg:w-[5.5rem] xl:w-[6.5625rem] 2xl:w-[6.875rem] px-3 lg:px-4 xl:px-5 2xl:px-6 py-2.5 lg:py-3 xl:py-4 text-right">
        <div className="h-4 lg:h-5 xl:h-6 bg-[#121712] rounded animate-pulse w-16 lg:w-20 ml-auto"></div>
      </td>
      
      {/* 24h Vol Column */}
      <td className="w-[5.5rem] lg:w-[6rem] xl:w-[6.875rem] 2xl:w-[7.5rem] px-3 lg:px-4 xl:px-5 2xl:px-6 py-2.5 lg:py-3 xl:py-4 text-right">
        <div className="h-4 lg:h-5 xl:h-6 bg-[#121712] rounded animate-pulse w-20 lg:w-24 ml-auto"></div>
      </td>
      
      {/* Liquidity Column */}
      <td className="w-[5rem] lg:w-[5.5rem] xl:w-[6.5625rem] 2xl:w-[6.875rem] px-3 lg:px-4 xl:px-5 2xl:px-6 py-2.5 lg:py-3 xl:py-4 text-right">
        <div className="h-4 lg:h-5 xl:h-6 bg-[#121712] rounded animate-pulse w-20 lg:w-24 ml-auto"></div>
      </td>
      
      {/* Holders Column */}
      <td className="w-[4.5rem] lg:w-[4.75rem] xl:w-[5.3125rem] 2xl:w-[5.625rem] px-3 lg:px-4 xl:px-5 2xl:px-6 py-2.5 lg:py-3 xl:py-4 text-right">
        <div className="h-4 lg:h-5 xl:h-6 bg-[#121712] rounded animate-pulse w-16 lg:w-20 ml-auto"></div>
      </td>
      
      {/* Perp-specific columns */}
      {includePerpColumns && (
        <>
          <td className="w-[5rem] lg:w-[5.5rem] xl:w-[6.5625rem] 2xl:w-[6.875rem] px-3 lg:px-4 xl:px-5 2xl:px-6 py-2.5 lg:py-3 xl:py-4 text-right">
            <div className="h-4 lg:h-5 xl:h-6 bg-[#121712] rounded animate-pulse w-16 lg:w-20 ml-auto"></div>
          </td>
          <td className="w-[5.5rem] lg:w-[6rem] xl:w-[6.875rem] 2xl:w-[7.5rem] px-3 lg:px-4 xl:px-5 2xl:px-6 py-2.5 lg:py-3 xl:py-4 text-right">
            <div className="h-4 lg:h-5 xl:h-6 bg-[#121712] rounded animate-pulse w-20 lg:w-24 ml-auto"></div>
          </td>
        </>
      )}
    </tr>
  );
}

