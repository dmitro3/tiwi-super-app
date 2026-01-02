/**
 * NFT Activity Hook (TanStack Query)
 * 
 * Fetches NFT activity (transfers, sales) for a specific NFT
 * Uses TanStack Query for automatic caching and request deduplication
 */

import { useQuery } from '@tanstack/react-query';
import type { NFTActivity } from '@/lib/backend/types/nft';

interface NFTActivityResponse {
  activities: NFTActivity[];
  total: number;
  address: string;
  contractAddress: string;
  tokenId: string;
  chainId: number;
  timestamp: number;
}

interface UseNFTActivityReturn {
  activities: NFTActivity[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Query function to fetch NFT activity
 */
async function fetchNFTActivity(
  walletAddress: string,
  contractAddress: string,
  tokenId: string,
  chainId: number
): Promise<NFTActivityResponse> {
  const params = new URLSearchParams({
    address: walletAddress,
    contractAddress,
    tokenId,
    chainId: chainId.toString(),
  });

  const response = await fetch(
    `/api/v1/nft/activity?${params.toString()}`
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    
    if (response.status === 429) {
      throw new Error('Too many requests. Please try again later.');
    }
    
    throw new Error(
      errorData.error || `Failed to fetch NFT activity: ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Generate query key for NFT activity
 */
function getNFTActivityQueryKey(
  walletAddress: string | null,
  contractAddress: string | null,
  tokenId: string | null,
  chainId: number | null
): readonly unknown[] {
  return [
    'nft-activity',
    walletAddress?.toLowerCase(),
    contractAddress?.toLowerCase(),
    tokenId,
    chainId,
  ] as const;
}

/**
 * Hook to fetch NFT activity using TanStack Query
 * 
 * @param walletAddress - Wallet address
 * @param contractAddress - NFT contract address
 * @param tokenId - Token ID
 * @param chainId - Chain ID
 * @returns NFT activities, loading state, error, and refetch function
 */
export function useNFTActivity(
  walletAddress: string | null,
  contractAddress: string | null,
  tokenId: string | null,
  chainId: number | null
): UseNFTActivityReturn {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: getNFTActivityQueryKey(walletAddress, contractAddress, tokenId, chainId),
    queryFn: () => fetchNFTActivity(
      walletAddress!,
      contractAddress!,
      tokenId!,
      chainId!
    ),
    enabled: !!walletAddress && !!contractAddress && !!tokenId && !!chainId,
    staleTime: 2 * 60 * 1000, // 2 minutes - activity is fresh for 2min
    gcTime: 5 * 60 * 1000, // 5 minutes - keep in cache for 5min
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  return {
    activities: data?.activities || [],
    isLoading,
    error: error ? (error instanceof Error ? error.message : 'Failed to fetch NFT activity') : null,
    refetch: () => {
      refetch();
    },
  };
}


