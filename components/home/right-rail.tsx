"use client";

import Image from "next/image";
import { SpotlightCarousel } from "@/components/home/spotlight-carousel";
import { useTWCPrice } from "@/hooks/useTWCPrice";
import { SubscriptUSDPrice } from "@/components/ui/subscript-usd-price";
import { formatNumber, formatPercentageChange, formatTokenSupply } from "@/lib/frontend/utils/price-formatter";
import Skeleton from "@/components/ui/skeleton";

export function RightRail() {
  return (
    <div className="w-full h-full flex flex-col gap-4 overflow-hidden px-0">
      <div className="shrink-0 flex justify-center">
        <StakeCard />
      </div>
      <div className="flex-1 overflow-y-auto market-table-scrollbar min-h-0">
        <div className="flex flex-col gap-4">
          <SpotlightCarousel />
          <StatsGrid />
        </div>
      </div>
    </div>
  );
}

export function StakeCard() {
  return (
    <div className="w-full rounded-2xl overflow-hidden px-4 lg:px-5 xl:px-5 2xl:px-6 py-4">
      <Image
        src="/assets/icons/home/claim-reward.svg"
        alt="Stake to earn $TWC"
        width={310}
        height={96}
        className="w-full h-auto object-contain"
        priority
      />
    </div>
  );
}


function StatsGrid() {
  const { data: twcData, isLoading } = useTWCPrice();

  // Extract data from TWC token
  const price = twcData?.priceUSD || twcData?.token?.price || '0';
  const priceChange24h = twcData?.priceChange24h ?? 0;
  const volume24h = twcData?.token?.volume24h;
  const marketCap = twcData?.token?.marketCap;
  const holders = twcData?.token?.holders;
  const transactionCount = twcData?.token?.transactionCount;
  
  // TWC Total Supply from contract: 908824899185662757314442 (uint256) with 9 decimals
  const TWC_TOTAL_SUPPLY = '908824899185662757314442';
  const TWC_DECIMALS = 9;
  
  // Try to get totalSupply from token (might be in nested property or raw data)
  // @ts-ignore - totalSupply might exist but not in type definition
  const totalSupplyRaw = twcData?.token?.totalSupply || (twcData?.token as any)?.raw?.totalSupply || TWC_TOTAL_SUPPLY;
  
  // Format volume change (use price change as proxy if volume change not available)
  const volumeChange = formatPercentageChange(priceChange24h);
  
  // Format values
  const volume24hFormatted = volume24h ? `$${formatNumber(volume24h, 2)}` : 'N/A';
  const marketCapFormatted = marketCap ? `$${formatNumber(marketCap, 2)}` : 'N/A';
  const holdersFormatted = holders ? formatNumber(holders, 0) : 'N/A';
  const txCountFormatted = transactionCount ? formatNumber(transactionCount, 0) : 'N/A';
  
  // Format total supply with 9 decimals
  const totalSupplyFormatted = formatTokenSupply(totalSupplyRaw, TWC_DECIMALS);

  return (
    <div className="w-full px-6 lg:px-7 xl:px-6 2xl:px-10 py-0 flex flex-col gap-2 justify-center">
      <div className="px-0 py-3 lg:py-4 xl:py-4">
        <p className="text-white text-sm lg:text-sm xl:text-base font-semibold mb-2">Trade Without Limits</p>
      </div>
      <div className="flex flex-col gap-2">
        {/* TWC Token Price */}
        <div className="border border-[#1f261e] rounded-lg px-0 py-3 lg:py-4 xl:py-4 flex flex-col items-center gap-2">
          <p className="text-[#b5b5b5] text-xs lg:text-xs xl:text-sm font-medium">TWC Token Price</p>
          {isLoading ? (
            <Skeleton className="h-5 w-20" />
          ) : (
            <SubscriptUSDPrice
              price={price}
              className="text-white text-sm lg:text-sm xl:text-base font-semibold"
            />
          )}
        </div>

        {/* Volume (24h) and Market Cap */}
        <div className="grid grid-cols-2 gap-2">
          <div className="border border-[#1f261e] rounded-lg px-0 py-3 lg:py-4 xl:py-4 flex flex-col items-center gap-2">
            <p className="text-[#b5b5b5] text-xs lg:text-xs xl:text-sm font-medium">Volume (24h)</p>
            {isLoading ? (
              <Skeleton className="h-5 w-16" />
            ) : (
              <div className="flex items-center gap-1.5 lg:gap-2 xl:gap-2">
                <span className="text-white text-sm lg:text-sm xl:text-base font-semibold">{volume24hFormatted}</span>
                <span className={`text-xs lg:text-xs xl:text-sm font-medium ${
                  volumeChange.isPositive ? 'text-[#3fea9b]' : 'text-[#ff5c5c]'
                }`}>
                  {volumeChange.formatted}
                </span>
              </div>
            )}
          </div>
          <div className="border border-[#1f261e] rounded-lg px-0 py-3 lg:py-4 xl:py-4 flex flex-col items-center gap-2">
            <p className="text-[#b5b5b5] text-xs lg:text-xs xl:text-sm font-medium">Market Cap</p>
            {isLoading ? (
              <Skeleton className="h-5 w-16" />
            ) : (
              <p className="text-white text-sm lg:text-sm xl:text-base font-semibold">{marketCapFormatted}</p>
            )}
          </div>
        </div>

        {/* Trans. Count and Holders */}
        <div className="grid grid-cols-2 gap-2">
          <div className="border border-[#1f261e] rounded-lg px-0 py-3 lg:py-4 xl:py-4 flex flex-col items-center gap-2">
            <p className="text-[#b5b5b5] text-xs lg:text-xs xl:text-sm font-medium">Trans. Count</p>
            {isLoading ? (
              <Skeleton className="h-5 w-16" />
            ) : (
              <p className="text-white text-sm lg:text-sm xl:text-base font-semibold">{txCountFormatted}</p>
            )}
          </div>
          <div className="border border-[#1f261e] rounded-lg px-0 py-3 lg:py-4 xl:py-4 flex flex-col items-center gap-2">
            <p className="text-[#b5b5b5] text-xs lg:text-xs xl:text-sm font-medium">Holders</p>
            {isLoading ? (
              <Skeleton className="h-5 w-16" />
            ) : (
              <p className="text-white text-sm lg:text-sm xl:text-base font-semibold">{holdersFormatted}</p>
            )}
          </div>
        </div>

        {/* Total Supply */}
        <div className="border border-[#1f261e] rounded-lg px-0 py-3 lg:py-4 xl:py-4 flex flex-col items-center gap-2">
          <p className="text-[#b5b5b5] text-xs lg:text-xs xl:text-sm font-medium">Total Supply</p>
          {isLoading ? (
            <Skeleton className="h-5 w-20" />
          ) : (
            <p 
              className="text-white text-sm lg:text-sm xl:text-base font-semibold cursor-help"
              title={totalSupplyFormatted.tooltip}
            >
              {totalSupplyFormatted.display}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

