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
  dailyChange?: number;
  dailyChangeUSD?: string;
  isLoading: boolean;
  isFetching: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Supported chains for balance fetching (ALL chains supported by Moralis)
 * This matches CHAIN_NAME_MAP from moralis-rest-client.ts
 */
const SUPPORTED_CHAINS = [
  { chain: 'eth', chainId: 1, name: 'Ethereum' },
  { chain: 'optimism', chainId: 10, name: 'Optimism' },
  { chain: 'bsc', chainId: 56, name: 'BSC' },
  { chain: 'polygon', chainId: 137, name: 'Polygon' },
  { chain: 'arbitrum', chainId: 42161, name: 'Arbitrum' },
  { chain: 'avalanche', chainId: 43114, name: 'Avalanche' },
  { chain: 'base', chainId: 8453, name: 'Base' },
  { chain: 'fantom', chainId: 250, name: 'Fantom' },
  { chain: 'gnosis', chainId: 100, name: 'Gnosis' },
  { chain: 'polygon-zkevm', chainId: 1101, name: 'Polygon zkEVM' },
  { chain: 'zksync', chainId: 324, name: 'zkSync Era' },
  { chain: 'mantle', chainId: 5000, name: 'Mantle' },
  { chain: 'linea', chainId: 59144, name: 'Linea' },
  { chain: 'scroll', chainId: 534352, name: 'Scroll' },
];

/**
 * Query function to fetch wallet balances
 * Uses the same logic as sample code - fetches from /api/tokens for each chain in parallel
 * Exported for use in prefetching
 */
export async function fetchWalletBalances(walletAddress: string): Promise<WalletBalanceResponse> {
  if (!walletAddress) {
    throw new Error('Wallet address is required');
  }

  const allTokenBalances: any[] = [];

  // Fetch balances for all chains in parallel (matching sample code pattern)
  const chainPromises = SUPPORTED_CHAINS.map(async (chainConfig) => {
    try {
      const apiUrl = `/api/tokens?address=${encodeURIComponent(walletAddress)}&chain=${chainConfig.chain}`;
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();

        if (data.success && data.result && data.result.length > 0) {
          // Convert API response to WalletToken format
          data.result.forEach((token: any) => {
            const balance = parseFloat(token.balance || "0");
            
            // Only add tokens that actually have balance > 0 (use very low threshold to catch all tokens)
            // API already filters zero balances, but we double-check with a very low threshold
            if (balance > 0) {
              // Use the formatted balance from API (already calculated with proper decimals)
              const balanceFormatted = token.balance || "0";
              
              // Use chainId from token if available (more accurate), otherwise use chainConfig
              const tokenChainId = token.chainIdNumber || chainConfig.chainId;
              
              const walletToken = {
                address: token.token_address || token.contract_address || 'native',
                symbol: token.symbol || 'UNKNOWN',
                name: token.name || 'Unknown Token',
                decimals: 18, // Default, API calculates balance correctly regardless
                balance: balanceFormatted, // Use formatted balance string
                balanceFormatted: balanceFormatted, // Same as balance (already formatted)
                chainId: tokenChainId, // Use chainId from token to ensure accuracy
                chain: token.chain || chainConfig.name, // Include chain name for display
                logoURI: token.logo || token.logoUrl || undefined,
                usdValue: (token.usdValue || 0).toFixed(2),
                priceUSD: (token.price || 0).toFixed(6),
              };
              
              allTokenBalances.push(walletToken);
            }
          });
        }
      } else {
        // API returned error, but continue with other chains (non-blocking)
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error || `HTTP ${response.status}`;
        
        // Log errors but don't block other chains
        if (errorMsg && !errorMsg.includes("API key not configured")) {
          console.warn(`[Balance] ⚠️ ${chainConfig.name}: ${errorMsg}`);
        }
      }
    } catch (apiError: any) {
      // API call failed, but continue with other chains (non-blocking)
      const errorMsg = apiError?.message || String(apiError);
      if (!errorMsg.includes("Failed to fetch") && !errorMsg.includes("API key")) {
        console.warn(`[Balance] ⚠️ ${chainConfig.name}: API call failed - ${errorMsg.substring(0, 100)}`);
      }
    }
  });

  await Promise.all(chainPromises);

  // Deduplicate tokens based on chainId + address to prevent mixing up tokens
  // This ensures tokens are unique per chain and address combination
  // Prevents issues like BNB showing as Kronos or tokens mixing between chains
  const tokenMap = new Map<string, any>();
  
  allTokenBalances.forEach((token) => {
    // Create unique key: chainId-address (case-insensitive)
    // This ensures tokens with same address on different chains are kept separate
    const addressKey = (token.address || '').toLowerCase();
    const key = `${token.chainId}-${addressKey}`;
    
    // If token already exists, keep the one with higher USD value (more accurate)
    const existing = tokenMap.get(key);
    if (!existing || parseFloat(token.usdValue || "0") > parseFloat(existing.usdValue || "0")) {
      tokenMap.set(key, token);
    }
  });
  
  // Convert map back to array
  const deduplicatedBalances = Array.from(tokenMap.values());

  // Calculate total USD value
  const totalUsd = deduplicatedBalances.reduce((sum, token) => {
    return sum + (parseFloat(token.usdValue || "0"));
  }, 0);

  // Get unique chain IDs
  const chainIds = Array.from(new Set(deduplicatedBalances.map(token => token.chainId)));

  return {
    address: walletAddress,
    balances: deduplicatedBalances,
    totalUSD: totalUsd.toFixed(2),
    chains: chainIds,
    timestamp: Date.now(),
  };
}

/**
 * Generate query key for wallet balances
 * Exported for use in prefetching
 */
export function getWalletBalancesQueryKey(walletAddress: string | null): readonly unknown[] {
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
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: getWalletBalancesQueryKey(walletAddress),
    queryFn: () => fetchWalletBalances(walletAddress!),
    enabled: !!walletAddress, // Only fetch if wallet address is provided
    staleTime: 2 * 60 * 1000, // 2 minutes - balances are fresh for 2min (reduced API calls)
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache for 10min
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Enhanced loading state: show skeleton if loading OR fetching without data
  const hasData = !!data;
  const showSkeleton = isLoading || (isFetching && !hasData);

  return {
    balances: data?.balances || [],
    totalUSD: data?.totalUSD || '0.00',
    dailyChange: data?.dailyChange,
    dailyChangeUSD: data?.dailyChangeUSD,
    isLoading: showSkeleton,
    isFetching,
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
