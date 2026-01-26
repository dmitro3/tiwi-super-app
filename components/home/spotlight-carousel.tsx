"use client";

import Image from "next/image";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { fetchTokens } from "@/lib/frontend/api/tokens";
import type { Token } from "@/lib/frontend/types/tokens";
import { TokenIcon } from "@/components/portfolio/token-icon";
import { getTokenFallbackIcon } from "@/lib/shared/utils/portfolio-formatting";

/**
 * Spotlight carousel component
 * 
 * - Displays spotlight tokens in a carousel format
 * - Shows 3-5 items per page depending on screen size
 * - Auto-slides every 8 seconds
 * - Supports manual navigation via pagination indicators
 * - Includes slide-in animation similar to hero banner
 * - Responsive design
 */

interface SpotlightToken {
  id: string;
  symbol: string;
  name?: string;
  address?: string;
  logo?: string;
  rank: number;
  startDate: string;
  endDate: string;
}

interface SpotlightItem {
  rank: number;
  symbol: string;
  change: string;
  changePositive: boolean;
  vol: string;
  icon: string;
}

export function SpotlightCarousel() {
  const router = useRouter();
  const [activePage, setActivePage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(3);
  const [spotlightTokens, setSpotlightTokens] = useState<SpotlightToken[]>([]);
  const [allTokens, setAllTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const touchStartXRef = useRef<number | null>(null);

  // Fetch spotlight tokens and their real-time data - OPTIMIZED for speed
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch spotlight tokens from database (fast)
        const spotlightResponse = await fetch("/api/v1/token-spotlight?activeOnly=true");
        if (!spotlightResponse.ok) {
          throw new Error("Failed to fetch spotlight tokens");
        }
        
        const spotlightData = await spotlightResponse.json();
        // Filter to only active tokens (within date range) and sort by rank
        const today = new Date().toISOString().split('T')[0];
        const activeTokens = (spotlightData.tokens || [])
          .filter((token: SpotlightToken) => token.startDate <= today && token.endDate >= today)
          .sort((a: SpotlightToken, b: SpotlightToken) => a.rank - b.rank);
        
        setSpotlightTokens(activeTokens);
        
        // Show tokens immediately with database data (fast display)
        // Then enrich with real-time data in background
        setIsLoading(false);

        // Fetch real-time data in parallel batches for speed
        // Batch by address first (most accurate), then fallback to symbol
        const addressTokens = activeTokens.filter(t => t.address);
        const symbolTokens = activeTokens.filter(t => !t.address && t.symbol);
        
        // Batch fetch by addresses (parallel)
        const addressPromises = addressTokens.map(async (spotlightToken: SpotlightToken) => {
          try {
            const tokens = await fetchTokens({ address: spotlightToken.address!, limit: 10 });
            const exactMatch = tokens.find(
              t => t.address.toLowerCase() === spotlightToken.address?.toLowerCase()
            );
            return exactMatch || null;
          } catch (error) {
            console.error(`Error fetching token ${spotlightToken.symbol} by address:`, error);
            return null;
          }
        });
        
        // Batch fetch by symbols (parallel)
        const symbolPromises = symbolTokens.map(async (spotlightToken: SpotlightToken) => {
          try {
            const tokens = await fetchTokens({ query: spotlightToken.symbol!, limit: 20 });
            const symbolMatch = tokens.find(
              t => t.symbol.toUpperCase() === spotlightToken.symbol.toUpperCase()
            );
            return symbolMatch || null;
          } catch (error) {
            console.error(`Error fetching token ${spotlightToken.symbol} by symbol:`, error);
            return null;
          }
        });
        
        // Wait for all batches in parallel
        const [addressResults, symbolResults] = await Promise.allSettled([
          Promise.all(addressPromises),
          Promise.all(symbolPromises)
        ]);
        
        // Combine results
        const allResults: (Token | null)[] = [];
        if (addressResults.status === 'fulfilled') {
          allResults.push(...addressResults.value);
        }
        if (symbolResults.status === 'fulfilled') {
          allResults.push(...symbolResults.value);
        }
        
        // Store fetched tokens
        const allFetchedTokens = allResults.filter((t): t is Token => t !== null);
        setAllTokens(allFetchedTokens);
      } catch (error) {
        console.error("Error fetching spotlight data:", error);
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Match spotlight tokens with real token data
  const spotlightItems = useMemo<SpotlightItem[]>(() => {
    return spotlightTokens.map((spotlightToken) => {
      // Find matching token - try multiple strategies
      let matchedToken: Token | undefined;
      
      // Strategy 1: Match by address (most accurate)
      if (spotlightToken.address) {
        const normalizedAddress = spotlightToken.address.toLowerCase().trim();
        matchedToken = allTokens.find((t) => {
          const tokenAddress = t.address.toLowerCase().trim();
          // Direct match
          if (tokenAddress === normalizedAddress) return true;
          // Handle addresses with/without 0x prefix
          const tokenAddrNoPrefix = tokenAddress.startsWith('0x') ? tokenAddress.slice(2) : tokenAddress;
          const spotlightAddrNoPrefix = normalizedAddress.startsWith('0x') ? normalizedAddress.slice(2) : normalizedAddress;
          return tokenAddrNoPrefix === spotlightAddrNoPrefix;
        });
      }
      
      // Strategy 2: Match by symbol (case-insensitive, exact match preferred)
      if (!matchedToken && spotlightToken.symbol) {
        const normalizedSymbol = spotlightToken.symbol.toUpperCase().trim();
        matchedToken = allTokens.find(
          (t) => t.symbol.toUpperCase().trim() === normalizedSymbol
        );
      }

      // Get icon - prioritize spotlight logo from database (fastest), then matched token logo, then fallback
      const icon = spotlightToken.logo || matchedToken?.logo || matchedToken?.logoURI || getTokenFallbackIcon(spotlightToken.symbol);

      // Format volume helper - volume24h is in USD
      const formatVolume = (vol: number | undefined): string => {
        if (!vol || vol === 0 || isNaN(vol)) return "$0.00M";
        if (vol >= 1_000_000_000) {
          return `$${(vol / 1_000_000_000).toFixed(1)}B`;
        } else if (vol >= 1_000_000) {
          return `$${(vol / 1_000_000).toFixed(1)}M`;
        } else if (vol >= 1_000) {
          return `$${(vol / 1_000).toFixed(2)}K`;
        } else {
          return `$${vol.toFixed(2)}`;
        }
      };
      
      // Get volume from matched token (volume24h is in USD)
      const volume = formatVolume(matchedToken?.volume24h);

      // Get price change from matched token (priceChange24h is percentage, e.g., -12.1 means -12.1%)
      const priceChange = matchedToken?.priceChange24h;
      let change: string;
      let changePositive: boolean;
      
      if (priceChange !== undefined && priceChange !== null && !isNaN(priceChange)) {
        change = `${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)}%`;
        changePositive = priceChange >= 0;
      } else {
        // Default to 0% if no data
        change = "0.00%";
        changePositive = true;
      }

      return {
        rank: spotlightToken.rank,
        symbol: spotlightToken.symbol,
        change,
        changePositive,
        vol: volume,
        icon,
      };
    });
  }, [spotlightTokens, allTokens]);

  // Responsive items per page based on screen size
  useEffect(() => {
    const updateItemsPerPage = () => {
      const width = window.innerWidth;
      if (width >= 1280) {
        setItemsPerPage(5); // xl and above
      } else if (width >= 1024) {
        setItemsPerPage(4); // lg
      } else {
        setItemsPerPage(3); // base
      }
    };

    updateItemsPerPage();
    window.addEventListener("resize", updateItemsPerPage);
    return () => window.removeEventListener("resize", updateItemsPerPage);
  }, []);

  const totalPages = Math.ceil(spotlightItems.length / itemsPerPage);

  // Get items for current page
  const getPageItems = (pageIndex: number) => {
    const start = pageIndex * itemsPerPage;
    const end = start + itemsPerPage;
    return spotlightItems.slice(start, end);
  };

  // Reset to first page when items per page changes
  useEffect(() => {
    setActivePage(0);
  }, [itemsPerPage]);

  // Auto-slide every 8 seconds
  useEffect(() => {
    if (totalPages <= 1) return;
    const id = setInterval(() => {
      setActivePage((prev) => (prev + 1) % totalPages);
    }, 8000);
    return () => clearInterval(id);
  }, [totalPages]);

  const goToPage = useCallback(
    (pageIndex: number) => {
      if (totalPages === 0) return;
      const nextPage = ((pageIndex % totalPages) + totalPages) % totalPages;
      setActivePage(nextPage);
    },
    [totalPages]
  );

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStartXRef.current = e.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartXRef.current == null || totalPages <= 1) return;
    const deltaX = e.changedTouches[0]?.clientX - touchStartXRef.current;
    const threshold = 40; // minimal swipe distance in px
    if (deltaX > threshold) {
      goToPage(activePage - 1);
    } else if (deltaX < -threshold) {
      goToPage(activePage + 1);
    }
    touchStartXRef.current = null;
  };

  const currentPageItems = getPageItems(activePage);

  return (
    <div className="w-full flex flex-col">
      <div
        className="relative w-full border-t border-b border-[#1f261e] overflow-hidden shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)]"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Header */}
        <div className="px-6 lg:px-7 xl:px-8 2xl:px-10 py-4 flex items-center justify-between border-b border-[#1f261e]/50">
          <div className="flex items-center gap-2 lg:gap-2.5 xl:gap-2.5">
            <Image
              src="/assets/icons/home/fire-02.svg"
              alt="Spotlight"
              width={20}
              height={20}
              className="lg:w-6 lg:h-6"
            />
            <span className="text-white text-xs lg:text-sm xl:text-base font-semibold">Spotlight</span>
          </div>
          <span className="text-[#7c7c7c] text-xs lg:text-sm xl:text-base font-semibold">Volume</span>
        </div>

        {/* Carousel Content */}
        <div className="relative overflow-hidden">
          <div
            key={activePage}
            className="spotlight-slide-in flex flex-col"
          >
            {isLoading ? (
              <div className="px-6 lg:px-7 xl:px-8 2xl:px-10 py-8 text-center">
                <p className="text-[#7c7c7c] text-sm">Loading spotlight tokens...</p>
              </div>
            ) : currentPageItems.length === 0 ? (
              <div className="px-6 lg:px-7 xl:px-8 2xl:px-10 py-8 text-center">
                <p className="text-[#7c7c7c] text-sm">No spotlight tokens available</p>
              </div>
            ) : (
              currentPageItems.map((item) => (
                <div
                  key={`${item.rank}-${activePage}`}
                  onClick={() => router.push(`/market/${item.symbol}-USDT`)}
                  className="flex items-center justify-between px-6 lg:px-7 xl:px-8 2xl:px-10 py-2 border-b border-[#1f261e]/30 last:border-b-0 cursor-pointer hover:bg-[#0b0f0a] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[#7c7c7c] text-xs lg:text-xs xl:text-sm font-semibold w-5 lg:w-6 xl:w-7 text-left">
                      #{item.rank}
                    </span>
                    <TokenIcon
                      src={item.icon}
                      symbol={item.symbol}
                      alt={item.symbol}
                      width={20}
                      height={20}
                      className="lg:w-7 lg:h-7"
                    />
                    <div className="flex items-center gap-1 lg:gap-1.5 xl:gap-2">
                      <span className="text-white text-xs lg:text-sm xl:text-base font-semibold">
                        {item.symbol}
                      </span>
                      <span
                        className={`text-xs lg:text-xs xl:text-sm font-medium ${
                          item.changePositive ? "text-[#3fea9b]" : "text-[#ff5c5c]"
                        }`}
                      >
                        {item.change}
                      </span>
                    </div>
                  </div>
                  <span className="text-white text-xs lg:text-sm xl:text-base font-semibold">
                    {item.vol}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Pagination indicators */}
      {totalPages > 1 && (
        <div className="mt-2 flex items-center justify-center gap-1.5">
          {Array.from({ length: totalPages }).map((_, index) => {
            const isActive = index === activePage;
            return (
              <button
                key={index}
                type="button"
                onClick={() => goToPage(index)}
                aria-label={`Go to spotlight page ${index + 1}`}
                className={`h-[5px] rounded-full transition-colors cursor-pointer ${
                  isActive ? "bg-[#b1f128] w-4" : "bg-[#1F261E] w-10"
                }`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

