"use client";

interface TotalStakedCardProps {
  totalStaked?: string;
}

export default function TotalStakedCard({ totalStaked = "213,111,612 TWC" }: TotalStakedCardProps) {
  return (
    <div className="bg-[#0b0f0a] border-[#273024] border-[0.5px] border-solid h-14 overflow-clip relative rounded-xl shrink-0 w-full">
      {/* Vertical divider - rotated horizontal line */}
      <div className="absolute flex h-12 items-center justify-center left-1/2 top-1/2 translate-x-[-50%] translate-y-[-50%] w-0">
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
      
      {/* Left side - Label */}
      <p className="absolute font-['Manrope',sans-serif] font-medium leading-normal left-[87.5px] lg:left-[calc(50%-220px)] text-[#b1f128] text-base text-center top-[16.5px] tracking-[-0.64px] translate-x-[-50%] w-[150px] whitespace-pre-wrap">
        Total TWC Staked
      </p>
      
      {/* Right side - Value */}
      <p className="absolute font-['Manrope',sans-serif] font-medium leading-normal left-[263.5px] lg:left-[659.5px] text-base text-center text-white top-[16.5px] tracking-[-0.64px] translate-x-[-50%] w-[150px] whitespace-pre-wrap">
        {totalStaked}
      </p>
    </div>
  );
}

