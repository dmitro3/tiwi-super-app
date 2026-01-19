"use client";

import { useState } from "react";
import Image from "next/image";
import { FiTrash2, FiUnlock, FiLock, FiEye, FiEyeOff } from "react-icons/fi";
import { useWalletManagerStore } from "@/lib/wallet/state/wallet-manager-store";
import { removeEncryptedPrivateKey } from "@/lib/wallet/state/local-keystore";
import { decryptWalletData } from "@/lib/wallet/utils/wallet-encryption";
import { privateKeyToAccount } from "viem/accounts";
import type { ManagedWallet } from "@/lib/wallet/state/wallet-manager-store";

interface InternalWalletItemProps {
  wallet: ManagedWallet;
  onConnect?: (address: string) => Promise<void> | void;
  onRemove?: () => void;
}

const formatAddress = (address: string): string => {
  if (!address || address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export default function InternalWalletItem({
  wallet,
  onConnect,
  onRemove,
}: InternalWalletItemProps) {
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  
  const setActiveWallet = useWalletManagerStore((s) => s.setActiveWallet);
  const removeWallet = useWalletManagerStore((s) => s.removeWallet);

  const handleUnlock = async () => {
    if (!password) {
      setError("Please enter your password");
      return;
    }

    setIsUnlocking(true);
    setError(null);

    try {
      // Get encrypted private key from keystore
      const { getEncryptedPrivateKey } = await import("@/lib/wallet/state/local-keystore");
      const encryptedKey = getEncryptedPrivateKey(wallet.address);

      if (!encryptedKey) {
        setError("Wallet not found in keystore");
        setIsUnlocking(false);
        return;
      }

      // Decrypt private key
      const privateKey = await decryptWalletData(encryptedKey, password);
      const account = privateKeyToAccount(privateKey as `0x${string}`);

      // Verify address matches
      if (account.address.toLowerCase() !== wallet.address.toLowerCase()) {
        setError("Address mismatch. Wallet may be corrupted.");
        setIsUnlocking(false);
        return;
      }

      // Set as active wallet
      setActiveWallet(wallet.id);

      // Track device session for local wallet
      try {
        const { createDeviceSession } = await import("@/lib/wallet/utils/device-detection");
        await createDeviceSession(wallet.address);
      } catch (sessionError) {
        console.warn("[InternalWalletItem] Failed to create device session:", sessionError);
        // Don't block connection if session tracking fails
      }

      // Call onConnect callback if provided
      if (onConnect) {
        await onConnect(wallet.address);
      }

      // Clear password
      setPassword("");
      setShowPassword(false);
    } catch (err: any) {
      const message =
        err instanceof Error ? err.message : "Failed to unlock wallet";
      if (message.includes("password") || message.includes("decrypt")) {
        setError("Incorrect password. Please try again.");
      } else {
        setError(message);
      }
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleRemove = () => {
    // Remove from keystore
    removeEncryptedPrivateKey(wallet.address);
    
    // Remove from store
    removeWallet(wallet.id);
    
    // Call onRemove callback if provided
    onRemove?.();
    
    setShowRemoveConfirm(false);
  };

  const walletLabel = wallet.label || `Local Wallet ${formatAddress(wallet.address)}`;

  return (
    <div className="flex flex-col gap-2 p-4 bg-[#0B0F0A] border border-[#1f261e] rounded-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#081F02] border border-[#1f261e] flex items-center justify-center">
            <Image
              src="/walleticon.svg"
              alt="Wallet"
              width={20}
              height={20}
              className="opacity-80"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-white">{walletLabel}</span>
            <span className="text-xs text-[#6E7873] font-mono">
              {wallet.address}
            </span>
          </div>
        </div>
        <button
          onClick={() => setShowRemoveConfirm(true)}
          className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-[#6E7873] hover:text-red-400"
          aria-label="Remove wallet"
        >
          <FiTrash2 size={16} />
        </button>
      </div>

      {showRemoveConfirm ? (
        <div className="flex flex-col gap-2 p-3 bg-red-500/10 border border-red-500/50 rounded-lg">
          <p className="text-xs text-red-400">
            Are you sure you want to remove this wallet? This action cannot be undone.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleRemove}
              className="flex-1 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs rounded-lg transition-colors"
            >
              Remove
            </button>
            <button
              onClick={() => setShowRemoveConfirm(false)}
              className="flex-1 px-3 py-1.5 bg-[#1f261e] hover:bg-[#2a3a24] text-[#b5b5b5] text-xs rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleUnlock();
                  }
                }}
                placeholder="Enter password to unlock"
                className="w-full bg-[#010501] border border-[#1f261e] rounded-lg px-3 py-2 pr-10 text-white placeholder-[#6E7873] text-sm outline-none focus:ring-2 focus:ring-[#B1F128] focus:border-[#B1F128]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#6E7873] hover:text-[#b5b5b5] transition-colors"
              >
                {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
            <button
              onClick={handleUnlock}
              disabled={isUnlocking || !password}
              className="px-4 py-2 bg-[#B1F128] text-[#010501] font-medium text-sm rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isUnlocking ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#010501] border-t-transparent rounded-full animate-spin" />
                  Unlocking...
                </>
              ) : (
                <>
                  <FiUnlock size={16} />
                  Unlock
                </>
              )}
            </button>
          </div>
          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}

