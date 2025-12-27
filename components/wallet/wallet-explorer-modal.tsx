"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { useWalletExplorer } from "@/lib/wallet/hooks/useWalletExplorer";
import { useWalletDetection } from "@/lib/wallet/hooks/useWalletDetection";
import { getWalletIconUrl } from "@/lib/wallet/services/wallet-explorer-service";
import { getWalletById } from "@/lib/wallet/detection/detector";
import type { WalletConnectWallet } from "@/lib/wallet/services/wallet-explorer-service";
import type { WalletProvider } from "@/lib/wallet/detection/types";

interface WalletExplorerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWalletConnect?: (wallet: WalletConnectWallet | string) => void;
}

export default function WalletExplorerModal({
  open,
  onOpenChange,
  onWalletConnect,
}: WalletExplorerModalProps) {
  const { topWallets, searchResults, isLoading, isSearching, error, search, clearSearch } = useWalletExplorer();
  const { installedWallets } = useWalletDetection();
  const [searchQuery, setSearchQuery] = useState("");
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  // Clear search when modal closes
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      clearSearch();
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    }
  }, [open, clearSearch, debounceTimer]);

  // Debounce search
  useEffect(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        search(searchQuery);
      } else {
        clearSearch();
      }
    }, 300);

    setDebounceTimer(timer);

    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [searchQuery]);

  const isDisplayingSearch = searchQuery.trim() && !isSearching;
  const apiWallets = searchQuery.trim() ? searchResults : topWallets;

  const handleWalletClick = (wallet: WalletProvider | WalletConnectWallet) => {
    // Check if it's a WalletProvider (installed wallet)
    if ('installed' in wallet && wallet.installed) {
      // Installed wallet - connect it (pass as string ID)
      onWalletConnect?.(wallet.id);
      onOpenChange(false);
    } else if ('installed' in wallet && !wallet.installed) {
      // Not installed - redirect to install URL
      const walletInfo = getWalletById(wallet.id);
      if (walletInfo?.installUrl) {
        window.open(walletInfo.installUrl, '_blank', 'noopener,noreferrer');
      }
    } else {
      // WalletConnect wallet - check if it's installed by matching ID
      const installedWallet = installedWallets.find(
        inst => inst.id.toLowerCase() === wallet.id.toLowerCase() ||
        inst.name.toLowerCase() === wallet.name.toLowerCase()
      );
      
      if (installedWallet) {
        // It's installed, connect it (pass as string ID)
        onWalletConnect?.(installedWallet.id);
        onOpenChange(false);
      } else {
        // Not installed - try to find install URL from supported wallets
        const walletInfo = getWalletById(wallet.id);
        if (walletInfo?.installUrl) {
          window.open(walletInfo.installUrl, '_blank', 'noopener,noreferrer');
        } else if (wallet.homepage) {
          // Fallback to homepage
          window.open(wallet.homepage, '_blank', 'noopener,noreferrer');
        }
      }
    }
  };

  const getWalletIcon = (wallet: WalletProvider | WalletConnectWallet): string => {
    if ('imageId' in wallet && wallet.imageId) {
      try {
        return getWalletIconUrl(wallet.imageId, 'md');
      } catch (error) {
        console.error('[WalletExplorerModal] Error generating icon URL:', error);
      }
    }
    if ('image_id' in wallet && wallet.image_id) {
      try {
        return getWalletIconUrl(wallet.image_id, 'md');
      } catch (error) {
        console.error('[WalletExplorerModal] Error generating icon URL:', error);
      }
    }
    return '/assets/icons/wallet/wallet-04.svg';
  };

  const getWalletName = (wallet: WalletProvider | WalletConnectWallet): string => {
    return 'name' in wallet ? wallet.name : wallet.name;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="bg-[#0b0f0a] border border-[#1f261e] rounded-2xl sm:rounded-3xl p-0 max-w-[calc(100vw-2rem)] sm:max-w-[600px] w-full overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 shrink-0 w-full border-b border-[#1f261e]">
          <DialogTitle className="font-bold leading-normal relative shrink-0 text-lg sm:text-2xl text-left text-white m-0">
            Select Wallet
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

        {/* Search Bar */}
        <div className="px-4 sm:px-6 pt-4 sm:pt-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Search through 644 wallets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pl-10 pr-10 bg-[#121712] border border-[#1f261e] rounded-xl text-sm text-white placeholder-[#b5b5b5] focus:outline-none focus:ring-2 focus:ring-[#b1f128] focus:border-transparent transition-all"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-[#b5b5b5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                title="Clear search"
              >
                <svg className="h-5 w-5 text-[#b5b5b5] hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Wallet List */}
        <div className="px-4 sm:px-6 pb-6 sm:pb-10 max-h-[60vh] overflow-y-auto wallet-modal-scrollbar">
          {/* Loading State */}
          {(isLoading || isSearching) && (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-[#121712] rounded-xl"></div>
                </div>
              ))}
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && !isSearching && (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">⚠️</div>
              <p className="text-sm font-medium text-white mb-1">Failed to load wallets</p>
              <p className="text-xs text-[#b5b5b5] mb-4">{error}</p>
              <button
                onClick={() => {
                  if (searchQuery.trim()) {
                    search(searchQuery);
                  }
                }}
                className="px-4 py-2 text-sm bg-[#b1f128] text-[#010501] rounded-lg hover:opacity-90 transition-opacity font-medium"
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !isSearching && !error && isDisplayingSearch && apiWallets.length === 0 && installedWallets.length === 0 && (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-sm font-medium text-white mb-1">No wallets found</p>
              <p className="text-xs text-[#b5b5b5] mb-4">
                No wallets match "{searchQuery}". Try a different search term.
              </p>
              <button
                onClick={() => setSearchQuery("")}
                className="px-4 py-2 text-sm bg-[#b1f128] text-[#010501] rounded-lg hover:opacity-90 transition-opacity font-medium"
              >
                Clear Search
              </button>
            </div>
          )}

          {/* Installed Wallets Section */}
          {!isLoading && !isSearching && installedWallets.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-white text-base sm:text-lg mb-4">Installed Wallets</h3>
              <div className="space-y-2">
                {installedWallets.map((wallet) => (
                  <button
                    key={wallet.id}
                    onClick={() => handleWalletClick(wallet)}
                    className="w-full flex items-center gap-3 p-4 rounded-xl border border-[#1f261e] hover:border-[#b1f128] transition-colors bg-[#121712] hover:bg-[#1a1f1a] text-left"
                  >
                    <div className="relative size-10 sm:size-12 shrink-0">
                      <Image
                        src={getWalletIcon(wallet)}
                        alt={getWalletName(wallet)}
                        width={48}
                        height={48}
                        className="w-full h-full object-contain rounded-full"
                        onError={(e) => {
                          e.currentTarget.src = '/assets/icons/wallet/wallet-04.svg';
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white text-base sm:text-lg truncate">
                        {getWalletName(wallet)}
                      </div>
                      <div className="text-xs text-[#b5b5b5] mt-0.5">Installed</div>
                    </div>
                    <svg className="w-5 h-5 text-[#b5b5b5] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* API Wallets Section */}
          {!isLoading && !isSearching && !error && apiWallets.length > 0 && (
            <div>
              {installedWallets.length > 0 && (
                <h3 className="font-semibold text-white text-base sm:text-lg mb-4">
                  {isDisplayingSearch ? 'Search Results' : 'Popular Wallets'}
                </h3>
              )}
              <div className="space-y-2">
                {apiWallets.map((wallet) => {
                  // Skip if this wallet is already in installed wallets
                  const isInstalled = installedWallets.some(
                    inst => inst.id.toLowerCase() === wallet.id.toLowerCase() ||
                    inst.name.toLowerCase() === wallet.name.toLowerCase()
                  );
                  
                  if (isInstalled) {
                    return null;
                  }
                  
                  return (
                    <button
                      key={wallet.id}
                      onClick={() => handleWalletClick(wallet)}
                      className="w-full flex items-center gap-3 p-4 rounded-xl border border-[#1f261e] hover:border-[#b1f128] transition-colors bg-[#121712] hover:bg-[#1a1f1a] text-left"
                    >
                      <div className="relative size-10 sm:size-12 shrink-0">
                        <Image
                          src={getWalletIcon(wallet)}
                          alt={wallet.name}
                          width={48}
                          height={48}
                          className="w-full h-full object-contain rounded-full"
                          onError={(e) => {
                            e.currentTarget.src = '/assets/icons/wallet/wallet-04.svg';
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white text-base sm:text-lg truncate">
                          {wallet.name}
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-[#b5b5b5] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
