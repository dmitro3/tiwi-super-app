"use client";

import Image from "next/image";
import type { WalletProvider } from "@/lib/wallet/detection/types";

interface WalletItemProps {
  wallet: WalletProvider;
  onClick: () => void;
  showInstallButton?: boolean;
  installUrl?: string;
}

export default function WalletItem({
  wallet,
  onClick,
  showInstallButton = false,
  installUrl,
}: WalletItemProps) {
  return (
    <button
      onClick={onClick}
      className="bg-[#121712] flex gap-2 sm:gap-[10px] items-center overflow-hidden p-3 sm:p-4 rounded-xl sm:rounded-2xl w-full hover:bg-[#1a1f1a] transition-colors cursor-pointer text-left"
    >
      <div className="bg-[#0b0f0a] flex items-center p-2 sm:p-3 rounded-full shrink-0">
        <div className="relative size-5 sm:size-6">
          {wallet.icon ? (
            <div className="text-2xl">{wallet.icon}</div>
          ) : (
            <Image
              src="/assets/icons/wallet/wallet-04.svg"
              alt={wallet.name}
              width={24}
              height={24}
              className="w-full h-full object-contain"
            />
          )}
        </div>
      </div>
      <div className="flex flex-col gap-0.5 sm:gap-1 items-start leading-normal shrink-0 flex-1 min-w-0">
        <p className="font-semibold relative shrink-0 text-base sm:text-lg text-white">
          {wallet.name}
        </p>
        {wallet.installed && (
          <p className="font-medium relative shrink-0 text-[#b1f128] text-sm sm:text-base">
            Installed
          </p>
        )}
        {!wallet.installed && showInstallButton && installUrl && (
          <a
            href={installUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="font-medium relative shrink-0 text-[#b5b5b5] text-sm sm:text-base hover:text-[#b1f128]"
          >
            Install
          </a>
        )}
      </div>
    </button>
  );
}

