"use client";

import { useState } from "react";
import Image from "next/image";
import TokenInput from "./token-input";
import SwapTabs from "./swap-tabs";
import LimitOrderFields from "./limit-order-fields";
import SwapDetailsCard from "./swap-details-card";
import SwapActionButton from "./swap-action-button";
import RecipientWalletSelector from "./recipient-wallet-selector";
import Skeleton from "@/components/ui/skeleton";
import { parseNumber } from "@/lib/shared/utils/number";
import { useSwapStore } from "@/lib/frontend/store/swap-store";

interface Token {
  symbol: string;
  chain: string;
  icon: string;
  chainBadge?: string;
  chainId?: number;
  address?: string;
}

interface SwapCardProps {
  activeTab?: "swap" | "limit";
  fromToken?: Token;
  toToken?: Token;
  fromBalance?: string;
  fromBalanceLoading?: boolean;
  toBalance?: string;
  toBalanceLoading?: boolean;
  fromAmount?: string;
  toAmount?: string;
  fromUsdValue?: string;
  toUsdValue?: string;
  limitPrice?: string;
  limitPriceUsd?: string;
  expires?: "never" | "24h" | "7d" | "custom";
  recipientAddress?: string | null;
  onRecipientChange?: (address: string | null) => void;
  connectedAddress?: string | null;
  onTabChange?: (tab: "swap" | "limit") => void;
  onFromTokenSelect?: () => void;
  onToTokenSelect?: () => void;
  onFromAmountChange?: (value: string) => void;
  onToAmountChange?: (value: string) => void;
  onLimitPriceChange?: (value: string) => void;
  onExpiresChange?: (value: "never" | "24h" | "7d" | "custom") => void;
  onMaxClick?: () => void;
  onSwapClick?: () => void;
  onConnectClick?: () => void;
  isConnected?: boolean;
  isExecutingTransfer?: boolean;
}

export default function SwapCard({
  activeTab = "swap",
  fromToken,
  toToken,
  fromBalance = "0.00",
  fromBalanceLoading = false,
  toBalance = "0.00",
  toBalanceLoading = false,
  fromAmount = "",
  toAmount = "",
  fromUsdValue = "$0",
  toUsdValue = "$0",
  limitPrice = "",
  limitPriceUsd = "$0",
  expires = "never",
  recipientAddress = null,
  onRecipientChange,
  connectedAddress = null,
  onTabChange,
  onFromTokenSelect,
  onToTokenSelect,
  onFromAmountChange,
  onToAmountChange,
  onLimitPriceChange,
  onExpiresChange,
  onMaxClick,
  onSwapClick,
  onConnectClick,
  isConnected = false,
  isExecutingTransfer = false,
}: SwapCardProps) {
  const isLimit = activeTab === "limit";

  // Get quote loading state for skeleton loaders
  const isQuoteLoading = useSwapStore((state) => state.isQuoteLoading);

  // Expandable details state - used for both Swap and Limit tabs
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);

  // Check if fromAmount is valid (non-zero number) for showing Limit-specific sections
  const hasValidFromAmount = parseNumber(fromAmount) > 0;

  const handleToggleDetails = () => {
    setIsDetailsExpanded((prev) => !prev);
  };

  return (
    <div className="flex flex-col gap-2 sm:gap-2.5">
      <SwapTabs activeTab={activeTab} onTabChange={onTabChange} />

      <div className="bg-[#010501] border border-[#1f261e] rounded-2xl lg:rounded-3xl p-4 sm:p-5 lg:p-6 relative z-30 overflow-hidden backdrop-blur-sm">
        {/* Top Edge Gradient Glow */}
        <div className="absolute top-0 left-0 right-0 h-px bg-[linear-gradient(to_right,transparent_0%,rgba(177,241,40,0.4)_50%,transparent_100%)]"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[2px] bg-[#b1f128]/20 blur-[2px]"></div>
        <div className="absolute -top-px left-1/2 -translate-x-1/2 w-1/2 h-[3px] bg-[#b1f128]/10 blur-sm"></div>

        <div className="flex flex-col gap-3 sm:gap-0 2xl:gap-4">
          {/* From / To group with arrow centered between them */}
          <div className="relative flex flex-col gap-3 sm:gap-4">
            {/* From Section */}
            {isQuoteLoading && !fromAmount ? (
              <div className="flex flex-col gap-2 sm:gap-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-10 w-32" />
                </div>
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-4 w-24" />
              </div>
            ) : (
              <TokenInput
                type="from"
                token={fromToken}
                balance={fromBalance}
                balanceLoading={fromBalanceLoading}
                amount={fromAmount}
                usdValue={fromUsdValue}
                onTokenSelect={onFromTokenSelect}
                onMaxClick={onMaxClick}
                onAmountChange={onFromAmountChange}
                readOnlyAmount={false}
              />
            )}

            {/* Swap Arrow - Absolutely positioned between From and To sections */}
            <div className="absolute left-1/2 -translate-x-1/2 z-20 md:top-[calc(50%-20px)] top-[calc(50%-15px)]">
              <button
                onClick={onSwapClick}
                className="bg-[#1f261e] border-2 border-[#010501] p-1.5 sm:p-2 rounded-lg hover:bg-[#2a3229] transition-colors shadow-lg"
                aria-label="Swap tokens"
              >
                <Image
                  src="/assets/icons/arrow-up-down.svg"
                  alt="Swap"
                  width={24}
                  height={24}
                  className="[&_path]:stroke-[#b1f128] w-5 h-5 sm:w-6 sm:h-6"
                />
              </button>
            </div>

            {/* To Section */}
            {isQuoteLoading && !toAmount ? (
              <div className="flex flex-col gap-2 sm:gap-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-10 w-32" />
                </div>
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-4 w-24" />
              </div>
            ) : (
              <div className="space-y-2">
                {/* Recipient Wallet Selector - Always visible in To section header */}
                <div className="flex items-center justify-end px-2 -mb-1">
                  <RecipientWalletSelector
                    connectedAddress={connectedAddress}
                    recipientAddress={recipientAddress}
                    onRecipientChange={onRecipientChange || (() => {})}
                    chainId={toToken?.chainId}
                    chainType={toToken?.chainId === 7565164 ? "Solana" : toToken?.chainId ? "EVM" : undefined}
                  />
                </div>
                <TokenInput
                  type="to"
                  token={toToken}
                  balance={toBalance}
                  balanceLoading={toBalanceLoading}
                  amount={toAmount}
                  usdValue={toUsdValue}
                  onTokenSelect={onToTokenSelect}
                  onAmountChange={onToAmountChange}
                  readOnlyAmount
                />
              </div>
            )}
          </div>

          {/* Limit Order Fields - Only shown in Limit tab */}
          {isLimit && (
            <LimitOrderFields
              fromToken={fromToken}
              limitPrice={limitPrice}
              limitPriceUsd={limitPriceUsd}
              expires={expires}
              hasValidFromAmount={hasValidFromAmount}
              onLimitPriceChange={onLimitPriceChange}
              onExpiresChange={onExpiresChange}
            />
          )}

          {/* Expandable details section - Available in both Swap and Limit tabs */}
          <SwapDetailsCard isExpanded={isDetailsExpanded} />

          {/* Show More / Show Less row - Available in both Swap and Limit tabs */}
          <button
            type="button"
            onClick={handleToggleDetails}
            className={`flex items-center justify-center gap-2 text-[#b5b5b5] text-sm sm:text-base cursor-pointer ${
              !isLimit ? "mt-3 sm:mt-4" : "mt-3 sm:mt-0"
            }`}
          >
            <span className="font-medium">
              {isDetailsExpanded ? "Show Less" : "Show More"}
            </span>
            <Image
              src="/assets/icons/arrow-down-white.svg"
              alt={isDetailsExpanded ? "Show less" : "Show more"}
              width={20}
              height={20}
              className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200 ${
                isDetailsExpanded ? "-scale-y-100" : ""
              }`}
            />
          </button>

          {/* Primary CTA Button */}
          <SwapActionButton
            activeTab={activeTab}
            isConnected={isConnected}
            onSwapClick={onSwapClick}
            onConnectClick={onConnectClick}
            isExecutingTransfer={isExecutingTransfer}
          />
        </div>

        {/* Bottom Edge Gradient Glow */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-[linear-gradient(to_right,transparent_0%,rgba(177,241,40,0.4)_50%,transparent_100%)]"></div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-[2px] bg-[#b1f128]/20 blur-[2px]"></div>
        <div className="absolute -bottom-px left-1/2 -translate-x-1/2 w-1/2 h-[3px] bg-[#b1f128]/10 blur-sm"></div>
      </div>
    </div>
  );
}

