import { useEffect } from "react";
import { parseNumber } from "@/lib/shared/utils/number";
import { calculateSwapQuote, formatQuote } from "@/lib/frontend/calculations/swap";

interface UseSwapQuoteOptions {
  fromAmount: string;
  activeTab: "swap" | "limit";
  setToAmount: (amount: string) => void;
  setQuoteLoading: (loading: boolean) => void;
  delay?: number; // Debounce delay in ms (default: 500)
}

/**
 * Custom hook for fetching swap quotes
 * Handles debouncing and loading states
 * Updates Zustand store instead of returning state
 */
export function useSwapQuote({
  fromAmount,
  activeTab,
  setToAmount,
  setQuoteLoading,
  delay = 500,
}: UseSwapQuoteOptions): void {
  useEffect(() => {
    const amountNum = parseNumber(fromAmount);

    // Reset when zero/empty
    if (!amountNum || amountNum <= 0) {
      setQuoteLoading(false);
      setToAmount("");
      return;
    }

    setQuoteLoading(true);
    setToAmount("");

    const handle = setTimeout(() => {
      // Calculate quote using dummy rate
      // TODO: Replace with actual API call
      const quote = calculateSwapQuote(amountNum);
      const formatted = formatQuote(quote);

      setToAmount(formatted);
      setQuoteLoading(false);
    }, delay);

    return () => clearTimeout(handle);
  }, [fromAmount, activeTab, delay, setToAmount, setQuoteLoading]);
}

