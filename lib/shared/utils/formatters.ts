/**
 * Shared Formatting Utilities
 * Standardizes how numbers, prices, and values are displayed across the app.
 */

/**
 * Formats a number with smart suffixes (K, M, B, T)
 * Handles the "1304B" issue by correctly escalating to Trillions.
 */
export function formatCompactNumber(value: number | undefined | null, decimals: number = 2): string {
    if (value === undefined || value === null || isNaN(value) || value === 0) {
        return '0.00';
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
        return value.toLocaleString('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        });
    }
}

/**
 * Formats a currency value ($1.2B, $0.0001)
 */
export function formatCurrency(value: number | undefined | null, decimals: number = 2): string {
    if (value === undefined || value === null || isNaN(value)) {
        return '$--';
    }
    if (value === 0) return '$0.00';

    if (value >= 1000) {
        return `$${formatCompactNumber(value, decimals)}`;
    }

    if (value >= 1) {
        return `$${value.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;
    }

    // For small prices, use fixed precision or subscript (handled in UI components)
    if (value >= 0.0001) return `$${value.toFixed(6)}`;
    return `$${value.toFixed(8)}`;
}

/**
 * Formats percentage change (+1.23%, -0.50%)
 */
export function formatPercent(value: number | undefined | null): string {
    if (value === undefined || value === null || isNaN(value)) {
        return '0.00%';
    }
    const isPositive = value >= 0;
    return `${isPositive ? '+' : ''}${value.toFixed(2)}%`;
}
