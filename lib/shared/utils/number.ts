/**
 * Number utilities for parsing, sanitizing, and formatting numbers
 * 
 * Platform-agnostic utilities that can be used in both web and mobile.
 */

/**
 * Sanitize decimal input - removes non-numeric characters except decimal point
 * Ensures only one decimal point and valid number format
 * Handles edge cases:
 * - Leading zeros (e.g., "01" → "01", "0.1" → "0.1")
 * - Decimal point at start (e.g., ".1" → "0.1")
 * - Multiple decimal points (keeps only the first)
 * - Zero decimals (e.g., "0.00", "0.0" → preserved as-is)
 * - Empty input → ""
 * @param raw - Raw input string
 * @returns Sanitized decimal string
 */
export function sanitizeDecimal(raw: string): string {
  // Remove all non-numeric characters except decimal point
  const cleaned = raw.replace(/[^\d.]/g, "");
  
  // Handle empty input
  if (!cleaned || cleaned === "") {
    return "";
  }
  
  // Check if input ends with "." (user is still typing decimal)
  const endsWithDecimal = cleaned.endsWith(".");
  
  // Split by decimal point (keep only first occurrence)
  const parts = cleaned.split(".");
  const intPart = parts[0] || "";
  const decimalPart = parts.slice(1).join(""); // Join all parts after first decimal point
  
  // If there's a decimal part, combine them
  if (decimalPart) {
    // If integer part is empty (e.g., ".1"), add "0"
    return intPart === "" ? `0.${decimalPart}` : `${intPart}.${decimalPart}`;
  }
  
  // No decimal part yet, but user typed "." - preserve it
  if (endsWithDecimal) {
    // If integer part is empty (just "."), convert to "0."
    return intPart === "" ? "0." : `${intPart}.`;
  }
  
  // No decimal part and no trailing "." - return integer part as-is (allows "01", "001", etc.)
  // This also preserves "0" which is valid
  return intPart;
}

/**
 * Parse string to number, returning 0 if invalid
 * @param value - String value to parse
 * @returns Parsed number or 0 if invalid
 */
export function parseNumber(value: string): number {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Format number with specified decimal places
 * @param value - Number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted number string
 */
export function formatNumber(value: number, decimals: number = 2): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

