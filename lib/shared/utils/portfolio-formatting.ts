/**
 * Portfolio Formatting Utilities
 * 
 * Helper functions for formatting data for portfolio display
 */

import type { WalletToken } from '@/lib/backend/types/wallet';

export interface PortfolioAsset {
  name: string;
  symbol: string;
  amount: string;
  value: string; // Formatted as "$X,XXX.XX"
  icon: string;
  trend: 'bullish' | 'bearish';
}

/**
 * Format currency value with commas and 2 decimals
 */
export function formatCurrency(value: string | undefined): string {
  if (!value) return '$0.00';
  
  const num = parseFloat(value);
  if (isNaN(num)) return '$0.00';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Format token amount to prevent wrapping
 * Limits to max 6 decimal places, removes trailing zeros
 * Uses compact notation: K (thousands), M (millions), B (billions), T (trillions)
 * @param amount - Token amount string (e.g., "0.000337227178712815")
 * @param maxDecimals - Maximum decimal places (default: 6)
 * @returns Formatted amount string (e.g., "0.000337", "1.5K", "6.89B")
 */
export function formatTokenAmount(amount: string | number | undefined | null, maxDecimals: number = 6): string {
  // Defensive: handle null/undefined
  if (amount === null || amount === undefined) return '0.00';
  const amountStr = String(amount);

  if (!amountStr || amountStr === '0' || amountStr === '0.00') return '0.00';

  const num = parseFloat(amountStr);
  if (isNaN(num)) return '0.00';
  
  // Use compact notation for large numbers
  if (num >= 1e12) {
    // Trillions
    return `${(num / 1e12).toFixed(2)}T`;
  } else if (num >= 1e9) {
    // Billions
    return `${(num / 1e9).toFixed(2)}B`;
  } else if (num >= 1e6) {
    // Millions
    return `${(num / 1e6).toFixed(2)}M`;
  } else if (num >= 1e3) {
    // Thousands
    return `${(num / 1e3).toFixed(2)}K`;
  }
  
  // Format with max decimals for smaller numbers
  const formatted = num.toFixed(maxDecimals);
  
  // Remove trailing zeros but keep at least one decimal place if needed
  const trimmed = formatted.replace(/\.?0+$/, '');
  
  // If we removed everything after decimal, ensure we have .00
  if (!trimmed.includes('.')) {
    return `${trimmed}.00`;
  }
  
  return trimmed;
}

/**
 * Parse formatted token amount back to raw number string
 * Handles K, M, B, T suffixes (case-insensitive)
 * @param formatted - Formatted amount string (e.g., "1.5K", "6.89B", "1500")
 * @returns Raw number string (e.g., "1500", "6890000000", "1500")
 */
export function parseFormattedAmount(formatted: string | number | undefined | null): string {
  // Defensive: ensure we have a string
  if (formatted === null || formatted === undefined) return '0';
  const formattedStr = String(formatted);

  if (!formattedStr || formattedStr.trim() === '') return '0';

  const trimmed = formattedStr.trim().toUpperCase();
  
  // Check for suffixes
  if (trimmed.endsWith('T')) {
    const num = parseFloat(trimmed.slice(0, -1));
    if (!isNaN(num)) {
      return (num * 1e12).toString();
    }
  } else if (trimmed.endsWith('B')) {
    const num = parseFloat(trimmed.slice(0, -1));
    if (!isNaN(num)) {
      return (num * 1e9).toString();
    }
  } else if (trimmed.endsWith('M')) {
    const num = parseFloat(trimmed.slice(0, -1));
    if (!isNaN(num)) {
      return (num * 1e6).toString();
    }
  } else if (trimmed.endsWith('K')) {
    const num = parseFloat(trimmed.slice(0, -1));
    if (!isNaN(num)) {
      return (num * 1e3).toString();
    }
  }
  
  // No suffix, try to parse as regular number
  const num = parseFloat(trimmed);
  if (!isNaN(num)) {
    return num.toString();
  }
  
  return '0';
}

/**
 * Get trend from 24h price change
 */
export function getTrendFromPriceChange(priceChange24h?: string): 'bullish' | 'bearish' {
  if (!priceChange24h) return 'bearish';
  
  const change = parseFloat(priceChange24h);
  if (isNaN(change)) return 'bearish';
  
  return change >= 0 ? 'bullish' : 'bearish';
}

/**
 * Get token fallback icon path
 */
export function getTokenFallbackIcon(symbol: string): string {
  // Try common token icons first
  const commonTokens: Record<string, string> = {
    'ETH': '/assets/icons/tokens/ethereum.svg',
    'BNB': '/assets/icons/chains/bsc.svg',
    'BTC': '/assets/icons/chains/bitcoin.svg',
    'SOL': '/assets/icons/tokens/solana.svg',
    'USDT': '/assets/icons/tokens/tether.svg',
    'USDC': '/assets/icons/tokens/usdc.svg',
    'MATIC': '/assets/icons/chains/polygon.svg',
    'POL': '/assets/icons/chains/polygon.svg',
    'AVAX': '/assets/icons/chains/avalanche.svg',
  };
  
  if (commonTokens[symbol.toUpperCase()]) {
    return commonTokens[symbol.toUpperCase()];
  }
  
  // Default fallback - first letter in circle
  return `/assets/icons/tokens/default.svg`;
}

/**
 * Map WalletToken to PortfolioAsset format
 */
export function mapWalletTokenToAsset(token: WalletToken): PortfolioAsset {
  return {
    name: token.name,
    symbol: token.symbol,
    amount: formatTokenAmount(token.balanceFormatted, 6), // Format to prevent wrapping
    value: formatCurrency(token.usdValue),
    icon: token.logoURI || getTokenFallbackIcon(token.symbol),
    trend: getTrendFromPriceChange(token.priceChange24h),
  };
}

/**
 * Map array of WalletToken to PortfolioAsset array
 * Filters zero balances and sorts by USD value (highest first)
 */
export function mapWalletTokensToAssets(
  tokens: WalletToken[],
  options?: {
    includeZeroBalances?: boolean;
    sortBy?: 'value' | 'name' | 'symbol';
  }
): PortfolioAsset[] {
  const { includeZeroBalances = false, sortBy = 'value' } = options || {};
  
  // Filter tokens
  let filtered = tokens;
  if (!includeZeroBalances) {
    filtered = tokens.filter(token => {
      const usdValue = parseFloat(token.usdValue || '0');
      return usdValue > 0;
    });
  }
  
  // Map to portfolio assets
  const assets = filtered.map(mapWalletTokenToAsset);
  
  // Sort
  switch (sortBy) {
    case 'value':
      return assets.sort((a, b) => {
        const aValue = parseFloat(a.value.replace(/[^0-9.]/g, ''));
        const bValue = parseFloat(b.value.replace(/[^0-9.]/g, ''));
        return bValue - aValue; // Highest first
      });
    case 'name':
      return assets.sort((a, b) => a.name.localeCompare(b.name));
    case 'symbol':
      return assets.sort((a, b) => a.symbol.localeCompare(b.symbol));
    default:
      return assets;
  }
}

