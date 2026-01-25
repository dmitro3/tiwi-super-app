/**
 * LiFi SDK Configuration
 * 
 * Re-implemented following the robust approach from tiwi-test.
 * Uses a layered resolution for wallet clients.
 */

import { createConfig, EVM, Solana, config, ChainType } from '@lifi/sdk';
import { getSolanaWalletAdapterForLiFi } from '../utils/solana-wallet-adapter';
import { LIFI_SOLANA_CHAIN_ID } from '../utils/bridge-mappers';
import { getWalletClientForChain } from '../utils/viem-clients';
import { useWalletStore } from '@/lib/wallet/state/store';
import { mapWalletIdToProviderId } from '@/lib/wallet/utils/wallet-id-mapper';

// No custom wallet client function needed - using PancakeSwap's approach

/**
 * Initialize LiFi SDK configuration
 */
export function initializeLiFiSDK() {
  createConfig({
    integrator: 'TIWI-Protocol',
    providers: [
      EVM({
        getWalletClient: async (chainId?: number) => {
          console.log('[LI.FI] getWalletClient called for chainId:', chainId);

          // Use the same approach as PancakeSwap - get wallet from store and use viem-clients
          try {
            // Get connected wallet from store
            const storeState = useWalletStore.getState();
            const connectedWallet = storeState.primaryWallet;

            console.log('[LI.FI] Connected wallet from store:', {
              hasWallet: !!connectedWallet,
              address: connectedWallet?.address,
              provider: connectedWallet?.provider,
              chain: connectedWallet?.chain
            });

            if (!connectedWallet || connectedWallet.chain !== 'ethereum') {
              throw new Error('No EVM wallet connected');
            }

            // Get provider ID for the connected wallet
            const providerId = mapWalletIdToProviderId(connectedWallet.provider);
            console.log('[LI.FI] Using provider ID:', providerId);

            // Use the same function as PancakeSwap to get wallet client
            const targetChainId = chainId || 56; // Default to BSC if no chain specified
            const walletClient = await getWalletClientForChain(targetChainId, providerId);

            console.log('[LI.FI] ✅ Successfully got wallet client for chain', targetChainId);
            return walletClient;
          } catch (error) {
            console.error('[LI.FI] Failed to get wallet client:', error);
            throw new Error(`No wallet connected for EVM. Please connect your wallet and try again. ${error instanceof Error ? error.message : ''}`);
          }
        },
        switchChain: async (chainId: number) => {
          console.log('[LI.FI] switchChain called for chainId:', chainId);

          try {
            // Get connected wallet from store
            const storeState = useWalletStore.getState();
            const connectedWallet = storeState.primaryWallet;

            if (!connectedWallet || connectedWallet.chain !== 'ethereum') {
              throw new Error('No EVM wallet connected for chain switch');
            }

            // Get provider ID
            const providerId = mapWalletIdToProviderId(connectedWallet.provider);

            // Get wallet client for the target chain (this will handle chain switching)
            const walletClient = await getWalletClientForChain(chainId, providerId);

            console.log('[LI.FI] ✅ Chain switched to', chainId);
            return walletClient;
          } catch (error) {
            console.error('[LI.FI] Chain switch failed:', error);
            throw new Error(`Failed to switch to chain ${chainId}. ${error instanceof Error ? error.message : ''}`);
          }
        },
      }),
      Solana({
        getWalletAdapter: async () => {
          return await getSolanaWalletAdapterForLiFi();
        },
      }),
    ],
    preloadChains: true,
  });

  console.log('[LiFiSDKConfig] LiFi SDK initialized with robust provider resolution and preloaded chains');
}
