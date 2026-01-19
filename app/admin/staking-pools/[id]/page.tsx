"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import AdminLayout from "@/components/admin/admin-layout";
import EditPoolModal from "@/components/admin/edit-pool-modal";
import DeactivatePoolModal from "@/components/admin/deactivate-pool-modal";

interface StakingPool {
  id: string;
  chainId: number;
  chainName: string;
  tokenAddress: string;
  tokenSymbol?: string;
  tokenName?: string;
  tokenLogo?: string;
  minStakingPeriod?: string;
  minStakeAmount: number;
  maxStakeAmount?: number;
  stakeModificationFee: boolean;
  timeBoost: boolean;
  country?: string;
  stakePoolCreationFee: number;
  rewardPoolCreationFee?: string;
  apy?: number;
  // Reward configuration fields
  maxTvl?: number; // Maximum TVL or Total Staked Tokens
  poolReward?: number; // Total reward tokens allocated to the pool
  rewardDurationSeconds?: number; // Reward duration in seconds
  rewardPerSecond?: number; // Calculated reward per second
  status: 'active' | 'inactive' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export default function PoolDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [poolData, setPoolData] = useState<StakingPool | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const poolId = params?.id as string || "";

  // Fetch pool data from API
  useEffect(() => {
    const fetchPoolData = async () => {
      if (!poolId) return;
      
      setIsLoading(true);
      try {
        const response = await fetch("/api/v1/staking-pools");
        if (response.ok) {
          const data = await response.json();
          const pool = data.pools.find((p: StakingPool) => p.id === poolId);
          if (pool) {
            setPoolData(pool);
          } else {
            console.error("Pool not found");
            router.push("/admin/staking-pools");
          }
        } else {
          console.error("Error fetching pool data:", response.statusText);
          router.push("/admin/staking-pools");
        }
      } catch (error) {
        console.error("Error fetching pool data:", error);
        router.push("/admin/staking-pools");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPoolData();
  }, [poolId, router]);

  // Listen for pool updates
  useEffect(() => {
    const handlePoolUpdate = async () => {
      if (!poolId) return;
      
      try {
        const response = await fetch("/api/v1/staking-pools");
        if (response.ok) {
          const data = await response.json();
          const pool = data.pools.find((p: StakingPool) => p.id === poolId);
          if (pool) {
            setPoolData(pool);
          }
        }
      } catch (error) {
        console.error("Error refreshing pool data:", error);
      }
    };

    window.addEventListener("stakingPoolUpdated", handlePoolUpdate);
    return () => {
      window.removeEventListener("stakingPoolUpdated", handlePoolUpdate);
    };
  }, [poolId]);

  const handleDeactivate = async () => {
    if (!poolData) return;

    try {
      const response = await fetch("/api/v1/staking-pools", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: poolData.id,
          status: "inactive",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to deactivate pool");
      }

      // Refresh pool data
      window.dispatchEvent(new Event("stakingPoolUpdated"));
      setIsDeactivateModalOpen(false);
      router.push("/admin/staking-pools");
    } catch (error: any) {
      console.error("Error deactivating pool:", error);
      alert(error.message || "Failed to deactivate pool. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <AdminLayout activeNavItem="staking-pools">
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="text-center py-12">
            <p className="text-[#b5b5b5]">Loading pool details...</p>
          </div>
        </main>
      </AdminLayout>
    );
  }

  if (!poolData) {
    return (
      <AdminLayout activeNavItem="staking-pools">
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="text-center py-12">
            <p className="text-[#b5b5b5]">Pool not found</p>
          </div>
        </main>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout activeNavItem="staking-pools">
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
          <div className="space-y-6">
            {/* Step 1 Fields */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Chain Selection */}
                <div>
                  <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
                    Chain Selection
                  </label>
                  <div className="bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white">
                    {poolData.chainName}
                  </div>
                </div>

                {/* Select Token */}
                <div>
                  <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
                    Select Token
                  </label>
                  <div className="bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white">
                    {poolData.tokenAddress}
                  </div>
                  {poolData.tokenSymbol && (
                    <div className="text-[#b1f128] text-xs mt-1">Symbol: {poolData.tokenSymbol}</div>
                  )}
                </div>

                {/* Minimum staking period */}
                <div>
                  <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
                    Minimum staking period
                  </label>
                  <div className="bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white">
                    {poolData.minStakingPeriod || "Not set"}
                  </div>
                </div>

                {/* Min Stake Amount */}
                <div>
                  <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
                    Min Stake Amount
                  </label>
                  <div className="bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white">
                    {poolData.minStakeAmount}
                  </div>
                </div>

                {/* Max Stake Amount */}
                <div>
                  <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
                    Max Stake Amount
                  </label>
                  <div className="bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white">
                    {poolData.maxStakeAmount || "No limit"}
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2 Fields */}
            <div className="pt-6 border-t border-[#1f261e]">
              <h3 className="text-lg font-semibold text-white mb-4">Advanced Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Stake modification fee */}
                <div className="flex items-center justify-between">
                  <label className="block text-[#b5b5b5] text-sm font-medium">
                    Stake modification fee
                  </label>
                  <div className={`inline-flex h-6 w-11 items-center rounded-full ${
                    poolData.stakeModificationFee ? "bg-[#b1f128]" : "bg-[#1f261e]"
                  }`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      poolData.stakeModificationFee ? "translate-x-6" : "translate-x-1"
                    }`} />
                  </div>
                </div>

                {/* Time boost */}
                <div>
                  <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
                    Time boost
                  </label>
                  <div className="bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white">
                    {poolData.timeBoost ? "Enabled" : "Not Configured"}
                  </div>
                </div>

                {/* Select your country */}
                <div>
                  <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
                    Select your country
                  </label>
                  <div className="bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white">
                    {poolData.country || "Not specified"}
                  </div>
                </div>
              </div>

              {/* Reward Configuration */}
              {(poolData.maxTvl || poolData.poolReward || poolData.rewardDurationSeconds) && (
                <div className="pt-6 border-t border-[#1f261e]">
                  <h3 className="text-lg font-semibold text-white mb-4">Reward Configuration (TIWI Protocol)</h3>
                  <div className="bg-[#0b0f0a] border border-[#1f261e] rounded-lg p-4 space-y-3">
                    {poolData.maxTvl && (
                      <div className="flex justify-between items-center">
                        <span className="text-[#b5b5b5] text-sm">Maximum TVL / Total Staked Tokens</span>
                        <span className="text-white text-sm font-medium">
                          {poolData.maxTvl.toLocaleString()} {poolData.tokenSymbol || 'tokens'}
                        </span>
                      </div>
                    )}
                    {poolData.poolReward && (
                      <div className="flex justify-between items-center">
                        <span className="text-[#b5b5b5] text-sm">Pool Reward (Total Reward Tokens)</span>
                        <span className="text-white text-sm font-medium">
                          {poolData.poolReward.toLocaleString()} {poolData.tokenSymbol || 'tokens'}
                        </span>
                      </div>
                    )}
                    {poolData.rewardDurationSeconds && (
                      <div className="flex justify-between items-center">
                        <span className="text-[#b5b5b5] text-sm">Reward Duration</span>
                        <span className="text-white text-sm font-medium">
                          {Math.floor(poolData.rewardDurationSeconds / (24 * 60 * 60))} days ({poolData.rewardDurationSeconds.toLocaleString()} seconds)
                        </span>
                      </div>
                    )}
                    {poolData.rewardPerSecond && (
                      <div className="flex justify-between items-center">
                        <span className="text-[#b5b5b5] text-sm">Reward Per Second</span>
                        <span className="text-white text-sm font-medium">
                          {poolData.rewardPerSecond.toFixed(6)} {poolData.tokenSymbol || 'tokens'}/sec
                        </span>
                      </div>
                    )}
                    {poolData.maxTvl && poolData.poolReward && poolData.rewardDurationSeconds && (
                      <div className="mt-4 pt-4 border-t border-[#1f261e]">
                        <div className="text-[#b1f128] text-xs font-medium mb-2">Calculated Reward Rate:</div>
                        <div className="text-white text-sm">
                          {(poolData.poolReward / (poolData.maxTvl * poolData.rewardDurationSeconds)).toExponential(6)} tokens per token per second
                        </div>
                        <p className="text-[#7c7c7c] text-xs mt-2">
                          Formula: Reward Rate = Pool Reward / (Total Staked Tokens × Time)
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Fee Information */}
              <div className="mt-6 bg-[#0b0f0a] border border-[#1f261e] rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[#b5b5b5] text-sm">Stake Pool Creation Fee</span>
                  <span className="text-white text-sm font-medium">
                    {poolData.stakePoolCreationFee} {poolData.chainName === "Ethereum" ? "ETH" : poolData.chainName}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#b5b5b5] text-sm">Reward Pool Creation Fee</span>
                  <span className="text-white text-sm font-medium">
                    {poolData.rewardPoolCreationFee || "Not set"}
                  </span>
                </div>
                {poolData.apy && (
                  <div className="flex justify-between items-center">
                    <span className="text-[#b5b5b5] text-sm">APY</span>
                    <span className="text-[#b1f128] text-sm font-medium">
                      {poolData.apy.toFixed(2)}%
                    </span>
                  </div>
                )}
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
          onOpenChange={(open) => {
            setIsEditModalOpen(open);
            if (!open) {
              // Refresh pool data when modal closes
              window.dispatchEvent(new Event("stakingPoolUpdated"));
            }
          }}
          poolData={poolData}
        />
        <DeactivatePoolModal
          open={isDeactivateModalOpen}
          onOpenChange={setIsDeactivateModalOpen}
          onConfirm={handleDeactivate}
        />
      </main>
    </AdminLayout>
  );
}

