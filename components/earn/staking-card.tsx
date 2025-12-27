"use client";

import Image from "next/image";

interface StakingCardProps {
  tokenSymbol?: string;
  apy?: string;
  tokenIcon?: string;
  onExpand?: () => void;
}

export default function StakingCard({
  tokenSymbol = "TWC",
  apy = "~12.5%",
  tokenIcon = "/assets/logos/twc-token.svg",
  onExpand,
}: StakingCardProps) {
  return (
    <div className="bg-[#0b0f0a] h-18 overflow-clip relative rounded-2xl shrink-0 w-full">
      {/* Token icon and label */}
      <div className="absolute flex gap-2 items-center left-4 sm:left-6 top-4">
        <div className="relative shrink-0 size-10">
          <Image
            src={tokenIcon}
            alt={tokenSymbol}
            width={40}
            height={40}
            className="block max-w-none size-full rounded-full"
          />
        </div>
        <div className="flex flex-col items-start justify-center relative shrink-0">
          <div className="flex flex-col font-['Manrope',sans-serif] font-semibold justify-center leading-0 relative shrink-0 text-sm sm:text-base text-right text-white whitespace-nowrap">
            <p className="leading-normal">{tokenSymbol}</p>
          </div>
        </div>
      </div>

      {/* Dropdown arrow */}
      <button
        onClick={onExpand}
        className="absolute contents cursor-pointer right-4 sm:right-6 top-6"
      >
        <div className="absolute size-6 top-6 right-4 sm:right-6" data-name="arrow-down-01">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="block max-w-none size-full"
          >
            <path
              d="M6 9L12 15L18 9"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </button>

      {/* APY in center */}
      <p className="absolute font-['Manrope',sans-serif] font-normal leading-normal left-1/2 text-sm sm:text-base text-center text-white top-6 translate-x-[-50%] w-auto whitespace-pre-wrap">
        {apy}
      </p>
    </div>
  );
}

