"use client";

import { useSwapStore } from "@/lib/frontend/store/swap-store";
import { useCurrencyStore } from "@/lib/frontend/store/currency-store";
import { useSettingsStore } from "@/lib/frontend/store/settings-store";
import { convertAndFormatUSD } from "@/lib/shared/utils/currency-conversion";
import { useState, useEffect } from "react";
import Skeleton from "@/components/ui/skeleton";

interface SwapDetailsCardProps {
  isExpanded: boolean;
}

export default function SwapDetailsCard({
  isExpanded,
}: SwapDetailsCardProps) {
  const route = useSwapStore((state) => state.route);
  const isQuoteLoading = useSwapStore((state) => state.isQuoteLoading);
  const currency = useCurrencyStore((state) => state.currency);
  const slippageMode = useSettingsStore((state) => state.slippageMode);
  
  // State for formatted values (async conversion)
  const [gasFeeFormatted, setGasFeeFormatted] = useState<string>("$0.00");
  const [tiwiFeeFormatted, setTiwiFeeFormatted] = useState<string>("$0.00");
  
  // Format values when route or currency changes
  useEffect(() => {
    const updateFormattedValues = async () => {
      if (route) {
        // Gas fee - use actual value from route, or "0" if not available
        const gasUSD = route.fees?.gasUSD;
        if (gasUSD && gasUSD !== '0' && gasUSD !== '0.00') {
          const formatted = await convertAndFormatUSD(gasUSD, currency);
          setGasFeeFormatted(formatted);
        } else {
          // Show "0" if gas fee is not available or is zero
          setGasFeeFormatted(currency === 'USD' ? "$0.00" : await convertAndFormatUSD("0", currency));
        }
        
        // Tiwi protocol fee - use actual value from route
        const tiwiFeeUSD = route.fees?.tiwiProtocolFeeUSD;
        if (tiwiFeeUSD && tiwiFeeUSD !== '0' && tiwiFeeUSD !== '0.00') {
          const formatted = await convertAndFormatUSD(tiwiFeeUSD, currency);
          setTiwiFeeFormatted(formatted);
        } else {
          // Show "0" if TIWI fee is not available or is zero
          setTiwiFeeFormatted(currency === 'USD' ? "$0.00" : await convertAndFormatUSD("0", currency));
        }
      } else {
        // No route available - show "0" (not loading, just no data)
        setGasFeeFormatted(currency === 'USD' ? "$0.00" : await convertAndFormatUSD("0", currency));
        setTiwiFeeFormatted(currency === 'USD' ? "$0.00" : await convertAndFormatUSD("0", currency));
      }
    };
    
    updateFormattedValues();
  }, [route, currency]);
  
  // Get router display name
  const getRouterDisplayName = (routerName: string): string => {
    const routerMap: Record<string, string> = {
      'lifi': 'LiFi',
      'pancakeswap': 'PancakeSwap',
      'uniswap': 'Uniswap',
    };
    return routerMap[routerName] || routerName.charAt(0).toUpperCase() + routerName.slice(1);
  };
  
  // Get actual aggregator/router/provider name from route
  // For LiFi: Extract from raw response or steps (could be Gluex, OKX, etc.)
  // For other routers: Show router name (PancakeSwap, Uniswap)
  const getSourceLabel = (): string => {
    if (!route) return "—";
    
    // Try to extract aggregator from LiFi raw response
    if (route.router === 'lifi' && route.raw) {
      // Check raw LiFi route for aggregator information
      const rawRoute = route.raw as any;
      
      // LiFi may have aggregator info in different places
      // Check steps for toolDetails or includedSteps
      if (route.steps && route.steps.length > 0) {
        // Find first swap step with protocol info
        const swapStep = route.steps.find(step => step.type === 'swap' && step.protocol);
        if (swapStep?.protocol) {
          // Protocol name from step (e.g., "Uniswap V3", "PancakeSwap V2")
          return swapStep.protocol;
        }
        
        // Check raw steps for more detailed aggregator info
        const rawSteps = rawRoute.steps || [];
        for (const rawStep of rawSteps) {
          // Check toolDetails for aggregator name
          if (rawStep.toolDetails?.name) {
            return rawStep.toolDetails.name;
          }
          // Check includedSteps
          if (rawStep.includedSteps && rawStep.includedSteps.length > 0) {
            const firstIncluded = rawStep.includedSteps[0];
            if (firstIncluded.toolDetails?.name) {
              return firstIncluded.toolDetails.name;
            }
          }
        }
      }
      
      // Fallback to router name
      return getRouterDisplayName(route.router);
    }
    
    // For other routers (PancakeSwap, Uniswap), show router name
    return getRouterDisplayName(route.router);
  };
  
  // Get slippage tolerance display
  // If user chose "auto", show "Auto" (not numeric value)
  // If user chose "fixed", show the numeric value from route (which is what was applied)
  const getSlippageDisplay = (): string => {
    if (slippageMode === 'auto') {
      return 'Auto';
    }
    
    // Fixed mode: show the actual slippage that was applied (from route)
    if (route?.slippage) {
      return `${parseFloat(route.slippage).toFixed(2)}%`;
    }
    
    return "0.50%"; // Default fallback
  };
  
  // Get source/provider name
  const sourceLabel = getSourceLabel();
  const slippageDisplay = getSlippageDisplay();
  return (
    <div
      className={`limit-collapse sm:mt-0 ${
        isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
      }`}
    >
      <div className="bg-[#0b0f0a] border border-[#1f261e] rounded-2xl p-4 sm:p-6 w-full mt-3">
        <div className="space-y-3 sm:space-y-4">
          {/* Gas Fee */}
          <div className="flex items-center justify-between text-sm sm:text-base">
            <span className="text-[#b5b5b5]">Gas Fee</span>
            {isQuoteLoading ? (
              <Skeleton className="h-5 w-20" />
            ) : (
              <span className="text-[#b1f128] font-medium">{gasFeeFormatted}</span>
            )}
          </div>

          {/* Source */}
          <div className="flex items-end justify-between text-sm sm:text-base">
            <span className="text-[#b5b5b5]">Source</span>
            {isQuoteLoading ? (
              <Skeleton className="h-6 w-24" />
            ) : (
              <div className="inline-flex text-[12px] leading-none">
                <span className="bg-[#156200] text-black px-3 py-1 rounded-l-[4px] font-medium">
                  Best
                </span>
                <span className="border border-[#b1f128] text-[#b1f128] px-3 py-1 rounded-r-[4px] font-medium">
                  {sourceLabel}
                </span>
              </div>
            )}
          </div>

          {/* Slippage Tolerance */}
          <div className="flex items-center justify-between text-sm sm:text-base">
            <span className="text-[#b5b5b5]">Slippage Tolerance</span>
            {isQuoteLoading ? (
              <Skeleton className="h-5 w-16" />
            ) : (
              <span className="text-[#b1f128] font-medium">
                {slippageDisplay}
              </span>
            )}
          </div>

          {/* TIWI Fee */}
          <div className="flex items-center justify-between text-sm sm:text-base">
            <span className="text-[#b5b5b5]">TIWI Fee</span>
            {isQuoteLoading ? (
              <Skeleton className="h-5 w-20" />
            ) : (
              <span className="text-[#b1f128] font-medium">{tiwiFeeFormatted}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

