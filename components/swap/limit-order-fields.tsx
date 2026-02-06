"use client";

import Image from "next/image";
import { Input } from "@/components/ui/input";

interface LimitOrderFieldsProps {
  fromToken?: {
    symbol: string;
    icon: string;
  };
  limitPrice: string;
  limitPriceUsd: string;
  expires: "never" | "24h" | "7d" | "custom";
  customExpiryMinutes: string;
  hasValidFromAmount: boolean;
  onLimitPriceChange?: (value: string) => void;
  onExpiresChange?: (value: "never" | "24h" | "7d" | "custom") => void;
  onCustomExpiryChange?: (value: string) => void;
}

export default function LimitOrderFields({
  fromToken,
  limitPrice,
  limitPriceUsd,
  expires,
  customExpiryMinutes,
  hasValidFromAmount,
  onLimitPriceChange,
  onExpiresChange,
  onCustomExpiryChange,
}: LimitOrderFieldsProps) {
  // Always show the fields when this component is rendered (controlled by parent)
  // if (!hasValidFromAmount) return null;

  return (
    <>
      {/* When Price (Limit price summary / input) - Animated show/hide */}
      <div className="section-collapse max-h-[200px] opacity-100 block">
        <div className="bg-[#0b0f0a] rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-[18px] w-full">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <span className="text-[#b5b5b5] text-sm sm:text-base">
              When Price
            </span>
            <span className="text-[#b5b5b5] text-sm sm:text-base">
              Per Token
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 sm:gap-4">
            {/* Token pill */}
            <div className="flex items-center gap-2 bg-[#121712] rounded-full px-2.5 sm:px-3 py-2">
              <div className="relative h-10 w-10 sm:h-12 sm:w-12">
                {fromToken && (
                  <Image
                    src={fromToken.icon}
                    alt={fromToken.symbol}
                    width={48}
                    height={48}
                    className="rounded-full w-full h-full"
                  />
                )}
              </div>
              <span className="text-white font-semibold text-base sm:text-lg">
                {fromToken?.symbol ?? "TWC"}
              </span>
            </div>

            {/* Price input + USD summary */}
            <div className="flex flex-col items-end">
              <Input
                type="text"
                inputMode="decimal"
                value={limitPrice}
                onChange={(e) => onLimitPriceChange?.(e.target.value)}
                placeholder="0.0"
                className={`text-right text-[26px] sm:text-[29px] lg:text-[33px] leading-none bg-transparent border-0 px-0 py-0 h-auto ${limitPrice && limitPrice !== ""
                  ? "text-white"
                  : "text-[#7c7c7c]"
                  }`}
              />
              <span className="text-[#7c7c7c] text-xs sm:text-sm">
                {limitPriceUsd}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Expires selector - Animated show/hide */}
      <div className="section-collapse max-h-[250px] opacity-100 block transition-all duration-300">
        <div className="bg-[#0b0f0a] rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-[18px] w-full overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[#b5b5b5] text-sm sm:text-base">
              Expires
            </p>
            {expires === 'custom' && (
              <div className="flex items-center gap-2">
                <span className="text-[#7c7c7c] text-xs">Minutes:</span>
                <input
                  type="number"
                  value={customExpiryMinutes}
                  onChange={(e) => onCustomExpiryChange?.(e.target.value)}
                  className="bg-[#121712] border border-[#1f261e] rounded px-2 py-0.5 text-xs text-[#b1f128] w-16 outline-none"
                />
              </div>
            )}
          </div>
          <div className="flex gap-1 sm:gap-1.5 md:gap-2 min-w-0">
            {[
              { key: "never", label: "Never" },
              { key: "24h", label: "24 Hours" },
              { key: "7d", label: "7 Days" },
              { key: "custom", label: "Custom" },
            ].map((option) => {
              const isActive = expires === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() =>
                    onExpiresChange?.(
                      option.key as "never" | "24h" | "7d" | "custom"
                    )
                  }
                  className={`flex-1 min-w-0 px-1.5 sm:px-2 md:px-3 lg:px-4 xl:px-6 py-1.5 sm:py-2 rounded-full text-[9px] sm:text-[10px] md:text-xs lg:text-sm xl:text-base transition-colors whitespace-nowrap overflow-hidden text-ellipsis cursor-pointer ${isActive
                    ? "bg-[#081f02] text-[#b1f128]"
                    : "bg-[#121712] border border-[#1f261e] text-[#b5b5b5]"
                    }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
