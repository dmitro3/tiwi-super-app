"use client";

import Image from "next/image";
import { Input } from "@/components/ui/input";

interface TokenInputProps {
  type: "from" | "to";
  token?: {
    symbol: string;
    chain: string;
    icon: string;
    chainBadge?: string;
  };
  balance?: string;
  amount?: string;
  usdValue?: string;
  onTokenSelect?: () => void;
  onMaxClick?: () => void;
  onAmountChange?: (value: string) => void;
  disabled?: boolean;
  readOnlyAmount?: boolean;
}

export default function TokenInput({
  type,
  token,
  balance = "0.00",
  amount = "",
  usdValue = "$0",
  onTokenSelect,
  onMaxClick,
  onAmountChange,
  disabled = false,
  readOnlyAmount = false,
}: TokenInputProps) {
  const isFrom = type === "from";

  return (
    <div className="bg-[#0b0f0a] rounded-xl sm:rounded-2xl p-3.5 sm:p-4 lg:p-[18px] relative z-0 overflow-hidden">
      <div className="flex items-start justify-between gap-3 sm:gap-4 min-w-0">
        <div className="flex flex-col gap-2.5 sm:gap-3 lg:gap-[13px]">
          <p className="text-white font-semibold text-xs sm:text-sm">
            {isFrom ? "From" : "To"}
          </p>
          <button
            onClick={onTokenSelect}
            disabled={disabled}
            className={`flex items-center gap-1.5 sm:gap-[9px] px-2 sm:px-3 py-2 sm:py-2.5 md:py-3 rounded-full transition-colors w-full justify-between min-w-[120px] sm:min-w-[160px] cursor-pointer ${
              isFrom
                ? "bg-[#121712] hover:bg-[#1f261e]"
                : "bg-[#156200] hover:bg-[#1a7a00]"
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {token ? ( 
              <>
                <div className="relative h-8 w-8 sm:h-11 sm:w-11 shrink-0">
                  <Image
                    src={token.icon}
                    alt={token.symbol}
                    width={48}
                    height={48}
                    className="rounded-full w-full h-full"
                  />
                  {token.chainBadge && (
                    <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 sm:h-5 sm:w-5 md:h-[22px] md:w-[22px] lg:h-6 lg:w-6">
                      <Image
                        src={token.chainBadge}
                        alt="Chain Badge"
                        width={24}
                        height={24}
                        className="rounded-full border-2 border-[#121712] w-full h-full"
                      />
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-start min-w-0 flex-1">
                  <span className="text-white font-semibold text-base sm:text-lg leading-tight">
                    {token.symbol}
                  </span>
                  <span className="text-[#7c7c7c] font-medium text-[10px] sm:text-[11px] max-w-[150px] sm:max-w-[200px] truncate">
                    {token.chain}
                  </span>
                </div>
                <Image
                  src={isFrom ? "/assets/icons/arrow-down.svg" : "/assets/icons/arrow-down-white.svg"}
                  alt="Dropdown"
                  width={24}
                  height={24}
                  className="w-5 h-5 sm:w-6 sm:h-6"
                />
              </>
            ) : (
              <>
                <span className="text-white font-medium text-xs sm:text-base">
                  Select Token
                </span>
                <Image
                  src="/assets/icons/arrow-down-white.svg"
                  alt="Dropdown"
                  width={24}
                  height={24}
                  className="w-4 h-4 sm:w-6 sm:h-6"
                />
              </>
            )}
          </button>
        </div>
        <div className="flex flex-col items-end justify-center min-w-0 flex-1 max-w-full">
          {isFrom && (
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2 w-full justify-end min-w-0">
              <div className="flex items-center gap-0.5 min-w-0 shrink">
                <Image
                  src="/assets/icons/wallet.svg"
                  alt="Wallet"
                  width={16}
                  height={16}
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0"
                />
                <span className="text-[#b5b5b5] font-medium text-xs sm:text-sm text-right min-w-0 flex items-center gap-1">
                  <span className="truncate inline-block max-w-[60px] sm:max-w-[100px] md:max-w-[130px]">
                    {balance}
                  </span>
                  {token?.symbol && (
                    <span className="whitespace-nowrap shrink-0">{token.symbol}</span>
                  )}
                </span>
              </div>
              <button
                onClick={onMaxClick}
                className="bg-[#1f261e] text-[#b1f128] font-medium text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-1.5 rounded-full hover:bg-[#2a3229] transition-colors cursor-pointer shrink-0"
              >
                Max
              </button>
            </div>
          )}
          {!isFrom && (
            <div className="flex items-center gap-0.5 h-7 sm:h-8 mb-1.5 sm:mb-2 w-full justify-end">
              <Image
                src="/assets/icons/wallet.svg"
                alt="Wallet"
                width={16}
                height={16}
                className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0"
              />
              <span className="text-[#b5b5b5] font-medium text-xs sm:text-sm text-right truncate max-w-[120px] sm:max-w-[160px]">
                {balance}
              </span>
            </div>
          )}
          <Input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => onAmountChange?.(e.target.value)}
            placeholder="0.0"
            readOnly={readOnlyAmount}
            className={`text-right text-[26px] sm:text-[29px] lg:text-[33px] leading-none mb-0.5 sm:mb-1 bg-transparent border-0 px-0 py-0 w-full min-w-0 ${
              amount && amount !== ""
                ? "text-white"
                : "text-[#7c7c7c]"
            }`}
          />
          <p className="text-[#7c7c7c] font-medium text-xs sm:text-sm text-right w-full truncate">
            {usdValue}
          </p>
        </div>
      </div>
    </div>
  );
}

