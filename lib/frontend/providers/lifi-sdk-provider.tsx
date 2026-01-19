'use client';

/**
 * LiFi SDK Provider
 * 
 * Configures LiFi SDK with ecosystem providers (EVM, Solana, etc.)
 * This is required for executing routes/quotes through the LiFi SDK.
 * 
 * Based on LiFi SDK best practices:
 * - Uses Wagmi for EVM wallet client integration
 * - Loads chains from LiFi API and syncs with Wagmi
 * - Configures providers when wallet connects
 * - Supports both EVM and Solana chains
 */

import { useEffect, type ReactNode } from 'react';
import { EVM, Solana, config, getChains, ChainType } from '@lifi/sdk';
import { useAccount, useChainId, useConfig } from 'wagmi';
import { getWalletClient, switchChain } from '@wagmi/core';
import { useQuery } from '@tanstack/react-query';
import { initializeLiFiSDK } from '@/lib/frontend/config/lifi-sdk-config';
import { getCanonicalChain } from '@/lib/backend/registry/chains';

// Initialize LiFi SDK config at module level (only once)
initializeLiFiSDK();

// Global reference to wagmi config for executor access
let globalWagmiConfig: any = null;

export function setWagmiConfigForLiFi(wagmiConfig: any) {
  globalWagmiConfig = wagmiConfig;
}

export function getWagmiConfigForLiFi() {
  return globalWagmiConfig;
}

/**
 * LiFi SDK Provider Component
 * 
 * Configures LiFi SDK providers based on connected wallet.
 * Must be used inside WagmiProvider.
 */
export function LiFiSDKProvider({ children }: { children: ReactNode }) {
  const wagmiConfig = useConfig();
  const { isConnected, address } = useAccount();
  const chainId = useChainId();

  // Store wagmi config globally for executor access
  useEffect(() => {
    setWagmiConfigForLiFi(wagmiConfig);
  }, [wagmiConfig]);

  // Load chains from LiFi API (EVM and Solana)
  const { data: chains } = useQuery({
    queryKey: ['lifi-chains'],
    queryFn: async () => {
      try {
        // Load both EVM and Solana chains
        const [evmChains, solanaChains] = await Promise.all([
          getChains({ chainTypes: [ChainType.EVM] }),
          getChains({ chainTypes: [ChainType.SVM] }),
        ]);

        // Combine all chains
        const allChains = [...evmChains, ...solanaChains];

        // Update SDK chain configuration
        // This ensures SDK recognizes all chains including Solana (1151111081099710)
        config.setChains(allChains);

        console.log(`[LiFiSDKProvider] Loaded ${allChains.length} chains from LiFi API:`, {
          evm: evmChains.length,
          solana: solanaChains.length,
        });

        return allChains;
      } catch (error) {
        console.error('[LiFiSDKProvider] Error loading chains:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  useEffect(() => {
    // Only configure providers if wallet is connected
    if (!isConnected || !address) {
      console.log('[LiFiSDKProvider] Wallet not connected, skipping provider configuration');
      return;
    }

    // Wait for chains to be loaded before configuring providers
    if (!chains || chains.length === 0) {
      console.log('[LiFiSDKProvider] Waiting for chains to load...');
      return;
    }

    console.log('[LiFiSDKProvider] Configuring LiFi SDK providers...', {
      address,
      chainId,
      chainsLoaded: chains.length,
    });

    // Capture current chainId for use in async functions
    const currentChainId = chainId;

    // Configure EVM provider using Wagmi
    const evmProvider = EVM({
      getWalletClient: async (requestedChainId?: number) => {
        try {
          // If chainId is provided and different from current chain, switch first
          if (requestedChainId && requestedChainId !== currentChainId) {
            console.log(`[LiFiSDKProvider] Switching chain from ${currentChainId} to ${requestedChainId}...`);
            await switchChain(wagmiConfig, { chainId: requestedChainId });
          }

          // Get wallet client from Wagmi
          const walletClient = await getWalletClient(wagmiConfig, requestedChainId ? { chainId: requestedChainId } : undefined);
          
          if (!walletClient) {
            throw new Error('Failed to get wallet client from Wagmi');
          }

          console.log('[LiFiSDKProvider] Wallet client obtained:', {
            chainId: walletClient.chain?.id,
            account: walletClient.account?.address,
          });

          return walletClient;
        } catch (error) {
          console.error('[LiFiSDKProvider] Error getting wallet client:', error);
          throw error;
        }
      },
      switchChain: async (targetChainId: number) => {
        try {
          console.log(`[LiFiSDKProvider] Switching chain to ${targetChainId}...`);
          const chain = await switchChain(wagmiConfig, { chainId: targetChainId });
          const walletClient = await getWalletClient(wagmiConfig, { chainId: chain.id });
          
          if (!walletClient) {
            throw new Error(`Failed to get wallet client for chain ${targetChainId}`);
          }

          return walletClient;
        } catch (error) {
          console.error(`[LiFiSDKProvider] Error switching chain to ${targetChainId}:`, error);
          throw error;
        }
      },
    });

    // Configure Solana provider if Solana wallet is available
    // Note: For now, we'll configure it but it will only work if Solana wallet adapter is set up
    // This allows cross-chain swaps between EVM and Solana via LiFi
    const providers: any[] = [evmProvider];

    // Try to get Solana wallet adapter if available
    // This will be set up when Solana wallet integration is complete
    if (typeof window !== 'undefined' && (window as any).solana) {
      try {
        const solanaProvider = Solana({
          getWalletAdapter: async () => {
            // For now, return null - will be implemented when Solana wallet adapter is set up
            // This allows the provider to be configured but won't error if no Solana wallet
            return null as any;
          },
        });
        providers.push(solanaProvider);
        console.log('[LiFiSDKProvider] Solana provider configured (wallet adapter pending)');
      } catch (error) {
        console.warn('[LiFiSDKProvider] Could not configure Solana provider:', error);
      }
    }

    // Set providers in LiFi SDK config
    config.setProviders(providers);

    console.log('[LiFiSDKProvider] LiFi SDK providers configured successfully:', {
      evm: true,
      solana: providers.length > 1,
    });

    // Cleanup: Remove providers when wallet disconnects or component unmounts
    return () => {
      console.log('[LiFiSDKProvider] Cleaning up providers');
      config.setProviders([]);
    };
  }, [isConnected, address, chainId, wagmiConfig, chains]);

  return <>{children}</>;
}


