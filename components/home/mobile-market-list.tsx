"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { TABLE_TOKENS } from "@/lib/home/mock-data";
import { TokenImage } from "@/components/home/token-image";
import { formatTokenForHomepage, type HomepageToken } from "@/lib/home/token-formatter";
import { fetchTokens } from "@/lib/frontend/api/tokens";
import type { Token } from "@/lib/frontend/types/tokens";

type TabKey = "Favourite" | "Top" | "Spotlight" | "New" | "Gainers" | "Losers";

const tabs: TabKey[] = ["Favourite", "Top", "Spotlight", "New", "Gainers", "Losers"];

interface MobileMarketListProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

/**
 * Mobile Market List component
 * - Vertical list of market rows (not table)
 * - Horizontal scrollable tabs
 * - Each row shows: token icon, pair name, leverage, volume, price, change
 */
export function MobileMarketList({ activeTab, onTabChange }: MobileMarketListProps) {
  const [tokens, setTokens] = useState<HomepageToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch tokens based on active tab
  useEffect(() => {
    const loadTokens = async () => {
      setIsLoading(true);
      try {
        let fetchedTokens: Token[] = [];
        
        // Map tab to category (Top = Hot, Spotlight = Hot for now)
        const categoryMap: Record<TabKey, string | undefined> = {
          'Top': 'hot',
          'Hot': 'hot',
          'New': 'new',
          'Gainers': 'gainers',
          'Losers': 'losers',
          'Favourite': undefined,
          'Spotlight': 'hot', // Spotlight uses hot tokens for now
        };

        const category = categoryMap[activeTab];
        
        if (category) {
          // Fetch by category
          const url = new URL('/api/v1/tokens', window.location.origin);
          url.searchParams.set('category', category);
          url.searchParams.set('limit', '5'); // Only 5 for mobile
          
          const response = await fetch(url.toString());
          if (response.ok) {
            const data = await response.json();
            fetchedTokens = data.tokens || [];
          }
        } else if (activeTab === 'Favourite') {
          // For favourites, fetch all tokens
          fetchedTokens = await fetchTokens({ limit: 5 });
        } else {
          // Default: fetch hot tokens
          const url = new URL('/api/v1/tokens', window.location.origin);
          url.searchParams.set('category', 'hot');
          url.searchParams.set('limit', '5');
          
          const response = await fetch(url.toString());
          if (response.ok) {
            const data = await response.json();
            fetchedTokens = data.tokens || [];
          }
        }

        // Format tokens for homepage
        const formattedTokens = fetchedTokens.map(formatTokenForHomepage);
        setTokens(formattedTokens);
      } catch (error) {
        console.error('[MobileMarketList] Error fetching tokens:', error);
        // Fallback to mock data on error
        setTokens(TABLE_TOKENS.slice(0, 5).map(t => ({
          ...t,
          token: {} as Token,
        })));
      } finally {
        setIsLoading(false);
      }
    };

    loadTokens();
  }, [activeTab]);

  // Show first 5 tokens for mobile
  const displayTokens = tokens.slice(0, 5);

  return (
    <div className="w-full flex flex-col gap-2">
      {/* Title */}
      <div className="">
        <p className="text-white text-base font-semibold">Market</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#1f261e] flex gap-4 items-start pb-0">
        {tabs.map((tab) => {
          const isActive = tab === activeTab;
          return (
            <div key={tab} className="flex flex-col gap-2.5 h-[26px] items-center shrink-0">
              <button
                onClick={() => onTabChange(tab)}
                className={`text-xs font-semibold leading-normal transition-colors cursor-pointer ${
                  isActive ? "text-[#b1f128]" : "text-[#b5b5b5]"
                }`}
              >
                {tab}
              </button>
              {isActive && (
                <div className="h-0 w-full border-t border-[#b1f128] mt-auto" />
              )}
            </div>
          );
        })}
      </div>

      {/* Market Rows */}
      <div className="flex flex-col items-start w-full">
        {isLoading ? (
          <div className="w-full py-8 text-center text-[#b5b5b5] text-sm">
            Loading tokens...
          </div>
        ) : displayTokens.length === 0 ? (
          <div className="w-full py-8 text-center text-[#b5b5b5] text-sm">
            No tokens found
          </div>
        ) : (
          displayTokens.map((token) => (
          <div
            key={token.symbol}
            className="flex items-center overflow-hidden w-full hover:bg-[#121712] transition-colors p-2 cursor-pointer rounded-2xl"
          >
            <div className="flex flex-[1_0_0] gap-2.5 items-center min-w-0 min-h-0">
              <TokenImage
                src={token.icon}
                alt={token.symbol}
                width={32}
                height={32}
                symbol={token.symbol}
                className="w-8 h-8 shrink-0"
              />
              <div className="flex flex-[1_0_0] flex-col items-start justify-center min-w-0 min-h-0">
                <div className="flex gap-2 items-center">
                  <p className="text-white text-sm font-medium">
                    <span className="font-semibold">{token.symbol}</span>
                    <span className="text-[#b5b5b5]">/USDT</span>
                  </p>
                  <div className="bg-[#1f261e] flex items-center justify-center px-1.5 py-0.5 rounded-md">
                    <p className="text-[#b5b5b5] text-[10px]">10X</p>
                  </div>
                </div>
                <p className="text-[#b5b5b5] text-xs font-medium">
                  Vol {token.vol.replace("$", "")}
                </p>
              </div>
              <div className="flex flex-col items-end justify-center leading-normal shrink-0">
                <p className="text-white text-sm font-semibold">{token.price}</p>
                <p
                  className={`text-xs font-medium ${
                    token.changePositive ? "text-[#3fea9b]" : "text-[#ff5c5c]"
                  }`}
                >
                  {token.change}
                </p>
              </div>
            </div>
          </div>
          ))
        )}
      </div>

      {/* View All Button */}
      <div className="flex items-center justify-center w-full">
        <button className="bg-[#0d3600] flex gap-3 items-center justify-center overflow-hidden px-6 py-2.5 rounded-full w-full">
          <p className="text-white text-sm font-medium text-center leading-[1.6]">
            View all
          </p>
        </button>
      </div>
    </div>
  );
}

