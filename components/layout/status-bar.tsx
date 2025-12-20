"use client";

import Image from "next/image";

interface StatusBarProps {
  activeChainsCount?: number;
  smartMarketsCount?: number;
  twcPrice?: string;
  twcChange?: string;
  twcChangeType?: "positive" | "negative";
}

export default function StatusBar({
  activeChainsCount = 50,
  smartMarketsCount = 20,
  twcPrice = "$0.095",
  twcChange = "-12.1%",
  twcChangeType = "negative",
}: StatusBarProps) {
  const chainIcons = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const ammIcons = [1, 2, 3, 4, 5, 6, 7];

  // Content component for reuse in mobile animation
  const StatusContent = ({ prefix = "" }: { prefix?: string }) => (
    <div className="flex items-center gap-3 px-4 py-3 shrink-0">
      <div className="flex items-center gap-1">
        <span className="text-white font-semibold text-base">
          {activeChainsCount}+
        </span>
        <span className="text-[#b5b5b5] font-medium text-sm">Active Chains</span>
      </div>
      <div className="h-10 w-px bg-[#1f261e]"></div>
      <div className="flex items-center gap-2">
        <Image
          src="/assets/logos/twc-token.svg"
          alt="TWC"
          width={20}
          height={20}
          className="rounded-full w-5 h-5"
        />
        <span className="text-white font-semibold text-xs">TWC</span>
        <span className="text-[#b5b5b5] font-medium text-xs">{twcPrice}</span>
        <span
          className={`font-medium text-xs ${
            twcChangeType === "positive" ? "text-[#4ade80]" : "text-[#ff5c5c]"
          }`}
        >
          {twcChange}
        </span>
      </div>
      <div className="h-10 w-px bg-[#1f261e]"></div>
      <div className="flex items-center -space-x-1.5">
        {chainIcons.map((chainNum) => (
          <Image
            key={`${prefix}-chain-${chainNum}`}
            src={`/assets/chains/chain-${chainNum}.svg`}
            alt={`Chain ${chainNum}`}
            width={20}
            height={20}
            className="rounded-full border-2 border-[#010501] w-5 h-5"
          />
        ))}
      </div>
      <div className="h-10 w-px bg-[#1f261e]"></div>
      <div className="flex items-center gap-1">
        <span className="text-white font-semibold text-base">
          {smartMarketsCount}+
        </span>
        <span className="text-[#b5b5b5] font-medium text-sm">Smart Markets</span>
      </div>
      <div className="h-10 w-px bg-[#1f261e]"></div>
      <div className="flex items-center -space-x-1.5">
        {ammIcons.map((ammNum) => (
          <Image
            key={`${prefix}-amm-${ammNum}`}
            src={`/assets/amms/amm-${ammNum}.svg`}
            alt={`Market ${ammNum}`}
            width={20}
            height={20}
            className="rounded-full border-2 border-[#010501] w-5 h-5"
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="border-b border-[#1f261e] bg-[#010501]">
      {/* Desktop Status Bar */}
      <div className="hidden md:block">
        <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-10 py-3 sm:py-3.5 md:py-4">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 md:gap-6 lg:gap-8 xl:gap-10">
            {/* Active Chains */}
            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 lg:gap-4 flex-wrap">
              <div className="flex items-center gap-0.5 sm:gap-1">
                <span className="text-white font-semibold text-base sm:text-lg">
                  {activeChainsCount}+
                </span>
                <span className="text-[#b5b5b5] font-medium text-sm sm:text-base">
                  Active Chains
                </span>
              </div>
              <div className="hidden sm:block h-10 sm:h-11 md:h-12 w-px bg-[#1f261e]"></div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Image
                  src="/assets/logos/twc-token.svg"
                  alt="TWC"
                  width={24}
                  height={24}
                  className="rounded-full w-5 h-5 sm:w-6 sm:h-6"
                />
                <span className="text-white font-semibold text-xs sm:text-sm">TWC</span>
                <span className="text-[#b5b5b5] font-medium text-xs sm:text-sm">
                  {twcPrice}
                </span>
                <span
                  className={`font-medium text-xs sm:text-sm ${
                    twcChangeType === "positive"
                      ? "text-[#4ade80]"
                      : "text-[#ff5c5c]"
                  }`}
                >
                  {twcChange}
                </span>
              </div>
              <div className="hidden sm:block h-10 sm:h-11 md:h-12 w-px bg-[#1f261e]"></div>
              {/* Chain Icons */}
              <div className="hidden md:flex items-center -space-x-1.5 lg:-space-x-2">
                {chainIcons.map((chainNum) => (
                  <Image
                    key={chainNum}
                    src={`/assets/chains/chain-${chainNum}.svg`}
                    alt={`Chain ${chainNum}`}
                    width={24}
                    height={24}
                    className="rounded-full border-2 border-[#010501] w-5 h-5 lg:w-6 lg:h-6"
                  />
                ))}
              </div>
            </div>

            {/* Smart Markets */}
            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 lg:gap-4 flex-wrap">
              <div className="flex items-center gap-0.5 sm:gap-1">
                <span className="text-white font-semibold text-base sm:text-lg">
                  {smartMarketsCount}+
                </span>
                <span className="text-[#b5b5b5] font-medium text-sm sm:text-base">
                  Smart Markets
                </span>
              </div>
              <div className="hidden sm:block h-10 sm:h-11 md:h-12 w-px bg-[#1f261e]"></div>
              {/* Market Icons */}
              <div className="hidden md:flex items-center -space-x-1.5 lg:-space-x-2">
                {ammIcons.map((ammNum) => (
                  <Image
                    key={ammNum}
                    src={`/assets/amms/amm-${ammNum}.svg`}
                    alt={`Market ${ammNum}`}
                    width={24}
                    height={24}
                    className="rounded-full border-2 border-[#010501] w-5 h-5 lg:w-6 lg:h-6"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Status Bar with Auto-Scrolling Animation */}
      <div className="md:hidden overflow-hidden relative">
        <div className="flex whitespace-nowrap animate-marquee">
          <StatusContent />
          <StatusContent prefix="dup1" />
          <StatusContent prefix="dup2" />
        </div>
      </div>
    </div>
  );
}

