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
import AddNewWallet from "@/components/settings/add-new-wallet";
import ImportWallet from "@/components/settings/import-wallet";
import ErrorToast from "@/components/ui/error-toast";
import InternalWalletItem from "./internal-wallet-item";
import { useWalletManagerStore } from "@/lib/wallet/state/wallet-manager-store";
import { useTranslation } from "@/lib/i18n/useTranslation";

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
  onWalletConnect?: (walletType: WalletType) => Promise<void> | void;
  onOpenExplorer?: () => void; // Callback to open wallet explorer
  excludeProviders?: string[]; // Provider IDs to exclude (already connected)
}

// Predefined 4 wallets to show when no wallets are installed
const DEFAULT_WALLET_IDS = ['metamask', 'phantom', 'rabby', 'trust-wallet'] as const;

export default function ConnectWalletModal({
  open,
  onOpenChange,
  onWalletConnect,
  onOpenExplorer,
  excludeProviders = [],
}: ConnectWalletModalProps) {
  const { t } = useTranslation();
  const { installedWallets, isDetecting } = useWalletDetection();
  const [flow, setFlow] = useState<"connect" | "create" | "import">("connect");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isErrorToastOpen, setIsErrorToastOpen] = useState(false);

  // Get internal wallets from store
  const allWallets = useWalletManagerStore((s) => s.wallets);
  const internalWallets = allWallets.filter((w) => w.isLocal && w.source === "local");

  // Get top 4 wallets to display, excluding already connected providers
  const getDisplayWallets = (): WalletProvider[] => {
    let wallets: WalletProvider[] = [];

    if (installedWallets.length > 0) {
      // Show installed wallets as-is (we no longer hide providers that are already connected)
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

  const handleWalletClick = async (wallet: WalletProvider) => {
    // Check if wallet is installed
    if (wallet.installed) {
      if (!onWalletConnect) return;
      try {
        await onWalletConnect(wallet.id);
        // Only close the modal if connection succeeded
        onOpenChange(false);
      } catch (error: any) {
        const message =
          (error instanceof Error ? error.message : String(error)) ||
          "Failed to connect wallet.";
        setErrorMessage(message);
        setIsErrorToastOpen(true);
      }
    } else {
      // Wallet is not installed

      // Check for mobile device (simple check)
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      // If on mobile and wallet has a deep link, try to open it
      if (isMobile && wallet.mobileLink) {
        let deepLink = wallet.mobileLink;
        const currentUrl = window.location.href;

        // Replace placeholders
        if (deepLink.includes('{{url}}')) {
          deepLink = deepLink.replace('{{url}}', encodeURIComponent(currentUrl));
        } else if (deepLink.includes('{{domain}}')) {
          // Remove protocol for domain-based links (like MetaMask)
          const domain = currentUrl.replace(/^https?:\/\//, '');
          deepLink = deepLink.replace('{{domain}}', domain);
        }

        window.location.href = deepLink;
        return;
      }

      // Fallback: redirect to install URL
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

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setFlow("connect");
    }
    onOpenChange(nextOpen);
  };

  const showConnectFlow = flow === "connect";

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent
          showCloseButton={false}
          className="bg-[#0b0f0a] border border-[#1f261e] rounded-2xl sm:rounded-3xl p-0 max-w-[calc(100vw-2rem)] sm:max-w-[550px] w-full overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 shrink-0 w-full border-b border-[#1f261e]">
            <DialogTitle className="font-bold leading-normal relative shrink-0 text-2xl text-left text-white m-0">
              {flow === "connect"
                ? t("wallet.connect_wallet")
                : flow === "create"
                  ? t("wallet.create_new_wallet")
                  : t("wallet.import_wallet")}
            </DialogTitle>
            <button
              onClick={() => handleClose(false)}
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
            {showConnectFlow ? (
              <>
                {/* Internal Wallets Section */}
                {internalWallets.length > 0 && (
                  <div className="flex flex-col gap-4 items-start relative shrink-0 w-full">
                    <div className="flex gap-4 items-center relative shrink-0 w-full">
                      <div className="flex-1 h-px bg-[#1f261e]"></div>
                      <p className="font-medium leading-normal relative shrink-0 text-base text-[#b5b5b5]">
                        {t("wallet.my_wallets")}
                      </p>
                      <div className="flex-1 h-px bg-[#1f261e]"></div>
                    </div>
                    <div className="flex flex-col gap-2 w-full">
                      {internalWallets.map((wallet) => (
                        <InternalWalletItem
                          key={wallet.id}
                          wallet={wallet}
                          onConnect={async (address) => {
                            // Set as active and close modal
                            useWalletManagerStore.getState().setActiveWallet(wallet.id);

                            // Track device session for local wallet
                            try {
                              const { createDeviceSession } = await import("@/lib/wallet/utils/device-detection");
                              await createDeviceSession(wallet.address);
                            } catch (sessionError) {
                              console.warn("[ConnectWalletModal] Failed to create device session:", sessionError);
                              // Don't block connection if session tracking fails
                            }

                            handleClose(false);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Primary Wallet Options */}
                <div className="flex flex-col gap-2 items-start relative shrink-0 w-full">
                  <WalletOptionCard
                    icon="/assets/icons/wallet/wallet-04.svg"
                    title={t("wallet.create_new_wallet")}
                    description={t("wallet.create_description")}
                    onClick={() => setFlow("create")}
                  />
                  <WalletOptionCard
                    icon="/assets/icons/wallet/cloud-download.svg"
                    title={t("wallet.import_wallet")}
                    description={t("wallet.import_description")}
                    onClick={() => setFlow("import")}
                  />
                </div>

                {/* Connect External Wallets Section */}
                <div className="flex flex-col gap-6 items-start relative shrink-0 w-full">
                  {/* Divider with text */}
                  <div className="flex gap-4 items-center relative shrink-0 w-full">
                    <div className="flex-1 h-px bg-[#1f261e]"></div>
                    <p className="font-medium leading-normal relative shrink-0 text-base text-[#b5b5b5]">
                      {t("wallet.connect_external_wallets")}
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
                          let iconUrl = "/assets/icons/wallet/wallet-04.svg";

                          try {
                            if (
                              wallet.imageId &&
                              typeof wallet.imageId === "string" &&
                              wallet.imageId.trim() !== ""
                            ) {
                              iconUrl = getWalletIconUrl(wallet.imageId, "sm");
                            }
                          } catch (error) {
                            console.error("[ConnectWalletModal] Error generating icon URL:", {
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
                          style={{ minHeight: "80px", minWidth: "80px" }}
                        >
                          <span className="font-medium text-[#b5b5b5] hover:text-[#b1f128] text-sm transition-colors">
                            100+
                          </span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </>
            ) : flow === "create" ? (
              <AddNewWallet
                onGoBack={() => setFlow("connect")}
                onWalletCreated={() => {
                  // Wallet created - success modal will show
                }}
                onComplete={() => {
                  // Close parent modal after success modal closes
                  handleClose(false);
                }}
              />
            ) : (
              <ImportWallet
                onGoBack={() => setFlow("connect")}
                onWalletImported={() => {
                  // Wallet imported - success modal will show
                }}
                onComplete={() => {
                  // Close parent modal after success modal closes
                  handleClose(false);
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {errorMessage && (
        <ErrorToast
          title="Wallet connection error"
          message={errorMessage}
          open={isErrorToastOpen}
          onOpenChange={setIsErrorToastOpen}
        />
      )}
    </>
  );
}