/**
 * Price formatting utilities
 */

/**
 * Format token price as currency
 * Handles both small prices (with more decimals) and regular prices
 * 
 * @param priceUSD - Price in USD as string (e.g., "0.00000075" or "3500.00")
 * @returns Formatted price string (e.g., "$0.00000075" or "$3,500.00")
 */
export function formatTokenPrice(priceUSD: string | undefined): string {
  if (!priceUSD) return "$0.00";
  
  const price = parseFloat(priceUSD);
  if (isNaN(price) || price === 0) return "$0.00";
  
  // Format small prices with more decimals
  if (price < 0.01) {
    // For very small prices, show up to 8 decimals, removing trailing zeros
    const formatted = price.toFixed(8).replace(/\.?0+$/, '');
    return `$${formatted}`;
  }
  
  // Format regular prices
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: price < 1 ? 4 : 2,
    maximumFractionDigits: price < 1 ? 8 : 2,
  }).format(price);
}

