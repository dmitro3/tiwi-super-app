/**
 * Backend Token Aggregation Types
 * 
 * These types are used internally by the backend token aggregation system.
 * They define the canonical data structures and provider abstractions.
 */

// ============================================================================
// Canonical Chain (Our Internal Representation)
// ============================================================================

export interface CanonicalChain {
  id: number;                    // Our stable internal numeric ID (never changes)
  name: string;                  // Display name
  type: 'EVM' | 'Solana' | 'Cosmos' | 'CosmosAppChain' | 'Sui' | 'TON' | 'Bitcoin';
  logoURI?: string;
  nativeCurrency: {
    symbol: string;
    decimals: number;
  };
  
  // Additional chain metadata (for app chains, Cosmos chains, etc.)
  metadata?: {
    chainId?: string;            // Native chain ID (e.g., "osmosis-1", "cosmoshub-4")
    rpcUrl?: string;             // RPC endpoint
    explorerUrl?: string;        // Block explorer URL
    [key: string]: any;          // Additional chain-specific metadata
  };
  
  // Provider-specific chain identifiers
  providerIds: {
    lifi?: number | string;      // LiFi chain ID (numeric or special like Solana)
    squid?: string;              // Squid chain key (e.g., "solana-mainnet-beta", "56")
    dexscreener?: string;         // DexScreener chain slug (e.g., "ethereum", "bsc", "solana")
    relay?: number;              // Relay chain ID (numeric)
    // Future: sui, ton, etc.
  };
}

// ============================================================================
// Normalized Token (What Frontend Receives)
// ============================================================================

/**
 * Unified token DTO matching Relay's predictable format
 * This is what the API returns to the frontend
 */
export interface NormalizedToken {
  chainId: number;           // Canonical chain ID (for chain badge display)
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI: string;
  priceUSD: string;
  providers: string[];        // Which providers have this token (e.g., ['dexscreener', 'lifi'])
  verified?: boolean;         // Verification status (from Relay or multiple providers)
  vmType?: string;            // 'evm' | 'solana' | 'cosmos' | etc. (from Relay)
  
  // Additional metadata (from DexScreener)
  volume24h?: number;         // 24h trading volume
  liquidity?: number;          // Liquidity in USD
  marketCap?: number;          // Market capitalization
  
  // Chain detection metadata (for UI display)
  chainBadge?: string;        // Chain badge identifier for UI display
  chainName?: string;         // Chain display name (for UI)
}

// ============================================================================
// Chain DTO (What Frontend Receives)
// ============================================================================

export interface ChainDTO {
  id: number;                // Canonical chain ID
  name: string;
  type: 'EVM' | 'Solana' | 'Cosmos' | 'CosmosAppChain' | 'Sui' | 'TON' | 'Bitcoin';
  logoURI?: string;
  nativeCurrency: {
    symbol: string;
    decimals: number;
  };
  supportedProviders: string[];  // Which providers support this chain
}

// ============================================================================
// Provider Abstraction Types
// ============================================================================

/**
 * Provider-specific token (raw from API)
 * This is what providers return before normalization
 */
export interface ProviderToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  priceUSD?: string;
  chainId?: string | number;  // Provider's chain identifier (for chain detection)
  volume24h?: number;         // 24h volume (from DexScreener)
  liquidity?: number;          // Liquidity in USD (from DexScreener)
  marketCap?: number;          // Market cap (from DexScreener)
  verified?: boolean;          // Verification status (from Relay)
  vmType?: string;             // VM type (from Relay)
  // Provider-specific fields stored here
  raw?: any;                   // Raw provider response for debugging/normalization
  [key: string]: any;
}

/**
 * Provider-specific chain (raw from API)
 */
export interface ProviderChain {
  id: string | number;         // Provider's chain identifier
  name: string;
  type?: string;
  logoURI?: string;
  nativeCurrency?: {
    symbol: string;
    decimals: number;
  };
  // Provider-specific fields
  raw?: any;
  [key: string]: any;
}

// ============================================================================
// Provider Interface
// ============================================================================

/**
 * Fetch tokens parameters
 */
export interface FetchTokensParams {
  chainId?: string | number;   // Provider-specific chain ID (single chain)
  chainIds?: number[];         // Array of canonical chain IDs (multi-chain, Relay)
  search?: string;             // Search query (name, symbol, address)
  term?: string;               // Search term (Relay uses "term")
  limit?: number;              // Result limit (default: 30)
}

/**
 * Token Provider interface
 * All providers must implement this interface
 */
export interface TokenProvider {
  name: string;
  
  // Get provider-specific chain ID for a canonical chain
  getChainId(canonicalChain: CanonicalChain): string | number | null;
  
  // Fetch tokens for a chain
  fetchTokens(params: FetchTokensParams): Promise<ProviderToken[]>;
  
  // Fetch all supported chains
  fetchChains(): Promise<ProviderChain[]>;
  
  // Normalize provider token to canonical format
  normalizeToken(token: ProviderToken, canonicalChain: CanonicalChain): NormalizedToken;
  
  // Normalize provider chain to canonical format
  normalizeChain(chain: ProviderChain): CanonicalChain | null;
}

// ============================================================================
// API Response Types
// ============================================================================
// 
// NOTE: API response types have been moved to lib/shared/types/api.ts
// They are shared because both backend and frontend need to agree on the API contract.
// 
// Import from: @/lib/shared/types/api

