"use client";

import { useEffect } from "react";
import Image from "next/image";
import ViewPortfolioButton from "./view-portfolio-button";
import RewardClaimCard from "./reward-claim-card";
import TransactionHistory from "./transaction-history";
import { useWalletBalances } from "@/hooks/useWalletBalances";
import { useWalletTransactions } from "@/hooks/useWalletTransactions";
import { useBalanceVisibilityStore } from "@/lib/frontend/store/balance-visibility-store";
import Skeleton from "@/components/ui/skeleton";
import TransactionSkeleton from "@/components/ui/transaction-skeleton";

interface WalletBalancePanelProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
  walletIcon: string;
  onDisconnect: () => void;
}

/**
 * Wallet Balance Panel Component
 * Slides in from the right, displays wallet balance, rewards, and transaction history
 */
export default function WalletBalancePanel({
  isOpen,
  onClose,
  walletAddress,
  walletIcon,
  onDisconnect,
}: WalletBalancePanelProps) {
  // Use global balance visibility state
  const { isBalanceVisible, toggleBalanceVisibility } = useBalanceVisibilityStore();
  
  // Fetch wallet balances and transactions
  const { balances, totalUSD, isLoading: balancesLoading, error: balancesError } = useWalletBalances(walletAddress);
  const { 
    transactions, 
    isLoading: transactionsLoading, 
    isFetchingNextPage,
    error: transactionsError, 
    loadMore, 
    hasMore 
  } = useWalletTransactions(walletAddress);

  // Format address like Figma: 0x061...T432
  const formatWalletAddress = (address: string): string => {
    if (!address || address.length <= 10) return address;
    const withoutPrefix = address.startsWith("0x") ? address.slice(2) : address;
    if (withoutPrefix.length <= 7) return address;
    return `0x${withoutPrefix.slice(0, 3)}...${withoutPrefix.slice(-4)}`;
  };

  // Handle escape key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  // Copy address to clipboard
  const handleCopyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
    // TODO: Show toast notification
  };

  // Format USD value as currency
  const formatCurrency = (value: string): string => {
    const num = parseFloat(value);
    if (isNaN(num)) return "$0.00";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 lg:z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={`fixed right-0 top-0 h-full w-full lg:w-[400px] xl:w-[360px] 2xl:w-[400px] bg-[#010501] border-l border-[#1f261e] z-50 flex flex-col transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="border-b border-[#1f261e] flex items-center justify-between px-6 lg:px-4 xl:px-5 2xl:px-6 py-5 lg:py-4 xl:py-4.5 2xl:py-5 relative shrink-0 w-full">
          <div className="bg-[#121712] flex gap-2.5 lg:gap-2 xl:gap-2 2xl:gap-2.5 items-center justify-center pl-2 lg:pl-1.5 xl:pl-1.5 2xl:pl-2 pr-4 lg:pr-3 xl:pr-3.5 2xl:pr-4 py-2 lg:py-1.5 xl:py-1.5 2xl:py-2 relative rounded-full shrink-0">
            <div className="relative shrink-0 size-8 lg:size-6 xl:size-7 2xl:size-8">
              <Image
                src={walletIcon}
                alt="Wallet"
                width={32}
                height={32}
                className="w-full h-full object-contain rounded-full"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/assets/icons/wallet/wallet-04.svg';
                }}
              />
            </div>
            <p className="font-semibold leading-normal relative shrink-0 text-lg lg:text-sm xl:text-base 2xl:text-lg text-white tracking-[0.018px]">
              {formatWalletAddress(walletAddress)}
            </p>
            <button
              onClick={handleCopyAddress}
              className="relative shrink-0 size-6 lg:size-4 xl:size-5 2xl:size-6 cursor-pointer hover:opacity-80 transition-opacity"
              aria-label="Copy address"
            >
              <Image
                src="/assets/icons/wallet/copy-01.svg"
                alt="Copy"
                width={24}
                height={24}
                className="w-full h-full object-contain"
              />
            </button>
          </div>
          <div className="flex items-center gap-2 lg:gap-1.5 xl:gap-1.5 2xl:gap-2">
            {/* Mobile Close Button */}
            <button
              onClick={onClose}
              className="lg:hidden bg-[#0b0f0a] border border-[#1f261e] flex items-center p-3 lg:p-2.5 xl:p-2.5 2xl:p-3 relative rounded-full shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
              aria-label="Close"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-6 h-6 text-white"
              >
                <path
                  d="M18 6L6 18M6 6L18 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            {/* Disconnect Button */}
            <button
              onClick={onDisconnect}
              className="bg-[#0b0f0a] border border-[#1f261e] flex items-center p-3 lg:p-2.5 xl:p-2.5 2xl:p-3 relative rounded-full shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
              aria-label="Disconnect"
            >
              <div className="relative shrink-0 size-6 lg:size-4 xl:size-5 2xl:size-6">
                <Image
                  src="/assets/icons/wallet/logout-01.svg"
                  alt="Disconnect"
                  width={24}
                  height={24}
                  className="w-full h-full object-contain"
                />
              </div>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col items-start px-0 py-2 lg:py-1.5 xl:py-1.5 2xl:py-2 relative shrink-0 w-full overflow-y-auto">
          {/* Balance Section */}
          <div className="flex flex-col gap-6 lg:gap-4 xl:gap-5 2xl:gap-6 items-start px-6 lg:px-4 xl:px-5 2xl:px-6 py-0 relative shrink-0 w-full">
            <div className="flex flex-col items-start justify-center relative shrink-0">
              <div className="flex gap-2 lg:gap-1.5 xl:gap-1.5 2xl:gap-2 items-center justify-center px-0 py-1.5 lg:py-1 xl:py-1 2xl:py-1.5 relative shrink-0">
                <p className="font-medium leading-normal relative shrink-0 text-base lg:text-sm xl:text-sm 2xl:text-base text-[#b5b5b5]">
                  Total Balance
                </p>
                <button
                  onClick={toggleBalanceVisibility}
                  className="relative shrink-0 size-6 lg:size-4 xl:size-5 2xl:size-6 cursor-pointer hover:opacity-80 transition-opacity"
                  aria-label="Toggle balance visibility"
                >
                  <Image
                    src="/assets/icons/wallet/view.svg"
                    alt="View"
                    width={24}
                    height={24}
                    className="w-full h-full object-contain"
                  />
                </button>
              </div>
              <div className="flex items-center justify-center relative shrink-0">
                {balancesLoading ? (
                  <Skeleton width={150} height={48} rounded="sm" className="lg:w-[120px] xl:w-[140px] 2xl:w-[150px] lg:h-[36px] xl:h-[42px] 2xl:h-[48px]" />
                ) : balancesError ? (
                  <p className="font-bold leading-normal relative shrink-0 text-4xl lg:text-3xl xl:text-3.5xl 2xl:text-4xl text-center text-[#ff5c5c]">
                    Error
                  </p>
                ) : (
                  <p className="font-bold leading-normal relative shrink-0 text-4xl lg:text-3xl xl:text-3.5xl 2xl:text-4xl text-center text-white">
                    {isBalanceVisible ? formatCurrency(totalUSD) : "****"}
                  </p>
                )}
              </div>
              <div className="flex gap-2 lg:gap-1.5 xl:gap-1.5 2xl:gap-2 items-center relative shrink-0 text-lg lg:text-sm xl:text-base 2xl:text-lg text-center">
                {balancesLoading ? (
                  <Skeleton width={100} height={20} rounded="sm" />
                ) : (
                  <>
                    <p className="font-semibold leading-[26px] lg:leading-[18px] xl:leading-[22px] 2xl:leading-[26px] relative shrink-0 text-[#3fea9b]">
                      {isBalanceVisible ? "+$0.00 (0.00%)" : "****"}
                    </p>
                    {isBalanceVisible && (
                      <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-solid font-medium leading-[22px] lg:leading-[15px] xl:leading-[18px] 2xl:leading-[22px] relative shrink-0 text-[#9da4ae] underline">
                        today
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Action Cards */}
            <div className="flex flex-col gap-2 lg:gap-1.5 xl:gap-1.5 2xl:gap-2 items-start relative shrink-0 w-full">
              <ViewPortfolioButton onNavigate={onClose} />
              <RewardClaimCard onNavigate={onClose} />
            </div>
          </div>

          {/* Transaction History Section */}
          <div className="flex flex-col h-[637px] lg:h-[463px] xl:h-[520px] 2xl:h-[637px] items-start px-0 py-2 lg:py-1.5 xl:py-1.5 2xl:py-2 relative rounded-bl-2xl lg:rounded-bl-xl xl:rounded-bl-xl 2xl:rounded-bl-2xl rounded-br-2xl lg:rounded-br-xl xl:rounded-br-xl 2xl:rounded-br-2xl shrink-0 w-full">
            <div className="border-b-[0.5px] border-[#1f261e] flex gap-4 lg:gap-3 xl:gap-3.5 2xl:gap-4 items-center px-6 lg:px-4 xl:px-5 2xl:px-6 py-2 lg:py-1.5 xl:py-1.5 2xl:py-2 relative shrink-0 w-full">
              <div className="flex items-center justify-center relative shrink-0">
                <p className="font-medium leading-normal relative shrink-0 text-[#b5b5b5] text-lg lg:text-sm xl:text-base 2xl:text-lg">
                  Recent history
                </p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto w-full">
              {transactionsLoading && transactions.length === 0 ? (
                <div className="flex flex-col items-start w-full">
                  {[...Array(3)].map((_, i) => (
                    <TransactionSkeleton key={i} />
                  ))}
                </div>
              ) : transactionsError ? (
                <div className="flex flex-col gap-4 lg:gap-3 xl:gap-3.5 2xl:gap-4 items-center justify-center relative shrink-0 py-8 lg:py-6 xl:py-7 2xl:py-8">
                  <p className="font-medium leading-normal relative shrink-0 text-base lg:text-sm xl:text-sm 2xl:text-base text-center text-[#ff5c5c]">
                    {transactionsError}
                  </p>
                </div>
              ) : (
                <TransactionHistory 
                  transactions={transactions} 
                  hasMore={hasMore}
                  onLoadMore={loadMore}
                  isLoadingMore={isFetchingNextPage}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

