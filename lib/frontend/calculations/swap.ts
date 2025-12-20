/**
 * Swap calculation utilities
 */

/**
 * Calculate USD value for from token (TWC example rate)
 * @param amount - Amount in token units
 * @param rate - Conversion rate (default: 0.0000015 for TWC)
 * @returns USD value string (e.g., "$1500")
 */
export function calculateFromUsdValue(
  amount: number,
  rate: number = 0.0000015
): string {
  if (!amount || amount <= 0) return "$0";
  return `$${Math.round(amount * rate)}`;
}

/**
 * Calculate USD value for to token (USDC example rate)
 * @param amount - Amount in token units
 * @param rate - Conversion rate (default: 1 for USDC)
 * @returns USD value string (e.g., "$100")
 */
export function calculateToUsdValue(
  amount: number,
  rate: number = 1
): string {
  if (!amount || amount <= 0) return "$0";
  return `$${Math.round(amount * rate)}`;
}

/**
 * Calculate limit price USD value
 * @param price - Price per token
 * @param rate - Conversion rate (default: 11.2)
 * @returns USD value string (e.g., "$11.20")
 */
export function calculateLimitPriceUsd(
  price: number,
  rate: number = 11.2
): string {
  if (!price || price <= 0) return "$0";
  return `$${price.toFixed(2)}`;
}

/**
 * Calculate swap quote (dummy implementation)
 * @param amount - Input amount
 * @param rate - Exchange rate (default: 1.5e-6)
 * @returns Quote amount
 */
export function calculateSwapQuote(
  amount: number,
  rate: number = 1.5e-6
): number {
  if (!amount || amount <= 0) return 0;
  return amount * rate;
}

/**
 * Format quote amount for display
 * @param quote - Quote amount
 * @returns Formatted quote string
 */
export function formatQuote(quote: number): string {
  if (quote >= 1) return quote.toFixed(3);
  return quote.toPrecision(3);
}

