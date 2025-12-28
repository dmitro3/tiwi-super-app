"use client";

import { useState, useEffect } from "react";
import MarketTabs from "@/components/market/market-tabs";
import MarketTable from "@/components/market/market-table";
import { SPOT_TOKENS, PERP_TOKENS, type MarketToken } from "@/lib/market/mock-data";

type MarketTab = "Spot" | "Perp";

// Simulate API call
const simulateApiCall = (marketType: MarketTab): Promise<MarketToken[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(marketType === "Spot" ? SPOT_TOKENS : PERP_TOKENS);
    }, 1500);
  });
};

export default function MarketPage() {
  const [activeTab, setActiveTab] = useState<MarketTab>("Spot");
  const [tokens, setTokens] = useState<MarketToken[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch tokens when tab changes
  useEffect(() => {
    setIsLoading(true);
    simulateApiCall(activeTab)
      .then((data) => {
        setTokens(data);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [activeTab]);

  return (
    <>
      {/* Desktop Layout */}
      <div className="hidden lg:block">
        <div className="mx-auto max-w-[1728px]">
          <div className="flex flex-col gap-6 lg:gap-8 xl:gap-10 items-start justify-between pt-8 lg:pt-0 pb-8">
            {/* Main Content Area */}
            <div className="flex flex-col gap-6 lg:gap-8 items-start flex-1 min-w-0 w-full px-4 lg:px-8 xl:px-12 2xl:px-16">
              {/* Tabs */}
              <div className="w-full">
                <MarketTabs activeTab={activeTab} onTabChange={setActiveTab} />
              </div>

              {/* Market Table */}
              <div className="flex-1 border border-[#1f261e] rounded-xl overflow-hidden flex flex-col min-h-0 w-full" style={{ minHeight: '600px', maxHeight: 'calc(100vh - 250px)' }}>
                <MarketTable 
                  tokens={tokens} 
                  isLoading={isLoading}
                  marketType={activeTab.toLowerCase() as "spot" | "perp"}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="flex lg:hidden flex-col gap-4 items-center px-4 py-6 w-full">
        {/* Tabs */}
        <div className="w-full">
          <MarketTabs activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        {/* Market Table - Mobile optimized */}
        <div className="w-full border border-[#1f261e] rounded-xl overflow-hidden">
          <MarketTable 
            tokens={tokens} 
            isLoading={isLoading}
            marketType={activeTab.toLowerCase() as "spot" | "perp"}
          />
        </div>
      </div>
    </>
  );
}

