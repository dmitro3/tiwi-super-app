"use client";

import { useEffect, useRef, useState } from "react";
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
import type { MarketToken } from "@/lib/market/mock-data";

interface MarketTableProps {
  tokens: MarketToken[];
  isLoading?: boolean;
  marketType?: "spot" | "perp";
}

export default function MarketTable({ 
  tokens, 
  isLoading = false,
  marketType = "spot"
}: MarketTableProps) {
  const leftTableRef = useRef<HTMLTableElement | null>(null);
  const rightTableRef = useRef<HTMLTableElement | null>(null);
  const scrollYContainerRef = useRef<HTMLDivElement | null>(null);
  const leftRowRefs = useRef<(HTMLTableRowElement | null)[]>([]);
  const tokenColumnRef = useRef<HTMLDivElement | null>(null);

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

  // Measure row heights on mount and when data changes
  useEffect(() => {
    if (isLoading) return;
    
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

  // Pagination - show 20 rows at a time
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;
  const totalPages = Math.ceil(tokens.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const displayedTokens = tokens.slice(startIndex, endIndex);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden relative">
      {/* Shared vertical scroll container - all tables scroll together */}
      <div
        ref={scrollYContainerRef}
        className="flex-1 overflow-y-auto market-table-scrollbar min-h-0"
      >
        <div className="flex relative">
          {/* LEFT TABLE: Fixed Token Column */}
          <div className="flex-shrink-0 w-[6.5rem] lg:w-[7rem] xl:w-[8.125rem] 2xl:w-[8.75rem] relative z-30 bg-[#010501]">
            <Table ref={leftTableRef} className="table-fixed w-full bg-[#010501]">
              <TableHeader className="sticky top-0 z-20 bg-[#010501]">
                <TableRow className="border-b border-[#1f261e]/80 hover:bg-transparent">
                  <TableHead className="sticky top-0 z-20 px-3 lg:px-4 xl:px-5 2xl:px-6 py-1.5 lg:py-2 text-left text-[10px] lg:text-xs xl:text-sm text-[#7c7c7c] font-semibold bg-[#010501]">
                    Token
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, idx) => (
                    <tr key={`skeleton-token-${idx}`} className="border-b border-[#1f261e]/60">
                      <td className="px-3 lg:px-4 xl:px-5 2xl:px-6 py-2.5 lg:py-3 xl:py-4">
                        <div className="flex items-center gap-1 lg:gap-1.5 xl:gap-2.5 2xl:gap-3">
                          <div className="size-5 lg:size-6 xl:size-8 rounded-full bg-[#121712] animate-pulse"></div>
                          <div className="h-4 lg:h-5 xl:h-6 bg-[#121712] rounded animate-pulse w-16 lg:w-20"></div>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  displayedTokens.map((token, idx) => (
                    <TableRow
                      key={token.symbol}
                      ref={(el) => {
                        if (el) leftRowRefs.current[startIndex + idx] = el;
                      }}
                      className="group border-b border-[#1f261e]/60 hover:bg-[#0b0f0a] transition-colors"
                    >
                      <TableCell className="px-3 lg:px-4 xl:px-5 2xl:px-6 py-2.5 lg:py-3 xl:py-4 text-white text-[10px] lg:text-xs xl:text-base font-semibold">
                        <div className="flex items-center gap-1 lg:gap-1.5 xl:gap-2.5 2xl:gap-3">
                          <Image
                            src="/assets/icons/home/star.svg"
                            alt="star"
                            width={12}
                            height={12}
                            className="lg:w-4 lg:h-4 xl:w-5 xl:h-5 shrink-0"
                          />
                          <Image
                            src={token.icon}
                            alt={token.symbol}
                            width={20}
                            height={20}
                            className="lg:w-6 lg:h-6 xl:w-8 xl:h-8 shrink-0"
                          />
                          <span className="truncate">{token.symbol}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* MIDDLE TABLE: Scrollable columns */}
          <div className="flex-1 overflow-x-auto market-table-scrollbar min-w-0">
            <div className="min-w-[40rem] lg:min-w-[42rem] xl:min-w-[45rem] 2xl:min-w-[48rem]">
              <Table className="table-fixed w-full">
                <TableHeader className="sticky top-0 z-20 bg-[#010501]">
                  <TableRow className="border-b border-[#1f261e]/80 hover:bg-transparent">
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
                    {marketType === "perp" && (
                      <>
                        <TableHead className="z-20 w-[5rem] lg:w-[5.5rem] xl:w-[6.5625rem] 2xl:w-[6.875rem] px-3 lg:px-4 xl:px-5 2xl:px-6 py-1.5 lg:py-2 text-right text-[10px] lg:text-xs xl:text-sm text-[#7c7c7c] font-semibold bg-[#010501]">
                          Funding Rate
                        </TableHead>
                        <TableHead className="z-20 w-[5.5rem] lg:w-[6rem] xl:w-[6.875rem] 2xl:w-[7.5rem] px-3 lg:px-4 xl:px-5 2xl:px-6 py-1.5 lg:py-2 text-right text-[10px] lg:text-xs xl:text-sm text-[#7c7c7c] font-semibold bg-[#010501]">
                          Open Interest
                        </TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 10 }).map((_, idx) => (
                        <MarketTableRowSkeleton key={`skeleton-middle-${idx}`} includePerpColumns={marketType === "perp"} />
                      ))
                    ) : (
                    displayedTokens.map((token, idx) => (
                      <TableRow
                        key={token.symbol}
                        className="group border-b border-[#1f261e]/60 hover:bg-[#0b0f0a] transition-colors"
                      >
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
                        {marketType === "perp" && (
                          <>
                            <TableCell className={`w-[5rem] lg:w-[5.5rem] xl:w-[6.5625rem] 2xl:w-[6.875rem] px-3 lg:px-4 xl:px-5 2xl:px-6 py-2.5 lg:py-3 xl:py-4 text-right text-[10px] lg:text-xs xl:text-base font-medium ${
                              token.fundingRate?.startsWith('+') ? "text-[#3fea9b]" : token.fundingRate?.startsWith('-') ? "text-[#ff5c5c]" : "text-white"
                            }`}>
                              {token.fundingRate || "N/A"}
                            </TableCell>
                            <TableCell className="w-[5.5rem] lg:w-[6rem] xl:w-[6.875rem] 2xl:w-[7.5rem] px-3 lg:px-4 xl:px-5 2xl:px-6 py-2.5 lg:py-3 xl:py-4 text-right text-white text-[10px] lg:text-xs xl:text-base font-medium">
                              {token.openInterest || "N/A"}
                            </TableCell>
                          </>
                        )}
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
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, idx) => (
                    <tr key={`skeleton-buysell-${idx}`} className="border-b border-[#1f261e]/60">
                      <td className="text-center bg-[#010501] border-l border-[#1f261e]/40 px-3 lg:px-4 xl:px-5 2xl:px-6 py-2.5 lg:py-3 xl:py-4">
                        <div className="size-6 lg:size-8 xl:size-10 bg-[#121712] rounded-full animate-pulse mx-auto"></div>
                      </td>
                    </tr>
                  ))
                ) : (
                  displayedTokens.map((token, idx) => (
                    <TableRow
                      key={token.symbol}
                      data-row-index={startIndex + idx}
                      className="group border-b border-[#1f261e]/60 hover:bg-[#0b0f0a] transition-colors"
                    >
                      <TableCell className="text-center bg-[#010501] border-l border-[#1f261e]/40 transition-colors px-3 lg:px-4 xl:px-5 2xl:px-6 py-2.5 lg:py-3 xl:py-4">
                        <div className="flex justify-center items-center">
                          <button
                            className="rounded-full flex items-center justify-center p-0 cursor-pointer bg-transparent hover:opacity-80 transition-opacity"
                            aria-label={`Trade ${token.symbol}`}
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

      {/* Pagination Controls */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 px-4 py-3 border-t border-[#1f261e] bg-[#010501]">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-[#b5b5b5] bg-[#0b0f0a] hover:bg-[#081f02] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-[#7c7c7c] px-4">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-[#b5b5b5] bg-[#0b0f0a] hover:bg-[#081f02] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

