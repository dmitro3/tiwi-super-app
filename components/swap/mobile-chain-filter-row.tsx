"use client";

import Image from "next/image";
import type { Chain } from "@/lib/frontend/types/tokens";

interface MobileChainFilterRowProps {
  chains: Chain[];
  selectedChain: Chain | "all";
  onChainSelect: (chain: Chain | "all") => void;
  onMoreClick: () => void;
}

export default function MobileChainFilterRow({
  chains,
  selectedChain,
  onChainSelect,
  onMoreClick,
}: MobileChainFilterRowProps) {
  // Get top 4-5 chains for quick access (excluding "all")
  const topChains = chains.filter((chain) => chain.id !== "all").slice(0, 4);

  return (
    <div className="flex items-center gap-2 px-4 sm:px-6 py-2 overflow-x-auto scrollbar-hide">
      {/* "All" Button */}
      <button
        onClick={() => onChainSelect("all")}
        className={`flex items-center justify-center px-3 py-1.5 rounded-full text-sm font-medium transition-colors shrink-0 ${
          selectedChain === "all"
            ? "bg-[#0d3600] text-white"
            : "bg-[#121712] text-[#b5b5b5] hover:bg-[#1f261e]"
        }`}
      >
        All
      </button>

      {/* Chain Icon Buttons */}
      {topChains.map((chain) => {
        const isSelected =
          selectedChain !== "all" && selectedChain.id === chain.id;
        return (
          <button
            key={chain.id}
            onClick={() => onChainSelect(chain)}
            className={`flex items-center justify-center size-9 rounded-full transition-all shrink-0 ${
              isSelected
                ? "bg-[#0d3600] ring-2 ring-[#b1f128] ring-offset-2 ring-offset-[#0b0f0a]"
                : "bg-[#121712] hover:bg-[#1f261e]"
            }`}
            aria-label={`Filter by ${chain.name}`}
          >
            <Image
              src={chain.logo}
              alt={chain.name}
              width={20}
              height={20}
              className="size-5 object-contain"
            />
          </button>
        );
      })}

      {/* "More" Button */}
      <button
        onClick={onMoreClick}
        className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#121712] text-[#b5b5b5] text-sm font-medium hover:bg-[#1f261e] transition-colors shrink-0"
      >
        <span>More</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="size-4"
        >
          <path
            d="M6 12L10 8L6 4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}

