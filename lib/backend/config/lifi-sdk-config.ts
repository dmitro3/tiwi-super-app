/**
 * Backend LiFi SDK Configuration
 * 
 * Configures LiFi SDK for backend API calls (getQuote, getRoutes, getTokens, etc.)
 * Backend doesn't need providers (only frontend needs providers for execution).
 * 
 * This ensures:
 * - RPC URLs are configured for reliable API calls
 * - Integrator is set for partner tracking
 * - Backend uses same configuration as frontend
 */

import { createConfig, ChainId } from '@lifi/sdk';
import { RPC_CONFIG } from '@/lib/backend/utils/rpc-config';

let isInitialized = false;

/**
 * Initialize LiFi SDK configuration for backend
 * Should be called once when backend modules are loaded
 */
export function initializeBackendLiFiSDK() {
  if (isInitialized) {
    return;
  }

  // Map our canonical chain IDs to LiFi ChainId enum
  const rpcUrls: Record<number, string[]> = {};

  // Ethereum Mainnet (1)
  if (RPC_CONFIG[1]) {
    rpcUrls[ChainId.ETH] = [RPC_CONFIG[1]];
  }

  // Arbitrum One (42161)
  if (RPC_CONFIG[42161]) {
    rpcUrls[ChainId.ARB] = [RPC_CONFIG[42161]];
  }

  // Optimism (10)
  if (RPC_CONFIG[10]) {
    rpcUrls[ChainId.OPT] = [RPC_CONFIG[10]];
  }

  // Polygon (137)
  if (RPC_CONFIG[137]) {
    rpcUrls[ChainId.POL] = [RPC_CONFIG[137]];
  }

  // Base (8453)
  if (RPC_CONFIG[8453]) {
    rpcUrls[ChainId.BAS] = [RPC_CONFIG[8453]];
  }

  // BSC / Binance Smart Chain (56)
  if (RPC_CONFIG[56]) {
    rpcUrls[ChainId.BSC] = [RPC_CONFIG[56]];
  }

  // Solana RPC (if available)
  const solanaRpc = process.env.SOLANA_RPC_URL || process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
  if (solanaRpc) {
    rpcUrls[ChainId.SOL] = [solanaRpc];
  }

  createConfig({
    integrator: 'TIWI-Protocol',
    rpcUrls,
    // Preload chains to ensure chain metadata is available for routing
    preloadChains: true,
    // No providers needed - backend doesn't execute routes
  });

  isInitialized = true;
  console.log('[BackendLiFiSDKConfig] LiFi SDK initialized for backend with preloaded chains');
}

