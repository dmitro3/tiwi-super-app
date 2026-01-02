"use client";

import Image from "next/image";
import { HiOutlineBadgeCheck } from "react-icons/hi";
import { CiStar } from "react-icons/ci";
import type { NFT } from "@/lib/backend/types/nft";
import type { NFTActivity } from "@/lib/backend/types/nft";
import NFTActivityItem from "./nft-activity-item";
import Skeleton from "@/components/ui/skeleton";

interface NFTDetailCardProps {
  nft: NFT | null;
  activities: NFTActivity[];
  activitiesLoading?: boolean;
  onBack: () => void;
}

/**
 * NFT Detail Card Component
 * Displays detailed information about a selected NFT including:
 * - Large image
 * - Name with verification
 * - Creator
 * - Statistics (volume, owners, floor price, chain, listed, creation date)
 * - Recent activities
 */
export default function NFTDetailCard({
  nft,
  activities,
  activitiesLoading = false,
  onBack,
}: NFTDetailCardProps) {
  if (!nft) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <p className="text-sm text-[#8A929A] mb-2">No NFT selected</p>
        <button
          onClick={onBack}
          className="text-xs text-[#B1F128] hover:underline"
        >
          Go back
        </button>
      </div>
    );
  }

  // Format values
  const formatVolume = (volume?: string) => {
    if (!volume) return "0 ETH";
    const num = parseFloat(volume);
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(2)}M ETH`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(2)}K ETH`;
    }
    return `${num.toFixed(2)} ETH`;
  };

  const formatFloorPrice = (price?: string) => {
    if (!price) return "0 ETH";
    return `${parseFloat(price).toFixed(2)} ETH`;
  };

  const formatListed = (listed?: number, listedPercentage?: number) => {
    if (listedPercentage !== undefined) {
      return `${listedPercentage.toFixed(2)}%`;
    }
    if (listed !== undefined) {
      return listed.toString();
    }
    return "N/A";
  };

  const formatCreationDate = (timestamp?: number) => {
    if (!timestamp) return "Unknown";
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  };

  const getChainName = (chainId: number): string => {
    const chainMap: Record<number, string> = {
      1: 'Ethereum',
      56: 'BNB Chain',
      137: 'Polygon',
      42161: 'Arbitrum',
      43114: 'Avalanche',
      8453: 'Base',
      10: 'Optimism',
      250: 'Fantom',
      100: 'Gnosis',
    };
    return chainMap[chainId] || `Chain ${chainId}`;
  };

  // Get creator name (use minter address or collection name)
  const creatorName = nft.minterAddress
    ? `${nft.collectionName || nft.name}_deployer`
    : nft.collectionName || 'Unknown';

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Image Banner */}
      <div className="relative w-full aspect-[2/1] mb-6 rounded-2xl overflow-hidden">
        {nft.image ? (
          <Image
            src={nft.image}
            alt={nft.name}
            width={800}
            height={400}
            className="h-full w-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="h-full w-full bg-[#0E1310] flex items-center justify-center">
            <p className="text-[#8A929A]">No Image</p>
          </div>
        )}
      </div>

      {/* Title and Creator */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-xl font-bold text-white">
            {nft.name}
          </h2>
          <HiOutlineBadgeCheck className="text-[#B1F128]" size={18} />
        </div>
        <p className="text-sm text-[#8A929A]">
          By {creatorName}
        </p>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Row 1 */}
        <div className="text-left">
          <p className="text-white font-medium text-sm">
            {formatVolume(nft.totalVolume)}
          </p>
          <p className="text-[#B5B5B5] text-[10px]">Total volume</p>
        </div>
        <div className="flex justify-center">
          <div className="flex flex-col items-center">
            <p className="text-white font-medium text-sm">
              {nft.owners?.toLocaleString() || "N/A"}
            </p>
            <p className="text-[#B5B5B5] text-[10px]">Owners</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-white font-medium text-sm">
            {formatFloorPrice(nft.floorPrice)}
          </p>
          <p className="text-[#B5B5B5] text-[10px]">Floor price</p>
        </div>

        {/* Row 2 */}
        <div className="text-left">
          <p className="text-white font-medium text-sm">
            {getChainName(nft.chainId)}
          </p>
          <p className="text-[#B5B5B5] text-[10px]">Chain</p>
        </div>
        <div className="flex justify-center">
          <div className="flex flex-col items-center">
            <p className="text-white font-medium text-sm">
              {formatListed(nft.listed, nft.listedPercentage)}
            </p>
            <p className="text-[#B5B5B5] text-[10px]">Listed</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-white font-medium text-sm">
            {formatCreationDate(nft.blockTimestampMinted)}
          </p>
          <p className="text-[#B5B5B5] text-[10px]">Creation date</p>
        </div>
      </div>

      {/* Recent Activities */}
      <div>
        <h3 className="text-xs font-semibold text-[#8A929A] uppercase mb-4 tracking-wide">
          Recent Activities
        </h3>

        {activitiesLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex justify-between items-start">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <div className="text-right space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-[#8A929A]">No activities found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity, index) => (
              <NFTActivityItem key={index} activity={activity} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


