"use client";

import Image from "next/image";

interface WalletOptionCardProps {
  icon: string;
  title: string;
  description: string;
  onClick?: () => void;
}

export default function WalletOptionCard({
  icon,
  title,
  description,
  onClick,
}: WalletOptionCardProps) {
  return (
    <button
      onClick={onClick}
      className="bg-[#121712] flex gap-[10px] items-center overflow-hidden p-4 rounded-xl w-full hover:bg-[#1a1f1a] transition-colors cursor-pointer text-left"
    >
      <div className="bg-[#0b0f0a] flex items-center p-3 rounded-full shrink-0">
        <div className="relative size-6">
          <Image
            src={icon}
            alt={title}
            width={24}
            height={24}
            className="w-full h-full object-contain"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1 items-start leading-normal shrink-0 flex-1 min-w-0">
        <p className="font-semibold relative shrink-0 text-lg text-white">
          {title}
        </p>
        <p className="font-medium relative shrink-0 text-[#b5b5b5] text-base">
          {description}
        </p>
      </div>
    </button>
  );
}


