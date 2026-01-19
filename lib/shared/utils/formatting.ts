/**
 * Formatting utilities for addresses, balances, and currency
 * 
 * Uses locale store (language, region, currency, date format) when available;
 * falls back to en-US / USD on server or if store is unavailable.
 */

import { useLocaleStore } from "@/lib/locale/locale-store";

function getLocaleConfig(): { locale: string; currency: string; dateFormat: string } {
  try {
    const s = useLocaleStore.getState();
    return {
      locale: s.getLocale(),
      currency: s.currency,
      dateFormat: s.dateFormat,
    };
  } catch {
    return { locale: "en-US", currency: "USD", dateFormat: "MM/DD/YY" };
  }
}

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
 * Uses locale for number formatting (decimal/grouping separators).
 * @param balance - Balance string or undefined
 * @returns Formatted balance string
 */
export function formatBalance(balance?: string): string {
  if (!balance) return "0.00";
  const num = parseFloat(balance);
  if (isNaN(num) || num <= 0) return "0.00";
  const { locale } = getLocaleConfig();
  return num.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format currency value using locale and currency from settings.
 * @param value - Numeric value
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted currency string (e.g., "$1,500.56", "€1.500,56")
 */
export function formatCurrency(value: number, decimals: number = 2): string {
  const { locale, currency } = getLocaleConfig();
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format token price with smart decimal precision; uses locale and currency from settings.
 * Handles small prices (< $1) with more decimals, large prices with fewer decimals.
 * @param price - Price string or undefined
 * @returns Formatted price string (e.g., "$0.0232", "€1.234,56") or "-" if missing
 */
export function formatPrice(price?: string): string {
  if (!price) return "-";

  const num = parseFloat(price);
  if (isNaN(num) || num <= 0) return "-";

  const { locale, currency } = getLocaleConfig();
  let minFrac = 2;
  let maxFrac = 2;

  if (num < 0.000001) {
    minFrac = 2;
    maxFrac = 12;
  } else if (num < 0.01) {
    minFrac = 2;
    maxFrac = 6;
  } else if (num < 0.1) {
    minFrac = 2;
    maxFrac = 4;
  } else if (num < 1000) {
    minFrac = 2;
    maxFrac = 4;
  }
  // else num >= 1000: minFrac=2, maxFrac=2

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: minFrac,
    maximumFractionDigits: maxFrac,
  }).format(num);
}

/**
 * Format date using regional format from settings (MM/DD/YY, DD/MM/YY, or YYYY-MM-DD).
 * @param date - Date to format
 * @param formatOverride - Optional override; if not provided, uses store's dateFormat
 * @returns Formatted date string
 */
export function formatDate(
  date: Date,
  formatOverride?: "MM/DD/YY" | "DD/MM/YY" | "YYYY-MM-DD"
): string {
  const { dateFormat } = getLocaleConfig();
  const fmt = formatOverride ?? dateFormat;
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const y = date.getFullYear();
  const yy = String(y).slice(-2);
  if (fmt === "MM/DD/YY") return `${m}/${d}/${yy}`;
  if (fmt === "DD/MM/YY") return `${d}/${m}/${yy}`;
  return `${y}-${m}-${d}`; // YYYY-MM-DD
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

/** */