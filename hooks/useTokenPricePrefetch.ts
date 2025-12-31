/**
 * Token Price Prefetch Hook
 * 
 * Prefetches token prices when tokens are selected to ensure USD values are available.
 * Uses TanStack Query for caching and automatic refetching.
 * 
 * Also updates token prices in swap store when fetched.
 */

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTokensQueryKey } from '@/hooks/useTokensQuery';
import { fetchTokens } from '@/lib/frontend/api/tokens';
import { useSwapStore } from '@/lib/frontend/store/swap-store';
import type { Token } from '@/lib/frontend/types/tokens';

/**
 * Prefetch and update token prices when tokens are selected
 * This ensures prices are available immediately when calculating USD values
 */
export function useTokenPricePrefetch(fromToken: Token | null, toToken: Token | null) {
  const setFromToken = useSwapStore((state) => state.setFromToken);
  const setToToken = useSwapStore((state) => state.setToToken);

  // Fetch fromToken price and update store
  const { data: fromTokenData } = useQuery({
    queryKey: getTokensQueryKey({ 
      address: fromToken?.address || '', 
      chains: fromToken?.chainId ? [fromToken.chainId] : undefined, 
      limit: 1 
    }),
    queryFn: () => fetchTokens({ 
      address: fromToken!.address, 
      chains: [fromToken!.chainId!], 
      limit: 1 
    }),
    enabled: !!fromToken?.address && !!fromToken?.chainId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch toToken price and update store
  const { data: toTokenData } = useQuery({
    queryKey: getTokensQueryKey({ 
      address: toToken?.address || '', 
      chains: toToken?.chainId ? [toToken.chainId] : undefined, 
      limit: 1 
    }),
    queryFn: () => fetchTokens({ 
      address: toToken!.address, 
      chains: [toToken!.chainId!], 
      limit: 1 
    }),
    enabled: !!toToken?.address && !!toToken?.chainId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Update fromToken with latest price when fetched
  useEffect(() => {
    if (fromTokenData && fromTokenData.length > 0 && fromToken) {
      const updatedToken = fromTokenData.find(
        t => t.address.toLowerCase() === fromToken.address.toLowerCase() && t.chainId === fromToken.chainId
      ) || fromTokenData[0];
      
      // Update if price exists and is different, or if logo is better
      if (updatedToken.price && updatedToken.price !== fromToken.price) {
        setFromToken({
          ...fromToken,
          price: updatedToken.price,
          logo: (updatedToken.logo && updatedToken.logo.trim() !== '') ? updatedToken.logo : fromToken.logo, // Preserve logo if new one is empty
        });
      } else if (updatedToken.logo && updatedToken.logo.trim() !== '' && updatedToken.logo !== fromToken.logo) {
        // Update logo if it's better
        setFromToken({
          ...fromToken,
          logo: updatedToken.logo,
        });
      }
    }
  }, [fromTokenData, fromToken, setFromToken]);

  // Update toToken with latest price when fetched
  useEffect(() => {
    if (toTokenData && toTokenData.length > 0 && toToken) {
      const updatedToken = toTokenData.find(
        t => t.address.toLowerCase() === toToken.address.toLowerCase() && t.chainId === toToken.chainId
      ) || toTokenData[0];
      
      // Update if price exists and is different, or if logo is better
      if (updatedToken.price && updatedToken.price !== toToken.price) {
        setToToken({
          ...toToken,
          price: updatedToken.price,
          logo: (updatedToken.logo && updatedToken.logo.trim() !== '') ? updatedToken.logo : toToken.logo, // Preserve logo if new one is empty
        });
      } else if (updatedToken.logo && updatedToken.logo.trim() !== '' && updatedToken.logo !== toToken.logo) {
        // Update logo if it's better
        setToToken({
          ...toToken,
          logo: updatedToken.logo,
        });
      }
    }
  }, [toTokenData, toToken, setToToken]);
}

