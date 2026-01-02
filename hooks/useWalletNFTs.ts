/**
 * Wallet NFTs Hook (TanStack Query)
 * 
 * Fetches wallet NFTs across multiple chains from the API
 * Uses TanStack Query for automatic caching, request deduplication, and background refetching
 */

import { useQuery } from '@tanstack/react-query';
import type { NFT } from '@/lib/backend/types/nft';

interface WalletNFTsResponse {
  nfts: NFT[];
  total: number;
  address: string;
  chains: number[];
  timestamp: number;
}

interface UseWalletNFTsReturn {
  nfts: NFT[];
  isLoading: boolean;
  isFetching: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Query function to fetch wallet NFTs
 * Exported for use in prefetching
 */
export async function fetchWalletNFTs(
  walletAddress: string,
  chainIds?: number[]
): Promise<WalletNFTsResponse> {
  const chainsParam = chainIds?.length 
    ? `&chains=${chainIds.join(',')}`
    : '';
  
  const response = await fetch(
    `/api/v1/nft/wallet?address=${encodeURIComponent(walletAddress)}${chainsParam}`
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    
    if (response.status === 429) {
      throw new Error('Too many requests. Please try again later.');
    }
    
    throw new Error(
      errorData.error || `Failed to fetch NFTs: ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Generate query key for wallet NFTs
 * Exported for use in prefetching
 */
export function getWalletNFTsQueryKey(
  walletAddress: string | null,
  chainIds?: number[]
): readonly unknown[] {
  return ['wallet-nfts', walletAddress?.toLowerCase(), chainIds] as const;
}

/**
 * Hook to fetch wallet NFTs using TanStack Query
 * 
 * @param walletAddress - Wallet address to fetch NFTs for
 * @param chainIds - Optional array of chain IDs to fetch (defaults to all major chains)
 * @returns Wallet NFTs, loading state, error, and refetch function
 */
export function useWalletNFTs(
  walletAddress: string | null,
  chainIds?: number[]
): UseWalletNFTsReturn {
  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: getWalletNFTsQueryKey(walletAddress, chainIds),
    queryFn: () => fetchWalletNFTs(walletAddress!, chainIds),
    enabled: !!walletAddress, // Only fetch if wallet address is provided
    staleTime: 5 * 60 * 1000, // 5 minutes - NFTs are fresh for 5min
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache for 10min
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Enhanced loading state: show skeleton if loading OR fetching without data
  const hasData = !!data;
  const showSkeleton = isLoading || (isFetching && !hasData);

  return {
    nfts: data?.nfts || [],
    isLoading: showSkeleton,
    isFetching,
    error: error ? (error instanceof Error ? error.message : 'Failed to fetch NFTs') : null,
    refetch: () => {
      refetch();
    },
  };
}

/**
 * Invalidate wallet NFTs cache (useful for wallet disconnect)
 */
export function invalidateWalletNFTs(
  queryClient: ReturnType<typeof import('@tanstack/react-query').useQueryClient>,
  walletAddress: string | null,
  chainIds?: number[]
): void {
  if (walletAddress) {
    queryClient.invalidateQueries({
      queryKey: getWalletNFTsQueryKey(walletAddress, chainIds),
    });
  }
}


