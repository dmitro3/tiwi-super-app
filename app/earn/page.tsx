"use client";

import { useState } from "react";
import EarnTabs from "@/components/earn/earn-tabs";
import TotalStakedCard from "@/components/earn/total-staked-card";
import ActionButtons from "@/components/earn/action-buttons";
import StakingCard from "@/components/earn/staking-card";
import EarnSidebar from "@/components/earn/earn-sidebar";

type EarnTab = "Staking" | "Farming" | "Lend & Borrow" | "NFT Staking";
type ActionButton = "Stake" | "Active Positions" | "My Stakes";

export default function EarnPage() {
  const [activeTab, setActiveTab] = useState<EarnTab>("Staking");
  const [activeButton, setActiveButton] = useState<ActionButton>("Stake");

  return (
    <>
      {/* Desktop Layout - Matches Figma exactly at 1728px */}
      <div className="hidden lg:block relative">
        {/* Main Content Area - positioned exactly as in Figma */}
        <div className="absolute flex flex-col gap-10 items-start left-[calc(8.33%+105px)] top-[200px] w-[880px] max-w-[calc(100%-350px)]">
          {/* Tabs and Stats Section */}
          <div className="flex flex-col gap-10 items-start relative shrink-0 w-full">
            {/* Tabs */}
            <EarnTabs activeTab={activeTab} onTabChange={setActiveTab} />

            {/* Total Staked Card */}
            <TotalStakedCard />
          </div>

          {/* Action Buttons and Staking Cards */}
          <div className="flex flex-col gap-10 items-start relative shrink-0 w-full">
            {/* Action Buttons */}
            <ActionButtons activeButton={activeButton} onButtonClick={setActiveButton} />

            {/* Staking Cards */}
            <div className="flex flex-col items-start relative shrink-0 w-full">
              <StakingCard />
            </div>
          </div>
        </div>

        {/* Right Sidebar - Desktop Only - positioned exactly as in Figma */}
        <aside className="absolute border-[#1f261e] border-b-0 border-l border-r-0 border-solid border-t-0 flex flex-col gap-4 h-[908px] items-center justify-center px-0 py-4 right-0 top-[136px] w-[310px]">
          <EarnSidebar />
        </aside>
      </div>

      {/* Mobile Layout - Matches Figma mobile design */}
      <div className="flex lg:hidden flex-col gap-6 items-center px-4 py-6 w-full">
        {/* Tabs */}
        <div className="w-full max-w-[353px]">
          <EarnTabs activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        {/* Total Staked Card */}
        <div className="w-full max-w-[353px]">
          <TotalStakedCard />
        </div>

        {/* Action Buttons */}
        <div className="w-full max-w-[373px]">
          <ActionButtons activeButton={activeButton} onButtonClick={setActiveButton} />
        </div>

        {/* Staking Cards */}
        <div className="flex flex-col gap-2 items-start relative shrink-0 w-full max-w-[353px]">
          <StakingCard />
        </div>
      </div>
    </>
  );
}

