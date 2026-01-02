"use client";

import { useRef, useState, useMemo } from "react";

import Image from "next/image";
import { useWalletConnection } from "@/hooks/useWalletConnection";
import { usePortfolioBalance } from "@/hooks/usePortfolioBalance";
import { useWalletBalances } from "@/hooks/useWalletBalances";
import { useWalletTransactions } from "@/hooks/useWalletTransactions";
import { useWalletNFTs } from "@/hooks/useWalletNFTs";
import { useNFTActivity } from "@/hooks/useNFTActivity";
import { mapWalletTokensToAssets } from "@/lib/shared/utils/portfolio-formatting";
import NFTGrid from "@/components/nft/nft-grid";
import NFTDetailCard from "@/components/nft/nft-detail-card";
import type { NFT } from "@/lib/backend/types/nft";
import type { Transaction } from "@/lib/backend/types/wallet";
import Skeleton from "@/components/ui/skeleton";
import {
  IoEyeOutline,
  IoChevronDown,
  IoArrowBack,
  IoClose,
} from "react-icons/io5";
import { RiSendPlaneLine } from "react-icons/ri";
import { HiDownload } from "react-icons/hi";
import { MdHistory } from "react-icons/md";
import { FaArrowUp } from "react-icons/fa";
import { BsWallet2 } from "react-icons/bs";
import { FiCopy, FiCheck } from "react-icons/fi";
import { GoShareAndroid } from "react-icons/go";
// import { IoFolderOpenOutline } from "react-icons/io5";
import { CiStar } from "react-icons/ci";
import { HiOutlineBadgeCheck } from "react-icons/hi";
import { TbArrowBarToRight } from "react-icons/tb";

// Using string paths for public assets
const bearish = "/bearish.svg";
const bullish = "/bullish.svg";

const bitcoin = "/assets/icons/chains/bitcoin.svg";
const bnb = "/assets/icons/chains/bsc.svg";
const solana = "/assets/icons/tokens/solana.svg";
const ethereum = "/assets/icons/tokens/ethereum.svg";
const ether = "/assets/icons/tokens/ethereum.svg";

// --- SHARED DATA ---
const balance = "4,631.21";
const assets = [
  {
    name: "Bitcoin",
    symbol: "BTC",
    amount: "0.01912343",
    value: "$10,234.23",
    icon: bitcoin,
    trend: "bearish",
  },
  {
    name: "Solana",
    symbol: "SOL",
    amount: "20,000.85",
    value: "$10,234.23",
    icon: solana,
    trend: "bullish",
  },
  {
    name: "BNB Smart Chain",
    symbol: "BNB",
    amount: "1,580.8565",
    value: "$10,234.23",
    icon: bnb,
    trend: "bearish",
  },
  {
    name: "Ethereum",
    symbol: "ETH",
    amount: "0.15828",
    value: "$10,234.23",
    icon: ethereum,
    trend: "bullish",
  },
  {
    name: "Ethereum",
    symbol: "ETH",
    amount: "0.15828",
    value: "$10,234.23",
    icon: ether,
    trend: "bullish",
  },
];
// Mock NFTs removed - using real data from useWalletNFTs hook
// Mock transactions removed - using real data from useWalletTransactions hook

// ==========================================
//  TRANSACTION ROW COMPONENT (Matches Figma Design)
// ==========================================
function TransactionRow({ transaction }: { transaction: Transaction }) {
  const isReceived = transaction.type === "Received" || transaction.type.toLowerCase().includes("receive");
  const amountText = `${transaction.amountFormatted} ${transaction.tokenSymbol}`.toUpperCase();
  const usdValue = transaction.usdValue
    ? `$${parseFloat(transaction.usdValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "";

  // Content matching Figma design exactly
  const content = (
    <div className="flex justify-between items-start w-full">
      <div className="flex flex-col gap-1">
        <span className="text-lg font-bold text-white capitalize">
          {transaction.type}
        </span>
        <span className="text-base font-medium text-[#B5B5B5]">
          {transaction.date}
        </span>
      </div>
      <div className="flex flex-col gap-1 items-end">
        <span
          className={`text-lg font-medium uppercase ${isReceived ? "text-[#498F00]" : "text-white"
            }`}
        >
          {amountText}
        </span>
        {usdValue && (
          <span className="text-base font-medium text-[#B5B5B5]">
            {usdValue}
          </span>
        )}
      </div>
    </div>
  );

  // If explorer URL exists, wrap in link (opens in new tab)
  if (transaction.explorerUrl) {
    return (
      <a
        href={transaction.explorerUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block hover:opacity-80 transition-opacity cursor-pointer"
      >
        {content}
      </a>
    );
  }

  // If no explorer URL, return content without link
  return content;
}

// ==========================================
//  DESKTOP VIEW COMPONENT
// ==========================================
function WalletPageDesktop() {
  type RightTab = "send" | "receive" | "activities";
  type SendTab = "single" | "multi";
  type LeftTab = "assets" | "nft";

  const [activeTab, setActiveTab] = useState<RightTab>("send");
  const [activeSendTab, setActiveSendTab] = useState<SendTab>("single");
  const [sendStep, setSendStep] = useState<"form" | "confirm">("form");
  const [activeLeftTab, setActiveLeftTab] = useState<LeftTab>("assets");

  const [selectedNft, setSelectedNft] = useState<(typeof nfts)[number] | null>(
    null
  );

  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);

  // Get connected wallet address
  const { connectedAddress } = useWalletConnection();

  // Fetch portfolio balance and daily change
  const {
    data: balanceData,
    isLoading: balanceLoading,
    error: balanceError
  } = usePortfolioBalance(connectedAddress);

  // Fetch wallet token balances
  const {
    balances: walletTokens,
    isLoading: tokensLoading,
    error: tokensError
  } = useWalletBalances(connectedAddress);

  // Fetch wallet transactions
  const {
    transactions,
    isLoading: transactionsLoading,
    error: transactionsError
  } = useWalletTransactions(connectedAddress, { limit: 50 });

  // Fetch wallet NFTs
  const {
    nfts,
    isLoading: nftsLoading,
    error: nftsError
  } = useWalletNFTs(connectedAddress);

  // Fetch NFT activity when an NFT is selected
  const {
    activities,
    isLoading: activitiesLoading
  } = useNFTActivity(
    connectedAddress,
    selectedNft?.contractAddress || null,
    selectedNft?.tokenId || null,
    selectedNft?.chainId || null
  );

  // Map wallet tokens to portfolio assets format
  const assets = useMemo(() => {
    if (!walletTokens || walletTokens.length === 0) return [];
    return mapWalletTokensToAssets(walletTokens, {
      includeZeroBalances: false,
      sortBy: 'value',
    });
  }, [walletTokens]);

  // Use real balance data or fallback to mock for development
  const displayBalance = balanceData?.totalUSD || "0.00";
  const dailyChangeText = balanceData?.dailyChangeFormatted;
  const dailyChangeColor = balanceData?.dailyChangeColor || '#3FEA9B';

  const handleCopy = async () => {
    if (!inputRef.current) return;

    await navigator.clipboard.writeText(inputRef.current.value);
    setCopied(true);

    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <section className="mt-4 md:mt-12 py-4">
      <div className="rounded-2xl flex w-full md:gap-2 md:max-w-232 mx-auto bg-[#121712]">
        {/* LEFT PANEL */}
        <div className="relative rounded-2xl border border-[#121712] bg-[#010501] font-manrope p-2 w-full max-w-98 h-150 flex flex-col">
          <div className="pointer-events-none absolute inset-x-4 bottom-px h-px rounded-full bg-[linear-gradient(to_right,rgba(177,241,40,0),rgba(177,241,40,0.95),rgba(177,241,40,0))]" />
          {/* Balance */}
          <div className="ml-5 mb-6">
            <span className="flex items-center gap-2">
              <p className="text-xs text-[#B5B5B5]">Total Balance</p>
              <IoEyeOutline color="B5B5B5" size={10} />
            </span>
            {balanceLoading ? (
              <div className="mt-1 space-y-2">
                <Skeleton className="h-9 w-32" />
                <Skeleton className="h-5 w-40" />
              </div>
            ) : balanceError ? (
              <>
                <h1 className="mt-1 text-3xl font-bold text-[#E6ECE9]">$0.00</h1>
                <p className="mt-1 text-sm text-[#FF4444]">
                  Error loading balance
                </p>
              </>
            ) : (
              <>
                <h1 className="mt-1 text-3xl font-bold text-[#E6ECE9]">
                  ${displayBalance}
                </h1>
                {dailyChangeText ? (
                  <p className="mt-1 text-sm" style={{ color: dailyChangeColor }}>
                    {dailyChangeText} <span className="text-[#9DA4AE]">today</span>
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-[#9DA4AE]">
                    No change data available
                  </p>
                )}
              </>
            )}
          </div>

          {/* Tabs */}
          <div className="mb-4 flex justify-between items-center gap-2">
            <div className="bg-[#1B1B1B] rounded-full">
              <button
                onClick={() => setActiveLeftTab("assets")}
                className={`cursor-pointer rounded-full font-semibold text-base px-4 py-1 ${activeLeftTab === "assets"
                    ? "bg-[#081F02] text-[#B1F128]"
                    : "text-[#6E7873]"
                  }`}
              >
                Assets
              </button>
              <button
                onClick={() => setActiveLeftTab("nft")}
                className={`cursor-pointer rounded-full font-semibold text-base px-4 py-1 ${activeLeftTab === "nft"
                    ? "bg-[#081F02] text-[#B1F128]"
                    : "text-[#6E7873]"
                  }`}
              >
                NFTs
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Image
                src="/assets/icons/search-01.svg"
                alt=""
                width={20}
                height={20}
                className="bg-[#1B1B1B] p-1 rounded-full"
              />
              {/* TOGGLE FILTER BUTTON */}
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="bg-[#1B1B1B] h-5 w-5 flex items-center justify-center rounded-full cursor-pointer transition-colors hover:bg-[#252525]"
              >
                {isFilterOpen ? (
                  <IoClose size={14} className="text-[#B5B5B5]" />
                ) : (
                  <Image
                    src="/filter.svg"
                    alt=""
                    width={20}
                    height={20}
                    className="p-0.5"
                  />
                )}
              </button>
            </div>
          </div>

          <div className="overflow-y-auto flex-1">
            {/* Asset List */}
            {activeLeftTab === "assets" && (
              <>
                {tokensLoading ? (
                  <ul className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <li
                        key={i}
                        className="grid grid-cols-[20px_120px_80px_1fr] gap-3 items-center rounded-xl bg-[#0E1310] px-2 py-3"
                      >
                        <Skeleton className="h-5 w-5 rounded-full" />
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-16" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                        <div className="flex justify-start">
                          <Skeleton className="h-7 w-20" />
                        </div>
                        <div className="text-right space-y-1">
                          <Skeleton className="h-4 w-16" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : tokensError ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <p className="text-sm text-[#FF4444] mb-2">
                      Error loading assets
                    </p>
                    <p className="text-xs text-[#8A929A]">
                      {tokensError}
                    </p>
                  </div>
                ) : assets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <p className="text-sm text-[#8A929A] mb-2">
                      No assets found
                    </p>
                    <p className="text-xs text-[#6E7873]">
                      Start by swapping tokens to build your portfolio
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {assets.map((asset, i) => (
                      <li
                        key={i}
                        className="grid grid-cols-[20px_120px_80px_1fr] gap-3 items-center rounded-xl bg-[#0E1310] px-2 py-3 hover:bg-[#141A16]"
                      >
                        {/* Column 1: Logo */}
                        <div className="shrink-0 flex items-center justify-start">
                          <Image
                            src={asset.icon}
                            alt={`${asset.symbol} icon`}
                            width={20}
                            height={20}
                            className="opacity-90"
                          />
                        </div>

                        {/* Column 2: Symbol and Name (Fixed width to keep chart aligned) */}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#FFFFFF] truncate">
                            {asset.symbol}
                          </p>
                          <p className="text-xs text-[#8A929A] truncate">{asset.name}</p>
                        </div>

                        {/* Column 3: Chart (Fixed position, justify-start) */}
                        <div className="flex justify-start shrink-0">
                          <Image
                            src={asset.trend === "bearish" ? bearish : bullish}
                            alt={`${asset.symbol} chart`}
                            width={80}
                            height={28}
                            className="opacity-90"
                          />
                        </div>

                        {/* Column 4: Amount and USD Value (Right-aligned) */}
                        <div className="text-right min-w-0">
                          <p className="text-sm font-medium text-[#FFF] break-all">
                            {asset.amount}
                          </p>
                          <p className="text-xs text-[#8A929A]">{asset.value}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            {/* NFT GRID */}
            {activeLeftTab === "nft" && (
              <NFTGrid
                nfts={nfts}
                isLoading={nftsLoading}
                onNFTSelect={setSelectedNft}
                selectedNFT={selectedNft}
              />
            )}
          </div>

          {/* FILTER DROPDOWN OVERLAY */}
          {isFilterOpen && (
            <div className="absolute top-35 right-2 z-50 w-70 rounded-3xl bg-[#0B0F0A] p-5 shadow-[0_20px_40px_rgba(0,0,0,0.8)] border border-[#1B1B1B]">
              {/* Section 1: Sort By */}
              <div className="mb-5">
                <h3 className="text-sm font-medium text-white mb-3">Sort By</h3>
                <div className="space-y-2">
                  {["Highest Value → Lowest", "Recent Activity"].map(
                    (label, i) => (
                      <label
                        key={i}
                        className="flex items-center gap-3 cursor-pointer group"
                      >
                        <input
                          type="radio"
                          name="sort"
                          className="peer sr-only"
                        />
                        <div className="w-4 h-4 rounded border border-[#3E453E] peer-checked:border-[#B1F128] peer-checked:bg-[#B1F128] transition-colors" />
                        <span className="text-xs text-[#B5B5B5] group-hover:text-white transition-colors">
                          {label}
                        </span>
                      </label>
                    )
                  )}
                </div>
              </div>

              {/* Token Category */}
              <div className="mb-5">
                <h3 className="text-sm font-medium text-white mb-3">
                  Token Category
                </h3>
                <div className="grid grid-cols-2 gap-x-2 gap-y-2">
                  {["DeFi Tokens", "Gaming", "Meme Coins", "New Listings"].map(
                    (label, i) => (
                      <label
                        key={i}
                        className="flex items-center gap-3 cursor-pointer group"
                      >
                        <input type="checkbox" className="peer sr-only" />
                        <div className="w-4 h-4 rounded border border-[#3E453E] peer-checked:border-[#B1F128] peer-checked:bg-[#B1F128] shrink-0" />
                        <span className="text-xs text-[#B5B5B5] group-hover:text-white transition-colors whitespace-nowrap">
                          {label}
                        </span>
                      </label>
                    )
                  )}
                </div>
              </div>

              {/* Section 3: Chain */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-white mb-3">Chain</h3>
                <div className="grid grid-cols-2 gap-x-2 gap-y-2">
                  {["BSC", "Polygon", "Ethereum", "Solana"].map((label, i) => (
                    <label
                      key={i}
                      className="flex items-center gap-3 cursor-pointer group"
                    >
                      <input type="checkbox" className="peer sr-only" />
                      <div className="w-4 h-4 rounded border border-[#3E453E] peer-checked:border-[#B1F128] peer-checked:bg-[#B1F128] shrink-0" />
                      <span className="text-xs text-[#B5B5B5] group-hover:text-white transition-colors">
                        {label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Reset Button */}
              <button className="w-full bg-[#B1F128] text-[#010501] font-semibold text-sm py-3 rounded-full hover:opacity-90 transition-opacity">
                Reset filters
              </button>
            </div>
          )}
        </div>

        {/* RIGHT PANEL */}
        <div className="pt-2 w-full max-w-125 mx-auto font-manrope relative">
          <div className="pointer-events-none absolute inset-x-4 bottom-px h-px rounded-full bg-[linear-gradient(to_right,rgba(177,241,40,0),rgba(177,241,40,0.95),rgba(177,241,40,0))]" />
          {/* Top Actions */}
          <div className="bg-[#010501] p-1 rounded-2xl relative mb-6">
            <div className="pointer-events-none absolute inset-x-4 bottom-px h-px rounded-full bg-[linear-gradient(to_right,rgba(177,241,40,0),rgba(177,241,40,0.95),rgba(177,241,40,0))]" />
            <div className="grid grid-cols-3 gap-1">
              <button
                onClick={() => setActiveTab("send")}
                className={`flex h-full w-full cursor-pointer items-center justify-center gap-2 rounded-2xl py-3.25 text-sm font-medium transition
                ${activeTab === "send"
                    ? "bg-[#081F02] text-[#B1F128]"
                    : "bg-[#0B0F0A] text-[#B5B5B5]"
                  }`}
              >
                <RiSendPlaneLine size={16} />
                Send
              </button>

              <button
                onClick={() => setActiveTab("receive")}
                className={`flex h-full w-full cursor-pointer items-center justify-center gap-2 rounded-2xl py-3.25 text-sm font-medium transition
                ${activeTab === "receive"
                    ? "bg-[#081F02] text-[#B1F128]"
                    : "bg-[#0B0F0A] text-[#B5B5B5]"
                  }`}
              >
                <HiDownload size={16} />
                Receive
              </button>

              <button
                onClick={() => setActiveTab("activities")}
                className={`flex h-full w-full cursor-pointer items-center justify-center gap-2 rounded-2xl py-3.25 text-sm font-medium transition
                  ${activeTab === "activities"
                    ? "bg-[#081F02] text-[#B1F128]"
                    : "bg-[#0B0F0A] text-[#B5B5B5]"
                  }`}
              >
                <MdHistory size={16} />
                Activities
              </button>
            </div>
          </div>

          {/* NFT TAB RIGHT PANEL DISPLAY */}
          {activeLeftTab === "nft" && (
            <div className="">
              <NFTDetailCard
                nft={selectedNft}
                activities={activities}
                activitiesLoading={activitiesLoading}
                onBack={() => setSelectedNft(null)}
              />
            </div>
          )}

          {/* ASSETS TAB RIGHT PANEL DISPLAY */}
          {activeLeftTab === "assets" && (
            <>
              {/* Send tab content */}
              {activeTab === "send" && (
                <>
                  {/* Asset Header with Go Back button */}
                  <div className="mb-2 flex items-start justify-between">
                    <div>
                      <span className="flex items-center gap-2">
                        <Image src={ethereum} alt="" width={20} height={20} />
                        <p className="text-sm text-[#FFF]">Ethereum</p>
                      </span>
                      <p className="text-xl text-[#FFF] font-medium">
                        0.01912343
                      </p>
                      <div className="text-xs flex gap-2 items-center">
                        <p className="text-[#8A929A]">$10,234.23</p>
                        <span className="text-[#34C759] flex">
                          <FaArrowUp
                            size={16}
                            className="bg-[#1B1B1B] p-1 rounded-full"
                          />
                          0.10%
                        </span>
                        <p className="text-[#B5B5B5]">Today</p>
                      </div>
                    </div>

                    {/* Go Back button - only shown in confirm step */}
                    {sendStep === "confirm" && (
                      <button
                        onClick={() => setSendStep("form")}
                        className="cursor-pointer flex items-center gap-2 rounded-md border border-[#B1F128] px-3 py-1.5 text-xs text-[#B1F128]"
                      >
                        <IoArrowBack size={14} />
                        Go Back
                      </button>
                    )}
                  </div>

                  {/* Form Step */}
                  {sendStep === "form" && (
                    <>
                      {/* Send Form */}
                      <div className="mb-2 space-y-2">
                        <div className="bg-[#010501] flex items-center justify-around gap-1 px-2 py-4 rounded-2xl">
                          <button
                            onClick={() => setActiveSendTab("single")}
                            className={`flex h-full cursor-pointer px-6 items-center justify-center gap-2 pb-1 text-sm font-medium
                           ${activeSendTab === "single"
                                ? "border-b-[1.5px] border-[#B1F128] text-[#B1F128]"
                                : "border-b-[1.5px] border-transparent text-[#B5B5B5]"
                              }`}
                          >
                            Send To One
                          </button>

                          <button
                            onClick={() => setActiveSendTab("multi")}
                            className={`flex h-full cursor-pointer px-6 items-center justify-center gap-2 pb-1 text-sm font-medium
                           ${activeSendTab === "multi"
                                ? "border-b-[1.5px] border-[#B1F128] text-[#B1F128]"
                                : "border-b-[1.5px] border-transparent text-[#B5B5B5]"
                              }`}
                          >
                            Multi-Send
                          </button>
                        </div>

                        <div className="flex items-center justify-between rounded-xl bg-[#0B0F0A] px-4 py-3">
                          {/* crypto dropdown */}
                          <details className="bg-[#121712] rounded-full group relative w-fit">
                            {/* Trigger */}
                            <summary className="flex cursor-pointer list-none items-center gap-3 rounded-full bg-[#121712] px-2 py-3 text-left outline-none">
                              {/* Icon */}
                              <Image
                                src={ethereum}
                                alt="Ethereum"
                                width={36}
                                height={36}
                                className="shrink-0"
                              />

                              {/* Text */}
                              <div className="leading-tight">
                                <p className="text-sm font-semibold text-[#FFF]">
                                  ETH
                                </p>
                                <p className="text-xs font-medium text-[#7C7C7C]">
                                  Ethereum
                                </p>
                              </div>
                              <IoChevronDown
                                size={16}
                                className="ml-2 text-[#B5B5B5] transition-transform group-open:rotate-180"
                              />
                            </summary>

                            {/* Dropdown menu */}
                            <div className="absolute left-0 z-10 mt-2 w-full min-w-55 rounded-xl bg-[#0B0F0A] p-2 shadow-[0_10px_30px_rgba(0,0,0,0.6)]">
                              <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 hover:bg-[#141A16]">
                                <Image
                                  src={ethereum}
                                  alt=""
                                  width={24}
                                  height={24}
                                />
                                <span className="text-sm text-[#E6ECE9]">
                                  Ethereum
                                </span>
                              </button>

                              {/* Add more assets here */}
                            </div>
                          </details>

                          <div>
                            <span className="flex items-center gap-1">
                              <BsWallet2 size={10} />
                              <p className="text-xs text-[#B5B5B5]">
                                0.0342ETH
                              </p>
                              <p className="text-[#B1F128] text-xs py-1 px-2 ml-1 rounded-full bg-[#1F261E]">
                                Max
                              </p>
                            </span>
                            <p className="text-right text-[#7C7C7C] font-medium text-xl">
                              11.496
                            </p>
                            <p className="text-right text-[#7C7C7C] font-medium text-xs">
                              $0
                            </p>
                          </div>
                        </div>

                        {activeSendTab === "single" ? (
                          <>
                            <div className="rounded-xl bg-[#0B0F0A] px-4 py-5">
                              <p className="font-semibold text-xs mb-2">To:</p>
                              <span className="relative w-full">
                                <input
                                  ref={inputRef}
                                  placeholder="Enter Wallet Address"
                                  className="w-full rounded-xl bg-[#010501] px-4 py-5 text-sm text-[#E6ECE9] placeholder-[#6E7873] outline-none focus:ring-1 focus:ring-[#B1F128]"
                                />
                                {/* copy icon */}
                                <button
                                  type="button"
                                  onClick={handleCopy}
                                  className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer"
                                >
                                  {copied ? (
                                    <FiCheck size={18} />
                                  ) : (
                                    <FiCopy size={18} />
                                  )}
                                </button>
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="rounded-xl bg-[#0B0F0A] px-4 py-5">
                              <p className="font-normal text-xs mb-2 text-[#B5B5B5]">
                                Add multiple wallet addresses or upload a list.
                              </p>
                              <span className="relative w-full">
                                <input
                                  placeholder="Enter Wallet Addresses"
                                  className="w-full rounded-xl bg-[#010501] px-4 py-5 text-sm text-[#E6ECE9] placeholder-[#6E7873] outline-none focus:ring-1 focus:ring-[#B1F128]"
                                />
                                {/* copy icon */}
                                <button
                                  type="button"
                                  className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer"
                                >
                                  <FiCopy size={18} />
                                </button>
                              </span>
                            </div>

                            <button className="cursor-pointer w-full rounded-full border border-[#B1F128] bg-transparent py-2 text-sm font-medium text-[#B1F128] flex items-center justify-center gap-2">
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 16 16"
                                fill="none"
                              >
                                <path
                                  d="M14 10v2.667A1.333 1.333 0 0112.667 14H3.333A1.333 1.333 0 012 12.667V10m9.333-5.333L8 1.333m0 0L4.667 4.667M8 1.333v9.334"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                              Attach CSV File
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => setSendStep("confirm")}
                          className="cursor-pointer w-full rounded-full bg-[#B1F128] py-2 text-base font-semibold text-[#010501]"
                        >
                          Next
                        </button>
                      </div>
                    </>
                  )}

                  {/* Confirm Step */}
                  {sendStep === "confirm" && (
                    <>
                      {/* Confirm Header */}
                      <div className="bg-[#0B0F0A] px-4 py-4 rounded-2xl mb-2">
                        <p className="text-center text-sm text-[#B5B5B5]">
                          Confirm
                        </p>
                      </div>

                      {/* Transaction Details */}
                      <div className="space-y-2 mb-2">
                        {activeSendTab === "single" ? (
                          <>
                            <div className="rounded-xl bg-[#010501] px-4 py-4">
                              <p className="text-xs text-[#B5B5B5] mb-1">
                                From
                              </p>
                              <p className="text-sm text-[#B5B5B5]">
                                0x06187ejie9urourT432
                              </p>

                              <div className="mt-5 flex justify-between items-start">
                                <div>
                                  <p className="text-xs text-[#B5B5B5] mb-1">
                                    To:
                                  </p>
                                  <p className="text-sm text-[#B5B5B5]">
                                    0x06187ejie9urourT432
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-[#B5B5B5] mb-1">
                                    Network
                                  </p>
                                  <p className="text-sm text-[#B5B5B5]">ETH</p>
                                </div>
                              </div>
                            </div>

                            <div className="rounded-xl bg-[#010501] px-4 py-2 flex justify-between items-center">
                              <span className="flex items-center gap-2">
                                <p className="text-sm text-[#B5B5B5]">
                                  Network Fee:
                                </p>
                                <span className="text-[#B5B5B5]">
                                  <svg
                                    width="12"
                                    height="12"
                                    viewBox="0 0 12 12"
                                    fill="none"
                                  >
                                    <circle
                                      cx="6"
                                      cy="6"
                                      r="5.5"
                                      stroke="currentColor"
                                    />
                                    <text
                                      x="6"
                                      y="8.5"
                                      fontSize="8"
                                      textAnchor="middle"
                                      fill="currentColor"
                                    >
                                      i
                                    </text>
                                  </svg>
                                </span>
                              </span>
                              <div className="text-right">
                                <p className="text-sm text-[#B5B5B5]">0.1ETH</p>
                                <p className="text-xs text-[#B5B5B5]">$0.044</p>
                              </div>
                            </div>

                            <button className="cursor-pointer w-full rounded-full bg-[#B1F128] py-2 text-base font-semibold text-[#010501]">
                              Confirm
                            </button>
                          </>
                        ) : (
                          <>
                            <div className="rounded-xl bg-[#010501] px-4 py-4 space-y-4">
                              <div>
                                <p className="text-xs text-[#B5B5B5] mb-1">
                                  Total Recipients
                                </p>
                                <p className="text-sm text-[#B5B5B5]">12</p>
                              </div>

                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-xs text-[#B5B5B5] mb-1">
                                    Amount Per Recipient
                                  </p>
                                  <p className="text-sm text-[#B5B5B5]">
                                    10.0 ETH
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-[#B5B5B5] mb-1">
                                    Network
                                  </p>
                                  <p className="text-sm text-[#B5B5B5]">ETH</p>
                                </div>
                              </div>
                            </div>

                            <div className="rounded-xl bg-[#010501] px-4 py-2 flex justify-between items-center">
                              <span className="flex items-center gap-2">
                                <p className="text-sm text-[#B5B5B5]">
                                  Estimated Network Fee (Batch Send):
                                </p>
                                <span className="text-[#B5B5B5]">
                                  <svg
                                    width="12"
                                    height="12"
                                    viewBox="0 0 12 12"
                                    fill="none"
                                  >
                                    <circle
                                      cx="6"
                                      cy="6"
                                      r="5.5"
                                      stroke="currentColor"
                                    />
                                    <text
                                      x="6"
                                      y="8.5"
                                      fontSize="8"
                                      textAnchor="middle"
                                      fill="currentColor"
                                    >
                                      i
                                    </text>
                                  </svg>
                                </span>
                              </span>
                              <div className="text-right">
                                <p className="text-sm text-[#B5B5B5]">
                                  $0.04460
                                </p>
                                <p className="text-xs text-[#B5B5B5]">$0.044</p>
                              </div>
                            </div>

                            <button className="cursor-pointer w-full rounded-full bg-[#B1F128] py-2 text-base font-semibold text-[#010501]">
                              Confirm Multi-Send
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  )}

                  {/* Chart Placeholder */}
                  <div className="relative h-14 overflow-hidden bg-[#1A1F1C] animate-pulse flex items-center justify-center">
                    <div className="absolute inset-0 bg-linear-to-r from-transparent via-[#4DFF9A] to-transparent opacity-40 blur-sm" />
                    <span className="relative z-10 text-xs font-medium tracking-wide text-[#E6ECE9]">
                      Loading chart...
                    </span>
                  </div>

                  {/* Chart Range */}
                  <div className="w-full mt-4 flex justify-between gap-4 text-xs text-[#6E7873]">
                    <span className="text-[#4DFF9A]">1D</span>
                    <span>1W</span>
                    <span>1M</span>
                    <span>1Y</span>
                    <span>5Y</span>
                    <span>All</span>
                  </div>
                </>
              )}

              {/* Recieve tab content */}
              {activeTab === "receive" && (
                <div className="space-y-4">
                  <div className="bg-[#0B0F0A] p-4 rounded-md">
                    <p className="text-xs text-[#7C7C7C] mb-2">Select Asset</p>

                    {/* Asset dropdown */}
                    <details className="bg-[#121712] rounded-full group relative w-full">
                      {/* Trigger */}
                      <summary className="w-full flex cursor-pointer list-none items-center rounded-full bg-[#121712] p-2 text-left outline-none">
                        {/* Icon */}
                        <Image
                          src={ethereum}
                          alt="Ethereum"
                          width={36}
                          height={36}
                          className="shrink-0"
                        />

                        {/* Text */}
                        <div className="ml-3 leading-tight">
                          <p className="text-sm font-semibold text-[#FFF]">
                            ETH
                          </p>
                          <p className="text-xs font-medium text-[#7C7C7C]">
                            Ethereum
                          </p>
                        </div>

                        {/* Chevron pushed to far right */}
                        <IoChevronDown
                          size={16}
                          className="ml-auto text-[#B5B5B5] transition-transform group-open:rotate-180"
                        />
                      </summary>

                      {/* Dropdown menu */}
                      <div className="absolute left-0 z-10 mt-2 w-full min-w-55 rounded-xl bg-[#0B0F0A] p-2 shadow-[0_10px_30px_rgba(0,0,0,0.6)]">
                        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 hover:bg-[#141A16]">
                          <Image src={ethereum} alt="" width={24} height={24} />
                          <span className="text-sm text-[#E6ECE9]">
                            Ethereum
                          </span>
                        </button>

                        {/* Add more assets here */}
                      </div>
                    </details>
                  </div>

                  {/* Warning */}
                  <div className="rounded-xl bg-[#2B1F0D] px-4 py-3 text-xs text-center text-[#FFF]">
                    Only send{" "}
                    <span className="font-semibold">Ethereum (ETH)</span> to
                    this address. Other assets will be lost forever.
                  </div>

                  {/* QR + Address */}
                  <div className="flex gap-4">
                    <div>
                      <Image
                        src="/qr-code2.svg"
                        alt="QR Code"
                        width={20}
                        height={20}
                        className="w-48 h-48 rounded-md"
                      />
                    </div>

                    <div className="flex flex-col space-y-4">
                      <p className="pt-4 text-xs break-all text-[#B5B5B5]">
                        0x06193i092j9g9iu2ngmu0939i-4ti938hT432
                      </p>
                      <button className="flex items-center gap-2 rounded-full border border-[#B1F128] w-40 px-3 py-1.5 text-xs text-[#B1F128]">
                        <FiCopy size={14} />
                        Copy Address
                      </button>

                      <button className="flex items-center gap-2 rounded-full border border-[#B1F128] w-40 px-3 py-1.5 text-xs text-[#B1F128]">
                        <GoShareAndroid size={14} />
                        Share Address
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Activities tab content */}
              {activeTab === "activities" && (
                <div className="h-125.5 w-full overflow-y-auto rounded-2xl px-4">
                  {transactionsLoading ? (
                    <div className="flex flex-col gap-6 mt-2">
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                        <div key={i} className="flex justify-between items-start">
                          <div className="flex flex-col gap-1">
                            <Skeleton className="h-5 w-20" />
                            <Skeleton className="h-4 w-24" />
                          </div>
                          <div className="flex flex-col gap-1 items-end">
                            <Skeleton className="h-5 w-24" />
                            <Skeleton className="h-4 w-20" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : transactionsError ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <p className="text-red-400 text-sm mb-4">
                        Error loading transactions: {transactionsError}
                      </p>
                    </div>
                  ) : transactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <p className="text-[#8A929A] text-sm">No transactions found</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-6 mt-2">
                      {transactions.map((tx) => (
                        <TransactionRow key={tx.id} transaction={tx} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

// ==========================================
//  MOBILE VIEW COMPONENT
// ==========================================
function WalletPageMobile() {
  type MainTab = "assets" | "send" | "receive" | "activities";
  type SendTab = "single" | "multi";
  type AssetFilterTab = "assets" | "nft";

  const [activeTab, setActiveTab] = useState<MainTab>("assets");
  const [activeSendTab, setActiveSendTab] = useState<SendTab>("single");
  const [sendStep, setSendStep] = useState<"form" | "confirm">("form");
  const [activeAssetFilter, setActiveAssetFilter] =
    useState<AssetFilterTab>("assets");
  const [selectedNft, setSelectedNft] = useState<(typeof nfts)[number] | null>(
    null
  );

  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);

  // Get connected wallet address
  const { connectedAddress } = useWalletConnection();

  // Fetch portfolio balance and daily change
  const {
    data: balanceData,
    isLoading: balanceLoading,
    error: balanceError
  } = usePortfolioBalance(connectedAddress);

  // Fetch wallet token balances
  const {
    balances: walletTokens,
    isLoading: tokensLoading,
    error: tokensError
  } = useWalletBalances(connectedAddress);

  // Fetch wallet transactions
  const {
    transactions,
    isLoading: transactionsLoading,
    error: transactionsError
  } = useWalletTransactions(connectedAddress, { limit: 50 });

  // Fetch wallet NFTs
  const {
    nfts,
    isLoading: nftsLoading,
    error: nftsError
  } = useWalletNFTs(connectedAddress);

  // Fetch NFT activity when an NFT is selected
  const {
    activities,
    isLoading: activitiesLoading
  } = useNFTActivity(
    connectedAddress,
    selectedNft?.contractAddress || null,
    selectedNft?.tokenId || null,
    selectedNft?.chainId || null
  );

  // Map wallet tokens to portfolio assets format
  const assets = useMemo(() => {
    if (!walletTokens || walletTokens.length === 0) return [];
    return mapWalletTokensToAssets(walletTokens, {
      includeZeroBalances: false,
      sortBy: 'value',
    });
  }, [walletTokens]);

  // Use real balance data - show skeleton when loading
  const displayBalance = balanceData?.totalUSD;
  const dailyChangeText = balanceData?.dailyChangeFormatted;
  const dailyChangeColor = balanceData?.dailyChangeColor || '#3FEA9B';

  const handleCopy = async () => {
    if (!inputRef.current) return;
    await navigator.clipboard.writeText(inputRef.current.value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="min-h-screen bg-[#050505] font-manrope text-white pb-10">

      {/* BREADCRUMBS */}
      <div className="px-5 mb-4 text-sm text-[#8A929A] mt-6">
        {/* Dynamic Breadcrumbs based on View */}
        {selectedNft ? (
          <div className="flex items-center gap-1 animate-in fade-in slide-in-from-left-2 duration-200">
            <button onClick={() => setSelectedNft(null)}>Portfolio</button>
            <span className="text-gray-600"> &gt; </span>
            <span className="text-white">View NFT</span>
          </div>
        ) : activeTab === "assets" ? (
          <span>Portfolio</span>
        ) : (
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setActiveTab("assets");
                setSendStep("form");
              }}
            >
              Portfolio
            </button>
            <span className="text-gray-600"> &gt; </span>
            <span className="text-white capitalize">{activeTab}</span>
          </div>
        )}
      </div>

      {/* MAIN CARD */}
      <div className="mx-4 rounded-4xl border border-[#1A1F1A] bg-[#0A0D0A] p-5 relative overflow-hidden min-h-125">
        {/* Glow Line */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-[#B1F128] to-transparent opacity-50" />

        {selectedNft ? (
          <NFTDetailCard
            nft={selectedNft}
            activities={activities}
            activitiesLoading={activitiesLoading}
            onBack={() => setSelectedNft(null)}
          />
        ) : (
          /* ================= DASHBOARD VIEW ================= */
          <>
            {/* Balance Section */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[#8A929A] text-xs">Total Balance</span>
                <IoEyeOutline className="text-[#8A929A] text-xs" />
              </div>
              {balanceLoading ? (
                <div className="space-y-2 mb-1">
                  <Skeleton className="h-9 w-32" />
                  <Skeleton className="h-5 w-40" />
                </div>
              ) : balanceError ? (
                <>
                  <h1 className="text-3xl font-bold text-white mb-1">$0.00</h1>
                  <p className="text-[#FF4444] text-sm">
                    Error loading balance
                  </p>
                </>
              ) : displayBalance ? (
                <>
                  <h1 className="text-3xl font-bold text-white mb-1">${displayBalance}</h1>
                  {dailyChangeText ? (
                    <p className="text-sm flex items-center gap-1" style={{ color: dailyChangeColor }}>
                      {dailyChangeText} <span className="text-[#8A929A]">today</span>
                    </p>
                  ) : (
                    <p className="text-[#8A929A] text-sm">
                      No change data available
                    </p>
                  )}
                </>
              ) : (
                <>
                  <h1 className="text-3xl font-bold text-white mb-1">$0.00</h1>
                  <p className="text-[#8A929A] text-sm">
                    No balance data
                  </p>
                </>
              )}
            </div>

            {/* Action Buttons */}
            <div className="bg-[#010501] p-1 rounded-2xl relative mb-6">
              <div className="pointer-events-none absolute inset-x-4 bottom-px h-px rounded-full bg-[linear-gradient(to_right,rgba(177,241,40,0),rgba(177,241,40,0.95),rgba(177,241,40,0))]" />
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setActiveTab("send")}
                  className={`flex flex-col items-center justify-center py-4 rounded-2xl border transition-all duration-200 ${activeTab === "send"
                      ? "bg-[#081F02] border-[#B1F128] text-[#B1F128]"
                      : "bg-[#151A15] border-transparent text-[#8A929A] hover:bg-[#1A201A]"
                    }`}
                >
                  <RiSendPlaneLine size={20} className="mb-2" />
                  <span className="text-xs font-medium">Send</span>
                </button>
                <button
                  onClick={() => setActiveTab("receive")}
                  className={`flex flex-col items-center justify-center py-4 rounded-2xl border transition-all duration-200 ${activeTab === "receive"
                      ? "bg-[#081F02] border-[#B1F128] text-[#B1F128]"
                      : "bg-[#151A15] border-transparent text-[#8A929A] hover:bg-[#1A201A]"
                    }`}
                >
                  <HiDownload size={20} className="mb-2" />
                  <span className="text-xs font-medium">Receive</span>
                </button>
                <button
                  onClick={() => setActiveTab("activities")}
                  className={`flex flex-col items-center justify-center py-4 rounded-2xl border transition-all duration-200 ${activeTab === "activities"
                      ? "bg-[#081F02] border-[#B1F128] text-[#B1F128]"
                      : "bg-[#151A15] border-transparent text-[#8A929A] hover:bg-[#1A201A]"
                    }`}
                >
                  <MdHistory size={20} className="mb-2" />
                  <span className="text-xs font-medium">Activities</span>
                </button>
              </div>
            </div>

            {/* ASSETS */}
            {activeTab === "assets" && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex bg-[#151A15] rounded-full p-1">
                    <button
                      onClick={() => setActiveAssetFilter("assets")}
                      className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${activeAssetFilter === "assets"
                          ? "bg-[#B1F128] text-black"
                          : "text-[#8A929A]"
                        }`}
                    >
                      Assets
                    </button>
                    <button
                      onClick={() => setActiveAssetFilter("nft")}
                      className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${activeAssetFilter === "nft"
                          ? "bg-[#B1F128] text-black"
                          : "text-[#8A929A]"
                        }`}
                    >
                      NFTs
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#151A15] flex items-center justify-center">
                      <Image
                        src="/assets/icons/search-01.svg"
                        alt="search"
                        width={16}
                        height={16}
                      />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-[#151A15] flex items-center justify-center">
                      {/* TOGGLE FILTER BUTTON */}
                      <button
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className="bg-[#1B1B1B] h-5 w-5 flex items-center justify-center rounded-full cursor-pointer transition-colors hover:bg-[#252525]"
                      >
                        {isFilterOpen ? (
                          <IoClose size={14} className="text-[#B5B5B5]" />
                        ) : (
                          <Image
                            src="/filter.svg"
                            alt=""
                            width={20}
                            height={20}
                            className="p-0.5"
                          />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {activeAssetFilter === "assets" ? (
                  <>
                    {tokensLoading ? (
                      <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div
                            key={i}
                            className="grid grid-cols-[32px_120px_60px_1fr] gap-3 items-center p-3 rounded-2xl bg-[#0F120F] border border-[#1A1F1A]"
                          >
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <div className="space-y-1">
                              <Skeleton className="h-4 w-20" />
                              <Skeleton className="h-3 w-32" />
                            </div>
                            <div className="flex justify-start">
                              <Skeleton className="h-5 w-16" />
                            </div>
                            <div className="text-right space-y-1">
                              <Skeleton className="h-4 w-16" />
                              <Skeleton className="h-3 w-20" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : tokensError ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <p className="text-sm text-[#FF4444] mb-2">
                          Error loading assets
                        </p>
                        <p className="text-xs text-[#8A929A]">
                          {tokensError}
                        </p>
                      </div>
                    ) : assets.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <p className="text-sm text-[#8A929A] mb-2">
                          No assets found
                        </p>
                        <p className="text-xs text-[#6E7873]">
                          Start by swapping tokens to build your portfolio
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {assets.map((asset, i) => (
                          <div
                            key={i}
                            className="grid grid-cols-[32px_120px_60px_1fr] gap-3 items-center p-3 rounded-2xl bg-[#0F120F] border border-[#1A1F1A]"
                          >
                            {/* Column 1: Logo */}
                            <div className="shrink-0 flex items-center justify-start">
                              <Image
                                src={asset.icon}
                                alt={asset.symbol}
                                width={32}
                                height={32}
                                className="rounded-full"
                              />
                            </div>

                            {/* Column 2: Symbol and Name (Fixed width to keep chart aligned) */}
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-white truncate">
                                {asset.symbol}
                              </p>
                              <p className="text-[10px] text-[#8A929A] truncate">
                                {asset.name}
                              </p>
                            </div>

                            {/* Column 3: Chart (Fixed position, justify-start) */}
                            <div className="flex justify-start shrink-0">
                              <Image
                                src={asset.trend === "bullish" ? bullish : bearish}
                                alt="trend"
                                width={60}
                                height={20}
                              />
                            </div>

                            {/* Column 4: Amount and USD Value (Right-aligned) */}
                            <div className="text-right min-w-0">
                              <p className="text-sm font-bold text-white break-all">
                                {asset.amount}
                              </p>
                              <p className="text-[10px] text-[#8A929A]">
                                {asset.value}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <NFTGrid
                    nfts={nfts}
                    isLoading={nftsLoading}
                    onNFTSelect={setSelectedNft}
                    selectedNFT={selectedNft}
                  />
                )}

                {/* FILTER DROPDOWN OVERLAY */}
                {isFilterOpen && (
                  <div className="absolute top-68 right-5 z-50 w-70 rounded-3xl bg-[#0B0F0A] p-5 shadow-[0_20px_40px_rgba(0,0,0,0.8)] border border-[#1B1B1B]">
                    {/* Section 1: Sort By */}
                    <div className="mb-5">
                      <h3 className="text-sm font-medium text-white mb-3">
                        Sort By
                      </h3>
                      <div className="space-y-2">
                        {["Highest Value → Lowest", "Recent Activity"].map(
                          (label, i) => (
                            <label
                              key={i}
                              className="flex items-center gap-3 cursor-pointer group"
                            >
                              <input
                                type="radio"
                                name="sort"
                                className="peer sr-only"
                              />
                              <div className="w-4 h-4 rounded border border-[#3E453E] peer-checked:border-[#B1F128] peer-checked:bg-[#B1F128] transition-colors" />
                              <span className="text-xs text-[#B5B5B5] group-hover:text-white transition-colors">
                                {label}
                              </span>
                            </label>
                          )
                        )}
                      </div>
                    </div>

                    {/* Token Category */}
                    <div className="mb-5">
                      <h3 className="text-sm font-medium text-white mb-3">
                        Token Category
                      </h3>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-2">
                        {[
                          "DeFi Tokens",
                          "Gaming",
                          "Meme Coins",
                          "New Listings",
                        ].map((label, i) => (
                          <label
                            key={i}
                            className="flex items-center gap-3 cursor-pointer group"
                          >
                            <input type="checkbox" className="peer sr-only" />
                            <div className="w-4 h-4 rounded border border-[#3E453E] peer-checked:border-[#B1F128] peer-checked:bg-[#B1F128] shrink-0" />
                            <span className="text-xs text-[#B5B5B5] group-hover:text-white transition-colors whitespace-nowrap">
                              {label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Section 3: Chain */}
                    <div className="mb-6">
                      <h3 className="text-sm font-medium text-white mb-3">
                        Chain
                      </h3>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-2">
                        {["BSC", "Polygon", "Ethereum", "Solana"].map(
                          (label, i) => (
                            <label
                              key={i}
                              className="flex items-center gap-3 cursor-pointer group"
                            >
                              <input type="checkbox" className="peer sr-only" />
                              <div className="w-4 h-4 rounded border border-[#3E453E] peer-checked:border-[#B1F128] peer-checked:bg-[#B1F128] shrink-0" />
                              <span className="text-xs text-[#B5B5B5] group-hover:text-white transition-colors">
                                {label}
                              </span>
                            </label>
                          )
                        )}
                      </div>
                    </div>

                    {/* Reset Button */}
                    <button className="w-full bg-[#B1F128] text-[#010501] font-semibold text-sm py-3 rounded-full hover:opacity-90 transition-opacity">
                      Reset filters
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* SEND FLOW */}
            {activeTab === "send" && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex border-b border-[#1A1F1A] mb-6">
                  <button
                    onClick={() => setActiveSendTab("single")}
                    className={`flex-1 pb-3 text-sm font-medium border-b-2 transition-colors ${activeSendTab === "single"
                        ? "border-[#B1F128] text-[#B1F128]"
                        : "border-transparent text-[#8A929A]"
                      }`}
                  >
                    Send To One
                  </button>
                  <button
                    onClick={() => setActiveSendTab("multi")}
                    className={`flex-1 pb-3 text-sm font-medium border-b-2 transition-colors ${activeSendTab === "multi"
                        ? "border-[#B1F128] text-[#B1F128]"
                        : "border-transparent text-[#8A929A]"
                      }`}
                  >
                    Multi-Send
                  </button>
                </div>

                {sendStep === "form" ? (
                  <>
                    <div className="bg-[#0F120F] rounded-2xl p-4 flex justify-between items-center border border-[#1A1F1A] mb-4">
                      <div className="flex items-center gap-3">
                        <details className="bg-[#121712] rounded-full group relative w-fit">
                          <summary className="flex cursor-pointer list-none items-center gap-3 rounded-full bg-[#121712] px-2 py-3 text-left outline-none">
                            {/* Icon */}
                            <Image
                              src={ethereum}
                              alt="Ethereum"
                              width={36}
                              height={36}
                              className="shrink-0"
                            />
                            {/* Text */}
                            <div className="leading-tight">
                              <p className="text-sm font-semibold text-[#FFF]">
                                ETH
                              </p>
                              <p className="text-xs font-medium text-[#7C7C7C]">
                                Ethereum
                              </p>
                            </div>
                            <IoChevronDown
                              size={16}
                              className="ml-2 text-[#B5B5B5] transition-transform group-open:rotate-180"
                            />
                          </summary>
                          {/* Dropdown menu */}
                          <div className="absolute left-0 z-10 mt-2 w-full min-w-55 rounded-xl bg-[#0B0F0A] p-2 shadow-[0_10px_30px_rgba(0,0,0,0.6)]">
                            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 hover:bg-[#141A16]">
                              <Image
                                src={ethereum}
                                alt=""
                                width={24}
                                height={24}
                              />
                              <span className="text-sm text-[#E6ECE9]">
                                Ethereum
                              </span>
                            </button>

                            {/* Add more assets here */}
                          </div>
                        </details>
                      </div>

                      <div className="text-right">
                        <div className="flex items-center gap-1 justify-end text-[#8A929A] text-[10px] mb-0.5">
                          <BsWallet2 />
                          <span>0.0342ETH</span>
                        </div>
                        <p className="text-lg font-bold text-white">11.496</p>
                        <p className="text-xs text-[#8A929A]">$0</p>
                      </div>
                    </div>

                    <div className="bg-[#0F120F] rounded-2xl p-4 border border-[#1A1F1A] mb-6">
                      {activeSendTab === "single" ? (
                        <>
                          <label className="text-xs font-semibold text-white mb-3 block">
                            To:
                          </label>
                          <div className="relative">
                            <input
                              ref={inputRef}
                              type="text"
                              placeholder="Enter Wallet Address"
                              className="w-full bg-[#050505] rounded-xl py-4 px-4 pr-10 text-sm text-white placeholder-[#585858] outline-none border border-[#1A1F1A] focus:border-[#B1F128]"
                            />
                            <button
                              onClick={handleCopy}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A929A]"
                            >
                              {copied ? <FiCheck /> : <FiCopy />}
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <label className="text-xs font-semibold text-white mb-3 block">
                            To:
                          </label>
                          <div className="relative mb-4">
                            <p className="text-xs text-[#8A929A] mb-3">
                              Add multiple wallet addresses or upload a list.
                            </p>
                          </div>
                          <button className="w-full border border-[#1A1F1A] rounded-xl py-3 flex items-center justify-center gap-2 text-[#8A929A] text-xs hover:border-[#B1F128] transition-colors">
                            <FiCopy />
                            <span>Attach CSV File</span>
                          </button>
                        </>
                      )}
                    </div>
                    <button
                      onClick={() => setSendStep("confirm")}
                      className="w-full bg-[#B1F128] text-black font-bold py-4 rounded-full text-sm hover:opacity-90 transition-opacity"
                    >
                      Next
                    </button>
                  </>
                ) : (
                  /* ================= CONFIRM STEP ================= */
                  <div className="animate-in fade-in zoom-in-95 duration-200 pt-2">
                    {/* Go Back Button */}
                    <div className="flex justify-end mb-8">
                      <button
                        onClick={() => setSendStep("form")}
                        className="flex items-center gap-2 border border-[#B1F128] text-[#B1F128] px-5 py-2 rounded-xl text-xs font-bold transition-opacity hover:opacity-80"
                      >
                        <IoArrowBack size={16} />
                        <span>Go Back</span>
                      </button>
                    </div>

                    {activeSendTab === "single" ? (
                      // Single Send Confirm Details
                      <div className="space-y-6">
                        <div>
                          <p className="text-xs text-[#8A929A] mb-1">From:</p>
                          <p className="text-xs text-[#E0E0E0] font-medium font-mono">
                            0x06187ejie9urourT432
                          </p>
                        </div>

                        <div className="flex justify-between items-start">
                          <div className="max-w-[70%]">
                            <p className="text-xs text-[#8A929A] mb-1">To:</p>
                            <p className="text-xs text-[#E0E0E0] font-medium font-mono break-all">
                              0x06187ejie9urourT432
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-[#8A929A] mb-1">
                              Network
                            </p>
                            <p className="text-xs text-[#E0E0E0] font-medium">
                              ETH
                            </p>
                          </div>
                        </div>

                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-1 text-[#8A929A] text-xs">
                            <span>Network Fee:</span>
                            <div className="border border-[#8A929A] rounded-full w-3 h-3 flex items-center justify-center text-[8px] opacity-70">
                              i
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-[#E0E0E0] font-medium">
                              $0.04460
                            </p>
                            <p className="text-xs text-[#8A929A]">$0.044</p>
                          </div>
                        </div>

                        <button className="w-full bg-[#B1F128] text-black font-bold py-4 rounded-full text-sm mt-8 hover:opacity-90 transition-opacity shadow-[0_0_15px_rgba(177,241,40,0.3)]">
                          Confirm
                        </button>
                      </div>
                    ) : (
                      // Multi Send Confirm Details
                      <div className="space-y-6">
                        <div>
                          <p className="text-xs text-[#8A929A] mb-1">
                            Total Recipients:
                          </p>
                          <p className="text-sm text-[#E0E0E0] font-medium">
                            12
                          </p>
                        </div>

                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-xs text-[#8A929A] mb-1">
                              Amount Per Participant
                            </p>
                            <p className="text-sm text-[#E0E0E0] font-medium">
                              100 ETH
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-[#8A929A] mb-1">
                              Network
                            </p>
                            <p className="text-sm text-[#E0E0E0] font-medium">
                              ETH
                            </p>
                          </div>
                        </div>

                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-1 text-[#8A929A] text-xs max-w-[60%]">
                            <span>Estimated Network Fee (Batch Send):</span>
                            <div className="border border-[#8A929A] rounded-full w-3 h-3 flex items-center justify-center text-[8px] shrink-0 opacity-70">
                              i
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-[#E0E0E0] font-medium">
                              $0.04460
                            </p>
                            <p className="text-xs text-[#8A929A]">$0.044</p>
                          </div>
                        </div>

                        <button className="w-full bg-[#B1F128] text-black font-bold py-4 rounded-full text-sm mt-8 hover:opacity-90 transition-opacity shadow-[0_0_15px_rgba(177,241,40,0.3)]">
                          Confirm Multi-Send
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* RECEIVE FLOW */}
            {activeTab === "receive" && (
              <div className="space-y-4">
                <div className="bg-[#0F120F] p-4 rounded-xl">
                  <p className="text-xs text-[#7C7C7C] mb-2">Select Asset</p>

                  {/* Asset dropdown */}
                  <details className="bg-[#121712] rounded-full group relative w-full">
                    {/* Trigger */}
                    <summary className="w-full flex cursor-pointer list-none items-center rounded-full bg-[#121712] p-2 text-left outline-none">
                      {/* Icon */}
                      <Image
                        src={ethereum}
                        alt="Ethereum"
                        width={36}
                        height={36}
                        className="shrink-0"
                      />

                      {/* Text */}
                      <div className="ml-3 leading-tight">
                        <p className="text-sm font-semibold text-[#FFF]">ETH</p>
                        <p className="text-xs font-medium text-[#7C7C7C]">
                          Ethereum
                        </p>
                      </div>
                      <IoChevronDown
                        size={16}
                        className="ml-auto text-[#B5B5B5] transition-transform group-open:rotate-180"
                      />
                    </summary>

                    {/* Dropdown menu */}
                    <div className="absolute left-0 z-10 mt-2 w-full min-w-55 rounded-xl bg-[#0B0F0A] p-2 shadow-[0_10px_30px_rgba(0,0,0,0.6)]">
                      <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 hover:bg-[#141A16]">
                        <Image src={ethereum} alt="" width={24} height={24} />
                        <span className="text-sm text-[#E6ECE9]">Ethereum</span>
                      </button>

                      {/* Add more assets here */}
                    </div>
                  </details>
                </div>

                {/* Warning */}
                <div className="rounded-xl bg-[#2B1F0D] px-1 py-3 text-xs text-center text-[#FFF]">
                  Only send{" "}
                  <span className="font-semibold">Ethereum (ETH)</span> to this
                  address. Other assets will be lost forever.
                </div>

                {/* QR + Address */}
                <div className="">
                  <div className="flex justify-center">
                    <Image
                      src="/qr-code2.svg"
                      alt="QR Code"
                      width={20}
                      height={20}
                      className="w-48 h-48 rounded-md"
                    />
                  </div>

                  <div className="w-full">
                    <p className="text-center pt-4 text-xs break-all text-[#B5B5B5]">
                      0x06193i092j9g9iu2ngmu0939i-4ti938hT432
                    </p>

                    <button className="flex w-full items-center justify-center gap-2 rounded-full border border-[#B1F128] px-3 py-1.5 text-xs text-[#B1F128] mt-3">
                      <FiCopy size={14} />
                      Copy Address
                    </button>

                    <button className="flex w-full items-center justify-center gap-2 rounded-full border border-[#B1F128] px-3 py-1.5 text-xs text-[#B1F128] mt-2">
                      <GoShareAndroid size={14} />
                      Share Address
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ACTIVITIES */}
            {activeTab === "activities" && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                {transactionsLoading ? (
                  <div className="flex flex-col gap-6 mt-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                      <div key={i} className="flex justify-between items-start">
                        <div className="flex flex-col gap-1">
                          <Skeleton className="h-5 w-20" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                        <div className="flex flex-col gap-1 items-end">
                          <Skeleton className="h-5 w-24" />
                          <Skeleton className="h-4 w-20" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : transactionsError ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <p className="text-red-400 text-sm mb-4">
                      Error loading transactions: {transactionsError}
                    </p>
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <p className="text-[#8A929A] text-sm">No transactions found</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-6 mt-2">
                    {transactions.map((tx) => (
                      <TransactionRow key={tx.id} transaction={tx} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ==========================================
//  MAIN PAGE (Responsive Logic)
// ==========================================
export default function WalletPage() {
  return (
    <>
      {/* Show MobileView only on small screens (hidden on md and up) */}
      <div className="block md:hidden">
        <WalletPageMobile />
      </div>

      {/* Show DesktopView only on medium screens and up (hidden on default/mobile) */}
      <div className="hidden md:block">
        <WalletPageDesktop />
      </div>
    </>
  );
}
