"use client";

import { useEffect, useMemo, useRef, useState, MouseEvent } from "react";
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
import type { MarketToken } from "@/lib/backend/types/backend-tokens";
import { useLocaleStore } from "@/lib/locale/locale-store";
import { TableSkeleton } from "@/components/home/table-skeleton";
import { useTokensQuery } from "@/hooks/useTokensQuery";
import { useMarketPairsQuery } from "@/hooks/useMarketPairsQuery";
import { marketPairToToken } from "@/lib/home/token-formatter";
import { PairLogoStack } from "@/components/ui/pair-logo-stack";
import { SubscriptPairPrice } from "@/components/ui/subscript-pair-price";
import { useSwapStore } from "@/lib/frontend/store/swap-store";
import { useNetworkFilterStore } from "@/lib/frontend/store/network-store";


type TabKey = "Favourite" | "Hot" | "New" | "Gainers" | "Losers";
type SortKey = 'volume' | 'liquidity' | 'performance' | 'none';

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
  const leftTableRef = useRef<HTMLTableElement | null>(null);
  const rightTableRef = useRef<HTMLTableElement | null>(null);
  const scrollYContainerRef = useRef<HTMLDivElement | null>(null);
  const scrollXContainerRef = useRef<HTMLDivElement | null>(null);
  const leftRowRefs = useRef<(HTMLTableRowElement | null)[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;
  const router = useRouter();

  const setFromToken = useSwapStore((state) => state.setFromToken);
  const setToToken = useSwapStore((state) => state.setToToken);

  // Load favourites from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('favouriteTokens');
    if (stored) {
      try {
        setFavourites(JSON.parse(stored));
      } catch (e) {
        console.error('[MarketTable] Error parsing favourites:', e);
      }
    }
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
  const { selectedNetworkSlug } = useNetworkFilterStore();

  // Reset to page 1 when network or category changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedNetworkSlug, activeCategory]);

  // Category-based market pairs (Hot/New/Gainers/Losers) - fetched via TanStack Query
  const {
    data: marketPairsResponse,
    isLoading: isCategoryLoading,
    error: categoryError,
  } = useMarketPairsQuery({
    params: activeCategory
      ? {
        category: activeCategory,
        limit: rowsPerPage,
        page: currentPage,
        network: selectedNetworkSlug || undefined
      }
      : {
        category: 'hot',
        limit: rowsPerPage,
        page: currentPage,
        network: selectedNetworkSlug || undefined
      },
    enabled: !!activeCategory,
  });


  const marketPairs = marketPairsResponse?.pairs ?? [];

  // Transform market pairs to tokens (using baseToken from each pair)
  const categoryTokens: Token[] = useMemo(() => {
    if (!activeCategory || marketPairs.length === 0) return [];
    return marketPairs.map(marketPairToToken);
  }, [marketPairs, activeCategory]);

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
  }, [activeTab]);

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

    // Sorting (volume, liquidity, performance)
    if (sortBy !== "none") {
      formatted = [...formatted].sort((a, b) => {
        switch (sortBy) {
          case "volume":
            return (b.token.volume24h || 0) - (a.token.volume24h || 0);
          case "liquidity":
            return (b.token.liquidity || 0) - (a.token.liquidity || 0);
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
  }, [rawTokens, searchQuery, sortBy]);

  // Since backend is paginated, current page is driven by state + API.
  const hasAnyTokens = homepageTokens.length > 0;

  // Map backend MarketToken to frontend swap Token
  const marketTokenToSwapToken = (token: MarketToken, chainLogo?: string | null): Token => {
    const chainId = token.chainId;
    const address = token.address || "";

    return {
      id: `${chainId}-${address.toLowerCase()}`,
      name: token.name || token.symbol || "",
      symbol: token.symbol || token.name || "",
      address,
      logo: token.logoURI || "",
      logoURI: token.logoURI || undefined,
      chain: token.chainName || "",
      chainId,
      chainLogo: chainLogo || undefined,
      chainBadge: token.chainBadge,
      decimals: token.decimals ?? 18,
      price: token.priceUSD,
    };
  };

  const handleTradeClick = (rowToken: HomepageToken, event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();

    const pairToken = rowToken.token;
    const base = pairToken.baseToken as MarketToken | undefined;
    const quote = pairToken.quoteToken as MarketToken | undefined;

    if (!base || !quote) {
      console.warn("[MarketTable] Trade click ignored: missing baseToken or quoteToken on pair token", pairToken);
      return;
    }

    try {
      const fromSwapToken = marketTokenToSwapToken(base, pairToken.chainLogo);
      const toSwapToken = marketTokenToSwapToken(quote, pairToken.chainLogo);

      setFromToken(fromSwapToken);
      setToToken(toSwapToken);

      router.push("/swap");
    } catch (error) {
      console.error("[MarketTable] Failed to prepare swap tokens from market pair:", error);
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

  // Measure left table row heights and apply to right table rows
  const syncRowHeights = () => {
    const leftRows = leftRowRefs.current.filter(Boolean) as HTMLTableRowElement[];
    const rightTable = rightTableRef.current;
    const leftTable = leftTableRef.current;
    if (!leftRows.length || !rightTable || !leftTable) return;

    // Sync header heights
    const leftHeader = leftTable.querySelector("thead tr") as HTMLTableRowElement;
    const rightHeader = rightTable.querySelector("thead tr") as HTMLTableRowElement;
    if (leftHeader && rightHeader) {
      const headerHeight = leftHeader.getBoundingClientRect().height;
      rightHeader.style.height = `${headerHeight}px`;
    }

    // Sync body row heights
    const rightRows = Array.from(
      rightTable.querySelectorAll("tbody tr[data-row-index]")
    ) as HTMLTableRowElement[];

    for (let i = 0; i < leftRows.length; i++) {
      const leftRow = leftRows[i];
      const rightRow = rightRows[i];
      if (leftRow && rightRow) {
        const height = leftRow.getBoundingClientRect().height;
        rightRow.style.height = `${height}px`;
      }
    }
  };

  // Note: Both tables are in the same vertical scroll container, so they scroll together naturally
  // No need for manual scroll synchronization

  // Measure row heights on mount and when data changes
  useEffect(() => {
    if (isLoading || homepageTokens.length === 0) return;

    // Initial sync after render
    const timeoutId = setTimeout(() => {
      syncRowHeights();
    }, 0);

    // Use ResizeObserver to handle dynamic height changes
    const ro = new ResizeObserver(() => {
      syncRowHeights();
    });

    // Observe all left table rows
    leftRowRefs.current.forEach((row) => {
      if (row) ro.observe(row);
    });

    // Also observe the left table header for header height sync
    const leftHeader = leftTableRef.current?.querySelector("thead");
    if (leftHeader) ro.observe(leftHeader);

    // Handle window resize
    const handleResize = () => {
      syncRowHeights();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      clearTimeout(timeoutId);
      leftRowRefs.current.forEach((row) => {
        if (row) ro.unobserve(row);
      });
      if (leftHeader) ro.unobserve(leftHeader);
      ro.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, [homepageTokens.length, isLoading]);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden relative">
      {/* Vertical scroll container - both tables scroll together */}
      <div
        ref={scrollYContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden market-table-scrollbar min-h-0"
      >
        {/* Horizontal scroll container - wraps table content, scrollbar appears at bottom when scrolling */}
        <div
          ref={scrollXContainerRef}
          className="overflow-x-auto market-table-scrollbar"
        >
          <div className="flex relative min-w-[52.875rem] lg:min-w-[58rem] xl:min-w-[65.125rem] 2xl:min-w-[70.25rem]">
            {/* LEFT TABLE: All columns except Buy/Sell */}
            <div className="flex-1">
              <div className="w-full">
                <Table ref={leftTableRef} className="table-fixed w-full">
                  <TableHeader className="sticky top-0 z-20 bg-[#010501]">
                    <TableRow className="border-b border-[#1f261e]/80 hover:bg-transparent">
                      <TableHead className="z-20 w-[10rem] lg:w-[11.5rem] xl:w-[13rem] 2xl:w-[14.5rem] px-3 lg:px-4 xl:px-5 2xl:px-6 py-1.5 lg:py-2 text-left text-[10px] lg:text-xs xl:text-sm text-[#7c7c7c] font-semibold bg-[#010501]">
                        Token
                      </TableHead>
                      <TableHead className="z-20 w-[5rem] lg:w-[5.5rem] xl:w-[6.5625rem] 2xl:w-[6.875rem] px-3 lg:px-4 xl:px-5 2xl:px-6 py-1.5 lg:py-2 text-right text-[10px] lg:text-xs xl:text-sm text-[#7c7c7c] font-semibold bg-[#010501]">
                        Price
                      </TableHead>
                      <TableHead
                        className="z-20 w-[5rem] lg:w-[5.5rem] xl:w-[6.5625rem] 2xl:w-[6.875rem] px-3 lg:px-4 xl:px-5 2xl:px-6 py-1.5 lg:py-2 text-right text-[10px] lg:text-xs xl:text-sm text-[#7c7c7c] font-semibold bg-[#010501] cursor-pointer hover:text-[#b1f128] transition-colors"
                        onClick={() => onSortChange?.(sortBy === 'performance' ? 'none' : 'performance')}
                      >
                        24h Change {sortBy === 'performance' ? '▼' : ''}
                      </TableHead>
                      <TableHead
                        className="z-20 w-[5.5rem] lg:w-[6rem] xl:w-[6.875rem] 2xl:w-[7.5rem] px-3 lg:px-4 xl:px-5 2xl:px-6 py-1.5 lg:py-2 text-right text-[10px] lg:text-xs xl:text-sm text-[#7c7c7c] font-semibold bg-[#010501] cursor-pointer hover:text-[#b1f128] transition-colors"
                        onClick={() => onSortChange?.(sortBy === 'volume' ? 'none' : 'volume')}
                      >
                        24h Vol {sortBy === 'volume' ? '▼' : ''}
                      </TableHead>
                      <TableHead
                        className="z-20 w-[5rem] lg:w-[5.5rem] xl:w-[6.5625rem] 2xl:w-[6.875rem] px-3 lg:px-4 xl:px-5 2xl:px-6 py-1.5 lg:py-2 text-right text-[10px] lg:text-xs xl:text-sm text-[#7c7c7c] font-semibold bg-[#010501] cursor-pointer hover:text-[#b1f128] transition-colors"
                        onClick={() => onSortChange?.(sortBy === 'liquidity' ? 'none' : 'liquidity')}
                      >
                        Liquidity {sortBy === 'liquidity' ? '▼' : ''}
                      </TableHead>
                      <TableHead className="z-20 w-[4.5rem] lg:w-[4.75rem] xl:w-[5.3125rem] 2xl:w-[5.625rem] px-3 lg:px-4 xl:px-5 2xl:px-6 py-1.5 lg:py-2 text-right text-[10px] lg:text-xs xl:text-sm text-[#7c7c7c] font-semibold bg-[#010501]">
                        Holders
                      </TableHead>
                      {/* Buy/Sell column intentionally NOT here - it's in the right table */}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableSkeleton rows={10} />
                    ) : homepageTokens.length === 0 && searchQuery.trim() ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-[#b5b5b5]">
                          No tokens found
                        </TableCell>
                      </TableRow>
                    ) : !isCategoryLoading && !hasAnyTokens ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-[#b5b5b5]">
                          No tokens available
                        </TableCell>
                      </TableRow>
                    ) : (
                      homepageTokens.map((token: HomepageToken, idx: number) => (
                        <TableRow
                          key={token.token.id}
                          ref={(el) => {
                            if (el) leftRowRefs.current[idx] = el;
                          }}
                          className="group border-b border-[#1f261e]/60 hover:bg-[#0b0f0a] transition-colors"
                        >
                          <TableCell className="w-[10rem] lg:w-[11.5rem] xl:w-[13rem] 2xl:w-[14.5rem] px-3 lg:px-3.5 xl:px-4 2xl:px-5 py-2.5 lg:py-3 xl:py-4 text-white text-[10px] lg:text-xs xl:text-sm font-semibold align-middle">
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
                              {/* Use PairLogoStack for market pairs, TokenImage for favourites */}
                              {token.token.baseToken && token.token.quoteToken ? (
                                <PairLogoStack
                                  baseToken={token.token.baseToken}
                                  quoteToken={token.token.quoteToken}
                                  pairName={token.token.symbol || token.token.name}
                                  chainName={token.token.chain || ''}
                                  chainLogoURI={token.token.chainLogo}
                                  className="shrink-0"
                                />
                              ) : (
                                <>
                                  <TokenImage
                                    src={token.icon}
                                    alt={token.symbol}
                                    width={26}
                                    height={26}
                                    symbol={token.symbol}
                                    className="lg:w-7 lg:h-7 xl:w-9 xl:h-9 2xl:w-10 2xl:h-10 shrink-0"
                                  />
                                  <span className="whitespace-nowrap">{token.symbol}</span>
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="w-[5rem] lg:w-[5.5rem] xl:w-[6.5625rem] 2xl:w-[6.875rem] px-3 lg:px-4 xl:px-5 2xl:px-6 py-2.5 lg:py-3 xl:py-4 text-right text-white text-[10px] lg:text-xs xl:text-base font-medium">
                            {/* Use SubscriptPairPrice for market pairs, formatted price for favourites */}
                            {token.token.baseToken && token.token.quoteToken && token.token.pairPrice ? (
                              <SubscriptPairPrice
                                price={token.token.pairPrice}
                                quoteSymbol={token.token.quoteToken.symbol || 'USD'}
                                className="text-right"
                              />
                            ) : (
                              token.price
                            )}
                          </TableCell>
                          <TableCell
                            className={`w-[5rem] lg:w-[5.5rem] xl:w-[6.5625rem] 2xl:w-[6.875rem] px-3 lg:px-4 xl:px-5 2xl:px-6 py-2.5 lg:py-3 xl:py-4 text-right text-[10px] lg:text-xs xl:text-base font-medium ${token.changePositive ? "text-[#3fea9b]" : "text-[#ff5c5c]"
                              }`}
                          >
                            {token.change}
                          </TableCell>
                          <TableCell className="w-[5.5rem] lg:w-[6rem] xl:w-[6.875rem] 2xl:w-[7.5rem] px-3 lg:px-4 xl:px-5 2xl:px-6 py-2.5 lg:py-3 xl:py-4 text-right text-white text-[10px] lg:text-xs xl:text-base font-medium">
                            {token.vol}
                          </TableCell>
                          <TableCell className="w-[5rem] lg:w-[5.5rem] xl:w-[6.5625rem] 2xl:w-[6.875rem] px-3 lg:px-4 xl:px-5 2xl:px-6 py-2.5 lg:py-3 xl:py-4 text-right text-white text-[10px] lg:text-xs xl:text-base font-medium">
                            {token.liq}
                          </TableCell>
                          <TableCell className="w-[4.5rem] lg:w-[4.75rem] xl:w-[5.3125rem] 2xl:w-[5.625rem] px-3 lg:px-4 xl:px-5 2xl:px-6 py-2.5 lg:py-3 xl:py-4 text-right text-white text-[10px] lg:text-xs xl:text-base font-medium">
                            {token.holders}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* RIGHT TABLE: Fixed Buy/Sell column */}
            <div className="shrink-0 w-[5.25rem] lg:w-[5.5rem] xl:w-[6rem] 2xl:w-[6.25rem] relative z-30 bg-[#010501] sticky right-0 shadow-[-8px_0_12px_rgba(0,0,0,0.45)]">
              <Table
                ref={rightTableRef}
                className="table-fixed w-full bg-[#010501]"
              >
                <TableHeader className="sticky top-0 z-20 bg-[#010501]">
                  <TableRow className="border-b border-[#1f261e]/80 hover:bg-transparent">
                    <TableHead className="sticky top-0 z-20 px-3 lg:px-4 xl:px-5 2xl:px-6 py-1.5 lg:py-2 text-center text-[10px] lg:text-xs xl:text-sm text-[#7c7c7c] font-semibold bg-[#010501] border-l border-[#1f261e]/40">
                      Buy/Sell
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!isLoading && homepageTokens.length > 0 && homepageTokens.map((token, idx) => (
                    <TableRow
                      key={token.token.id}
                      data-row-index={idx}
                      className="group border-b border-[#1f261e]/60 hover:bg-[#0b0f0a] transition-colors"
                    >
                      <TableCell className="text-center bg-[#010501] border-l border-[#1f261e]/40 transition-colors">
                        <div className="flex justify-center items-center">
                          <button
                            onClick={(e) => handleTradeClick(token, e)}
                            className="bg-[#081F02] rounded-full flex items-center justify-center cursor-pointer transition-all duration-150 group-hover:opacity-100 px-5 py-2 gap-2 hover:opacity-95"
                          >
                            <Image
                              src="/assets/icons/home/trade.svg"
                              alt="trade"
                              width={24}
                              height={24}
                              className="w-3 h-3"
                            />
                            <span className="hidden group-hover:inline text-[#b1f128] text-[12.5px] lg:text-[13px] xl:text-[14px] font-semibold leading-none whitespace-nowrap">
                              Trade
                            </span>
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
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
            {/* Always show page 1 */}
            <button
              onClick={() => changePage(1)}
              className={`flex items-center justify-center p-1.5 lg:p-1.5 xl:p-2 2xl:p-2 rounded-lg text-xs lg:text-sm xl:text-base 2xl:text-base transition-colors min-w-[20px] lg:min-w-[22px] xl:min-w-[24px] 2xl:min-w-[24px] h-[20px] lg:h-[22px] xl:h-[24px] 2xl:h-[24px] ${currentPage === 1
                ? "bg-[#b1f128] text-[#010501] font-semibold"
                : "bg-[#0b0f0a] border border-[#1f261e] text-[#b5b5b5] font-medium hover:bg-[#081f02]"
                }`}
            >
              1
            </button>

            {/* Show page 2 if on page 1, 2, or 3 */}
            {currentPage <= 3 && (
              <button
                onClick={() => changePage(2)}
                className={`flex items-center justify-center p-1.5 lg:p-1.5 xl:p-2 2xl:p-2 rounded-lg text-xs lg:text-sm xl:text-base 2xl:text-base transition-colors min-w-[20px] lg:min-w-[22px] xl:min-w-[24px] 2xl:min-w-[24px] h-[20px] lg:h-[22px] xl:h-[24px] 2xl:h-[24px] ${currentPage === 2
                  ? "bg-[#b1f128] text-[#010501] font-semibold"
                  : "bg-[#0b0f0a] border border-[#1f261e] text-[#b5b5b5] font-medium hover:bg-[#081f02]"
                  }`}
              >
                2
              </button>
            )}

            {/* Show page 3 if on page 1, 2, or 3 */}
            {currentPage <= 3 && (
              <button
                onClick={() => changePage(3)}
                className={`flex items-center justify-center p-1.5 lg:p-1.5 xl:p-2 2xl:p-2 rounded-lg text-xs lg:text-sm xl:text-base 2xl:text-base transition-colors min-w-[20px] lg:min-w-[22px] xl:min-w-[24px] 2xl:min-w-[24px] h-[20px] lg:h-[22px] xl:h-[24px] 2xl:h-[24px] ${currentPage === 3
                  ? "bg-[#b1f128] text-[#010501] font-semibold"
                  : "bg-[#0b0f0a] border border-[#1f261e] text-[#b5b5b5] font-medium hover:bg-[#081f02]"
                  }`}
              >
                3
              </button>
            )}

            {/* Ellipsis when far from start */}
            {currentPage > 4 && (
              <span className="text-xs lg:text-sm xl:text-base 2xl:text-base font-medium text-[#b5b5b5] px-0.5 lg:px-0.5 xl:px-1 2xl:px-1">...</span>
            )}

            {/* Middle current page */}
            {currentPage > 3 && (
              <button
                onClick={() => changePage(currentPage)}
                className="bg-[#b1f128] flex items-center justify-center p-1.5 lg:p-1.5 xl:p-2 2xl:p-2 rounded-lg text-xs lg:text-sm xl:text-base 2xl:text-base font-semibold text-[#010501] min-w-[20px] lg:min-w-[22px] xl:min-w-[24px] 2xl:min-w-[24px] h-[20px] lg:h-[22px] xl:h-[24px] 2xl:h-[24px]"
              >
                {currentPage}
              </button>
            )}

          </div>

          <button
            onClick={() => changePage(currentPage + 1)}
            // For backend-driven pagination we don't know the final page;
            // keep "Next" always enabled and rely on the user to stop when no new data appears.
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

