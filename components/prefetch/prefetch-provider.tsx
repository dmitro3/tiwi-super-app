'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getTokensQueryKey } from '@/hooks/useTokensQuery';
import { fetchTokens } from '@/lib/frontend/api/tokens';
import { fetchChains } from '@/lib/frontend/api/chains';
import { POPULAR_CHAIN_IDS, getPopularChainsByPriority } from '@/lib/shared/constants/popular-chains';

/**
 * Global Prefetch Provider
 * 
 * Prefetches tokens and chains on app load for instant token modal experience.
 * Runs silently in the background with staggered timing to avoid overwhelming the network.
 * 
 * Prefetch Strategy:
 * 1. Immediate (0ms): Chains (lightweight, needed first)
 * 2. Short delay (100ms): Tokens for all chains (default modal view)
 * 3. Medium delay (300ms): High priority popular chains (Ethereum, BSC, Polygon)
 * 4. Longer delay (500ms): Medium priority chains (Base, Arbitrum, Optimism, Avalanche)
 * 5. Longest delay (700ms): Low priority chains (Solana, future chains)
 */
export function PrefetchProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Prefetch chains immediately (lightweight, needed first)
    // Use TanStack Query to prefetch chains (will use same cache as useChains hook)
    const prefetchChains = async () => {
      try {
        await queryClient.prefetchQuery({
          queryKey: ['chains', { provider: undefined, type: undefined }],
          queryFn: () => fetchChains(),
        });
        if (process.env.NODE_ENV === 'development') {
          console.log('[Prefetch] Chains prefetched');
        }
      } catch (error) {
        // Silently fail - chains will be fetched on demand
        if (process.env.NODE_ENV === 'development') {
          console.warn('[Prefetch] Failed to prefetch chains:', error);
        }
      }
    };

    // Prefetch tokens for all chains (default modal view)
    const prefetchAllChainsTokens = async () => {
      try {
        await queryClient.prefetchQuery({
          queryKey: getTokensQueryKey({ limit: 30 }),
          queryFn: () => fetchTokens({ limit: 30 }),
        });
        if (process.env.NODE_ENV === 'development') {
          console.log('[Prefetch] All chains tokens prefetched');
        }
      } catch (error) {
        // Silently fail - tokens will be fetched on demand
        if (process.env.NODE_ENV === 'development') {
          console.warn('[Prefetch] Failed to prefetch all chains tokens:', error);
        }
      }
    };

    // Prefetch tokens for a specific chain
    const prefetchChainTokens = async (chainId: number) => {
      try {
        await queryClient.prefetchQuery({
          queryKey: getTokensQueryKey({ chains: [chainId], limit: 30 }),
          queryFn: () => fetchTokens({ chains: [chainId], limit: 30 }),
        });
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Prefetch] Chain ${chainId} tokens prefetched`);
        }
      } catch (error) {
        // Silently fail - tokens will be fetched on demand
        if (process.env.NODE_ENV === 'development') {
          console.warn(`[Prefetch] Failed to prefetch chain ${chainId} tokens:`, error);
        }
      }
    };

    // Prefetch tokens for multiple chains in parallel
    const prefetchChainsTokens = async (chainIds: number[]) => {
      // Prefetch in parallel (TanStack Query handles deduplication)
      await Promise.allSettled(
        chainIds.map((chainId) => prefetchChainTokens(chainId))
      );
    };

    // Prefetch TWC token by contract address (for status bar)
    const prefetchTWCToken = async () => {
      try {
        const TWC_ADDRESS = '0xDA1060158F7D593667cCE0a15DB346BB3FfB3596';
        const TWC_CHAIN_ID = 56; // BNB Chain
        
        await queryClient.prefetchQuery({
          queryKey: getTokensQueryKey({ address: TWC_ADDRESS, chains: [TWC_CHAIN_ID], limit: 1 }),
          queryFn: () => fetchTokens({ address: TWC_ADDRESS, chains: [TWC_CHAIN_ID], limit: 1 }),
        });
        if (process.env.NODE_ENV === 'development') {
          console.log('[Prefetch] TWC token prefetched');
        }
      } catch (error) {
        // Silently fail - TWC will be fetched on demand
        if (process.env.NODE_ENV === 'development') {
          console.warn('[Prefetch] Failed to prefetch TWC token:', error);
        }
      }
    };

    // Execute prefetch sequence with staggered timing
    const executePrefetch = () => {
      // Immediate: Prefetch chains
      prefetchChains();

      // 50ms: Prefetch TWC token (for status bar - high priority)
      setTimeout(() => {
        prefetchTWCToken();
      }, 50);

      // 100ms: Prefetch all chains tokens (most important - default modal view)
      setTimeout(() => {
        prefetchAllChainsTokens();
      }, 100);

      // Get popular chains by priority
      const { high, medium, low } = getPopularChainsByPriority();

      // 300ms: Prefetch high priority chains (Ethereum, BSC, Polygon)
      setTimeout(() => {
        prefetchChainsTokens(high);
      }, 300);

      // 500ms: Prefetch medium priority chains (Base, Arbitrum, Optimism, Avalanche)
      setTimeout(() => {
        prefetchChainsTokens(medium);
      }, 500);

      // 700ms: Prefetch low priority chains (Solana, future chains)
      setTimeout(() => {
        prefetchChainsTokens(low);
      }, 700);
    };

    // Start prefetch sequence
    executePrefetch();

    // Note: No cleanup needed - prefetch is fire-and-forget
    // TanStack Query manages the cache lifecycle
  }, [queryClient]);

  // This component doesn't render anything, it just triggers prefetching
  return <>{children}</>;
}

