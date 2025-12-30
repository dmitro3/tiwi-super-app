"use client";

import Image from "next/image";

interface OverviewSectionProps {
  pair: string; // e.g., "BTC/USDT"
}

/**
 * Overview Section Component
 * Displays token information, details, and statistics
 */
export default function OverviewSection({ pair }: OverviewSectionProps) {
  // Parse pair to get token name
  const [baseToken] = pair.split("/");
  
  // Mock data - will be replaced with API calls
  const tokenData = {
    about: `Bitcoin (BTC) is a decentralized digital currency. Its transactions are verified by network nodes through cryptography and recorded in a public distributed ledger called a blockchain. The process of verification and record, also called mining. Every 10 minutes, the successful miner(as well as network node) finding the new block is allowed by the rest of the network to collect for themselves all transaction fees from transactions they included in the block, as well as a predetermined reward for newly created bitcoins.Bitcoin was invented in 2008 by an unknown person or group of people using the name Satoshi Nakamoto and began to use in 2009, when its implementation was released as open-source software. The word "bitcoin" was defined in a white paper(https://bitcoin.org/bitcoin.pdf) published on October 31, 2008.The Library of Congress reports that, as of November 2021, nine countries have fully banned Bitcoin use, and a further forty-two have implicitly banned it. A few governments have used bitcoin in some capacity. El Salvador has adopted Bitcoin as legal tender, although use by merchants remains low. Ukraine has accepted cryptocurrency donations to fund the resistance to the 2022 Russian invasion. Iran has used bitcoin to bypass sanctions.Recently, Bitcoin has two notable new features. First is Lightning Network(LN), which is a "layer 2" payment protocol that operates on top of Bitcoin and other cryptocurrencies. It aims to facilitate fast transactions among participating nodes and is proposed as a solution to Bitcoin's scalability issues. The Lightning Network allows for micropayments through a network of bidirectional payment channels without requiring the custody of funds to be delegated.Another is Bitcoin Ordinals, which are a relatively new development in the Bitcoin ecosystem, gaining traction especially in April 2023. They are digital assets inscribed on a satoshi, the smallest unit of Bitcoin. This inscription process is made possible by the Taproot upgrade, which was launched on the Bitcoin network on November 14, 2021. Ordinals are similar to Non-Fungible Tokens (NFTs) and allow users to inscribe various types of content like images, videos, and games onto the Bitcoin blockchain.Above are only for introduction, not intended as investment advice.`,
    tokenName: "Bitcoin",
    network: "BTC",
    contract: "0x1111...fc69",
    officialX: "@BTC",
    website: "bitcoin.com",
    marketCap: "$520.98M",
    liquidity: "$2.08T",
    volume24h: "$9.55M",
    circulatingSupply: "4,469,999,998",
    totalSupply: "10,000,000,000",
    maxSupply: "10,000,000,000",
  };

  return (
    <div className="flex h-[550px] lg:h-[400px] xl:h-[450px] 2xl:h-[550px] items-start overflow-y-auto px-0 py-6 lg:py-4 xl:py-5 2xl:py-6 w-[924px] lg:w-[671px] xl:w-[755px] 2xl:w-[924px]">
      {/* About Section - Left Side */}
      <div className="flex flex-1 flex-col gap-[18px] lg:gap-[13px] xl:gap-[15px] 2xl:gap-[18px] items-start min-h-0 min-w-0 px-10 lg:px-7 xl:px-8 2xl:px-10 py-0 text-white">
        <p className="font-semibold leading-normal relative shrink-0 text-xl lg:text-base xl:text-lg 2xl:text-xl text-center text-white">
          About
        </p>
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
              <button className="relative shrink-0 size-4 lg:size-3 xl:size-3.5 2xl:size-4 cursor-pointer hover:opacity-80 transition-opacity">
                <Image
                  src="/assets/icons/market/copy-01.svg"
                  alt="Copy"
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

          {/* Official X */}
          <div className="flex items-start justify-between w-full">
            <div className="flex gap-2 lg:gap-1.5 xl:gap-1.5 2xl:gap-2 items-center">
              <div className="relative shrink-0 size-6 lg:size-4 xl:size-5 2xl:size-6">
                <Image
                  src="/assets/icons/market/new-twitter.svg"
                  alt="Official X"
                  width={24}
                  height={24}
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="font-medium leading-normal relative shrink-0 text-base lg:text-sm xl:text-sm 2xl:text-base text-center text-[#b5b5b5]">
                Official X
              </p>
            </div>
            <div className="flex gap-2 lg:gap-1.5 xl:gap-1.5 2xl:gap-2 items-center">
              <p className="font-medium leading-normal relative shrink-0 text-base lg:text-sm xl:text-sm 2xl:text-base text-center text-white">
                {tokenData.officialX}
              </p>
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

          {/* Website */}
          <div className="flex items-start justify-between w-full">
            <div className="flex gap-2 lg:gap-1.5 xl:gap-1.5 2xl:gap-2 items-center">
              <div className="relative shrink-0 size-6 lg:size-4 xl:size-5 2xl:size-6">
                <Image
                  src="/assets/icons/market/link-03.svg"
                  alt="Website"
                  width={24}
                  height={24}
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="font-medium leading-normal relative shrink-0 text-base lg:text-sm xl:text-sm 2xl:text-base text-center text-[#b5b5b5]">
                Website
              </p>
            </div>
            <div className="flex gap-2 lg:gap-1.5 xl:gap-1.5 2xl:gap-2 items-center">
              <p className="font-medium leading-normal relative shrink-0 text-base lg:text-sm xl:text-sm 2xl:text-base text-center text-white">
                {tokenData.website}
              </p>
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
          <div className="flex font-medium items-center justify-between leading-normal relative shrink-0 text-base lg:text-sm xl:text-sm 2xl:text-base text-center w-full">
            <p className="relative shrink-0 text-[#b5b5b5]">Total Supply</p>
            <p className="relative shrink-0 text-white">{tokenData.totalSupply}</p>
          </div>
          <div className="flex font-medium items-center justify-between leading-normal relative shrink-0 text-base lg:text-sm xl:text-sm 2xl:text-base text-center w-full">
            <p className="relative shrink-0 text-[#b5b5b5]">Max. Supply</p>
            <p className="relative shrink-0 text-white">{tokenData.maxSupply}</p>
          </div>
        </div>
      </div>
      </div>
  );
}

