/**
 * Wallet Transactions Hook (TanStack Query)
 * 
 * Fetches transaction history with pagination from the API
 * Uses TanStack Query's useInfiniteQuery for automatic pagination handling
 */

import { useInfiniteQuery } from '@tanstack/react-query';
import type { TransactionHistoryResponse, Transaction } from '@/lib/backend/types/wallet';

interface UseWalletTransactionsOptions {
  limit?: number;
}

interface UseWalletTransactionsReturn {
  transactions: Transaction[];
  total: number;
  hasMore: boolean;
  isLoading: boolean;
  isFetchingNextPage: boolean;
  error: string | null;
  loadMore: () => void;
  refetch: () => void;
}

/**
 * Query function to fetch wallet transactions
 */
async function fetchWalletTransactions({
  walletAddress,
  limit,
  offset,
}: {
  walletAddress: string;
  limit: number;
  offset: number;
}): Promise<TransactionHistoryResponse> {
  const params = new URLSearchParams({
    address: walletAddress,
    limit: limit.toString(),
    offset: offset.toString(),
  });

  const response = await fetch(
    `/api/v1/wallet/transactions?${params.toString()}`
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    
    if (response.status === 429) {
      throw new Error('Too many requests. Please try again later.');
    }
    
    throw new Error(
      errorData.error || `Failed to fetch transactions: ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Generate query key for wallet transactions
 */
function getWalletTransactionsQueryKey(
  walletAddress: string | null,
  limit: number
): readonly unknown[] {
  return ['wallet-transactions', walletAddress?.toLowerCase(), limit] as const;
}

/**
 * Hook to fetch wallet transaction history using TanStack Query's infinite query
 * 
 * @param walletAddress - Wallet address to fetch transactions for
 * @param options - Options including limit
 * @returns Transactions, pagination state, loading state, error, and refetch function
 */
export function useWalletTransactions(
  walletAddress: string | null,
  options: UseWalletTransactionsOptions = {}
): UseWalletTransactionsReturn {
  const { limit = 20 } = options;

  const {
    data,
    isLoading,
    isFetchingNextPage,
    error,
    fetchNextPage,
    hasNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: getWalletTransactionsQueryKey(walletAddress, limit),
    queryFn: ({ pageParam = 0 }) =>
      fetchWalletTransactions({
        walletAddress: walletAddress!,
        limit,
        offset: pageParam as number,
      }),
    enabled: !!walletAddress, // Only fetch if wallet address is provided
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      // If there are more transactions, return the next offset
      if (lastPage.hasMore) {
        return allPages.length * limit;
      }
      // No more pages
      return undefined;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - transactions are fresh for 5min
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache for 10min
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Flatten all pages into a single transactions array
  const transactions = data?.pages.flatMap((page) => page.transactions) || [];
  const total = data?.pages[0]?.total || 0;

  return {
    transactions,
    total,
    hasMore: hasNextPage ?? false,
    isLoading,
    isFetchingNextPage,
    error: error ? (error instanceof Error ? error.message : 'Failed to fetch transaction history') : null,
    loadMore: () => {
      if (hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    refetch: () => {
      refetch();
    },
  };
}

/**
 * Invalidate wallet transactions cache (useful for wallet disconnect)
 */
export function invalidateWalletTransactions(
  queryClient: ReturnType<typeof import('@tanstack/react-query').useQueryClient>,
  walletAddress: string | null
): void {
  if (walletAddress) {
    queryClient.invalidateQueries({
      queryKey: ['wallet-transactions', walletAddress.toLowerCase()],
    });
  }
}
