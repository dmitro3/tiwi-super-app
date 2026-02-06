/**
 * Token Formatter for Homepage
 * 
 * Formats backend token data to match homepage table format.
 * Uses formatPrice from formatting.ts for locale-aware price display.
 */

import { formatCompactNumber, formatCurrency, formatPercent } from '@/lib/shared/utils/formatters';
import type { Token } from '@/lib/frontend/types/tokens';
import type { MarketTokenPair } from '@/lib/backend/types/backend-tokens';

export interface HomepageToken {
  symbol: string;
  icon: string;
  price: string;
  rawPrice: number;
  change: string;
  changePositive: boolean;
  vol: string;
  marketCapRank: string;      // Market cap rank (e.g., "#1", "#42")
  circulatingSupply: string;  // Circulating supply (e.g., "19.5M", "1.2B")
  marketCap: string;
  liquidity: string;
  // Additional fields for reference
  token: Token;
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
  return formatCompactNumber(supply, 1);
}

/**
 * Format price change percentage
 */
function formatPriceChange(change: number | undefined): { change: string; positive: boolean } {
  return {
    change: formatPercent(change),
    positive: (change || 0) >= 0,
  };
}

/**
 * Format price using locale and currency from settings
 */
export function formatPrice(price: string | number | undefined): string {
  if (!price) return '$0.00';
  const num = typeof price === 'string' ? parseFloat(price) : price;
  if (num >= 0.0001) {
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`;
  }
  return `$${num.toFixed(8)}`;
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
    rawPrice: Number(tokenPrice),
    change: priceChange.change,
    changePositive: priceChange.positive,
    vol: formatCurrency(token.volume24h),
    marketCapRank: formatMarketCapRank((token as any).marketCapRank),
    circulatingSupply: formatCirculatingSupply((token as any).circulatingSupply),
    marketCap: formatCurrency((token as any).marketCap),
    liquidity: formatCurrency((token as any).liquidity),
    token,
  };
}

