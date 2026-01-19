/**
 * LiFi SDK Configuration
 * 
 * Centralized configuration for LiFi SDK with RPC URLs and integrator.
 * This should be called once at application startup.
 * 
 * Based on LiFi SDK best practices:
 * - Configure RPC URLs for reliable connections
 * - Set integrator for partner tracking
 * - Initialize before providers are configured
 */

import { createConfig, ChainId } from '@lifi/sdk';
import { RPC_CONFIG } from '@/lib/backend/utils/rpc-config';

let isInitialized = false;

/**
 * Initialize LiFi SDK configuration
 * Should be called once at application startup (frontend only)
 */
export function initializeLiFiSDK() {
  if (isInitialized) {
    console.log('[LiFiSDKConfig] Already initialized, skipping...');
    return;
  }

  // Map our canonical chain IDs to LiFi ChainId enum
  // Note: LiFi uses different chain IDs for some chains
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

  // Solana - LiFi uses special chain ID: 1151111081099710
  // We'll add Solana RPC when available
  // For now, SDK will use default public RPCs for Solana
  const solanaRpc = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
  if (solanaRpc) {
    rpcUrls[ChainId.SOL] = [solanaRpc];
  }

  createConfig({
    integrator: 'TIWI-Protocol',
    rpcUrls,
    // Don't preload chains - we'll load them dynamically from LiFi API
    // This ensures we get the latest chain configurations
    preloadChains: false,
    // Disable version check in production (optional)
    disableVersionCheck: process.env.NODE_ENV === 'production',
  });

  isInitialized = true;
  console.log('[LiFiSDKConfig] LiFi SDK initialized with RPC URLs:', Object.keys(rpcUrls).length, 'chains');
}

