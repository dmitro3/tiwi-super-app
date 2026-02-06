import { useEffect, useRef } from "react";
import { parseNumber } from "@/lib/shared/utils/number";
import { fetchRoute } from "@/lib/frontend/api/route";
import { useSwapStore } from "@/lib/frontend/store/swap-store";
import { useSettingsStore } from "@/lib/frontend/store/settings-store";
import type { Token } from "@/lib/frontend/types/tokens";
import { RouterRoute } from "@/lib/backend/routers";
import { useAccount } from "wagmi";
import { isAddressChainCompatible } from "@/lib/frontend/utils/wallet-display";

interface UseSwapQuoteOptions {
  fromAmount: string;
  toAmount: string;
  activeInput: 'from' | 'to' | null;
  activeTab: "swap" | "limit";
  fromToken: Token | null;
  toToken: Token | null;
  limitPrice: string;
  recipient?: string | null; // Recipient address (toAddress) - user-provided or connected wallet
  delay?: number; // Debounce delay in ms (default: 500)
}

/**
 * Custom hook for fetching swap quotes
 * Handles debouncing, loading states, and API calls
 * Updates Zustand store with quote results
 */
export function useSwapQuote({
  fromAmount,
  toAmount,
  activeInput,
  activeTab,
  fromToken,
  toToken,
  limitPrice,
  recipient,
  delay = 200,
}: UseSwapQuoteOptions): void {
  const setRoute = useSwapStore((state) => state.setRoute);
  const setToAmount = useSwapStore((state) => state.setToAmount);
  const setFromAmount = useSwapStore((state) => state.setFromAmount);
  const updateFromAmount = useSwapStore((state) => state.updateFromAmount);
  const updateToAmount = useSwapStore((state) => state.updateToAmount);
  const setQuoteLoading = useSwapStore((state) => state.setQuoteLoading);
  const setQuoteError = useSwapStore((state) => state.setQuoteError);
  // Note: Do NOT read route here - it's stale. Use getState() for debugging only.
  // Get user slippage settings
  const slippageMode = useSettingsStore((state) => state.slippageMode);
  const slippageTolerance = useSettingsStore((state) => state.slippageTolerance);

  // Get connected wallet address for fromAddress parameter
  // This improves routing speed and accuracy, especially for LiFi
  const { address: connectedAddress, isConnected } = useAccount();

  // Store latest quote expiration for refresh functionality
  const quoteExpiresAtRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Track when updates are from quote responses (not user input) to prevent circular updates
  const isUpdatingFromQuoteRef = useRef(false);

  // Track last requested amount and activeInput to prevent duplicate requests
  const lastRequestedAmountRef = useRef<string>('');
  const lastActiveInputRef = useRef<'from' | 'to' | null>(null);

  useEffect(() => {
    // Determine which amount to use based on activeInput
    // Default to 'from' if activeInput is null (backward compatibility)
    const isReverseRouting = activeInput === 'to';
    const inputAmount = isReverseRouting ? toAmount : fromAmount;
    const amountNum = parseNumber(inputAmount);

    // Skip if we're updating from a quote response (prevents circular updates)
    // This flag is set when we update amounts from a quote response, and checked here
    // to prevent the effect from re-running when the store updates
    if (isUpdatingFromQuoteRef.current) {
      // Reset flag and return early - this update was triggered by our own quote response
      isUpdatingFromQuoteRef.current = false;
      return;
    }

    // Check if this is a duplicate request (same amount and activeInput)
    // This prevents re-fetching when the same input triggers the effect multiple times
    const requestKey = `${activeInput}-${inputAmount}`;
    if (requestKey === `${lastActiveInputRef.current}-${lastRequestedAmountRef.current}` && lastRequestedAmountRef.current !== '') {
      return;
    }

    // Update last requested values only if we're actually going to make a request
    // (not for partial decimals or invalid inputs)

    // Define clear invariants for valid quote input
    // Route is valid ONLY when all of these are true:
    // 1. amountNum > 0 (not zero, not "0.00000", etc.)
    // 2. fromToken and toToken are selected
    // 3. activeTab is "swap"

    // Check if input is a zero value (including "0", "0.0", "0.00", "0.00000", etc.)
    const isZeroValue = amountNum === 0;

    // Check if input is a partial decimal (user is still typing, e.g., "0.", "0.0", "123.")
    const isPartialDecimal = inputAmount.endsWith('.') || /^0\.0*$/.test(inputAmount);

    // Valid quote input requires:
    // - amountNum > 0 (not zero)
    // - tokens are selected
    const isValidQuoteInput =
      amountNum > 0 &&
      fromToken !== null &&
      toToken !== null;

    // Explicitly clear route and loading state when invariants break
    if (!isValidQuoteInput) {
      setQuoteLoading(false); // Don't show skeleton for invalid/zero amounts
      // Only clear the calculated field (opposite of what user is editing)
      // Use updateFromAmount/updateToAmount to avoid changing activeInput (prevents circular updates)
      if (isReverseRouting) {
        // User is editing toAmount, clear fromAmount (calculated)
        updateFromAmount("");
      } else {
        // User is editing fromAmount, clear toAmount (calculated)
        updateToAmount("");
      }
      setRoute(null); // ✅ Explicitly and intentionally clear route
      setQuoteError(null);
      quoteExpiresAtRef.current = null;
      lastRequestedAmountRef.current = '';
      return;
    }

    // Let the main quoting logic handle both tabs to ensure "to and fro" reaction works identical
    // to normal swap as requested by the user.

    let stepTimer1: any;
    let stepTimer2: any;
    let stepTimer3: any;
    let stepTimer4: any;
    let stepTimer5: any;

    const handle = setTimeout(async () => {
      // Only set loading state and fetch quote for valid amounts (amountNum > 0)
      setQuoteLoading(true);

      // UI Experience: Simulate fetching steps for visual engagement
      const setQuoteStep = useSwapStore.getState().setQuoteStep;
      setQuoteStep("Searching routes...");
      stepTimer1 = setTimeout(() => setQuoteStep("Scanning DEXes..."), 1200);
      stepTimer2 = setTimeout(() => setQuoteStep("Checking Multi-Hop paths..."), 3500);
      stepTimer3 = setTimeout(() => setQuoteStep("Verifying liquidity..."), 8000);
      stepTimer4 = setTimeout(() => setQuoteStep("Finalizing best route..."), 15000);
      stepTimer5 = setTimeout(() => setQuoteStep("Searching deeper for better rates..."), 25000);

      // Update last requested values now that we're actually making a request
      lastRequestedAmountRef.current = inputAmount;
      lastActiveInputRef.current = activeInput;

      // Cancel previous request if still pending
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller for this request
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      // Don't clear the opposite field here - it will be updated from quote response
      // This allows the user to see their input while the quote is loading
      setQuoteError(null);
      // Don't clear route here - it will be updated after API call succeeds
      // Only clear route when explicitly resetting (amount zero, tokens change, etc.)

      try {
        // Calculate liquidityUSD from token data
        // Use minimum of fromToken and toToken liquidity (conservative approach)
        // If only one has liquidity, use that; if neither has it, don't pass it (backend will fetch)
        let liquidityUSD: number | undefined = undefined;
        if (fromToken.liquidity !== undefined && toToken.liquidity !== undefined) {
          // Use minimum liquidity (more conservative, ensures route works for both tokens)
          liquidityUSD = Math.min(fromToken.liquidity, toToken.liquidity);
        } else if (fromToken.liquidity !== undefined) {
          // Use fromToken liquidity as proxy
          liquidityUSD = fromToken.liquidity;
        } else if (toToken.liquidity !== undefined) {
          // Use toToken liquidity as proxy
          liquidityUSD = toToken.liquidity;
        }
        // If neither has liquidity, liquidityUSD remains undefined (backend will fetch)

        // Determine addresses for routing with chain compatibility validation
        // fromAddress: Must be compatible with fromToken.chainId
        // recipient: Must be compatible with toToken.chainId
        let fromAddress: string | undefined = undefined;
        let recipientAddress: string | undefined = undefined;

        // Validate fromAddress against fromToken chain
        if (isConnected && connectedAddress && fromToken?.chainId) {
          if (isAddressChainCompatible(connectedAddress, fromToken.chainId)) {
            fromAddress = connectedAddress;
          } else {
            console.log('[useSwapQuote] Connected address is not compatible with fromToken chain, skipping fromAddress');
          }
        }

        // Validate recipient against toToken chain
        if (recipient && toToken?.chainId) {
          if (isAddressChainCompatible(recipient, toToken.chainId)) {
            recipientAddress = recipient;
          } else {
            console.log('[useSwapQuote] Recipient address is not compatible with toToken chain, skipping recipient');
            // Fallback to connected address if compatible with toToken chain
            if (isConnected && connectedAddress && isAddressChainCompatible(connectedAddress, toToken.chainId)) {
              recipientAddress = connectedAddress;
            }
          }
        } else if (isConnected && connectedAddress && toToken?.chainId) {
          // No recipient provided, use connected address if compatible
          if (isAddressChainCompatible(connectedAddress, toToken.chainId)) {
            recipientAddress = connectedAddress;
          }
        }

        // Fetch route from API
        // Type assertion: chainId is guaranteed to be number at this point due to validation above
        // Decimals are required and come from token data (enriched by TokenService from blockchain)
        const routeResponse = await fetchRoute({
          fromToken: {
            chainId: fromToken.chainId as number,
            address: fromToken.address,
            symbol: fromToken.symbol,
            decimals: fromToken.decimals, // Required: from token data
          },
          toToken: {
            chainId: toToken.chainId as number,
            address: toToken.address,
            symbol: toToken.symbol,
            decimals: toToken.decimals, // Required: from token data
          },
          // Use reverse routing if activeInput is 'to'
          ...(isReverseRouting ? { toAmount: inputAmount } : { fromAmount: inputAmount }),
          fromAddress, // Connected wallet address (improves routing speed with LiFi getQuote)
          recipient: recipientAddress, // Recipient address (toAddress) - user-provided or connected wallet
          slippage: slippageMode === 'fixed' ? slippageTolerance : undefined, // Use user's fixed slippage or let backend handle auto
          slippageMode: slippageMode,
          order: 'RECOMMENDED', // Default order (can be made configurable)
          liquidityUSD, // Pass liquidity from token data (if available)
        });

        // Check if request was aborted
        if (abortController.signal.aborted) {
          return;
        }

        // Check for error in response (API returns error field even on 200 status)
        if (routeResponse.error) {
          console.error('[useSwapQuote] Route API error:', routeResponse.error);
          // Clear the calculated field on error (use update functions to avoid changing activeInput)
          if (isReverseRouting) {
            updateFromAmount("");
          } else {
            updateToAmount("");
          }
          setRoute(null); // ✅ Clear route on error
          setQuoteLoading(false);
          setQuoteError(new Error(routeResponse.error));
          quoteExpiresAtRef.current = null;
          lastRequestedAmountRef.current = '';
          isUpdatingFromQuoteRef.current = false;
          return;
        }

        // Validate route response before storing
        // Check if route exists and has required fields (router, fromToken, toToken)
        // For reverse routing, output is in fromToken.amount; for normal routing, it's in toToken.amount
        const outputAmount = isReverseRouting
          ? routeResponse.route?.fromToken?.amount
          : routeResponse.route?.toToken?.amount;

        if (!routeResponse.route ||
          !routeResponse.route.router ||
          !routeResponse.route.fromToken ||
          !routeResponse.route.toToken ||
          !outputAmount) {
          console.error('[useSwapQuote] Invalid route response:', {
            hasRoute: !!routeResponse.route,
            router: routeResponse.route?.router,
            hasFromToken: !!routeResponse.route?.fromToken,
            hasToToken: !!routeResponse.route?.toToken,
            outputAmount,
            isReverseRouting,
            fullResponse: routeResponse,
          });
          // Clear the calculated field on error (use update functions to avoid changing activeInput)
          if (isReverseRouting) {
            updateFromAmount("");
          } else {
            updateToAmount("");
          }
          setRoute(null); // ✅ Clear route on invalid response
          setQuoteLoading(false);
          setQuoteError(new Error('Invalid route response from server'));
          quoteExpiresAtRef.current = null;
          lastRequestedAmountRef.current = '';
          isUpdatingFromQuoteRef.current = false;
          return;
        }

        // Extract output amount from route (already extracted above during validation)
        const formattedOutput = formatToSixDecimals(outputAmount);

        // Store expiration timestamp for refresh functionality
        quoteExpiresAtRef.current = routeResponse.expiresAt;

        // Update store with quote result and full route
        // Use updateFromAmount/updateToAmount to avoid changing activeInput
        // This prevents circular updates (updating fromAmount shouldn't trigger another fetch)

        // Set flag BEFORE updating to prevent next effect run from re-fetching
        isUpdatingFromQuoteRef.current = true;

        if (isReverseRouting) {
          updateFromAmount(formattedOutput);
        } else {
          updateToAmount(formattedOutput);
        }

        // If in Limit mode, also update the limitPrice to match the market rate
        // this fulfills the user's request for "to and fro" reaction identity
        if (activeTab === 'limit') {
          const finalFromAmount = isReverseRouting ? formattedOutput : inputAmount;
          const finalToAmount = isReverseRouting ? inputAmount : formattedOutput;
          const fromNum = parseNumber(finalFromAmount);
          const toNum = parseNumber(finalToAmount);

          if (fromNum > 0 && toNum > 0) {
            const impliedPrice = toNum / fromNum;
            // Use high precision for limit price but capped to prevent extreme lengths
            useSwapStore.getState().setLimitPrice(impliedPrice.toFixed(10).replace(/\.?0+$/, ""));
          }
        }

        setRoute(routeResponse.route); // Store full route response (includes USD values, fees, etc.)

        setQuoteLoading(false);
        setQuoteError(null);

        // Don't reset flag here - let the next effect run check it and reset it
        // This ensures any immediate re-render triggered by the store update will skip

        // Debug logging (use getState() for accurate current state)
        const storedRoute = useSwapStore.getState().route;
        console.log('[useSwapQuote] Route stored successfully:', {
          router: routeResponse.route.router,
          routeId: routeResponse.route.routeId,
          stepsCount: routeResponse.route.steps?.length,
          hasFees: !!routeResponse.route.fees,
          storedRouteExists: !!storedRoute,
        });
      } catch (error: any) {
        // Check if request was aborted
        if (abortController.signal.aborted) {
          return;
        }

        // Handle error
        console.error('[useSwapQuote] Error fetching quote:', error);
        // Clear the calculated field on error (use update functions to avoid changing activeInput)
        if (isReverseRouting) {
          updateFromAmount("");
        } else {
          updateToAmount("");
        }
        setRoute(null); // ✅ Clear route on error
        setQuoteLoading(false);
        setQuoteError(error instanceof Error ? error : new Error(error?.message || 'Failed to fetch quote'));
        quoteExpiresAtRef.current = null;
        lastRequestedAmountRef.current = '';
        isUpdatingFromQuoteRef.current = false;
      }
    }, delay);

    return () => {
      clearTimeout(handle);
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
      clearTimeout(stepTimer4);
      clearTimeout(stepTimer5);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [
    fromAmount,
    toAmount,
    activeInput,
    activeTab,
    fromToken?.chainId,
    fromToken?.address,
    toToken?.chainId,
    toToken?.address,
    delay,
    slippageMode,
    slippageTolerance,
    recipient,
    limitPrice,
    // Note: Store functions (updateFromAmount, updateToAmount, setRoute, etc.) are stable
    // and don't need to be in dependency array, but including them is safe
  ]);
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

  // Get user slippage settings
  const slippageMode = useSettingsStore((state) => state.slippageMode);
  const slippageTolerance = useSettingsStore((state) => state.slippageTolerance);

  // Get connected wallet address for fromAddress parameter
  const { address: connectedAddress, isConnected } = useAccount();

  return async () => {
    if (!fromAmount || !fromToken || !toToken || !fromToken.chainId || !toToken.chainId) {
      return;
    }

    setQuoteLoading(true);
    setQuoteError(null);
    setRoute(null);

    try {
      // Determine addresses for routing
      // Note: useRefreshQuote doesn't have recipient parameter, so we only use connected address
      const fromAddress = isConnected && connectedAddress ? connectedAddress : undefined;
      const recipientAddress = isConnected && connectedAddress ? connectedAddress : undefined;

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
        fromAddress, // Connected wallet address (improves routing speed with LiFi getQuote)
        recipient: recipientAddress, // Recipient address (toAddress) - user-provided or connected wallet
        slippage: slippageMode === 'fixed' ? slippageTolerance : undefined,
        slippageMode: slippageMode,
        order: 'RECOMMENDED',
      });

      // Validate route response before storing
      if (!routeResponse.route || !routeResponse.route.router || !routeResponse.route.fromToken) {
        console.error('[useRefreshQuote] Invalid route response:', routeResponse);
        setRoute(null);
        setQuoteLoading(false);
        setQuoteError(new Error('Invalid route response from server'));
        return;
      }

      setToAmount(formatToSixDecimals(routeResponse.route.toToken.amount));
      setRoute(routeResponse.route); // Store full route response
      setQuoteLoading(false);
      setQuoteError(null);

      console.log('[useRefreshQuote] Route refreshed successfully:', {
        router: routeResponse.route.router,
        routeId: routeResponse.route.routeId,
      });
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

  // For zero or very small numbers, just return 0
  if (num === 0) return "0";

  // If the number is large (> 1,000,000), don't truncate decimals unless necessary
  // but avoid scientific notation
  if (num > 1000000) {
    // Check if it has a decimal part
    if (value.includes('.')) {
      const [intPart, decimalPart] = value.split('.');
      return `${intPart}.${decimalPart.substring(0, 6)}`;
    }
    return value;
  }

  // Standard formatting for normal numbers
  return num.toFixed(6).replace(/\.?0+$/, "");
}

