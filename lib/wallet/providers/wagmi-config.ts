/**
 * Wagmi Configuration
 * 
 * Configures Wagmi for EVM wallet connections
 */

import { createConfig, http } from 'wagmi';
import { mainnet, arbitrum, optimism, polygon, base, bsc } from 'wagmi/chains';
import { metaMask, walletConnect, injected } from 'wagmi/connectors';

// WalletConnect Project ID (you'll need to get this from WalletConnect Cloud)
// For now, using a placeholder - replace with your actual project ID
const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';

export const wagmiConfig = createConfig({
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

