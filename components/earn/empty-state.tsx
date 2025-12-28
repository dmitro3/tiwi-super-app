"use client";

import Image from "next/image";

interface EmptyStateProps {
  title: string;
  description: string;
  className?: string;
}

export default function EmptyState({ title, description, className = "" }: EmptyStateProps) {
  return (
    <div className={`bg-[rgba(11,15,10,0.4)] overflow-clip relative rounded-2xl shrink-0 w-full ${className}`}>
      <div className="flex flex-col gap-4 items-center justify-center h-full py-8 px-4" style={{ gap: '16px' }}>
        {/* Coin Illustration - Using actual coin.svg icon */}
        <div className="h-[127.817px] relative shrink-0 w-[235px] flex items-center justify-center">
          <Image
            src="/assets/icons/stake/coin.svg"
            alt="Coin"
            width={235}
            height={128}
            className="w-full h-full object-contain"
          />
        </div>
        
        {/* Text */}
        <div className="flex flex-col gap-1 items-center leading-normal relative shrink-0 text-center whitespace-pre-wrap" style={{ gap: '4px' }}>
          <p className="font-['Manrope',sans-serif] font-semibold relative shrink-0 text-[#b5b5b5] text-base w-full">
            {title}
          </p>
          <p className="font-['Manrope',sans-serif] font-normal relative shrink-0 text-[#7c7c7c] text-xs w-full">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

