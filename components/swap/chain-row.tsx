"use client";

import Image from "next/image";
import type { Chain } from "@/lib/frontend/types/tokens";

interface ChainRowProps {
  chain: Chain;
  isSelected: boolean;
  onClick: () => void;
  isAllNetworks?: boolean;
}

export default function ChainRow({
  chain,
  isSelected,
  onClick,
  isAllNetworks = false,
}: ChainRowProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-between p-[8px] w-full rounded-[16px] transition-colors cursor-pointer ${
        isSelected
          ? "bg-[#0d3600]"
          : ""
      }`}
    >
      {/* Left Side - Chain Info */}
      <div className="flex gap-[8px] items-center relative shrink-0">
        <div className="relative shrink-0 size-[40px]">
          <Image
            src={isAllNetworks ? "/assets/icons/chains/all-networks.svg" : chain.logo}
            alt={chain.name}
            width={40}
            height={40}
            className="w-full h-full object-cover rounded-full"
          />
        </div>

        {/* Chain Name */}
        <div
          className={`flex flex-col justify-center leading-0 relative shrink-0 text-[18px] whitespace-nowrap ${
            isSelected ? "font-semibold text-white" : "font-medium text-white"
          }`}
        >
          <p className="leading-[20px]">{chain.name}</p>
        </div>
      </div>

      {/* Right Side - Checkmark (if selected) */}
      {isSelected && (
        <div className="relative shrink-0 size-[24px]">
          <Image
            src="/assets/icons/checkmark-circle-01.svg"
            alt="Selected"
            width={24}
            height={24}
            className="w-full h-full object-contain"
          />
        </div>
      )}
    </button>
  );
}

