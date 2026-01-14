"use client";

import { useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import { useTokensQuery } from "@/hooks/useTokensQuery";
import { useFavorites } from "@/hooks/useFavorites";
import { formatPrice } from "@/lib/shared/utils/formatting";
import { filterAndSortTokensByTab } from "@/lib/shared/utils/tokens";
import TokenIcon from "@/components/ui/token-icon";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import Skeleton from "@/components/ui/skeleton";

type TabKey = "Favourite" | "Hot" | "New" | "Gainers" | "Losers";

interface MarketTableProps {
  activeTab?: TabKey;
}

export function MarketTable({ activeTab = "Hot" }: MarketTableProps) {
  const leftTableRef = useRef<HTMLTableElement | null>(null);
  const rightTableRef = useRef<HTMLTableElement | null>(null);
  const scrollYContainerRef = useRef<HTMLDivElement | null>(null);
  const leftRowRefs = useRef<(HTMLTableRowElement | null)[]>([]);

  // Fetch real token data from DexScreener for market data - fetch more tokens to have enough for filtering
  const { data: allTokens = [], isLoading } = useTokensQuery({
    params: { limit: 100, source: 'market' as const }, // Use DexScreener market data
  });

  // Get favorites
  const { favoriteIds, toggleFavorite, isFavorited } = useFavorites();

  // Filter and sort tokens based on active tab
  const tokens = useMemo(() => {
    return filterAndSortTokensByTab(allTokens, activeTab, favoriteIds);
  }, [allTokens, activeTab, favoriteIds]);

  // Format volume helper - volume24h is in USD
  const formatVolume = (vol: number | undefined): string => {
    if (!vol || vol === 0 || isNaN(vol)) return "$0.00M";
    if (vol >= 1_000_000_000) {
      return `$${(vol / 1_000_000_000).toFixed(2)}B`;
    } else if (vol >= 1_000_000) {
      return `$${(vol / 1_000_000).toFixed(2)}M`;
    } else if (vol >= 1_000) {
      return `$${(vol / 1_000).toFixed(2)}K`;
    } else {
      return `$${vol.toFixed(2)}`;
    }
  };

  // Format liquidity helper
  const formatLiquidity = (liq: number | undefined): string => {
    if (!liq || liq === 0 || isNaN(liq)) return "$0.00M";
    if (liq >= 1_000_000_000) {
      return `$${(liq / 1_000_000_000).toFixed(2)}B`;
    } else if (liq >= 1_000_000) {
      return `$${(liq / 1_000_000).toFixed(2)}M`;
    } else if (liq >= 1_000) {
      return `$${(liq / 1_000).toFixed(2)}K`;
    } else {
      return `$${liq.toFixed(2)}`;
    }
  };

  // Format holders helper
  const formatHolders = (holders: number | undefined): string => {
    if (!holders || holders === 0 || isNaN(holders)) return "0";
    if (holders >= 1_000_000) {
      return `${(holders / 1_000_000).toFixed(1)}M`;
    } else if (holders >= 1_000) {
      return `${(holders / 1_000).toFixed(1)}K`;
    } else {
      return holders.toString();
    }
  };

  // Format price change helper
  const formatChange = (change: number | undefined): { text: string; positive: boolean } => {
    if (change === undefined || change === null || isNaN(change)) {
      return { text: "0.00%", positive: true };
    }
    const sign = change >= 0 ? "+" : "";
    return {
      text: `${sign}${change.toFixed(2)}%`,
      positive: change >= 0,
    };
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
  }, [tokens.length]);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden relative">
      {/* Shared vertical scroll container - both tables scroll together */}
      <div
        ref={scrollYContainerRef}
        className="flex-1 overflow-y-auto market-table-scrollbar min-h-0"
      >
        <div className="flex relative">
          {/* LEFT TABLE: All columns except Buy/Sell, inside horizontal scroll */}
          <div className="flex-1 overflow-x-auto market-table-scrollbar">
            <div className="min-w-[46.875rem] lg:min-w-[50rem] xl:min-w-[53.125rem] 2xl:min-w-[56.25rem]">
              <Table ref={leftTableRef} className="table-fixed w-full sticky">
                <TableHeader className="z-20 bg-[#010501]">
                  <TableRow className="border-b border-[#1f261e]/80 hover:bg-transparent">
                    <TableHead className="z-20 w-[6.5rem] lg:w-[7rem] xl:w-[8.125rem] 2xl:w-[8.75rem] px-3 lg:px-4 xl:px-5 2xl:px-6 py-1.5 lg:py-2 text-left text-[10px] lg:text-xs xl:text-sm text-[#7c7c7c] font-semibold bg-[#010501]">
                      Token
                    </TableHead>
                    <TableHead className="z-20 w-[5rem] lg:w-[5.5rem] xl:w-[6.5625rem] 2xl:w-[6.875rem] px-3 lg:px-4 xl:px-5 2xl:px-6 py-1.5 lg:py-2 text-right text-[10px] lg:text-xs xl:text-sm text-[#7c7c7c] font-semibold bg-[#010501]">
                      Price
                    </TableHead>
                    <TableHead className="z-20 w-[5rem] lg:w-[5.5rem] xl:w-[6.5625rem] 2xl:w-[6.875rem] px-3 lg:px-4 xl:px-5 2xl:px-6 py-1.5 lg:py-2 text-right text-[10px] lg:text-xs xl:text-sm text-[#7c7c7c] font-semibold bg-[#010501]">
                      24h Change
                    </TableHead>
                    <TableHead className="z-20 w-[5.5rem] lg:w-[6rem] xl:w-[6.875rem] 2xl:w-[7.5rem] px-3 lg:px-4 xl:px-5 2xl:px-6 py-1.5 lg:py-2 text-right text-[10px] lg:text-xs xl:text-sm text-[#7c7c7c] font-semibold bg-[#010501]">
                      24h Vol
                    </TableHead>
                    <TableHead className="z-20 w-[5rem] lg:w-[5.5rem] xl:w-[6.5625rem] 2xl:w-[6.875rem] px-3 lg:px-4 xl:px-5 2xl:px-6 py-1.5 lg:py-2 text-right text-[10px] lg:text-xs xl:text-sm text-[#7c7c7c] font-semibold bg-[#010501]">
                      Liquidity
                    </TableHead>
                    <TableHead className="z-20 w-[4.5rem] lg:w-[4.75rem] xl:w-[5.3125rem] 2xl:w-[5.625rem] px-3 lg:px-4 xl:px-5 2xl:px-6 py-1.5 lg:py-2 text-right text-[10px] lg:text-xs xl:text-sm text-[#7c7c7c] font-semibold bg-[#010501]">
                      Holders
                    </TableHead>
                    {/* Buy/Sell column intentionally NOT here - it's in the right table */}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    // Loading skeleton rows
                    Array.from({ length: 10 }).map((_, idx) => (
                      <TableRow
                        key={`skeleton-${idx}`}
                        className="group border-b border-[#1f261e]/60"
                      >
                        <TableCell className="w-[6.5rem] lg:w-[7rem] xl:w-[8.125rem] 2xl:w-[8.75rem] px-3 lg:px-4 xl:px-5 2xl:px-6 py-2.5 lg:py-3 xl:py-4">
                          <div className="flex items-center gap-1 lg:gap-1.5 xl:gap-2.5 2xl:gap-3">
                            <Skeleton className="lg:w-4 lg:h-4 xl:w-5 xl:h-5 w-3 h-3 rounded" />
                            <Skeleton className="lg:w-6 lg:h-6 xl:w-8 xl:h-8 w-5 h-5 rounded-full" />
                            <Skeleton className="h-4 w-12" />
                          </div>
                        </TableCell>
                        <TableCell className="w-[5rem] lg:w-[5.5rem] xl:w-[6.5625rem] 2xl:w-[6.875rem] px-3 lg:px-4 xl:px-5 2xl:px-6 py-2.5 lg:py-3 xl:py-4 text-right">
                          <Skeleton className="h-4 w-16 ml-auto" />
                        </TableCell>
                        <TableCell className="w-[5rem] lg:w-[5.5rem] xl:w-[6.5625rem] 2xl:w-[6.875rem] px-3 lg:px-4 xl:px-5 2xl:px-6 py-2.5 lg:py-3 xl:py-4 text-right">
                          <Skeleton className="h-4 w-12 ml-auto" />
                        </TableCell>
                        <TableCell className="w-[5.5rem] lg:w-[6rem] xl:w-[6.875rem] 2xl:w-[7.5rem] px-3 lg:px-4 xl:px-5 2xl:px-6 py-2.5 lg:py-3 xl:py-4 text-right">
                          <Skeleton className="h-4 w-14 ml-auto" />
                        </TableCell>
                        <TableCell className="w-[5rem] lg:w-[5.5rem] xl:w-[6.5625rem] 2xl:w-[6.875rem] px-3 lg:px-4 xl:px-5 2xl:px-6 py-2.5 lg:py-3 xl:py-4 text-right">
                          <Skeleton className="h-4 w-14 ml-auto" />
                        </TableCell>
                        <TableCell className="w-[4.5rem] lg:w-[4.75rem] xl:w-[5.3125rem] 2xl:w-[5.625rem] px-3 lg:px-4 xl:px-5 2xl:px-6 py-2.5 lg:py-3 xl:py-4 text-right">
                          <Skeleton className="h-4 w-10 ml-auto" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : tokens.length === 0 ? (
                    // Empty state
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-[#7c7c7c]">
                        {activeTab === "Favourite" 
                          ? "No favorite tokens. Click the star icon to add tokens to favorites."
                          : "No tokens available"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    tokens.map((token, idx) => {
                      const change = formatChange(token.priceChange24h);
                      return (
                        <TableRow
                          key={token.id}
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
                                  toggleFavorite(token.id);
                                }}
                                className="shrink-0 hover:opacity-80 transition-opacity"
                                aria-label={isFavorited(token.id) ? "Remove from favorites" : "Add to favorites"}
                              >
                                <Image
                                  src="/assets/icons/home/star.svg"
                                  alt="star"
                                  width={12}
                                  height={12}
                                  className={`lg:w-4 lg:h-4 xl:w-5 xl:h-5 shrink-0 ${isFavorited(token.id) ? "opacity-100" : "opacity-40"}`}
                                />
                              </button>
                              <TokenIcon
                                logo={token.logo}
                                symbol={token.symbol}
                                address={token.address}
                                chainId={token.chainId}
                                size="lg"
                                className="lg:w-6 lg:h-6 xl:w-8 xl:h-8"
                              />
                              <span className="truncate">{token.symbol}</span>
                            </div>
                          </TableCell>
                          <TableCell className="w-[5rem] lg:w-[5.5rem] xl:w-[6.5625rem] 2xl:w-[6.875rem] px-3 lg:px-4 xl:px-5 2xl:px-6 py-2.5 lg:py-3 xl:py-4 text-right text-white text-[10px] lg:text-xs xl:text-base font-medium">
                            {formatPrice(token.price)}
                          </TableCell>
                          <TableCell
                            className={`w-[5rem] lg:w-[5.5rem] xl:w-[6.5625rem] 2xl:w-[6.875rem] px-3 lg:px-4 xl:px-5 2xl:px-6 py-2.5 lg:py-3 xl:py-4 text-right text-[10px] lg:text-xs xl:text-base font-medium ${
                              change.positive ? "text-[#3fea9b]" : "text-[#ff5c5c]"
                            }`}
                          >
                            {change.text}
                          </TableCell>
                          <TableCell className="w-[5.5rem] lg:w-[6rem] xl:w-[6.875rem] 2xl:w-[7.5rem] px-3 lg:px-4 xl:px-5 2xl:px-6 py-2.5 lg:py-3 xl:py-4 text-right text-white text-[10px] lg:text-xs xl:text-base font-medium">
                            {formatVolume(token.volume24h)}
                          </TableCell>
                          <TableCell className="w-[5rem] lg:w-[5.5rem] xl:w-[6.5625rem] 2xl:w-[6.875rem] px-3 lg:px-4 xl:px-5 2xl:px-6 py-2.5 lg:py-3 xl:py-4 text-right text-white text-[10px] lg:text-xs xl:text-base font-medium">
                            {formatLiquidity(token.liquidity)}
                          </TableCell>
                          <TableCell className="w-[4.5rem] lg:w-[4.75rem] xl:w-[5.3125rem] 2xl:w-[5.625rem] px-3 lg:px-4 xl:px-5 2xl:px-6 py-2.5 lg:py-3 xl:py-4 text-right text-white text-[10px] lg:text-xs xl:text-base font-medium">
                            {formatHolders(token.holders)}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* RIGHT TABLE: Fixed Buy/Sell column - positioned outside horizontal scroll */}
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
                {isLoading ? (
                  // Loading skeleton rows for right table
                  Array.from({ length: 10 }).map((_, idx) => (
                    <TableRow
                      key={`skeleton-right-${idx}`}
                      data-row-index={idx}
                      className="group border-b border-[#1f261e]/60"
                    >
                      <TableCell className="text-center bg-[#010501] border-l border-[#1f261e]/40">
                        <div className="flex justify-center items-center">
                          <Skeleton className="w-8 lg:w-10 xl:w-[96px] 2xl:w-14 h-8 lg:h-10 xl:h-[96px] 2xl:h-14 rounded-full" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : tokens.length === 0 ? (
                  // Empty state for right table
                  <TableRow>
                    <TableCell className="text-center bg-[#010501] border-l border-[#1f261e]/40" />
                  </TableRow>
                ) : (
                  tokens.map((token, idx) => (
                    <TableRow
                      key={token.id}
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
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}

