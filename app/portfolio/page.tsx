"use client";

import { useRef, useState } from "react";

import Image from "next/image";
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
const nfts = [
  { id: 1, name: "Cartoon-bird", floor: "6.10 ETH", image: "/nft1.svg" },
  { id: 2, name: "Alien Amphibian", floor: "0 ETH", image: "/nft2.svg" },
  { id: 3, name: "Cyber Guy", floor: "1.2 ETH", image: "/nft3.svg" },
  { id: 4, name: "Pixel Punk", floor: "0.8 ETH", image: "/nft4.svg" },
  { id: 5, name: "Cat", floor: "3.2 ETH", image: "/nft5.svg" },
  { id: 6, name: "Sorcerer", floor: "0.8 ETH", image: "/nft6.svg" },
];
const transactions = [
  { type: "sent", date: "Jan 4, 2024", amount: "0.017 ETH", usd: "$725.00" },
  { type: "sent", date: "Jan 4, 2024", amount: "0.017 ETH", usd: "$725.00" },
  {
    type: "received",
    date: "Jan 4, 2024",
    amount: "0.017 ETH",
    usd: "$725.00",
  },
  {
    type: "received",
    date: "Jan 4, 2024",
    amount: "0.017 ETH",
    usd: "$725.00",
  },
  {
    type: "received",
    date: "Jan 4, 2024",
    amount: "0.017 ETH",
    usd: "$725.00",
  },
  {
    type: "received",
    date: "Jan 4, 2024",
    amount: "0.017 ETH",
    usd: "$725.00",
  },
  {
    type: "received",
    date: "Jan 4, 2024",
    amount: "0.017 ETH",
    usd: "$725.00",
  },
  {
    type: "received",
    date: "Jan 4, 2024",
    amount: "0.017 ETH",
    usd: "$725.00",
  },
  {
    type: "received",
    date: "Jan 4, 2024",
    amount: "0.017 ETH",
    usd: "$725.00",
  },
  {
    type: "received",
    date: "Jan 4, 2024",
    amount: "0.017 ETH",
    usd: "$725.00",
  },
  {
    type: "received",
    date: "Jan 4, 2024",
    amount: "0.017 ETH",
    usd: "$725.00",
  },
  {
    type: "received",
    date: "Jan 4, 2024",
    amount: "0.017 ETH",
    usd: "$725.00",
  },
];

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
            <h1 className="mt-1 text-3xl font-bold text-[#E6ECE9]">
              ${balance}
            </h1>
            <p className="mt-1 text-sm text-[#3FEA9B]">
              +$61.69 (+2.15%) <span className="text-[#9DA4AE]">today</span>
            </p>
          </div>

          {/* Tabs */}
          <div className="mb-4 flex justify-between items-center gap-2">
            <div className="bg-[#1B1B1B] rounded-full">
              <button
                onClick={() => setActiveLeftTab("assets")}
                className={`cursor-pointer rounded-full font-semibold text-base px-4 py-1 ${
                  activeLeftTab === "assets"
                    ? "bg-[#081F02] text-[#B1F128]"
                    : "text-[#6E7873]"
                }`}
              >
                Assets
              </button>
              <button
                onClick={() => setActiveLeftTab("nft")}
                className={`cursor-pointer rounded-full font-semibold text-base px-4 py-1 ${
                  activeLeftTab === "nft"
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
              <ul className="space-y-3">
                {assets.map((asset, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between rounded-xl bg-[#0E1310] px-2 py-3 hover:bg-[#141A16]"
                  >
                    {/* Left: Asset Info */}
                    <div className="flex items-center gap-2">
                      <Image
                        src={asset.icon}
                        alt={`${asset.symbol} icon`}
                        width={20}
                        height={20}
                        className="opacity-90"
                      />
                      <span className="">
                        <p className="text-sm font-medium text-[#FFFFFF]">
                          {asset.symbol}
                        </p>
                        <p className="text-xs text-[#8A929A]">{asset.name}</p>
                      </span>
                    </div>

                    {/* Middle: Chart */}
                    <div className="">
                      <Image
                        src={asset.trend === "bearish" ? bearish : bullish}
                        alt={`${asset.symbol} chart`}
                        width={80}
                        height={28}
                        className="opacity-90"
                      />
                    </div>

                    {/* Right: Numbers */}
                    <div className="text-right">
                      <p className="text-sm font-medium text-[#FFF]">
                        {asset.amount}
                      </p>
                      <p className="text-xs text-[#8A929A]">{asset.value}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* NFT GRID */}
            {activeLeftTab === "nft" && (
              <div className="grid grid-cols-2 gap-3">
                {nfts.map((nft) => (
                  <button
                    key={nft.id}
                    onClick={() => setSelectedNft(nft)}
                    className={`relative group aspect-square w-full rounded-2xl overflow-hidden transition-all duration-300
                      ${
                        selectedNft?.id === nft.id
                          ? ""
                          : "hover:ring-1 hover:ring-[#ffffff30]"
                      }`}
                  >
                    <Image
                      src={nft.image}
                      alt={nft.name}
                      width={500}
                      height={500}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />

                    {/* GLASS CARD OVERLAY */}
                    <div className="absolute bottom-1 left-2 right-2 flex items-center justify-between rounded-xl border border-white/20 bg-black/20 backdrop-blur-md px-3 py-2 text-left shadow-lg">
                      <div>
                        <p className="text-xs font-semibold text-white drop-shadow-md">
                          {nft.name}
                        </p>
                        <p className="text-[10px] font-medium text-[#E0E0E0] drop-shadow-md">
                          Floor: {nft.floor}
                        </p>
                      </div>

                      <div className="text-white/80">
                        <TbArrowBarToRight />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
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
        <div className="pt-2 w-full max-w-125 mx-auto font-manrope">
          {/* Top Actions */}
          <div className="bg-[#010501] p-1 rounded-2xl relative mb-6">
            <div className="pointer-events-none absolute inset-x-4 bottom-px h-px rounded-full bg-[linear-gradient(to_right,rgba(177,241,40,0),rgba(177,241,40,0.95),rgba(177,241,40,0))]" />
            <div className="grid grid-cols-3 gap-1">
              <button
                onClick={() => setActiveTab("send")}
                className={`flex h-full w-full cursor-pointer items-center justify-center gap-2 rounded-2xl py-3.25 text-sm font-medium transition
                ${
                  activeTab === "send"
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
                ${
                  activeTab === "receive"
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
                  ${
                    activeTab === "activities"
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
              {!selectedNft ? (
                <div className="mt-40 flex h-full items-center justify-center text-base text-[#6E7873]">
                  Select an NFT to view details
                </div>
              ) : (
                <div className="">
                  <Image
                    src={selectedNft.image}
                    alt={selectedNft.name}
                    width={500}
                    height={300}
                    className="w-full h-48 object-contain rounded-3xl mb-6"
                  />

                  <div>
                    <div className="flex justify-between items-center">
                      <span>
                        <p className="flex items-center gap-2 text-base font-medium text-white">
                          {selectedNft.name} <HiOutlineBadgeCheck size={14} />
                        </p>
                        <p className="text-sm text-[#FFF]">
                          By {selectedNft.name}_deployer
                        </p>
                      </span>
                      <CiStar />
                    </div>

                    <div className="grid grid-cols-3 gap-y-6 w-full mt-4">
                      <div className="text-left">
                        <p className="text-white font-medium text-sm">
                          1.2M ETH
                        </p>
                        <p className="text-[#B5B5B5] text-[10px]">
                          Total volume
                        </p>
                      </div>

                      <div className="flex justify-center">
                        <div className="flex flex-col">
                          <p className="text-white font-medium text-sm">
                            6.10 ETH
                          </p>
                          <p className="text-[#B5B5B5] text-[10px]">
                            Floor price
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-white font-medium text-sm">3.05%</p>
                        <p className="text-[#B5B5B5] text-[10px]">Listed</p>
                      </div>

                      <div className="text-left">
                        <p className="text-white font-medium text-sm">5,320</p>
                        <p className="text-[#B5B5B5] text-[10px]">Owners</p>
                      </div>

                      <div className="flex justify-center">
                        <div className="flex flex-col">
                          <p className="text-white font-medium text-sm">
                            Ethereum
                          </p>
                          <p className="text-[#B5B5B5] text-[10px]">Chain</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-white font-medium text-sm">
                          April 2025
                        </p>
                        <p className="text-[#B5B5B5] text-[10px]">
                          Creation date
                        </p>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm uppercase mt-4">Recent activites</p>
                  <div className="mt-4 flex justify-between">
                    <span>
                      <p className="text-white font-medium text-sm">Recieved</p>
                      <p className="text-[10px] text-[#8A929A]">Jan 4, 2024</p>
                    </span>

                    <span>
                      <p className="text-[#498F00] font-medium text-sm">
                        {selectedNft.name}
                      </p>
                      <p className="text-[10px] text-right text-[#8A929A]">
                        $725.00
                      </p>
                    </span>
                  </div>
                </div>
              )}
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
                           ${
                             activeSendTab === "single"
                               ? "border-b-[1.5px] border-[#B1F128] text-[#B1F128]"
                               : "border-b-[1.5px] border-transparent text-[#B5B5B5]"
                           }`}
                          >
                            Send To One
                          </button>

                          <button
                            onClick={() => setActiveSendTab("multi")}
                            className={`flex h-full cursor-pointer px-6 items-center justify-center gap-2 pb-1 text-sm font-medium
                           ${
                             activeSendTab === "multi"
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
                <>
                  {/* div below to be displayed when no activity has been recorded */}
                  {/* <div className="flex flex-col items-center justify-center space-y-4">
               <IoFolderOpenOutline size={200} className="mt-10" />
               <p className="font-medium text-lg">No Activity Yet</p>
             </div> */}

                  <div className="h-125.5 w-full overflow-y-auto rounded-2xl px-4">
                    {transactions.map((tx, index) => (
                      <div
                        key={index}
                        className="flex w-full items-center justify-between border-b border-[#1B1B1B] py-2 last:border-b-0"
                      >
                        {/* LEFT */}
                        <div>
                          <p className="text-sm font-medium text-[#FFFFFF] capitalize">
                            {tx.type}
                          </p>
                          <p className="text-xs text-[#B5B5B5]">{tx.date}</p>
                        </div>

                        {/* RIGHT */}
                        <div className="text-right">
                          <p
                            className={`text-sm font-medium ${
                              tx.type === "received"
                                ? "text-[#498F00]"
                                : "text-[#FFFFFF]"
                            }`}
                          >
                            {tx.amount}
                          </p>
                          <p className="text-xs text-[#B5B5B5]">{tx.usd}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
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
          /* ================= NFT DETAIL VIEW ================= */
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Image Banner */}
            <div className="relative w-full aspect-2/1 mb-6">
              <Image
                src={selectedNft.image}
                alt={selectedNft.name}
                fill
                className="object-cover rounded-3xl"
              />
            </div>

            {/* Title Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-bold text-white">
                    {selectedNft.name}
                  </h2>
                  <HiOutlineBadgeCheck className="text-white" size={18} />
                </div>
                <p className="text-xs text-[#8A929A]">
                  By {selectedNft.name}_deployer
                </p>
              </div>
              <CiStar size={24} className="text-[#8A929A] mt-1" />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-y-6 w-full mb-8">
              {/* Row 1 */}
              <div className="text-left">
                <p className="text-white font-medium text-sm">1.2M ETH</p>
                <p className="text-[#B5B5B5] text-[10px]">Total volume</p>
              </div>
              <div className="flex justify-center">
                <div className="flex flex-col items-center">
                  <p className="text-white font-medium text-sm">6.10 ETH</p>
                  <p className="text-[#B5B5B5] text-[10px]">Floor price</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white font-medium text-sm">3.05%</p>
                <p className="text-[#B5B5B5] text-[10px]">Listed</p>
              </div>

              {/* Row 2 */}
              <div className="text-left">
                <p className="text-white font-medium text-sm">5,320</p>
                <p className="text-[#B5B5B5] text-[10px]">Owners</p>
              </div>
              <div className="flex justify-center">
                <div className="flex flex-col items-center">
                  <p className="text-white font-medium text-sm">Ethereum</p>
                  <p className="text-[#B5B5B5] text-[10px]">Chain</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white font-medium text-sm">April 2025</p>
                <p className="text-[#B5B5B5] text-[10px]">Creation date</p>
              </div>
            </div>

            {/* Recent Activities */}
            <div>
              <h3 className="text-xs font-semibold text-[#8A929A] uppercase mb-4 tracking-wide">
                Recent Activities
              </h3>

              {/* Single Activity Item */}
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-white font-medium text-sm mb-0.5">
                    Received
                  </p>
                  <p className="text-[10px] text-[#8A929A]">Jan 4, 2024</p>
                </div>
                <div className="text-right">
                  <p className="text-[#B1F128] font-medium text-sm mb-0.5">
                    {selectedNft.name}
                  </p>
                  <p className="text-[10px] text-[#8A929A]">$725.00</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ================= DASHBOARD VIEW ================= */
          <>
            {/* Balance Section */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[#8A929A] text-xs">Total Balance</span>
                <IoEyeOutline className="text-[#8A929A] text-xs" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-1">${balance}</h1>
              <p className="text-[#B1F128] text-sm flex items-center gap-1">
                +$61.69 (+2.51%) <span className="text-[#8A929A]">today</span>
              </p>
            </div>

            {/* Action Buttons */}
            <div className="bg-[#010501] p-1 rounded-2xl relative mb-6">
              <div className="pointer-events-none absolute inset-x-4 bottom-px h-px rounded-full bg-[linear-gradient(to_right,rgba(177,241,40,0),rgba(177,241,40,0.95),rgba(177,241,40,0))]" />
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setActiveTab("send")}
                  className={`flex flex-col items-center justify-center py-4 rounded-2xl border transition-all duration-200 ${
                    activeTab === "send"
                      ? "bg-[#081F02] border-[#B1F128] text-[#B1F128]"
                      : "bg-[#151A15] border-transparent text-[#8A929A] hover:bg-[#1A201A]"
                  }`}
                >
                  <RiSendPlaneLine size={20} className="mb-2" />
                  <span className="text-xs font-medium">Send</span>
                </button>
                <button
                  onClick={() => setActiveTab("receive")}
                  className={`flex flex-col items-center justify-center py-4 rounded-2xl border transition-all duration-200 ${
                    activeTab === "receive"
                      ? "bg-[#081F02] border-[#B1F128] text-[#B1F128]"
                      : "bg-[#151A15] border-transparent text-[#8A929A] hover:bg-[#1A201A]"
                  }`}
                >
                  <HiDownload size={20} className="mb-2" />
                  <span className="text-xs font-medium">Receive</span>
                </button>
                <button
                  onClick={() => setActiveTab("activities")}
                  className={`flex flex-col items-center justify-center py-4 rounded-2xl border transition-all duration-200 ${
                    activeTab === "activities"
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
                      className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                        activeAssetFilter === "assets"
                          ? "bg-[#B1F128] text-black"
                          : "text-[#8A929A]"
                      }`}
                    >
                      Assets
                    </button>
                    <button
                      onClick={() => setActiveAssetFilter("nft")}
                      className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                        activeAssetFilter === "nft"
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
                  <div className="space-y-3">
                    {assets.map((asset, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded-2xl bg-[#0F120F] border border-[#1A1F1A]"
                      >
                        <div className="flex items-center gap-3">
                          <Image
                            src={asset.icon}
                            alt={asset.symbol}
                            width={32}
                            height={32}
                          />
                          <div>
                            <p className="text-sm font-bold text-white">
                              {asset.symbol}
                            </p>
                            <p className="text-[10px] text-[#8A929A]">
                              {asset.name}
                            </p>
                          </div>
                        </div>
                        <div>
                          <Image
                            src={asset.trend === "bullish" ? bullish : bearish}
                            alt="trend"
                            width={60}
                            height={20}
                          />
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-white">
                            {asset.amount}
                          </p>
                          <p className="text-[10px] text-[#8A929A]">
                            {asset.value}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {nfts.map((nft) => (
                      /* NFT Button with onClick handler */
                      <button
                        key={nft.id}
                        onClick={() => setSelectedNft(nft)}
                        className="bg-[#0F120F] rounded-2xl p-2 border border-[#1A1F1A] relative group text-left w-full"
                      >
                        <Image
                          src={nft.image}
                          alt={nft.name}
                          width={150}
                          height={150}
                          className="w-full aspect-square rounded-xl object-cover mb-2"
                        />

                        {/* Glass Overlay from previous request */}
                        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-xl border border-white/20 bg-black/20 backdrop-blur-md px-2 py-1.5 shadow-lg">
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold text-white truncate">
                              {nft.name}
                            </p>
                            <p className="text-[8px] text-[#E0E0E0]">
                              Floor: {nft.floor}
                            </p>
                          </div>
                          <TbArrowBarToRight
                            className="text-white shrink-0"
                            size={12}
                          />
                        </div>
                      </button>
                    ))}
                  </div>
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
                    className={`flex-1 pb-3 text-sm font-medium border-b-2 transition-colors ${
                      activeSendTab === "single"
                        ? "border-[#B1F128] text-[#B1F128]"
                        : "border-transparent text-[#8A929A]"
                    }`}
                  >
                    Send To One
                  </button>
                  <button
                    onClick={() => setActiveSendTab("multi")}
                    className={`flex-1 pb-3 text-sm font-medium border-b-2 transition-colors ${
                      activeSendTab === "multi"
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
                <div className="flex flex-col gap-6 mt-2">
                  {transactions.map((tx, i) => (
                    <div key={i} className="flex justify-between items-start">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-bold text-white capitalize">
                          {tx.type}
                        </span>
                        <span className="text-xs font-medium text-[#8A929A]">
                          {tx.date}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        <span
                          className={`text-sm font-bold ${
                            tx.type === "received"
                              ? "text-[#B1F128]"
                              : "text-white"
                          }`}
                        >
                          {tx.amount}
                        </span>
                        <span className="text-xs font-medium text-[#8A929A]">
                          {tx.usd}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
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
