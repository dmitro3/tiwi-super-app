"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

interface TransactionToastProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  success: boolean;
  message: string;
  txHash?: string;
  explorerUrl?: string;
  chainId?: number;
  duration?: number;
}

/**
 * Get explorer URL based on chain
 */
function getExplorerUrl(txHash: string, chainId?: number): string {
  // Default to BSC if no chainId provided
  const chain = chainId || 56;
  
  const explorers: Record<number, string> = {
    1: `https://etherscan.io/tx/${txHash}`, // Ethereum
    56: `https://bscscan.com/tx/${txHash}`, // BSC
    137: `https://polygonscan.com/tx/${txHash}`, // Polygon
    42161: `https://arbiscan.io/tx/${txHash}`, // Arbitrum
    10: `https://optimistic.etherscan.io/tx/${txHash}`, // Optimism
    8453: `https://basescan.org/tx/${txHash}`, // Base
  };

  return explorers[chain] || `https://bscscan.com/tx/${txHash}`;
}

export default function TransactionToast({
  open,
  onOpenChange,
  success,
  message,
  txHash,
  explorerUrl,
  chainId,
  duration = 8000,
}: TransactionToastProps) {
  useEffect(() => {
    if (!open || !onOpenChange || duration === 0) return;

    const timer = setTimeout(() => {
      onOpenChange(false);
    }, duration);

    return () => clearTimeout(timer);
  }, [open, duration, onOpenChange]);

  if (!open) return null;

  const finalExplorerUrl = explorerUrl || (txHash ? getExplorerUrl(txHash, chainId) : undefined);

  return (
    <div className="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6 toast-enter">
      <div
        className={`border ${
          success
            ? "border-[#b1f128]/30"
            : "border-[#ff4444]/30"
        } border-solid flex flex-col gap-3 p-4 rounded-[12px] w-full max-w-[360px] sm:max-w-[400px] shadow-lg bg-[#0b0f0a]/95 backdrop-blur`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            {/* Icon */}
            <div
              className={`size-6 rounded-full ${
                success ? "bg-[#b1f128]/15" : "bg-[#ff4444]/15"
              } flex items-center justify-center shrink-0 mt-0.5`}
            >
              {success ? (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-[#b1f128]"
                >
                  <path
                    d="M20 6L9 17L4 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-[#ff4444]"
                >
                  <path
                    d="M18 6L6 18M6 6L18 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>

            {/* Message */}
            <div className="flex flex-col gap-0.5 flex-1 min-w-0 text-left">
              <p
                className={`font-semibold text-sm leading-tight ${
                  success ? "text-[#b1f128]" : "text-[#ff4444]"
                }`}
              >
                {success ? "Transaction Successful" : "Transaction Failed"}
              </p>
              <p className="text-[#b5b5b5] font-normal text-sm leading-relaxed break-words">
                {message}
              </p>
            </div>
          </div>

          {/* Close Button */}
          {onOpenChange && (
            <button
              onClick={() => onOpenChange(false)}
              className="text-[#7c7c7c] hover:text-[#b5b5b5] transition-colors shrink-0"
              aria-label="Close notification"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M18 6L6 18M6 6L18 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Explorer Link */}
        {finalExplorerUrl && (
          <div className="pl-9">
            <a
              href={finalExplorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[#b1f128] hover:text-[#d4ff4d] transition-colors text-sm font-medium"
            >
              <span>View on Explorer</span>
              <ExternalLink className="size-4" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

