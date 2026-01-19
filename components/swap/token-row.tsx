"use client";

import Image from "next/image";
import { formatAddressMobile } from "@/lib/shared/utils/formatting";
import TokenIcon from "@/components/ui/token-icon";
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
        {/* Token Logo - Made smaller for better visual alignment with badge */}
        <div className="relative shrink-0 size-8 sm:size-8 lg:size-[32px]">
          <TokenIcon
            logo={token.logo}
            symbol={token.symbol}
            address={token.address}
            chainId={token.chainId}
            size="lg"
            className="w-full h-full"
          />
          {token.chainLogo ? (
            <div className="absolute -bottom-0.5 -right-0.5 size-3.5 sm:size-4 lg:size-[14px]">
              <Image
                src={token.chainLogo}
                alt={token.chain}
                width={14}
                height={14}
                className="rounded-full border-2 border-[#0b0f0a] w-full h-full object-cover"
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

