"use client";

interface TotalStakedCardProps {
  totalStaked?: string;
}

export default function TotalStakedCard({ totalStaked = "213,111,612 TWC" }: TotalStakedCardProps) {
  return (
    <div className="bg-[#0b0f0a] border-[#273024] border-[0.5px] border-solid h-14 overflow-clip relative rounded-xl shrink-0 w-full">
      {/* Use flexbox layout instead of absolute positioning */}
      <div className="flex h-full items-center justify-between px-4 sm:px-6 md:px-8">
        {/* Left side - Label */}
        <p className="font-['Manrope',sans-serif] font-medium leading-normal text-[#b1f128] text-sm sm:text-base text-center mx-auto tracking-[-0.64px] whitespace-pre-wrap">
          Total TWC Staked
        </p>
        
        {/* Vertical divider - rotated horizontal line */}
        <div className="flex h-12 items-center justify-center shrink-0">
          <div className="flex-none rotate-90">
            <div className="h-0 relative w-12">
              <div className="absolute inset-[-1px_0_0_0]">
                <svg
                  width="48"
                  height="1"
                  viewBox="0 0 48 1"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="block max-w-none size-full"
                >
                  <line
                    x1="0"
                    y1="0.5"
                    x2="48"
                    y2="0.5"
                    stroke="#1f261e"
                    strokeWidth="1"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right side - Value */}
        <p className="font-['Manrope',sans-serif] font-medium leading-normal text-base text-center mx-auto text-white tracking-[-0.64px] whitespace-pre-wrap ">
          {totalStaked}
        </p>
      </div>
    </div>
  );
}

