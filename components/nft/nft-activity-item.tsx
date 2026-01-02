"use client";

import type { NFTActivity } from "@/lib/backend/types/nft";

interface NFTActivityItemProps {
  activity: NFTActivity;
}

/**
 * NFT Activity Item Component
 * Displays a single activity item (received, sent, mint, etc.)
 */
export default function NFTActivityItem({ activity }: NFTActivityItemProps) {
  // Format price display
  const priceDisplay = activity.priceUSD 
    ? `$${parseFloat(activity.priceUSD).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : activity.price
    ? `${activity.price} ETH`
    : null;

  // Get activity type color
  const getActivityColor = () => {
    switch (activity.type) {
      case 'received':
      case 'mint':
        return 'text-[#B1F128]'; // Green
      case 'sent':
      case 'burn':
        return 'text-[#FF4444]'; // Red
      default:
        return 'text-white';
    }
  };

  return (
    <div className="flex justify-between items-start">
      <div>
        <p className="text-white font-medium text-sm mb-0.5 capitalize">
          {activity.type}
        </p>
        <p className="text-[10px] text-[#8A929A]">{activity.date}</p>
      </div>
      <div className="text-right">
        <p className={`font-medium text-sm mb-0.5 ${getActivityColor()}`}>
          {activity.nftName}
        </p>
        {priceDisplay && (
          <p className="text-[10px] text-[#8A929A]">{priceDisplay}</p>
        )}
      </div>
    </div>
  );
}


