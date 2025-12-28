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
    <div 
      className="bg-[#0b0f0a] h-18 overflow-clip relative rounded-2xl shrink-0 w-full cursor-pointer hover:opacity-90 transition-opacity"
      onClick={onExpand}
    >
      {/* Use flexbox layout instead of absolute positioning */}
      <div className="flex h-full items-center justify-between px-4 sm:px-6 py-4">
        {/* Left side - Token icon and label */}
        <div className="flex gap-2 items-center shrink-0">
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

        {/* Center - APY */}
        <p className="font-['Manrope',sans-serif] font-normal leading-normal text-sm sm:text-base text-center text-white whitespace-pre-wrap flex-1">
          {apy}
        </p>

        {/* Right side - Dropdown arrow */}
        <div className="flex items-center justify-center shrink-0">
          <div className="relative size-6" data-name="arrow-down-01">
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
        </div>
      </div>
    </div>
  );
}

