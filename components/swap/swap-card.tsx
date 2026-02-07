"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import TokenInput from "./token-input";
import SwapTabs from "./swap-tabs";
import LimitOrderFields from "./limit-order-fields";
import SwapDetailsCard from "./swap-details-card";
import SwapActionButton from "./swap-action-button";
import RecipientWalletSelector from "./recipient-wallet-selector";
import FromWalletDropdown from "./from-wallet-dropdown";
import ToWalletDropdown from "./to-wallet-dropdown";
import { parseNumber } from "@/lib/shared/utils/number";
import { useSwapStore } from "@/lib/frontend/store/swap-store";
import { ArrowUpDown } from 'lucide-react';
import { useWallet } from "@/lib/wallet/hooks/useWallet";
import { isAddressChainCompatible, isWalletChainCompatible, getWalletIconFromAccount } from "@/lib/frontend/utils/wallet-display";

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
  customExpiryMinutes?: string;
  recipientAddress?: string | null;
  onRecipientChange?: (address: string | null) => void;
  connectedAddress?: string | null;
  fromWalletIcon?: string | null;
  toWalletIcon?: string | null;
  onToWalletClick?: () => void;
  onTabChange?: (tab: "swap" | "limit") => void;
  onFromTokenSelect?: () => void;
  onToTokenSelect?: () => void;
  onFromAmountChange?: (value: string) => void;
  onToAmountChange?: (value: string) => void;
  onLimitPriceChange?: (value: string) => void;
  onExpiresChange?: (value: "never" | "24h" | "7d" | "custom") => void;
  onCustomExpiryChange?: (value: string) => void;
  onMaxClick?: () => void;
  on25PercentClick?: () => void;
  on50PercentClick?: () => void;
  on75PercentClick?: () => void;
  onSwapClick?: () => void;
  onSwapTokens?: () => void; // Handler for middle swap arrow button (swaps tokens, amounts, addresses)
  onConnectClick?: () => void;
  onConnectFromSection?: () => void; // Handler for connecting from "From" section (uses connectAdditionalWallet)
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
  customExpiryMinutes = "1440",
  recipientAddress = null,
  onRecipientChange,
  connectedAddress = null,
  fromWalletIcon = null,
  toWalletIcon = null,
  onToWalletClick,
  onTabChange,
  onFromTokenSelect,
  onToTokenSelect,
  onFromAmountChange,
  onToAmountChange,
  onLimitPriceChange,
  onExpiresChange,
  onCustomExpiryChange,
  onMaxClick,
  on25PercentClick,
  on50PercentClick,
  on75PercentClick,
  onSwapClick,
  onSwapTokens,
  onConnectClick,
  onConnectFromSection,
  isConnected = false,
  isExecutingTransfer = false,
}: SwapCardProps) {
  const isLimit = activeTab === "limit";

  // Get quote loading state for skeleton loaders
  const isQuoteLoading = useSwapStore((state) => state.isQuoteLoading);
  const activeInput = useSwapStore((state) => state.activeInput);

  // Expandable details state - used for both Swap and Limit tabs
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);

  // Wallet dropdown states
  const [isFromWalletDropdownOpen, setIsFromWalletDropdownOpen] = useState(false);
  const [isToWalletDropdownOpen, setIsToWalletDropdownOpen] = useState(false);

  // Get wallet data for compatibility checking
  const { connectedWallets, primaryWallet, secondaryWallet } = useWallet();

  // Check if fromAmount is valid (non-zero number) for showing Limit-specific sections
  const hasValidFromAmount = parseNumber(fromAmount) > 0;

  // Determine compatible wallets and addresses for From section
  const fromCompatibleWallets = useMemo(() => {
    if (!fromToken?.chainId) return [];
    return connectedWallets.filter((wallet) => wallet && isWalletChainCompatible(wallet, fromToken.chainId));
  }, [connectedWallets, fromToken?.chainId]);

  const fromCompatibleAddress = useMemo(() => {
    // Check if connectedAddress is compatible with fromToken chain
    if (connectedAddress && fromToken?.chainId) {
      if (isAddressChainCompatible(connectedAddress, fromToken.chainId)) {
        return connectedAddress;
      }
    }
    return null;
  }, [connectedAddress, fromToken?.chainId]);

  const fromCompatibleWalletIcon = useMemo(() => {
    if (!fromCompatibleAddress) return null;
    // Find the wallet that matches this address
    const matchingWallet = fromCompatibleWallets.find(
      (w) => w && w.address.toLowerCase() === fromCompatibleAddress.toLowerCase()
    );
    return matchingWallet ? getWalletIconFromAccount(matchingWallet) : null;
  }, [fromCompatibleAddress, fromCompatibleWallets]);

  // Determine compatible wallets and addresses for To section
  const toCompatibleWallets = useMemo(() => {
    if (!toToken?.chainId) return [];
    const allWallets = [primaryWallet, secondaryWallet].filter((w): w is NonNull<typeof w> => w !== null);
    return allWallets.filter((wallet) => isWalletChainCompatible(wallet, toToken.chainId));
  }, [primaryWallet, secondaryWallet, toToken?.chainId]);

  const toCompatibleAddress = useMemo(() => {
    // Check if recipientAddress is compatible with toToken chain
    if (recipientAddress && toToken?.chainId) {
      if (isAddressChainCompatible(recipientAddress, toToken.chainId)) {
        return recipientAddress;
      }
    }
    return null;
  }, [recipientAddress, toToken?.chainId]);

  const toCompatibleWalletIcon = useMemo(() => {
    if (!toCompatibleAddress) return null;
    // Find the wallet that matches this address
    const matchingWallet = toCompatibleWallets.find(
      (w) => w.address.toLowerCase() === toCompatibleAddress.toLowerCase()
    );
    return matchingWallet ? getWalletIconFromAccount(matchingWallet) : null;
  }, [toCompatibleAddress, toCompatibleWallets]);

  // Helper type for non-null
  type NonNull<T> = T extends null | undefined ? never : T;

  const handleToggleDetails = () => {
    setIsDetailsExpanded((prev) => !prev);
  };

  const handleFromWalletClick = () => {
    // Always allow opening dropdown to show compatible wallets or "Connect a new wallet"
    setIsFromWalletDropdownOpen((prev) => !prev);
  };

  const handleToWalletClick = () => {
    setIsToWalletDropdownOpen((prev) => !prev);
  };

  return (
    <div className="flex flex-col gap-2 sm:gap-2.5">
      <SwapTabs activeTab={activeTab} onTabChange={onTabChange} />

      <div className="bg-[#010501] border border-[#1f261e] rounded-2xl lg:rounded-3xl p-4 sm:p-5 lg:p-6 relative overflow-visible backdrop-blur-sm">
        {/* Top Edge Gradient Glow */}
        <div className="absolute top-0 left-0 right-0 h-px bg-[linear-gradient(to_right,transparent_0%,rgba(177,241,40,0.4)_50%,transparent_100%)]"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[2px] bg-[#b1f128]/20 blur-[2px]"></div>
        <div className="absolute -top-px left-1/2 -translate-x-1/2 w-1/2 h-[3px] bg-[#b1f128]/10 blur-sm"></div>

        <div className="flex flex-col gap-3 sm:gap-0 2xl:gap-4">
          {/* From / To group with arrow centered between them */}
          <div className="relative flex flex-col gap-3 sm:gap-4">
            {/* From Section */}
            <TokenInput
              type="from"
              token={fromToken}
              balance={fromBalance}
              balanceLoading={fromBalanceLoading}
              amount={fromAmount}
              usdValue={fromUsdValue}
              onTokenSelect={onFromTokenSelect}
              onMaxClick={onMaxClick}
              on25PercentClick={on25PercentClick}
              on50PercentClick={on50PercentClick}
              on75PercentClick={on75PercentClick}
              onAmountChange={onFromAmountChange}
              readOnlyAmount={false}
              walletLabel={fromCompatibleAddress ? undefined : "Select wallet"}
              walletIcon={fromCompatibleAddress ? (fromCompatibleWalletIcon || fromWalletIcon) : null}
              walletAddress={fromCompatibleAddress}
              onWalletClick={handleFromWalletClick}
              walletDropdown={
                <FromWalletDropdown
                  open={isFromWalletDropdownOpen}
                  onClose={() => setIsFromWalletDropdownOpen(false)}
                  onConnectNewWallet={onConnectFromSection || onConnectClick || (() => { })}
                  onSelectWallet={(address) => {
                    // Future: switch active wallet
                  }}
                  currentAddress={fromCompatibleAddress}
                  chainId={fromToken?.chainId} // Pass chainId for wallet filtering
                />
              }
              isQuoteLoading={isQuoteLoading && activeInput === 'to'}
            />

            {/* Swap Arrow - Absolutely positioned between From and To sections */}
            <div className="absolute left-1/2 -translate-x-1/2 md:top-[calc(50%-20px)] top-[calc(50%-15px)] z-10">
              <button
                onClick={onSwapTokens}
                disabled={!fromToken || !toToken}
                className="bg-[#1f261e] border-2 border-[#010501] p-1.5 sm:p-2 rounded-lg hover:bg-[#2a3229] transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Swap tokens"
              >
                <ArrowUpDown width={24} height={24} className="w-5 h-5 sm:w-6 sm:h-6 [&_path]:stroke-[#b1f128]" />
              </button>
            </div>

            {/* To Section */}
            <TokenInput
              type="to"
              token={toToken}
              balance={toBalance}
              balanceLoading={toBalanceLoading}
              amount={toAmount}
              usdValue={toUsdValue}
              onTokenSelect={onToTokenSelect}
              onAmountChange={onToAmountChange}
              walletLabel={toCompatibleAddress ? undefined : "Select wallet"}
              walletIcon={toCompatibleAddress ? (toCompatibleWalletIcon || toWalletIcon) : null}
              walletAddress={toCompatibleAddress}
              onWalletClick={handleToWalletClick}
              walletDropdown={
                <ToWalletDropdown
                  open={isToWalletDropdownOpen}
                  onClose={() => setIsToWalletDropdownOpen(false)}
                  onConnectNewWallet={onConnectClick || (() => { })}
                  onAddressSelect={(address) => {
                    onRecipientChange?.(address);
                  }}
                  chainId={toToken?.chainId}
                  currentRecipientAddress={recipientAddress}
                />
              }
              readOnlyAmount={false}
              isQuoteLoading={isQuoteLoading && activeInput === 'from'}
            />
          </div>

          {/* Limit Order Fields - Only shown in Limit tab */}
          {isLimit && (
            <LimitOrderFields
              fromToken={fromToken}
              limitPrice={limitPrice}
              limitPriceUsd={limitPriceUsd}
              expires={expires}
              customExpiryMinutes={customExpiryMinutes}
              hasValidFromAmount={hasValidFromAmount}
              onLimitPriceChange={onLimitPriceChange}
              onExpiresChange={onExpiresChange}
              onCustomExpiryChange={onCustomExpiryChange}
            />
          )}

          {/* Expandable details section - Available in both Swap and Limit tabs */}
          <SwapDetailsCard isExpanded={isDetailsExpanded} />

          {/* Show More / Show Less row - Available in both Swap and Limit tabs */}
          <button
            type="button"
            onClick={handleToggleDetails}
            className={`flex items-center justify-center gap-2 text-[#b5b5b5] text-sm sm:text-base cursor-pointer ${!isLimit ? "mt-3 sm:mt-4" : "mt-3 sm:mt-0"
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
              className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200 ${isDetailsExpanded ? "-scale-y-100" : ""
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
            fromAmount={fromAmount}
            fromCompatibleAddress={fromCompatibleAddress}
            toCompatibleAddress={toCompatibleAddress}
            fromTokenChainId={fromToken?.chainId}
            toTokenChainId={toToken?.chainId}
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

/**
 * 
 */