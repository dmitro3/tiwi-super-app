/**
 * Portfolio Balance Hook
 * 
 * Fetches total balance and daily change for portfolio page.
 * Wrapper around useWalletBalances with portfolio-specific formatting.
 */

import { useWalletBalances } from './useWalletBalances';

export interface PortfolioBalanceData {
  totalUSD: string;           // Formatted: "4,631.21"
  dailyChange?: number;       // Percentage: 2.15
  dailyChangeUSD?: string;    // Absolute USD: "61.69"
  dailyChangeFormatted?: string; // "+$61.69 (+2.15%)"
  dailyChangeColor?: string;   // "#3FEA9B" (green) or "#FF4444" (red)
}

export interface UsePortfolioBalanceReturn {
  data: PortfolioBalanceData | null;
  isLoading: boolean;
  isFetching: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Format daily change for display
 */
function formatDailyChange(
  dailyChange?: number,
  dailyChangeUSD?: string
): {
  formatted: string;
  color: string;
} | null {
  if (dailyChange === undefined || dailyChangeUSD === undefined) {
    return null;
  }

  const isPositive = dailyChange >= 0;
  const sign = isPositive ? '+' : '';
  const color = isPositive ? '#3FEA9B' : '#FF4444'; // Green or red

  // Format USD value
  const usdFormatted = parseFloat(dailyChangeUSD).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // Format percentage
  const percentFormatted = Math.abs(dailyChange).toFixed(2);

  const formatted = `${sign}$${usdFormatted} (${sign}${percentFormatted}%)`;

  return { formatted, color };
}

/**
 * Format total USD balance with commas
 */
function formatTotalUSD(totalUSD: string): string {
  const num = parseFloat(totalUSD);
  if (isNaN(num)) return '0.00';
  
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Hook to fetch portfolio balance and daily change
 * 
 * @param walletAddress - Wallet address to fetch balance for
 * @returns Portfolio balance data, loading state, error, and refetch function
 */
export function usePortfolioBalance(
  walletAddress: string | null
): UsePortfolioBalanceReturn {
  const { 
    totalUSD, 
    dailyChange, 
    dailyChangeUSD, 
    isLoading, 
    isFetching,
    error, 
    refetch 
  } = useWalletBalances(walletAddress);

  // Format daily change
  const dailyChangeData = formatDailyChange(dailyChange, dailyChangeUSD);

  // Build portfolio balance data
  const data: PortfolioBalanceData | null = totalUSD
    ? {
        totalUSD: formatTotalUSD(totalUSD),
        dailyChange,
        dailyChangeUSD,
        dailyChangeFormatted: dailyChangeData?.formatted,
        dailyChangeColor: dailyChangeData?.color,
      }
    : null;

  return {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  };
}

