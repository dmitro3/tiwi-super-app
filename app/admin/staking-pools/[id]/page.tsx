"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AdminLayout from "@/components/admin/admin-layout";
import EditPoolModal from "@/components/admin/edit-pool-modal";
import DeactivatePoolModal from "@/components/admin/deactivate-pool-modal";

export default function PoolDetailsPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const router = useRouter();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);

  // Mock pool data - in real app, fetch from API
  const poolData = {
    id: params.id,
    poolName: "Premium Pool",
    poolDescription: "A high-yield staking pool with fixed terms",
    poolType: "Fixed Term",
    startDate: "01/15/2025",
    endDate: "12/31/2025",
    minStakeAmount: "100.00",
    maxStakeAmount: "10000.00",
    rewardRate: "12.5",
    rewardToken: "TWC",
    rewardDistribution: "Daily",
    earlyUnstakePenalty: "5.0",
  };

  return (
    <AdminLayout pageTitle="Admin - Pool Details" activeNavItem="staking-pools">
      <main className="flex-1 overflow-y-auto p-4 lg:p-6">
        {/* Header */}
        <div className="mb-6 lg:mb-8">
          <button
            onClick={() => router.push("/admin/staking-pools")}
            className="text-[#b1f128] hover:text-[#9dd81f] transition-colors mb-4 flex items-center gap-2"
          >
            ← Back to Pools
          </button>
          <h2 className="text-2xl lg:text-3xl font-semibold text-white mb-2">
            Pool Details
          </h2>
        </div>

        {/* Pool Information Card */}
        <div className="bg-[#121712] border border-[#1f261e] rounded-xl p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pool Name */}
            <div>
              <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
                Pool Name
              </label>
              <div className="bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white">
                {poolData.poolName}
              </div>
            </div>

            {/* Pool Description */}
            <div>
              <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
                Pool Description
              </label>
              <div className="bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white min-h-[60px] flex items-center">
                {poolData.poolDescription}
              </div>
            </div>

            {/* Pool Type */}
            <div>
              <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
                Pool Type
              </label>
              <div className="bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white">
                {poolData.poolType}
              </div>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
                Start Date
              </label>
              <div className="bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white">
                {poolData.startDate}
              </div>
            </div>

            {/* End Date */}
            <div>
              <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
                End Date
              </label>
              <div className="bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white">
                {poolData.endDate}
              </div>
            </div>

            {/* Minimum Stake Amount */}
            <div>
              <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
                Minimum Stake Amount
              </label>
              <div className="bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white">
                {poolData.minStakeAmount}
              </div>
            </div>

            {/* Maximum Stake Amount */}
            <div>
              <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
                Maximum Stake Amount
              </label>
              <div className="bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white">
                {poolData.maxStakeAmount}
              </div>
            </div>

            {/* Reward Rate */}
            <div>
              <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
                Reward Rate (%)
              </label>
              <div className="bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white">
                {poolData.rewardRate}%
              </div>
            </div>

            {/* Reward Token */}
            <div>
              <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
                Reward Token
              </label>
              <div className="bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white">
                {poolData.rewardToken}
              </div>
            </div>

            {/* Reward Distribution Frequency */}
            <div>
              <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
                Reward Distribution Frequency
              </label>
              <div className="bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white">
                {poolData.rewardDistribution}
              </div>
            </div>

            {/* Early Unstake Penalty */}
            <div>
              <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
                Early Unstake Penalty (%)
              </label>
              <div className="bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white">
                {poolData.earlyUnstakePenalty}%
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mt-6 pt-6 border-t border-[#1f261e]">
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="flex-1 px-6 py-2.5 bg-[#121712] border border-[#b1f128] text-[#b1f128] rounded-lg hover:bg-[#081f02] transition-colors font-medium"
            >
              Edit Pool
            </button>
            <button
              onClick={() => setIsDeactivateModalOpen(true)}
              className="flex-1 px-6 py-2.5 bg-[#121712] border border-[#ff5c5c] text-[#ff5c5c] rounded-lg hover:bg-[#2a1a1a] transition-colors font-medium"
            >
              Deactivate Pool
            </button>
          </div>
        </div>

        {/* Modals */}
        <EditPoolModal
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          poolData={poolData}
        />
        <DeactivatePoolModal
          open={isDeactivateModalOpen}
          onOpenChange={setIsDeactivateModalOpen}
        />
      </main>
    </AdminLayout>
  );
}

