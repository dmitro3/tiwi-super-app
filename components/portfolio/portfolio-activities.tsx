"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Transaction } from "@/lib/backend/types/wallet";
import { useWalletTransactions } from "@/hooks/useWalletTransactions";
import { useWalletConnection } from "@/hooks/useWalletConnection";
import TransactionSkeleton from "@/components/ui/transaction-skeleton";

type TransactionTypeFilter = "all" | Transaction["type"];
type SortOption = "newest" | "oldest" | "amount-high" | "amount-low";

interface PortfolioActivitiesProps {
  className?: string;
}

/**
 * Portfolio Activities Component
 * Displays detailed transaction history with filtering and sorting
 */
export default function PortfolioActivities({ className = "" }: PortfolioActivitiesProps) {
  const { connectedAddress } = useWalletConnection();
  const { transactions, isLoading, error, hasMore, loadMore, isFetchingNextPage } = useWalletTransactions(
    connectedAddress,
    { limit: 50 }
  );

  const [typeFilter, setTypeFilter] = useState<TransactionTypeFilter>("all");
  const [chainFilter, setChainFilter] = useState<number | "all">("all");
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [searchQuery, setSearchQuery] = useState("");

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];

    // Filter by type
    if (typeFilter !== "all") {
      filtered = filtered.filter((tx) => tx.type === typeFilter);
    }

    // Filter by chain
    if (chainFilter !== "all") {
      filtered = filtered.filter((tx) => tx.chainId === chainFilter);
    }

    // Search by hash or address
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (tx) =>
          tx.hash.toLowerCase().includes(query) ||
          tx.from.toLowerCase().includes(query) ||
          tx.to.toLowerCase().includes(query)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortOption) {
        case "newest":
          return b.timestamp - a.timestamp;
        case "oldest":
          return a.timestamp - b.timestamp;
        case "amount-high": {
          const aAmount = parseFloat(a.amountFormatted || "0");
          const bAmount = parseFloat(b.amountFormatted || "0");
          return bAmount - aAmount;
        }
        case "amount-low": {
          const aAmount = parseFloat(a.amountFormatted || "0");
          const bAmount = parseFloat(b.amountFormatted || "0");
          return aAmount - bAmount;
        }
        default:
          return b.timestamp - a.timestamp;
      }
    });

    return filtered;
  }, [transactions, typeFilter, chainFilter, sortOption, searchQuery]);

  // Get unique chain IDs for filter (only include defined chainIds)
  const uniqueChains = useMemo(() => {
    const chains = new Set(transactions.map((tx) => tx.chainId).filter((id): id is number => id !== undefined));
    return Array.from(chains).sort();
  }, [transactions]);

  // Get unique transaction types for filter
  const uniqueTypes = useMemo(() => {
    const types = new Set(transactions.map((tx) => tx.type));
    return Array.from(types).sort();
  }, [transactions]);

  if (isLoading && transactions.length === 0) {
    return (
      <div className={className}>
        <div className="flex flex-col gap-4">
          {[...Array(5)].map((_, i) => (
            <TransactionSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className} flex flex-col items-center justify-center py-12`}>
        <p className="text-red-400 text-sm mb-4">Error loading transactions: {error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-[#B1F128] text-black rounded-lg font-medium hover:bg-[#9dd120] transition"
        >
          Retry
        </button>
      </div>
    );
  }

  if (filteredTransactions.length === 0 && transactions.length === 0) {
    return (
      <div className={`${className} flex flex-col items-center justify-center py-12`}>
        <p className="text-[#8A929A] text-sm">No transactions found</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Filters and Search */}
      <div className="flex flex-col gap-4 mb-6">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search by hash or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-[#151A15] border border-[#1B1B1B] rounded-lg text-white text-sm placeholder-[#8A929A] focus:outline-none focus:border-[#B1F128]"
          />
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap gap-2">
          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TransactionTypeFilter)}
            className="px-3 py-1.5 bg-[#151A15] border border-[#1B1B1B] rounded-lg text-white text-sm focus:outline-none focus:border-[#B1F128]"
          >
            <option value="all">All Types</option>
            {uniqueTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          {/* Chain Filter */}
          <select
            value={chainFilter}
            onChange={(e) => setChainFilter(e.target.value === "all" ? "all" : parseInt(e.target.value, 10))}
            className="px-3 py-1.5 bg-[#151A15] border border-[#1B1B1B] rounded-lg text-white text-sm focus:outline-none focus:border-[#B1F128]"
          >
            <option value="all">All Chains</option>
            {uniqueChains.map((chainId) => (
              <option key={chainId} value={chainId}>
                Chain {chainId}
              </option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as SortOption)}
            className="px-3 py-1.5 bg-[#151A15] border border-[#1B1B1B] rounded-lg text-white text-sm focus:outline-none focus:border-[#B1F128]"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="amount-high">Amount: High to Low</option>
            <option value="amount-low">Amount: Low to High</option>
          </select>
        </div>
      </div>

      {/* Transactions List */}
      <div className="flex flex-col gap-4">
        {filteredTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-[#8A929A] text-sm">No transactions match your filters</p>
          </div>
        ) : (
          filteredTransactions.map((tx) => (
            <TransactionCard key={tx.id} transaction={tx} />
          ))
        )}

        {/* Load More */}
        {hasMore && (
          <button
            onClick={loadMore}
            disabled={isFetchingNextPage}
            className="px-4 py-2 bg-[#151A15] border border-[#1B1B1B] rounded-lg text-white text-sm font-medium hover:bg-[#1A201A] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isFetchingNextPage ? "Loading..." : "Load More"}
          </button>
        )}

        {isFetchingNextPage && <TransactionSkeleton />}
      </div>
    </div>
  );
}

/**
 * Transaction Card Component
 * Displays individual transaction with all details
 */
function TransactionCard({ transaction }: { transaction: Transaction }) {
  const [expanded, setExpanded] = useState(false);
  const isPositive = ["Received", "Unstake"].includes(transaction.type);

  const formatAmount = (): string => {
    const sign = isPositive ? "+" : "-";
    return `${sign}${transaction.amountFormatted} ${transaction.tokenSymbol}`;
  };

  const formatUsdValue = (): string => {
    if (!transaction.usdValue) return "";
    const value = parseFloat(transaction.usdValue);
    if (isNaN(value)) return "";
    return `$${value.toFixed(2)}`;
  };

  return (
    <div className="bg-[#151A15] border border-[#1B1B1B] rounded-lg p-4 hover:border-[#B1F128]/30 transition">
      {/* Main Transaction Info */}
      <div className="flex justify-between items-start">
        {/* Left Side */}
        <div className="flex flex-col gap-2 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white capitalize">
              {transaction.type}
              {transaction.metadata?.dexName && (
                <span className="text-[#8A929A] text-xs ml-1">({transaction.metadata.dexName})</span>
              )}
              {transaction.metadata?.protocol && !transaction.metadata?.dexName && (
                <span className="text-[#8A929A] text-xs ml-1">({transaction.metadata.protocol})</span>
              )}
            </span>
            {transaction.status === "failed" && (
              <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded">Failed</span>
            )}
            {transaction.status === "pending" && (
              <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded">Pending</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-[#8A929A]">
            <span>{transaction.date}</span>
            {transaction.explorerUrl && (
              <>
                <span>•</span>
                <Link
                  href={transaction.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#B1F128] hover:underline"
                >
                  View on Explorer
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Right Side - Amount */}
        <div className="flex flex-col items-end gap-1">
          <span
            className={`text-sm font-bold ${
              isPositive ? "text-[#498F00]" : "text-white"
            }`}
          >
            {formatAmount()}
          </span>
          {formatUsdValue() && (
            <span className="text-xs text-[#8A929A]">{formatUsdValue()}</span>
          )}
        </div>
      </div>

      {/* Expandable Details */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-[#1B1B1B] space-y-2">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-[#8A929A]">From:</span>
              <span className="text-white ml-2 font-mono text-xs break-all">
                {transaction.from}
              </span>
            </div>
            <div>
              <span className="text-[#8A929A]">To:</span>
              <span className="text-white ml-2 font-mono text-xs break-all">
                {transaction.to}
              </span>
            </div>
            {transaction.blockNumber && (
              <div>
                <span className="text-[#8A929A]">Block:</span>
                <span className="text-white ml-2">{transaction.blockNumber.toLocaleString()}</span>
              </div>
            )}
            {transaction.gasFee && (
              <div>
                <span className="text-[#8A929A]">Gas Fee:</span>
                <span className="text-white ml-2">{transaction.gasFee}</span>
              </div>
            )}
            {transaction.chainId && (
              <div>
                <span className="text-[#8A929A]">Chain ID:</span>
                <span className="text-white ml-2">{transaction.chainId}</span>
              </div>
            )}
          </div>
          <div className="pt-2">
            <span className="text-[#8A929A] text-xs">Hash:</span>
            <span className="text-white text-xs font-mono ml-2 break-all">{transaction.hash}</span>
          </div>
        </div>
      )}

      {/* Expand/Collapse Button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-3 text-xs text-[#B1F128] hover:underline"
      >
        {expanded ? "Show Less" : "Show Details"}
      </button>
    </div>
  );
}


