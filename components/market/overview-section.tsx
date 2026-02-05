"use client";
import { Globe } from 'lucide-react';
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
    <div className="w-full h-full flex flex-col lg:flex-row items-start overflow-y-auto px-0 py-6 lg:py-4 xl:py-5 2xl:py-6 market-table-scrollbar">
      {/* About Section - Left Side */}
      <div className="flex-1 flex flex-col gap-[18px] lg:gap-[13px] xl:gap-[15px] 2xl:gap-[18px] items-start min-w-0 px-6 lg:px-7 xl:px-8 2xl:px-10 py-0 text-white">
        <div className="flex justify-between items-center w-full">
          <p className="font-semibold leading-normal text-xl lg:text-base xl:text-lg 2xl:text-xl text-white">
            About
          </p>
        </div>
        <p className="font-medium leading-relaxed w-full text-sm lg:text-xs xl:text-xs 2xl:text-sm tracking-wide text-[#b5b5b5] whitespace-pre-wrap">
          {tokenData.about}
        </p>
      </div>

      {/* Spacer/Separator for desktop */}
      <div className="hidden lg:block w-px h-full bg-[#1f261e]/30 shrink-0 mx-2"></div>

      {/* Token Details Section - Right Side */}
      <div className="flex-1 flex flex-col gap-[18px] lg:gap-[13px] xl:gap-[15px] 2xl:gap-[18px] items-start min-w-0 px-6 lg:px-7 xl:px-8 2xl:px-10 py-0 mt-8 lg:mt-0">
        <p className="font-semibold leading-normal text-xl lg:text-base xl:text-lg 2xl:text-xl text-white">
          Token Details
        </p>

        <div className="flex flex-col gap-4 lg:gap-3 xl:gap-3.5 2xl:gap-4 items-start w-full">
          {/* Token Name */}
          <div className="flex items-center justify-between w-full gap-4">
            <div className="flex gap-2 lg:gap-1.5 xl:gap-1.5 2xl:gap-2 items-center shrink-0">
              <Image
                src="/assets/icons/market/identity-card.svg"
                alt="Token Name"
                width={20}
                height={20}
                className="opacity-60"
              />
              <p className="font-medium text-base lg:text-sm xl:text-sm 2xl:text-base text-[#b5b5b5]">
                Token Name
              </p>
            </div>
            <p className="font-medium text-base lg:text-sm xl:text-sm 2xl:text-base text-white text-right break-all">
              {tokenData.tokenName}
            </p>
          </div>

          {/* Symbol (showing contract truncated) */}
          <div className="flex items-center justify-between w-full gap-4">
            <div className="flex gap-2 lg:gap-1.5 xl:gap-1.5 2xl:gap-2 items-center shrink-0">
              <Image
                src="/assets/icons/market/align-box-middle-center.svg"
                alt="Contract"
                width={20}
                height={20}
                className="opacity-60"
              />
              <p className="font-medium text-base lg:text-sm xl:text-sm 2xl:text-base text-[#b5b5b5]">
                Contract
              </p>
            </div>
            <div className="flex gap-2 items-center">
              <span className="font-medium text-base lg:text-sm xl:text-sm 2xl:text-base text-white">
                {tokenData.contract}
              </span>
              {contractAddress && (
                <button
                  onClick={handleCopyAddress}
                  className="p-1 hover:bg-[#1f261e] rounded transition-colors"
                  title={copied ? "Copied!" : "Copy address"}
                >
                  <Image
                    src="/assets/icons/market/copy-01.svg"
                    alt="Copy"
                    width={14}
                    height={14}
                  />
                </button>
              )}
            </div>
          </div>

          {/* Official X */}
          <div className="flex items-center justify-between w-full gap-4">
            <div className="flex gap-2 lg:gap-1.5 xl:gap-1.5 2xl:gap-2 items-center shrink-0">
              <Image
                src="/assets/icons/market/new-twitter.svg"
                alt="Twitter"
                width={20}
                height={20}
                className="opacity-60"
              />
              <p className="font-medium text-base lg:text-sm xl:text-sm 2xl:text-base text-[#b5b5b5]">
                Official X
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-base lg:text-sm xl:text-sm 2xl:text-base text-white">
                @{tokenSymbol}
              </span>
              <a
                href={
                  tokenData.socials?.find((s: any) => s.type === "twitter")?.url ||
                  `https://x.com/search?q=${encodeURIComponent(tokenData.tokenName)}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 hover:bg-[#1f261e] rounded transition-colors"
              >
                <Image
                  src="/assets/icons/market/share-04.svg"
                  alt="Open"
                  width={14}
                  height={14}
                />
              </a>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px w-full bg-[#1f261e] my-1"></div>

        {/* Market Stats */}
        <div className="flex flex-col gap-4 lg:gap-3 xl:gap-3.5 2xl:gap-4 w-full">
          <div className="flex items-center justify-between w-full">
            <p className="text-base lg:text-sm xl:text-sm 2xl:text-base text-[#b5b5b5]">Market Cap</p>
            <p className="text-base lg:text-sm xl:text-sm 2xl:text-base text-white">{tokenData.marketCap}</p>
          </div>
          <div className="flex items-center justify-between w-full">
            <p className="text-base lg:text-sm xl:text-sm 2xl:text-base text-[#b5b5b5]">Liquidity</p>
            <p className="text-base lg:text-sm xl:text-sm 2xl:text-base text-white text-[#b1f128]">{tokenData.liquidity}</p>
          </div>
          <div className="flex items-center justify-between w-full">
            <p className="text-base lg:text-sm xl:text-sm 2xl:text-base text-[#b5b5b5]">24h Volume</p>
            <p className="text-base lg:text-sm xl:text-sm 2xl:text-base text-white">{tokenData.volume24h}</p>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px w-full bg-[#1f261e] my-1"></div>

        {/* Supply Stats */}
        <div className="flex flex-col gap-4 lg:gap-3 xl:gap-3.5 2xl:gap-4 w-full">
          <div className="flex items-center justify-between w-full">
            <p className="text-base lg:text-sm xl:text-sm 2xl:text-base text-[#b5b5b5]">Circulating Supply</p>
            <p className="text-base lg:text-sm xl:text-sm 2xl:text-base text-white">{tokenData.circulatingSupply}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

