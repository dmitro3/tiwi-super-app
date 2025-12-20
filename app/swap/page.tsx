"use client";

import { useState, useEffect } from "react";
import TradingChart from "@/components/swap/trading-chart";
import SwapCard from "@/components/swap/swap-card";
import SwapBackgroundElements from "@/components/swap/swap-background-elements";
import { useWalletConnection } from "@/hooks/useWalletConnection";
import ConnectWalletModal from "@/components/wallet/connect-wallet-modal";
import WalletConnectedToast from "@/components/wallet/wallet-connected-toast";
import TokenSelectorModal from "@/components/swap/token-selector-modal";
import { sanitizeDecimal, parseNumber } from "@/lib/shared/utils/number";
import {
  calculateFromUsdValue,
  calculateToUsdValue,
  calculateLimitPriceUsd,
} from "@/lib/frontend/calculations/swap";
import { useSwapQuote } from "@/hooks/useSwapQuote";
import { useSwapStore } from "@/lib/frontend/store/swap-store";
import type { Token } from "@/lib/frontend/types/tokens";
import { MOCK_TOKENS } from "@/data/mock-tokens";

export default function SwapPage() {
  // ===== Zustand Store State =====
  // Read swap state from store
  const activeTab = useSwapStore((state) => state.activeTab);
  const fromToken = useSwapStore((state) => state.fromToken);
  const toToken = useSwapStore((state) => state.toToken);
  const fromAmount = useSwapStore((state) => state.fromAmount);
  const toAmount = useSwapStore((state) => state.toAmount);
  const limitPrice = useSwapStore((state) => state.limitPrice);
  const expires = useSwapStore((state) => state.expires);
  const isQuoteLoading = useSwapStore((state) => state.isQuoteLoading);

  // Get store actions
  const setActiveTab = useSwapStore((state) => state.setActiveTab);
  const setFromToken = useSwapStore((state) => state.setFromToken);
  const setToToken = useSwapStore((state) => state.setToToken);
  const setFromAmount = useSwapStore((state) => state.setFromAmount);
  const setLimitPrice = useSwapStore((state) => state.setLimitPrice);
  const setExpires = useSwapStore((state) => state.setExpires);
  const setToAmount = useSwapStore((state) => state.setToAmount);
  const setQuoteLoading = useSwapStore((state) => state.setQuoteLoading);

  // Initialize default fromToken on mount
  // useEffect(() => {
  //   if (!fromToken) {
  //     const defaultToken = MOCK_TOKENS.find((t) => t.id === "twc") || null;
  //     if (defaultToken) {
  //       setFromToken(defaultToken);
  //     }
  //   }
  // }, [fromToken, setFromToken]);

  // Use custom hook for quote calculation (updates store)
  useSwapQuote({
    fromAmount,
    activeTab,
    setToAmount,
    setQuoteLoading,
  });

  // Token selector modal state (stays local - UI only)
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [tokenModalType, setTokenModalType] = useState<"from" | "to">("from");

  // Wallet connection state
  const {
    isModalOpen,
    isToastOpen,
    connectedAddress,
    openModal,
    closeModal,
    connectWallet,
    closeToast,
  } = useWalletConnection();

  // ===== Event Handlers =====
  
  const handleTabChange = (tab: "swap" | "limit") => {
    setActiveTab(tab);
  };

  const handleFromTokenSelect = () => {
    setTokenModalType("from");
    setIsTokenModalOpen(true);
  };

  const handleToTokenSelect = () => {
    setTokenModalType("to");
    setIsTokenModalOpen(true);
  };

  const handleTokenSelect = (token: Token) => {
    if (tokenModalType === "from") {
      setFromToken(token);
      // TODO: When token changes, make API call with new token address and current amount
      // Example: if (fromAmount) { fetchQuote(token.address, fromAmount); }
    } else {
      setToToken(token);
    }
    setIsTokenModalOpen(false);
  };

  const handleFromAmountChange = (value: string) => {
    // Sanitize input and update store
    setFromAmount(sanitizeDecimal(value));
  };

  // Note: toAmount is read-only (derived from quote), so handleToAmountChange is removed
  // The onToAmountChange prop is kept for API compatibility but won't be called

  const handleLimitPriceChange = (value: string) => {
    setLimitPrice(sanitizeDecimal(value));
  };

  const handleMaxClick = () => {
    // TODO: Implement max amount logic
    // This will call store.setMaxAmount() once balance fetching is implemented
    console.log("Max clicked");
  };

  const handleSwapClick = () => {
    // TODO: Implement swap functionality
    console.log("Swap clicked");
  };

  const handleConnectClick = () => {
    openModal();
  };


  // Calculate USD values using utility functions
  const fromAmountNum = parseNumber(fromAmount);
  const toAmountNum = parseNumber(toAmount);
  const limitPriceNum = parseNumber(limitPrice);

  const fromUsdValue = calculateFromUsdValue(fromAmountNum);
  const toUsdValue = isQuoteLoading
    ? "Fetching quote..."
    : calculateToUsdValue(toAmountNum);
  const limitPriceUsd = calculateLimitPriceUsd(limitPriceNum);

  return (
    <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-10 py-4 sm:py-5 md:py-6 lg:py-8 relative z-20 min-h-screen">
      {/* Cards Container - Relative positioning for background elements tied to cards */}
      <div className="relative z-30">
        {/* Background elements positioned relative to cards container */}
        <SwapBackgroundElements />

        <div className="flex flex-col lg:flex-row lg:items-start gap-3 sm:gap-4 lg:gap-5 xl:gap-6 relative z-30 pb-[80px] sm:pb-[95px] md:pb-[110px] lg:pb-[125px] xl:pb-[145px] 2xl:pb-[160px]">
          {/* Chart Section - Left Side (Desktop) */}
          <div className="flex-1 order-2 lg:order-1 hidden lg:block relative z-30">
            <TradingChart />
          </div>

          {/* Swap / Limit Interface - Right Side (Desktop) */}
          <div className="w-full lg:w-[480px] xl:w-[540px] 2xl:w-[606px] order-1 lg:order-2 relative z-30">
            {/* Mobile Chart Section */}
            <div className="lg:hidden mb-3 sm:mb-4 relative z-30">
              <TradingChart />
            </div>

            {/* Swap / Limit Card */}
            <SwapCard
              activeTab={activeTab}
              fromToken={fromToken ? {
                symbol: fromToken.symbol,
                chain: fromToken.chain,
                icon: fromToken.logo,
                chainBadge: fromToken.chainLogo,
              } : undefined}
              toToken={toToken ? {
                symbol: toToken.symbol,
                chain: toToken.chain,
                icon: toToken.logo,
                chainBadge: toToken.chainLogo,
              } : undefined}
              fromBalance={fromToken?.balance || "0.00"}
              fromAmount={fromAmount}
              fromUsdValue={fromUsdValue}
              toBalance={toToken?.balance || "0.00"}
              toAmount={toAmount}
              toUsdValue={isQuoteLoading ? "Fetching quote..." : toUsdValue}
              limitPrice={limitPrice}
              limitPriceUsd={limitPriceUsd}
              expires={expires}
              onTabChange={handleTabChange}
              onFromTokenSelect={handleFromTokenSelect}
              onToTokenSelect={handleToTokenSelect}
              onFromAmountChange={handleFromAmountChange}
              onLimitPriceChange={handleLimitPriceChange}
              onExpiresChange={setExpires}
              onMaxClick={handleMaxClick}
              onSwapClick={handleSwapClick}
              onConnectClick={handleConnectClick}
              isConnected={!!connectedAddress}
            />
          </div>
        </div>
      </div>

      {/* Connect Wallet Modal */}
      <ConnectWalletModal
        open={isModalOpen}
        onOpenChange={closeModal}
        onWalletConnect={connectWallet}
      />

      {/* Wallet Connected Toast */}
      {connectedAddress && (
        <WalletConnectedToast
          address={connectedAddress}
          open={isToastOpen}
          onOpenChange={closeToast}
          duration={5000}
        />
      )}

      {/* Token Selector Modal */}
      <TokenSelectorModal
        open={isTokenModalOpen}
        onOpenChange={setIsTokenModalOpen}
        onTokenSelect={handleTokenSelect}
        selectedToken={tokenModalType === "from" ? fromToken : toToken}
      />
    </div>
  );
}