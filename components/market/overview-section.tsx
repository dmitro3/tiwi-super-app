"use client";

import { useState } from "react";
import Image from "next/image";

interface OverviewSectionProps {
  pair: string; // e.g., "BTC/USDT"
  tokenData?: any; // Enriched token data from API
}

function formatLargeNumber(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return 'N/A';
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}

function formatSupply(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return 'N/A';
  return value.toLocaleString();
}

function truncateAddress(address: string): string {
  if (!address || address.length < 12) return address || 'N/A';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Overview Section Component
 * Displays token information, details, and statistics
 */
export default function OverviewSection({ pair, tokenData: tokenInfo }: OverviewSectionProps) {
  const [baseToken] = pair.split("/");
  const [copied, setCopied] = useState(false);

  const tokenName = tokenInfo?.name || baseToken;
  const tokenSymbol = tokenInfo?.symbol || baseToken;
  const contractAddress = tokenInfo?.address || '';
  const chainId = tokenInfo?.chainId;

  // For Binance tokens (chainId=0), show "Binance" as network
  const networkName = chainId === 0 ? 'Binance' : chainId === 56 ? 'BNB Chain' : chainId === 1 ? 'Ethereum' : chainId === 137 ? 'Polygon' : chainId === 42161 ? 'Arbitrum' : chainId === 10 ? 'Optimism' : chainId === 8453 ? 'Base' : chainId === 43114 ? 'Avalanche' : chainId === 250 ? 'Fantom' : chainId ? `Chain ${chainId}` : 'Binance';

  const handleCopyAddress = () => {
    if (contractAddress) {
      navigator.clipboard.writeText(contractAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const defaultDescription = `${tokenName} (${tokenSymbol}) is a cryptocurrency available for trading on ${networkName}. View live price charts, trade ${tokenSymbol}, and track market performance on TIWI Protocol.`;

  const tokenData = {
    about: tokenInfo?.description || defaultDescription,
    tokenName,
    network: networkName,
    contract: truncateAddress(contractAddress),
    marketCap: formatLargeNumber(tokenInfo?.marketCap),
    liquidity: formatLargeNumber(tokenInfo?.liquidity),
    volume24h: formatLargeNumber(tokenInfo?.volume24h),
    circulatingSupply: formatSupply(tokenInfo?.circulatingSupply),
    socials: tokenInfo?.socials || [],
    website: tokenInfo?.website || null,
  };

  return (
    <div className="flex h-[550px] lg:h-[400px] xl:h-[450px] 2xl:h-[550px] items-start overflow-y-auto px-0 py-6 lg:py-4 xl:py-5 2xl:py-6 w-[924px] lg:w-[671px] xl:w-[755px] 2xl:w-[924px]">
      {/* About Section - Left Side */}
      <div className="flex flex-1 flex-col gap-[18px] lg:gap-[13px] xl:gap-[15px] 2xl:gap-[18px] items-start min-h-0 min-w-0 px-10 lg:px-7 xl:px-8 2xl:px-10 py-0 text-white">
        <div className="flex justify-between items-center w-full">
          <p className="font-semibold leading-normal relative shrink-0 text-xl lg:text-base xl:text-lg 2xl:text-xl text-center text-white">
            About
          </p>
          <div className="flex gap-3 items-center">
            {tokenData.website && (
              <a href={tokenData.website} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                <Image src="/assets/icons/home/globe.svg" alt="Website" width={20} height={20} className="opacity-60 hover:opacity-100" />
              </a>
            )}
            {tokenData.socials.map((social: any, i: number) => (
              <a key={i} href={social.url} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                <Image
                  src={social.type === 'twitter' || social.type === 'x' ? '/assets/icons/home/twitter.svg' : '/assets/icons/home/telegram.svg'}
                  alt={social.type}
                  width={20}
                  height={20}
                  className="opacity-60 hover:opacity-100"
                />
              </a>
            ))}
          </div>
        </div>
        <p className="font-medium leading-[1.478] min-w-full relative shrink-0 text-sm lg:text-xs xl:text-xs 2xl:text-sm tracking-[0.56px] whitespace-pre-wrap">
          {tokenData.about}
        </p>
      </div>

      {/* Token Details Section - Right Side */}
      <div className="flex flex-1 flex-col gap-[18px] lg:gap-[13px] xl:gap-[15px] 2xl:gap-[18px] items-start min-h-0 min-w-0 px-10 lg:px-7 xl:px-8 2xl:px-10 py-0">
        <p className="font-semibold leading-normal relative shrink-0 text-xl lg:text-base xl:text-lg 2xl:text-xl text-center text-white">
          Token Details
        </p>

        <div className="flex flex-col gap-4 lg:gap-3 xl:gap-3.5 2xl:gap-4 items-start w-full">
          {/* Token Name */}
          <div className="flex items-start justify-between w-full">
            <div className="flex gap-2 lg:gap-1.5 xl:gap-1.5 2xl:gap-2 items-center">
              <div className="relative shrink-0 size-6 lg:size-4 xl:size-5 2xl:size-6">
                <Image
                  src="/assets/icons/market/identity-card.svg"
                  alt="Token Name"
                  width={24}
                  height={24}
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="font-medium leading-normal relative shrink-0 text-base lg:text-sm xl:text-sm 2xl:text-base text-center text-[#b5b5b5]">
                Token Name
              </p>
            </div>
            <p className="font-medium leading-normal relative shrink-0 text-base lg:text-sm xl:text-sm 2xl:text-base text-center text-white">
              {tokenData.tokenName}
            </p>
          </div>

          {/* Network */}
          <div className="flex items-start justify-between w-full">
            <div className="flex gap-2 lg:gap-1.5 xl:gap-1.5 2xl:gap-2 items-center">
              <div className="relative shrink-0 size-6 lg:size-4 xl:size-5 2xl:size-6">
                <Image
                  src="/assets/icons/market/grid-02.svg"
                  alt="Network"
                  width={24}
                  height={24}
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="font-medium leading-normal relative shrink-0 text-base lg:text-sm xl:text-sm 2xl:text-base text-center text-[#b5b5b5]">
                Network
              </p>
            </div>
            <p className="font-medium leading-normal relative shrink-0 text-base lg:text-sm xl:text-sm 2xl:text-base text-center text-white">
              {tokenData.network}
            </p>
          </div>

          {/* Contract */}
          <div className="flex items-start justify-between w-full">
            <div className="flex gap-2 lg:gap-1.5 xl:gap-1.5 2xl:gap-2 items-center">
              <div className="relative shrink-0 size-6 lg:size-4 xl:size-5 2xl:size-6">
                <Image
                  src="/assets/icons/market/align-box-middle-center.svg"
                  alt="Contract"
                  width={24}
                  height={24}
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="font-medium leading-normal relative shrink-0 text-base lg:text-sm xl:text-sm 2xl:text-base text-center text-[#b5b5b5]">
                Contract
              </p>
            </div>
            <div className="flex gap-2 lg:gap-1.5 xl:gap-1.5 2xl:gap-2 items-center">
              <p className="font-medium leading-normal relative shrink-0 text-base lg:text-sm xl:text-sm 2xl:text-base text-center text-white">
                {tokenData.contract}
              </p>
              <button
                onClick={handleCopyAddress}
                className="relative shrink-0 size-4 lg:size-3 xl:size-3.5 2xl:size-4 cursor-pointer hover:opacity-80 transition-opacity"
                title={copied ? "Copied!" : "Copy address"}
              >
                <Image
                  src="/assets/icons/market/copy-01.svg"
                  alt={copied ? "Copied" : "Copy"}
                  width={16}
                  height={16}
                  className="w-full h-full object-contain"
                />
              </button>
              <div className="flex h-[18px] lg:h-[13px] xl:h-[15px] 2xl:h-[18px] items-center justify-center relative shrink-0 w-0">
                <div className="flex-none rotate-90">
                  <div className="h-0 relative w-[18px] lg:w-[13px] xl:w-[15px] 2xl:w-[18px]">
                    <div className="absolute inset-[-1px_0_0_0]">
                      <div className="h-px w-full bg-[#1f261e]"></div>
                    </div>
                  </div>
                </div>
              </div>
              <button className="relative shrink-0 size-4 lg:size-3 xl:size-3.5 2xl:size-4 cursor-pointer hover:opacity-80 transition-opacity">
                <Image
                  src="/assets/icons/market/share-04.svg"
                  alt="Share"
                  width={16}
                  height={16}
                  className="w-full h-full object-contain"
                />
              </button>
            </div>
          </div>

          {/* Symbol */}
          <div className="flex items-start justify-between w-full">
            <div className="flex gap-2 lg:gap-1.5 xl:gap-1.5 2xl:gap-2 items-center">
              <div className="relative shrink-0 size-6 lg:size-4 xl:size-5 2xl:size-6">
                <Image
                  src="/assets/icons/market/new-twitter.svg"
                  alt="Symbol"
                  width={24}
                  height={24}
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="font-medium leading-normal relative shrink-0 text-base lg:text-sm xl:text-sm 2xl:text-base text-center text-[#b5b5b5]">
                Symbol
              </p>
            </div>
            <p className="font-medium leading-normal relative shrink-0 text-base lg:text-sm xl:text-sm 2xl:text-base text-center text-white">
              {tokenSymbol}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="h-0 relative shrink-0 w-full">
          <div className="absolute inset-[-1px_0_0_0]">
            <div className="h-px w-full bg-[#1f261e]"></div>
          </div>
        </div>

        {/* Market Stats */}
        <div className="flex flex-col gap-4 lg:gap-3 xl:gap-3.5 2xl:gap-4 items-start w-full">
          <div className="flex font-medium items-center justify-between leading-normal relative shrink-0 text-base lg:text-sm xl:text-sm 2xl:text-base text-center w-full">
            <p className="relative shrink-0 text-[#b5b5b5]">Market Cap</p>
            <p className="relative shrink-0 text-white">{tokenData.marketCap}</p>
          </div>
          <div className="flex font-medium items-center justify-between leading-normal relative shrink-0 text-base lg:text-sm xl:text-sm 2xl:text-base text-center w-full">
            <p className="relative shrink-0 text-[#b5b5b5]">Liquidity</p>
            <p className="relative shrink-0 text-white">{tokenData.liquidity}</p>
          </div>
          <div className="flex font-medium items-center justify-between leading-normal relative shrink-0 text-base lg:text-sm xl:text-sm 2xl:text-base text-center w-full">
            <p className="relative shrink-0 text-[#b5b5b5]">24h Volume</p>
            <p className="relative shrink-0 text-white">{tokenData.volume24h}</p>
          </div>
        </div>

        {/* Divider */}
        <div className="h-0 relative shrink-0 w-full">
          <div className="absolute inset-[-1px_0_0_0]">
            <div className="h-px w-full bg-[#1f261e]"></div>
          </div>
        </div>

        {/* Supply Stats */}
        <div className="flex flex-col gap-4 lg:gap-3 xl:gap-3.5 2xl:gap-4 items-start w-full">
          <div className="flex font-medium items-center justify-between leading-normal relative shrink-0 text-base lg:text-sm xl:text-sm 2xl:text-base text-center w-full">
            <p className="relative shrink-0 text-[#b5b5b5]">Circulating Supply</p>
            <p className="relative shrink-0 text-white">{tokenData.circulatingSupply}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

