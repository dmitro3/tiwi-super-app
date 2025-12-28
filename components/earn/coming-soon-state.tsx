"use client";

import Image from "next/image";

interface ComingSoonStateProps {
  className?: string;
}

export default function ComingSoonState({ className = "" }: ComingSoonStateProps) {
  return (
    <div className={`bg-[rgba(11,15,10,0.4)] overflow-clip relative rounded-2xl shrink-0 w-full flex items-center justify-center ${className}`}>
      <div className="flex flex-col gap-4 items-center py-8 lg:py-10 px-4 lg:px-12 xl:px-16 2xl:px-20 w-full h-full justify-center">
        {/* Coming Soon Icon - Rotated at 335deg */}
        <div className="flex items-center justify-center relative shrink-0 w-[255.154px] h-[255.154px] max-w-full">
          <div className="flex-none" style={{ transform: 'rotate(335deg)' }}>
            <div className="relative w-[192px] h-[192px] max-w-full">
              <Image
                src="/assets/icons/coming-soon-02.svg"
                alt="Coming Soon"
                width={192}
                height={192}
                className="w-full h-full object-contain"
                onError={(e) => {
                  // Fallback if icon doesn't load
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          </div>
        </div>
        
        {/* Text */}
        <div className="flex flex-col gap-1 items-center leading-normal relative shrink-0 text-center whitespace-pre-wrap" style={{ gap: '4px', width: '235px', maxWidth: '100%' }}>
          <p className="font-['Manrope',sans-serif] font-medium relative shrink-0 text-[#b5b5b5] text-base w-full">
            Coming Soon
          </p>
          <p className="font-['Manrope',sans-serif] font-normal relative shrink-0 text-[#7c7c7c] text-xs w-full">
            We're currently developing this feature and will make it available soon
          </p>
        </div>
      </div>
    </div>
  );
}

