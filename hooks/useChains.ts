/**
 * useChains Hook
 * 
 * Fetches chains from the backend API.
 * Uses in-memory cache to avoid refetching (chains are stable data).
 */

import { useEffect, useState } from 'react';
import { fetchChains, type FetchChainsParams } from '@/lib/frontend/api/chains';
import type { Chain } from '@/lib/frontend/types/tokens';

export interface UseChainsReturn {
  chains: Chain[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to fetch chains from backend API
 * 
 * @param params - Optional filter parameters (provider, type)
 * @returns Chains, loading state, and error
 */
export function useChains(params: FetchChainsParams = {}): UseChainsReturn {
  const [chains, setChains] = useState<Chain[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const loadChains = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const fetchedChains = await fetchChains(params);
        
        if (!isCancelled) {
          setChains(fetchedChains);
          setIsLoading(false);
        }
      } catch (err) {
        if (!isCancelled) {
          const error = err instanceof Error ? err : new Error('Failed to fetch chains');
          setError(error);
          setChains([]);
          setIsLoading(false);
        }
      }
    };

    loadChains();

    // Cleanup: cancel request if component unmounts or params change
    return () => {
      isCancelled = false;
    };
  }, [
    // Dependencies: refetch when params change
    params.provider,
    params.type,
  ]);

  return { chains, isLoading, error };
}

