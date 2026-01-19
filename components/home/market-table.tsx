"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
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
  const [tokens, setTokens] = useState<HomepageToken[]>([]);
  const [favourites, setFavourites] = useState<string[]>([]);
  const leftTableRef = useRef<HTMLTableElement | null>(null);
  const rightTableRef = useRef<HTMLTableElement | null>(null);
  const scrollYContainerRef = useRef<HTMLDivElement | null>(null);
  const scrollXContainerRef = useRef<HTMLDivElement | null>(null);
  const leftRowRefs = useRef<(HTMLTableRowElement | null)[]>([]);

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

  // Category-based tokens (Hot/New/Gainers/Losers) - fetched via TanStack Query
  const {
    data: categoryTokens = [],
    isLoading: isCategoryLoading,
    error: categoryError,
  } = useTokensQuery({
    params: activeCategory
      ? { category: activeCategory, limit: 100, source: "market" }
      : undefined,
    enabled: !!activeCategory,
    staleTime: 60_000,
  });
    console.log("🚀 ~ MarketTable ~ categoryTokens:", categoryTokens)

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

  // Transform, filter, and sort tokens for homepage display
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

    // Limit to 30 rows for display
    return formatted.slice(0, 30);
  }, [rawTokens, searchQuery, sortBy]);

  // Keep existing state-driven code paths using `tokens`
  useEffect(() => {
    setTokens(homepageTokens);
  }, [homepageTokens]);

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
    if (isLoading || tokens.length === 0) return;
    
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
  }, [tokens.length, isLoading]);

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
          <div className="flex relative min-w-[46.875rem] lg:min-w-[50rem] xl:min-w-[53.125rem] 2xl:min-w-[56.25rem]">
            {/* LEFT TABLE: All columns except Buy/Sell */}
            <div className="flex-1">
              <div className="w-full">
              <Table ref={leftTableRef} className="table-fixed w-full sticky">
                <TableHeader className="z-20 bg-[#010501]">
                  <TableRow className="border-b border-[#1f261e]/80 hover:bg-transparent">
                    <TableHead className="z-20 w-[6.5rem] lg:w-[7rem] xl:w-[8.125rem] 2xl:w-[8.75rem] px-3 lg:px-4 xl:px-5 2xl:px-6 py-1.5 lg:py-2 text-left text-[10px] lg:text-xs xl:text-sm text-[#7c7c7c] font-semibold bg-[#010501]">
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
                  ) : tokens.length === 0 && searchQuery.trim() ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-[#b5b5b5]">
                        No tokens found
                      </TableCell>
                    </TableRow>
                  ) : tokens.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-[#b5b5b5]">
                        Loading tokens...
                      </TableCell>
                    </TableRow>
                  ) : (
                    tokens.map((token, idx) => (
                    <TableRow
                      key={token.symbol}
                      ref={(el) => {
                        if (el) leftRowRefs.current[idx] = el;
                      }}
                      className="group border-b border-[#1f261e]/60 hover:bg-[#0b0f0a] transition-colors"
                    >
                      <TableCell className="w-[6.5rem] lg:w-[7rem] xl:w-[8.125rem] 2xl:w-[8.75rem] px-3 lg:px-4 xl:px-5 2xl:px-6 py-2.5 lg:py-3 xl:py-4 text-white text-[10px] lg:text-xs xl:text-base font-semibold">
                        <div className="flex items-center gap-1 lg:gap-1.5 xl:gap-2.5 2xl:gap-3">
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
                            className="shrink-0"
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
                              className="w-4 h-4 lg:w-4 lg:h-4 xl:w-5 xl:h-5 shrink-0"
                            />
                          </button>
                          <TokenImage
                            src={token.icon}
                            alt={token.symbol}
                            width={20}
                            height={20}
                            symbol={token.symbol}
                            className="lg:w-6 lg:h-6 xl:w-8 xl:h-8 shrink-0"
                          />
                          <span className="truncate">{token.symbol}</span>
                        </div>
                      </TableCell>
                      <TableCell className="w-[5rem] lg:w-[5.5rem] xl:w-[6.5625rem] 2xl:w-[6.875rem] px-3 lg:px-4 xl:px-5 2xl:px-6 py-2.5 lg:py-3 xl:py-4 text-right text-white text-[10px] lg:text-xs xl:text-base font-medium">
                        {token.price}
                      </TableCell>
                      <TableCell
                        className={`w-[5rem] lg:w-[5.5rem] xl:w-[6.5625rem] 2xl:w-[6.875rem] px-3 lg:px-4 xl:px-5 2xl:px-6 py-2.5 lg:py-3 xl:py-4 text-right text-[10px] lg:text-xs xl:text-base font-medium ${
                          token.changePositive ? "text-[#3fea9b]" : "text-[#ff5c5c]"
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
          <div className="flex-shrink-0 w-[4.5rem] lg:w-[4.75rem] xl:w-[5.3125rem] 2xl:w-[5.625rem] relative z-30 bg-[#010501]">
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
                {!isLoading && tokens.length > 0 && tokens.map((token, idx) => (
                  <TableRow
                    key={token.symbol}
                    data-row-index={idx}
                    className="group border-b border-[#1f261e]/60 hover:bg-[#0b0f0a] transition-colors"
                  >
                    <TableCell className="text-center bg-[#010501] border-l border-[#1f261e]/40 transition-colors">
                      <div className="flex justify-center items-center">
                        <button
                          className=" rounded-full flex items-center justify-center p-0 cursor-pointer bg-transparent"
                        >
                          <Image
                            src="/assets/icons/home/trade.svg"
                            alt="trade"
                            width={24}
                            height={24}
                            className="w-8 lg:w-10 xl:w-[96px] 2xl:w-14 opacity-90"
                          />
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
    </div>
  );
}

