'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';

/**
 * TanStack Query Provider
 * 
 * Configures QueryClient with optimized defaults for token fetching:
 * - 2 minutes staleTime (data considered fresh)
 * - 5 minutes gcTime (cache retention time)
 * - No refetch on window focus (for token lists)
 * - Retry failed requests twice
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  // Create QueryClient with stable configuration
  // Using useState to ensure single instance per component tree
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 2 * 60 * 1000, // 2 minutes - data is fresh
            gcTime: 5 * 60 * 1000, // 5 minutes - cache retention (formerly cacheTime)
            refetchOnWindowFocus: false, // Don't refetch on focus for token lists
            refetchOnMount: false, // Use cached data if available
            retry: 2, // Retry failed requests twice
            retryDelay: 1000, // 1 second between retries
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

