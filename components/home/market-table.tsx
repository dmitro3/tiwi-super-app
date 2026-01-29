"use client";

import { useEffect, useMemo, useRef, useState, MouseEvent, Fragment } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { TABLE_TOKENS } from "@/lib/home/mock-data";
import { TokenImage } from "@/components/home/token-image";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { formatTokenForHomepage, type HomepageToken, formatPrice } from "@/lib/home/token-formatter";
import type { Token } from "@/lib/frontend/types/tokens";
import { useLocaleStore } from "@/lib/locale/locale-store";
import { TableSkeleton } from "@/components/home/table-skeleton";
import { useTokensQuery } from "@/hooks/useTokensQuery";
import { useSwapStore } from "@/lib/frontend/store/swap-store";
import { useNetworkFilterStore } from "@/lib/frontend/store/network-store";


type TabKey = "Favourite" | "Hot" | "New" | "Gainers" | "Losers";
type SortKey = 'volume' | 'rank' | 'performance' | 'none';

interface MarketTableProps {
  activeTab?: TabKey;
  searchQuery?: string;
  sortBy?: SortKey;
  onSortChange?: (sort: SortKey) => void;
}

export function MarketTable({ activeTab = "Hot", searchQuery = "", sortBy = 'none', onSortChange }: MarketTableProps) {
  useLocaleStore((s) => `${s.language}|${s.currency}`); // re-render when locale changes
  const [favourites, setFavourites] = useState<string[]>([]);
  const [hoveredRowIndex, setHoveredRowIndex] = useState<number | null>(null);
  const tableRef = useRef<HTMLTableElement | null>(null);
  const scrollYContainerRef = useRef<HTMLDivElement | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;
  const router = useRouter();

  const setFromToken = useSwapStore((state) => state.setFromToken);
  const setToToken = useSwapStore((state) => state.setToToken);

  // Load favourites from localStorage and add TWC as default favorite
  useEffect(() => {
    const TWC_ADDRESS = '0xDA1060158F7D593667cCE0a15DB346BB3FfB3596';
    const TWC_CHAIN_ID = 56; // BNB Chain
    const TWC_ID = `${TWC_CHAIN_ID}-${TWC_ADDRESS.toLowerCase()}`;

    const stored = localStorage.getItem('favouriteTokens');
    let favouritesList: string[] = [];

    if (stored) {
      try {
        favouritesList = JSON.parse(stored);
      } catch (e) {
        console.error('[MarketTable] Error parsing favourites:', e);
      }
    }

    // Add TWC as default favorite if not already in list
    if (!favouritesList.includes(TWC_ID)) {
      favouritesList.unshift(TWC_ID); // Add to beginning
      localStorage.setItem('favouriteTokens', JSON.stringify(favouritesList));
    }

    setFavourites(favouritesList);
  }, []);

  // Map tabs to market categories
  const categoryMap: Record<TabKey, 'hot' | 'new' | 'gainers' | 'losers' | null> = {
    Hot: 'hot',
    New: 'new',
    Gainers: 'gainers',
    Losers: 'losers',
    Favourite: null,
  };

  const activeCategory = categoryMap[activeTab];
  const { selectedNetworkSlug, selectedChainId } = useNetworkFilterStore();

  // Reset to page 1 when network or category changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedNetworkSlug, activeCategory]);

  // Category-based single tokens (Hot/New/Gainers/Losers) - fetched via TanStack Query
  const {
    data: categoryTokensData = [],
    isLoading: isCategoryLoading,
    error: categoryError,
  } = useTokensQuery({
    params: activeCategory
      ? {
        category: activeCategory,
        limit: rowsPerPage * 2, // Fetch more to account for filtering
        chains: selectedChainId ? [selectedChainId] : undefined, // Filter by selected chain
      }
      : {
        category: 'hot',
        limit: rowsPerPage * 2,
        chains: selectedChainId ? [selectedChainId] : undefined, // Filter by selected chain
      },
    enabled: !!activeCategory,
  });

  // Category tokens are already single tokens, no transformation needed
  const categoryTokens: Token[] = useMemo(() => {
    if (!activeCategory || categoryTokensData.length === 0) return [];
    return categoryTokensData;
  }, [categoryTokensData, activeCategory]);

  // Favourite tokens fetched separately (address-based for now)
  const [favouriteTokens, setFavouriteTokens] = useState<Token[]>([]);
  const [isFavouriteLoading, setIsFavouriteLoading] = useState(false);

  useEffect(() => {
    if (activeTab !== "Favourite") return;

    const loadFavouriteTokens = async () => {
      setIsFavouriteLoading(true);
      try {
        const stored = localStorage.getItem("favouriteTokens");
        const favouriteIds: string[] = stored ? JSON.parse(stored) : [];

        if (favouriteIds.length === 0) {
          setFavouriteTokens([]);
          return;
        }

        const tokensPromises = favouriteIds.map(async (id: string) => {
          const [chainId, address] = id.split("-");
          try {
            const url = new URL("/api/v1/tokens", window.location.origin);
            url.searchParams.set("address", address);
            url.searchParams.set("chains", chainId);
            url.searchParams.set("limit", "1");
            const response = await fetch(url.toString());
            if (response.ok) {
              const data = await response.json();
              return data.tokens?.[0] as Token | undefined;
            }
          } catch (e) {
            console.error(`[MarketTable] Error fetching favourite token ${id}:`, e);
          }
          return null;
        });

        const results = await Promise.all(tokensPromises);
        setFavouriteTokens(results.filter(Boolean) as Token[]);
      } catch (error) {
        console.error("[MarketTable] Error fetching favourite tokens:", error);
        setFavouriteTokens([]);
      } finally {
        setIsFavouriteLoading(false);
      }
    };

    loadFavouriteTokens();
  }, [activeTab, selectedChainId]); // Re-fetch when chain filter changes

  // Derive base token list for the active tab
  const rawTokens: Token[] = useMemo(() => {
    if (activeTab === "Favourite") {
      return favouriteTokens;
    }
    return categoryTokens as Token[];
  }, [activeTab, categoryTokens, favouriteTokens]);

  // Compute loading state
  const isLoading = activeTab === "Favourite" ? isFavouriteLoading : isCategoryLoading;

  // Transform, filter, and sort tokens for homepage display (unpaginated)
  const homepageTokens: HomepageToken[] = useMemo(() => {
    let working: Token[] = [...rawTokens];

    // Network/Chain filtering - filter by selected chain ID
    if (selectedChainId !== null) {
      working = working.filter((token) => token.chainId === selectedChainId);
    }

    // Client-side search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      working = working.filter((token) => {
        const symbol = token.symbol?.toLowerCase() || "";
        const name = token.name?.toLowerCase() || "";
        const address = token.address?.toLowerCase() || "";
        return (
          symbol.includes(query) ||
          name.includes(query) ||
          address.includes(query)
        );
      });
    }

    // Map to homepage tokens
    let formatted = working.map((token) => formatTokenForHomepage(token));

    // Sorting (volume, rank, performance)
    if (sortBy !== "none") {
      formatted = [...formatted].sort((a, b) => {
        switch (sortBy) {
          case "volume":
            return (b.token.volume24h || 0) - (a.token.volume24h || 0);
          case "rank":
            // Lower rank = better (e.g., #1 is better than #100)
            const rankA = (a.token as any).marketCapRank ?? 999999;
            const rankB = (b.token as any).marketCapRank ?? 999999;
            return rankA - rankB;
          case "performance":
            return (
              (b.token.priceChange24h || 0) - (a.token.priceChange24h || 0)
            );
          default:
            return 0;
        }
      });
    }

    // Return full list; pagination handled separately
    return formatted;
  }, [rawTokens, searchQuery, sortBy, selectedChainId]);

  // Pagination logic - calculate which pages to show
  const getVisiblePages = (): number[] => {
    const pages: number[] = [];
    const totalPages = Math.ceil(homepageTokens.length / rowsPerPage);

    if (totalPages <= 5) {
      // Show all pages if 5 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show page 1
      pages.push(1);

      if (currentPage <= 3) {
        // Show 1, 2, 3, 4, ... if on early pages
        pages.push(2, 3, 4);
      } else if (currentPage >= totalPages - 2) {
        // Show ..., n-3, n-2, n-1, n if on late pages
        pages.push(totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        // Show ..., current-1, current, current+1, ... if in middle
        pages.push(currentPage - 1, currentPage, currentPage + 1);
      }

      // Always show last page if not already included
      if (!pages.includes(totalPages)) {
        pages.push(totalPages);
      }
    }

    // Remove duplicates and sort
    return [...new Set(pages)].sort((a, b) => a - b);
  };

  const visiblePages = getVisiblePages();
  const totalPages = Math.ceil(homepageTokens.length / rowsPerPage);
  const paginatedTokens = homepageTokens.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );
  const hasAnyTokens = homepageTokens.length > 0;

  // Reset to page 1 when tokens change (e.g., switching tabs or search)
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery]);

  const handleTradeClick = (rowToken: HomepageToken, event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();

    const token = rowToken.token;

    try {
      // For single tokens, set the token as "from" and use a stablecoin as "to"
      // User can change it in the swap interface
      setFromToken(token);
      // Default to USDT if available, otherwise leave toToken null for user to select
      setToToken(null);

      router.push("/swap");
    } catch (error) {
      console.error("[MarketTable] Failed to prepare swap tokens:", error);
    }
  };

  // Helper to change page and smoothly scroll table to top
  const changePage = (page: number) => {
    const clamped = Math.max(page, 1);
    if (clamped === currentPage) return;
    setCurrentPage(clamped);
    if (scrollYContainerRef.current) {
      scrollYContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };


  return (
    <div className="w-full h-full flex flex-col overflow-hidden relative">
      {/* Vertical scroll container - both tables scroll together */}
      <div
        ref={scrollYContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden market-table-scrollbar min-h-0"
      >
        {/* Single table container - no horizontal scroll */}
        <div className="w-full">
          <Table ref={tableRef} className="w-full table-auto">
            <TableHeader className="sticky top-0 z-20 bg-[#010501]">
              <TableRow className="border-b border-[#1f261e]/80 hover:bg-transparent">
                <TableHead className="z-20 px-3 lg:px-4 xl:px-5 2xl:px-6 py-1.5 lg:py-2 text-left text-[10px] lg:text-xs xl:text-sm text-[#7c7c7c] font-semibold bg-[#010501]">
                  Token
                </TableHead>
                <TableHead className="z-20 px-3 lg:px-4 xl:px-5 2xl:px-6 py-1.5 lg:py-2 text-right text-[10px] lg:text-xs xl:text-sm text-[#7c7c7c] font-semibold bg-[#010501]">
                  Price
                </TableHead>
                <TableHead
                  className="z-20 px-3 lg:px-4 xl:px-5 2xl:px-6 py-1.5 lg:py-2 text-right text-[10px] lg:text-xs xl:text-sm text-[#7c7c7c] font-semibold bg-[#010501] cursor-pointer hover:text-[#b1f128] transition-colors"
                  onClick={() => onSortChange?.(sortBy === 'performance' ? 'none' : 'performance')}
                >
                  24h Change {sortBy === 'performance' ? '▼' : ''}
                </TableHead>
                <TableHead
                  className="z-20 px-3 lg:px-4 xl:px-5 2xl:px-6 py-1.5 lg:py-2 text-right text-[10px] lg:text-xs xl:text-sm text-[#7c7c7c] font-semibold bg-[#010501] cursor-pointer hover:text-[#b1f128] transition-colors"
                  onClick={() => onSortChange?.(sortBy === 'volume' ? 'none' : 'volume')}
                >
                  24h Vol {sortBy === 'volume' ? '▼' : ''}
                </TableHead>
                <TableHead
                  className="z-20 px-3 lg:px-4 xl:px-5 2xl:px-6 py-1.5 lg:py-2 text-right text-[10px] lg:text-xs xl:text-sm text-[#7c7c7c] font-semibold bg-[#010501] cursor-pointer hover:text-[#b1f128] transition-colors"
                  onClick={() => onSortChange?.(sortBy === 'rank' ? 'none' : 'rank')}
                >
                  Rank {sortBy === 'rank' ? '▼' : ''}
                </TableHead>
                <TableHead className="z-20 px-3 lg:px-4 xl:px-5 2xl:px-6 py-1.5 lg:py-2 text-right text-[10px] lg:text-xs xl:text-sm text-[#7c7c7c] font-semibold bg-[#010501]">
                  Supply
                </TableHead>
                <TableHead className="z-20 px-3 lg:px-4 xl:px-5 2xl:px-6 py-1.5 lg:py-2 text-center text-[10px] lg:text-xs xl:text-sm text-[#7c7c7c] font-semibold bg-[#010501]">
                  Buy/Sell
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableSkeleton rows={10} />
              ) : homepageTokens.length === 0 && searchQuery.trim() ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-[#b5b5b5]">
                    No tokens found
                  </TableCell>
                </TableRow>
              ) : !isCategoryLoading && !hasAnyTokens ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-[#b5b5b5]">
                    No tokens available
                  </TableCell>
                </TableRow>
              ) : (
                paginatedTokens.map((token: HomepageToken, idx: number) => (
                  <TableRow
                    key={token.token.id}
                    onClick={() => router.push(`/market/${token.token.symbol}-USDT`)}
                    className="group border-b border-[#1f261e]/60 hover:bg-[#0b0f0a] transition-colors cursor-pointer"
                  >
                    <TableCell className="px-3 lg:px-3.5 xl:px-4 2xl:px-5 py-2.5 lg:py-3 xl:py-4 text-white text-[10px] lg:text-xs xl:text-sm font-semibold align-middle">
                      <div className="flex items-center gap-1.5 lg:gap-2 xl:gap-2.5 2xl:gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Toggle favourite
                            const tokenId = `${token.token.chainId}-${token.token.address.toLowerCase()}`;
                            const newFavourites = [...favourites];
                            const index = newFavourites.indexOf(tokenId);
                            if (index > -1) {
                              newFavourites.splice(index, 1);
                            } else {
                              newFavourites.push(tokenId);
                            }
                            setFavourites(newFavourites);
                            localStorage.setItem('favouriteTokens', JSON.stringify(newFavourites));
                          }}
                          className="shrink-0 cursor-pointer"
                          aria-label="Toggle favourite"
                        >
                          <Image
                            src={favourites.includes(`${token.token.chainId}-${token.token.address.toLowerCase()}`)
                              ? "/assets/icons/wallet/star18.svg"
                              : "/assets/icons/home/star.svg"
                            }
                            alt="star"
                            width={16}
                            height={16}
                            className="w-4 h-4 lg:w-4 lg:h-4 xl:w-4.5 xl:h-4.5 shrink-0"
                          />
                        </button>
                        {/* Display single token */}
                        <TokenImage
                          src={token.icon}
                          alt={token.symbol}
                          width={26}
                          height={26}
                          symbol={token.symbol}
                          className="lg:w-7 lg:h-7 xl:w-9 xl:h-9 2xl:w-10 2xl:h-10 shrink-0"
                        />
                        <span className="whitespace-nowrap">{token.symbol}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-3 lg:px-4 xl:px-5 2xl:px-6 py-2.5 lg:py-3 xl:py-4 text-right text-white text-[10px] lg:text-xs xl:text-base font-medium">
                      {token.price}
                    </TableCell>
                    <TableCell
                      className={`px-3 lg:px-4 xl:px-5 2xl:px-6 py-2.5 lg:py-3 xl:py-4 text-right text-[10px] lg:text-xs xl:text-base font-medium ${token.changePositive ? "text-[#3fea9b]" : "text-[#ff5c5c]"
                        }`}
                    >
                      {token.change}
                    </TableCell>
                    <TableCell className="px-3 lg:px-4 xl:px-5 2xl:px-6 py-2.5 lg:py-3 xl:py-4 text-right text-white text-[10px] lg:text-xs xl:text-base font-medium">
                      {token.vol}
                    </TableCell>
                    <TableCell className="px-3 lg:px-4 xl:px-5 2xl:px-6 py-2.5 lg:py-3 xl:py-4 text-right text-white text-[10px] lg:text-xs xl:text-base font-medium">
                      {token.marketCapRank}
                    </TableCell>
                    <TableCell className="px-3 lg:px-4 xl:px-5 2xl:px-6 py-2.5 lg:py-3 xl:py-4 text-right text-white text-[10px] lg:text-xs xl:text-base font-medium">
                      {token.circulatingSupply}
                    </TableCell>
                    <TableCell className="px-3 lg:px-4 xl:px-5 2xl:px-6 py-2.5 lg:py-3 xl:py-4 text-center">
                      <div className="flex justify-center items-center">
                        <button
                          onClick={(e) => handleTradeClick(token, e)}
                          className="bg-[#081F02] rounded-full flex items-center justify-center cursor-pointer transition-all duration-150 group-hover:opacity-100 px-3 lg:px-4 xl:px-5 py-1.5 lg:py-2 gap-2 hover:opacity-95"
                        >
                          <Image
                            src="/assets/icons/home/trade.svg"
                            alt="trade"
                            width={24}
                            height={24}
                            className="w-3 h-3 lg:w-3.5 lg:h-3.5"
                          />
                          <span className="hidden group-hover:inline text-[#b1f128] text-[12.5px] lg:text-[13px] xl:text-[14px] font-semibold leading-none whitespace-nowrap">
                            Trade
                          </span>
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination Controls */}
      {!isLoading && hasAnyTokens && (
        <div className="flex items-center justify-center gap-2 lg:gap-2 xl:gap-2.5 2xl:gap-2.5 px-3 lg:px-4 xl:px-5 2xl:px-6 py-2 lg:py-2.5 xl:py-2.5 2xl:py-3 bg-[#010501]">
          <button
            onClick={() => changePage(currentPage - 1)}
            disabled={currentPage === 1}
            className="bg-[#0b0f0a] border border-[#1f261e] flex items-center justify-center p-1.5 lg:p-1.5 xl:p-2 2xl:p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-opacity hover:opacity-80"
            aria-label="Previous page"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-4 lg:w-4 xl:w-5 2xl:w-6 h-4 lg:h-4 xl:h-5 2xl:h-6">
              <path d="M15 18L9 12L15 6" stroke="#b5b5b5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Page Numbers */}
          <div className="flex items-center gap-1.5 lg:gap-2 xl:gap-2.5 2xl:gap-2.5">
            {visiblePages.map((page, index) => {
              // Show ellipsis before this page if there's a gap
              const showEllipsisBefore = index > 0 && page - visiblePages[index - 1] > 1;

              return (
                <Fragment key={page}>
                  {showEllipsisBefore && (
                    <span className="text-xs lg:text-sm xl:text-base 2xl:text-base font-medium text-[#b5b5b5] px-0.5 lg:px-0.5 xl:px-1 2xl:px-1">
                      ...
                    </span>
                  )}
                  <button
                    onClick={() => changePage(page)}
                    className={`flex items-center justify-center p-1.5 lg:p-1.5 xl:p-2 2xl:p-2 rounded-lg text-xs lg:text-sm xl:text-base 2xl:text-base transition-colors min-w-[20px] lg:min-w-[22px] xl:min-w-[24px] 2xl:min-w-[24px] h-[20px] lg:h-[22px] xl:h-[24px] 2xl:h-[24px] ${currentPage === page
                        ? "bg-[#b1f128] text-[#010501] font-semibold"
                        : "bg-[#0b0f0a] border border-[#1f261e] text-[#b5b5b5] font-medium hover:bg-[#081f02]"
                      }`}
                  >
                    {page}
                  </button>
                </Fragment>
              );
            })}
          </div>

          <button
            onClick={() => changePage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="bg-[#0b0f0a] border border-[#1f261e] flex items-center justify-center p-1.5 lg:p-1.5 xl:p-2 2xl:p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-opacity hover:opacity-80"
            aria-label="Next page"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="rotate-180 w-4 lg:w-4 xl:w-5 2xl:w-6 h-4 lg:h-4 xl:h-5 2xl:h-6">
              <path d="M15 18L9 12L15 6" stroke="#b5b5b5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

