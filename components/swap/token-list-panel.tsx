"use client";

import TokenRow from "./token-row";
import TokenRowSkeleton from "./token-row-skeleton";
import SearchInput from "@/components/ui/search-input";
import { formatAddress, formatBalance } from "@/lib/shared/utils/formatting";
import type { Token } from "@/lib/frontend/types/tokens";

interface TokenListPanelProps {
  walletTokens: Token[];
  otherTokens: Token[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onTokenSelect: (token: Token) => void;
  selectedToken?: Token | null;
  isLoading?: boolean; // True if initial load (no cached data)
  isSearching?: boolean; // True when background fetch is happening
  isApiFetching?: boolean; // True when API is actively fetching (for skeleton display)
  error?: Error | null;
  connectedAddress?: string | null;
}

export default function TokenListPanel({
  walletTokens,
  otherTokens,
  searchQuery,
  onSearchChange,
  onTokenSelect,
  selectedToken,
  isLoading = false,
  isSearching = false,
  isApiFetching = false,
  error = null,
  connectedAddress,
}: TokenListPanelProps) {
  // Filter wallet tokens and other tokens by search query
  const filteredWalletTokens = walletTokens.filter((token) =>
    !searchQuery.trim() ||
    token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    token.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredOtherTokens = otherTokens.filter((token) =>
    !searchQuery.trim() ||
    token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    token.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const hasWalletTokens = connectedAddress && filteredWalletTokens.length > 0;
  const hasOtherTokens = filteredOtherTokens.length > 0;
  const totalTokens = filteredWalletTokens.length + filteredOtherTokens.length;
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
            <div className="flex flex-col items-center gap-2">
              {/* Error Icon */}
              <div className="size-12 rounded-full bg-[#ff4444]/10 flex items-center justify-center mb-2">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-[#ff4444]"
                >
                  <path
                    d="M12 8V12M12 16H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              
              {/* Error Message */}
              <p className="text-[#ff4444] font-medium text-base text-center">
                Unable to load tokens
              </p>
              <p className="text-[#7c7c7c] font-normal text-sm text-center max-w-[280px]">
                {error.message || 'Please check your connection and try again.'}
              </p>
              
              {/* Retry Suggestion */}
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 text-sm font-medium text-white bg-[#1f261e] hover:bg-[#2a3329] rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Empty State - Only show when API completed and no tokens */}
        {!isLoading && !isApiFetching && !error && totalTokens === 0 && (
          <div className="flex flex-col items-center justify-center px-6 py-12 w-full">
            <p className="text-[#7c7c7c] font-medium text-base text-center">
              {searchQuery.trim() ? "No tokens found" : "No tokens available"}
            </p>
          </div>
        )}

        {/* Token List - Show tokens if available */}
        {!isLoading && !error && totalTokens > 0 && (
          <>
            {/* Your Wallet Section */}
            {hasWalletTokens && (
              <>
                <div className="px-4 sm:px-6 lg:px-[24px] py-2 bg-[#121712]/50 border-b border-[#1f261e] w-full">
                  <p className="text-xs sm:text-sm font-semibold text-[#b1f128]">
                    Your Wallet
                  </p>
                </div>
                {filteredWalletTokens.map((token) => (
                  <TokenRow
                    key={token.id}
                    token={token}
                    formattedAddress={formatAddress(token.address)}
                    formattedBalance={token.balance ? formatBalance(token.balance) : "0.00"}
                    isSelected={selectedToken?.id === token.id}
                    onClick={() => onTokenSelect(token)}
                  />
                ))}
              </>
            )}

            {/* Other Tokens Section */}
            {hasOtherTokens && (
              <>
                {hasWalletTokens && (
                  <div className="px-4 sm:px-6 lg:px-[24px] py-2 bg-[#0b0f0a] border-b border-[#1f261e] w-full">
                    <p className="text-xs sm:text-sm font-semibold text-[#7c7c7c]">
                      Other Tokens
                    </p>
                  </div>
                )}
                {filteredOtherTokens.map((token) => (
                  <TokenRow
                    key={token.id}
                    token={token}
                    formattedAddress={formatAddress(token.address)}
                    formattedBalance={token.balance ? formatBalance(token.balance) : ""}
                    isSelected={selectedToken?.id === token.id}
                    onClick={() => onTokenSelect(token)}
                  />
                ))}
              </>
            )}
            
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
        {!isLoading && !error && totalTokens === 0 && isApiFetching && (
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

