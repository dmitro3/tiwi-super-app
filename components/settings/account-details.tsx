"use client";

import Image from "next/image";
import { SettingsView } from "./types";

interface AccountDetailsProps {
  walletName: string;
  walletAddress: string;
  chainIcons: string[];
  onViewChange: (view: SettingsView) => void;
}

export default function AccountDetails({
  walletName,
  walletAddress,
  chainIcons,
  onViewChange,
}: AccountDetailsProps) {
  return (
    <div className="space-y-6">
        {/* Wallet Name */}
        <div>
          <label className="text-sm text-[#B5B5B5] mb-1 block">
            Wallet Name
          </label>
          <p className="text-base text-white font-medium">{walletName}</p>
        </div>

        {/* Wallet Address */}
        <div>
          <label className="text-sm text-[#B5B5B5] mb-1 block">
            Wallet Address
          </label>
          <p className="text-base text-white font-medium font-mono">
            {walletAddress}
          </p>
        </div>

        {/* Account Type */}
        <div>
          <label className="text-sm text-[#B5B5B5] mb-1 block">
            Account Type
          </label>
          <p className="text-base text-white font-medium">Non-custodial</p>
        </div>

        {/* Network(s) connected */}
        <div>
          <label className="text-sm text-[#B5B5B5] mb-3 block">
            Network(s) connected:
          </label>
          <div className="flex flex-wrap gap-2">
            {chainIcons.map((icon, index) => (
              <div
                key={index}
                className="w-8 h-8 rounded-full overflow-hidden border border-[#1f261e]"
              >
                <Image
                  src={icon}
                  alt={`Chain ${index + 1}`}
                  width={32}
                  height={32}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
          <button
            onClick={() => onViewChange("edit-wallet-name")}
            className="bg-transparent border-2 border-[#B1F128] text-[#B1F128] font-semibold py-4 px-6 rounded-xl hover:bg-[#081F02] transition-colors"
          >
            Edit Wallet Name
          </button>

          <button
            onClick={() => onViewChange("export-private-key-warning")}
            className="bg-transparent border-2 border-[#B1F128] text-[#B1F128] font-semibold py-4 px-6 rounded-xl hover:bg-[#081F02] transition-colors"
          >
            Export Private Key
          </button>

          <button
            onClick={() => onViewChange("export-recovery-phrase-warning")}
            className="bg-transparent border-2 border-[#B1F128] text-[#B1F128] font-semibold py-4 px-6 rounded-xl hover:bg-[#081F02] transition-colors"
          >
            Export Recovery Phrase
          </button>

          <button
            onClick={() => onViewChange("disconnect-wallet")}
            className="bg-transparent border-2 border-[#B1F128] text-[#B1F128] font-semibold py-4 px-6 rounded-xl hover:bg-[#081F02] transition-colors"
          >
            Disconnect Wallet
          </button>
        </div>
      </div>
  );
}

