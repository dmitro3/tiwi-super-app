"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import TokenListPanel from "./token-list-panel";
import ChainSelectorPanel from "./chain-selector-panel";
import MobileChainFilterRow from "./mobile-chain-filter-row";
import MobileChainListPanel from "./mobile-chain-list-panel";
import { useChains } from "@/hooks/useChains";
import { useTokenSearch } from "@/hooks/useTokenSearch";
import { useQueryClient } from "@tanstack/react-query";
import { getTokensQueryKey } from "@/hooks/useTokensQuery";
import { fetchTokens } from "@/lib/frontend/api/tokens";
import { cleanImageUrl } from "@/lib/shared/utils/formatting";
import type { Token, Chain } from "@/lib/frontend/types/tokens";

// Re-export types for backward compatibility
export type { Token, Chain };

interface TokenSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTokenSelect: (token: Token) => void;
  selectedToken?: Token | null;
}

export default function TokenSelectorModal({
  open,
  onOpenChange,
  onTokenSelect,
  selectedToken,
}: TokenSelectorModalProps) {
  const [selectedChain, setSelectedChain] = useState<Chain | "all">("all");
  const [chainSearchQuery, setChainSearchQuery] = useState("");
  const [showChainList, setShowChainList] = useState(false); // Mobile: toggle between token list and chain list

  const queryClient = useQueryClient();

  // Fetch chains from API
  const { chains, isLoading: chainsLoading, error: chainsError } = useChains();

  // Determine which chains to fetch tokens for
  const chainIds = useMemo(() => {
    if (selectedChain === "all") {
      return undefined; // Fetch all chains
    }
    // Convert chain ID string to number
    // Chain.id is a string, but backend expects number
    const chainId = parseInt(selectedChain.id, 10);
    return isNaN(chainId) ? undefined : [chainId];
  }, [selectedChain]);

  // Prefetch tokens when chain is selected (before modal opens or when chain changes)
  useEffect(() => {
    if (open && chainIds) {
      // Prefetch tokens for the selected chain(s)
      const prefetchParams = {
        chains: chainIds,
        limit: 30,
      };
      
      queryClient.prefetchQuery({
        queryKey: getTokensQueryKey(prefetchParams),
        queryFn: () => fetchTokens(prefetchParams),
      });
    }
  }, [open, chainIds, queryClient]);

  // Prefetch tokens for all chains when modal opens and "all" is selected
  useEffect(() => {
    if (open && selectedChain === "all") {
      // Prefetch tokens for all chains (no chain filter)
      const prefetchParams = {
        limit: 30,
      };
      
      queryClient.prefetchQuery({
        queryKey: getTokensQueryKey(prefetchParams),
        queryFn: () => fetchTokens(prefetchParams),
      });
    }
  }, [open, selectedChain, queryClient]);

  // Fetch tokens with search (uses hybrid search: cached first, then background fetch)
  const {
    query: searchQuery,
    setQuery: setSearchQuery,
    tokens,
    isLoading: tokensLoading,
    isSearching,
    isApiFetching,
    error: tokensError,
  } = useTokenSearch({
    chains: chainIds,
    limit: 30, // Default limit per API request
  });

  // Build chain lookup maps
  const chainsById = useMemo(() => {
    const map = new Map<number, Chain>();
    chains.forEach((chain) => {
      const idNum = parseInt(chain.id, 10);
      if (!isNaN(idNum)) {
        map.set(idNum, chain);
      }
    });
    return map;
  }, [chains]);

  const chainsByName = useMemo(() => {
    const map = new Map<string, Chain>();
    chains.forEach((chain) => {
      map.set(chain.name.toLowerCase(), chain);
    });
    return map;
  }, [chains]);

  // Enrich tokens with chain logo and normalized chain name
  const tokensWithChainLogo = useMemo(() => {
    return tokens.map((token) => {
      const chainMatchById = token.chainId ? chainsById.get(token.chainId) : undefined;
      const chainMatchByName = chainsByName.get(token.chain.toLowerCase());
      const chainMatch = chainMatchById || chainMatchByName;

      return {
        ...token,
        chain: chainMatch?.name || token.chain,
        chainLogo: cleanImageUrl(chainMatch?.logo),
      };
    });
  }, [tokens, chainsById, chainsByName]);

  // Sort tokens: tokens with balances first, then preserve backend order (volume-based)
  const sortedTokens = useMemo(() => {
    return [...tokensWithChainLogo].sort((a, b) => {
      const aHasBalance = a.balance && parseFloat(a.balance) > 0;
      const bHasBalance = b.balance && parseFloat(b.balance) > 0;

      // Only prioritize tokens with balances
      if (aHasBalance && !bHasBalance) return -1;
      if (!aHasBalance && bHasBalance) return 1;
      
      // Preserve backend order (volume-based, mixed by chain) - no alphabetical sorting
      return 0;
    });
  }, [tokensWithChainLogo]);

  // Filter chains based on search query (client-side filtering for chains)
  const filteredChains = useMemo(() => {
    if (!chainSearchQuery.trim()) return chains;

    const query = chainSearchQuery.toLowerCase().trim();
    return chains.filter((chain) =>
      chain.name.toLowerCase().includes(query)
    );
  }, [chains, chainSearchQuery]);

  const handleTokenSelect = (token: Token) => {
    onTokenSelect(token);
    onOpenChange(false);
    // Reset search on close
    setSearchQuery("");
    setChainSearchQuery("");
  };

  const handleChainSelect = (chain: Chain | "all") => {
    setSelectedChain(chain);
    // Reset token search when chain changes
    setSearchQuery("");
    // On mobile, go back to token list after selecting a chain
    setShowChainList(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state on close
    setSearchQuery("");
    setChainSearchQuery("");
    setSelectedChain("all");
    setShowChainList(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        showCloseButton={false}
        className="bg-[#0b0f0a]! border-[#1f261e]! border-b! border-l! border-r! border-solid! border-t! rounded-[24px]! p-0! pb-[40px]! pt-0! max-w-[863px]! w-[calc(100%-3rem)]! sm:w-[calc(100%-4rem)]! lg:w-[863px]! h-[90vh]! max-h-[90vh]! flex! flex-col! items-center! grid-cols-none! gap-0! shadow-lg!"
      >
        {/* Header */}
        <div className="border-[#1f261e] border-b border-l-0 border-r-0 border-solid border-t-0 flex items-center justify-between px-4 sm:px-6 lg:px-[24px] py-3 sm:py-4 lg:py-[16px] shrink-0 w-full">
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Back Arrow - Mobile only, shown when chain list is visible */}
            {showChainList && (
              <button
                onClick={() => setShowChainList(false)}
                className="lg:hidden cursor-pointer relative shrink-0 size-7 sm:size-8 hover:opacity-80 transition-opacity"
                aria-label="Back to token list"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-full h-full"
                >
                  <path
                    d="M15 18L9 12L15 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-white"
                  />
                </svg>
              </button>
            )}
            <DialogTitle className="font-bold leading-normal relative shrink-0 text-xl sm:text-2xl lg:text-[24px] text-white m-0">
              {showChainList ? "Select Chain" : "Select a Token"}
            </DialogTitle>
          </div>
          <button
            onClick={handleClose}
            className="cursor-pointer relative shrink-0 size-7 sm:size-8 lg:size-[32px] hover:opacity-80 transition-opacity"
            aria-label="Close modal"
          >
            <Image
              src="/assets/icons/cancel-circle.svg"
              alt="Close"
              width={32}
              height={32}
              className="w-full h-full object-contain"
            />
          </button>
        </div>

        {/* Mobile Chain Filter Row - Only visible on mobile, hidden when chain list is shown */}
        {!showChainList && (
          <div className="lg:hidden">
            <MobileChainFilterRow
              chains={chains}
              selectedChain={selectedChain}
              onChainSelect={handleChainSelect}
              onMoreClick={() => setShowChainList(true)}
            />
          </div>
        )}

        {/* Two-Panel Layout */}
        <div className="flex flex-col lg:flex-row flex-1 min-h-0 items-start justify-center relative shrink-0 w-full lg:w-[863px] overflow-hidden">
          {/* Left Panel Container - 551px fixed on desktop, full width on mobile */}
          <div className="flex flex-col items-start relative w-full lg:w-[551px] lg:shrink-0 lg:flex-none h-full overflow-hidden">
            {/* Mobile: Show chain list or token list based on state */}
            {showChainList ? (
              <MobileChainListPanel
                chains={filteredChains}
                selectedChain={selectedChain}
                searchQuery={chainSearchQuery}
                onSearchChange={setChainSearchQuery}
                onChainSelect={handleChainSelect}
                isLoading={chainsLoading}
                error={chainsError}
              />
            ) : (
              <TokenListPanel
                tokens={sortedTokens}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onTokenSelect={handleTokenSelect}
                selectedToken={selectedToken}
                isLoading={tokensLoading}
                isSearching={isSearching}
                isApiFetching={isApiFetching}
                error={tokensError}
              />
            )}
          </div>

          {/* Vertical Divider - Desktop only */}
          <div className="hidden lg:flex flex-[1_0_0] h-full items-center justify-center min-h-0 min-w-0 relative shrink-0">
            <div className="flex-none rotate-0 size-full">
              <div className="relative size-full">
                <div className="absolute inset-[0_-1px_0_0]">
                  <div className="w-px h-full bg-[#1f261e]"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel Container - 312px total - Desktop only */}
          <div className="hidden lg:flex flex-col items-start relative shrink-0 w-[312px] h-full overflow-hidden border-l border-[#1f261e]">
            <ChainSelectorPanel
              chains={filteredChains}
              selectedChain={selectedChain}
              searchQuery={chainSearchQuery}
              onSearchChange={setChainSearchQuery}
              onChainSelect={handleChainSelect}
              isLoading={chainsLoading}
              error={chainsError}
            />
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}

