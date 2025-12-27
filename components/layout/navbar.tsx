"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWalletConnection } from "@/hooks/useWalletConnection";
import ConnectWalletModal from "@/components/wallet/connect-wallet-modal";
import WalletExplorerModal from "@/components/wallet/wallet-explorer-modal";
import ChainSelectionModal from "@/components/wallet/chain-selection-modal";
import WalletConnectedToast from "@/components/wallet/wallet-connected-toast";
import { MobileMenuDrawer } from "./mobile-menu-drawer";
import type { WalletProvider } from "@/lib/wallet/detection/types";
import type { WalletConnectWallet } from "@/lib/wallet/services/wallet-explorer-service";

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
  } = useWalletConnection();

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

          {/* Connect Button - Desktop */}
          <div className="hidden md:flex items-center gap-1.5 sm:gap-2">
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
          </div>

          {/* Mobile Right Side - Connect Button and Menu */}
          <div className="md:hidden flex items-center gap-2">
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
              // Reset pending wallet when closing
              // This is handled in the hook, but we need to close the modal
            }
          }}
          wallet={pendingWallet as WalletProvider}
          onChainSelect={selectChain}
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
    </nav>
  );
}

