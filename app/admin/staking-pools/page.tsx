"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AdminLayout from "@/components/admin/admin-layout";
import CreatePoolModal from "@/components/admin/create-pool-modal";
import { IoAddOutline, IoSearchOutline } from "react-icons/io5";

const stakingPools = [
  { id: 1, name: "Premium Pool", icon: "★", staked: "$1.2M", apr: "12.5%" },
  { id: 2, name: "Diamond Pool", icon: "💎", staked: "$850K", apr: "15.0%" },
  { id: 3, name: "Gold Pool", icon: "🪙", staked: "$2.1M", apr: "10.8%" },
  { id: 4, name: "Silver Pool", icon: "⭐", staked: "$650K", apr: "9.5%" },
  { id: 5, name: "Elite Pool", icon: "👑", staked: "$3.5M", apr: "18.2%" },
  { id: 6, name: "Standard Pool", icon: "🔷", staked: "$420K", apr: "8.0%" },
  { id: 7, name: "Platinum Pool", icon: "💍", staked: "$1.8M", apr: "14.5%" },
  { id: 8, name: "Crystal Pool", icon: "💠", staked: "$950K", apr: "11.3%" },
  { id: 9, name: "Ruby Pool", icon: "🔴", staked: "$720K", apr: "9.8%" },
  { id: 10, name: "Emerald Pool", icon: "💚", staked: "$1.1M", apr: "13.2%" },
  { id: 11, name: "Sapphire Pool", icon: "💙", staked: "$880K", apr: "10.5%" },
  { id: 12, name: "Topaz Pool", icon: "💛", staked: "$540K", apr: "8.7%" },
  { id: 13, name: "Amethyst Pool", icon: "💜", staked: "$670K", apr: "9.2%" },
  { id: 14, name: "Pearl Pool", icon: "⚪", staked: "$490K", apr: "8.3%" },
  { id: 15, name: "Onyx Pool", icon: "⚫", staked: "$1.3M", apr: "12.8%" },
  { id: 16, name: "Jade Pool", icon: "🟢", staked: "$780K", apr: "10.1%" },
  { id: 17, name: "Coral Pool", icon: "🟠", staked: "$620K", apr: "9.0%" },
  { id: 18, name: "Ivory Pool", icon: "🟡", staked: "$560K", apr: "8.5%" },
  { id: 19, name: "Copper Pool", icon: "🟤", staked: "$450K", apr: "7.8%" },
  { id: 20, name: "Bronze Pool", icon: "🟫", staked: "$380K", apr: "7.2%" },
];

export default function StakingPoolsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <AdminLayout pageTitle="Admin - Staking Pools" activeNavItem="staking-pools">
      <main className="flex-1 overflow-y-auto p-4 lg:p-6">
        {/* Header Section */}
        <div className="mb-6 lg:mb-8">
          <h2 className="text-2xl lg:text-3xl font-semibold text-white mb-2">
            Staking Pools
          </h2>
        </div>

        {/* Search and Create Button */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7c7c7c]" />
            <input
              type="text"
              placeholder="Search pools..."
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
            <span>Create Pool</span>
          </button>
        </div>

        {/* Staking Pools Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {stakingPools.map((pool) => (
            <div
              key={pool.id}
              onClick={() => router.push(`/admin/staking-pools/${pool.id}`)}
              className="bg-[#121712] border border-[#1f261e] rounded-xl p-4 hover:border-[#b1f128] transition-colors cursor-pointer"
            >
              <div className="flex flex-col items-center text-center">
                <div className="text-3xl mb-2">{pool.icon}</div>
                <div className="text-white font-medium text-sm mb-1">{pool.name}</div>
                <div className="text-[#b5b5b5] text-xs mb-1">Staked: {pool.staked}</div>
                <div className="text-[#b1f128] text-xs font-medium">APR: {pool.apr}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Create Pool Modal */}
        <CreatePoolModal
          open={isCreateModalOpen}
          onOpenChange={setIsCreateModalOpen}
        />
      </main>
    </AdminLayout>
  );
}

