"use client";

import ChainRow from "./chain-row";
import SearchInput from "@/components/ui/search-input";
import type { Chain } from "@/lib/frontend/types/tokens";

interface ChainSelectorPanelProps {
  chains: Chain[];
  selectedChain: Chain | "all";
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onChainSelect: (chain: Chain | "all") => void;
  isLoading?: boolean;
  error?: Error | null;
}

export default function ChainSelectorPanel({
  chains,
  selectedChain,
  searchQuery,
  onSearchChange,
  onChainSelect,
  isLoading = false,
  error = null,
}: ChainSelectorPanelProps) {
  return (
    <div className="flex flex-col items-start relative shrink-0 h-full w-full overflow-hidden">
      {/* Search Bar */}
      <div className="flex flex-col items-start px-[16px] py-[8px] shrink-0 w-full">
        <div className="w-[280px]">
          <SearchInput
            value={searchQuery}
            onChange={onSearchChange}
            placeholder="Search network"
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Chain List */}
      <div className="flex flex-col gap-[8px] items-start px-[16px] py-0 relative flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden token-list-scrollbar">
        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center px-6 py-12 w-full">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-[#b1f128] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-[#7c7c7c] font-medium text-sm text-center">
                Loading chains...
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className="flex flex-col items-center justify-center px-6 py-12 w-full">
            <p className="text-[#ff4444] font-medium text-base text-center mb-2">
              Failed to load chains
            </p>
            <p className="text-[#7c7c7c] font-medium text-sm text-center">
              {error.message}
            </p>
          </div>
        )}

        {/* Chain List (when not loading and no error) */}
        {!isLoading && !error && (
          <>
            {/* All Networks Option - Always show first */}
            <ChainRow
              chain={{ id: "all", name: "All Networks", logo: "" }}
              isSelected={selectedChain === "all"}
              onClick={() => onChainSelect("all")}
              isAllNetworks={true}
            />

            {/* Other Chains - Filter out "all" from the list */}
            {chains
              .filter((chain) => chain.id !== "all")
              .map((chain) => (
                <ChainRow
                  key={chain.id}
                  chain={chain}
                  isSelected={
                    selectedChain !== "all" && selectedChain.id === chain.id
                  }
                  onClick={() => onChainSelect(chain)}
                />
              ))}

            {/* Empty State (if search returns no results) */}
            {searchQuery.trim() &&
              chains.filter((chain) => chain.id !== "all").length === 0 && (
                <div className="flex flex-col items-center justify-center px-6 py-12 w-full">
                  <p className="text-[#7c7c7c] font-medium text-base text-center">
                    No chains found
                  </p>
                </div>
              )}
          </>
        )}
      </div>
    </div>
  );
}

