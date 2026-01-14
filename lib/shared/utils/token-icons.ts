/**
 * Token Icon Utilities
 * 
 * Provides reliable token icon fetching with multiple fallback sources
 */

/**
 * Generate multiple possible image URLs for a token
 * Uses reliable CDNs in priority order to ensure images always load
 */
export function getTokenImageUrls(
  logoURI?: string,
  symbol?: string,
  address?: string,
  chainId?: number
): string[] {
  const urls: string[] = [];
  
  // 1. Original logo URI (if valid) - highest priority
  if (logoURI && logoURI.trim()) {
    const trimmed = logoURI.trim();
    // Validate it's a proper URL
    if (isValidImageUrl(trimmed)) {
      urls.push(trimmed);
    }
  }
  
  // 2. DexScreener CDN (by address and chain) - very reliable for market data tokens
  if (address && chainId) {
    const chainSlug = getDexScreenerChainSlug(chainId);
    if (chainSlug) {
      const addrLower = address.toLowerCase();
      urls.push(`https://cdn.dexscreener.com/tokens/${chainSlug}/${addrLower}.png`);
    }
  }
  
  // 3. CoinGecko API (by symbol) - most reliable for popular tokens
  if (symbol) {
    const symbolLower = symbol.toLowerCase();
    const imageId = getCoinGeckoImageId(symbolLower);
    if (imageId) {
      urls.push(`https://assets.coingecko.com/coins/images/${imageId}/large/${symbolLower}.png`);
      urls.push(`https://assets.coingecko.com/coins/images/${imageId}/small/${symbolLower}.png`);
    }
  }
  
  // 4. Trust Wallet Assets (by address and chain) - comprehensive token database
  if (address && chainId) {
    const chainName = getTrustWalletChainName(chainId);
    const addrLower = address.toLowerCase();
    urls.push(`https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${chainName}/assets/${addrLower}/logo.png`);
  }
  
  // 5. Uniswap Token List (by address) - for Ethereum tokens
  if (address && chainId === 1) {
    const addrLower = address.toLowerCase();
    urls.push(`https://raw.githubusercontent.com/uniswap/assets/master/blockchains/ethereum/assets/${addrLower}/logo.png`);
  }
  
  // 6. 1inch Token List (by address) - popular DEX aggregator
  if (address) {
    const addrLower = address.toLowerCase();
    urls.push(`https://tokens.1inch.io/${addrLower}.png`);
  }
  
  // Remove duplicates and invalid URLs
  return urls.filter((url, index, self) => 
    url && 
    url.trim() !== '' && 
    self.indexOf(url) === index &&
    isValidImageUrl(url)
  );
}

/**
 * Validate if a URL is a valid image URL
 */
function isValidImageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  
  const trimmed = url.trim();
  
  // Must start with http://, https://, or /
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('/')) {
    return false;
  }
  
  // Must not contain invalid characters
  if (trimmed.includes('undefined') || trimmed.includes('null') || trimmed.includes(' ')) {
    return false;
  }
  
  // Try to parse as URL
  try {
    if (trimmed.startsWith('/')) {
      return true; // Relative URL is valid
    }
    new URL(trimmed);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if chain is EVM-based
 */
function isEVMChain(chainId: number): boolean {
  const evmChains = [1, 56, 137, 8453, 42161, 10, 43114, 250, 100, 42220, 25];
  return evmChains.includes(chainId);
}

/**
 * Get CoinGecko chain slug
 */
function getCoinGeckoChainSlug(chainId: number): string | null {
  const chainMap: Record<number, string> = {
    1: 'ethereum',
    56: 'binance-smart-chain',
    137: 'polygon-pos',
    8453: 'base',
    42161: 'arbitrum-one',
    10: 'optimistic-ethereum',
    43114: 'avalanche',
  };
  
  return chainMap[chainId] || null;
}

/**
 * Get CoinGecko image ID by symbol (simplified mapping for common tokens)
 */
function getCoinGeckoImageId(symbol: string): number | null {
  const imageIds: Record<string, number> = {
    'btc': 1,
    'eth': 279,
    'bnb': 825,
    'sol': 4128,
    'usdt': 825,
    'usdc': 3408,
    'dai': 4943,
    'matic': 4713,
    'avax': 5805,
    'link': 1975,
    'dot': 6636,
    'ada': 2010,
  };
  
  return imageIds[symbol.toLowerCase()] || null;
}


/**
 * Get DexScreener chain slug from chain ID
 */
function getDexScreenerChainSlug(chainId: number): string | null {
  const chainMap: Record<number, string> = {
    1: 'ethereum',
    56: 'bsc',
    137: 'polygon',
    8453: 'base',
    42161: 'arbitrum',
    10: 'optimism',
    43114: 'avalanche',
    7565164: 'solana',
  };
  
  return chainMap[chainId] || null;
}

/**
 * Get Trust Wallet chain name from chain ID
 */
function getTrustWalletChainName(chainId: number): string {
  const chainMap: Record<number, string> = {
    1: 'ethereum',
    56: 'smartchain',
    137: 'polygon',
    8453: 'base',
    42161: 'arbitrum',
    10: 'optimism',
    43114: 'avalanche',
    7565164: 'solana',
  };
  
  return chainMap[chainId] || 'ethereum';
}

