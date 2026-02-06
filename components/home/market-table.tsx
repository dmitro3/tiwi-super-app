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
import { useBinanceTickersQuery } from "@/hooks/useBinanceTickersQuery";
import { fetchBinanceTickers } from "@/lib/frontend/api/binance-tickers";
import { useSwapStore } from "@/lib/frontend/store/swap-store";
import { SubscriptUSDPrice } from "@/components/ui/subscript-usd-price";


type TabKey = "Favourite" | "Hot" | "New" | "Gainers" | "Losers";
type SortKey = 'volume' | 'rank' | 'performance' | 'none';

interface MarketTableProps {
  tokens: Token[];
  isLoading: boolean;
  total: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  searchQuery?: string;
  sortBy?: SortKey;
  onSortChange?: (sort: SortKey) => void;
  activeTab?: TabKey;
}

export function MarketTable({
  tokens: inputTokens,
  isLoading,
  total,
  currentPage,
  onPageChange,
  searchQuery = "",
  sortBy = 'none',
  onSortChange,
  activeTab
}: MarketTableProps) {
  useLocaleStore((s) => `${s.language}|${s.currency}`); // re-render when locale changes
  const [favourites, setFavourites] = useState<string[]>([]);
  const [hoveredRowIndex, setHoveredRowIndex] = useState<number | null>(null);
  const tableRef = useRef<HTMLTableElement | null>(null);
  const scrollYContainerRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  const setFromToken = useSwapStore((state) => state.setFromToken);
  const setToToken = useSwapStore((state) => state.setToToken);

  // Load favourites from localStorage
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

    if (!favouritesList.includes(TWC_ID)) {
      favouritesList.unshift(TWC_ID);
      localStorage.setItem('favouriteTokens', JSON.stringify(favouritesList));
    }

    setFavourites(favouritesList);
  }, []);

  // Transform input tokens to homepage format
  const homepageTokens: HomepageToken[] = useMemo(() => {
    return inputTokens.map(token => formatTokenForHomepage(token));
  }, [inputTokens]);
  console.log("🚀 ~ MarketTable ~ homepageTokens:", homepageTokens)

  const rowsPerPage = 20;
  const totalPages = Math.ceil(total / rowsPerPage);

  // Pagination logic - calculate which pages to show
  const getVisiblePages = (): number[] => {
    const pages: number[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage <= 3) {
        pages.push(2, 3, 4);
      } else if (currentPage >= totalPages - 2) {
        pages.push(totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(currentPage - 1, currentPage, currentPage + 1);
      }
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }
    return [...new Set(pages)].sort((a, b) => a - b);
  };

  const visiblePages = getVisiblePages();

  useEffect(() => {
    if (onPageChange && total > 0 && currentPage > totalPages) {
      onPageChange(1);
    }
  }, [total, activeTab, searchQuery]);

  const handleTradeClick = (rowToken: HomepageToken, event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();

    const token = rowToken.token;

    try {
      // For single tokens, set the token as "from" and use a stablecoin as "to"
      // User can change it in the swap interface
      setFromToken(token);
      // Default to USDT if available, otherwise leave toToken null for user to select
      setToToken(null);

      const url = `/market/${token.symbol}${token.address ? `?address=${token.address}&chainId=${token.chainId}` : ''}`;
      window.open(url, '_blank');
    } catch (error) {
      console.error("[MarketTable] Failed to prepare swap tokens:", error);
    }
  };

  // Helper to change page and smoothly scroll table to top
  const changePage = (page: number) => {
    const clamped = Math.max(page, 1);
    if (clamped === currentPage) return;
    onPageChange(clamped);
    if (scrollYContainerRef.current) {
      scrollYContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };


  return (
    <div className="w-full h-full flex flex-col overflow-hidden relative">
      {/* Scroll container for both vertical and horizontal overflow */}
      <div
        ref={scrollYContainerRef}
        className="flex-1 overflow-y-auto overflow-x-auto market-table-scrollbar min-h-0"
      >
        {/* Table container with min-width to ensure horizontal scroll when needed */}
        <div className="w-full min-w-max">
          <Table ref={tableRef} className="w-full table-auto min-w-[800px]">
            <TableHeader className="sticky top-0 z-20 bg-[#010501]">
              <TableRow className="border-b border-[#1f261e]/80 hover:bg-transparent">
                <TableHead className="z-20 px-3 lg:px-4 xl:px-5 2xl:px-6 py-1.5 lg:py-2 text-left text-[10px] lg:text-xs xl:text-sm text-[#7c7c7c] font-semibold bg-[#010501]">
                  Token
                </TableHead>
                <TableHead className="z-20 px-3 lg:px-4 xl:px-5 2xl:px-6 py-1.5 lg:py-2 text-right text-[10px] lg:text-xs xl:text-sm text-[#7c7c7c] font-semibold bg-[#010501]">
                  Price
                </TableHead>

                <TableHead className="z-20 px-3 lg:px-4 xl:px-5 2xl:px-6 py-1.5 lg:py-2 text-right text-[10px] lg:text-xs xl:text-sm text-[#7c7c7c] font-semibold bg-[#010501]">
                  Market Cap
                </TableHead>
                <TableHead className="z-20 px-3 lg:px-4 xl:px-5 2xl:px-6 py-1.5 lg:py-2 text-right text-[10px] lg:text-xs xl:text-sm text-[#7c7c7c] font-semibold bg-[#010501]">
                  Liquidity
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
              ) : homepageTokens.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-[#b5b5b5]">
                    No tokens available
                  </TableCell>
                </TableRow>
              ) : (
                homepageTokens.map((token: HomepageToken, idx: number) => (
                  <TableRow
                    key={`${token.token.id}-${idx}`}
                    onClick={() => {
                      const url = `/market/${token.token.symbol}${token.token.address ? `?address=${token.token.address}&chainId=${token.token.chainId}` : ''}`;
                      window.open(url, '_blank');
                    }}
                    className="group border-b border-[#1f261e]/60 hover:bg-[#0b0f0a] transition-colors cursor-pointer"
                  >
                    <TableCell className="px-3 lg:px-3.5 xl:px-4 2xl:px-5 py-2.5 lg:py-3 xl:py-4 text-white text-[10px] lg:text-xs xl:text-sm font-semibold align-middle">
                      <div className="flex items-center gap-1.5 lg:gap-2 xl:gap-2.5 2xl:gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
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
                      <SubscriptUSDPrice price={token.rawPrice} className="text-white" />
                    </TableCell>
                    <TableCell className="px-3 lg:px-4 xl:px-5 2xl:px-6 py-2.5 lg:py-3 xl:py-4 text-right text-white text-[10px] lg:text-xs xl:text-base font-medium">
                      {token.marketCap}
                    </TableCell>
                    <TableCell className="px-3 lg:px-4 xl:px-5 2xl:px-6 py-2.5 lg:py-3 xl:py-4 text-right text-white text-[10px] lg:text-xs xl:text-base font-medium">
                      {token.liquidity}
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
                    {/* <TableCell className="px-3 lg:px-4 xl:px-5 2xl:px-6 py-2.5 lg:py-3 xl:py-4 text-right text-white text-[10px] lg:text-xs xl:text-base font-medium">
                      {formatPrice((token.token as any).high24h?.toString() || (token.token as any).highPrice?.toString())}
                    </TableCell>
                    <TableCell className="px-3 lg:px-4 xl:px-5 2xl:px-6 py-2.5 lg:py-3 xl:py-4 text-right text-white text-[10px] lg:text-xs xl:text-base font-medium">
                      {formatPrice((token.token as any).low24h?.toString() || (token.token as any).lowPrice?.toString())}
                    </TableCell> */}
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
      {!isLoading && total > 0 && (
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

