'use client';

/**
 * Wallet Providers Wrapper
 * 
 * Wraps WagmiProvider in a client component to avoid serialization issues
 */

import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { createConfig, http } from 'wagmi';
import { mainnet, arbitrum, optimism, polygon, base, bsc } from 'wagmi/chains';
import { metaMask, walletConnect, injected } from 'wagmi/connectors';

// WalletConnect Project ID (you'll need to get this from WalletConnect Cloud)
// For now, using a placeholder - replace with your actual project ID
const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '8e998cd112127e42dce5e2bf74122539';

// Create Wagmi config inside client component to avoid serialization issues
function createWagmiConfig() {
  return createConfig({
    chains: [mainnet, arbitrum, optimism, polygon, base, bsc],
    connectors: [
      metaMask(),
      ...(WALLETCONNECT_PROJECT_ID ? [walletConnect({ projectId: WALLETCONNECT_PROJECT_ID })] : []),
      injected(),
    ],
    transports: {
      [mainnet.id]: http(),
      [arbitrum.id]: http(),
      [optimism.id]: http(),
      [polygon.id]: http(),
      [base.id]: http(),
      [bsc.id]: http(),
    },
  });
}

export function WalletProviders({ children }: { children: ReactNode }) {
  // Create config and query client in client component
  const [wagmiConfig] = useState(() => createWagmiConfig());
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 2 * 60 * 1000, // 2 minutes - data is fresh
            gcTime: 5 * 60 * 1000, // 5 minutes - cache retention
            refetchOnWindowFocus: false,
            refetchOnMount: false,
            retry: 2,
            retryDelay: 1000,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        {children}
      </WagmiProvider>
    </QueryClientProvider>
  );
}

