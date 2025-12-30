"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";

interface RewardClaimCardProps {
  onNavigate?: () => void;
}

/**
 * Reward Claim Card Component
 * Displays claimable rewards with gradient background
 * Routes to /earn page
 */
export default function RewardClaimCard({ onNavigate }: RewardClaimCardProps) {
  const router = useRouter();
  const claimableRewards = "$8.52"; // Will come from API

  const handleClick = () => {
    onNavigate?.();
    router.push("/earn");
  };

  return (
    <button
      onClick={handleClick}
      className="border border-[#1f261e] border-solid flex items-center justify-between overflow-clip p-4 lg:p-3 xl:p-3.5 2xl:p-4 relative rounded-2xl lg:rounded-xl xl:rounded-xl 2xl:rounded-2xl shrink-0 w-full cursor-pointer hover:opacity-90 transition-opacity"
    >
      <div className="flex gap-1 lg:gap-0.5 xl:gap-0.5 2xl:gap-1 items-center relative shrink-0">
        <div className="relative shrink-0 size-6 lg:size-4 xl:size-5 2xl:size-6">
          <div className="absolute inset-[12.42%_13.98%_18.51%_13.98%]">
            <Image
              src="/assets/icons/wallet/star18.svg"
              alt="Star"
              width={24}
              height={24}
              className="w-full h-full object-contain"
            />
          </div>
        </div>
        <p className="font-medium leading-normal relative shrink-0 text-lg lg:text-sm xl:text-base 2xl:text-lg text-center text-[#b5b5b5]">
          <span>Claimable Rewards: </span>
          <span className="font-semibold text-white">{claimableRewards}</span>
        </p>
      </div>
      <div className="flex items-center justify-center relative shrink-0 size-6 lg:size-4 xl:size-5 2xl:size-6">
        <div className="flex-none rotate-[90deg] scale-y-[-100%]">
          <div className="relative size-6">
            <Image
              src="/assets/icons/wallet/arrow-right.svg"
              alt="Arrow"
              width={12}
              height={12}
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      </div>
      {/* Gradient Background Image - positioned at bottom of card */}
      <div className="absolute h-[37px] lg:h-[27px] xl:h-[31px] 2xl:h-[37px] left-[calc(50%-13px)] top-[calc(50%+38px)] lg:top-[calc(50%+28px)] xl:top-[calc(50%+32px)] 2xl:top-[calc(50%+38px)] translate-x-[-50%] translate-y-[-50%] w-[146px] lg:w-[106px] xl:w-[120px] 2xl:w-[146px] pointer-events-none z-0">
        <div className="absolute inset-[-216.22%_-54.79%]">
          <Image
            src="/assets/icons/wallet/ellipse1072.png"
            alt="Gradient"
            width={146}
            height={37}
            className="w-full h-full object-contain"
          />
        </div>
      </div>
    </button>
  );
}

