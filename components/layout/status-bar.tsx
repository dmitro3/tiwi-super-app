"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useChains } from "@/hooks/useChains";
import { useTWCPrice } from "@/hooks/useTWCPrice";
import { useLocaleStore } from "@/lib/locale/locale-store";
import { useTranslation } from "@/lib/i18n/useTranslation";
import Skeleton from "@/components/ui/skeleton";
import { SubscriptUSDPrice } from "@/components/ui/subscript-usd-price";
import { ChainsModal } from "./chains-modal";
import { SmartMarketsModal } from "./smart-markets-modal";

interface StatusBarProps {
  smartMarketsCount?: number;
}

export default function StatusBar({
  smartMarketsCount = 20,
}: StatusBarProps) {
  const router = useRouter();
  const { t } = useTranslation();
  useLocaleStore((s) => `${s.language}|${s.currency}`); // re-render when locale changes
  const { chains, isLoading: isLoadingChains } = useChains();
  const { data: twcData, isLoading: isLoadingTWC } = useTWCPrice();
  const activeChainsCount = chains.length;
  const [isChainsModalOpen, setIsChainsModalOpen] = useState(false);
  const [isSmartMarketsModalOpen, setIsSmartMarketsModalOpen] = useState(false);

  // Format TWC price and change
  // Use DexScreener style formatting for price
  const twcPriceUSD = twcData?.priceUSD || '0';
  const twcChange = twcData
    ? `${twcData.priceChange24h >= 0 ? '+' : ''}${twcData.priceChange24h.toFixed(2)}%`
    : "0.00%";
  const twcChangeType = twcData?.changeType || "negative";
  const chainIcons = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const ammIcons = [1, 2, 3, 4, 5, 6, 7];

  const handleTWCClick = () => {
    window.open('/market/TWC-USD?address=0xda1060158f7d593667cce0a15db346bb3ffb3596&chainId=56', '_blank');
  };

  const handleChainsClick = () => {
    setIsChainsModalOpen(true);
  };

  const handleSmartMarketsClick = () => {
    setIsSmartMarketsModalOpen(true);
  };

  // Content component for reuse in mobile animation
  const StatusContent = ({ prefix = "" }: { prefix?: string }) => (
    <div className="flex items-center gap-3 px-4 py-3 shrink-0">
      <div className="flex items-center gap-1">
        {isLoadingChains ? (
          <Skeleton className="h-5 w-12" />
        ) : (
          <span className="text-white font-semibold text-base">
            {activeChainsCount}+
          </span>
        )}
        <span className="text-[#b5b5b5] font-medium text-sm">{t("status.active_chains")}</span>
      </div>
      <div className="h-10 w-px bg-[#1f261e]"></div>
      <button
        onClick={handleTWCClick}
        className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
      >
        <Image
          src="/assets/logos/twc-token.svg"
          alt="TWC"
          width={20}
          height={20}
          className="rounded-full w-5 h-5"
        />
        <span className="text-white font-semibold text-xs">TWC</span>
        {isLoadingTWC ? (
          <>
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-3 w-10" />
          </>
        ) : (
          <>
            <SubscriptUSDPrice
              price={twcPriceUSD}
              className="text-[#b5b5b5] font-medium text-xs whitespace-nowrap"
            />
            <span
              className={`font-medium text-xs whitespace-nowrap ${twcChangeType === "positive" ? "text-[#4ade80]" : "text-[#ff5c5c]"
                }`}
            >
              {twcChange}
            </span>
          </>
        )}
      </button>
      <div className="h-10 w-px bg-[#1f261e]"></div>
      <button
        onClick={handleChainsClick}
        className="flex items-center -space-x-1.5 cursor-pointer hover:opacity-80 transition-opacity"
        aria-label="View all chains"
      >
        {chainIcons.map((chainNum) => (
          <Image
            key={`${prefix}-chain-${chainNum}`}
            src={`/assets/chains/chain-${chainNum}.svg`}
            alt={`Chain ${chainNum}`}
            width={20}
            height={20}
            className="rounded-full border-2 border-[#010501] w-5 h-5"
          />
        ))}
      </button>
      <div className="h-10 w-px bg-[#1f261e]"></div>
      <div className="flex items-center gap-1">
        <span className="text-white font-semibold text-base">
          {smartMarketsCount}+
        </span>
        <span className="text-[#b5b5b5] font-medium text-sm">{t("status.smart_markets")}</span>
      </div>
      <div className="h-10 w-px bg-[#1f261e]"></div>
      <button
        onClick={handleSmartMarketsClick}
        className="flex items-center -space-x-1.5 cursor-pointer hover:opacity-80 transition-opacity"
        aria-label="View all smart markets"
      >
        {ammIcons.map((ammNum) => (
          <Image
            key={`${prefix}-amm-${ammNum}`}
            src={`/assets/amms/amm-${ammNum}.svg`}
            alt={`Market ${ammNum}`}
            width={20}
            height={20}
            className="rounded-full border-2 border-[#010501] w-5 h-5"
          />
        ))}
      </button>
    </div>
  );

  return (
    <div className="border-b border-[#1f261e] bg-[#010501] status-bar">
      {/* Desktop Status Bar */}
      <div className="hidden lg:block">
        <div className="2xl:container mx-auto px-4 sm:px-6 md:px-8 lg:px-10 py-3 sm:py-3.5 md:py-1">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 md:gap-6 lg:gap-8 xl:gap-10">
            {/* Active Chains */}
            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 lg:gap-4 flex-wrap">
              <div className="flex items-center gap-0.5 sm:gap-1">
                {isLoadingChains ? (
                  <Skeleton className="h-5 sm:h-6 w-12" />
                ) : (
                  <span className="text-white font-semibold text-base sm:text-lg">
                    {activeChainsCount}+
                  </span>
                )}
                <span className="text-[#b5b5b5] font-medium text-sm sm:text-base">
                  Active Chains
                </span>
              </div>
              <div className="hidden sm:block h-10 sm:h-11 md:h-12 w-px bg-[#1f261e]"></div>
              <button
                onClick={handleTWCClick}
                className="flex items-center gap-1.5 sm:gap-2 cursor-pointer hover:opacity-80 transition-opacity"
              >
                <Image
                  src="/assets/logos/twc-token.svg"
                  alt="TWC"
                  width={24}
                  height={24}
                  className="rounded-full w-5 h-5 sm:w-6 sm:h-6"
                />
                <span className="text-white font-semibold text-xs sm:text-sm">TWC</span>
                {isLoadingTWC ? (
                  <>
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-12" />
                  </>
                ) : (
                  <>
                    <SubscriptUSDPrice
                      price={twcPriceUSD}
                      className="text-[#b5b5b5] font-medium text-xs sm:text-sm whitespace-nowrap"
                    />
                    <span
                      className={`font-medium text-xs sm:text-sm whitespace-nowrap ${twcChangeType === "positive"
                        ? "text-[#4ade80]"
                        : "text-[#ff5c5c]"
                        }`}
                    >
                      {twcChange}
                    </span>
                  </>
                )}
              </button>
              <div className="hidden sm:block h-10 sm:h-11 md:h-12 w-px bg-[#1f261e]"></div>
              {/* Chain Icons */}
              <button
                onClick={handleChainsClick}
                className="hidden md:flex items-center -space-x-1.5 lg:-space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
                aria-label="View all chains"
              >
                {chainIcons.map((chainNum) => (
                  <Image
                    key={chainNum}
                    src={`/assets/chains/chain-${chainNum}.svg`}
                    alt={`Chain ${chainNum}`}
                    width={24}
                    height={24}
                    className="rounded-full border-2 border-[#010501] w-5 h-5 lg:w-6 lg:h-6"
                  />
                ))}
              </button>
            </div>

            {/* Smart Markets */}
            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 lg:gap-4 flex-wrap">
              <div className="flex items-center gap-0.5 sm:gap-1">
                <span className="text-white font-semibold text-base sm:text-lg">
                  {smartMarketsCount}+
                </span>
                <span className="text-[#b5b5b5] font-medium text-sm sm:text-base">
                  Smart Markets
                </span>
              </div>
              <div className="hidden sm:block h-10 sm:h-11 md:h-12 w-px bg-[#1f261e]"></div>
              {/* Market Icons */}
              <button
                onClick={handleSmartMarketsClick}
                className="hidden md:flex items-center -space-x-1.5 lg:-space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
                aria-label="View all smart markets"
              >
                {ammIcons.map((ammNum) => (
                  <Image
                    key={ammNum}
                    src={`/assets/amms/amm-${ammNum}.svg`}
                    alt={`Market ${ammNum}`}
                    width={24}
                    height={24}
                    className="rounded-full border-2 border-[#010501] w-5 h-5 lg:w-6 lg:h-6"
                  />
                ))}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Status Bar with Auto-Scrolling Animation */}
      <div className="lg:hidden overflow-hidden relative">
        <div className="flex whitespace-nowrap animate-marquee">
          <StatusContent />
          <StatusContent prefix="dup1" />
          <StatusContent prefix="dup2" />
        </div>
      </div>

      {/* Modals */}
      <ChainsModal isOpen={isChainsModalOpen} onClose={() => setIsChainsModalOpen(false)} />
      <SmartMarketsModal isOpen={isSmartMarketsModalOpen} onClose={() => setIsSmartMarketsModalOpen(false)} />
    </div>
  );
}

