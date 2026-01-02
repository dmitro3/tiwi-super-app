"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import type { Transaction } from "@/lib/backend/types/wallet";
import TransactionSkeleton from "@/components/ui/transaction-skeleton";
import { useBalanceVisibilityStore } from "@/lib/frontend/store/balance-visibility-store";

interface TransactionHistoryProps {
  transactions: Transaction[];
  hasMore?: boolean;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
}

/**
 * Transaction History Component
 * Displays list of transactions or empty state
 */
export default function TransactionHistory({ 
  transactions, 
  hasMore = false,
  onLoadMore,
  isLoadingMore = false,
}: TransactionHistoryProps) {
  const { isBalanceVisible } = useBalanceVisibilityStore();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Handle infinite scroll
  useEffect(() => {
    if (!hasMore || !onLoadMore) return;

    const lastElement = scrollContainerRef.current?.lastElementChild;
    if (!lastElement) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    observerRef.current.observe(lastElement);

    return () => {
      if (observerRef.current && lastElement) {
        observerRef.current.unobserve(lastElement);
      }
    };
  }, [hasMore, onLoadMore, isLoadingMore, transactions.length]);

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col gap-4 lg:gap-3 xl:gap-3.5 2xl:gap-4 items-center justify-center relative shrink-0 py-8 lg:py-6 xl:py-7 2xl:py-8">
        <div className="relative shrink-0 size-8 lg:size-6 xl:size-7 2xl:size-8">
          <Image
            src="/assets/icons/wallet/file-empty-01.svg"
            alt="Empty"
            width={32}
            height={32}
            className="w-full h-full object-contain"
          />
        </div>
        <p className="font-medium leading-normal relative shrink-0 text-base lg:text-sm xl:text-sm 2xl:text-base text-center text-[#b5b5b5]">
          No transactions found.
        </p>
      </div>
    );
  }

  // Format transaction amount with sign
  const formatAmount = (transaction: Transaction): string => {
    const isPositive = ['Received', 'Unstake'].includes(transaction.type);
    const sign = isPositive ? '+' : '-';
    const amount = transaction.amountFormatted || '0';
    return `${sign}${amount} ${transaction.tokenSymbol}`;
  };

  // Format USD value
  const formatUsdValue = (transaction: Transaction): string => {
    if (!transaction.usdValue) return '';
    const value = parseFloat(transaction.usdValue);
    if (isNaN(value)) return '';
    return `$${value.toFixed(2)}`;
  };

  return (
    <div className="flex flex-col items-start w-full" ref={scrollContainerRef}>
      {transactions.map((transaction) => {
        const isPositive = ['Received', 'Unstake'].includes(transaction.type);
        const amountColor = isPositive ? "text-[#3fea9b]" : "text-white";
        const amount = formatAmount(transaction);
        const usdValue = formatUsdValue(transaction);

        return (
          <div
            key={transaction.id}
            className="flex items-center justify-between px-6 lg:px-4 xl:px-5 2xl:px-6 py-4 lg:py-3 xl:py-3.5 2xl:py-4 relative shrink-0 w-full"
          >
            <div className="flex gap-2 lg:gap-1.5 xl:gap-1.5 2xl:gap-2 items-center relative shrink-0 w-[142px] lg:w-[103px] xl:w-[116px] 2xl:w-[142px]">
              <div className="flex flex-1 flex-col gap-1 lg:gap-0.5 xl:gap-0.5 2xl:gap-1 items-start justify-center min-h-0 min-w-0 relative shrink-0">
                <div className="flex flex-col font-medium justify-center leading-[0] relative shrink-0 text-lg lg:text-sm xl:text-base 2xl:text-lg text-right text-white whitespace-nowrap">
                  <p className="leading-5 lg:leading-[14px] xl:leading-4 2xl:leading-5">
                    {transaction.type}
                    {transaction.metadata?.dexName && (
                      <span className="text-[#8a929a] text-sm lg:text-xs xl:text-xs 2xl:text-sm ml-1">
                        ({transaction.metadata.dexName})
                      </span>
                    )}
                    {transaction.metadata?.protocol && !transaction.metadata?.dexName && (
                      <span className="text-[#8a929a] text-sm lg:text-xs xl:text-xs 2xl:text-sm ml-1">
                        ({transaction.metadata.protocol})
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex gap-0.5 lg:gap-0 xl:gap-0 2xl:gap-0.5 items-start relative shrink-0 w-full">
                  <div className="flex flex-col font-medium justify-center leading-[0] relative shrink-0 text-base lg:text-xs xl:text-sm 2xl:text-base text-right text-[#8a929a] whitespace-nowrap">
                    <p className="leading-5 lg:leading-[14px] xl:leading-4 2xl:leading-5">{transaction.date}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-1 lg:gap-0.5 xl:gap-0.5 2xl:gap-1 items-end justify-center leading-[0] relative shrink-0 text-right whitespace-nowrap">
              <div className="flex flex-col font-bold justify-center relative shrink-0 text-lg lg:text-sm xl:text-base 2xl:text-lg">
                <p className={`leading-5 lg:leading-[14px] xl:leading-4 2xl:leading-5 ${amountColor}`}>
                  {isBalanceVisible ? amount : "****"}
                </p>
              </div>
              {isBalanceVisible && usdValue && (
                <div className="flex flex-col font-medium justify-center relative shrink-0 text-base lg:text-xs xl:text-sm 2xl:text-base text-[#8a929a]">
                  <p className="leading-5 lg:leading-[14px] xl:leading-4 2xl:leading-5">{usdValue}</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
      {isLoadingMore && (
        <TransactionSkeleton />
      )}
    </div>
  );
}

