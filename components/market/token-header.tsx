"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { SubscriptUSDPrice } from "../ui/subscript-usd-price";
import { formatCompactNumber, formatCurrency } from "@/lib/shared/utils/formatters";

interface TokenHeaderProps {
  token: {
    symbol: string;
    pair: string;
    icon: string;
    name?: string;
    marketCap?: number;
    liquidity?: number;
    socials?: any[];
    website?: string;
    description?: string;
    fdv?: number;
    circulatingSupply?: number;
    totalSupply?: number;
    currentPrice?: number;
    volume24h?: number;
    high24h?: number;
    low24h?: number;
  };
  stats: {
    price: string;
    change: string;
    changePositive: boolean;
    vol24h: string;
    high24h: string;
    low24h: string;
  };
}

/**
 * Token Header Component
 * Displays token info, price, 24h stats, and action buttons
 */
export default function TokenHeader({ token, stats }: TokenHeaderProps) {
  console.log("🚀 ~ TokenHeader ~ token:", { token, stats })
  const router = useRouter();

  return (
    <div className="border-b border-[#1f261e] flex h-16 lg:h-14 xl:h-15 2xl:h-16 items-center justify-between px-10 lg:px-7 xl:px-8 2xl:px-10 overflow-x-auto">
      {/* Left: Token Info and Stats */}
      <div className="flex gap-8 lg:gap-5 xl:gap-6 2xl:gap-8 items-center min-w-max">
        {/* Back Arrow + Token */}
        <div className="flex gap-2 xl:gap-1.5 2xl:gap-2 items-center">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-2.5 h-2.5 cursor-pointer hover:opacity-80 transition-opacity"
            aria-label="Go back"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" className="rotate-90">
              <path d="M5 7.5L2.5 5L5 2.5" stroke="#b5b5b5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {token.icon ? (
            <Image
              src={token.icon}
              alt={token.symbol}
              width={32}
              height={32}
              className="w-8 h-8 lg:w-6 lg:h-6 xl:w-7 xl:h-7 2xl:w-8 2xl:h-8 shrink-0 rounded-full"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/assets/icons/tokens/tiwicat.svg";
              }}
            />
          ) : (
            <div className="w-8 h-8 lg:w-6 lg:h-6 xl:w-7 xl:h-7 2xl:w-8 2xl:h-8 shrink-0 rounded-full bg-[#1f261e] flex items-center justify-center text-white text-xs font-bold">
              {token.symbol?.charAt(0) || '?'}
            </div>
          )}
          <p className="text-white text-lg lg:text-sm xl:text-base 2xl:text-lg font-semibold leading-normal whitespace-nowrap">
            {token.symbol}<span className="text-[#b5b5b5]">/{token.pair.split("/")[1] || 'USD'}</span>
          </p>
        </div>

        {/* Separator */}
        <div className="flex h-16 items-center justify-center w-0 border-r border-[#1f261e]"></div>

        {/* Price and Change */}
        <div className="flex flex-col font-semibold items-start justify-center leading-normal text-base lg:text-xs xl:text-sm 2xl:text-base">
          <SubscriptUSDPrice
            price={token.currentPrice}
            className="text-white whitespace-nowrap"
          />
          <p className={`relative shrink-0 whitespace-nowrap text-xs ${stats.changePositive ? "text-[#3fea9b]" : "text-[#ff5c5c]"
            }`}>
            {stats.change}
          </p>
        </div>

        {/* Separator */}
        <div className="flex h-16 items-center justify-center w-0 border-r border-[#1f261e]"></div>

        {/* 24H Vol */}
        <div className="flex flex-col font-semibold items-start justify-center leading-normal text-base lg:text-xs xl:text-sm 2xl:text-base">
          <p className="relative shrink-0 text-white whitespace-nowrap">
            {formatCurrency(token.volume24h, 2)}
          </p>
          <p className="relative shrink-0 text-[#7c7c7c] whitespace-nowrap text-[10px] uppercase tracking-wider">
            24H Vol
          </p>
        </div>

        {/* Separator */}
        <div className="flex h-16 items-center justify-center w-0 border-r border-[#1f261e]"></div>

        {/* Market Cap */}
        <div className="flex flex-col font-semibold items-start justify-center leading-normal text-base lg:text-xs xl:text-sm 2xl:text-base">
          <p className="relative shrink-0 text-white whitespace-nowrap">
            {formatCurrency(token.marketCap, 2)}
          </p>
          <p className="relative shrink-0 text-[#7c7c7c] whitespace-nowrap text-[10px] uppercase tracking-wider">
            Market Cap
          </p>
        </div>

        {/* Separator */}
        <div className="flex h-16 items-center justify-center w-0 border-r border-[#1f261e]"></div>

        {/* 24H High */}
        <div className="flex flex-col font-semibold items-start justify-center leading-normal text-base lg:text-xs xl:text-sm 2xl:text-base">
          <SubscriptUSDPrice
            price={stats.high24h}
            className="text-white whitespace-nowrap"
          />
          <p className="relative shrink-0 text-[#7c7c7c] whitespace-nowrap text-[10px] uppercase tracking-wider">
            24H High
          </p>
        </div>

        {/* Separator */}
        <div className="flex h-16 items-center justify-center w-0 border-r border-[#1f261e]"></div>

        {/* 24H Low */}
        <div className="flex flex-col font-semibold items-start justify-center leading-normal text-base lg:text-xs xl:text-sm 2xl:text-base">
          <SubscriptUSDPrice
            price={stats.low24h}
            className="text-white whitespace-nowrap"
          />
          <p className="relative shrink-0 text-[#7c7c7c] whitespace-nowrap text-[10px] uppercase tracking-wider">
            24H Low
          </p>
        </div>

        {/* Separator */}
        <div className="flex h-16 items-center justify-center w-0 border-r border-[#1f261e]"></div>

        {/* Liquidity */}
        <div className="flex flex-col font-semibold items-start justify-center leading-normal text-base lg:text-xs xl:text-sm 2xl:text-base">
          <p className="relative shrink-0 text-[#b1f128] whitespace-nowrap">
            {formatCurrency(token.liquidity, 2)}
          </p>
          <p className="relative shrink-0 text-[#7c7c7c] whitespace-nowrap text-[10px] uppercase tracking-wider">
            Liquidity
          </p>
        </div>

        {/* Separator */}
        <div className="flex h-16 items-center justify-center w-0 border-r border-[#1f261e]"></div>

        {/* FDV */}
        <div className="flex flex-col font-semibold items-start justify-center leading-normal text-base lg:text-xs xl:text-sm 2xl:text-base">
          <p className="relative shrink-0 text-white whitespace-nowrap">
            {formatCurrency(token.fdv, 2)}
          </p>
          <p className="relative shrink-0 text-[#7c7c7c] whitespace-nowrap text-[10px] uppercase tracking-wider">
            FDV
          </p>
        </div>

        {/* Separator */}
        <div className="flex h-16 items-center justify-center w-0 border-r border-[#1f261e]"></div>

        {/* Circulating Supply */}
        <div className="flex flex-col font-semibold items-start justify-center leading-normal text-base lg:text-xs xl:text-sm 2xl:text-base">
          <p className="relative shrink-0 text-white whitespace-nowrap">
            {formatCompactNumber(token.circulatingSupply, 2)}
          </p>
          <p className="relative shrink-0 text-[#7c7c7c] whitespace-nowrap text-[10px] uppercase tracking-wider">
            Circ Supply
          </p>
        </div>

        {/* Separator */}
        <div className="flex h-16 items-center justify-center w-0 border-r border-[#1f261e]"></div>

        {/* Total Supply */}
        <div className="flex flex-col font-semibold items-start justify-center leading-normal text-base lg:text-xs xl:text-sm 2xl:text-base">
          <p className="relative shrink-0 text-white whitespace-nowrap">
            {formatCompactNumber(token.totalSupply, 2)}
          </p>
          <p className="relative shrink-0 text-[#7c7c7c] whitespace-nowrap text-[10px] uppercase tracking-wider">
            Total Supply
          </p>
        </div>
      </div>

      {/* Right: Action Buttons & Socials */}
      <div className="flex gap-4 lg:gap-3 xl:gap-3.5 2xl:gap-4 items-center shrink-0">
        {/* Social Icons */}
        {/* <div className="flex items-center gap-3 mr-2 border-r border-[#1f261e] pr-4">
          {token.website && (
            <a href={token.website} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
              <Image src="/assets/icons/home/globe.svg" alt="Website" width={18} height={18} className="opacity-60 hover:opacity-100 transition-opacity" />
            </a>
          )}
          {token.socials?.map((social: any, i: number) => (
            <a key={i} href={social.url} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
              <Image
                src={social.type === 'twitter' || social.type === 'x' ? '/assets/icons/home/twitter.svg' : '/assets/icons/home/telegram.svg'}
                alt={social.type}
                width={18}
                height={18}
                className="opacity-60 hover:opacity-100 transition-opacity"
              />
            </a>
          ))}
        </div> */}

        <button
          className="relative w-5 h-5 cursor-pointer hover:opacity-80 transition-opacity"
          aria-label="Add to favorites"
        >
          <Image
            src="/assets/icons/home/star.svg"
            alt="Favorite"
            width={20}
            height={20}
            className="w-full h-full"
          />
        </button>
        <button
          className="relative w-5 h-5 cursor-pointer hover:opacity-80 transition-opacity"
          aria-label="Share"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 8C19.6569 8 21 6.65685 21 5C21 3.34315 19.6569 2 18 2C16.3431 2 15 3.34315 15 5C15 5.12549 15.0077 5.24919 15.0227 5.37063L8.08261 9.79838C7.54305 9.29216 6.80891 9 6 9C4.34315 9 3 10.3431 3 12C3 13.6569 4.34315 15 6 15C6.80891 15 7.54305 14.7078 8.08261 14.2016L15.0227 18.6294C15.0077 18.7508 15 18.8745 15 19C15 20.6569 16.3431 22 18 22C19.6569 22 21 20.6569 21 19C21 17.3431 19.6569 16 18 16C17.1911 16 16.457 16.2922 15.9174 16.7984L8.97727 12.3706C8.99231 12.2492 9 12.1255 9 12C9 11.8745 8.99231 11.7508 8.97727 11.6294L15.9174 7.20162C16.457 7.70784 17.1911 8 18 8Z" stroke="#b5b5b5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

