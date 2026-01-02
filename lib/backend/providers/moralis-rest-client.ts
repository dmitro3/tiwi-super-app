/**
 * Moralis REST API Client
 * 
 * Direct REST API client for Moralis with provider-level caching and automatic key rotation.
 * Replaces the SDK to support dynamic API key rotation.
 */

import { getCurrentApiKey, getCurrentKeyIndex, markKeyAsExhausted, rotateToNextKey, isRateLimitError } from '@/lib/backend/utils/moralis-key-manager';

// ============================================================================
// Configuration
// ============================================================================

const MORALIS_BASE_URL = 'https://deep-index.moralis.io/api/v2.2/';
const MORALIS_SOLANA_BASE_URL = 'https://solana-gateway.moralis.io';

// Cache TTL constants (in milliseconds)
const CACHE_TTL = {
  BALANCE: 30 * 1000, // 30 seconds
  TOKEN_BALANCES: 30 * 1000, // 30 seconds
  TRANSACTIONS: 5 * 60 * 1000, // 5 minutes
  SOLANA_BALANCE: 30 * 1000, // 30 seconds
  SOLANA_TOKENS: 30 * 1000, // 30 seconds
};

// ============================================================================
// Provider-Level Cache
// ============================================================================

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class MoralisCache {
  private cache = new Map<string, CacheEntry<any>>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Run cleanup every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    this.cache.set(key, {
      data: value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

// ============================================================================
// NFT API Methods
// ============================================================================

/**
 * Get wallet NFTs
 * Endpoint: GET /{address}/nft
 * Documentation: https://docs.moralis.com/web3-data-api/evm/reference/get-wallet-nfts
 * 
 * @param address - Wallet address
 * @param chainId - Chain ID
 * @param options - Query options
 * @returns NFT data from Moralis
 */
export async function getWalletNFTs(
  address: string,
  chainId: number,
  options?: {
    limit?: number;
    cursor?: string;
    normalizeMetadata?: boolean;
  }
): Promise<any> {
  // Validate address
  if (!isValidEVMAddress(address)) {
    throw new Error(`Invalid EVM address: ${address}`);
  }

  const chainName = getChainName(chainId);
  
  const cacheKey = `moralis:nft:wallet:${chainId}:${address.toLowerCase()}:${options?.limit || 100}`;
  
  return makeMoralisRequest(
    `/${address}/nft`,
    {
      params: {
        chain: chainName,
        format: 'decimal',
        limit: options?.limit || 100,
        normalize_metadata: options?.normalizeMetadata !== false ? 'true' : 'false',
        ...(options?.cursor && { cursor: options.cursor }),
      },
      cacheKey,
      cacheTTL: 5 * 60 * 1000, // 5 minutes
    }
  );
}

/**
 * Get NFT collection metadata
 * Endpoint: GET /nft/{address}/metadata
 * Documentation: https://docs.moralis.com/web3-data-api/evm/reference/get-nft-metadata
 * 
 * @param contractAddress - NFT contract address
 * @param chainId - Chain ID
 * @returns Collection metadata from Moralis
 */
export async function getNFTCollectionMetadata(
  contractAddress: string,
  chainId: number
): Promise<any> {
  // Validate address
  if (!isValidEVMAddress(contractAddress)) {
    throw new Error(`Invalid contract address: ${contractAddress}`);
  }

  const chainName = getChainName(chainId);
  
  const cacheKey = `moralis:nft:metadata:${chainId}:${contractAddress.toLowerCase()}`;
  
  return makeMoralisRequest(
    `/nft/${contractAddress}/metadata`,
    {
      params: {
        chain: chainName,
      },
      cacheKey,
      cacheTTL: 60 * 60 * 1000, // 1 hour (metadata rarely changes)
    }
  );
}

/**
 * Get NFT transfers for a wallet
 * Endpoint: GET /{address}/nft/transfers
 * Documentation: https://docs.moralis.com/web3-data-api/evm/reference/get-wallet-nft-transfers
 * 
 * @param address - Wallet address
 * @param chainId - Chain ID
 * @param options - Query options
 * @returns NFT transfer data from Moralis
 */
export async function getNFTTransfers(
  address: string,
  chainId: number,
  options?: {
    limit?: number;
    cursor?: string;
    direction?: 'both' | 'to' | 'from';
    contractAddress?: string; // Filter by contract
  }
): Promise<any> {
  // Validate address
  if (!isValidEVMAddress(address)) {
    throw new Error(`Invalid EVM address: ${address}`);
  }

  const chainName = getChainName(chainId);
  
  const params: Record<string, string | number> = {
    chain: chainName,
    format: 'decimal',
    limit: options?.limit || 100,
    direction: options?.direction || 'both',
    ...(options?.cursor && { cursor: options.cursor }),
  };

  // Add contract filter if provided
  // Note: Moralis expects token_addresses as a query parameter (can be repeated or comma-separated)
  // We'll pass it as a string for now, but the API might need it in a specific format
  if (options?.contractAddress) {
    // Moralis API accepts token_addresses as a query parameter
    // Format: token_addresses=0x123... or token_addresses[]=0x123...
    params.token_addresses = options.contractAddress;
  }
  
  const cacheKey = `moralis:nft:transfers:${chainId}:${address.toLowerCase()}:${options?.limit || 100}`;
  
  return makeMoralisRequest(
    `/${address}/nft/transfers`,
    {
      params,
      cacheKey,
      cacheTTL: 2 * 60 * 1000, // 2 minutes
    }
  );
}

// Singleton cache instance
const cache = new MoralisCache();

// ============================================================================
// Address Validation
// ============================================================================

/**
 * Check if address is a valid EVM address
 */
export function isValidEVMAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Check if address is a valid Solana address
 */
export function isValidSolanaAddress(address: string): boolean {
  // Solana addresses are base58 encoded, typically 32-44 characters
  // They don't start with 0x
  if (address.startsWith('0x')) {
    return false;
  }
  
  // Basic validation: base58 characters, reasonable length
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return base58Regex.test(address);
}

/**
 * Determine if address is EVM or Solana
 */
export function getAddressType(address: string): 'evm' | 'solana' | 'invalid' {
  if (isValidEVMAddress(address)) {
    return 'evm';
  }
  if (isValidSolanaAddress(address)) {
    return 'solana';
  }
  return 'invalid';
}

// ============================================================================
// REST API Client
// ============================================================================

interface MoralisResponse<T> {
  data: T;
  status: number;
}

/**
 * Make a request to Moralis REST API with automatic key rotation
 */
async function makeMoralisRequest<T>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST';
    params?: Record<string, string | number>;
    baseUrl?: string;
    cacheKey?: string;
    cacheTTL?: number;
  } = {}
): Promise<T> {
const {
    method = 'GET',
    params = {},
    baseUrl = MORALIS_BASE_URL,
    cacheKey,
    cacheTTL,
} = options;

  // Check cache first if cache key provided
//   if (cacheKey && cacheTTL) {
//     const cached = cache.get<T>(cacheKey);
//     if (cached !== null) {
//       return cached;
//     }
//   }

  const maxRetries = 3;
  let lastError: any = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const apiKey = getCurrentApiKey();
    
    try {
      // Build URL with query parameters
      // Fix: Remove leading slash from endpoint if baseUrl ends with slash
      const endpointClean = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
      const baseUrlClean = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
      const url = new URL(`${baseUrlClean}${endpointClean}`);
      console.log("🚀 ~ makeMoralisRequest ~ url:", url)
      
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });

      const response = await fetch(url.toString(), {
        method,
        headers: {
          'X-API-Key': apiKey,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      // Fix: Read response body ONCE and store it
      const responseData = await response.json();
      
      if (!response.ok) {
        const errorData = responseData || {};
        const error: any = new Error(`Moralis API error: ${response.status} ${response.statusText}`);
        error.status = response.status;
        error.response = errorData;
        error.isMoralisError = true;
        error.code = response.status === 401 ? 'C0006' : undefined;

        // Check if rate limit error
        if (isRateLimitError(error) && attempt < maxRetries - 1) {
          console.warn(`[MoralisREST] Rate limit hit on attempt ${attempt + 1}, rotating to next API key...`);
          markKeyAsExhausted(getCurrentKeyIndex());
          const rotated = rotateToNextKey();
          if (!rotated) {
            throw new Error('All API keys exhausted');
          }
          // Small delay before retry
          await new Promise(resolve => setTimeout(resolve, 100));
          continue;
        }

        throw error;
      }

      // Use stored response data
      const data = responseData;

      // Cache successful response
      if (cacheKey && cacheTTL) {
        cache.set(cacheKey, data, cacheTTL);
      }

      return data;
    } catch (error: any) {
      lastError = error;

      // If it's a rate limit error and we have retries left, continue
      if (isRateLimitError(error) && attempt < maxRetries - 1) {
        continue;
      }

      // For non-rate-limit errors or final attempt, throw
      if (attempt === maxRetries - 1 || !isRateLimitError(error)) {
        throw error;
      }
    }
  }

  throw lastError || new Error('Failed to make Moralis API request');
}

// ============================================================================
// Chain Name Mapping (for /wallets/ endpoints)
// ============================================================================

/**
 * Map canonical chain IDs to Moralis chain names (for /wallets/ endpoints)
 * Note: /wallets/ endpoints use chain names (eth, polygon), not hex (0x1, 0x89)
 */
const CHAIN_NAME_MAP: Record<number, string> = {
  1: 'eth',
  10: 'optimism',
  56: 'bsc',
  137: 'polygon',
  42161: 'arbitrum',
  43114: 'avalanche',
  8453: 'base',
  250: 'fantom',
  100: 'gnosis',
  1101: 'polygon-zkevm',
  324: 'zksync',
  5000: 'mantle',
  59144: 'linea',
  534352: 'scroll',
};

/**
 * Get Moralis chain name from canonical chain ID
 */
export function getChainName(chainId: number): string {
  const chainName = CHAIN_NAME_MAP[chainId];
  if (!chainName) {
    throw new Error(`Chain ${chainId} not supported by Moralis /wallets/ endpoints`);
  }
  return chainName;
}

// ============================================================================
// EVM API Methods
// ============================================================================

/**
 * Get native token balance for EVM chain
 * @deprecated Use getWalletTokensWithPrices() instead - it returns native + ERC20 in one call
 */
export async function getEVMNativeBalance(
  address: string,
  chainId: number,
  chainHex: string
): Promise<any> {
  // Validate address
  if (!isValidEVMAddress(address)) {
    throw new Error(`Invalid EVM address: ${address}`);
  }

  const cacheKey = `moralis:evm:native:${chainId}:${address.toLowerCase()}`;
  
  return makeMoralisRequest(
    `/${address}/balance`,
    {
      params: { chain: chainHex },
      cacheKey,
      cacheTTL: CACHE_TTL.BALANCE,
    }
  );
}

/**
 * Get ERC-20 token balances for EVM chain
 * @deprecated Use getWalletTokensWithPrices() instead - it returns native + ERC20 in one call
 */
export async function getEVMTokenBalances(
  address: string,
  chainId: number,
  chainHex: string
): Promise<any> {
  // Validate address
  if (!isValidEVMAddress(address)) {
    throw new Error(`Invalid EVM address: ${address}`);
  }

  const cacheKey = `moralis:evm:tokens:${chainId}:${address.toLowerCase()}`;
  
  return makeMoralisRequest(
    `/${address}/erc20`,
    {
      params: { chain: chainHex },
      cacheKey,
      cacheTTL: CACHE_TTL.TOKEN_BALANCES,
    }
  );
}

/**
 * Get all wallet tokens (native + ERC20) with prices in a single call
 * This is the OPTIMAL endpoint - returns both native and ERC20 tokens with USD prices
 * 
 * Endpoint: GET /wallets/{address}/tokens?chain={chainName}
 * 
 * Response includes:
 * - Native token (native_token: true)
 * - All ERC20 tokens
 * - USD prices (usd_price, usd_value)
 * - 24h price change (usd_price_24hr_percent_change)
 * - Portfolio percentage (portfolio_percentage)
 * - Spam detection (possible_spam)
 * - Verified contract status (verified_contract)
 * 
 * @param address - Wallet address
 * @param chainId - Canonical chain ID
 * @returns Moralis response with result array containing all tokens
 */
export async function getWalletTokensWithPrices(
  address: string,
  chainId: number
): Promise<any> {
  // Validate address
  if (!isValidEVMAddress(address)) {
    throw new Error(`Invalid EVM address: ${address}`);
  }

  // Get chain name (not hex) for /wallets/ endpoints
  const chainName = getChainName(chainId);
  
  const cacheKey = `moralis:wallets:tokens:${chainId}:${address.toLowerCase()}`;
  
  return makeMoralisRequest(
    `/wallets/${address}/tokens`,
    {
      params: {
        chain: chainName,  // Use chain name (polygon), not hex (0x89)
        exclude_spam: 'true',
        exclude_unverified_contracts: 'false',  // Include unverified but mark them
      },
      cacheKey,
      cacheTTL: CACHE_TTL.TOKEN_BALANCES,
    }
  );
}

/**
 * Get wallet net worth (total balance across chains)
 * 
 * Endpoint: GET /wallets/{address}/net-worth?chains[0]=eth&chains[1]=bsc&...
 * 
 * Note: Moralis requires chains as array parameters (chains[0], chains[1], etc.)
 * not as a comma-separated string.
 * 
 * Returns:
 * - total_networth_usd: Total portfolio value in USD
 * - chains: Array of chain-specific net worth values
 * 
 * @param address - Wallet address
 * @param chainIds - Array of chain IDs to include
 * @returns Moralis response with net worth data
 */
export async function getWalletNetWorth(
  address: string,
  chainIds: number[]
): Promise<any> {
  // Validate address
  if (!isValidEVMAddress(address)) {
    throw new Error(`Invalid EVM address: ${address}`);
  }

  // Convert chain IDs to chain names
  const chainNames = chainIds
    .map(id => {
      try {
        return getChainName(id);
      } catch {
        return null; // Skip unsupported chains
      }
    })
    .filter((name): name is string => name !== null);

  if (chainNames.length === 0) {
    throw new Error('No supported chains provided');
  }

  // Build params object with array format: chains[0]=eth, chains[1]=bsc, etc.
  const params: Record<string, string> = {
    exclude_spam: 'true',
    exclude_unverified_contracts: 'false',
  };

  // Add chains as array parameters
  chainNames.forEach((chainName, index) => {
    params[`chains[${index}]`] = chainName;
  });

  const cacheKey = `moralis:wallets:net-worth:${chainNames.join(',')}:${address.toLowerCase()}`;
  
  return makeMoralisRequest(
    `/wallets/${address}/net-worth`,
    {
      params,
      cacheKey,
      cacheTTL: CACHE_TTL.BALANCE, // 30 seconds
    }
  );
}

/**
 * Get wallet transactions for EVM chain (Legacy method)
 * 
 * NOTE: This endpoint is deprecated. Use getWalletHistory instead.
 * This function is kept for backward compatibility but should be replaced.
 * 
 * The correct Moralis endpoint is:
 * - GET /wallets/{address}/history (preferred - comprehensive history)
 * - GET /{address}/verbose (alternative - verbose transaction details)
 * 
 * @deprecated Use getWalletHistory instead
 */
export async function getEVMWalletTransactions(
  address: string,
  chainId: number,
  chainHex: string,
  limit: number = 20
): Promise<any> {
  // Validate address
  if (!isValidEVMAddress(address)) {
    throw new Error(`Invalid EVM address: ${address}`);
  }

  // Use the wallet history endpoint instead of the non-existent /{address} endpoint
  // This ensures we get proper transaction data with chain information
  console.warn('[getEVMWalletTransactions] This function is deprecated. Consider using getWalletHistory instead.');
  
  return getWalletHistory(
    address,
    [chainId],
    { limit }
  );
}

// ============================================================================
// Solana API Methods
// ============================================================================

/**
 * Get native SOL balance
 */
export async function getSolanaNativeBalance(address: string): Promise<any> {
  // Validate Solana address
  if (!isValidSolanaAddress(address)) {
    throw new Error(`Invalid Solana address: ${address}`);
  }

  const cacheKey = `moralis:solana:balance:${address}`;
  
  return makeMoralisRequest(
    `/account/mainnet/${address}/balance`,
    {
      baseUrl: MORALIS_SOLANA_BASE_URL,
      cacheKey,
      cacheTTL: CACHE_TTL.SOLANA_BALANCE,
    }
  );
}

/**
 * Get SPL token balances for Solana
 */
export async function getSolanaTokenBalances(address: string): Promise<any> {
  // Validate Solana address
  if (!isValidSolanaAddress(address)) {
    throw new Error(`Invalid Solana address: ${address}`);
  }

  const cacheKey = `moralis:solana:tokens:${address}`;
  
  return makeMoralisRequest(
    `/account/mainnet/${address}/tokens`,
    {
      baseUrl: MORALIS_SOLANA_BASE_URL,
      cacheKey,
      cacheTTL: CACHE_TTL.SOLANA_TOKENS,
    }
  );
}

/**
 * Get transactions for Solana
 */
export async function getSolanaTransactions(
  address: string,
  limit: number = 20
): Promise<any> {
  // Validate Solana address
  if (!isValidSolanaAddress(address)) {
    throw new Error(`Invalid Solana address: ${address}`);
  }

  const cacheKey = `moralis:solana:transactions:${address}:${limit}`;
  
  return makeMoralisRequest(
    `/account/mainnet/${address}/transactions`,
    {
      baseUrl: MORALIS_SOLANA_BASE_URL,
      params: { limit },
      cacheKey,
      cacheTTL: CACHE_TTL.TRANSACTIONS,
    }
  );
}

// ============================================================================
// Wallet History API (Enhanced Transaction History)
// ============================================================================

/**
 * Get wallet history for a single chain
 * Endpoint: GET /wallets/{address}/history?chain={chainName}
 * 
 * Fetches transaction history for one specific chain.
 * This is the preferred method when you need chain-specific data.
 * 
 * @param address - Wallet address
 * @param chainName - Chain name (e.g., "eth", "bsc", "polygon")
 * @param options - Query options (limit, cursor)
 * @returns Wallet history response for the specified chain
 */
export async function getWalletHistoryForChain(
  address: string,
  chainName: string,
  options?: {
    limit?: number;
    cursor?: string;
  }
): Promise<any> {
  // Validate address
  if (!isValidEVMAddress(address)) {
    throw new Error(`Invalid EVM address: ${address}`);
  }

  // Build params with single chain
  const params: Record<string, string | number> = {
    chain: chainName,
    limit: options?.limit || 100,
    ...(options?.cursor && { cursor: options.cursor }),
  };
  
  const cacheKey = `moralis:wallets:history:${chainName}:${address.toLowerCase()}:${options?.limit || 100}`;
   
  const history = await makeMoralisRequest(
    `/wallets/${address}/history`,
    {
      params,
      cacheKey,
      cacheTTL: 2 * 60 * 1000, // 2 minutes (transactions change frequently)
    }
  );
  return history;
}

/**
 * Get wallet history (all transaction types across multiple chains)
 * Endpoint: GET /wallets/{address}/history
 * Documentation: https://docs.moralis.com/web3-data-api/evm/wallet-history
 * 
 * @deprecated This function attempts to pass multiple chains as array, which Moralis doesn't support.
 * Use getWalletHistoryForChain() for single-chain requests, or fetch per chain in parallel.
 * 
 * @param address - Wallet address
 * @param chainIds - Array of chain IDs to fetch
 * @param options - Query options (limit, cursor)
 * @returns Wallet history response with categorized transactions
 */
export async function getWalletHistory(
  address: string,
  chainIds: number[],
  options?: {
    limit?: number;
    cursor?: string;
  }
): Promise<any> {
  // Validate address
  if (!isValidEVMAddress(address)) {
    throw new Error(`Invalid EVM address: ${address}`);
  }

  // Convert chain IDs to chain names
  const chainNames = chainIds.map(id => getChainName(id));
  
  // Build params with array notation for chains
  const params: Record<string, string | number> = {
    limit: options?.limit || 100,
    ...(options?.cursor && { cursor: options.cursor }),
  };
  
  // Add chains as array: chains[0]=eth&chains[1]=polygon
  chainNames.forEach((chainName, index) => {
    params[`chains[${index}]`] = chainName;
  });
  
  const cacheKey = `moralis:wallets:history:${chainNames.join(',')}:${address.toLowerCase()}:${options?.limit || 100}`;
   
  const history = await makeMoralisRequest(
    `/wallets/${address}/history`,
    {
      params,
      cacheKey,
      cacheTTL: 2 * 60 * 1000, // 2 minutes (transactions change frequently)
    }
  );
  return history;
}

// ============================================================================
// Cache Management
// ============================================================================

/**
 * Clear cache for a specific address
 */
export function clearAddressCache(address: string): void {
  const addressLower = address.toLowerCase();
  // Clear all cache entries for this address
  // Note: This is a simple implementation - in production, you might want to track keys
  cache.clear(); // For now, clear all cache (can be optimized later)
}

/**
 * Clear all cache
 */
export function clearAllCache(): void {
  cache.clear();
}

