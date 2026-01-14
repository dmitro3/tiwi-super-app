"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import AdminLayout from "@/components/admin/admin-layout";
import CreatePoolModal from "@/components/admin/create-pool-modal";
import { IoAddOutline, IoSearchOutline, IoChevronForwardOutline } from "react-icons/io5";
import { TokenIcon } from "@/components/portfolio/token-icon";
import { getTokenFallbackIcon } from "@/lib/shared/utils/portfolio-formatting";

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
  status: 'active' | 'inactive' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export default function StakingPoolsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [stakingPools, setStakingPools] = useState<StakingPool[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch staking pools from database
  const fetchStakingPools = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/v1/staking-pools");
      if (response.ok) {
        const data = await response.json();
        setStakingPools(data.pools || []);
      } else {
        console.error("Error fetching staking pools:", response.statusText);
      }
    } catch (error) {
      console.error("Error fetching staking pools:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStakingPools();
  }, [fetchStakingPools]);

  // Listen for pool updates
  useEffect(() => {
    const handlePoolUpdate = () => {
      fetchStakingPools();
    };

    window.addEventListener("stakingPoolUpdated", handlePoolUpdate);
    return () => {
      window.removeEventListener("stakingPoolUpdated", handlePoolUpdate);
    };
  }, [fetchStakingPools]);

  const filteredPools = stakingPools.filter((pool) =>
    (pool.tokenSymbol?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
    (pool.tokenName?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
    pool.tokenAddress.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleModalClose = () => {
    setIsCreateModalOpen(false);
    fetchStakingPools(); // Refresh pools after creating
  };

  return (
    <AdminLayout activeNavItem="staking-pools">
      <main className="flex-1 overflow-y-auto p-4 lg:p-6">
        {/* Header Section */}
        <div className="mb-6 lg:mb-8">
          <h2 className="text-2xl lg:text-3xl font-semibold text-white mb-2">
            Staking Pools
          </h2>
          <p className="text-[#b5b5b5] text-sm">
            Create and manage staking pools for tokens across supported chains.
          </p>
        </div>

        {/* Search and Create Button */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7c7c7c]" />
            <input
              type="text"
              placeholder="Search Staking Pools"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#121712] border border-[#1f261e] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-[#7c7c7c] focus:outline-none focus:border-[#b1f128]"
            />
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#b1f128] text-[#010501] rounded-lg hover:bg-[#9dd81f] transition-colors font-medium text-sm whitespace-nowrap"
          >
            <IoAddOutline className="w-5 h-5" />
            <span>Create Stake</span>
          </button>
        </div>

        {/* Staking Pools Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-[#b5b5b5]">Loading staking pools...</p>
          </div>
        ) : filteredPools.length === 0 ? (
          <div className="bg-[#121712] border border-[#1f261e] rounded-xl p-12 text-center">
            <p className="text-[#b5b5b5] text-sm mb-4">
              {searchQuery ? "No staking pools found matching your search." : "No staking pools yet. Click 'Create Stake' to add one."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredPools.map((pool) => (
              <div
                key={pool.id}
                onClick={() => router.push(`/admin/staking-pools/${pool.id}`)}
                className="bg-[#121712] border border-[#1f261e] rounded-xl p-4 hover:border-[#b1f128] transition-colors cursor-pointer"
              >
                <div className="flex flex-col items-center text-center">
                  {/* Token Icon */}
                  <div className="w-12 h-12 rounded-full bg-[#1f261e] flex items-center justify-center mb-3 overflow-hidden">
                    {pool.tokenLogo ? (
                      <TokenIcon
                        src={pool.tokenLogo}
                        symbol={pool.tokenSymbol || '?'}
                        alt={pool.tokenSymbol || 'Token'}
                        width={48}
                        height={48}
                      />
                    ) : (
                      <span className="text-white font-semibold text-lg">
                        {pool.tokenSymbol?.charAt(0) || '?'}
                      </span>
                    )}
                  </div>
                  {/* Token Symbol */}
                  <div className="text-white font-medium text-sm mb-2">
                    {pool.tokenSymbol || 'Unknown'}
                  </div>
                  {/* APY */}
                  <div className="text-[#b1f128] text-sm font-medium">
                    {pool.apy ? `${pool.apy.toFixed(2)}%` : 'N/A'}
                  </div>
                  {/* Arrow Icon */}
                  <IoChevronForwardOutline className="w-4 h-4 text-[#7c7c7c] mt-2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Pool Modal */}
        <CreatePoolModal
          open={isCreateModalOpen}
          onOpenChange={handleModalClose}
        />
      </main>
    </AdminLayout>
  );
}

