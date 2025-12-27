"use client";

import { IoArrowBack } from "react-icons/io5";
import { FiUpload } from "react-icons/fi";

interface ImportWalletProps {
  onGoBack: () => void;
}

export default function ImportWallet({ onGoBack }: ImportWalletProps) {
  return (
    <div className="bg-[#0B0F0A] rounded-2xl border border-[#1f261e] p-6 md:p-8 max-w-2xl mx-auto">
      <div className="flex justify-end mb-6">
        <button
          onClick={onGoBack}
          className="flex items-center gap-2 text-[#B1F128] border border-[#B1F128] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#081F02] transition-colors"
        >
          <IoArrowBack size={16} />
          Go Back
        </button>
      </div>

      <h2 className="text-2xl font-semibold text-white mb-6">Import Wallet</h2>

      <div className="space-y-6">
        <p className="text-sm text-[#B5B5B5]">
          Import an existing wallet using your recovery phrase or private key.
          Make sure you're in a secure location.
        </p>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-[#B5B5B5] mb-2 block">
              Recovery Phrase or Private Key
            </label>
            <textarea
              placeholder="Enter your recovery phrase or private key"
              rows={4}
              className="w-full bg-[#010501] border border-[#1f261e] rounded-xl px-4 py-3 text-white placeholder-[#6E7873] outline-none focus:ring-2 focus:ring-[#B1F128] focus:border-[#B1F128] resize-none"
            />
          </div>

          <div>
            <label className="text-sm text-[#B5B5B5] mb-2 block">
              Wallet Name (Optional)
            </label>
            <input
              type="text"
              placeholder="Enter a name for this wallet"
              className="w-full bg-[#010501] border border-[#1f261e] rounded-xl px-4 py-4 text-white placeholder-[#6E7873] outline-none focus:ring-2 focus:ring-[#B1F128] focus:border-[#B1F128]"
            />
          </div>

          <button className="w-full bg-[#B1F128] text-[#010501] font-semibold py-4 px-6 rounded-full hover:opacity-90 transition-opacity flex items-center justify-center gap-3">
            <FiUpload size={20} />
            Import Wallet
          </button>

          <p className="text-xs text-center text-[#6E7873]">
            By importing a wallet, you agree to our Terms & Conditions and
            Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}

