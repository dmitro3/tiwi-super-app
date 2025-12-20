"use client";

import ChainRow from "./chain-row";
import SearchInput from "@/components/ui/search-input";
import type { Chain } from "@/lib/frontend/types/tokens";

interface MobileChainListPanelProps {
  chains: Chain[];
  selectedChain: Chain | "all";
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onChainSelect: (chain: Chain | "all") => void;
  isLoading?: boolean;
  error?: Error | null;
}

export default function MobileChainListPanel({
  chains,
  selectedChain,
  searchQuery,
  onSearchChange,
  onChainSelect,
  isLoading = false,
  error = null,
}: MobileChainListPanelProps) {
  // Filter chains based on search query
  const filteredChains = chains.filter((chain) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    return chain.name.toLowerCase().includes(query);
  });

  return (
    <div className="flex flex-col items-start relative shrink-0 w-full h-full overflow-hidden">
      {/* Search Bar */}
      <div className="flex flex-col items-start px-4 sm:px-6 lg:px-[24px] py-2 sm:py-[8px] shrink-0 w-full">
        <SearchInput
          value={searchQuery}
          onChange={onSearchChange}
          placeholder="Search network"
          disabled={isLoading}
        />
      </div>

      {/* Chain List - Scrollable Container with Fixed Height */}
      <div className="flex flex-col gap-[8px] items-start px-4 sm:px-6 lg:px-[16px] py-0 relative flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden token-list-scrollbar">
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
            {filteredChains
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

            {/* Show "No chains found" only if search query returns no results (excluding "All Networks") */}
            {searchQuery.trim() &&
              filteredChains.filter((chain) => chain.id !== "all").length === 0 && (
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

