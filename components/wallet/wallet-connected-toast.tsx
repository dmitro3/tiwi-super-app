"use client";

import { useEffect } from "react";
import Image from "next/image";

interface WalletConnectedToastProps {
  address: string;
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  duration?: number;
}

export default function WalletConnectedToast({
  address,
  open,
  onOpenChange,
  duration = 5000,
}: WalletConnectedToastProps) {
  // Format address: 0x{first5}...{last4} (e.g., 0x061...T432)
  const formatAddress = (addr: string): string => {
    if (addr.length <= 10) return addr;
    // Remove 0x prefix, take first 3 chars, then last 4 chars
    const withoutPrefix = addr.startsWith("0x") ? addr.slice(2) : addr;
    if (withoutPrefix.length <= 7) return addr;
    return `0x${withoutPrefix.slice(0, 3)}...${withoutPrefix.slice(-4)}`;
  };

  // Auto-dismiss after duration
  useEffect(() => {
    if (!open || !onOpenChange) return;

    const timer = setTimeout(() => {
      onOpenChange(false);
    }, duration);

    return () => clearTimeout(timer);
  }, [open, duration, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6 toast-enter">
      <div
        className="border border-[#1f261e] border-solid flex items-start justify-between p-[24px] rounded-[16px] w-full max-w-[400px] sm:max-w-[450px]"
        style={{
          backgroundImage:
            "linear-gradient(187deg, #B1F128 -158.79%, #010501 40.44%)",
        }}
      >
        <div className="flex font-semibold gap-[6px] items-center leading-normal shrink-0 text-[16px]">
          <p className="relative shrink-0 text-white">Wallet Connected!</p>
          <p className="relative shrink-0 text-[#b5b5b5]">
            {formatAddress(address)}
          </p>
        </div>
        <div className="relative shrink-0 size-[24px]">
          <Image
            src="/assets/icons/checkmark-circle-01.svg"
            alt="Success"
            width={24}
            height={24}
            className="w-full h-full object-contain"
          />
        </div>
      </div>
    </div>
  );
}

