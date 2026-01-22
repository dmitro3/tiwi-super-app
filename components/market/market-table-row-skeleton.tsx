"use client";

/**
 * Market Table Row Skeleton
 * 
 * Skeleton loader for market table rows (complete row with all columns)
 */

interface MarketTableRowSkeletonProps {
  includePerpColumns?: boolean;
}

export default function MarketTableRowSkeleton({ includePerpColumns = false }: MarketTableRowSkeletonProps) {
  return (
    <tr className="border-b-[0.5px] border-[#1f261e]">
      {/* Token Column */}
      <td className="w-[200px] px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="size-[18px] rounded-full bg-[#121712] animate-pulse"></div>
          <div className="size-8 rounded-full bg-[#121712] animate-pulse"></div>
          <div className="flex flex-col gap-1.5">
            <div className="h-4 bg-[#121712] rounded animate-pulse w-20"></div>
            <div className="h-3 bg-[#121712] rounded animate-pulse w-14"></div>
          </div>
        </div>
      </td>

      {/* Price Column */}
      <td className="w-[120px] px-6 py-5">
        <div className="h-4 bg-[#121712] rounded animate-pulse w-20 ml-auto"></div>
      </td>

      {/* 24h Change Column */}
      <td className="w-[120px] px-6 py-5">
        <div className="h-4 bg-[#121712] rounded animate-pulse w-14 ml-auto"></div>
      </td>

      {/* 24h Vol Column */}
      <td className="w-[120px] px-6 py-5">
        <div className="h-4 bg-[#121712] rounded animate-pulse w-24 ml-auto"></div>
      </td>

      {/* Liquidity Column */}
      <td className="w-[120px] px-6 py-5">
        <div className="h-4 bg-[#121712] rounded animate-pulse w-24 ml-auto"></div>
      </td>

      {/* Market Cap Column */}
      <td className="w-[120px] px-6 py-5">
        <div className="h-4 bg-[#121712] rounded animate-pulse w-24 ml-auto"></div>
      </td>

      {/* Perp-specific columns */}
      {includePerpColumns && (
        <>
          <td className="w-[120px] px-6 py-5">
            <div className="h-4 bg-[#121712] rounded animate-pulse w-14 ml-auto"></div>
          </td>
          <td className="w-[120px] px-6 py-5">
            <div className="h-4 bg-[#121712] rounded animate-pulse w-24 ml-auto"></div>
          </td>
        </>
      )}

      {/* Buy/Sell Column */}
      <td className="w-[110px] px-6 py-5 sticky right-0 bg-[#010501]">
        <div className="w-[46px] h-[36px] bg-[#121712] rounded-full animate-pulse mx-auto"></div>
      </td>
    </tr>

  );
}

