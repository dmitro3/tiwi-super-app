"use client";

import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { FiCheck } from "react-icons/fi";

interface WalletSuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "create" | "import";
  walletAddress: string;
}

export default function WalletSuccessModal({
  open,
  onOpenChange,
  type,
  walletAddress,
}: WalletSuccessModalProps) {
  // Format address like: 0x061...T432
  const formatAddress = (address: string): string => {
    if (!address || address.length <= 10) return address;
    const withoutPrefix = address.startsWith("0x") ? address.slice(2) : address;
    if (withoutPrefix.length <= 7) return address;
    return `0x${withoutPrefix.slice(0, 3)}...${withoutPrefix.slice(-4)}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="bg-[#0b0f0a] border border-[#1f261e] rounded-2xl sm:rounded-3xl p-0 max-w-[calc(100vw-2rem)] sm:max-w-[550px] w-full overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0 w-full border-b border-[#1f261e]">
          <DialogTitle className="font-bold leading-normal relative shrink-0 text-2xl text-left text-white m-0">
            {type === "create" ? "Wallet Created!" : "Wallet Imported!"}
          </DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="cursor-pointer relative shrink-0 size-8 hover:opacity-80 transition-opacity"
            aria-label="Close modal"
          >
            <Image
              src="/assets/icons/cancel-circle.svg"
              alt="Close"
              width={32}
              height={32}
              className="w-full h-full object-contain"
            />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-6 items-center px-6 py-8 shrink-0 w-full">
          {/* Success Icon */}
          <div className="flex items-center justify-center size-20 rounded-full bg-[#081F02] border-2 border-[#B1F128]">
            <FiCheck className="text-[#B1F128]" size={40} />
          </div>

          {/* Success Message */}
          <div className="flex flex-col gap-2 items-center text-center">
            <h3 className="text-xl font-semibold text-white">
              {type === "create" 
                ? "Your wallet has been created successfully!" 
                : "Your wallet has been imported successfully!"}
            </h3>
            <p className="text-sm text-[#b5b5b5]">
              {type === "create"
                ? "You can now start using your new wallet to manage your assets."
                : "You can now access your imported wallet and manage your assets."}
            </p>
          </div>

          {/* Wallet Address */}
          <div className="flex flex-col gap-2 items-center w-full">
            <p className="text-xs text-[#6E7873]">Wallet Address</p>
            <div className="bg-[#010501] border border-[#1f261e] rounded-xl px-4 py-3 w-full">
              <p className="text-sm font-mono text-white text-center break-all">
                {formatAddress(walletAddress)}
              </p>
            </div>
          </div>

          {/* Security Reminder */}
          {type === "create" && (
            <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4 w-full">
              <p className="text-xs text-yellow-300/90 text-center">
                <strong className="text-yellow-400">Remember:</strong> Keep your recovery phrase safe and secure. 
                We don't store it, so you are the only one who can recover your wallet.
              </p>
            </div>
          )}

          {/* Continue Button */}
          <button
            onClick={() => onOpenChange(false)}
            className="w-full bg-[#B1F128] text-[#010501] font-semibold py-4 px-6 rounded-full hover:opacity-90 transition-opacity"
          >
            Continue
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

