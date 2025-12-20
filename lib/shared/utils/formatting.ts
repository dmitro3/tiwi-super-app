/**
 * Formatting utilities for addresses, balances, and currency
 * 
 * Platform-agnostic utilities that can be used in both web and mobile.
 */

/**
 * Format Ethereum address: 0x{first3}...{last4}
 * @param addr - Address to format
 * @returns Formatted address string
 */
export function formatAddress(addr: string): string {
  if (addr.length <= 10) return addr;
  const withoutPrefix = addr.startsWith("0x") ? addr.slice(2) : addr;
  if (withoutPrefix.length <= 7) return addr;
  return `0x${withoutPrefix.slice(0, 3)}...${withoutPrefix.slice(-4)}`;
}

/**
 * Format address for mobile (shorter): 0x{first2}...{last3}
 * @param addr - Address to format
 * @returns Formatted address string for mobile
 */
export function formatAddressMobile(addr: string): string {
  if (addr.length <= 8) return addr;
  const withoutPrefix = addr.startsWith("0x") ? addr.slice(2) : addr;
  if (withoutPrefix.length <= 5) return addr;
  return `0x${withoutPrefix.slice(0, 2)}...${withoutPrefix.slice(-3)}`;
}

/**
 * Format balance: show balance if > 0, otherwise "0.00"
 * Format with commas for large numbers (e.g., 2,000,000,000,000.56)
 * @param balance - Balance string or undefined
 * @returns Formatted balance string
 */
export function formatBalance(balance?: string): string {
  if (!balance) return "0.00";
  const num = parseFloat(balance);
  if (isNaN(num) || num <= 0) return "0.00";
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format currency value (USD)
 * @param value - Numeric value
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted currency string (e.g., "$1,500.56")
 */
export function formatCurrency(value: number, decimals: number = 2): string {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/**
 * Format token price (USD) with smart decimal precision
 * Handles small prices (< $1) with more decimals, large prices with fewer decimals
 * @param price - Price string or undefined
 * @returns Formatted price string (e.g., "$0.0232", "$1,234.56", "$2,856.12") or "-" if missing
 */
export function formatPrice(price?: string): string {
  if (!price) return "-";
  
  const num = parseFloat(price);
  if (isNaN(num) || num <= 0) return "-";
  
  // Small prices (< $0.01): show up to 6 decimals for precision
  if (num < 0.01) {
    return `$${num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    })}`;
  }
  
  // Very small prices ($0.01 - $0.1): show 4 decimals
  if (num < 0.1) {
    return `$${num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    })}`;
  }
  
  // Small prices ($0.1 - $1): show 2-4 decimals
  if (num < 1) {
    return `$${num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    })}`;
  }
  
  // Medium prices ($1 - $1000): show 2-4 decimals
  if (num < 1000) {
    return `$${num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    })}`;
  }
  
  // Large prices (>= $1000): show 2 decimals with commas
  return `$${num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Clean URL string by removing trailing whitespace and control characters
 * Prevents Next.js Image component errors from malformed URLs
 * @param url - URL string to clean
 * @returns Cleaned URL string, or empty string if invalid
 */
export function cleanImageUrl(
  url?: string
): string {
  if (!url || typeof url !== 'string') return ''

  const trimmed = url.trim()

  // Must be absolute http(s)
  if (!/^https?:\/\//i.test(trimmed)) {
    return ''
  }

  try {
    // This validates without encoding
    new URL(trimmed)
    return trimmed
  } catch {
    return ''
  }
}

