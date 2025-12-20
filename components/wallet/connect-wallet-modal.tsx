"use client";

import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import WalletOptionCard from "./wallet-option-card";
import ExternalWalletIcon from "./external-wallet-icon";

export type WalletType =
  | "metamask"
  | "walletconnect"
  | "coinbase"
  | "create"
  | "import";

interface ConnectWalletModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWalletConnect?: (walletType: WalletType) => void;
}

export default function ConnectWalletModal({
  open,
  onOpenChange,
  onWalletConnect,
}: ConnectWalletModalProps) {
  const handleWalletClick = (type: WalletType) => {
    onWalletConnect?.(type);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="bg-[#0b0f0a] border border-[#1f261e] rounded-2xl sm:rounded-3xl p-0 max-w-[calc(100vw-2rem)] sm:max-w-[500px] w-full overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 shrink-0 w-full border-b border-[#1f261e]">
          <DialogTitle className="font-bold leading-normal relative shrink-0 text-lg sm:text-2xl text-left text-white m-0">
            Connect Wallet
          </DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="cursor-pointer relative shrink-0 size-6 sm:size-8 hover:opacity-80 transition-opacity"
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
        <div className="flex flex-col gap-6 sm:gap-10 items-start px-4 sm:px-6 py-0 shrink-0 w-full pb-6 sm:pb-10">
          {/* Primary Wallet Options */}
          <div className="flex flex-col gap-2 sm:gap-[40px] items-start relative shrink-0 w-full">
            <WalletOptionCard
              icon="/assets/icons/wallet/wallet-04.svg"
              title="Create New Wallet"
              description="Set up a brand new wallet in minutes."
              onClick={() => handleWalletClick("create")}
            />
            <WalletOptionCard
              icon="/assets/icons/wallet/cloud-download.svg"
              title="Import Wallet"
              description="Use your existing seed phrase or private key."
              onClick={() => handleWalletClick("import")}
            />
          </div>

          {/* Divider Section */}
          <div className="flex flex-col gap-4 sm:gap-6 items-start relative shrink-0 w-full">
            {/* Divider with text */}
            <div className="flex gap-2 sm:gap-4 items-center relative shrink-0 w-full">
              <div className="flex-1 h-px min-h-px min-w-px relative shrink-0">
                <div className="absolute inset-0 border-t border-[#1f261e]"></div>
              </div>
              <p className="font-medium leading-normal relative shrink-0 text-[#b5b5b5] text-sm sm:text-base text-left whitespace-nowrap">
                Connect External Wallets
              </p>
              <div className="flex-1 h-px min-h-px min-w-px relative shrink-0">
                <div className="absolute inset-0 border-t border-[#1f261e]"></div>
              </div>
            </div>

            {/* External Wallet Icons */}
            <div className="flex gap-2 sm:gap-4 items-start relative shrink-0 w-full">
              <ExternalWalletIcon
                icon="/assets/icons/wallet/metamask.svg"
                name="MetaMask"
                onClick={() => handleWalletClick("metamask")}
              />
              <ExternalWalletIcon
                icon="/assets/icons/wallet/rabby.svg"
                name="WalletConnect"
                onClick={() => handleWalletClick("walletconnect")}
              />
              <ExternalWalletIcon
                icon="/assets/icons/wallet/phantom.svg"
                name="Coinbase Wallet"
                onClick={() => handleWalletClick("coinbase")}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

