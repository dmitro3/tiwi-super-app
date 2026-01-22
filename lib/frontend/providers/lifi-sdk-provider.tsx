'use client';

/**
 * LiFi SDK Provider
 * 
 * Simplified wrapper that initializes the LiFi SDK config.
 */

import { useEffect, type FC, type PropsWithChildren } from 'react';
import { config, getChains, ChainType } from '@lifi/sdk';
import { initializeLiFiSDK } from '@/lib/frontend/config/lifi-sdk-config';
import { LIFI_SOLANA_CHAIN_ID } from '../utils/bridge-mappers';

// Initialize at module level
initializeLiFiSDK();

/**
 * Component to keep LiFi chains synchronized with the SDK.
 */
const ChainSync: FC = () => {
  useEffect(() => {
    const syncChains = async () => {
      try {
        const evmChains = await getChains({ chainTypes: [ChainType.EVM] });

        // Ensure Solana is included
        let allChains = [...evmChains];
        try {
          const allChainsDirect = await getChains();
          const hasSolana = allChainsDirect.some(chain => chain.id === LIFI_SOLANA_CHAIN_ID);
          if (!hasSolana) {
            const solanaChain = {
              id: LIFI_SOLANA_CHAIN_ID,
              key: 'sol',
              name: 'Solana',
              chainType: ChainType.SVM,
              coin: 'SOL',
              nativeToken: {
                address: '11111111111111111111111111111111',
                symbol: 'SOL',
                decimals: 9,
                name: 'Solana',
              },
              rpcUrls: ['https://api.mainnet-beta.solana.com'],
            };
            allChains.push(solanaChain as any);
          }
        } catch (error) {
          console.warn('[LiFiSDKProvider] Could not load all chains, using EVM chains only:', error);
        }

        config.setChains(allChains);
        console.log(`[LiFiSDKProvider] Synchronized ${allChains.length} chains`);
      } catch (error) {
        console.error('[LiFiSDKProvider] Error syncing chains:', error);
      }
    };

    syncChains();
  }, []);

  return null;
};

export function LiFiSDKProvider({ children }: PropsWithChildren) {
  return (
    <>
      <ChainSync />
      {children}
    </>
  );
}
