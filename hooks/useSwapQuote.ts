import { useEffect, useRef } from "react";
import { parseNumber } from "@/lib/shared/utils/number";
import { fetchRoute } from "@/lib/frontend/api/route";
import { useSwapStore } from "@/lib/frontend/store/swap-store";
import { useSettingsStore } from "@/lib/frontend/store/settings-store";
import type { Token } from "@/lib/frontend/types/tokens";

interface UseSwapQuoteOptions {
  fromAmount: string;
  activeTab: "swap" | "limit";
  fromToken: Token | null;
  toToken: Token | null;
  delay?: number; // Debounce delay in ms (default: 500)
}

/**
 * Custom hook for fetching swap quotes
 * Handles debouncing, loading states, and API calls
 * Updates Zustand store with quote results
 */
export function useSwapQuote({
  fromAmount,
  activeTab,
  fromToken,
  toToken,
  delay = 500,
}: UseSwapQuoteOptions): void {
  const setRoute = useSwapStore((state) => state.setRoute);
  const setToAmount = useSwapStore((state) => state.setToAmount);
  const setQuoteLoading = useSwapStore((state) => state.setQuoteLoading);
  const setQuoteError = useSwapStore((state) => state.setQuoteError);
  
  // Get user slippage settings
  const slippageMode = useSettingsStore((state) => state.slippageMode);
  const slippageTolerance = useSettingsStore((state) => state.slippageTolerance);
  
  // Store latest quote expiration for refresh functionality
  const quoteExpiresAtRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const amountNum = parseNumber(fromAmount);

    // Reset when zero/empty or missing tokens
    if (!amountNum || amountNum <= 0 || !fromToken || !toToken) {
      setQuoteLoading(false);
      setToAmount("");
      setQuoteError(null);
      setRoute(null);
      quoteExpiresAtRef.current = null;
      return;
    }

    // Only fetch quotes for swap tab (limit orders handled separately)
    if (activeTab !== "swap") {
      setQuoteLoading(false);
      setToAmount("");
      setQuoteError(null);
      setRoute(null);
      return;
    }

    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setQuoteLoading(true);
    setToAmount("");
    setQuoteError(null);
    setRoute(null);

    const handle = setTimeout(async () => {
      try {
        // Fetch route from API
        // Type assertion: chainId is guaranteed to be number at this point due to validation above
        const routeResponse = await fetchRoute({
          fromToken: {
            chainId: fromToken.chainId as number,
            address: fromToken.address,
            symbol: fromToken.symbol,
          },
          toToken: {
            chainId: toToken.chainId as number,
            address: toToken.address,
            symbol: toToken.symbol,
          },
          fromAmount: fromAmount,
          slippage: slippageMode === 'fixed' ? slippageTolerance : undefined, // Use user's fixed slippage or let backend handle auto
          slippageMode: slippageMode,
          order: 'RECOMMENDED', // Default order (can be made configurable)
        });

        // Check if request was aborted
        if (abortController.signal.aborted) {
          return;
        }

        // Extract output amount from route
        const outputAmount = routeResponse.route.toToken.amount;
        const formattedOutput = formatToSixDecimals(outputAmount);
        
        // Store expiration timestamp for refresh functionality
        quoteExpiresAtRef.current = routeResponse.expiresAt;

        // Update store with quote result and full route
        setToAmount(formattedOutput);
        setRoute(routeResponse.route); // Store full route response (includes USD values, fees, etc.)
        setQuoteLoading(false);
        setQuoteError(null);
      } catch (error: any) {
        // Check if request was aborted
        if (abortController.signal.aborted) {
          return;
        }

        // Handle error
        console.error('[useSwapQuote] Error fetching quote:', error);
        setToAmount("");
        setRoute(null);
        setQuoteLoading(false);
        setQuoteError(error instanceof Error ? error : new Error(error?.message || 'Failed to fetch quote'));
        quoteExpiresAtRef.current = null;
      }
    }, delay);

    return () => {
      clearTimeout(handle);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fromAmount, activeTab, fromToken, toToken, delay, setToAmount, setQuoteLoading, setQuoteError, setRoute, slippageMode, slippageTolerance]);
}

/**
 * Refresh quote manually
 * Useful for quote refresh button
 */
export function useRefreshQuote() {
  const fromAmount = useSwapStore((state) => state.fromAmount);
  const fromToken = useSwapStore((state) => state.fromToken);
  const toToken = useSwapStore((state) => state.toToken);
  const setToAmount = useSwapStore((state) => state.setToAmount);
  const setQuoteLoading = useSwapStore((state) => state.setQuoteLoading);
  const setQuoteError = useSwapStore((state) => state.setQuoteError);
  const setRoute = useSwapStore((state) => state.setRoute);

  return async () => {
    if (!fromAmount || !fromToken || !toToken || !fromToken.chainId || !toToken.chainId) {
      return;
    }

    setQuoteLoading(true);
    setQuoteError(null);
    setRoute(null);

    try {
      const routeResponse = await fetchRoute({
        fromToken: {
          chainId: fromToken.chainId,
          address: fromToken.address,
          symbol: fromToken.symbol,
        },
        toToken: {
          chainId: toToken.chainId,
          address: toToken.address,
          symbol: toToken.symbol,
        },
        fromAmount: fromAmount,
        slippage: slippageMode === 'fixed' ? slippageTolerance : undefined,
        slippageMode: slippageMode,
        order: 'RECOMMENDED',
      });

      setToAmount(formatToSixDecimals(routeResponse.route.toToken.amount));
      setRoute(routeResponse.route); // Store full route response
      setQuoteLoading(false);
      setQuoteError(null);
    } catch (error: any) {
      console.error('[useRefreshQuote] Error refreshing quote:', error);
      setRoute(null);
      setQuoteLoading(false);
      setQuoteError(error instanceof Error ? error : new Error(error?.message || 'Failed to refresh quote'));
    }
  };
}

/**
 * Format output amount to 6 decimal places for display.
 * If parsing fails, return original string.
 */
function formatToSixDecimals(value: string): string {
  const num = Number(value);
  if (!isFinite(num)) {
    return value;
  }
  return num.toFixed(6);
}

