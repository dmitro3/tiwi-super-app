"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWalletConnection } from "@/hooks/useWalletConnection";
import { useWallet } from "@/lib/wallet/hooks/useWallet";
import ConnectWalletModal from "@/components/wallet/connect-wallet-modal";
import WalletExplorerModal from "@/components/wallet/wallet-explorer-modal";
import ChainSelectionModal from "@/components/wallet/chain-selection-modal";
import WalletConnectedToast from "@/components/wallet/wallet-connected-toast";
import { MobileMenuDrawer } from "./mobile-menu-drawer";
import type { WalletProvider } from "@/lib/wallet/detection/types";
import type { WalletConnectWallet } from "@/lib/wallet/services/wallet-explorer-service";
import { getWalletById } from "@/lib/wallet/detection/detector";
import { getWalletIconUrl } from "@/lib/wallet/services/wallet-explorer-service";

interface NavItem {
  label: string;
  href: string;
}

const navItems: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Market", href: "/market" },
  { label: "Swap", href: "/swap" },
  { label: "Pool", href: "/pool" },
  { label: "Earn", href: "/earn" },
  { label: "Portfolio", href: "/portfolio" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isWalletMenuOpen, setIsWalletMenuOpen] = useState(false);
  const {
    isModalOpen,
    isExplorerOpen,
    isChainSelectionOpen,
    isToastOpen,
    connectedAddress,
    pendingWallet,
    openModal,
    closeModal,
    openExplorer,
    closeExplorer,
    connectWallet,
    selectChain,
    closeToast,
    handleChainModalBack,
  } = useWalletConnection();
  const wallet = useWallet();

  const handleConnect = () => {
    openModal();
  };

  const handleSettings = () => {
    // TODO: Implement settings modal/drawer
    console.log("Settings clicked");
  };

  const handleMenu = () => {
    if (isMenuOpen) {
      setIsMenuOpen(false);
    } else {
      setIsMenuOpen(true);
    }
  };

  const handleCloseMenu = () => {
    setIsMenuOpen(false);
  };

  // Format address like Figma: 0x061...T432
  const formatWalletAddress = (address: string): string => {
    if (!address || address.length <= 10) return address;
    // Remove 0x prefix if present
    const withoutPrefix = address.startsWith("0x") ? address.slice(2) : address;
    if (withoutPrefix.length <= 7) return address;
    // Take first 3 chars and last 4 chars, keep 0x prefix
    return `0x${withoutPrefix.slice(0, 3)}...${withoutPrefix.slice(-4)}`;
  };

  // Get wallet icon for connected wallet
  const getWalletIcon = (): string => {
    if (!wallet.primaryWallet) return '/assets/icons/wallet/wallet-04.svg';
    
    const walletInfo = getWalletById(wallet.primaryWallet.provider);
    if (walletInfo?.imageId) {
      try {
        return getWalletIconUrl(walletInfo.imageId, 'sm');
      } catch (error) {
        console.error('[Navbar] Error generating wallet icon URL:', error);
      }
    }
    return '/assets/icons/wallet/wallet-04.svg';
  };

  const handleWalletMenuToggle = () => {
    setIsWalletMenuOpen(!isWalletMenuOpen);
  };

  const handleDisconnect = async () => {
    await wallet.disconnect();
    setIsWalletMenuOpen(false);
  };

  return (
    <nav className="bg-[#010501] border-b border-[#1f261e] shadow-[0px_8px_48px_-12px_rgba(177,241,40,0.16)]">
      <div className="2xl:container mx-auto px-4 sm:px-6 md:px-8 lg:px-10 py-4 sm:py-5 md:py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-1.5 sm:gap-2">
            <div className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 relative">
              <Image
                src="/assets/logos/tiwi-logo.svg"
                alt="TIWI Logo"
                width={40}
                height={40}
                className="object-contain w-full h-full"
              />
            </div>
            <div className="text-white font-bold text-sm sm:text-base leading-tight">
              <p className="m-0">TIWI</p>
              <p className="m-0">Protocol</p>
            </div>
          </Link>

          {/* Navigation Menu - Desktop */}
          <div className="hidden md:flex items-center gap-1.5 lg:gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 lg:px-4 lg:py-3 font-medium text-base lg:text-lg transition-colors ${
                    isActive
                      ? "text-[#b1f128] font-semibold"
                      : "text-[#b5b5b5] hover:text-[#b1f128]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Wallet UI - Desktop */}
          <div className="hidden md:flex items-center gap-2">
            {wallet.isConnected && connectedAddress ? (
              <>
                {/* Share Knowledge Icon (Settings) - Green border */}
                <button
                  onClick={handleSettings}
                  className="bg-[#0d3600] border-[3px] border-[#b1f128] p-3 rounded-full hover:opacity-90 transition-opacity cursor-pointer"
                  aria-label="Settings"
                >
                  <Image
                    src="/assets/icons/share-knowledge.svg"
                    alt="Settings"
                    width={24}
                    height={24}
                    className="w-6 h-6"
                  />
                </button>
                
                {/* Settings Icon */}
                <button
                  onClick={handleSettings}
                  className="bg-[#081f02] p-3 rounded-full hover:opacity-90 transition-opacity cursor-pointer"
                  aria-label="Settings"
                >
                  <Image
                    src="/assets/icons/settings-03.svg"
                    alt="Settings"
                    width={24}
                    height={24}
                    className="w-6 h-6"
                  />
                </button>
                
                {/* Wallet Address Button with Icon Inside */}
                <div className="relative">
                  <button
                    onClick={handleWalletMenuToggle}
                    className="bg-[#081f02] flex gap-2.5 items-center justify-center pl-2 pr-4 py-2 rounded-full hover:opacity-90 transition-opacity cursor-pointer"
                    aria-label="Wallet menu"
                  >
                    <div className="relative size-8">
                      <Image
                        src={getWalletIcon()}
                        alt="Wallet"
                        width={32}
                        height={32}
                        className="w-full h-full object-contain rounded-full"
                        onError={(e) => {
                          e.currentTarget.src = '/assets/icons/wallet/wallet-04.svg';
                        }}
                      />
                    </div>
                    <p className="font-semibold text-lg text-white tracking-[0.018px]">
                      {formatWalletAddress(connectedAddress)}
                    </p>
                    <div className="relative size-6">
                      <Image
                        src="/assets/icons/arrow-down-01.svg"
                        alt="Dropdown"
                        width={24}
                        height={24}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </button>
                  
                  {/* Wallet Dropdown Menu */}
                  {isWalletMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 bg-[#0b0f0a] border border-[#1f261e] rounded-xl p-2 min-w-[200px] z-50">
                      <button
                        onClick={handleDisconnect}
                        className="w-full text-left px-4 py-2 text-white hover:bg-[#121712] rounded-lg transition-colors"
                      >
                        Disconnect
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={handleSettings}
                  className="bg-[#081f02] p-2.5 sm:p-3 rounded-full hover:opacity-90 transition-opacity"
                  aria-label="Settings"
                >
                  <Image
                    src="/assets/icons/settings.svg"
                    alt="Settings"
                    width={24}
                    height={24}
                    className="[&_path]:stroke-[#b1f128] w-5 h-5 sm:w-6 sm:h-6"
                  />
                </button>
                <Button
                  onClick={handleConnect}
                  className="text-sm lg:text-base px-4 lg:px-6 py-2 lg:py-3 cursor-pointer"
                >
                  Connect
                </Button>
              </>
            )}
          </div>

          {/* Mobile Right Side - Wallet UI or Connect Button and Menu */}
          <div className="md:hidden flex items-center gap-3">
            {wallet.isConnected && connectedAddress ? (
              <>
                {/* Wallet Address Button */}
                <div className="relative">
                  <button
                    onClick={handleWalletMenuToggle}
                    className="bg-[#0b0f0a] flex gap-2.5 items-center px-4 py-1.5 rounded-full hover:opacity-90 transition-opacity cursor-pointer"
                    aria-label="Wallet menu"
                  >
                    <p className="font-medium text-sm text-[#b5b5b5]">
                      {formatWalletAddress(connectedAddress)}
                    </p>
                    <div className="relative size-4">
                      <Image
                        src="/assets/icons/arrow-down-01-mobile.svg"
                        alt="Dropdown"
                        width={16}
                        height={16}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </button>
                  
                  {/* Wallet Dropdown Menu */}
                  {isWalletMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 bg-[#0b0f0a] border border-[#1f261e] rounded-xl p-2 min-w-[200px] z-50">
                      <button
                        onClick={handleDisconnect}
                        className="w-full text-left px-4 py-2 text-white hover:bg-[#121712] rounded-lg transition-colors"
                      >
                        Disconnect
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Hamburger Menu */}
                <button
                  onClick={handleMenu}
                  className="p-1.5 rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
                  aria-label={isMenuOpen ? "Close menu" : "Open menu"}
                >
                  <Image
                    src="/assets/icons/menu.svg"
                    alt="Menu"
                    width={24}
                    height={24}
                    className="h-6 w-6"
                  />
                </button>
              </>
            ) : (
              <>
                <Button onClick={handleConnect} className="text-sm px-4 py-2 cursor-pointer">
                  Connect
                </Button>
                <button
                  onClick={handleMenu}
                  className="bg-[#081f02] p-2.5 rounded-full hover:opacity-90 transition-opacity cursor-pointer"
                  aria-label={isMenuOpen ? "Close menu" : "Open menu"}
                >
                  {isMenuOpen ? (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 16 16"
                      fill="none"
                      className="w-5 h-5"
                    >
                      <path
                        d="M12 4L4 12M4 4L12 12"
                        stroke="#b5b5b5"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <Image
                      src="/assets/icons/menu.svg"
                      alt="Menu"
                      width={20}
                      height={20}
                      className="h-5 w-5"
                    />
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Connect Wallet Modal */}
      <ConnectWalletModal
        open={isModalOpen}
        onOpenChange={closeModal}
        onWalletConnect={connectWallet}
        onOpenExplorer={openExplorer}
      />

      {/* Wallet Explorer Modal */}
      <WalletExplorerModal
        open={isExplorerOpen}
        onOpenChange={closeExplorer}
        onWalletConnect={connectWallet}
      />

      {/* Chain Selection Modal */}
      {pendingWallet && (
        <ChainSelectionModal
          open={isChainSelectionOpen}
          onOpenChange={(open) => {
            if (!open) {
              // Close the modal completely
              handleChainModalBack();
            }
          }}
          wallet={pendingWallet as WalletProvider}
          onChainSelect={selectChain}
          onBack={handleChainModalBack}
        />
      )}

      {/* Wallet Connected Toast */}
      {connectedAddress && (
        <WalletConnectedToast
          address={connectedAddress}
          open={isToastOpen}
          onOpenChange={closeToast}
          duration={5000}
        />
      )}

      {/* Mobile Menu Drawer */}
      <MobileMenuDrawer
        open={isMenuOpen}
        onClose={handleCloseMenu}
      />
      
      {/* Click outside to close wallet menu */}
      {isWalletMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsWalletMenuOpen(false)}
        />
      )}
    </nav>
  );
}

