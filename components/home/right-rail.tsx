import Image from "next/image";
import { STATS } from "@/lib/home/mock-data";
import { SpotlightCarousel } from "@/components/home/spotlight-carousel";

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
  return (
    <div className="w-full px-6 lg:px-7 xl:px-6 2xl:px-10 py-0 flex flex-col gap-2 justify-center">
      <div className="px-0 py-3 lg:py-4 xl:py-4">
        <p className="text-white text-sm lg:text-sm xl:text-base font-semibold mb-2">Trade Without Limits</p>
      </div>
      <div className="flex flex-col gap-2">
        <div className="border border-[#1f261e] rounded-lg px-0 py-3 lg:py-4 xl:py-4 flex flex-col items-center gap-2">
          <p className="text-[#b5b5b5] text-xs lg:text-xs xl:text-sm font-medium">TWC Token Price</p>
          <p className="text-white text-sm lg:text-sm xl:text-base font-semibold">{STATS.twcPrice}</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="border border-[#1f261e] rounded-lg px-0 py-3 lg:py-4 xl:py-4 flex flex-col items-center gap-2">
            <p className="text-[#b5b5b5] text-xs lg:text-xs xl:text-sm font-medium">Volume (24h)</p>
            <div className="flex items-center gap-1.5 lg:gap-2 xl:gap-2">
              <span className="text-white text-sm lg:text-sm xl:text-base font-semibold">{STATS.volume24h}</span>
              <span className="text-[#ff5c5c] text-xs lg:text-xs xl:text-sm font-medium">{STATS.volumeChange}</span>
            </div>
          </div>
          <div className="border border-[#1f261e] rounded-lg px-0 py-3 lg:py-4 xl:py-4 flex flex-col items-center gap-2">
            <p className="text-[#b5b5b5] text-xs lg:text-xs xl:text-sm font-medium">Market Cap</p>
            <p className="text-white text-sm lg:text-sm xl:text-base font-semibold">{STATS.marketCap}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="border border-[#1f261e] rounded-lg px-0 py-3 lg:py-4 xl:py-4 flex flex-col items-center gap-2">
            <p className="text-[#b5b5b5] text-xs lg:text-xs xl:text-sm font-medium">Trans. Count</p>
            <p className="text-white text-sm lg:text-sm xl:text-base font-semibold">{STATS.txCount}</p>
          </div>
          <div className="border border-[#1f261e] rounded-lg px-0 py-3 lg:py-4 xl:py-4 flex flex-col items-center gap-2">
            <p className="text-[#b5b5b5] text-xs lg:text-xs xl:text-sm font-medium">Holders</p>
            <p className="text-white text-sm lg:text-sm xl:text-base font-semibold">{STATS.holders}</p>
          </div>
        </div>

        <div className="border border-[#1f261e] rounded-lg px-0 py-3 lg:py-4 xl:py-4 flex flex-col items-center gap-2">
          <p className="text-[#b5b5b5] text-xs lg:text-xs xl:text-sm font-medium">Total Supply</p>
          <p className="text-white text-sm lg:text-sm xl:text-base font-semibold">{STATS.totalSupply}</p>
        </div>
      </div>
    </div>
  );
}

