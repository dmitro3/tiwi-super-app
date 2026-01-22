/**
 * LiFi SDK Configuration
 * 
 * Re-implemented following the robust approach from tiwi-test.
 * Uses a layered resolution for wallet clients.
 */

import { createConfig, EVM, Solana, config, ChainType } from '@lifi/sdk';
import { getWalletClient, switchChain, getAccount } from '@wagmi/core';
import { createWalletClient, custom, getAddress } from 'viem';
import { mainnet } from 'viem/chains';
import { wagmiConfig } from '@/lib/wallet/providers/wagmi-config';
import { getWalletForChain, type WalletAccount } from '../utils/wallet-detector';
import { getSolanaWalletAdapterForLiFi } from '../utils/solana-wallet-adapter';
import { LIFI_SOLANA_CHAIN_ID } from '../utils/bridge-mappers';

import * as allViemChains from 'viem/chains';

const CHAIN_MAP: Record<number, any> = Object.values(allViemChains).reduce((acc, chain: any) => {
  if (chain && typeof chain.id === 'number') {
    acc[chain.id] = chain;
  }
  return acc;
}, {} as Record<number, any>);

/**
 * Helper to get wallet client from custom wallet detector (localStorage)
 */
const getCustomWalletClient = async (chainId?: number): Promise<any | null> => {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem('lifi_connected_wallet');
    if (!stored) return null;
    
    const connectedWallet: WalletAccount = JSON.parse(stored);
    if (connectedWallet.chain !== 'ethereum') return null;
    
    const provider = await getWalletForChain(connectedWallet.provider, 'ethereum');
    if (!provider) return null;
    
    const targetChain = chainId ? CHAIN_MAP[chainId] : mainnet;
    if (!targetChain) return null;
    
    const walletClient = createWalletClient({
      chain: targetChain,
      transport: custom(provider),
      account: getAddress(connectedWallet.address) as `0x${string}`,
    });
    
    return walletClient;
  } catch (error) {
    console.error('[LiFiConfig] Error getting custom wallet client:', error);
    return null;
  }
};

/**
 * Initialize LiFi SDK configuration
 */
export function initializeLiFiSDK() {
  createConfig({
    integrator: 'TIWI-Protocol',
    providers: [
      EVM({
        getWalletClient: async (chainId?: number) => {
          // 1. Try custom wallet detector first (highest priority)
          try {
            const customClient = await getCustomWalletClient(chainId);
            if (customClient) {
              console.log('[LI.FI] Using custom wallet detector client');
              return customClient;
            }
          } catch (error) {
            console.warn('[LI.FI] Custom detector failed:', error);
          }
          
          // 2. Fallback to Wagmi
          try {
            const account = getAccount(wagmiConfig);
            if (account?.connector && account?.address) {
              const targetChainId = chainId || account.chainId;
              // @ts-ignore
              const walletClient = await getWalletClient(wagmiConfig, { chainId: targetChainId as any });
              if (walletClient) return walletClient;
            }
          } catch (error) {
            console.warn('[LI.FI] Wagmi fallback failed:', error);
          }
          
          throw new Error('No wallet connected for EVM');
        },
        switchChain: async (chainId: number) => {
          // Try switching via custom provider if possible
          try {
            const stored = localStorage.getItem('lifi_connected_wallet');
            if (stored) {
              const connectedWallet: WalletAccount = JSON.parse(stored);
              if (connectedWallet.chain === 'ethereum') {
                const provider = await getWalletForChain(connectedWallet.provider, 'ethereum');
                if (provider?.request) {
                  await provider.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: `0x${chainId.toString(16)}` }],
                  });
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  return await getCustomWalletClient(chainId);
                }
              }
            }
          } catch (error) {
            console.warn('[LI.FI] Custom switchChain failed, trying wagmi:', error);
          }
          
          // @ts-ignore - bypass strict Wagmi chain ID type check to support dynamic/unlimited chains
          const chain = await switchChain(wagmiConfig, { chainId: chainId as any });
          return getWalletClient(wagmiConfig, { chainId: chain.id as any });
        },
      }),
      Solana({
        getWalletAdapter: async () => {
          return await getSolanaWalletAdapterForLiFi();
        },
      }),
    ],
    preloadChains: false,
  });

  console.log('[LiFiSDKConfig] LiFi SDK initialized with robust provider resolution');
}
