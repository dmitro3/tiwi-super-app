"use client";

import TokenRow from "./token-row";
import TokenRowSkeleton from "./token-row-skeleton";
import SearchInput from "@/components/ui/search-input";
import { formatAddress, formatBalance } from "@/lib/shared/utils/formatting";
import type { Token } from "@/lib/frontend/types/tokens";

interface TokenListPanelProps {
  tokens: Token[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onTokenSelect: (token: Token) => void;
  selectedToken?: Token | null;
  isLoading?: boolean; // True if initial load (no cached data)
  isSearching?: boolean; // True when background fetch is happening
  isApiFetching?: boolean; // True when API is actively fetching (for skeleton display)
  error?: Error | null;
}

export default function TokenListPanel({
  tokens,
  searchQuery,
  onSearchChange,
  onTokenSelect,
  selectedToken,
  isLoading = false,
  isSearching = false,
  isApiFetching = false,
  error = null,
}: TokenListPanelProps) {
  return (
    <div className="flex flex-col items-start relative shrink-0 w-full h-full overflow-hidden">
      {/* Search Bar */}
      <div className="flex flex-col items-start px-4 sm:px-6 lg:px-[24px] py-2 sm:py-[8px] shrink-0 w-full">
        <SearchInput
          value={searchQuery}
          onChange={onSearchChange}
          placeholder="Search by tokens or address"
          disabled={isLoading}
        />
      </div>

      {/* Token List - Scrollable Container with Fixed Height */}
      <div className="flex flex-col items-start relative flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden token-list-scrollbar">
        {/* Initial Loading State - Skeleton UI (no cached data) */}
        {isLoading && (
          <div className="flex flex-col items-start relative w-full">
            {Array.from({ length: 8 }).map((_, index) => (
              <TokenRowSkeleton key={`skeleton-${index}`} />
            ))}
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className="flex flex-col items-center justify-center px-6 py-12 w-full">
            <p className="text-[#ff4444] font-medium text-base text-center mb-2">
              Failed to load tokens
            </p>
            <p className="text-[#7c7c7c] font-medium text-sm text-center">
              {error.message}
            </p>
          </div>
        )}

        {/* Empty State - Only show when API completed and no tokens */}
        {!isLoading && !isApiFetching && !error && tokens.length === 0 && (
          <div className="flex flex-col items-center justify-center px-6 py-12 w-full">
            <p className="text-[#7c7c7c] font-medium text-base text-center">
              {searchQuery.trim() ? "No tokens found" : "No tokens available"}
            </p>
          </div>
        )}

        {/* Token List - Show tokens if available */}
        {!isLoading && !error && tokens.length > 0 && (
          <>
            {tokens.map((token) => (
              <TokenRow
                key={token.id}
                token={token}
                formattedAddress={formatAddress(token.address)}
                formattedBalance={formatBalance(token.balance)}
                isSelected={selectedToken?.id === token.id}
                onClick={() => onTokenSelect(token)}
              />
            ))}
            
            {/* Show skeletons at bottom when API is fetching (even if tokens exist) */}
            {isApiFetching && (
              <div className="flex flex-col items-start relative w-full border-t border-[#1f261e]">
                {Array.from({ length: 3 }).map((_, index) => (
                  <TokenRowSkeleton key={`skeleton-fetching-${index}`} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Show skeletons when searching but no tokens yet */}
        {!isLoading && !error && tokens.length === 0 && isApiFetching && (
          <div className="flex flex-col items-start relative w-full">
            {Array.from({ length: 8 }).map((_, index) => (
              <TokenRowSkeleton key={`skeleton-search-${index}`} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

