/**
 * Price Provider
 * 
 * Fetches USD prices for tokens across multiple chains.
 * Uses CoinGecko API as primary source with DexScreener and Jupiter as fallbacks.
 */

import type { TokenPrice } from '@/lib/backend/types/wallet';

// ============================================================================
// CoinGecko API Configuration
// ============================================================================

const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3';
const COINGECKO_PRO_API_URL = process.env.COINGECKO_API_URL || COINGECKO_API_URL;
const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY;

// Rate limiting: 50 calls/minute for free tier, 1000 calls/minute for pro
const RATE_LIMIT_DELAY = COINGECKO_API_KEY ? 60 : 1200; // ms between requests
let lastRequestTime = 0;
const requestQueue: Array<() => Promise<void>> = [];

// In-memory price cache (30s TTL) to avoid redundant API calls
const priceCache = new Map<string, { price: TokenPrice; expiry: number }>();
const PRICE_CACHE_TTL = 30_000; // 30 seconds

// ============================================================================
// Chain ID to CoinGecko Platform Mapping
// ============================================================================

const CHAIN_TO_COINGECKO_PLATFORM: Record<number, string> = {
  1: 'ethereum',
  56: 'binance-smart-chain',
  137: 'polygon-pos',
  42161: 'arbitrum-one',
  43114: 'avalanche',
  8453: 'base',
  10: 'optimistic-ethereum',
  250: 'fantom',
  100: 'xdai',
  1101: 'polygon-zkevm',
  324: 'zksync',
  5000: 'mantle',
  59144: 'linea',
  534352: 'scroll',
  7565164: 'solana', // Solana
};

// ============================================================================
// Native Token CoinGecko IDs by Chain ID
// ============================================================================

// Native token CoinGecko IDs by Chain ID
// These are the native_coin_id values from CoinGecko's asset_platforms API
// Used for fetching native token prices via simple/price endpoint
const NATIVE_TOKEN_COINGECKO_IDS: Record<number, string> = {
  1: 'ethereum',                    // ETH (Ethereum)
  10: 'ethereum',                   // ETH (Optimism)
  56: 'binancecoin',                // BNB (BNB Smart Chain)
  137: 'polygon-ecosystem-token',   // POL (Polygon POS)
  42161: 'ethereum',                // ETH (Arbitrum One)
  43114: 'avalanche-2',             // AVAX (Avalanche)
  8453: 'ethereum',                 // ETH (Base)
  250: 'fantom',                    // FTM (Fantom)
  100: 'xdai',                      // xDAI (Gnosis Chain)
  1101: 'ethereum',                 // ETH (Polygon zkEVM)
  324: 'ethereum',                  // ETH (zkSync)
  5000: 'mantle',                   // MNT (Mantle)
  59144: 'ethereum',                // ETH (Linea)
  534352: 'weth',                   // WETH (Scroll) - Note: Scroll uses weth as native
  7565164: 'solana',                // SOL (Solana)
};

// Native token addresses (case-insensitive check)
const NATIVE_TOKEN_ADDRESSES = new Set([
  '0x0000000000000000000000000000000000000000',
  '0x0000000000000000000000000000000000001010', // Polygon native token address
  'so11111111111111111111111111111111111111112', // Solana native (lowercase)
  'So11111111111111111111111111111111111111112', // Solana native (mixed case)
]);

// Token address to CoinGecko ID mapping (for non-native tokens)
const TOKEN_ADDRESS_TO_COINGECKO_ID: Record<string, string> = {
  // Ethereum
  '0xdac17f958d2ee523a2206206994597c13d831ec7': 'tether',
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 'usd-coin',
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': 'wrapped-bitcoin',
  // BSC
  '0x55d398326f99059ff775485246999027b3197955': 'tether',
  '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d': 'usd-coin',
  // Polygon
  '0xc2132d05d31c914a87c6611c10748aeb04b58e8f': 'tether',
  '0x2791bca1f2de4661ed88a30c99a7a9449aa84174': 'usd-coin',
  // Note: Polygon native token (POL) is handled via NATIVE_TOKEN_ADDRESSES
  // Solana
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'tether',
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'usd-coin',
};

// ============================================================================
// Price Validation
// ============================================================================

/**
 * Validate if a price is reasonable for a given token
 */
function isValidPrice(priceUSD: string, symbol: string, chainId: number): boolean {
  const price = parseFloat(priceUSD);
  if (isNaN(price) || price <= 0) {
    return false;
  }

  // Known reasonable price ranges for major tokens
  const priceRanges: Record<string, { min: number; max: number }> = {
    'ETH': { min: 1000, max: 10000 },
    'MATIC': { min: 0.1, max: 10 },
    'BNB': { min: 200, max: 1000 },
    'AVAX': { min: 10, max: 200 },
    'FTM': { min: 0.1, max: 10 },
    'SOL': { min: 50, max: 500 },
    'USDT': { min: 0.99, max: 1.01 },
    'USDC': { min: 0.99, max: 1.01 },
  };

  const range = priceRanges[symbol.toUpperCase()];
  if (range) {
    if (price < range.min || price > range.max) {
      console.warn(`[PriceProvider] Suspicious price for ${symbol}: $${price} (expected ${range.min}-${range.max})`);
      return false;
    }
  }

  // General sanity check: if price > $10,000, it's likely wrong (except for BTC)
  if (price > 10000 && symbol.toUpperCase() !== 'BTC' && symbol.toUpperCase() !== 'WBTC') {
    console.warn(`[PriceProvider] Suspiciously high price for ${symbol}: $${price}`);
    return false;
  }

  return true;
}

// ============================================================================
// Rate Limiting Helper
// ============================================================================

async function rateLimitedRequest<T>(requestFn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const executeRequest = async () => {
      const now = Date.now();
      const timeSinceLastRequest = now - lastRequestTime;

      if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY - timeSinceLastRequest));
      }

      lastRequestTime = Date.now();

      try {
        const result = await requestFn();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    };

    if (requestQueue.length === 0) {
      executeRequest();
    } else {
      requestQueue.push(executeRequest);
    }

    // Process queue
    if (requestQueue.length > 0) {
      const next = requestQueue.shift();
      if (next) {
        next();
      }
    }
  });
}

// ============================================================================
// DexScreener Price Provider (Fallback for EVM)
// ============================================================================

const DEXSCREENER_CHAIN_MAP: Record<number, string> = {
  1: 'ethereum',
  56: 'bsc',
  137: 'polygon',
  42161: 'arbitrum',
  43114: 'avalanche',
  8453: 'base',
  10: 'optimism',
  250: 'fantom',
  100: 'gnosis',
  1101: 'polygonzkevm',
  324: 'zksync',
  5000: 'mantle',
  59144: 'linea',
  534352: 'scroll',
};

async function getPriceFromDexScreener(
  address: string,
  chainId: number,
  symbol?: string
): Promise<TokenPrice | null> {
  try {
    const chainSlug = DEXSCREENER_CHAIN_MAP[chainId];
    if (!chainSlug) {
      return null;
    }
    
    const url = `https://api.dexscreener.com/latest/dex/tokens/${address}`;
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });

    // if (!response.ok) {
      //   return null;
      // }

      const data = await response.json();
      console.log("🚀 ~ getPriceFromCoinGecko ~ url:", {[chainId]: {url, symbol, address, data: data.pairs}})
    if (!data.pairs || !Array.isArray(data.pairs) || data.pairs.length === 0) {
      return null;
    }

    // Filter pairs by chain and get the one with highest liquidity
    const chainPairs = data.pairs.filter((pair: any) =>
      pair.chainId?.toLowerCase() === chainSlug.toLowerCase()
    );

    if (chainPairs.length === 0) {
      return null;
    }

    // Get pair with highest liquidity
    const topPair = chainPairs.reduce((best: any, pair: any) => {
      const bestLiquidity = best.liquidity?.usd || 0;
      const pairLiquidity = pair.liquidity?.usd || 0;
      return pairLiquidity > bestLiquidity ? pair : best;
    }, chainPairs[0]);

    const priceUSD = topPair.priceUsd;
    if (!priceUSD || parseFloat(priceUSD) <= 0) {
      return null;
    }

    return {
      address,
      symbol: symbol || 'UNKNOWN',
      chainId,
      priceUSD: priceUSD.toString(),
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error(`[PriceProvider] DexScreener error for ${address}:`, error);
    return null;
  }
}

// ============================================================================
// Jupiter Price Provider (Fallback for Solana)
// ============================================================================

async function getPriceFromJupiter(
  address: string,
  symbol?: string
): Promise<TokenPrice | null> {
  try {
    // Jupiter price API endpoint
    const url = `https://price.jup.ag/v4/price?ids=${address}`;
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const priceData = data.data?.[address];

    if (!priceData || !priceData.price) {
      return null;
    }

    const priceUSD = priceData.price.toString();

    return {
      address,
      symbol: symbol || 'UNKNOWN',
      chainId: 7565164, // Solana
      priceUSD,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error(`[PriceProvider] Jupiter error for ${address}:`, error);
    return null;
  }
}

// ============================================================================
// CoinGecko Price Fetching
// ============================================================================

/**
 * Get price from CoinGecko
 */
async function getPriceFromCoinGecko(
  address: string,
  chainId: number,
  symbol?: string
): Promise<TokenPrice | null> {
  try {
    const platform = CHAIN_TO_COINGECKO_PLATFORM[chainId];
    if (!platform) {
      console.log(`[PriceProvider] CoinGecko: Chain ${chainId} not supported`);
      return null;
    }

    const addressLower = address.toLowerCase();
    let coingeckoId: string | null = null;

    // Check if it's a native token
    const isNative = addressLower === '0x0000000000000000000000000000000000000000' ||
      addressLower === '0x0000000000000000000000000000000000001010' || // Polygon native
      addressLower === 'so11111111111111111111111111111111111111112' ||
      NATIVE_TOKEN_ADDRESSES.has(addressLower);

    if (isNative) {
      coingeckoId = NATIVE_TOKEN_COINGECKO_IDS[chainId] || null;
    } else {
      // Check if we have a direct mapping
      coingeckoId = TOKEN_ADDRESS_TO_COINGECKO_ID[addressLower] || null;
    }

    let priceData: any = null;

    if (coingeckoId) {
      // Use direct ID lookup with simple/price endpoint (faster and more reliable for native tokens)
      // This endpoint works for native tokens using their native_coin_id
      const url = `${COINGECKO_PRO_API_URL}/simple/price?ids=${coingeckoId}&vs_currencies=usd`;
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (COINGECKO_API_KEY) {
        headers['x-cg-demo-api-key'] = COINGECKO_API_KEY;
      }

      const response = await rateLimitedRequest(() => 
        fetch(url, { headers })
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      priceData = data[coingeckoId];
    } else {
      // Use contract address lookup for ERC-20 tokens
      const url = `${COINGECKO_PRO_API_URL}/simple/token_price/${platform}?contract_addresses=${addressLower}&vs_currencies=usd`;
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (COINGECKO_API_KEY) {
        headers['x-cg-pro-api-key'] = COINGECKO_API_KEY;
      }

      const response = await rateLimitedRequest(() =>
        fetch(url, { headers })
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      priceData = data[addressLower];
    }

    if (!priceData || !priceData.usd) {
      return null;
    }

    const priceUSD = priceData.usd.toString();

    return {
      address,
      symbol: symbol || 'UNKNOWN',
      chainId,
      priceUSD,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error(`[PriceProvider] CoinGecko error for ${address} on chain ${chainId}:`, error);
    return null;
  }
}

// ============================================================================
// Main Price Fetching Functions
// ============================================================================

/**
 * Get price for a single token with fallback providers
 */
export async function getTokenPrice(
  address: string,
  chainId: number,
  symbol?: string
): Promise<TokenPrice | null> {
  // Check cache first
  const cacheKey = `${chainId}:${address.toLowerCase()}`;
  const cached = priceCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return cached.price;
  }

  // Try CoinGecko first
  let price = await getPriceFromCoinGecko(address, chainId, symbol);

  // Fallback to DexScreener for EVM chains
  if (!price && chainId !== 7565164) {
    price = await getPriceFromDexScreener(address, chainId, symbol);
  }

  // Fallback to Jupiter for Solana
  if (!price && chainId === 7565164) {
    price = await getPriceFromJupiter(address, symbol);
  }

  // Cache the result
  if (price) {
    priceCache.set(cacheKey, { price, expiry: Date.now() + PRICE_CACHE_TTL });
  }

  return price;
}

/**
 * Get prices for multiple tokens (batch request) with fallback providers
 */
export async function getTokenPrices(
  tokens: Array<{ address: string; chainId: number; symbol?: string }>
): Promise<Map<string, TokenPrice>> {
  const priceMap = new Map<string, TokenPrice>();

  // Fetch prices in parallel with fallbacks
  const fetchPromises = tokens.map(async (token) => {
    const priceKey = `${token.chainId}:${token.address.toLowerCase()}`;

    // Try CoinGecko first
    let price = await getPriceFromCoinGecko(token.address, token.chainId, token.symbol);

    if (!price) {
      // Fallback to DexScreener for EVM
      if (token.chainId !== 7565164) {
        price = await getPriceFromDexScreener(token.address, token.chainId, token.symbol);
      }

      // Fallback to Jupiter for Solana
      if (!price && token.chainId === 7565164) {
        price = await getPriceFromJupiter(token.address, token.symbol);
      }
    }

    if (price) {
      priceMap.set(priceKey, price);
    }
  });

  await Promise.all(fetchPromises);

  return priceMap;
}
