"use client";

import { useEffect, useState, useMemo } from "react";
import { fetchTokens } from "@/lib/frontend/api/tokens";
import type { Token } from "@/lib/frontend/types/tokens";
import { TokenIcon } from "@/components/portfolio/token-icon";
import { getTokenFallbackIcon } from "@/lib/shared/utils/portfolio-formatting";

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
  icon: string;
}

/**
 * Mobile Spotlight component
 * - Fetches spotlight tokens from admin API
 * - Matches with real token data for price change
 * - Horizontal scrolling cards
 * - Free scroll (no snap)
 * - Pill-shaped cards with token info
 */
export function MobileSpotlight() {
  const [spotlightTokens, setSpotlightTokens] = useState<SpotlightToken[]>([]);
  const [allTokens, setAllTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
        icon,
      };
    });
  }, [spotlightTokens, allTokens]);

  return (
    <div className="w-full flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center justify-between w-full">
        <p className="text-white text-base font-semibold">Spotlight</p>
          <div className="flex items-center justify-center w-4 h-4">
            <div className="rotate-90 -scale-y-100">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="w-4 h-4">
                <path d="M8 12L3 7L8 2" stroke="#B5B5B5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
      </div>

      {/* Horizontal scrolling cards */}
      <div className="overflow-x-auto scrollbar-hide -mx-[18px] px-[18px]">
        {isLoading ? (
          <div className="py-4 text-center">
            <p className="text-[#7c7c7c] text-sm">Loading spotlight tokens...</p>
          </div>
        ) : spotlightItems.length === 0 ? (
          <div className="py-4 text-center">
            <p className="text-[#7c7c7c] text-sm">No spotlight tokens available</p>
          </div>
        ) : (
          <div className="flex gap-1.5 items-start w-max">
            {spotlightItems.map((item) => (
              <div
                key={item.rank}
                className="border border-[#1f261e] flex gap-2 items-center pl-2 pr-4 py-2 rounded-full shrink-0"
              >
                <TokenIcon
                  src={item.icon}
                  symbol={item.symbol}
                  alt={item.symbol}
                  width={32}
                  height={32}
                  className="w-8 h-8 shrink-0"
                />
                <div className="flex flex-col items-start justify-center leading-normal shrink-0">
                  <p className="text-white text-sm font-semibold">{item.symbol}</p>
                  <p
                    className={`text-xs font-medium ${
                      item.changePositive ? "text-[#3fea9b]" : "text-[#ff5c5c]"
                    }`}
                  >
                    {item.change}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

