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
  price: string;           // Raw price with $ prefix (e.g., "$0.000095" - full precision, no truncation)
  priceUSD: string;        // Raw price USD value from API (for reference)
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
 * Format price as raw value (no truncation, show full precision)
 * Returns the raw price string with $ prefix, preserving all decimals
 */
function formatPriceRaw(priceUSD: string | undefined): string {
  if (!priceUSD) return '$0';
  
  const price = parseFloat(priceUSD);
  if (isNaN(price) || price === 0) return '$0';
  
  // Return raw price with $ prefix, preserving all significant digits
  // Convert to string and remove trailing zeros after decimal point
  const priceStr = price.toString();
  // If it's scientific notation, convert to decimal
  if (priceStr.includes('e')) {
    return `$${price.toFixed(18).replace(/\.?0+$/, '')}`;
  }
  
  // Remove trailing zeros but keep at least one decimal place if needed
  const formatted = priceStr.replace(/\.?0+$/, '');
  return `$${formatted}`;
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
        price: formatPriceRaw(priceUSD), // Raw price without truncation
        priceUSD: priceUSD, // Store raw price for reference
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

