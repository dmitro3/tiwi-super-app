"use client";

import Image from "next/image";
import { TbArrowBarToRight } from "react-icons/tb";
import type { NFT } from "@/lib/backend/types/nft";
import Skeleton from "@/components/ui/skeleton";

interface NFTGridProps {
  nfts: NFT[];
  isLoading?: boolean;
  onNFTSelect: (nft: NFT) => void;
  selectedNFT?: NFT | null;
}

/**
 * NFT Grid Component
 * Displays NFTs in a grid layout with thumbnails, names, and floor prices
 */
export default function NFTGrid({
  nfts,
  isLoading = false,
  onNFTSelect,
  selectedNFT,
}: NFTGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="relative aspect-square w-full rounded-2xl overflow-hidden bg-[#0E1310]"
          >
            <Skeleton className="h-full w-full" />
            <div className="absolute bottom-1 left-2 right-2">
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (nfts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <p className="text-sm text-[#8A929A] mb-2">No NFTs found</p>
        <p className="text-xs text-[#6E7873]">
          Your NFT collection will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {nfts.map((nft) => {
        const isSelected = selectedNFT?.contractAddress === nft.contractAddress &&
                          selectedNFT?.tokenId === nft.tokenId;
        
        // Format floor price
        const floorPrice = nft.floorPrice 
          ? `${parseFloat(nft.floorPrice).toFixed(2)} ETH`
          : "0 ETH";

        return (
          <button
            key={`${nft.contractAddress}-${nft.tokenId}`}
            onClick={() => onNFTSelect(nft)}
            className={`relative group aspect-square w-full rounded-2xl overflow-hidden transition-all duration-300 ${
              isSelected
                ? "ring-2 ring-[#B1F128]"
                : "hover:ring-1 hover:ring-[#ffffff30]"
            }`}
          >
            {/* NFT Image */}
            {nft.image ? (
              <Image
                src={nft.image}
                alt={nft.name}
                width={500}
                height={500}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                onError={(e) => {
                  // Hide image on error, show fallback
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="h-full w-full bg-[#0E1310] flex items-center justify-center">
                <p className="text-[#8A929A] text-sm">No Image</p>
              </div>
            )}

            {/* Glass Card Overlay */}
            <div className="absolute bottom-1 left-2 right-2 flex items-center justify-between rounded-xl border border-white/20 bg-black/20 backdrop-blur-md px-3 py-2 text-left shadow-lg">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white drop-shadow-md truncate">
                  {nft.name}
                </p>
                <p className="text-[10px] font-medium text-[#E0E0E0] drop-shadow-md">
                  Floor: {floorPrice}
                </p>
              </div>

              <div className="text-white/80 shrink-0 ml-2">
                <TbArrowBarToRight />
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}


