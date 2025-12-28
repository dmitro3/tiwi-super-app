"use client";

import Image from "next/image";

interface PoolCardProps {
  tokenName: string;
  tokenIcon: string;
  apy: string;
  onClick?: () => void;
}

export default function PoolCard({
  tokenName,
  tokenIcon,
  apy,
  onClick,
}: PoolCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-[#121712] flex flex-col items-start overflow-clip px-3 py-4 relative rounded-2xl shrink-0 w-full cursor-pointer hover:bg-[#1a1f1a] transition-colors"
    >
      <div className="flex flex-col gap-[30px] items-start relative shrink-0 w-full">
        {/* Header with token icon, name, and arrow */}
        <div className="flex gap-2.5 items-center relative shrink-0 w-full">
          <div className="flex gap-1 items-center relative shrink-0">
            <div className="relative shrink-0 size-7 2xl:size-8">
              <Image
                src={tokenIcon}
                alt={tokenName}
                width={32}
                height={32}
                className="block max-w-none size-full rounded-full"
              />
            </div>
            <p className="font-['Manrope',sans-serif] font-semibold leading-normal relative shrink-0 text-xs text-white">
              {tokenName}
            </p>
          </div>
          <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid justify-items-start leading-0 relative shrink-0 ml-auto">
            <div className="col-[1] ml-0 mt-0 relative row-[1] size-6">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="block max-w-none size-full"
              >
                <path
                  d="M9 18L15 12L9 6"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>
        
        {/* APY */}
        <p className="font-['Manrope',sans-serif] font-medium leading-normal relative shrink-0 text-xl 2xl:text-2xl  text-white w-full whitespace-pre-wrap">
          {apy}
        </p>
      </div>
    </div>
  );
}

