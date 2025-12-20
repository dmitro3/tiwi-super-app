/**
 * useTokens Hook
 * 
 * Fetches tokens from the backend API.
 * Handles loading and error states.
 */

import { useEffect, useState } from 'react';
import { fetchTokens, type FetchTokensParams } from '@/lib/frontend/api/tokens';
import type { Token } from '@/lib/frontend/types/tokens';

export interface UseTokensReturn {
  tokens: Token[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to fetch tokens from backend API
 * 
 * @param params - Request parameters (chains, query, limit)
 * @returns Tokens, loading state, and error
 */
export function useTokens(params: FetchTokensParams = {}): UseTokensReturn {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const loadTokens = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const fetchedTokens = await fetchTokens(params);
        
        if (!isCancelled) {
          setTokens(fetchedTokens);
          setIsLoading(false);
        }
      } catch (err) {
        if (!isCancelled) {
          const error = err instanceof Error ? err : new Error('Failed to fetch tokens');
          setError(error);
          setTokens([]);
          setIsLoading(false);
        }
      }
    };

    loadTokens();

    // Cleanup: cancel request if component unmounts or params change
    return () => {
      isCancelled = true;
    };
  }, [
    // Dependencies: refetch when params change
    params.chains?.join(','), // Convert array to string for comparison
    params.query,
    params.limit,
  ]);

  return { tokens, isLoading, error };
}

