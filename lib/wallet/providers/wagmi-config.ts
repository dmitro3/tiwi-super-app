/**
 * Wagmi Configuration
 * 
 * Configures Wagmi for EVM wallet connections.
 * Uses optimized RPC settings for reliability.
 */

import { createConfig, http } from 'wagmi';
import * as allChains from 'wagmi/chains';
import { metaMask, walletConnect, injected } from 'wagmi/connectors';
import { createClient } from 'viem';
import { getRpcUrl, RPC_TRANSPORT_OPTIONS } from '@/lib/backend/utils/rpc-config';

const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '8e998cd112127e42dce5e2bf74122539';

const connectors = [
  metaMask(),
  ...(WALLETCONNECT_PROJECT_ID ? [walletConnect({ projectId: WALLETCONNECT_PROJECT_ID, showQrModal: true })] : []),
  injected(),
];

export const wagmiConfig = createConfig({
  chains: Object.values(allChains).filter((c): c is any => typeof c === 'object' && c !== null && 'id' in c) as any,
  connectors,
  client({ chain }) {
    const customRpcUrl = getRpcUrl(chain.id);
    
    if (customRpcUrl) {
      return createClient({ 
        chain, 
        transport: http(customRpcUrl, RPC_TRANSPORT_OPTIONS)
      });
    }
    
    return createClient({ chain, transport: http() });
  },
});