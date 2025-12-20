/**
 * Number utilities for parsing, sanitizing, and formatting numbers
 * 
 * Platform-agnostic utilities that can be used in both web and mobile.
 */

/**
 * Sanitize decimal input - removes non-numeric characters except decimal point
 * Ensures only one decimal point and valid number format
 * @param raw - Raw input string
 * @returns Sanitized decimal string
 */
export function sanitizeDecimal(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, "");
  const [intPart, ...rest] = cleaned.split(".");
  const decimalPart = rest.join("");
  return decimalPart ? `${intPart || "0"}.${decimalPart}` : intPart;
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

