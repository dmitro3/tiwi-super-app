/**
 * Formats a number with K, M, B, T suffixes
 */
export function formatNumber(value: number | undefined, decimals: number = 2): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '0';
  }

  if (value === 0) {
    return '0';
  }

  const absValue = Math.abs(value);
  
  if (absValue >= 1e12) {
    return `${(value / 1e12).toFixed(decimals)}T`;
  } else if (absValue >= 1e9) {
    return `${(value / 1e9).toFixed(decimals)}B`;
  } else if (absValue >= 1e6) {
    return `${(value / 1e6).toFixed(decimals)}M`;
  } else if (absValue >= 1e3) {
    return `${(value / 1e3).toFixed(decimals)}K`;
  } else {
    return value.toFixed(decimals);
  }
}

/**
 * Formats percentage change
 */
export function formatPercentageChange(value: number | undefined): {
  formatted: string;
  isPositive: boolean;
} {
  if (value === undefined || value === null || isNaN(value)) {
    return { formatted: '0.00%', isPositive: false };
  }

  const isPositive = value >= 0;
  const formatted = `${isPositive ? '+' : ''}${value.toFixed(2)}%`;
  
  return { formatted, isPositive };
}

/**
 * Format token supply from raw uint256 value with decimals
 * 
 * @param rawSupply - Raw supply value as string or bigint (uint256)
 * @param decimals - Token decimals (default: 9 for TWC)
 * @returns Formatted supply string with commas and tooltip value
 * 
 * @example
 * formatTokenSupply("908824899185662757314442", 9)
 * // Returns: { display: "908,824,899,185.662757314", tooltip: "908,824,899,185.662757314 TWC" }
 */
export function formatTokenSupply(
  rawSupply: string | bigint | number | undefined,
  decimals: number = 9
): {
  display: string;
  tooltip: string;
} {
  if (!rawSupply) {
    return { display: '0', tooltip: '0 TWC' };
  }

  try {
    // Convert to BigInt to handle large uint256 values
    const supplyBigInt = typeof rawSupply === 'bigint' 
      ? rawSupply 
      : typeof rawSupply === 'string' 
        ? BigInt(rawSupply) 
        : BigInt(Math.floor(rawSupply));

    // Calculate divisor (10^decimals)
    const divisor = BigInt(10 ** decimals);
    
    // Split into whole and fractional parts
    const wholePart = supplyBigInt / divisor;
    const fractionalPart = supplyBigInt % divisor;
    
    // Format whole part with commas
    const wholeFormatted = wholePart.toLocaleString('en-US');
    
    // Format fractional part (pad with zeros if needed, remove trailing zeros)
    const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
    const fractionalTrimmed = fractionalStr.replace(/0+$/, '');
    
    // Combine whole and fractional parts
    const display = fractionalTrimmed 
      ? `${wholeFormatted}.${fractionalTrimmed}`
      : wholeFormatted;
    
    // Tooltip shows full value with all decimals
    const tooltip = fractionalStr 
      ? `${wholeFormatted}.${fractionalStr} TWC`
      : `${wholeFormatted} TWC`;
    
    return { display, tooltip };
  } catch (error) {
    console.error('[formatTokenSupply] Error formatting supply:', error);
    return { display: '0', tooltip: '0 TWC' };
  }
}

