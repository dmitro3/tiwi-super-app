/**
 * Token Formatter for Homepage
 * 
 * Formats backend token data to match homepage table format.
 * Uses formatPrice from formatting.ts for locale-aware price display.
 */

import { formatPrice as formatPriceLocale } from '@/lib/shared/utils/formatting';
import type { Token } from '@/lib/frontend/types/tokens';
import type { MarketTokenPair } from '@/lib/backend/types/backend-tokens';

export interface HomepageToken {
  symbol: string;
  icon: string;
  price: string;
  change: string;
  changePositive: boolean;
  vol: string;
  marketCapRank: string;      // Market cap rank (e.g., "#1", "#42")
  circulatingSupply: string;  // Circulating supply (e.g., "19.5M", "1.2B")
  // Additional fields for reference
  token: Token;
}

/**
 * Format number to currency string
 */
function formatCurrency(value: number | undefined, decimals: number = 2): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '$0.00';
  }

  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(decimals)}B`;
  } else if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(decimals)}M`;
  } else if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(decimals)}K`;
  } else {
    return `$${value.toFixed(decimals)}`;
  }
}

/**
 * Format market cap rank (e.g., 1 → "#1", 42 → "#42")
 */
function formatMarketCapRank(rank: number | undefined): string {
  if (rank === undefined || rank === null || isNaN(rank)) {
    return 'N/A';
  }
  return `#${rank}`;
}

/**
 * Format circulating supply (e.g., 19500000 → "19.5M", 1200000000 → "1.2B")
 */
export function formatCirculatingSupply(supply: number | undefined): string {
  if (supply === undefined || supply === null || isNaN(supply)) {
    return 'N/A';
  }

  if (supply >= 1_000_000_000) {
    return `${(supply / 1_000_000_000).toFixed(1)}B`;
  } else if (supply >= 1_000_000) {
    return `${(supply / 1_000_000).toFixed(1)}M`;
  } else if (supply >= 1_000) {
    return `${(supply / 1_000).toFixed(1)}K`;
  } else {
    return supply.toFixed(0);
  }
}

/**
 * Format price change percentage
 */
function formatPriceChange(change: number | undefined): { change: string; positive: boolean } {
  if (change === undefined || change === null || isNaN(change)) {
    return { change: '0.00%', positive: true };
  }

  const sign = change >= 0 ? '+' : '';
  return {
    change: `${sign}${change.toFixed(2)}%`,
    positive: change >= 0,
  };
}

/**
 * Format price using locale and currency from settings
 */
export function formatPrice(price: string | undefined): string {
  const result = formatPriceLocale(price);
  return result === '-' ? '$0.00' : result;
}

/**
 * Format pair price for display
 * Formats the raw pair price value nicely (e.g., "0.02271393152" → "0.022714 USDC")
 */
function formatPairPrice(price: string | undefined, symbol: string | undefined): string {
  if (!price || !symbol) return '0';
  const numPrice = Number(price);
  if (!Number.isFinite(numPrice) || numPrice === 0) return '0';
  
  // For very small prices, show more decimals
  if (numPrice < 0.000001) {
    return `${numPrice.toFixed(10)} ${symbol}`;
  } else if (numPrice < 0.01) {
    return `${numPrice.toFixed(6)} ${symbol}`;
  } else if (numPrice < 1) {
    return `${numPrice.toFixed(4)} ${symbol}`;
  } else {
    return `${numPrice.toFixed(2)} ${symbol}`;
  }
}

/**
 * Transform MarketTokenPair to Token format
 * Uses pool-level data (poolName for name/symbol, pairPriceDisplay for price)
 * Preserves full baseToken and quoteToken details for routing
 */
export function marketPairToToken(pair: MarketTokenPair): Token {
  const baseToken = pair.baseToken;
  const id = `${pair.chainId}-${pair.poolAddress.toLowerCase()}`;
  
  // Format pair price if not already formatted
  const displayPrice = pair.pairPriceDisplay 
    || (pair.pairPrice && pair.quoteToken.symbol 
      ? formatPairPrice(pair.pairPrice, pair.quoteToken.symbol)
      : baseToken.priceUSD || '0');
  
  return {
    id,
    // Use pool name for both name and symbol (e.g., "BFS / USDC")
    name: pair.poolName,
    symbol: pair.poolName,
    address: pair.poolAddress, // Use pool address as the identifier
    // For now, use baseToken logo (UI will be updated later to show both)
    logo: baseToken.logoURI || '',
    logoURI: baseToken.logoURI,
    chain: pair.chainName,
    chainId: pair.chainId,
    chainLogo: pair.chainLogoURI, // Chain logo from canonical chain data
    decimals: baseToken.decimals, // Use baseToken decimals
    // Use formatted pair price (e.g., "0.022714 USDC")
    price: displayPrice,
    // Use pair-level metrics
    priceChange24h: pair.priceChange24h,
    volume24h: pair.volume24h,
    liquidity: pair.liquidity,
    marketCap: pair.marketCap,
    holders: pair.holders, // From Chainbase (or fallback to transaction count)
    transactionCount: pair.transactionCount,
    chainBadge: pair.chainBadge,
    // Store full token details for routing (attach as metadata)
    // These will be used when navigating to swap/market pages
    baseToken: pair.baseToken,
    quoteToken: pair.quoteToken,
    // Store raw pair price for formatting (SubscriptPairPrice component needs raw value)
    pairPrice: pair.pairPrice,
  };
}

/**
 * Transform backend token to homepage format
 */
export function formatTokenForHomepage(token: Token): HomepageToken {
  const priceChange = formatPriceChange(token.priceChange24h);
  
  // Ensure price is properly formatted - use priceUSD if price is not available
  // The API returns priceUSD which should be mapped to price in transformToken
  // But if it's missing, check the raw token data
  const tokenPrice = token.price || (token as any).priceUSD || '0';
  
  return {
    symbol: token.symbol,
    // Prefer logoURI (from backend) but fall back to legacy logo field
    icon: token.logoURI || token.logo || '',
    price: formatPrice(tokenPrice),
    change: priceChange.change,
    changePositive: priceChange.positive,
    vol: formatCurrency(token.volume24h),
    marketCapRank: formatMarketCapRank((token as any).marketCapRank),
    circulatingSupply: formatCirculatingSupply((token as any).circulatingSupply),
    token,
  };
}

