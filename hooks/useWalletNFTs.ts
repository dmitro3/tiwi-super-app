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
 * Supported chains for NFT fetching (ALL chains supported by Moralis)
 * This matches CHAIN_NAME_MAP from moralis-rest-client.ts
 */
const SUPPORTED_CHAINS = [
  { chainId: 1, name: 'Ethereum' },
  { chainId: 10, name: 'Optimism' },
  { chainId: 56, name: 'BSC' },
  { chainId: 137, name: 'Polygon' },
  { chainId: 42161, name: 'Arbitrum' },
  { chainId: 43114, name: 'Avalanche' },
  { chainId: 8453, name: 'Base' },
  { chainId: 250, name: 'Fantom' },
  { chainId: 100, name: 'Gnosis' },
  { chainId: 1101, name: 'Polygon zkEVM' },
  { chainId: 324, name: 'zkSync Era' },
  { chainId: 5000, name: 'Mantle' },
  { chainId: 59144, name: 'Linea' },
  { chainId: 534352, name: 'Scroll' },
];

/**
 * Query function to fetch wallet NFTs
 * Uses the same logic as token balances - fetches from all chains in parallel
 * Exported for use in prefetching
 */
export async function fetchWalletNFTs(
  walletAddress: string,
  chainIds?: number[]
): Promise<WalletNFTsResponse> {
  if (!walletAddress) {
    throw new Error('Wallet address is required');
  }

  // Use provided chainIds or default to all supported chains
  const chainsToFetch = chainIds && chainIds.length > 0
    ? chainIds
    : SUPPORTED_CHAINS.map(c => c.chainId);

  const allNFTs: any[] = [];

  // Fetch NFTs for all chains in parallel (matching token balance pattern)
  const chainPromises = chainsToFetch.map(async (chainId) => {
    try {
      const apiUrl = `/api/v1/nft/wallet?address=${encodeURIComponent(walletAddress)}&chains=${chainId}`;
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();

        if (data.nfts && Array.isArray(data.nfts) && data.nfts.length > 0) {
          // Add all NFTs from this chain
          allNFTs.push(...data.nfts);
        }
      } else {
        // API returned error, but continue with other chains (non-blocking)
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error || `HTTP ${response.status}`;
        
        // Log errors but don't block other chains
        if (errorMsg && !errorMsg.includes("API key not configured")) {
          const chainName = SUPPORTED_CHAINS.find(c => c.chainId === chainId)?.name || `Chain ${chainId}`;
          console.warn(`[NFT] ⚠️ ${chainName}: ${errorMsg}`);
        }
      }
    } catch (apiError: any) {
      // API call failed, but continue with other chains (non-blocking)
      const errorMsg = apiError?.message || String(apiError);
      if (!errorMsg.includes("Failed to fetch") && !errorMsg.includes("API key")) {
        const chainName = SUPPORTED_CHAINS.find(c => c.chainId === chainId)?.name || `Chain ${chainId}`;
        console.warn(`[NFT] ⚠️ ${chainName}: API call failed - ${errorMsg.substring(0, 100)}`);
      }
    }
  });

  await Promise.all(chainPromises);

  // Deduplicate NFTs based on chainId + contractAddress + tokenId
  // This ensures NFTs are unique per chain and token combination
  const nftMap = new Map<string, any>();
  
  allNFTs.forEach((nft) => {
    // Create unique key: chainId-contractAddress-tokenId (case-insensitive)
    const contractKey = (nft.contractAddress || '').toLowerCase();
    const tokenIdKey = String(nft.tokenId || '');
    const key = `${nft.chainId}-${contractKey}-${tokenIdKey}`;
    
    // If NFT already exists, keep the first one (or could keep one with better metadata)
    if (!nftMap.has(key)) {
      nftMap.set(key, nft);
    }
  });
  
  // Convert map back to array
  const deduplicatedNFTs = Array.from(nftMap.values());

  // Get unique chain IDs
  const uniqueChainIds = Array.from(new Set(deduplicatedNFTs.map(nft => nft.chainId)));

  return {
    nfts: deduplicatedNFTs,
    total: deduplicatedNFTs.length,
    address: walletAddress,
    chains: uniqueChainIds,
    timestamp: Date.now(),
  };
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


