"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useWallet } from "@/lib/wallet/hooks/useWallet";
import { truncateAddress, getWalletIconFromAccount, isWalletChainCompatible } from "@/lib/frontend/utils/wallet-display";
import WalletDropdown from "./wallet-dropdown";
import PasteAddressModal from "./paste-address-modal";

interface ToWalletDropdownProps {
  open: boolean;
  onClose: () => void;
  onConnectNewWallet: () => void;
  onAddressSelect: (address: string) => void;
  chainId?: number;
  currentRecipientAddress?: string | null;
}


export default function ToWalletDropdown({
  open,
  onClose,
  onConnectNewWallet,
  onAddressSelect,
  chainId,
  currentRecipientAddress,
}: ToWalletDropdownProps) {
  const { primaryWallet, secondaryWallet } = useWallet();
  const [showPasteModal, setShowPasteModal] = useState(false);

  // Get available wallets (primary + secondary if exists)
  const allAvailableWallets = [
    primaryWallet,
    secondaryWallet,
  ].filter((w): w is NonNull<typeof w> => w !== null);
  
  // Filter wallets to only show those compatible with the token's chain
  const availableWallets = chainId
    ? allAvailableWallets.filter((wallet) => isWalletChainCompatible(wallet, chainId))
    : allAvailableWallets;

  const handlePasteAddressSave = (address: string) => {
    onAddressSelect(address);
    onClose();
  };

  const handleWalletSelect = (wallet: NonNull<typeof primaryWallet>) => {
    onAddressSelect(wallet.address);
    onClose();
  };

  const handleConnectNew = () => {
    onClose();
    onConnectNewWallet();
  };

  // Close dropdown when modal opens
  useEffect(() => {
    if (showPasteModal && open) {
      onClose();
    }
  }, [showPasteModal, open, onClose]);

  return (
    <>
      <WalletDropdown open={open} onClose={onClose} className="top-full mt-1.5">
        <div className="py-2">
          {/* Available Wallets Section */}
          {availableWallets.length > 0 && (
            <div className="px-2">
              {availableWallets.map((wallet) => {
                const isSelected = currentRecipientAddress?.toLowerCase() === wallet.address.toLowerCase();
                const walletIcon = getWalletIconFromAccount(wallet);

                return (
                  <button
                    key={`${wallet.provider}-${wallet.address}`}
                    type="button"
                    onClick={() => handleWalletSelect(wallet)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-sm transition-colors ${
                      isSelected
                        ? "bg-[#121712]"
                        : "hover:bg-[#121712]"
                    }`}
                  >
                    {/* Wallet Icon - Small */}
                    {walletIcon && (
                      <Image
                        src={walletIcon}
                        alt="Wallet"
                        width={20}
                        height={20}
                        className="w-5 h-5 rounded-full shrink-0"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    )}
                    
                    {/* Truncated Address - Inline */}
                    <span className="text-white text-xs font-medium truncate flex-1 text-left">
                      {truncateAddress(wallet.address)}
                    </span>

                    {/* Selected Indicator */}
                    {isSelected && (
                      <div className="w-1.5 h-1.5 rounded-full bg-[#b1f128] shrink-0"></div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Divider */}
          {availableWallets.length > 0 && (
            <div className="my-1.5 border-t border-[#1f261e]"></div>
          )}

          {/* Connect New Wallet */}
          <div className="px-2">
            <button
              type="button"
              onClick={handleConnectNew}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#121712] transition-colors cursor-pointer"
            >
              <span className="text-white text-sm font-medium">Connect a new wallet</span>
            </button>
          </div>

          {/* Paste Address Section */}
          <div className="px-2">
            <button
              type="button"
              onClick={() => setShowPasteModal(true)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#121712] transition-colors cursor-pointer"
            >
              <span className="text-white text-sm font-medium">Paste wallet address</span>
            </button>
          </div>
        </div>
      </WalletDropdown>
      <PasteAddressModal
        open={showPasteModal}
        onOpenChange={setShowPasteModal}
        onSave={handlePasteAddressSave}
        chainId={chainId}
      />
    </>
  );
}

// Helper type for non-null
type NonNull<T> = T extends null | undefined ? never : T;

