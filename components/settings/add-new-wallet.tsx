"use client";

import { useState, useCallback } from "react";
import type React from "react";
import { IoArrowBack } from "react-icons/io5";
import { FiPlus, FiCopy, FiCheck, FiEye, FiEyeOff, FiLock } from "react-icons/fi";
import { HiExclamationTriangle } from "react-icons/hi2";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { generateNewWallet, derivePrivateKeyFromMnemonic } from "@/lib/wallet/utils/wallet-creation";
import { useWalletManagerStore } from "@/lib/wallet/state/wallet-manager-store";
import { encryptWalletData } from "@/lib/wallet/utils/wallet-encryption";
import { saveEncryptedPrivateKey } from "@/lib/wallet/state/local-keystore";
import WalletSuccessModal from "@/components/wallet/wallet-success-modal";

interface AddNewWalletProps {
  onGoBack: () => void;
  onWalletCreated?: (address: string) => void;
  onComplete?: () => void; // Called when success modal closes (after successful creation)
}

type Step = "create" | "reveal" | "confirm";

export default function AddNewWallet({ onGoBack, onWalletCreated, onComplete }: AddNewWalletProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>("create");
  const [mnemonic, setMnemonic] = useState<string>("");
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [revealedWords, setRevealedWords] = useState<Set<number>>(new Set());
  const [confirmedWords, setConfirmedWords] = useState<string[]>(Array(12).fill(""));
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasConfirmed, setHasConfirmed] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const addOrUpdateManagedWallet = useWalletManagerStore((s) => s.addOrUpdateWallet);
  const setActiveManagedWallet = useWalletManagerStore((s) => s.setActiveWallet);

  const handleCreateWallet = useCallback(() => {
    try {
      setIsGenerating(true);
      setError(null);
      
      // Generate new wallet with secure mnemonic
      const wallet = generateNewWallet();
      
      // Store mnemonic and address
      setMnemonic(wallet.mnemonic);
      setWalletAddress(wallet.address);
      
      // Clear revealed words
      setRevealedWords(new Set());
      
      // Move to reveal step
      setStep("reveal");
    } catch (err) {
      setError("Failed to generate wallet. Please try again.");
      console.error("Error generating wallet:", err);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const handleCopyMnemonic = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(mnemonic);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError("Failed to copy mnemonic. Please write it down manually.");
    }
  }, [mnemonic]);

  const handleRevealWord = useCallback((index: number) => {
    setRevealedWords((prev) => new Set([...prev, index]));
  }, []);

  const handleRevealAll = useCallback(() => {
    setRevealedWords(new Set(Array(12).fill(0).map((_, i) => i)));
  }, []);

  const handleConfirmWord = useCallback((index: number, word: string) => {
    const newConfirmed = [...confirmedWords];
    newConfirmed[index] = word.toLowerCase().trim();
    setConfirmedWords(newConfirmed);
  }, [confirmedWords]);

  const handlePasteMnemonic = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    
    // Split by whitespace (spaces, newlines, tabs, etc.)
    const words = pastedText
      .trim()
      .split(/\s+/)
      .map(word => word.toLowerCase().trim())
      .filter(word => word.length > 0)
      .slice(0, 12); // Only take first 12 words
    
    if (words.length > 0) {
      const newConfirmed = [...confirmedWords];
      words.forEach((word, idx) => {
        if (idx < 12) {
          newConfirmed[idx] = word;
        }
      });
      setConfirmedWords(newConfirmed);
    }
  }, [confirmedWords]);

  const handleVerifyAndConfirm = useCallback(async () => {
    try {
      setError(null);
      
      // Verify mnemonic
      const userMnemonic = confirmedWords.join(" ").trim();
      const expectedMnemonic = mnemonic.trim();
      
      if (userMnemonic !== expectedMnemonic) {
        setError("Recovery phrase doesn't match. Please check and try again.");
        return;
      }

      // Validate password (master password for local keystore)
      if (!password || password.length < 8) {
        setError("Please set a strong password (at least 8 characters).");
        return;
      }
      if (password !== passwordConfirm) {
        setError("Password and confirmation do not match.");
        return;
      }

      // Derive and encrypt private key for this local wallet
      if (walletAddress && mnemonic) {
        try {
          const privateKey = derivePrivateKeyFromMnemonic(mnemonic);
          const encryptedPrivateKey = await encryptWalletData(privateKey, password);
          saveEncryptedPrivateKey(walletAddress, encryptedPrivateKey);
        } catch (encErr) {
          console.error("[AddNewWallet] Failed to encrypt and store private key:", encErr);
          setError("Failed to secure wallet locally. Please try again.");
          return;
        }
      }

      if (walletAddress) {
        // 1) Update local wallet manager state (Phase 1 multi-wallet)
        const id = `local:${walletAddress.toLowerCase()}`;
        addOrUpdateManagedWallet({
          id,
          address: walletAddress,
          source: "local",
          isLocal: true,
          label: undefined,
        });
        setActiveManagedWallet(id);

        // 2) Best-effort: register this wallet address with the TIWI backend (public info only)
        try {
          await fetch("/api/v1/wallets", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              address: walletAddress,
              source: "local",
            }),
          });
        } catch (registerError) {
          console.warn("[AddNewWallet] Failed to register wallet address:", registerError);
          // Do not block user flow on analytics failure
        }
      }

      // Clear confirmation words array
      setConfirmedWords(Array(12).fill(""));
      
      // Mark as confirmed
      setHasConfirmed(true);
      
      // Show success modal
      setIsSuccessModalOpen(true);
      
      // Call callback with wallet address (public info only)
      onWalletCreated?.(walletAddress);
      
      // SECURITY: Clear mnemonic from state after a delay
      // (Note: This is best effort - JavaScript doesn't guarantee memory clearing)
      setTimeout(() => {
        setMnemonic("");
      }, 5000);
    } catch (err) {
      setError("Verification failed. Please try again.");
      console.error("Error verifying mnemonic:", err);
    }
  }, [confirmedWords, mnemonic, walletAddress, onWalletCreated]);

  const handleSuccessModalClose = useCallback((open: boolean) => {
    if (!open) {
      setIsSuccessModalOpen(false);
    // Clear all sensitive data before going back
    setMnemonic("");
    setConfirmedWords(Array(12).fill(""));
    setRevealedWords(new Set());
      setPassword("");
      setPasswordConfirm("");
      setStep("create");
      // Call onComplete if provided (e.g., to close parent modal)
      onComplete?.();
    onGoBack();
    }
  }, [onGoBack, onComplete]);

  const mnemonicWords = mnemonic.split(" ").filter(Boolean);

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

      <h2 className="text-2xl font-semibold text-white mb-6">{t("wallet.create_title")}</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm flex items-start gap-2">
          <HiExclamationTriangle className="mt-0.5 shrink-0" size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-6">
        {step === "create" && (
          <>
            <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <HiExclamationTriangle className="text-yellow-400 mt-0.5 shrink-0" size={20} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-400 mb-2">Security Warning</p>
                  <p className="text-xs text-yellow-300/90">
                    You will be shown a 12-word recovery phrase. Write it down and store it securely.
                    <strong className="block mt-1">Anyone with your recovery phrase can access your wallet.</strong>
                  </p>
                </div>
              </div>
            </div>

        <p className="text-sm text-[#B5B5B5]">
          Create a new wallet to manage your assets securely. You'll be able to
          generate a new seed phrase and set up your wallet.
        </p>

        <div className="flex flex-col gap-4">
              <button
                onClick={handleCreateWallet}
                disabled={isGenerating}
                className="w-full bg-[#B1F128] text-[#010501] font-semibold py-4 px-6 rounded-full hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {isGenerating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-[#010501] border-t-transparent rounded-full animate-spin" />
                    {t("wallet.generating")}
                  </>
                ) : (
                  <>
            <FiPlus size={20} />
            {t("wallet.create_button")}
                  </>
                )}
          </button>

          <p className="text-xs text-center text-[#6E7873]">
            By creating a wallet, you agree to our Terms & Conditions and
            Privacy Policy.
          </p>
        </div>
          </>
        )}

        {step === "reveal" && (
          <>
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <FiLock className="text-red-400 mt-0.5 shrink-0" size={20} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-400 mb-2">⚠️ CRITICAL SECURITY WARNING</p>
                  <ul className="text-xs text-red-300/90 space-y-1 list-disc list-inside">
                    <li>Write down these 12 words in the exact order shown</li>
                    <li>Store them in a safe, offline location</li>
                    <li>Never share your recovery phrase with anyone</li>
                    <li>Anyone with these words can steal your assets</li>
                    <li>We cannot recover your wallet if you lose this phrase</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-[#010501] border border-[#1f261e] rounded-xl p-4 mb-4">
              <div className="grid grid-cols-3 gap-3">
                {mnemonicWords.map((word, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 bg-[#0B0F0A] rounded-lg"
                  >
                    <span className="text-xs text-[#6E7873] w-6">{index + 1}</span>
                    {revealedWords.has(index) ? (
                      <span className="text-white text-sm font-medium flex-1">{word}</span>
                    ) : (
                      <button
                        onClick={() => handleRevealWord(index)}
                        className="text-[#6E7873] hover:text-[#B1F128] transition-colors flex items-center gap-1 flex-1"
                      >
                        <FiEyeOff size={14} />
                        <span className="text-xs">Reveal</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 mb-4">
              <button
                onClick={handleRevealAll}
                className="flex-1 text-sm text-[#B1F128] border border-[#B1F128] px-4 py-2 rounded-lg hover:bg-[#081F02] transition-colors"
              >
                {t("wallet.reveal_all")}
              </button>
              <button
                onClick={handleCopyMnemonic}
                className="flex-1 text-sm text-[#B1F128] border border-[#B1F128] px-4 py-2 rounded-lg hover:bg-[#081F02] transition-colors flex items-center justify-center gap-2"
              >
                {copied ? <FiCheck size={16} /> : <FiCopy size={16} />}
                {copied ? t("common.applied") : t("common.save")}
              </button>
            </div>

            <button
              onClick={() => setStep("confirm")}
              className="w-full bg-[#B1F128] text-[#010501] font-semibold py-4 px-6 rounded-full hover:opacity-90 transition-opacity"
            >
              {t("wallet.backup_phrase")}
            </button>
          </>
        )}

        {step === "confirm" && (
          <>
            <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-400">
                <strong>Verify your recovery phrase:</strong> Enter the words in order to confirm you've saved them correctly.
                <span className="block mt-1 text-xs text-blue-300/80">
                  💡 Tip: You can paste the entire phrase in any field to automatically fill all words.
                </span>
              </p>
            </div>

            {/* Master Password for Local Wallets */}
            <div className="space-y-3 mb-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs text-[#B5B5B5]">
                  Set a password to encrypt this wallet on this device
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter a strong password (min 8 characters)"
                  className="w-full bg-[#010501] border border-[#1f261e] rounded-lg px-4 py-2 text-white placeholder-[#6E7873] outline-none focus:ring-2 focus:ring-[#B1F128] focus:border-[#B1F128]"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs text-[#B5B5B5]">
                  Confirm password
                </label>
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full bg-[#010501] border border-[#1f261e] rounded-lg px-4 py-2 text-white placeholder-[#6E7873] outline-none focus:ring-2 focus:ring-[#B1F128] focus:border-[#B1F128]"
                />
              </div>
              <p className="text-[10px] text-[#6E7873]">
                This password is used to encrypt your wallet locally. TIWI never sees or stores this password.
                You will need it later to send or sign transactions from this wallet.
              </p>
            </div>

            <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
              {Array(12)
                .fill(0)
                .map((_, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <span className="text-sm text-[#6E7873] w-8">{index + 1}.</span>
                    <input
                      type="text"
                      value={confirmedWords[index]}
                      onChange={(e) => handleConfirmWord(index, e.target.value)}
                      onPaste={handlePasteMnemonic}
                      placeholder={`Word ${index + 1}`}
                      className="flex-1 bg-[#010501] border border-[#1f261e] rounded-lg px-4 py-2 text-white placeholder-[#6E7873] outline-none focus:ring-2 focus:ring-[#B1F128] focus:border-[#B1F128]"
                      autoComplete="off"
                      spellCheck="false"
                    />
                  </div>
                ))}
            </div>

            <button
              onClick={handleVerifyAndConfirm}
              disabled={confirmedWords.some((w) => !w.trim())}
              className="w-full bg-[#B1F128] text-[#010501] font-semibold py-4 px-6 rounded-full hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t("wallet.complete")}
            </button>
          </>
        )}

      </div>

      {/* Success Modal */}
      {walletAddress && (
        <WalletSuccessModal
          open={isSuccessModalOpen}
          onOpenChange={handleSuccessModalClose}
          type="create"
          walletAddress={walletAddress}
        />
      )}
    </div>
  );
}
