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
import { useWalletBalances } from "@/hooks/useWalletBalances";
import { useActiveWalletAddress } from "@/lib/wallet/hooks/useActiveWalletAddress";
import type { Token, Chain } from "@/lib/frontend/types/tokens";

// Re-export types for backward compatibility
export type { Token, Chain };

interface TokenSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTokenSelect: (token: Token) => void;
  selectedToken?: Token | null;
  connectedAddress?: string | null;
  recipientAddress?: string | null;
  tokenModalType?: "from" | "to";
  connectedChainType?: "EVM" | "Solana" | null;
}

export default function TokenSelectorModal({
  open,
  onOpenChange,
  onTokenSelect,
  selectedToken,
  connectedAddress,
  recipientAddress,
  tokenModalType = "from",
  connectedChainType,
}: TokenSelectorModalProps) {
  const [selectedChain, setSelectedChain] = useState<Chain | "all">("all");
  const [chainSearchQuery, setChainSearchQuery] = useState("");
  const [showChainList, setShowChainList] = useState(false); // Mobile: toggle between token list and chain list

  const queryClient = useQueryClient();

  // Get active wallet address as fallback (single source of truth)
  const activeWalletAddress = useActiveWalletAddress();

  // Determine which wallet address to use:
  // - For "to" section: use recipientAddress if available, otherwise connectedAddress
  // - For "from" section: always use connectedAddress
  // - Fallback to activeWalletAddress if connectedAddress is not provided
  const walletAddressToUse = useMemo(() => {
    if (tokenModalType === "to" && recipientAddress) {
      return recipientAddress;
    }
    return connectedAddress || activeWalletAddress || null;
  }, [tokenModalType, recipientAddress, connectedAddress, activeWalletAddress]);

  // Fetch wallet balances for the appropriate wallet
  const { balances: walletBalances } = useWalletBalances(walletAddressToUse);

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

  // Spam detection function - filters out meme tokens and obvious spam
  const isSpamToken = (name: string, symbol: string, address?: string, chainId?: number): boolean => {
    // Whitelist of known legitimate tokens (never filter these)
    const WHITELISTED_TOKENS = new Set([
      // Major stablecoins
      '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT Ethereum
      '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC Ethereum
      '0x55d398326f99059ff775485246999027b3197955', // USDT BSC
      '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d', // USDC BSC
      '0xda1060158f7d593667cce0a15db346bb3ffb3596', // TWC BSC
      // Native tokens (zero addresses)
      '0x0000000000000000000000000000000000000000',
      '0x0000000000000000000000000000000000001010', // Polygon native
    ]);

    // Check if token is whitelisted
    if (address && WHITELISTED_TOKENS.has(address.toLowerCase())) {
      return false;
    }

    // Whitelist major token symbols
    const WHITELISTED_SYMBOLS = new Set([
      'eth', 'btc', 'bnb', 'usdt', 'usdc', 'busd', 'dai', 'twc', 'sol', 'matic', 'pol',
      'avax', 'ftm', 'arb', 'op', 'base', 'link', 'uni', 'aave', 'crv', 'cake',
    ]);

    if (WHITELISTED_SYMBOLS.has(symbol.toLowerCase())) {
      return false;
    }

    const nameLower = name.toLowerCase();
    const symbolLower = symbol.toLowerCase();

    // Filter out tokens with "meme" in name or symbol
    if (nameLower.includes('meme') || symbolLower.includes('meme')) {
      return true;
    }

    // Filter out tokens with excessive Chinese characters (common in spam)
    // Allow legitimate tokens like TWC, but filter spam with full Chinese names
    const chineseCharPattern = /[\u4e00-\u9fff]/g;
    const chineseChars = (name.match(chineseCharPattern) || []).length;
    const totalChars = name.length;

    // If more than 50% of characters are Chinese and it's not a known token, it's likely spam
    if (totalChars > 0 && chineseChars / totalChars > 0.5) {
      return true;
    }

    // Filter out tokens with suspicious patterns
    const spamPatterns = [
      'airdrop',
      'free',
      'claim',
      'reward',
      'bonus',
      'gift',
      '领取', // Chinese for "claim"
      '空投', // Chinese for "airdrop"
      '免费', // Chinese for "free"
    ];

    for (const pattern of spamPatterns) {
      if (nameLower.includes(pattern) || symbolLower.includes(pattern)) {
        return true;
      }
    }

    return false;
  };

  // Create a map of wallet balances by token address and chainId for quick lookup
  const walletBalanceMap = useMemo(() => {
    const map = new Map<string, { balance: string; usdValue: string | undefined }>();
    if (walletBalances) {
      walletBalances.forEach((walletToken) => {
        const key = `${walletToken.address.toLowerCase()}-${walletToken.chainId}`;
        // Only add to map if token has balance data (token is in wallet)
        if (walletToken.balanceFormatted) {
          map.set(key, {
            balance: walletToken.balanceFormatted,
            usdValue: walletToken.usdValue || undefined,
          });
        }
      });
    }
    return map;
  }, [walletBalances]);

  // Convert wallet balances to Token objects (so they appear in dropdown even if not in API)
  // Filter out spam tokens even from wallet
  const walletTokensAsTokens = useMemo(() => {
    if (!walletBalances) return [];

    return walletBalances
      .filter((walletToken) => {
        // Filter out spam tokens from wallet
        return !isSpamToken(walletToken.name, walletToken.symbol, walletToken.address, walletToken.chainId);
      })
      .map((walletToken) => {
        // Find chain info for this token
        const chainMatch = chainsById.get(walletToken.chainId);

        return {
          id: `${walletToken.address.toLowerCase()}-${walletToken.chainId}`,
          name: walletToken.name,
          symbol: walletToken.symbol,
          address: walletToken.address,
          logo: walletToken.logoURI || '/assets/logos/default-token.svg',
          logoURI: walletToken.logoURI,
          chain: chainMatch?.name || 'Unknown',
          chainId: walletToken.chainId,
          chainLogo: chainMatch?.logo ? cleanImageUrl(chainMatch.logo) : undefined,
          decimals: walletToken.decimals,
          balance: walletToken.balanceFormatted,
          usdValue: walletToken.usdValue,
          price: walletToken.priceUSD,
          verified: true, // Wallet tokens are verified (spam already filtered by API)
        } as Token;
      });
  }, [walletBalances, chainsById]);

  // Merge API tokens with wallet tokens, avoiding duplicates
  const mergedTokens = useMemo(() => {
    // Create a map of API tokens by address-chainId
    const apiTokenMap = new Map<string, Token>();
    tokens.forEach((token) => {
      if (token.chainId) {
        const key = `${token.address.toLowerCase()}-${token.chainId}`;
        apiTokenMap.set(key, token);
      }
    });

    // Create a map for merged tokens (wallet tokens take priority)
    const mergedMap = new Map<string, Token>();

    // First, add all wallet tokens
    walletTokensAsTokens.forEach((walletToken) => {
      const key = `${walletToken.address.toLowerCase()}-${walletToken.chainId}`;
      mergedMap.set(key, walletToken);
    });

    // Then, add API tokens that aren't already in wallet and aren't spam
    tokens.forEach((apiToken) => {
      if (apiToken.chainId) {
        const key = `${apiToken.address.toLowerCase()}-${apiToken.chainId}`;
        // Filter out spam tokens from API
        if (!mergedMap.has(key) && !isSpamToken(apiToken.name, apiToken.symbol, apiToken.address, apiToken.chainId)) {
          mergedMap.set(key, apiToken);
        }
      }
    });

    return Array.from(mergedMap.values());
  }, [tokens, walletTokensAsTokens]);

  // Enrich merged tokens with chain logo, normalized chain name, and wallet balance data
  const tokensWithChainLogo = useMemo(() => {
    return mergedTokens.map((token) => {
      const chainMatchById = token.chainId ? chainsById.get(token.chainId) : undefined;
      const chainMatchByName = chainsByName.get(token.chain.toLowerCase());
      const chainMatch = chainMatchById || chainMatchByName;

      // Look up wallet balance for this token
      const balanceKey = token.chainId
        ? `${token.address.toLowerCase()}-${token.chainId}`
        : null;
      const walletBalance = balanceKey ? walletBalanceMap.get(balanceKey) : null;

      return {
        ...token,
        chain: chainMatch?.name || token.chain,
        chainLogo: cleanImageUrl(chainMatch?.logo),
        // Override balance and usdValue with wallet data if available
        // Only set if walletBalance exists (token is in wallet)
        balance: walletBalance ? walletBalance.balance : token.balance,
        usdValue: walletBalance ? walletBalance.usdValue : token.usdValue,
      };
    });
  }, [mergedTokens, chainsById, chainsByName, walletBalanceMap]);

  // Apply chain filter to tokens (like portfolio does)
  const chainFilteredTokens = useMemo(() => {
    let tokensToFilter = tokensWithChainLogo;

    // If connectedChainType is set, filter tokens by chain type even when "all" is selected
    if (connectedChainType) {
      tokensToFilter = tokensWithChainLogo.filter(token => {
        // Check if token matches the connected chain type
        const chainId = token.chainId;
        if (!chainId) return true; // Keep if unknown (unlikely)

        if (connectedChainType === 'Solana') {
          return chainId === 7565164; // Solana Chain ID
        }
        if (connectedChainType === 'EVM') {
          return chainId !== 7565164; // Assuming non-Solana is EVM for now (revise if more non-EVMs added)
        }
        return true;
      });
    }

    // If "all" chains selected, return the type-filtered tokens
    if (selectedChain === "all") {
      return tokensToFilter;
    }

    // Filter by selected chain
    const selectedChainId = parseInt(selectedChain.id, 10);
    if (isNaN(selectedChainId)) {
      return tokensToFilter;
    }

    return tokensToFilter.filter((token) => token.chainId === selectedChainId);
  }, [tokensWithChainLogo, selectedChain, connectedChainType]);

  // Apply search filter (like portfolio does)
  const searchFilteredTokens = useMemo(() => {
    if (!searchQuery.trim()) {
      return chainFilteredTokens;
    }

    const query = searchQuery.toLowerCase().trim();
    return chainFilteredTokens.filter((token) =>
      token.symbol.toLowerCase().includes(query) ||
      token.name.toLowerCase().includes(query) ||
      token.address.toLowerCase().includes(query)
    );
  }, [chainFilteredTokens, searchQuery]);

  // Separate wallet tokens from other tokens (after filtering)
  // Only show verified tokens in "other tokens" section (like portfolio does)
  const { walletTokens, otherTokens } = useMemo(() => {
    const wallet: Token[] = [];
    const other: Token[] = [];

    searchFilteredTokens.forEach((token) => {
      // Check if token has wallet balance (token is in wallet)
      const balanceKey = token.chainId
        ? `${token.address.toLowerCase()}-${token.chainId}`
        : null;
      const hasWalletBalance = balanceKey ? walletBalanceMap.has(balanceKey) : false;

      // Include token in wallet section if it's in the wallet (even with 0 balance)
      if (hasWalletBalance) {
        wallet.push(token);
      } else {
        // For "other tokens" (not in wallet), only show verified tokens
        // This filters out spam/unverified tokens from the API
        // verified === true means the token is verified
        // verified === undefined/null means we don't have verification data, so we include it
        // (to maintain backward compatibility with tokens that don't have verification field yet)
        const isVerified = token.verified === true || token.verified === undefined;
        if (isVerified) {
          other.push(token);
        }
      }
    });

    // Sort wallet tokens by USD value (descending), then by balance (descending)
    wallet.sort((a, b) => {
      const aUsdValue = a.usdValue ? parseFloat(a.usdValue.replace(/[^0-9.-]/g, '')) : 0;
      const bUsdValue = b.usdValue ? parseFloat(b.usdValue.replace(/[^0-9.-]/g, '')) : 0;
      if (aUsdValue !== bUsdValue) {
        return bUsdValue - aUsdValue; // Descending order
      }
      const aBalance = a.balance ? parseFloat(a.balance) : 0;
      const bBalance = b.balance ? parseFloat(b.balance) : 0;
      return bBalance - aBalance; // Descending order
    });

    // Sort other tokens by symbol alphabetically
    other.sort((a, b) => a.symbol.localeCompare(b.symbol));

    return { walletTokens: wallet, otherTokens: other };
  }, [searchFilteredTokens, walletBalanceMap]);

  // Filter chains based on search query (client-side filtering for chains)
  const filteredChains = useMemo(() => {
    if (!chainSearchQuery.trim()) return chains;

    const query = chainSearchQuery.toLowerCase().trim();
    let chainsToFilter = chains;

    // Apply strict filtering if a chain type is enforced (e.g. from connected wallet)
    if (connectedChainType) {
      chainsToFilter = chains.filter(chain => {
        // Handle Solana specifically (ID 7565164 or type 'Solana')
        if (connectedChainType === 'Solana') {
          return chain.id === '7565164' || chain.type === 'Solana';
        }
        // Handle EVM (type 'EVM' or not Solana/other non-EVMs)
        if (connectedChainType === 'EVM') {
          return chain.type === 'EVM' || (chain.type !== 'Solana' && chain.id !== '7565164');
        }
        return true;
      });
    }

    return chainsToFilter.filter((chain) =>
      chain.name.toLowerCase().includes(query)
    );
  }, [chains, chainSearchQuery, connectedChainType]);

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
                walletTokens={walletTokens}
                otherTokens={otherTokens}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onTokenSelect={handleTokenSelect}
                selectedToken={selectedToken}
                isLoading={tokensLoading}
                isSearching={isSearching}
                isApiFetching={isApiFetching}
                error={tokensError}
                connectedAddress={walletAddressToUse}
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

