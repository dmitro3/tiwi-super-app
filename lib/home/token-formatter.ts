/**
 * Token Formatter for Homepage
 * 
 * Formats backend token data to match homepage table format.
 * Uses formatPrice from formatting.ts for locale-aware price display.
 */

import { formatPrice as formatPriceLocale } from '@/lib/shared/utils/formatting';
import type { Token } from '@/lib/frontend/types/tokens';

export interface HomepageToken {
  symbol: string;
  icon: string;
  price: string;
  change: string;
  changePositive: boolean;
  vol: string;
  liq: string;
  holders: string;
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
 * Format number to compact string (for holders)
 */
function formatCompact(value: number | undefined): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '0';
  }

  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  } else if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  } else {
    return value.toFixed(0);
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
    icon: token.logoURI || '',
    price: formatPrice(tokenPrice),
    change: priceChange.change,
    changePositive: priceChange.positive,
    vol: formatCurrency(token.volume24h),
    liq: formatCurrency(token.liquidity),
    holders: formatCompact(token.holders),
    token,
  };
}

