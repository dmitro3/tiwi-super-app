"use client";

import { useState, useEffect } from "react";
import EarnTabs from "@/components/earn/earn-tabs";
import TotalStakedCard from "@/components/earn/total-staked-card";
import ActionButtons from "@/components/earn/action-buttons";
import StakingCard from "@/components/earn/staking-card";
import EarnSidebar from "@/components/earn/earn-sidebar";
import EmptyState from "@/components/earn/empty-state";
import ComingSoonState from "@/components/earn/coming-soon-state";
import StakingCardSkeleton from "@/components/earn/staking-card-skeleton";
import StakingDetailView from "@/components/earn/staking-detail-view";
import {
  AVAILABLE_STAKING_POOLS,
  USER_STAKES,
  ACTIVE_POSITIONS,
  type StakingPool,
} from "@/data/mock-staking-pools";

type EarnTab = "Staking" | "Farming" | "Lend & Borrow" | "NFT Staking";
type ActionButton = "Stake" | "Active Positions" | "My Stakes";

// Simulate API call based on active tab and button
const simulateApiCall = (
  activeTab: EarnTab,
  activeButton: ActionButton
): Promise<StakingPool[]> => {
  return new Promise((resolve) => {
    // Simulate network delay
    setTimeout(() => {
      // For non-Staking tabs, return empty array (will show Coming Soon)
      if (activeTab !== "Staking") {
        resolve([]);
        return;
      }

      // For Staking tab, handle based on active button
      switch (activeButton) {
        case "Stake":
          // Return available staking pools
          resolve(AVAILABLE_STAKING_POOLS);
          break;
        case "Active Positions":
          // Return empty array to show empty state
          resolve(ACTIVE_POSITIONS);
          break;
        case "My Stakes":
          // Return user's staked tokens
          resolve(USER_STAKES);
          break;
        default:
          resolve([]);
      }
    }, 1500);
  });
};

// Empty state messages for each action button
const getEmptyStateMessages = (button: ActionButton) => {
  switch (button) {
    case "Stake":
      return {
        title: "No Pools found",
        description: "You haven't created any pools",
      };
    case "Active Positions":
      return {
        title: "No Active Positions",
        description: "You don't have any active positions",
      };
    case "My Stakes":
      return {
        title: "No Stakes found",
        description: "You haven't staked any tokens yet",
      };
    default:
      return {
        title: "No Pools found",
        description: "You haven't created any pools",
      };
  }
};

export default function EarnPage() {
  const [activeTab, setActiveTab] = useState<EarnTab>("Staking");
  const [activeButton, setActiveButton] = useState<ActionButton>("Stake");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [pools, setPools] = useState<StakingPool[]>([]);
  const [selectedPool, setSelectedPool] = useState<StakingPool | null>(null);
  const [showDetailView, setShowDetailView] = useState<boolean>(false);

  // Fetch pools when active tab or button changes
  useEffect(() => {
    setIsLoading(true);
    simulateApiCall(activeTab, activeButton)
      .then((data) => {
        setPools(data);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [activeTab, activeButton]);

  const handlePoolClick = (pool: StakingPool) => {
    setSelectedPool(pool);
    setShowDetailView(true);
  };

  const handleBackFromDetail = () => {
    setShowDetailView(false);
    setSelectedPool(null);
  };

  // Show detail view if pool is selected
  if (showDetailView && selectedPool && activeTab === "Staking") {
    return (
      <div className="flex flex-col gap-6 items-center flex-1 min-w-0 mx-auto pt-8 px-4 lg:px-12 2xl:px-0">
        <StakingDetailView pool={selectedPool} onBack={handleBackFromDetail} />
      </div>
    );
  }

  return (
    <>
      {/* Desktop Layout - Matches Figma exactly at 1728px, scales down properly */}
      <div className="hidden lg:block">
        {/* Container with proper spacing - responsive to screen size */}
        <div className="mx-auto max-w-[1728px]">
          <div className="flex gap-6 lg:gap-8 xl:gap-10 items-start justify-between pt-8 lg:pt-0 pb-8">
            {/* Main Content Area - flexible width, scales down on smaller screens */}
            <div className="flex flex-col gap-8 lg:gap-10 items-center flex-1 min-w-0 mx-auto pt-8" style={{ maxWidth: 'min(880px, calc(100% - 320px))' }}>
              {/* Tabs and Stats Section */}
              <div className="flex flex-col gap-8 lg:gap-10 items-start relative shrink-0 w-full  lg:px-12 2xl:px-0">
                {/* Tabs */}
                <EarnTabs activeTab={activeTab} onTabChange={setActiveTab} />

                {/* Total Staked Card - Only show for Staking tab */}
                {activeTab === "Staking" && <TotalStakedCard />}
              </div>

              {/* Action Buttons and Content Area */}
              <div className="flex flex-col gap-8 lg:gap-10 items-start relative shrink-0 w-full   lg:px-12 2xl:px-0">
                {/* Action Buttons - Only show for Staking tab */}
                {activeTab === "Staking" && (
                  <ActionButtons activeButton={activeButton} onButtonClick={setActiveButton} />
                )}

                {/* Content Area - Loading, Empty, Coming Soon, or Cards */}
                <div className="flex flex-col items-start relative shrink-0 w-full">
                  {isLoading ? (
                    // Loading State - Skeleton Loaders
                    <div className="flex flex-col gap-2 items-start relative shrink-0 w-full">
                      <StakingCardSkeleton />
                      <StakingCardSkeleton />
                      <StakingCardSkeleton />
                    </div>
                  ) : activeTab !== "Staking" ? (
                    // Coming Soon State for Farming, Lend & Borrow, NFT Staking
                    <ComingSoonState className="h-[267px] w-full" />
                  ) : pools.length === 0 ? (
                    // Empty State (for Staking tab)
                    <EmptyState
                      title={getEmptyStateMessages(activeButton).title}
                      description={getEmptyStateMessages(activeButton).description}
                      className="h-[267px]"
                    />
                  ) : (
                    // Staking Cards (when data exists)
                    <div className="flex flex-col gap-2 items-start relative shrink-0 w-full">
                      {pools.map((pool) => (
                        <StakingCard
                          key={pool.id}
                          tokenSymbol={pool.tokenSymbol}
                          apy={pool.apy}
                          tokenIcon={pool.tokenIcon}
                          onExpand={() => handlePoolClick(pool)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Sidebar - Desktop Only - fixed width, scales down on smaller screens */}
            <aside className="border-[#1f261e] border-b-0 border-l border-r-0 border-solid border-t-0 flex flex-col gap-4 items-center justify-start px-4 py-4 shrink-0 w-[280px] lg:w-[300px] xl:w-[320px] 2xl:w-[350px] self-stretch">
              <EarnSidebar />
            </aside>
          </div>
        </div>
      </div>

      {/* Mobile Layout - Matches Figma mobile design */}
      <div className="flex lg:hidden flex-col gap-0 items-center w-full">
        {/* Tabs - Full width, horizontally scrollable */}
        <div className="w-full">
          <EarnTabs activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        {/* Content Container - Centered with max-width */}
        <div className="flex flex-col gap-6 items-center px-4 py-6 w-full">
          {/* Total Staked Card - Only show for Staking tab */}
          {activeTab === "Staking" && (
            <div className="w-full max-w-[353px]">
              <TotalStakedCard />
            </div>
          )}

          {/* Action Buttons - Only show for Staking tab */}
          {activeTab === "Staking" && (
            <div className="w-full max-w-[373px]">
              <ActionButtons activeButton={activeButton} onButtonClick={setActiveButton} />
            </div>
          )}

          {/* Content Area - Loading, Empty, Coming Soon, or Cards */}
          <div className="flex flex-col gap-2 items-start relative shrink-0 w-full max-w-[353px]">
            {isLoading ? (
              // Loading State - Skeleton Loaders
              <div className="flex flex-col gap-2 items-start relative shrink-0 w-full">
                <StakingCardSkeleton />
                <StakingCardSkeleton />
              </div>
            ) : activeTab !== "Staking" ? (
              // Coming Soon State for Farming, Lend & Borrow, NFT Staking
              <ComingSoonState className="h-[393px] w-full" />
            ) : pools.length === 0 ? (
              // Empty State (for Staking tab)
              <EmptyState
                title={getEmptyStateMessages(activeButton).title}
                description={getEmptyStateMessages(activeButton).description}
                className="h-[267px]"
              />
            ) : (
              // Staking Cards (when data exists)
              <div className="flex flex-col gap-2 items-start relative shrink-0 w-full">
              {pools.map((pool) => (
                <StakingCard
                  key={pool.id}
                  tokenSymbol={pool.tokenSymbol}
                  apy={pool.apy}
                  tokenIcon={pool.tokenIcon}
                  onExpand={() => handlePoolClick(pool)}
                />
              ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

