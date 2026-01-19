"use client";

import Image from "next/image";
import { useWallet } from "@/lib/wallet/hooks/useWallet";
import { getWalletIconFromAccount, truncateAddress, isWalletChainCompatible } from "@/lib/frontend/utils/wallet-display";
import WalletDropdown from "./wallet-dropdown";
import { generateWalletId as genWalletId } from "@/lib/wallet/state/types";

interface FromWalletDropdownProps {
  open: boolean;
  onClose: () => void;
  onConnectNewWallet: () => void;
  onSelectWallet?: (address: string) => void;
  currentAddress?: string | null;
  chainId?: number; // Token chain ID for filtering compatible wallets
}

export default function FromWalletDropdown({
  open,
  onClose,
  onConnectNewWallet,
  onSelectWallet,
  currentAddress,
  chainId,
}: FromWalletDropdownProps) {
  const { 
    connectedWallets, 
    activeWallet, 
    activeWalletId,
    setActiveWallet,
  } = useWallet();
  
  // Filter wallets to only show those compatible with the token's chain
  const compatibleWallets = chainId
    ? connectedWallets.filter((wallet) => wallet && isWalletChainCompatible(wallet, chainId))
    : connectedWallets;

  const handleWalletSelect = (wallet: typeof connectedWallets[0]) => {
    if (!wallet) return;
    
    // Set as active wallet
    const walletId = genWalletId(wallet);
    setActiveWallet(walletId);
    
    // Callback for parent component
    if (onSelectWallet) {
      onSelectWallet(wallet.address);
    }
    onClose();
  };

  const handleConnectNew = () => {
    onClose();
    onConnectNewWallet();
  };

  return (
      <WalletDropdown open={open} onClose={onClose} className="top-full mt-1.5">
      <div className="py-2">
        {/* Connected Wallets Section - Only show compatible wallets */}
        {compatibleWallets.length > 0 && (
          <div className="px-2">
            {compatibleWallets.map((wallet) => {
              if (!wallet) return null;
              const walletIcon = getWalletIconFromAccount(wallet);
              const walletId = genWalletId(wallet);
              const isActive = activeWalletId === walletId || 
                (currentAddress?.toLowerCase() === wallet.address.toLowerCase());

              return (
                <button
                  key={`${wallet.provider}-${wallet.address}`}
                  type="button"
                  onClick={() => handleWalletSelect(wallet)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-sm transition-colors ${
                    isActive
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

                  {/* Active Indicator */}
                  {isActive && (
                    <div className="w-1.5 h-1.5 rounded-full bg-[#b1f128] shrink-0"></div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Divider */}
        {compatibleWallets.length > 0 && (
          <div className="my-1.5 border-t border-[#1f261e]"></div>
        )}

        {/* Connect New Wallet Button */}
        <div className="px-2">
          <button 
            type="button"
            onClick={handleConnectNew}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#121712] transition-colors cursor-pointer"
          >
            <span className="text-white text-sm font-medium">Connect a new wallet</span>
          </button>
        </div>
      </div>
    </WalletDropdown>
  );
}