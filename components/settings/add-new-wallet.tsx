"use client";

import { IoArrowBack } from "react-icons/io5";
import { FiPlus } from "react-icons/fi";

interface AddNewWalletProps {
  onGoBack: () => void;
}

export default function AddNewWallet({ onGoBack }: AddNewWalletProps) {
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

      <h2 className="text-2xl font-semibold text-white mb-6">Add New Wallet</h2>

      <div className="space-y-6">
        <p className="text-sm text-[#B5B5B5]">
          Create a new wallet to manage your assets securely. You'll be able to
          generate a new seed phrase and set up your wallet.
        </p>

        <div className="flex flex-col gap-4">
          <button className="w-full bg-[#B1F128] text-[#010501] font-semibold py-4 px-6 rounded-full hover:opacity-90 transition-opacity flex items-center justify-center gap-3">
            <FiPlus size={20} />
            Create New Wallet
          </button>

          <p className="text-xs text-center text-[#6E7873]">
            By creating a wallet, you agree to our Terms & Conditions and
            Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}

