"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import MarketTableRowSkeleton from "./market-table-row-skeleton";
import { marketPairToToken } from "@/lib/frontend/utils/market-utils";
import { PairLogoStack } from "@/components/ui/pair-logo-stack";
import { SubscriptPairPrice } from "@/components/ui/subscript-pair-price";
import { SubscriptUSDPrice } from "@/components/ui/subscript-usd-price";
import { formatPercentageChange, formatNumber } from "@/lib/frontend/utils/price-formatter";
import type { MarketTokenPair } from "@/lib/backend/types/backend-tokens";
import type { Token } from "@/lib/frontend/types/tokens";


interface MarketTableProps {
  tokens: Token[];
  isLoading: boolean;
  total: number;
  currentPage: number;

  onPageChange: (page: number) => void;
  sortBy: 'volume' | 'liquidity' | 'performance' | 'none';
  onSortChange: (sort: 'volume' | 'liquidity' | 'performance' | 'none') => void;
  marketType?: "spot" | "perp";
}

export default function MarketTable({
  tokens,
  isLoading,
  currentPage,
  onPageChange,
  sortBy,
  onSortChange,
  marketType = "spot"
}: MarketTableProps) {
  const router = useRouter();
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  const scrollYContainerRef = useRef<HTMLDivElement | null>(null);

  const handleRowClick = (token: Token) => {
    // If it's a pair, use the pool address or symbol
    const symbol = token.symbol;
    router.push(`/market/${symbol}-USDT`);
  };

  const changePage = (page: number) => {
    if (page < 1) return;
    onPageChange(page);
    if (scrollYContainerRef.current) {
      scrollYContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };


  return (
    <div className="w-full h-full flex flex-col overflow-hidden relative">
      {/* Vertical scroll container */}
      <div
        ref={scrollYContainerRef}
        className="flex-1 overflow-y-auto market-table-scrollbar min-h-0"
      >
        {/* Horizontal scroll container */}
        <div className="overflow-x-auto market-table-scrollbar">
          <div className="min-w-[1129px]">
            <Table className="table-auto w-full relative">
              <TableHeader className="sticky top-0 z-30 bg-[#010501]">
                <TableRow className="border-b-[0.5px] border-[#1f261e] hover:bg-transparent">
                  <TableHead className="w-[200px] px-6 py-4 text-left text-[14px] text-[#7c7c7c] font-semibold bg-[#010501]">
                    Token
                  </TableHead>
                  <TableHead className="w-[120px] px-6 py-4 text-right text-[14px] text-[#7c7c7c] font-semibold bg-[#010501]">
                    Price
                  </TableHead>
                  <TableHead
                    className="w-[120px] px-6 py-4 text-right text-[14px] text-[#7c7c7c] font-semibold bg-[#010501] cursor-pointer hover:text-white"
                    onClick={() => onSortChange(sortBy === 'performance' ? 'none' : 'performance')}
                  >
                    24h Change {sortBy === 'performance' && '↓'}
                  </TableHead>
                  <TableHead
                    className="w-[120px] px-6 py-4 text-right text-[14px] text-[#7c7c7c] font-semibold bg-[#010501] cursor-pointer hover:text-white"
                    onClick={() => onSortChange(sortBy === 'volume' ? 'none' : 'volume')}
                  >
                    24h Vol {sortBy === 'volume' && '↓'}
                  </TableHead>
                  <TableHead
                    className="w-[120px] px-6 py-4 text-right text-[14px] text-[#7c7c7c] font-semibold bg-[#010501] cursor-pointer hover:text-white"
                    onClick={() => onSortChange(sortBy === 'liquidity' ? 'none' : 'liquidity')}
                  >
                    Liquidity {sortBy === 'liquidity' && '↓'}
                  </TableHead>
                  <TableHead className="w-[120px] px-6 py-4 text-right text-[14px] text-[#7c7c7c] font-semibold bg-[#010501]">
                    Market Cap
                  </TableHead>
                  {marketType === "perp" && (
                    <>
                      <TableHead className="w-[120px] px-6 py-4 text-right text-[14px] text-[#7c7c7c] font-semibold bg-[#010501]">
                        Funding Rate
                      </TableHead>
                      <TableHead className="w-[120px] px-6 py-4 text-right text-[14px] text-[#7c7c7c] font-semibold bg-[#010501]">
                        Open Interest
                      </TableHead>
                    </>
                  )}
                  <TableHead className="w-[110px] px-6 py-4 text-center text-[14px] text-[#7c7c7c] font-semibold bg-[#010501] sticky right-0 z-40 shadow-[-8px_0_12px_rgba(0,0,0,0.45)]">
                    Buy/Sell
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 15 }).map((_, idx) => (
                    <MarketTableRowSkeleton key={`skeleton-${idx}`} includePerpColumns={marketType === "perp"} />
                  ))
                ) : (
                  tokens.map((token, idx) => {
                    const rowId = `row-${token.id}-${idx}`;
                    const isHovered = hoveredRowId === rowId;
                    const pair = token.pair;

                    return (
                      <TableRow
                        key={rowId}
                        onMouseEnter={() => setHoveredRowId(rowId)}
                        onMouseLeave={() => setHoveredRowId(null)}
                        onClick={() => handleRowClick(token)}
                        className={`border-b-[0.5px] border-[#1f261e] transition-colors cursor-pointer ${isHovered ? "bg-[#0b0f0a]" : ""
                          }`}
                      >
                        <TableCell className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <Image
                              src="/assets/icons/home/star.svg"
                              alt="star"
                              width={18}
                              height={18}
                              className="shrink-0 opacity-40 hover:opacity-100 transition-opacity"
                            />
                            {pair ? (
                              <PairLogoStack
                                baseToken={pair.baseToken}
                                quoteToken={pair.quoteToken}
                                pairName={`${pair.baseToken.symbol}/${pair.quoteToken.symbol}`}
                                chainName={pair.chainName}
                              />
                            ) : (
                              <Image src={token.logo || ''} alt={token.symbol} width={32} height={32} className="rounded-full" />
                            )}
                            <div className="flex flex-col">
                              <span className="text-white font-bold text-[16px]">{token.symbol}/{pair?.quoteToken.symbol || 'USDT'}</span>
                              <span className="text-[#7c7c7c] text-[12px]">{token.name}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-5 text-right">
                          <div className="flex flex-col items-end">
                            {pair ? (
                              <SubscriptPairPrice price={pair.pairPrice || '0'} quoteSymbol={pair.quoteToken.symbol} className="text-white font-semibold text-[16px]" />
                            ) : (
                              <SubscriptUSDPrice price={token.price || '0'} className="text-white font-semibold text-[16px]" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className={`px-6 py-5 text-right font-medium text-[16px] ${(token.priceChange24h || 0) >= 0 ? "text-[#3fea9b]" : "text-[#ff5c5c]"
                          }`}>
                          {formatPercentageChange(token.priceChange24h).formatted}
                        </TableCell>
                        <TableCell className="px-6 py-5 text-right text-white font-medium text-[16px]">
                          ${formatNumber(token.volume24h)}
                        </TableCell>
                        <TableCell className="px-6 py-5 text-right text-white font-medium text-[16px]">
                          ${formatNumber(token.liquidity)}
                        </TableCell>
                        <TableCell className="px-6 py-5 text-right text-white font-medium text-[16px]">
                          ${formatNumber(token.marketCap)}
                        </TableCell>

                        {marketType === "perp" && (
                          <>
                            <TableCell className="px-6 py-5 text-right text-white font-medium text-[16px]">0.01%</TableCell>
                            <TableCell className="px-6 py-5 text-right text-white font-medium text-[16px]">$1.2M</TableCell>
                          </>
                        )}

                        <TableCell className="px-6 py-5 text-center sticky right-0 bg-[#010501] z-30 shadow-[-8px_0_12px_rgba(0,0,0,0.45)]">
                          <button
                            className={`bg-[#081F02] mx-auto flex items-center justify-center rounded-full cursor-pointer transition-all duration-150 w-[46px] h-[36px] hover:opacity-95 ${isHovered ? "w-[90px] gap-2" : ""
                              }`}
                          >
                            <Image src="/assets/icons/home/trade.svg" alt="trade" width={22} height={22} />
                            {isHovered && <span className="text-[#b1f128] text-[14px] font-semibold">Trade</span>}
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Pagination Controls */}
      {!isLoading && (
        <div className="flex items-center justify-center gap-4 py-6 bg-[#010501] border-t border-[#1f261e]">
          <button
            onClick={() => changePage(currentPage - 1)}
            disabled={currentPage === 1}
            className="bg-[#0b0f0a] border border-[#1f261e] p-2 rounded-lg disabled:opacity-30 hover:bg-[#1a1f19] transition-colors"
          >
            <Image src="/assets/icons/home/arrow-down-01.svg" alt="prev" width={20} height={20} className="rotate-90 opacity-60" />
          </button>

          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((p) => (
              <button
                key={p}
                onClick={() => changePage(p)}
                className={`w-9 h-9 rounded-lg flex items-center justify-center text-[15px] font-medium transition-colors ${currentPage === p
                  ? 'bg-[#b1f128] text-black font-bold'
                  : 'text-[#7c7c7c] hover:text-white hover:bg-[#0b0f0a]'
                  }`}
              >
                {p}
              </button>
            ))}
            <span className="text-[#3a3a3a]">...</span>
          </div>

          <button
            onClick={() => changePage(currentPage + 1)}
            className="bg-[#0b0f0a] border border-[#1f261e] p-2 rounded-lg hover:bg-[#1a1f19] transition-colors"
          >
            <Image src="/assets/icons/home/arrow-down-01.svg" alt="next" width={20} height={20} className="-rotate-90 opacity-60" />
          </button>
        </div>
      )}
    </div>
  );
}
