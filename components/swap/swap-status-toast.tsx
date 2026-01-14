"use client";

import { useEffect } from "react";
import { ExternalLink } from "lucide-react";
import type { SwapStage } from "@/lib/frontend/services/swap-executor/types";
import { getExplorerUrl, getExplorerName } from "@/lib/frontend/utils/explorer-urls";

interface SwapStatusToastProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stage: SwapStage;
  message: string;
  txHash?: string;
  chainId?: number;
  progress?: number; // 0-100 for progress bar
  duration?: number; // Auto-dismiss duration (0 = persistent)
}

/**
 * Get auto-dismiss duration based on stage
 */
function getAutoDismissDuration(stage: SwapStage): number {
  switch (stage) {
    case 'preparing':
      return 4000; // 4 seconds
    case 'approving':
      return 5000; // 5 seconds
    case 'signing':
      return 0; // Persistent until user dismisses or next stage
    case 'submitting':
      return 3000; // 3 seconds
    case 'confirming':
      return 0; // Persistent until confirmed
    case 'completed':
      return 8000; // 8 seconds (with explorer link)
    case 'failed':
      return 10000; // 10 seconds
    default:
      return 4000;
  }
}

/**
 * Get toast styling based on stage
 */
function getToastStyles(stage: SwapStage) {
  switch (stage) {
    case 'preparing':
    case 'approving':
    case 'submitting':
    case 'confirming':
      return {
        borderColor: 'border-[#b1f128]/30',
        iconBg: 'bg-[#b1f128]/15',
        iconColor: 'text-[#b1f128]',
        titleColor: 'text-[#b1f128]',
      };
    case 'signing':
      return {
        borderColor: 'border-[#b1f128]/40',
        iconBg: 'bg-[#b1f128]/20',
        iconColor: 'text-[#b1f128]',
        titleColor: 'text-[#b1f128]',
      };
    case 'completed':
      return {
        borderColor: 'border-[#b1f128]/50',
        iconBg: 'bg-[#b1f128]/20',
        iconColor: 'text-[#b1f128]',
        titleColor: 'text-[#b1f128]',
      };
    case 'failed':
      return {
        borderColor: 'border-[#ff4444]/30',
        iconBg: 'bg-[#ff4444]/15',
        iconColor: 'text-[#ff4444]',
        titleColor: 'text-[#ff4444]',
      };
    default:
      return {
        borderColor: 'border-[#b1f128]/30',
        iconBg: 'bg-[#b1f128]/15',
        iconColor: 'text-[#b1f128]',
        titleColor: 'text-[#b1f128]',
      };
  }
}

/**
 * Get stage title
 */
function getStageTitle(stage: SwapStage): string {
  switch (stage) {
    case 'preparing':
      return 'Preparing Swap';
    case 'approving':
      return 'Approving Token';
    case 'signing':
      return 'Sign Transaction';
    case 'submitting':
      return 'Submitting';
    case 'confirming':
      return 'Confirming';
    case 'completed':
      return 'Swap Successful';
    case 'failed':
      return 'Swap Failed';
    default:
      return 'Processing';
  }
}

/**
 * Get icon for stage
 */
function getStageIcon(stage: SwapStage) {
  const styles = getToastStyles(stage);
  
  if (stage === 'completed') {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={styles.iconColor}
      >
        <path
          d="M20 6L9 17L4 12"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  
  if (stage === 'failed') {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={styles.iconColor}
      >
        <path
          d="M18 6L6 18M6 6L18 18"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  
  if (stage === 'signing') {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={styles.iconColor}
      >
        <path
          d="M12 2L2 7L12 12L22 7L12 2Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M2 17L12 22L22 17"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M2 12L12 17L22 12"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  
  // Loading spinner for other stages
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${styles.iconColor} animate-spin`}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="32"
        strokeDashoffset="24"
        opacity="0.3"
      />
      <path
        d="M12 2C6.477 2 2 6.477 2 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function SwapStatusToast({
  open,
  onOpenChange,
  stage,
  message,
  txHash,
  chainId,
  progress,
  duration,
}: SwapStatusToastProps) {
  const styles = getToastStyles(stage);
  const autoDismissDuration = duration !== undefined ? duration : getAutoDismissDuration(stage);
  const showExplorerLink = stage === 'completed' && txHash && chainId;
  const explorerUrl = showExplorerLink ? getExplorerUrl(txHash, chainId) : undefined;
  const explorerName = chainId ? getExplorerName(chainId) : 'Explorer';

  // Auto-dismiss logic
  useEffect(() => {
    if (!open || !onOpenChange || autoDismissDuration === 0) return;

    const timer = setTimeout(() => {
      onOpenChange(false);
    }, autoDismissDuration);

    return () => clearTimeout(timer);
  }, [open, autoDismissDuration, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 sm:bottom-6 sm:left-6 toast-enter">
      <div
        className={`border ${styles.borderColor} border-solid flex flex-col gap-3 p-4 rounded-[12px] w-full max-w-[360px] sm:max-w-[400px] shadow-lg bg-[#0b0f0a]/95 backdrop-blur`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            {/* Icon */}
            <div
              className={`size-6 rounded-full ${styles.iconBg} flex items-center justify-center shrink-0 mt-0.5`}
            >
              {getStageIcon(stage)}
            </div>

            {/* Message */}
            <div className="flex flex-col gap-0.5 flex-1 min-w-0 text-left">
              <p className={`font-semibold text-sm leading-tight ${styles.titleColor}`}>
                {getStageTitle(stage)}
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

        {/* Progress Bar (optional) */}
        {progress !== undefined && progress > 0 && progress < 100 && (
          <div className="pl-9">
            <div className="h-1 bg-[#1f261e] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#b1f128] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Explorer Link (only on success) */}
        {showExplorerLink && explorerUrl && (
          <div className="pl-9">
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[#b1f128] hover:text-[#d4ff4d] transition-colors text-sm font-medium"
            >
              <span>View on {explorerName}</span>
              <ExternalLink className="size-4" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

