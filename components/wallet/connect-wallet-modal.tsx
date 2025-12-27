"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import WalletOptionCard from "./wallet-option-card";
import ExternalWalletIcon from "./external-wallet-icon";
import { useWalletDetection } from "@/lib/wallet/hooks/useWalletDetection";
import { getWalletById } from "@/lib/wallet/detection/detector";
import type { WalletProvider } from "@/lib/wallet/detection/types";
import { getWalletIconUrl } from "@/lib/wallet/services/wallet-explorer-service";

export type WalletType =
  | "metamask"
  | "walletconnect"
  | "coinbase"
  | "create"
  | "import"
  | string; // Allow any wallet ID

interface ConnectWalletModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWalletConnect?: (walletType: WalletType) => void;
  onOpenExplorer?: () => void; // Callback to open wallet explorer
}

// Predefined 4 wallets to show when no wallets are installed
const DEFAULT_WALLET_IDS = ['metamask', 'phantom', 'rabby', 'trust-wallet'] as const;

export default function ConnectWalletModal({
  open,
  onOpenChange,
  onWalletConnect,
  onOpenExplorer,
}: ConnectWalletModalProps) {
  const { installedWallets, isDetecting } = useWalletDetection();

  // Get top 4 wallets to display
  const getDisplayWallets = (): WalletProvider[] => {
    if (installedWallets.length > 0) {
      // Show top 4 installed wallets
      return installedWallets.slice(0, 4);
    }
    
    // Show 4 predefined wallets if none installed
    const defaultWallets: WalletProvider[] = [];
    for (const walletId of DEFAULT_WALLET_IDS) {
      const wallet = getWalletById(walletId);
      if (wallet) {
        defaultWallets.push({
          id: wallet.id,
          name: wallet.name,
          icon: wallet.icon,
          supportedChains: wallet.supportedChains,
          installed: false,
          imageId: wallet.imageId,
        });
      }
    }
    return defaultWallets;
  };

  const displayWallets = getDisplayWallets();

  const handleWalletClick = (wallet: WalletProvider) => {
    // Check if wallet is installed
    if (wallet.installed) {
      // Wallet is installed, connect it
      onWalletConnect?.(wallet.id);
      onOpenChange(false);
    } else {
      // Wallet is not installed, redirect to install URL
      const walletInfo = getWalletById(wallet.id);
      if (walletInfo?.installUrl) {
        window.open(walletInfo.installUrl, '_blank', 'noopener,noreferrer');
      }
    }
  };

  const handleMoreClick = () => {
    onOpenChange(false);
    onOpenExplorer?.();
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
            Connect Wallet
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
        <div className="flex flex-col gap-10 items-start px-6 py-0 shrink-0 w-full pb-10 max-h-[70vh] overflow-y-auto wallet-modal-scrollbar">
          {/* Primary Wallet Options */}
          <div className="flex flex-col gap-2 items-start relative shrink-0 w-full">
            <WalletOptionCard
              icon="/assets/icons/wallet/wallet-04.svg"
              title="Create New Wallet"
              description="Set up a brand new wallet in minutes."
              onClick={() => {
                onWalletConnect?.("create");
                onOpenChange(false);
              }}
            />
            <WalletOptionCard
              icon="/assets/icons/wallet/cloud-download.svg"
              title="Import Wallet"
              description="Use your existing seed phrase or private key."
              onClick={() => {
                onWalletConnect?.("import");
                onOpenChange(false);
              }}
            />
          </div>

          {/* Connect External Wallets Section */}
          <div className="flex flex-col gap-6 items-start relative shrink-0 w-full">
            {/* Divider with text */}
            <div className="flex gap-4 items-center relative shrink-0 w-full">
              <div className="flex-1 h-px bg-[#1f261e]"></div>
              <p className="font-medium leading-normal relative shrink-0 text-base text-[#b5b5b5]">
                Connect External Wallets
              </p>
              <div className="flex-1 h-px bg-[#1f261e]"></div>
            </div>

            {/* Wallet Icons Row */}
            <div className="flex gap-4 items-start relative shrink-0 w-full">
              {isDetecting ? (
                <div className="text-[#b5b5b5] text-sm">Detecting wallets...</div>
              ) : (
                <>
                  {displayWallets.map((wallet) => {
                    // Use imageId to get icon from WalletConnect Explorer API, fallback to default
                    let iconUrl = '/assets/icons/wallet/wallet-04.svg';
                    
                    try {
                      if (wallet.imageId && typeof wallet.imageId === 'string' && wallet.imageId.trim() !== '') {
                        iconUrl = getWalletIconUrl(wallet.imageId, 'sm');
                      }
                    } catch (error) {
                      console.error('[ConnectWalletModal] Error generating icon URL:', {
                        walletId: wallet.id,
                        walletName: wallet.name,
                        imageId: wallet.imageId,
                        error: error instanceof Error ? error.message : String(error),
                      });
                    }
                    
                    return (
                      <ExternalWalletIcon
                        key={wallet.id}
                        icon={iconUrl}
                        name={wallet.name}
                        onClick={() => handleWalletClick(wallet)}
                      />
                    );
                  })}
                  
                  {/* 100+ Button */}
                  <button
                    onClick={handleMoreClick}
                    className="bg-[#121712] flex items-center justify-center overflow-hidden p-4 rounded-xl shrink-0 hover:bg-[#1a1f1a] transition-colors cursor-pointer border border-[#1f261e] hover:border-[#b1f128]"
                    aria-label="View more wallets"
                    style={{ minHeight: '80px', minWidth: '80px' }}
                  >
                    <span className="font-medium text-[#b5b5b5] hover:text-[#b1f128] text-sm transition-colors">
                      100+
                    </span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
