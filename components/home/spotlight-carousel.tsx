"use client";

import Image from "next/image";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
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
  const [activePage, setActivePage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(3);
  const [spotlightTokens, setSpotlightTokens] = useState<SpotlightToken[]>([]);
  const [allTokens, setAllTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const touchStartXRef = useRef<number | null>(null);

  // Fetch spotlight tokens and their real-time data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch spotlight tokens
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

        // Fetch real-time data for each spotlight token individually
        // This ensures we get the most accurate volume and price change data
        const tokenDataPromises = activeTokens.map(async (spotlightToken: SpotlightToken) => {
          try {
            // Try to fetch by address first (most accurate)
            if (spotlightToken.address) {
              const tokens = await fetchTokens({ address: spotlightToken.address, limit: 10 });
              if (tokens.length > 0) {
                // Find exact match by address
                const exactMatch = tokens.find(
                  t => t.address.toLowerCase() === spotlightToken.address?.toLowerCase()
                );
                if (exactMatch) return exactMatch;
              }
            }
            
            // Fallback: search by symbol
            if (spotlightToken.symbol) {
              const tokens = await fetchTokens({ query: spotlightToken.symbol, limit: 20 });
              if (tokens.length > 0) {
                // Find best match by symbol (case-insensitive)
                const symbolMatch = tokens.find(
                  t => t.symbol.toUpperCase() === spotlightToken.symbol.toUpperCase()
                );
                if (symbolMatch) return symbolMatch;
                
                // If no exact match, prefer token with volume/price data
                const withData = tokens.find(t => t.volume24h || t.priceChange24h !== undefined);
                if (withData) return withData;
              }
            }
            
            return null;
          } catch (error) {
            console.error(`Error fetching data for token ${spotlightToken.symbol}:`, error);
            return null;
          }
        });

        // Wait for all token data to be fetched
        const tokenDataResults = await Promise.all(tokenDataPromises);
        
        // Create a map of spotlight token symbol/address to token data
        const tokenMap = new Map<string, Token>();
        activeTokens.forEach((spotlightToken: SpotlightToken, index: number) => {
          const tokenData = tokenDataResults[index];
          if (tokenData) {
            // Use address as key if available, otherwise use symbol
            const key = spotlightToken.address?.toLowerCase() || spotlightToken.symbol.toUpperCase();
            tokenMap.set(key, tokenData);
          }
        });

        // Store all fetched tokens for matching
        const allFetchedTokens = tokenDataResults.filter((t): t is Token => t !== null);
        setAllTokens(allFetchedTokens);
      } catch (error) {
        console.error("Error fetching spotlight data:", error);
      } finally {
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
        // First try exact symbol match
        matchedToken = allTokens.find(
          (t) => t.symbol.toUpperCase().trim() === normalizedSymbol
        );
        
        // If multiple matches, prefer tokens with volume/price data
        if (!matchedToken) {
          const candidates = allTokens.filter(
            (t) => t.symbol.toUpperCase().trim() === normalizedSymbol
          );
          // Prefer token with volume or price change data
          matchedToken = candidates.find(t => t.volume24h || t.priceChange24h !== undefined) 
            || candidates[0];
        }
      }

      // Get icon - use stored logo first, then token logo, then fallback
      const icon = spotlightToken.logo || matchedToken?.logo || getTokenFallbackIcon(spotlightToken.symbol);

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
                  className="flex items-center justify-between px-6 lg:px-7 xl:px-8 2xl:px-10 py-2 border-b border-[#1f261e]/30 last:border-b-0"
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

