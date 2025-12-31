/**
 * Currency Conversion Utilities
 * 
 * Handles conversion of USD values to user's preferred currency.
 * Uses exchange rates (can be from API or static fallback).
 */

import { CURRENCIES, type Currency } from '@/lib/frontend/store/currency-store';

// ============================================================================
// Exchange Rates (Static Fallback)
// ============================================================================

/**
 * Static exchange rates (fallback if API fails)
 * Rates are approximate and should be updated periodically
 * Last updated: 2024 (these are example rates)
 */
const STATIC_EXCHANGE_RATES: Record<Currency, number> = {
  USD: 1.0,      // Base currency
  EUR: 0.92,     // 1 USD = 0.92 EUR
  NGN: 1500.0,   // 1 USD = 1500 NGN (approximate)
  GBP: 0.79,     // 1 USD = 0.79 GBP
  CNY: 7.2,      // 1 USD = 7.2 CNY
  JPY: 150.0,    // 1 USD = 150 JPY
};

// ============================================================================
// Exchange Rate Cache
// ============================================================================

interface ExchangeRateCache {
  rates: Record<Currency, number>;
  timestamp: number;
  ttl: number; // Time to live in milliseconds (1 hour)
}

let exchangeRateCache: ExchangeRateCache | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// ============================================================================
// Exchange Rate Fetching
// ============================================================================

/**
 * Fetch exchange rates from API (free tier)
 * Falls back to static rates if API fails
 */
async function fetchExchangeRates(): Promise<Record<Currency, number>> {
  try {
    // Use exchangerate-api.com free tier (no API key needed for USD base)
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
      cache: 'no-store', // Always fetch fresh rates
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch exchange rates');
    }
    
    const data = await response.json();
    console.log("🚀 ~ fetchExchangeRates ~ data:", data)
    
    // Extract rates for supported currencies
    const rates: Record<Currency, number> = {
      USD: 1.0,
      EUR: data.rates?.EUR || STATIC_EXCHANGE_RATES.EUR,
      NGN: data.rates?.NGN || STATIC_EXCHANGE_RATES.NGN,
      GBP: data.rates?.GBP || STATIC_EXCHANGE_RATES.GBP,
      CNY: data.rates?.CNY || STATIC_EXCHANGE_RATES.CNY,
      JPY: data.rates?.JPY || STATIC_EXCHANGE_RATES.JPY,
    };
    
    // Update cache
    exchangeRateCache = {
      rates,
      timestamp: Date.now(),
      ttl: CACHE_TTL,
    };
    
    return rates;
  } catch (error) {
    console.warn('[CurrencyConversion] Failed to fetch exchange rates, using static rates:', error);
    return STATIC_EXCHANGE_RATES;
  }
}

/**
 * Get exchange rates (from cache or fetch)
 */
async function getExchangeRates(): Promise<Record<Currency, number>> {
  // Check cache
  if (exchangeRateCache && (Date.now() - exchangeRateCache.timestamp) < exchangeRateCache.ttl) {
    return exchangeRateCache.rates;
  }
  
  // Fetch fresh rates
  return fetchExchangeRates();
}

// ============================================================================
// Conversion Functions
// ============================================================================

/**
 * Convert USD value to target currency
 * 
 * @param usdValue - Value in USD (as string or number)
 * @param targetCurrency - Target currency
 * @returns Promise resolving to converted value
 */
export async function convertUSDToCurrency(
  usdValue: string | number,
  targetCurrency: Currency
): Promise<number> {
  if (targetCurrency === 'USD') {
    return typeof usdValue === 'string' ? parseFloat(usdValue) || 0 : usdValue;
  }
  
  const usdNum = typeof usdValue === 'string' ? parseFloat(usdValue) || 0 : usdValue;
  if (usdNum === 0 || isNaN(usdNum)) {
    return 0;
  }
  
  const rates = await getExchangeRates();
  const rate = rates[targetCurrency] || 1;
  
  return usdNum * rate;
}

/**
 * Format value in currency with proper symbol and formatting
 * 
 * @param value - Value to format
 * @param currency - Currency code
 * @returns Formatted string (e.g., "$1,234.56" or "₦1,234.56")
 */
export function formatCurrency(value: number, currency: Currency): string {
  if (isNaN(value) || value === 0) {
    return `${CURRENCIES[currency].symbol}0.00`;
  }
  
  // Special formatting for different currencies
  const options: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: value < 1 ? 4 : 2,
    maximumFractionDigits: value < 1 ? 8 : 2,
  };
  
  // For currencies that don't support Intl.NumberFormat well, use custom formatting
  if (currency === 'NGN' || currency === 'CNY' || currency === 'JPY') {
    const symbol = CURRENCIES[currency].symbol;
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: value < 1 ? 4 : 2,
      maximumFractionDigits: value < 1 ? 8 : 2,
    }).format(value);
    return `${symbol}${formatted}`;
  }
  
  try {
    return new Intl.NumberFormat('en-US', options).format(value);
  } catch (error) {
    // Fallback formatting
    const symbol = CURRENCIES[currency].symbol;
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: value < 1 ? 4 : 2,
      maximumFractionDigits: value < 1 ? 8 : 2,
    }).format(value);
    return `${symbol}${formatted}`;
  }
}

/**
 * Convert and format USD value to target currency
 * Convenience function that combines conversion and formatting
 * 
 * @param usdValue - Value in USD (as string or number)
 * @param targetCurrency - Target currency
 * @returns Promise resolving to formatted string
 */
export async function convertAndFormatUSD(
  usdValue: string | number,
  targetCurrency: Currency
): Promise<string> {
  const converted = await convertUSDToCurrency(usdValue, targetCurrency);
  return formatCurrency(converted, targetCurrency);
}

