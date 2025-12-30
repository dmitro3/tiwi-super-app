"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";

interface ViewPortfolioButtonProps {
  onNavigate?: () => void;
}

/**
 * View Portfolio Button Component
 * Routes to /portfolio page
 */
export default function ViewPortfolioButton({ onNavigate }: ViewPortfolioButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    onNavigate?.();
    router.push("/portfolio");
  };

  return (
    <button
      onClick={handleClick}
      className="bg-[#0b0f0a] border border-[#1f261e] border-solid flex items-center justify-between p-4 lg:p-3 xl:p-3.5 2xl:p-4 relative rounded-2xl lg:rounded-xl xl:rounded-xl 2xl:rounded-2xl shrink-0 w-full cursor-pointer hover:opacity-90 transition-opacity"
    >
      <p className="font-medium leading-normal relative shrink-0 text-lg lg:text-sm xl:text-base 2xl:text-lg text-center text-[#b5b5b5]">
        View Portfolio
      </p>
      <div className="flex items-center justify-center relative shrink-0 size-6 lg:size-4 xl:size-5 2xl:size-6">
        <div className="flex-none rotate-[90deg] scale-y-[-100%]">
          <div className="relative size-6">
            <Image
              src="/assets/icons/wallet/arrow-right.svg"
              alt="Arrow"
              width={24}
              height={24}
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      </div>
    </button>
  );
}

