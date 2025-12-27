"use client";

import { IoChevronForward, IoRefresh, IoArrowBack } from "react-icons/io5";
import { FiTrash2, FiFile, FiSettings } from "react-icons/fi";

interface AppUpdatesCacheProps {
  onGoBack: () => void;
}

export default function AppUpdatesCache({ onGoBack }: AppUpdatesCacheProps) {
  return (
    <div className="bg-[#0B0F0A] rounded-2xl border border-[#1f261e] p-6 md:p-8">
      <div className="flex justify-end mb-6">
        <button
          onClick={onGoBack}
          className="flex items-center gap-2 text-[#B1F128] border border-[#B1F128] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#081F02] transition-colors"
        >
          <IoArrowBack size={16} />
          Go Back
        </button>
      </div>

      <h2 className="text-2xl font-semibold text-white mb-6">
        App Updates and Cache
      </h2>

      <div className="space-y-3">
        {/* Check for Updates */}
        <button className="w-full flex items-center justify-between py-4 px-4 bg-[#010501] rounded-xl border border-[#1f261e] hover:bg-[#121712] transition-colors text-left">
          <div className="flex items-center gap-3">
            <IoRefresh size={20} className="text-[#B5B5B5]" />
            <span className="text-base text-[#B5B5B5]">Check for Updates</span>
          </div>
          <IoChevronForward size={20} className="text-[#B5B5B5] opacity-60" />
        </button>

        {/* Clear Cache */}
        <button className="w-full flex items-center justify-between py-4 px-4 bg-[#010501] rounded-xl border border-[#1f261e] hover:bg-[#121712] transition-colors text-left">
          <div className="flex items-center gap-3">
            <FiTrash2 size={20} className="text-[#B5B5B5]" />
            <span className="text-base text-[#B5B5B5]">Clear Cache</span>
          </div>
          <IoChevronForward size={20} className="text-[#B5B5B5] opacity-60" />
        </button>

        {/* Reset Temporary Files */}
        <button className="w-full flex items-center justify-between py-4 px-4 bg-[#010501] rounded-xl border border-[#1f261e] hover:bg-[#121712] transition-colors text-left">
          <div className="flex items-center gap-3">
            <FiFile size={20} className="text-[#B5B5B5]" />
            <span className="text-base text-[#B5B5B5]">
              Reset Temporary Files
            </span>
          </div>
          <IoChevronForward size={20} className="text-[#B5B5B5] opacity-60" />
        </button>

        {/* Refresh NFT Metadata */}
        <button className="w-full flex items-center justify-between py-4 px-4 bg-[#010501] rounded-xl border border-[#1f261e] hover:bg-[#121712] transition-colors text-left">
          <div className="flex items-center gap-3">
            <IoRefresh size={20} className="text-[#B5B5B5]" />
            <span className="text-base text-[#B5B5B5]">
              Refresh NFT Metadata
            </span>
          </div>
          <IoChevronForward size={20} className="text-[#B5B5B5] opacity-60" />
        </button>

        {/* Developer Mode */}
        <div className="flex items-center justify-between py-4 px-4 bg-[#010501] rounded-xl border border-[#1f261e]">
          <div className="flex items-center gap-3">
            <FiSettings size={20} className="text-[#B5B5B5]" />
            <span className="text-base text-[#B5B5B5]">Developer Mode</span>
          </div>
          <span className="text-xs text-[#6E7873]">Off</span>
        </div>
      </div>
    </div>
  );
}

