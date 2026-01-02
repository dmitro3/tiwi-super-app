"use client";

import Image from "next/image";
import { formatAddressMobile } from "@/lib/shared/utils/formatting";
import type { Token } from "@/lib/frontend/types/tokens";

interface TokenRowProps {
  token: Token;
  formattedAddress: string;
  formattedBalance: string;
  isSelected: boolean;
  onClick: () => void;
}

export default function TokenRow({
  token,
  formattedAddress,
  formattedBalance,
  isSelected,
  onClick,
}: TokenRowProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between px-4 sm:px-6 lg:px-[24px] py-3 sm:py-4 lg:py-[16px] w-full hover:bg-[#121712] transition-colors cursor-pointer text-left"
    >
      {/* Left Side - Token Info */}
      <div className="flex gap-2 sm:gap-[8px] items-center relative shrink-0 min-w-0 flex-1">
        {/* Token Logo */}
        <div className="relative shrink-0 size-8 sm:size-10 lg:size-[40px]">
          {token.logo ? (
            <Image
              src={token.logo}
              alt={token.name}
              width={40}
              height={40}
              className="rounded-full w-full h-full object-contain"
            />
          ) : (
            <div className="rounded-full w-full h-full bg-[#121712] flex items-center justify-center text-xs sm:text-sm text-[#b5b5b5]">
              {token.symbol?.[0] ?? "?"}
            </div>
          )}
          {token.chainLogo ? (
            <div className="absolute -bottom-0.5 -right-0.5 size-4 sm:size-5">
              <Image
                src={token.chainLogo}
                alt={token.chain}
                width={20}
                height={20}
                className="rounded-full border-2 border-[#0b0f0a] w-full h-full"
              />
            </div>
          ) : null}
        </div>

        {/* Token Details */}
        <div className="flex flex-col gap-1 sm:gap-[4px] items-start justify-center relative shrink-0 min-w-0 flex-1">
          {/* Token Name */}
          <div className="flex flex-col font-medium justify-center leading-0 relative shrink-0 text-base sm:text-lg lg:text-[18px] text-white">
            <p className="leading-[20px] truncate max-w-[120px] sm:max-w-[180px] lg:max-w-none">{token.name}</p>
          </div>

          {/* Symbol and Address */}
          <div className="flex font-medium gap-1.5 sm:gap-[8px] items-start leading-0 relative shrink-0 text-sm sm:text-base lg:text-[16px] min-w-0">
            <div className="flex flex-col justify-center relative shrink-0 text-[#b5b5b5] whitespace-nowrap">
              <p className="leading-[20px]">{token.symbol}</p>
            </div>
            <div className="flex flex-col justify-center relative shrink-0 text-[#7c7c7c] min-w-0">
              <p className="leading-[20px] truncate lg:hidden">{formatAddressMobile(token.address)}</p>
              <p className="leading-[20px] hidden lg:block">{formattedAddress}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Balance and USD Value */}
      {(formattedBalance || token.usdValue) && (
        <div className="flex flex-col gap-1 sm:gap-[4px] items-end justify-center leading-0 relative shrink-0 text-right min-w-0 ml-2">
          {/* Balance */}
          {formattedBalance && (
            <div className="flex flex-col font-semibold justify-center leading-0 relative shrink-0 text-base sm:text-lg lg:text-[18px] text-white">
              <p className="leading-[20px] truncate max-w-[80px] sm:max-w-[120px] lg:max-w-none">{formattedBalance}</p>
            </div>
          )}
          {/* USD Value */}
          {token.usdValue && (
            <div className="flex flex-col font-medium justify-center leading-0 relative shrink-0 text-[#b5b5b5] text-sm sm:text-base lg:text-[16px]">
              <p className="leading-[20px] truncate">{token.usdValue}</p>
            </div>
          )}
        </div>
      )}
    </button>
  );
}

