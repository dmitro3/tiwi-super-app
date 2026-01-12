/**
 * Unified Activities Hook
 * 
 * Fetches and combines both token transactions and NFT activities
 * Displays them together in a unified timeline
 * All activities are fetched from the platform's own services
 */

import { useQuery } from '@tanstack/react-query';
import { useWalletTransactions } from './useWalletTransactions';
import { useWalletNFTs } from './useWalletNFTs';
import { useMemo } from 'react';
import type { Transaction } from '@/lib/backend/types/wallet';
import type { NFTActivity } from '@/lib/backend/types/nft';

export interface UnifiedActivity {
  id: string;
  type: 'token' | 'nft';
  timestamp: number;
  date: string;
  transaction?: Transaction;
  nftActivity?: NFTActivity & {
    contractAddress: string;
    tokenId: string;
    chainId: number;
    nftName?: string;
    nftImage?: string;
  };
}

interface UseUnifiedActivitiesReturn {
  activities: UnifiedActivity[];
  isLoading: boolean;
  isFetching: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Fetch NFT activities for all NFTs in parallel
 */
async function fetchAllNFTActivities(
  walletAddress: string,
  nfts: Array<{ contractAddress: string; tokenId: string; chainId: number }>
): Promise<Array<{ nft: typeof nfts[0]; activities: NFTActivity[] }>> {
  const promises = nfts.map(async (nft) => {
    try {
      const params = new URLSearchParams({
        address: walletAddress,
        contractAddress: nft.contractAddress,
        tokenId: nft.tokenId,
        chainId: nft.chainId.toString(),
      });

      const response = await fetch(
        `/api/v1/nft/activity?${params.toString()}`
      );

      if (!response.ok) {
        return { nft, activities: [] };
      }

      const data = await response.json();
      return { nft, activities: data.activities || [] };
    } catch (error) {
      console.error(`[UnifiedActivities] Error fetching activities for NFT ${nft.contractAddress}:${nft.tokenId}:`, error);
      return { nft, activities: [] };
    }
  });

  return Promise.all(promises);
}

/**
 * Hook to fetch unified activities (token transactions + NFT activities)
 * All activities are fetched from the platform's own API endpoints
 * 
 * @param walletAddress - Wallet address to fetch activities for
 * @returns Unified activities sorted by timestamp (newest first)
 */
export function useUnifiedActivities(
  walletAddress: string | null
): UseUnifiedActivitiesReturn {
  // Fetch token transactions (from platform API)
  const {
    transactions,
    isLoading: transactionsLoading,
    isFetching: transactionsFetching,
    error: transactionsError,
    refetch: refetchTransactions,
  } = useWalletTransactions(walletAddress, { limit: 50 });

  // Fetch NFTs (from platform API)
  const {
    nfts,
    isLoading: nftsLoading,
    isFetching: nftsFetching,
    error: nftsError,
    refetch: refetchNFTs,
  } = useWalletNFTs(walletAddress);

  // Fetch NFT activities for all NFTs in parallel
  const {
    data: nftActivitiesData,
    isLoading: nftActivitiesLoading,
    isFetching: nftActivitiesFetching,
    error: nftActivitiesError,
    refetch: refetchNFTActivities,
  } = useQuery({
    queryKey: ['nft-activities-all', walletAddress?.toLowerCase(), nfts.map(n => `${n.contractAddress}-${n.tokenId}-${n.chainId}`).join(',')],
    queryFn: () => fetchAllNFTActivities(walletAddress!, nfts),
    enabled: !!walletAddress && nfts.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  // Combine and sort activities
  const activities = useMemo(() => {
    const combined: UnifiedActivity[] = [];

    // Add token transactions
    transactions.forEach((tx) => {
      combined.push({
        id: `token-${tx.id}`,
        type: 'token',
        timestamp: tx.timestamp,
        date: tx.date,
        transaction: tx,
      });
    });

    // Add NFT activities
    if (nftActivitiesData) {
      nftActivitiesData.forEach(({ nft, activities: nftActivities }) => {
        const nftInfo = nfts.find(
          n => n.contractAddress === nft.contractAddress && 
               n.tokenId === nft.tokenId && 
               n.chainId === nft.chainId
        );

        nftActivities.forEach((activity: NFTActivity) => {
          combined.push({
            id: `nft-${nft.contractAddress}-${nft.tokenId}-${activity.timestamp}`,
            type: 'nft',
            timestamp: activity.timestamp,
            date: activity.date,
            nftActivity: {
              ...activity,
              contractAddress: nft.contractAddress,
              tokenId: nft.tokenId,
              chainId: nft.chainId,
              nftName: nftInfo?.name,
              nftImage: nftInfo?.image,
            },
          });
        });
      });
    }

    // Sort by timestamp (newest first)
    return combined.sort((a, b) => b.timestamp - a.timestamp);
  }, [transactions, nftActivitiesData, nfts]);

  const isLoading = transactionsLoading || nftsLoading || nftActivitiesLoading;
  const isFetching = transactionsFetching || nftsFetching || nftActivitiesFetching;
  const error = transactionsError || nftsError || (nftActivitiesError instanceof Error ? nftActivitiesError.message : null);

  const refetch = () => {
    refetchTransactions();
    refetchNFTs();
    refetchNFTActivities();
  };

  return {
    activities,
    isLoading,
    isFetching,
    error,
    refetch,
  };
}

