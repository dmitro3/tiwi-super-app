"use client";

import Image from "next/image";

interface ExternalWalletIconProps {
  icon: string;
  name: string;
  onClick?: () => void;
}

export default function ExternalWalletIcon({
  icon,
  name,
  onClick,
}: ExternalWalletIconProps) {
  return (
    <button
      onClick={onClick}
      className="bg-[#121712] flex items-center overflow-hidden p-3 sm:p-4 rounded-xl sm:rounded-2xl shrink-0 hover:bg-[#1a1f1a] transition-colors cursor-pointer"
      aria-label={`Connect ${name}`}
    >
      <div className="bg-[#0b0f0a] flex items-center p-1.5 sm:p-2 rounded-full shrink-0">
        <div className="relative size-6 sm:size-8">
          <Image
            src={icon}
            alt={name}
            width={32}
            height={32}
            className="w-full h-full object-contain"
          />
        </div>
      </div>
    </button>
  );
}


