"use client";

import PoolCard from "./pool-card";
import { Flame } from "lucide-react";

interface Pool {
  tokenName: string;
  tokenIcon: string;
  apy: string;
}

const recommendedPools: Pool[] = [
  { tokenName: "ZORA", tokenIcon: "/assets/logos/twc-token.svg", apy: "5.30%" },
  { tokenName: "ETH", tokenIcon: "/assets/icons/tokens/ethereum.svg", apy: "5.30%" },
  { tokenName: "BNB", tokenIcon: "/assets/logos/twc-token.svg", apy: "5.30%" },
  { tokenName: "ZORA", tokenIcon: "/assets/logos/twc-token.svg", apy: "5.30%" },
  { tokenName: "ZORA", tokenIcon: "/assets/logos/twc-token.svg", apy: "5.30%" },
  { tokenName: "ETH", tokenIcon: "/assets/icons/tokens/ethereum.svg", apy: "5.30%" },
  { tokenName: "BNB", tokenIcon: "/assets/logos/twc-token.svg", apy: "5.30%" },
  { tokenName: "ZORA", tokenIcon: "/assets/logos/twc-token.svg", apy: "5.30%" },
];

export default function RecommendedPools() {
  return (
    <div className="flex flex-col gap-4 items-start px-10 py-0 relative shrink-0 w-full">
      {/* Header */}
      <div className="flex gap-2.5 h-6 items-center px-0 py-2 relative shrink-0 w-full">
        <div className="flex gap-2.5 h-6 items-center relative shrink-0">
          <div className="relative shrink-0 size-6">
            <Flame className="size-6 text-white" />
          </div>
          <p className="font-['Manrope',sans-serif] font-semibold leading-normal relative shrink-0 text-base text-center text-white">
            Recommended
          </p>
        </div>
      </div>

      {/* Pool Grid - 2 columns */}
      <div className="grid grid-cols-2 gap-4 items-start relative shrink-0 w-full">
        {recommendedPools.map((pool, index) => (
          <PoolCard
            key={index}
            tokenName={pool.tokenName}
            tokenIcon={pool.tokenIcon}
            apy={pool.apy}
          />
        ))}
      </div>
    </div>
  );
}

