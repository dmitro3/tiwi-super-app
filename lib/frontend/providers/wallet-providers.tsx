'use client';

/**
 * Wallet Providers Wrapper
 */

import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { wagmiConfig } from '@/lib/wallet/providers/wagmi-config';
import { WalletProvider } from '../contexts/WalletContext';
import { LiFiSDKProvider } from './lifi-sdk-provider';

export function WalletProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 2 * 60 * 1000,
            gcTime: 5 * 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 2,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <WalletProvider>
          <LiFiSDKProvider>
            {children}
          </LiFiSDKProvider>
        </WalletProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}
