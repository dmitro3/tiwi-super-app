/**
 * Wallet Balances Hook (TanStack Query)
 * 
 * Fetches wallet token balances with USD values from the API
 * Uses TanStack Query for automatic caching, request deduplication, and background refetching
 */

import { useQuery } from '@tanstack/react-query';
import type { WalletBalanceResponse } from '@/lib/backend/types/wallet';

interface UseWalletBalancesReturn {
  balances: WalletBalanceResponse['balances'];
  totalUSD: string;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Query function to fetch wallet balances
 */
async function fetchWalletBalances(walletAddress: string): Promise<WalletBalanceResponse> {
  const response = await fetch(
    `/api/v1/wallet/balances?address=${encodeURIComponent(walletAddress)}`
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    
    if (response.status === 429) {
      throw new Error('Too many requests. Please try again later.');
    }
    
    throw new Error(
      errorData.error || `Failed to fetch balances: ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Generate query key for wallet balances
 */
function getWalletBalancesQueryKey(walletAddress: string | null): readonly unknown[] {
  return ['wallet-balances', walletAddress?.toLowerCase()] as const;
}

/**
 * Hook to fetch wallet balances using TanStack Query
 * 
 * @param walletAddress - Wallet address to fetch balances for
 * @returns Wallet balances, total USD, loading state, error, and refetch function
 */
export function useWalletBalances(
  walletAddress: string | null
): UseWalletBalancesReturn {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: getWalletBalancesQueryKey(walletAddress),
    queryFn: () => fetchWalletBalances(walletAddress!),
    enabled: !!walletAddress, // Only fetch if wallet address is provided
    staleTime: 30 * 1000, // 30 seconds - balances are fresh for 30s
    gcTime: 5 * 60 * 1000, // 5 minutes - keep in cache for 5min
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  return {
    balances: data?.balances || [],
    totalUSD: data?.totalUSD || '0.00',
    isLoading,
    error: error ? (error instanceof Error ? error.message : 'Failed to fetch wallet balances') : null,
    refetch: () => {
      refetch();
    },
  };
}

/**
 * Invalidate wallet balances cache (useful for wallet disconnect)
 */
export function invalidateWalletBalances(
  queryClient: ReturnType<typeof import('@tanstack/react-query').useQueryClient>,
  walletAddress: string | null
): void {
  if (walletAddress) {
    queryClient.invalidateQueries({
      queryKey: getWalletBalancesQueryKey(walletAddress),
    });
  }
}
