/**
 * Token Balance Hook (TanStack Query)
 * 
 * Fetches balance for a specific token from wallet balances API
 * Uses TanStack Query for automatic caching and request deduplication
 */

import { useQuery } from '@tanstack/react-query';
import type { WalletBalanceResponse, WalletToken } from '@/lib/backend/types/wallet';

interface UseTokenBalanceReturn {
  balance: string;
  balanceFormatted: string;
  usdValue: string;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Query function to fetch wallet balances and extract specific token
 */
async function fetchTokenBalance({
  walletAddress,
  tokenAddress,
  chainId,
}: {
  walletAddress: string;
  tokenAddress: string;
  chainId: number;
}): Promise<WalletToken | null> {
  const params = new URLSearchParams({
    address: walletAddress,
    chains: chainId.toString(),
  });

  const response = await fetch(
    `/api/v1/wallet/balances?${params.toString()}`
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    
    if (response.status === 429) {
      throw new Error('Too many requests. Please try again later.');
    }
    
    throw new Error(
      errorData.error || `Failed to fetch token balance: ${response.statusText}`
    );
  }

  const result: WalletBalanceResponse = await response.json();
  
  // Find the matching token
  const tokenAddressLower = tokenAddress.toLowerCase();
  const token = result.balances?.find((t: WalletToken) => 
    t.address.toLowerCase() === tokenAddressLower && t.chainId === chainId
  );

  if (token) {
    return token;
  }

  // Token not found in wallet - return zero balance token
  return {
    address: tokenAddress,
    symbol: '',
    name: '',
    decimals: 18,
    balance: '0',
    balanceFormatted: '0.00',
    chainId,
    usdValue: '0.00',
  };
}

/**
 * Generate query key for token balance
 */
function getTokenBalanceQueryKey(
  walletAddress: string | null,
  tokenAddress: string | undefined,
  chainId: number | undefined
): readonly unknown[] {
  return [
    'token-balance',
    walletAddress?.toLowerCase(),
    chainId,
    tokenAddress?.toLowerCase(),
  ] as const;
}

/**
 * Hook to fetch token balance for a specific token using TanStack Query
 * 
 * @param walletAddress - Wallet address
 * @param tokenAddress - Token contract address
 * @param chainId - Chain ID
 * @returns Token balance, formatted balance, USD value, loading state, error, and refetch function
 */
export function useTokenBalance(
  walletAddress: string | null,
  tokenAddress: string | undefined,
  chainId: number | undefined
): UseTokenBalanceReturn {
  const {
    data: tokenData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: getTokenBalanceQueryKey(walletAddress, tokenAddress, chainId),
    queryFn: () =>
      fetchTokenBalance({
        walletAddress: walletAddress!,
        tokenAddress: tokenAddress!,
        chainId: chainId!,
      }),
    enabled: !!walletAddress && !!tokenAddress && chainId !== undefined,
    staleTime: 30 * 1000, // 30 seconds - token balance is fresh for 30s
    gcTime: 5 * 60 * 1000, // 5 minutes - keep in cache for 5min
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  return {
    balance: tokenData?.balance || '0',
    balanceFormatted: tokenData?.balanceFormatted || '0.00',
    usdValue: tokenData?.usdValue || '0.00',
    isLoading,
    error: error ? (error instanceof Error ? error.message : 'Failed to fetch token balance') : null,
    refetch: () => {
      refetch();
    },
  };
}
