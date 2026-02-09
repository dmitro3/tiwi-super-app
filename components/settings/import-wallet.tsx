"use client";

import { useState, useCallback } from "react";
import { IoArrowBack } from "react-icons/io5";
import { FiUpload } from "react-icons/fi";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useWalletManagerStore } from "@/lib/wallet/state/wallet-manager-store";
import { encryptWalletData } from "@/lib/wallet/utils/wallet-encryption";
import { saveEncryptedPrivateKey } from "@/lib/wallet/state/local-keystore";
import { derivePrivateKeyFromMnemonic, validateMnemonic } from "@/lib/wallet/utils/wallet-creation";
import { privateKeyToAccount } from "viem/accounts";
import WalletSuccessModal from "@/components/wallet/wallet-success-modal";

interface ImportWalletProps {
  onGoBack: () => void;
  onWalletImported?: (address: string) => void;
  onComplete?: () => void; // Called when success modal closes (after successful import)
}

export default function ImportWallet({ onGoBack, onWalletImported, onComplete }: ImportWalletProps) {
  const { t } = useTranslation();
  const [secret, setSecret] = useState("");
  const [label, setLabel] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [importedWalletAddress, setImportedWalletAddress] = useState<string>("");

  const addOrUpdateManagedWallet = useWalletManagerStore((s) => s.addOrUpdateWallet);
  const setActiveManagedWallet = useWalletManagerStore((s) => s.setActiveWallet);
  const router = useRouter();

  const handleImport = useCallback(async () => {
    try {
      setError(null);

      const raw = secret.trim();
      if (!raw) {
        setError("Please paste your recovery phrase or private key.");
        return;
      }

      if (!password || !password.trim()) {
        setError("Password is required.");
        return;
      }
      if (password !== passwordConfirm) {
        setError("Password and confirmation do not match.");
        return;
      }

      setIsImporting(true);

      // Determine if this is a mnemonic or a raw private key
      let privateKey: `0x${string}`;

      const looksLikeMnemonic = raw.split(/\s+/).length >= 12;
      const looksLikeHex = /^0x[0-9a-fA-F]{64}$/.test(raw) || /^[0-9a-fA-F]{64}$/.test(raw);

      if (looksLikeMnemonic) {
        if (!validateMnemonic(raw)) {
          setError("The recovery phrase you entered is not valid. Please check and try again.");
          setIsImporting(false);
          return;
        }
        privateKey = derivePrivateKeyFromMnemonic(raw);
      } else if (looksLikeHex) {
        const normalized = raw.startsWith("0x") ? raw : `0x${raw}`;
        privateKey = normalized as `0x${string}`;
      } else {
        setError("Enter a valid 12/24-word recovery phrase or a 64-character private key.");
        setIsImporting(false);
        return;
      }

      // Derive address from private key
      const account = privateKeyToAccount(privateKey);
      const address = account.address;

      // Encrypt and store private key in local keystore
      try {
        const encryptedPrivateKey = await encryptWalletData(privateKey, password);
        saveEncryptedPrivateKey(address, encryptedPrivateKey);
      } catch (encErr: any) {
        console.error("[ImportWallet] Failed to encrypt imported key:", encErr);
        setError(encErr.message || "Failed to securely store this wallet. Please try again.");
        setIsImporting(false);
        return;
      }

      // Update wallet manager and set as active
      const id = `local:${address.toLowerCase()}`;
      addOrUpdateManagedWallet({
        id,
        address,
        source: "local",
        isLocal: true,
        label: label || undefined,
      });
      setActiveManagedWallet(id);

      // Store address and show success modal IMMEDIATELY
      setImportedWalletAddress(address);
      setIsSuccessModalOpen(true);

      onWalletImported?.(address);
      setIsImporting(false);

      // Non-critical background tasks
      setTimeout(async () => {
        // Best-effort: register wallet with backend
        try {
          await fetch("/api/v1/wallets", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              address,
              source: "local",
            }),
          });
        } catch (registerError) {
          console.warn("[ImportWallet] Failed to register imported wallet:", registerError);
        }

        // Refresh router if needed
        try {
          router.refresh();
        } catch {
          // ignore
        }
      }, 100);

    } catch (e: any) {
      console.error("[ImportWallet] Unexpected error:", e);
      setError("An unexpected error occurred while importing the wallet.");
      setIsImporting(false);
    }
  }, [
    secret,
    password,
    passwordConfirm,
    label,
    addOrUpdateManagedWallet,
    setActiveManagedWallet,
    onWalletImported,
    router,
  ]);

  return (
    <div className="bg-[#0B0F0A] rounded-2xl border border-[#1f261e] p-6 md:p-8 max-w-2xl mx-auto">
      <div className="flex justify-end mb-6">
        <button
          onClick={onGoBack}
          className="flex items-center gap-2 text-[#B1F128] border border-[#B1F128] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#081F02] transition-colors"
        >
          <IoArrowBack size={16} />
          {t("settings.go_back")}
        </button>
      </div>

      <h2 className="text-2xl font-semibold text-white mb-6">{t("wallet.import_title")}</h2>

      <div className="space-y-6">
        <p className="text-sm text-[#B5B5B5]">
          Import an existing wallet using your recovery phrase or private key.
          Make sure you're in a secure, private location before proceeding.
        </p>

        {error && (
          <div className="mb-2 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-sm text-[#B5B5B5] mb-2 block">
              {t("wallet.enter_phrase_or_key")}
            </label>
            <textarea
              placeholder={t("wallet.enter_phrase_or_key")}
              rows={4}
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              className="w-full bg-[#010501] border border-[#1f261e] rounded-xl px-4 py-3 text-white placeholder-[#6E7873] outline-none focus:ring-2 focus:ring-[#B1F128] focus:border-[#B1F128] resize-none"
            />
          </div>

          <div>
            <label className="text-sm text-[#B5B5B5] mb-2 block">
              {t("wallet.wallet_name")}
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t("wallet.wallet_name")}
              className="w-full bg-[#010501] border border-[#1f261e] rounded-xl px-4 py-3 text-white placeholder-[#6E7873] outline-none focus:ring-2 focus:ring-[#B1F128] focus:border-[#B1F128]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-[#B5B5B5] mb-2 block">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full bg-[#010501] border border-[#1f261e] rounded-xl px-4 py-3 text-white placeholder-[#6E7873] outline-none focus:ring-2 focus:ring-[#B1F128] focus:border-[#B1F128]"
              />
            </div>
            <div>
              <label className="text-sm text-[#B5B5B5] mb-2 block">
                Confirm Password
              </label>
              <input
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="Re-enter password"
                className="w-full bg-[#010501] border border-[#1f261e] rounded-xl px-4 py-3 text-white placeholder-[#6E7873] outline-none focus:ring-2 focus:ring-[#B1F128] focus:border-[#B1F128]"
              />
            </div>
          </div>

          <p className="text-xs text-[#6E7873]">
            Use the same password you use for other local wallets in TIWI. TIWI never stores your
            password; it is only used to encrypt your keys on this device.
          </p>

          <button
            onClick={handleImport}
            disabled={isImporting}
            className="w-full bg-[#B1F128] text-[#010501] font-semibold py-4 px-6 rounded-full hover:opacity-90 transition-opacity flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isImporting ? (
              <>
                <div className="w-5 h-5 border-2 border-[#010501] border-t-transparent rounded-full animate-spin" />
                {t("wallet.importing")}
              </>
            ) : (
              <>
                <FiUpload size={20} />
                {t("wallet.import_button")}
              </>
            )}
          </button>

          <p className="text-xs text-center text-[#6E7873]">
            By importing a wallet, you agree to our Terms & Conditions and
            Privacy Policy.
          </p>
        </div>
      </div>

      {/* Success Modal */}
      {importedWalletAddress && (
        <WalletSuccessModal
          open={isSuccessModalOpen}
          onOpenChange={(open) => {
            if (!open) {
              setIsSuccessModalOpen(false);
              // Clear form and go back
              setSecret("");
              setLabel("");
              setPassword("");
              setPasswordConfirm("");
              setImportedWalletAddress("");
              // Call onComplete if provided (e.g., to close parent modal)
              onComplete?.();
              onGoBack();
            }
          }}
          type="import"
          walletAddress={importedWalletAddress}
        />
      )}
    </div>
  );
}

