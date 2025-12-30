/**
 * useTWCPrice Hook
 * 
 * Fetches TWC token price and 24h change from the tokens API.
 * Uses TanStack Query for caching and automatic refetching.
 */

import { useQuery } from '@tanstack/react-query';
import { getTokensQueryKey } from '@/hooks/useTokensQuery';
import { fetchTokens } from '@/lib/frontend/api/tokens';
import type { Token } from '@/lib/frontend/types/tokens';

// TWC Token Constants
const TWC_ADDRESS = '0xDA1060158F7D593667cCE0a15DB346BB3FfB3596';
const TWC_CHAIN_ID = 56; // BNB Chain

export interface TWCPriceData {
  price: string;           // Formatted price (e.g., "$0.095")
  priceChange24h: number;  // 24h price change percentage (e.g., -12.1)
  changeType: 'positive' | 'negative'; // Change type for styling
  token: Token | null;     // Full token data
}

export interface UseTWCPriceReturn {
  data: TWCPriceData | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Format price as currency
 */
function formatPrice(priceUSD: string | undefined): string {
  if (!priceUSD) return '$0.00';
  
  const price = parseFloat(priceUSD);
  if (isNaN(price) || price === 0) return '$0.00';
  
  // Format small prices with more decimals
  if (price < 0.01) {
    return `$${price.toFixed(8).replace(/\.?0+$/, '')}`;
  }
  
  // Format regular prices
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: price < 1 ? 4 : 2,
    maximumFractionDigits: price < 1 ? 8 : 2,
  }).format(price);
}

/**
 * Hook to fetch TWC token price and 24h change
 * 
 * @returns TWC price data, loading state, and error
 */
export function useTWCPrice(): UseTWCPriceReturn {
  const {
    data: tokens,
    isLoading,
    error,
  } = useQuery<Token[], Error>({
    queryKey: getTokensQueryKey({ address: TWC_ADDRESS, chains: [TWC_CHAIN_ID], limit: 1 }),
    queryFn: () => fetchTokens({ address: TWC_ADDRESS, chains: [TWC_CHAIN_ID], limit: 1 }),
    staleTime: 30 * 1000, // 30 seconds - prices change frequently
    gcTime: 5 * 60 * 1000, // 5 minutes - keep in cache
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Find TWC token (should be first result)
  const twcToken = tokens && tokens.length > 0 
    ? tokens.find(token => 
        token.address.toLowerCase() === TWC_ADDRESS.toLowerCase() && 
        token.chainId === TWC_CHAIN_ID
      ) || tokens[0]
    : null;

  // Extract price and change data
  const priceUSD = twcToken?.price || '0';
  const priceChange24h = twcToken?.priceChange24h ?? 0;
  const changeType: 'positive' | 'negative' = priceChange24h >= 0 ? 'positive' : 'negative';

  const data: TWCPriceData | null = twcToken
    ? {
        price: formatPrice(priceUSD),
        priceChange24h,
        changeType,
        token: twcToken,
      }
    : null;

  return {
    data,
    isLoading,
    error: error ? (error instanceof Error ? error : new Error('Failed to fetch TWC price')) : null,
  };
}

