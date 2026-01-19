"use client";

import Image from "next/image";
import { SettingsView } from "./types";
import { useState } from "react";
import WalletsList from "./wallets-list";
import { FiCopy, FiCheck } from "react-icons/fi";
import { useTranslation } from "@/lib/i18n/useTranslation";

interface AccountDetailsProps {
  walletName: string;
  walletAddress: string;
  chainIcons: string[];
  hasWallet: boolean;
  isLocalWallet: boolean;
  walletSourceLabel?: string;
  onViewChange: (view: SettingsView) => void;
}

// Format address like Figma: 0x061...T432
const formatAddress = (address: string): string => {
  if (!address || address.length <= 10) return address;
  const withoutPrefix = address.startsWith("0x") ? address.slice(2) : address;
  if (withoutPrefix.length <= 7) return address;
  return `0x${withoutPrefix.slice(0, 3)}...${withoutPrefix.slice(-4)}`;
};

export default function AccountDetails({
  walletName,
  walletAddress,
  chainIcons,
  hasWallet,
  isLocalWallet,
  walletSourceLabel,
  onViewChange,
}: AccountDetailsProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [showFullAddress, setShowFullAddress] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-[70px] items-start w-full">
      {/* Go Back Button and Title */}
      <div className="flex flex-col gap-[12px] items-start w-full">
        <div className="flex items-center justify-center">
          <button
            onClick={() => onViewChange("main")}
            className="border border-[#b1f128] border-solid flex flex-col items-start p-[10px] rounded-[8px] w-[120px]"
          >
            <div className="flex gap-[8px] items-center w-full">
              <Image
                src="/assets/icons/wallet/arrow-right.svg"
                alt="Go Back"
                width={24}
                height={24}
                className="rotate-180"
              />
              <p className="font-['Manrope:Medium',sans-serif] font-medium leading-[normal] text-[#b1f128] text-[16px] tracking-[0.016px]">
                {t("settings.go_back")}
              </p>
            </div>
          </button>
        </div>
        <div className="flex items-center justify-center min-w-full">
          <p className="font-['General_Sans:Medium',sans-serif] leading-[normal] text-[20px] text-center text-white w-full whitespace-pre-wrap">
            {t("account.settings")}
          </p>
        </div>
      </div>

      {/* Account Details */}
      <div className="flex flex-col gap-[62px] items-start w-full">
        <div className="flex items-center justify-center w-full">
          <div className="flex flex-col gap-[32px] items-start w-full">
            {/* Wallet Name */}
            <div className="flex flex-col gap-[8px] items-start w-full">
              <p className="font-['Manrope:Medium',sans-serif] font-medium leading-[normal] text-[#b5b5b5] text-[18px]">
                {t("account.wallet_name")}:
              </p>
              <p className="font-['Manrope:Medium',sans-serif] font-medium leading-[normal] text-[20px] text-white w-[220px] whitespace-pre-wrap">
                {hasWallet ? walletName : t("account.no_wallet_connected")}
              </p>
            </div>

            {/* Wallet Address */}
            <div className="flex flex-col gap-[8px] items-start w-full">
              <p className="font-['Manrope:Medium',sans-serif] font-medium leading-[normal] text-[#b5b5b5] text-[18px]">
                {t("account.wallet_address")}:
              </p>
              <div className="flex gap-[8px] items-center">
                <p className="font-['Manrope:Medium',sans-serif] font-medium leading-[normal] text-[20px] text-white break-all max-w-xs">
                  {hasWallet
                    ? showFullAddress
                      ? walletAddress
                      : "********************"
                    : "Connect a wallet to see your address"}
                </p>
                {hasWallet && (
                  <div className="flex gap-[4px] items-center">
                    <button
                      onClick={handleCopy}
                      className="relative shrink-0 size-[20px] cursor-pointer hover:opacity-80 transition-opacity flex items-center justify-center"
                      aria-label="Copy address"
                    >
                      {copied ? (
                        <FiCheck className="w-4 h-4 text-[#b1f128]" />
                      ) : (
                        <FiCopy className="w-4 h-4 text-white" />
                      )}
                    </button>
                    <button
                      onClick={() => setShowFullAddress((prev) => !prev)}
                      className="relative shrink-0 size-[20px] cursor-pointer hover:opacity-80 transition-opacity"
                      aria-label={showFullAddress ? "Hide full address" : "Show full address"}
                    >
                      <Image
                        src="/assets/icons/wallet/view.svg"
                        alt="Toggle full address"
                        width={20}
                        height={20}
                        className="w-full h-full object-contain"
                      />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Account Type */}
            <div className="flex flex-col gap-[8px] items-start w-full">
              <p className="font-['Manrope:Medium',sans-serif] font-medium leading-[normal] text-[#b5b5b5] text-[18px]">
                {t("account.account_type")}:
              </p>
              <p className="font-['Manrope:Medium',sans-serif] font-medium leading-[normal] text-[20px] text-white">
                {!hasWallet
                  ? t("account.no_wallet_connected")
                  : isLocalWallet
                  ? t("account.local_tiwi_wallet")
                  : walletSourceLabel
                  ? `External (${walletSourceLabel})`
                  : "External Wallet"}
              </p>
            </div>

            {/* Network(s) connected */}
            <div className="flex flex-col gap-[8px] items-start w-full">
              <p className="font-['Manrope:Medium',sans-serif] font-medium leading-[normal] text-[#b5b5b5] text-[18px]">
                {t("account.networks_connected")}:
              </p>
              <div className="flex gap-[6px] items-center">
                {chainIcons.slice(0, 8).map((icon, index) => (
                  <div
                    key={index}
                    className="relative rounded-[75px] shrink-0 size-[20.25px] overflow-hidden"
                  >
                    <Image
                      src={icon}
                      alt={`Chain ${index + 1}`}
                      width={20}
                      height={20}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* My Wallets (local + external) */}
            <WalletsList />
          </div>
        </div>

        {/* Action Buttons */}
        {hasWallet && (
          <div className="flex items-center justify-center w-full">
            <div className="flex flex-col gap-[8px] items-start w-full">
              {/* Top Row - only for local wallets */}
              {isLocalWallet && (
                <div className="flex gap-[8px] items-start w-full">
                  <button
                    onClick={() => onViewChange("edit-wallet-name")}
                    className="bg-[#121712] flex flex-[1_0_0] flex-col h-[62px] items-center justify-center p-[10px] rounded-[100px] shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                  >
                    <div className="flex gap-[8px] items-center justify-center w-full">
                      <Image
                        src="/assets/icons/wallet/file-empty-01.svg"
                        alt="Edit"
                        width={24}
                        height={24}
                        className="w-6 h-6"
                      />
                      <p className="font-['Manrope:Regular',sans-serif] font-normal leading-[normal] text-[16px] text-left text-white">
                        {t("wallet.edit_name")}
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={() => onViewChange("export-private-key-warning")}
                    className="bg-[#121712] flex flex-[1_0_0] flex-col h-[62px] items-center justify-center p-[10px] rounded-[100px] shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                  >
                    <div className="flex gap-[8px] items-center justify-center w-full">
                      <Image
                        src="/assets/icons/wallet/cloud-download.svg"
                        alt="Export"
                        width={24}
                        height={24}
                        className="w-6 h-6"
                      />
                      <p className="font-['Manrope:Regular',sans-serif] font-normal leading-[normal] text-[16px] text-left text:white">
                        Export Private Key
                      </p>
                    </div>
                  </button>
                </div>
              )}

              {/* Bottom Row */}
              <div className="flex gap-[8px] items-start w-full">
                {isLocalWallet && (
                  <button
                    onClick={() => onViewChange("export-recovery-phrase-warning")}
                    className="bg-[#121712] flex flex-[1_0_0] flex-col h-[62px] items:center justify-center p-[10px] rounded-[100px] shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                  >
                    <div className="flex gap-[8px] items-center justify-center w-full">
                      <Image
                        src="/assets/icons/wallet/cloud-download.svg"
                        alt="Export"
                        width={24}
                        height={24}
                        className="w-6 h-6"
                      />
                      <p className="font-['Manrope:Regular',sans-serif] font-normal leading-[normal] text-[16px] text-left text-white">
                        Export Recovery Phrase
                      </p>
                    </div>
                  </button>
                )}
                <button
                  onClick={() => onViewChange("disconnect-wallet")}
                  className="bg-[#121712] flex flex-[1_0_0] flex-col h-[62px] items-center justify-center p-[10px] rounded-[100px] shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <div className="flex gap-[8px] items-center justify-center w-full">
                    <Image
                      src="/assets/icons/wallet/logout-01.svg"
                      alt="Disconnect"
                      width={24}
                      height={24}
                      className="w-6 h-6"
                    />
                    <p className="font-['Manrope:Regular',sans-serif] font-normal leading-[normal] text-[16px] text-left text-white">
                      Disconnect Wallet
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

