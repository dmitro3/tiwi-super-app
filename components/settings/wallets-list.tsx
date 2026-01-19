"use client";

import { useMemo, useState } from "react";
import { useWalletManagerStore } from "@/lib/wallet/state/wallet-manager-store";
import { useActiveWalletAddress } from "@/lib/wallet/hooks/useActiveWalletAddress";
import { removeEncryptedPrivateKey } from "@/lib/wallet/state/local-keystore";
import { decryptWalletData } from "@/lib/wallet/utils/wallet-encryption";
import { privateKeyToAccount } from "viem/accounts";
import { FiTrash2, FiEye, FiEyeOff } from "react-icons/fi";
import { useTranslation } from "@/lib/i18n/useTranslation";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useWallet } from "@/lib/wallet/hooks/useWallet";

const formatAddress = (address: string): string => {
  if (!address || address.length <= 10) return address;
  const withoutPrefix = address.startsWith("0x") ? address.slice(2) : address;
  if (withoutPrefix.length <= 7) return address;
  return `0x${withoutPrefix.slice(0, 3)}...${withoutPrefix.slice(-4)}`;
};

const sourceLabel: Record<string, string> = {
  local: "Local",
  metamask: "MetaMask",
  walletconnect: "WalletConnect",
  coinbase: "Coinbase",
  rabby: "Rabby",
  phantom: "Phantom",
  other: "Other",
};

export default function WalletsList() {
  const { t } = useTranslation();
  const wallets = useWalletManagerStore((s) => s.wallets);
  const activeWalletId = useWalletManagerStore((s) => s.activeWalletId);
  const setActiveWallet = useWalletManagerStore((s) => s.setActiveWallet);
  const removeWallet = useWalletManagerStore((s) => s.removeWallet);
  const fallbackActiveAddress = useActiveWalletAddress();
  const wallet = useWallet();
  const [walletToRemove, setWalletToRemove] = useState<string | null>(null);
  const [walletToConnect, setWalletToConnect] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const sortedWallets = useMemo(
    () =>
      [...wallets].sort((a, b) => b.createdAt - a.createdAt),
    [wallets]
  );

  const handleWalletClick = (walletId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Don't show dialog if already active
    if (walletId === activeWalletId) return;
    setWalletToConnect(walletId);
    setError(null);
    setPassword("");
  };

  const handleRemoveClick = (walletId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent activating the wallet when clicking remove
    setWalletToRemove(walletId);
  };

  const handleConnectConfirm = async () => {
    if (!walletToConnect) return;
    
    const walletToConnectData = wallets.find((w) => w.id === walletToConnect);
    if (!walletToConnectData) return;

    setIsConnecting(true);
    setError(null);

    try {
      if (walletToConnectData.isLocal && walletToConnectData.source === 'local') {
        // Local wallet - need password to unlock
        if (!password) {
          setError("Please enter your password");
          setIsConnecting(false);
          return;
        }

        // Get encrypted private key from keystore
        const { getEncryptedPrivateKey } = await import("@/lib/wallet/state/local-keystore");
        const encryptedKey = getEncryptedPrivateKey(walletToConnectData.address);

        if (!encryptedKey) {
          setError("Wallet not found in keystore");
          setIsConnecting(false);
          return;
        }

        // Decrypt private key
        const privateKey = await decryptWalletData(encryptedKey, password);
        const account = privateKeyToAccount(privateKey as `0x${string}`);

        // Verify address matches
        if (account.address.toLowerCase() !== walletToConnectData.address.toLowerCase()) {
          setError("Address mismatch. Wallet may be corrupted.");
          setIsConnecting(false);
          return;
        }

        // Set as active wallet
        setActiveWallet(walletToConnectData.id);

        // Track device session for local wallet
        try {
          const { createDeviceSession } = await import("@/lib/wallet/utils/device-detection");
          await createDeviceSession(walletToConnectData.address);
        } catch (sessionError) {
          console.warn("[WalletsList] Failed to create device session:", sessionError);
          // Don't block connection if session tracking fails
        }
      } else {
        // External wallet - just set as active (connection handled by wagmi)
        setActiveWallet(walletToConnectData.id);
      }

      // Clear state and close dialog
      setPassword("");
      setShowPassword(false);
      setWalletToConnect(null);
    } catch (err: any) {
      const message = err instanceof Error ? err.message : "Failed to connect wallet";
      if (message.includes("password") || message.includes("decrypt")) {
        setError("Incorrect password. Please try again.");
      } else {
        setError(message);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleRemoveConfirm = () => {
    if (!walletToRemove) return;
    
    const wallet = wallets.find((w) => w.id === walletToRemove);
    if (!wallet) return;

    // Only allow removal of local wallets
    if (wallet.isLocal && wallet.source === 'local') {
      // Remove from keystore (encrypted private key)
      removeEncryptedPrivateKey(wallet.address);
      
      // Remove from wallet manager store
      removeWallet(wallet.id);
    }
    
    setWalletToRemove(null);
  };

  if (sortedWallets.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4 items-start w-full">
      <div className="flex items-center justify-between w-full">
        <p className="font-['Manrope:Medium',sans-serif] font-medium leading-[normal] text-[#b5b5b5] text-[18px]">
          {t("account.my_wallets")}
        </p>
        <p className="text-xs text-[#6E7873]">
          {t("account.active_wallet_description")}
        </p>
      </div>

      <div className="flex flex-col gap-2 w-full">
        {sortedWallets.map((wallet) => {
          const isActive =
            wallet.id === activeWalletId ||
            (!!fallbackActiveAddress &&
              wallet.address.toLowerCase() === fallbackActiveAddress.toLowerCase());

          const label =
            wallet.label ||
            (wallet.isLocal ? t("account.local_wallet") : sourceLabel[wallet.source] || "Wallet");

          const isLocal = wallet.isLocal && wallet.source === 'local';

          return (
            <div
              key={wallet.id}
              className={`flex items-center justify-between w-full rounded-xl border px-4 py-3 transition-colors ${
                isActive
                  ? "border-[#B1F128] bg-[#081F02]"
                  : "border-[#1f261e] bg-[#0B0F0A] hover:border-[#2a3a24]"
              }`}
            >
              <button
                type="button"
                onClick={(e) => handleWalletClick(wallet.id, e)}
                disabled={isActive}
                className="flex-1 flex items-center justify-between text-left disabled:opacity-50 disabled:cursor-default"
            >
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-white">{label}</span>
                <span className="text-xs text-[#6E7873]">
                  {formatAddress(wallet.address)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs rounded-full px-2 py-1 border border-[#2a3a24] text-[#b5b5b5]">
                  {sourceLabel[wallet.source] || "Wallet"}
                </span>
                {isActive && (
                  <span className="text-xs font-semibold text-[#B1F128]">
                    {t("account.active")}
                  </span>
                )}
              </div>
            </button>
              {/* Remove button - only for local wallets */}
              {isLocal && (
                <button
                  type="button"
                  onClick={(e) => handleRemoveClick(wallet.id, e)}
                  className="ml-2 p-2 hover:bg-red-500/10 rounded-lg transition-colors text-[#6E7873] hover:text-red-400"
                  aria-label="Remove wallet"
                  title="Remove wallet from account"
                >
                  <FiTrash2 size={16} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Connect Wallet Confirmation Dialog */}
      <Dialog open={!!walletToConnect} onOpenChange={(open) => !open && setWalletToConnect(null)}>
        <DialogContent
          showCloseButton={false}
          className="bg-[#0b0f0a] border border-[#1f261e] rounded-2xl sm:rounded-3xl p-0 max-w-[calc(100vw-2rem)] sm:max-w-[450px] w-full overflow-hidden"
        >
          <div className="flex flex-col gap-6 px-6 py-6">
            <DialogTitle className="font-bold text-2xl text-white">
              {walletToConnect && wallets.find((w) => w.id === walletToConnect)?.isLocal && wallets.find((w) => w.id === walletToConnect)?.source === 'local'
                ? "Connect Local Wallet"
                : "Connect Wallet"}
            </DialogTitle>
            <DialogDescription className="text-[#b5b5b5]">
              {walletToConnect && wallets.find((w) => w.id === walletToConnect)?.isLocal && wallets.find((w) => w.id === walletToConnect)?.source === 'local'
                ? "Enter your password to unlock and connect this wallet."
                : "Do you want to connect this wallet? This will make it your active wallet."}
            </DialogDescription>
            
            {walletToConnect && wallets.find((w) => w.id === walletToConnect)?.isLocal && wallets.find((w) => w.id === walletToConnect)?.source === 'local' && (
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleConnectConfirm();
                      }
                    }}
                    placeholder="Enter password"
                    className="w-full bg-[#010501] border border-[#1f261e] rounded-xl px-4 py-3 pr-12 text-white placeholder-[#6E7873] outline-none focus:ring-2 focus:ring-[#B1F128] focus:border-[#B1F128"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6E7873] hover:text-[#b5b5b5] transition-colors"
                  >
                    {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                  </button>
                </div>
                {error && (
                  <p className="text-sm text-red-400">{error}</p>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setWalletToConnect(null);
                  setPassword("");
                  setError(null);
                }}
                className="flex-1 bg-[#121712] border border-[#1f261e] text-white font-semibold py-3 px-6 rounded-full hover:bg-[#1a1f1a] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConnectConfirm}
                disabled={isConnecting || (walletToConnect && wallets.find((w) => w.id === walletToConnect)?.isLocal && wallets.find((w) => w.id === walletToConnect)?.source === 'local' && !password)}
                className="flex-1 bg-[#B1F128] text-[#010501] font-semibold py-3 px-6 rounded-full hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isConnecting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-[#010501] border-t-transparent rounded-full animate-spin" />
                    Connecting...
                  </>
                ) : (
                  "Connect"
                )}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Wallet Confirmation Dialog */}
      <Dialog open={!!walletToRemove} onOpenChange={(open) => !open && setWalletToRemove(null)}>
        <DialogContent
          showCloseButton={false}
          className="bg-[#0b0f0a] border border-[#1f261e] rounded-2xl sm:rounded-3xl p-0 max-w-[calc(100vw-2rem)] sm:max-w-[450px] w-full overflow-hidden"
        >
          <div className="flex flex-col gap-6 px-6 py-6">
            <DialogTitle className="font-bold text-2xl text-white">
              Remove Wallet
            </DialogTitle>
            <DialogDescription className="text-[#b5b5b5]">
              Are you sure you want to remove this wallet? This will permanently delete it from your account. You will need to import it again using your recovery phrase or private key to access it in the future.
            </DialogDescription>
            <div className="flex gap-3">
              <button
                onClick={() => setWalletToRemove(null)}
                className="flex-1 bg-[#121712] border border-[#1f261e] text-white font-semibold py-3 px-6 rounded-full hover:bg-[#1a1f1a] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRemoveConfirm}
                className="flex-1 bg-red-500/20 border border-red-500/50 text-red-400 font-semibold py-3 px-6 rounded-full hover:bg-red-500/30 transition-colors"
              >
                Remove Wallet
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


