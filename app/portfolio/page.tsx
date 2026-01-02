"use client";

import { useRef, useState, useMemo, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

import Image from "next/image";
import { useWalletConnection } from "@/hooks/useWalletConnection";
import { usePortfolioBalance } from "@/hooks/usePortfolioBalance";
import { useWalletBalances } from "@/hooks/useWalletBalances";
import { useWalletTransactions } from "@/hooks/useWalletTransactions";
import { useWalletNFTs } from "@/hooks/useWalletNFTs";
import { useNFTActivity } from "@/hooks/useNFTActivity";
import { useTWCPrice } from "@/hooks/useTWCPrice";
import { mapWalletTokensToAssets, formatCurrency, getTokenFallbackIcon, formatTokenAmount } from "@/lib/shared/utils/portfolio-formatting";
import { TokenIcon } from "@/components/portfolio/token-icon";
import { useBalanceVisibilityStore } from "@/lib/frontend/store/balance-visibility-store";
import NFTGrid from "@/components/nft/nft-grid";
import NFTDetailCard from "@/components/nft/nft-detail-card";
import type { NFT } from "@/lib/backend/types/nft";
import type { Transaction, WalletToken } from "@/lib/backend/types/wallet";
// Option A: Token Selector Modal (prepared but disabled)
// import TokenSelectorModal from "@/components/swap/token-selector-modal";
// import type { Token } from "@/lib/frontend/types/tokens";
import Skeleton from "@/components/ui/skeleton";
import {
  BalanceSkeleton,
  AssetListSkeleton,
  NFTGridSkeleton,
  SendFormSkeleton,
  ReceiveSkeleton,
  TransactionListSkeleton,
} from "@/components/portfolio/skeletons/portfolio-skeletons";
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
function TransactionRow({ transaction, isBalanceVisible = true }: { transaction: Transaction; isBalanceVisible?: boolean }) {
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
          {isBalanceVisible ? amountText : "****"}
        </span>
        {isBalanceVisible && usdValue && (
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
//  FEATURE FLAG: Receive Tab Token Selection
// ==========================================
// Set to true when Option A (Token Modal) is approved
// Option A: Full Token Selector Modal (like swap page) - shows all tokens/chains
// Option B: Simple Dropdown (current) - shows only user's wallet tokens
const USE_TOKEN_MODAL_FOR_RECEIVE = false;

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

  const [selectedNft, setSelectedNft] = useState<NFT | null>(
    null
  );

  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);

  // Send token selection state
  const [selectedSendToken, setSelectedSendToken] = useState<WalletToken | null>(null);
  const [sendAmount, setSendAmount] = useState<string>('');
  
  // Receive token selection state
  const [selectedReceiveToken, setSelectedReceiveToken] = useState<WalletToken | null>(null);
  
  // Option A: Token Selector Modal state (prepared but disabled)
  // const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  
  // Dropdown refs for closing on selection
  const sendDropdownRef = useRef<HTMLDetailsElement>(null);
  const receiveDropdownRef = useRef<HTMLDetailsElement>(null);

  // Click outside handler to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Close send dropdown if click is outside
      if (sendDropdownRef.current && !sendDropdownRef.current.contains(target)) {
        sendDropdownRef.current.removeAttribute('open');
      }
      
      // Close receive dropdown if click is outside
      if (receiveDropdownRef.current && !receiveDropdownRef.current.contains(target)) {
        receiveDropdownRef.current.removeAttribute('open');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Get connected wallet address
  const { connectedAddress } = useWalletConnection();

  // Balance visibility state
  const { isBalanceVisible, toggleBalanceVisibility } = useBalanceVisibilityStore();

  // Fetch TWC token data for default token
  const { data: twcData, isLoading: isLoadingTWC } = useTWCPrice();

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

  // Get first token from wallet (sorted by USD value, highest first)
  const firstToken = useMemo(() => {
    if (!walletTokens || walletTokens.length === 0) return null;
    return [...walletTokens]
      .sort((a, b) => {
        const aValue = parseFloat(a.usdValue || '0');
        const bValue = parseFloat(b.usdValue || '0');
        return bValue - aValue;
      })[0];
  }, [walletTokens]);

  // Create default TWC token (when no assets)
  const defaultToken = useMemo<WalletToken>(() => {
    if (twcData?.token) {
      // Use prefetched TWC token data
      return {
        address: twcData.token.address,
        symbol: twcData.token.symbol,
        name: twcData.token.name,
        decimals: twcData.token.decimals || 9,
        balance: '0',
        balanceFormatted: '0.00',
        chainId: twcData.token.chainId || 56,
        logoURI: twcData.token.logo || '/assets/logos/twc-token.svg',
        usdValue: '0',
        priceUSD: twcData.token.price || '0',
        priceChange24h: twcData.priceChange24h?.toString(),
      };
    }
    
    // Fallback if TWC not loaded yet
    return {
      address: '0xDA1060158F7D593667cCE0a15DB346BB3FfB3596',
      symbol: 'TWC',
      name: 'TIWI CAT',
      decimals: 9,
      balance: '0',
      balanceFormatted: '0.00',
      chainId: 56,
      logoURI: '/assets/logos/twc-token.svg',
      usdValue: '0',
      priceUSD: '0',
      priceChange24h: undefined,
    };
  }, [twcData]);

  // Token to display: selected token, or first token from wallet, or TWC default
  // Priority: selectedSendToken > firstToken > defaultToken
  const displayToken = selectedSendToken || firstToken || defaultToken;

  // Update selected token when firstToken changes (initial load)
  // Only set if no token is currently selected
  useEffect(() => {
    if (!selectedSendToken) {
      if (firstToken) {
        setSelectedSendToken(firstToken);
      } else {
        setSelectedSendToken(defaultToken);
      }
    }
  }, [firstToken, defaultToken, selectedSendToken]);

  // Reset amount when token changes
  useEffect(() => {
    setSendAmount('');
  }, [selectedSendToken]);

  // Handler for clicking asset to select token
  const handleAssetClick = (asset: typeof assets[0]) => {
    // Find corresponding WalletToken
    const token = walletTokens?.find(
      t => t.symbol === asset.symbol && 
           parseFloat(t.usdValue || '0') > 0
    );
    if (token) {
      setSelectedSendToken(token);
      // Auto-switch to send tab
      if (activeTab !== 'send') {
        setActiveTab('send');
      }
    }
  };

  // Handler for selecting token in send dropdown
  const handleSendTokenSelect = (token: WalletToken) => {
    setSelectedSendToken(token);
    // Close dropdown
    if (sendDropdownRef.current) {
      sendDropdownRef.current.removeAttribute('open');
    }
  };

  // Handler for selecting token in receive dropdown
  const handleReceiveTokenSelect = (token: WalletToken) => {
    setSelectedReceiveToken(token);
    // Close dropdown
    if (receiveDropdownRef.current) {
      receiveDropdownRef.current.removeAttribute('open');
    }
  };

  // Update receive token when firstToken changes
  useEffect(() => {
    if (firstToken && !selectedReceiveToken) {
      setSelectedReceiveToken(firstToken);
    } else if (!firstToken && !selectedReceiveToken) {
      setSelectedReceiveToken(defaultToken);
    }
  }, [firstToken, defaultToken, selectedReceiveToken]);

  // Receive token to display: selected token, or first token from wallet, or TWC default
  // Priority: selectedReceiveToken > firstToken > defaultToken
  const displayReceiveToken = selectedReceiveToken || firstToken || defaultToken;

  // Max button handler
  const handleMaxClick = () => {
    if (displayToken) {
      setSendAmount(displayToken.balanceFormatted);
    }
  };

  // Calculate USD value of send amount
  const sendAmountUSD = useMemo(() => {
    if (!sendAmount || !displayToken?.priceUSD) return '0.00';
    const amount = parseFloat(sendAmount);
    const price = parseFloat(displayToken.priceUSD);
    if (isNaN(amount) || isNaN(price)) return '0.00';
    return (amount * price).toFixed(2);
  }, [sendAmount, displayToken]);

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
              <button
                onClick={toggleBalanceVisibility}
                className="cursor-pointer hover:opacity-80 transition-opacity flex items-center justify-center"
                aria-label="Toggle balance visibility"
              >
                <IoEyeOutline color="#B5B5B5" size={16} />
              </button>
            </span>
            {balanceLoading ? (
              <div className="mt-1">
                <BalanceSkeleton />
              </div>
            ) : balanceError ? (
              <>
            <h1 className="mt-1 text-3xl font-bold text-[#E6ECE9]">
                  {isBalanceVisible ? "$0.00" : "****"}
            </h1>
                <p className="mt-1 text-sm text-[#FF4444]">
                  Error loading balance
                </p>
              </>
            ) : balanceData ? (
              <>
                <h1 className="mt-1 text-3xl font-bold text-[#E6ECE9]">
                  {isBalanceVisible ? `$${displayBalance}` : "****"}
                </h1>
                {dailyChangeText ? (
                  <p className="mt-1 text-sm" style={{ color: dailyChangeColor }}>
                    {isBalanceVisible ? dailyChangeText : "****"} <span className="text-[#9DA4AE]">today</span>
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-[#9DA4AE]">
                    No change data available
                  </p>
                )}
              </>
            ) : (
              <div className="mt-1">
                <BalanceSkeleton />
              </div>
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
                  <AssetListSkeleton isMobile={false} />
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
                    {assets.map((asset, i) => {
                      // Find corresponding WalletToken for this asset
                      const token = walletTokens?.find(
                        t => t.symbol === asset.symbol && 
                             parseFloat(t.usdValue || '0') > 0
                      );
                      const isSelected = selectedSendToken && token && 
                        selectedSendToken.symbol === token.symbol &&
                        selectedSendToken.address === token.address &&
                        selectedSendToken.chainId === token.chainId;
                      
                      return (
                  <li
                    key={i}
                        onClick={() => handleAssetClick(asset)}
                        className={`grid grid-cols-[20px_100px_100px_2fr] gap-3 items-center rounded-xl px-2 py-3 cursor-pointer transition-all ${
                          isSelected 
                            ? "bg-[#1F261E] border border-[#B1F128]/30" 
                            : "bg-[#0E1310] hover:bg-[#141A16]"
                        }`}
                      >
                        {/* Column 1: Logo */}
                        <div className="shrink-0 flex items-center justify-start">
                      <Image
                        src={asset.icon}
                        alt={`${asset.symbol} icon`}
                        width={20}
                        height={20}
                            className="opacity-90 rounded-full"
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
                        {isBalanceVisible ? asset.amount : "****"}
                      </p>
                      <p className="text-xs text-[#8A929A]">{isBalanceVisible ? asset.value : "****"}</p>
                    </div>
                        {/* Selected indicator */}
                        {isSelected && (
                          <div className="absolute top-2 right-2">
                            <div className="w-2 h-2 rounded-full bg-[#B1F128]" />
                          </div>
                        )}
                  </li>
                      );
                    })}
              </ul>
                )}
              </>
            )}

            {/* NFT GRID */}
            {activeLeftTab === "nft" && (
              <>
                {nftsLoading ? (
                  <NFTGridSkeleton />
                ) : nftsError ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <p className="text-sm text-[#FF4444] mb-2">
                      Error loading NFTs
                    </p>
                    <p className="text-xs text-[#8A929A]">
                      {nftsError}
                        </p>
                      </div>
                ) : nfts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <p className="text-sm text-[#8A929A] mb-2">
                      No NFTs found
                    </p>
                    <p className="text-xs text-[#6E7873]">
                      Start collecting NFTs to see them here
                    </p>
                      </div>
                ) : (
                  <NFTGrid
                    nfts={nfts}
                    isLoading={false}
                    onNFTSelect={setSelectedNft}
                    selectedNFT={selectedNft}
                  />
                )}
              </>
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
                  {tokensLoading ? (
                    <SendFormSkeleton />
                  ) : (
                <>
                  {/* Asset Header with Go Back button */}
                  <div className="mb-2 flex items-start justify-between">
                        {tokensLoading || isLoadingTWC ? (
                          <div className="space-y-2">
                            <Skeleton className="h-5 w-24 skeleton-shimmer" />
                            <Skeleton className="h-6 w-32 skeleton-shimmer" />
                            <Skeleton className="h-4 w-40 skeleton-shimmer" />
                          </div>
                        ) : displayToken ? (
                    <div>
                      <span className="flex items-center gap-2">
                              <TokenIcon
                                src={displayToken.logoURI || getTokenFallbackIcon(displayToken.symbol)}
                                symbol={displayToken.symbol}
                                alt={displayToken.symbol}
                                width={20}
                                height={20}
                              />
                              <p className="text-sm text-[#FFF]">{displayToken.symbol}</p>
                      </span>
                      <p className="text-xl text-[#FFF] font-medium">
                              {isBalanceVisible ? formatTokenAmount(displayToken.balanceFormatted, 6) : "****"}
                      </p>
                      <div className="text-xs flex gap-2 items-center">
                              <p className="text-[#8A929A]">
                                {isBalanceVisible ? formatCurrency(displayToken.usdValue) : "****"}
                              </p>
                              {isBalanceVisible && displayToken.priceChange24h && parseFloat(displayToken.priceChange24h) !== 0 && (
                                <span className={`${parseFloat(displayToken.priceChange24h) >= 0 ? 'text-[#34C759]' : 'text-[#FF4444]'} flex`}>
                          <FaArrowUp
                            size={16}
                            className="bg-[#1B1B1B] p-1 rounded-full"
                          />
                                  {Math.abs(parseFloat(displayToken.priceChange24h)).toFixed(2)}%
                        </span>
                              )}
                        <p className="text-[#B5B5B5]">Today</p>
                      </div>
                    </div>
                        ) : (
                          <div className="space-y-2">
                            <Skeleton className="h-5 w-24 skeleton-shimmer" />
                            <Skeleton className="h-6 w-32 skeleton-shimmer" />
                          </div>
                        )}

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
                            <details ref={sendDropdownRef} className="bg-[#121712] rounded-full group relative w-fit">
                            {/* Trigger */}
                            <summary className="flex cursor-pointer list-none items-center gap-3 rounded-full bg-[#121712] px-2 py-3 text-left outline-none">
                              {/* Icon */}
                                <TokenIcon
                                  src={displayToken.logoURI || getTokenFallbackIcon(displayToken.symbol)}
                                  symbol={displayToken.symbol}
                                  alt={displayToken.name}
                                width={36}
                                height={36}
                                className="shrink-0"
                              />

                              {/* Text */}
                              <div className="leading-tight">
                                <p className="text-sm font-semibold text-[#FFF]">
                                    {displayToken.symbol}
                                </p>
                                <p className="text-xs font-medium text-[#7C7C7C]">
                                    {displayToken.name}
                                </p>
                              </div>
                              <IoChevronDown
                                size={16}
                                className="ml-2 text-[#B5B5B5] transition-transform group-open:rotate-180"
                              />
                            </summary>

                            {/* Dropdown menu */}
                              <div className="absolute left-0 z-10 mt-2 w-full min-w-55 max-h-[300px] overflow-y-auto rounded-xl bg-[#0B0F0A] p-2 shadow-[0_10px_30px_rgba(0,0,0,0.6)] dropdown-scrollbar">
                                {walletTokens && walletTokens.length > 0 ? (
                                  walletTokens.map((token) => (
                                    <button
                                      key={`${token.chainId}-${token.address}`}
                                      onClick={() => handleSendTokenSelect(token)}
                                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 hover:bg-[#141A16]"
                                    >
                                      <TokenIcon
                                        src={token.logoURI || getTokenFallbackIcon(token.symbol)}
                                        symbol={token.symbol}
                                        alt={token.symbol}
                                  width={24}
                                  height={24}
                                />
                                <span className="text-sm text-[#E6ECE9]">
                                        {token.name}
                                </span>
                              </button>
                                  ))
                                ) : (
                                  <div className="px-3 py-2 text-xs text-[#8A929A]">
                                    No tokens available
                                  </div>
                                )}
                            </div>
                          </details>

                            <div className="text-right">
                              <span className="flex items-center gap-1 justify-end mb-1">
                              <BsWallet2 size={10} />
                              <p className="text-xs text-[#B5B5B5]">
                                  {isBalanceVisible ? `${formatTokenAmount(displayToken.balanceFormatted, 6)} ${displayToken.symbol}` : "****"}
                              </p>
                                {isBalanceVisible && (
                                <button
                                  onClick={handleMaxClick}
                                  className="text-[#B1F128] text-xs py-1 px-2 ml-1 rounded-full bg-[#1F261E] hover:bg-[#2A3528] transition-colors cursor-pointer"
                                >
                                Max
                                </button>
                                )}
                            </span>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={sendAmount}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  // Allow numbers, decimal point, and empty string
                                  if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                    setSendAmount(value);
                                  }
                                }}
                                placeholder="0.00"
                                className="text-right text-white font-medium text-xl bg-transparent border-none outline-none w-full max-w-32"
                              />
                            <p className="text-right text-[#7C7C7C] font-medium text-xs">
                                ${sendAmountUSD}
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


                      {/* Chart Placeholder - Only show when not loading */}
                      {!tokensLoading && (
                        <>
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
                    </>
                  )}
                </>
              )}

              {/* Receive tab content */}
              {activeTab === "receive" && (
                <>
                  {tokensLoading ? (
                    <ReceiveSkeleton />
                  ) : (
                <div className="space-y-4">
                  <div className="bg-[#0B0F0A] p-4 rounded-md">
                    <p className="text-xs text-[#7C7C7C] mb-2">Select Asset</p>

                        {/* Option A: Token Selector Modal (disabled - set USE_TOKEN_MODAL_FOR_RECEIVE = true to enable) */}
                        {USE_TOKEN_MODAL_FOR_RECEIVE ? (
                          <>
                            {/* Token Selector Button */}
                            <button
                              onClick={() => {
                                // setReceiveModalOpen(true);
                              }}
                              className="w-full flex items-center gap-3 rounded-full bg-[#121712] p-2 text-left hover:bg-[#1f261e] transition-colors"
                            >
                              {displayReceiveToken ? (
                                <>
                                  <TokenIcon
                                    src={displayReceiveToken.logoURI || getTokenFallbackIcon(displayReceiveToken.symbol)}
                                    symbol={displayReceiveToken.symbol}
                                    alt={displayReceiveToken.symbol}
                                    width={36}
                                    height={36}
                                  />
                                  <div className="ml-3 leading-tight flex-1">
                                    <p className="text-sm font-semibold text-[#FFF]">
                                      {displayReceiveToken.symbol}
                                    </p>
                                    <p className="text-xs font-medium text-[#7C7C7C]">
                                      {displayReceiveToken.name}
                                    </p>
                                  </div>
                                </>
                              ) : (
                                <span className="text-sm text-[#7C7C7C]">Select Token</span>
                              )}
                              <IoChevronDown size={16} className="ml-auto text-[#B5B5B5]" />
                            </button>
                            {/* Token Selector Modal - Uncomment when approved */}
                            {/* <TokenSelectorModal
                              open={receiveModalOpen}
                              onOpenChange={setReceiveModalOpen}
                              onTokenSelect={handleReceiveTokenSelectFromModal}
                              selectedToken={convertWalletTokenToToken(displayReceiveToken)}
                            /> */}
                          </>
                        ) : (
                          /* Option B: Simple Dropdown (ACTIVE) */
                          <details ref={receiveDropdownRef} className="bg-[#121712] rounded-full group relative w-full">
                      {/* Trigger */}
                      <summary className="w-full flex cursor-pointer list-none items-center rounded-full bg-[#121712] p-2 text-left outline-none">
                              {displayReceiveToken ? (
                                <>
                                  <TokenIcon
                                    src={displayReceiveToken.logoURI || getTokenFallbackIcon(displayReceiveToken.symbol)}
                                    symbol={displayReceiveToken.symbol}
                                    alt={displayReceiveToken.symbol}
                          width={36}
                          height={36}
                        />
                        <div className="ml-3 leading-tight">
                          <p className="text-sm font-semibold text-[#FFF]">
                                      {displayReceiveToken.symbol}
                          </p>
                          <p className="text-xs font-medium text-[#7C7C7C]">
                                      {displayReceiveToken.name}
                          </p>
                        </div>
                                </>
                              ) : (
                                <>
                                  <div className="w-9 h-9 rounded-full bg-[#1F261E] flex items-center justify-center shrink-0">
                                    <span className="text-white text-xs">?</span>
                                  </div>
                                  <div className="ml-3 leading-tight">
                                    <p className="text-sm font-semibold text-[#FFF]">
                                      Select Token
                                    </p>
                                  </div>
                                </>
                              )}
                        <IoChevronDown
                          size={16}
                          className="ml-auto text-[#B5B5B5] transition-transform group-open:rotate-180"
                        />
                      </summary>

                      {/* Dropdown menu */}
                            <div className="absolute left-0 z-10 mt-2 w-full min-w-55 max-h-[300px] overflow-y-auto rounded-xl bg-[#0B0F0A] p-2 shadow-[0_10px_30px_rgba(0,0,0,0.6)] dropdown-scrollbar">
                              {walletTokens && walletTokens.length > 0 ? (
                                walletTokens.map((token) => (
                                  <button
                                    key={`${token.chainId}-${token.address}`}
                                    onClick={() => handleReceiveTokenSelect(token)}
                                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 hover:bg-[#141A16]"
                                  >
                                    <TokenIcon
                                      src={token.logoURI || getTokenFallbackIcon(token.symbol)}
                                      symbol={token.symbol}
                                      alt={token.symbol}
                                      width={24}
                                      height={24}
                                    />
                                    <div className="flex-1 text-left">
                                      <p className="text-sm font-semibold text-[#E6ECE9]">
                                        {token.symbol}
                                      </p>
                                      <p className="text-xs text-[#7C7C7C]">
                                        {token.name}
                                      </p>
                                    </div>
                        </button>
                                ))
                              ) : (
                                <div className="px-3 py-2 text-xs text-[#8A929A]">
                                  No tokens available
                                </div>
                              )}
                      </div>
                    </details>
                        )}
                  </div>

                  {/* Warning */}
                  <div className="rounded-xl bg-[#2B1F0D] px-4 py-3 text-xs text-center text-[#FFF]">
                    Only send{" "}
                        <span className="font-semibold">
                          {displayReceiveToken ? `${displayReceiveToken.name} (${displayReceiveToken.symbol})` : 'tokens'}
                        </span> to
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
                            {connectedAddress || 'Not connected'}
                          </p>
                          <button 
                            onClick={() => {
                              if (connectedAddress) {
                                navigator.clipboard.writeText(connectedAddress);
                                setCopied(true);
                                setTimeout(() => setCopied(false), 2000);
                              }
                            }}
                            className="flex items-center gap-2 rounded-full border border-[#B1F128] w-40 px-3 py-1.5 text-xs text-[#B1F128] hover:bg-[#B1F128]/10 transition-colors"
                          >
                            {copied ? <FiCheck size={14} /> : <FiCopy size={14} />}
                            {copied ? 'Copied!' : 'Copy Address'}
                      </button>

                          <button 
                            onClick={() => {
                              if (connectedAddress && navigator.share) {
                                navigator.share({
                                  title: 'My Wallet Address',
                                  text: connectedAddress,
                                });
                              }
                            }}
                            className="flex items-center gap-2 rounded-full border border-[#B1F128] w-40 px-3 py-1.5 text-xs text-[#B1F128] hover:bg-[#B1F128]/10 transition-colors"
                          >
                        <GoShareAndroid size={14} />
                        Share Address
                      </button>
                    </div>
                  </div>
                </div>
                  )}
                </>
              )}

              {/* Activities tab content */}
              {activeTab === "activities" && (
                  <div className="h-125.5 w-full overflow-y-auto rounded-2xl px-4">
                  {transactionsLoading ? (
                    <TransactionListSkeleton />
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
                        <TransactionRow key={tx.id} transaction={tx} isBalanceVisible={isBalanceVisible} />
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
  const [selectedNft, setSelectedNft] = useState<NFT | null>(
    null
  );

  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);

  // Send token selection state
  const [selectedSendToken, setSelectedSendToken] = useState<WalletToken | null>(null);
  const [sendAmount, setSendAmount] = useState<string>('');
  
  // Receive token selection state
  const [selectedReceiveToken, setSelectedReceiveToken] = useState<WalletToken | null>(null);
  
  // Dropdown refs for closing on selection
  const sendDropdownRef = useRef<HTMLDetailsElement>(null);
  const receiveDropdownRef = useRef<HTMLDetailsElement>(null);

  // Click outside handler to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Close send dropdown if click is outside
      if (sendDropdownRef.current && !sendDropdownRef.current.contains(target)) {
        sendDropdownRef.current.removeAttribute('open');
      }
      
      // Close receive dropdown if click is outside
      if (receiveDropdownRef.current && !receiveDropdownRef.current.contains(target)) {
        receiveDropdownRef.current.removeAttribute('open');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Get connected wallet address
  const { connectedAddress } = useWalletConnection();

  // Balance visibility state
  const { isBalanceVisible, toggleBalanceVisibility } = useBalanceVisibilityStore();

  // Fetch TWC token data for default token
  const { data: twcData, isLoading: isLoadingTWC } = useTWCPrice();

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

  // Get first token from wallet (sorted by USD value, highest first)
  const firstToken = useMemo(() => {
    if (!walletTokens || walletTokens.length === 0) return null;
    return [...walletTokens]
      .sort((a, b) => {
        const aValue = parseFloat(a.usdValue || '0');
        const bValue = parseFloat(b.usdValue || '0');
        return bValue - aValue;
      })[0];
  }, [walletTokens]);

  // Create default TWC token (when no assets)
  const defaultToken = useMemo<WalletToken>(() => {
    if (twcData?.token) {
      return {
        address: twcData.token.address,
        symbol: twcData.token.symbol,
        name: twcData.token.name,
        decimals: twcData.token.decimals || 9,
        balance: '0',
        balanceFormatted: '0.00',
        chainId: twcData.token.chainId || 56,
        logoURI: twcData.token.logo || '/assets/logos/twc-token.svg',
        usdValue: '0',
        priceUSD: twcData.token.price || '0',
        priceChange24h: twcData.priceChange24h?.toString(),
      };
    }
    return {
      address: '0xDA1060158F7D593667cCE0a15DB346BB3FfB3596',
      symbol: 'TWC',
      name: 'TIWI CAT',
      decimals: 9,
      balance: '0',
      balanceFormatted: '0.00',
      chainId: 56,
      logoURI: '/assets/logos/twc-token.svg',
      usdValue: '0',
      priceUSD: '0',
      priceChange24h: undefined,
    };
  }, [twcData]);

  // Token to display: selected token, or first token from wallet, or TWC default
  // Priority: selectedSendToken > firstToken > defaultToken
  const displayToken = selectedSendToken || firstToken || defaultToken;

  // Update selected token when firstToken changes (initial load)
  // Only set if no token is currently selected
  useEffect(() => {
    if (!selectedSendToken) {
      if (firstToken) {
        setSelectedSendToken(firstToken);
      } else {
        setSelectedSendToken(defaultToken);
      }
    }
  }, [firstToken, defaultToken, selectedSendToken]);

  // Reset amount when token changes
  useEffect(() => {
    setSendAmount('');
  }, [selectedSendToken]);

  // Handler for clicking asset to select token
  const handleAssetClick = (asset: typeof assets[0]) => {
    const token = walletTokens?.find(
      t => t.symbol === asset.symbol && 
           parseFloat(t.usdValue || '0') > 0
    );
    if (token) {
      setSelectedSendToken(token);
      // Auto-switch to send tab
      if (activeTab !== 'send') {
        setActiveTab('send');
      }
    }
  };

  // Handler for selecting token in send dropdown
  const handleSendTokenSelect = (token: WalletToken) => {
    setSelectedSendToken(token);
    // Close dropdown
    if (sendDropdownRef.current) {
      sendDropdownRef.current.removeAttribute('open');
    }
  };

  // Handler for selecting token in receive dropdown
  const handleReceiveTokenSelect = (token: WalletToken) => {
    setSelectedReceiveToken(token);
    // Close dropdown
    if (receiveDropdownRef.current) {
      receiveDropdownRef.current.removeAttribute('open');
    }
  };

  // Update receive token when firstToken changes
  useEffect(() => {
    if (firstToken && !selectedReceiveToken) {
      setSelectedReceiveToken(firstToken);
    } else if (!firstToken && !selectedReceiveToken) {
      setSelectedReceiveToken(defaultToken);
    }
  }, [firstToken, defaultToken, selectedReceiveToken]);

  // Receive token to display: selected token, or first token from wallet, or TWC default
  // Priority: selectedReceiveToken > firstToken > defaultToken
  const displayReceiveToken = selectedReceiveToken || firstToken || defaultToken;

  // Max button handler
  const handleMaxClick = () => {
    if (displayToken) {
      setSendAmount(displayToken.balanceFormatted);
    }
  };

  // Calculate USD value of send amount
  const sendAmountUSD = useMemo(() => {
    if (!sendAmount || !displayToken?.priceUSD) return '0.00';
    const amount = parseFloat(sendAmount);
    const price = parseFloat(displayToken.priceUSD);
    if (isNaN(amount) || isNaN(price)) return '0.00';
    return (amount * price).toFixed(2);
  }, [sendAmount, displayToken]);

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
                <button
                  onClick={toggleBalanceVisibility}
                  className="cursor-pointer hover:opacity-80 transition-opacity flex items-center justify-center"
                  aria-label="Toggle balance visibility"
                >
                  <IoEyeOutline className="text-[#8A929A]" size={16} />
                </button>
              </div>
              {balanceLoading ? (
                <div className="mb-1">
                  <BalanceSkeleton />
                </div>
              ) : balanceError ? (
                <>
                  <h1 className="text-3xl font-bold text-white mb-1">
                    {isBalanceVisible ? "$0.00" : "****"}
                  </h1>
                  <p className="text-[#FF4444] text-sm">
                    Error loading balance
                  </p>
                </>
              ) : balanceData ? (
                <>
                  <h1 className="text-3xl font-bold text-white mb-1">
                    {isBalanceVisible ? `$${displayBalance}` : "****"}
                  </h1>
                  {dailyChangeText ? (
                    <p className="text-sm flex items-center gap-1" style={{ color: dailyChangeColor }}>
                      {isBalanceVisible ? dailyChangeText : "****"} <span className="text-[#8A929A]">today</span>
                    </p>
                  ) : (
                    <p className="text-[#8A929A] text-sm">
                      No change data available
                    </p>
                  )}
                </>
              ) : (
                <div className="mb-1">
                  <BalanceSkeleton />
                </div>
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
                      <AssetListSkeleton isMobile={true} />
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
                        {assets.map((asset, i) => {
                          const token = walletTokens?.find(
                            t => t.symbol === asset.symbol && 
                                 parseFloat(t.usdValue || '0') > 0
                          );
                          const isSelected = selectedSendToken && token && 
                            selectedSendToken.symbol === token.symbol &&
                            selectedSendToken.address === token.address &&
                            selectedSendToken.chainId === token.chainId;
                          
                          return (
                      <div
                        key={i}
                            onClick={() => handleAssetClick(asset)}
                            className={`grid grid-cols-[32px_120px_60px_1fr] gap-3 items-center p-3 rounded-2xl border cursor-pointer transition-all ${
                              isSelected 
                                ? "bg-[#1F261E] border-[#B1F128]/30" 
                                : "bg-[#0F120F] border-[#1A1F1A]"
                            }`}
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
                            {/* Selected indicator */}
                            {isSelected && (
                              <div className="absolute top-2 right-2">
                                <div className="w-2 h-2 rounded-full bg-[#B1F128]" />
                      </div>
                            )}
                  </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {nftsLoading ? (
                      <NFTGridSkeleton />
                    ) : nftsError ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <p className="text-sm text-[#FF4444] mb-2">
                          Error loading NFTs
                        </p>
                        <p className="text-xs text-[#8A929A]">
                          {nftsError}
                            </p>
                          </div>
                    ) : nfts.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <p className="text-sm text-[#8A929A] mb-2">
                          No NFTs found
                        </p>
                        <p className="text-xs text-[#6E7873]">
                          Start collecting NFTs to see them here
                        </p>
                      </div>
                    ) : (
                      <NFTGrid
                        nfts={nfts}
                        isLoading={false}
                        onNFTSelect={setSelectedNft}
                        selectedNFT={selectedNft}
                      />
                    )}
                  </>
                )}
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
          </>
            )}

            {/* SEND FLOW */}
            {activeTab === "send" && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            {tokensLoading ? (
              <SendFormSkeleton />
            ) : (
              <>
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
                        <details ref={sendDropdownRef} className="bg-[#121712] rounded-full group relative w-fit">
                          <summary className="flex cursor-pointer list-none items-center gap-3 rounded-full bg-[#121712] px-2 py-3 text-left outline-none">
                            {/* Icon */}
                            <TokenIcon
                              src={displayToken.logoURI || getTokenFallbackIcon(displayToken.symbol)}
                              symbol={displayToken.symbol}
                              alt={displayToken.name}
                              width={36}
                              height={36}
                              className="shrink-0"
                            />
                            {/* Text */}
                            <div className="leading-tight">
                              <p className="text-sm font-semibold text-[#FFF]">
                                {displayToken.symbol}
                              </p>
                              <p className="text-xs font-medium text-[#7C7C7C]">
                                {displayToken.name}
                              </p>
                            </div>
                            <IoChevronDown
                              size={16}
                              className="ml-2 text-[#B5B5B5] transition-transform group-open:rotate-180"
                            />
                          </summary>
                          {/* Dropdown menu */}
                          <div className="absolute left-0 z-10 mt-2 w-full min-w-55 max-h-[300px] overflow-y-auto rounded-xl bg-[#0B0F0A] p-2 shadow-[0_10px_30px_rgba(0,0,0,0.6)] dropdown-scrollbar">
                            {walletTokens && walletTokens.length > 0 ? (
                              walletTokens.map((token) => (
                                <button
                                  key={`${token.chainId}-${token.address}`}
                                  onClick={() => handleSendTokenSelect(token)}
                                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 hover:bg-[#141A16]"
                                >
                                  <TokenIcon
                                    src={token.logoURI || getTokenFallbackIcon(token.symbol)}
                                    symbol={token.symbol}
                                    alt={token.symbol}
                                width={24}
                                height={24}
                              />
                              <span className="text-sm text-[#E6ECE9]">
                                    {token.name}
                              </span>
                            </button>
                              ))
                            ) : (
                              <div className="px-3 py-2 text-xs text-[#8A929A]">
                                No tokens available
                              </div>
                            )}
                          </div>
                        </details>
                      </div>

                      <div className="text-right">
                        <div className="flex items-center gap-1 justify-end text-[#8A929A] text-[10px] mb-0.5">
                          <BsWallet2 />
                          <span>{isBalanceVisible ? `${formatTokenAmount(displayToken.balanceFormatted, 6)}${displayToken.symbol}` : "****"}</span>
                          {isBalanceVisible && (
                          <button
                            onClick={handleMaxClick}
                            className="text-[#B1F128] text-[10px] py-0.5 px-1.5 ml-1 rounded-full bg-[#1F261E]"
                          >
                            Max
                          </button>
                          )}
                        </div>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={sendAmount}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || /^\d*\.?\d*$/.test(value)) {
                              setSendAmount(value);
                            }
                          }}
                          placeholder="0.00"
                          className="text-lg font-bold text-white bg-transparent border-none outline-none w-full max-w-24 text-right"
                        />
                        <p className="text-xs text-[#8A929A]">{isBalanceVisible ? `$${sendAmountUSD}` : "****"}</p>
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
              </>
                )}
              </div>
            )}

            {/* RECEIVE FLOW */}
            {activeTab === "receive" && (
          <>
            {tokensLoading ? (
              <ReceiveSkeleton />
            ) : (
              <div className="space-y-4">
                <div className="bg-[#0F120F] p-4 rounded-xl">
                  <p className="text-xs text-[#7C7C7C] mb-2">Select Asset</p>

                  {/* Asset dropdown */}
                  <details ref={receiveDropdownRef} className="bg-[#121712] rounded-full group relative w-full">
                    {/* Trigger */}
                    <summary className="w-full flex cursor-pointer list-none items-center rounded-full bg-[#121712] p-2 text-left outline-none">
                      {/* Icon */}
                      <TokenIcon
                        src={displayReceiveToken.logoURI || getTokenFallbackIcon(displayReceiveToken.symbol)}
                        symbol={displayReceiveToken.symbol}
                        alt={displayReceiveToken.name}
                        width={36}
                        height={36}
                        className="shrink-0"
                      />

                      {/* Text */}
                      <div className="ml-3 leading-tight">
                        <p className="text-sm font-semibold text-[#FFF]">{displayReceiveToken.symbol}</p>
                        <p className="text-xs font-medium text-[#7C7C7C]">
                          {displayReceiveToken.name}
                        </p>
                      </div>
                      <IoChevronDown
                        size={16}
                        className="ml-auto text-[#B5B5B5] transition-transform group-open:rotate-180"
                      />
                    </summary>

                    {/* Dropdown menu */}
                    <div className="absolute left-0 z-10 mt-2 w-full min-w-55 max-h-[300px] overflow-y-auto rounded-xl bg-[#0B0F0A] p-2 shadow-[0_10px_30px_rgba(0,0,0,0.6)] dropdown-scrollbar">
                      {walletTokens && walletTokens.length > 0 ? (
                        walletTokens.map((token) => (
                          <button
                            key={`${token.chainId}-${token.address}`}
                            onClick={() => handleReceiveTokenSelect(token)}
                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 hover:bg-[#141A16]"
                          >
                            <TokenIcon
                              src={token.logoURI || getTokenFallbackIcon(token.symbol)}
                              symbol={token.symbol}
                              alt={token.symbol}
                              width={24}
                              height={24}
                            />
                            <span className="text-sm text-[#E6ECE9]">{token.name}</span>
                      </button>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-xs text-[#8A929A]">
                          No tokens available
                        </div>
                      )}
                    </div>
                  </details>
                </div>

                {/* Warning */}
                <div className="rounded-xl bg-[#2B1F0D] px-1 py-3 text-xs text-center text-[#FFF]">
                  Only send{" "}
                  <span className="font-semibold">{displayReceiveToken.name} ({displayReceiveToken.symbol})</span> to this
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
                      {connectedAddress || 'Connect wallet to see address'}
                    </p>

                    <button 
                      onClick={async () => {
                        if (connectedAddress) {
                          await navigator.clipboard.writeText(connectedAddress);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 1500);
                        }
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-full border border-[#B1F128] px-3 py-1.5 text-xs text-[#B1F128] mt-3"
                    >
                      {copied ? <FiCheck size={14} /> : <FiCopy size={14} />}
                      {copied ? 'Copied!' : 'Copy Address'}
                    </button>

                    <button 
                      onClick={async () => {
                        if (connectedAddress && navigator.share) {
                          try {
                            await navigator.share({
                              title: 'My Wallet Address',
                              text: connectedAddress,
                            });
                          } catch (err) {
                            // User cancelled or error
                          }
                        }
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-full border border-[#B1F128] px-3 py-1.5 text-xs text-[#B1F128] mt-2"
                    >
                      <GoShareAndroid size={14} />
                      Share Address
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
            )}

            {/* ACTIVITIES */}
            {activeTab === "activities" && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            {transactionsLoading ? (
              <TransactionListSkeleton />
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
      </div>
    </div>
  );
}

// ==========================================
//  MAIN PAGE (Responsive Logic)
// ==========================================
export default function WalletPage() {
  const queryClient = useQueryClient();
  const { connectedAddress } = useWalletConnection();

  // Prefetch portfolio data when wallet is connected
  useEffect(() => {
    if (!connectedAddress) return;

    // Prefetch wallet balances
    import('@/hooks/useWalletBalances').then((module) => {
      if (module.getWalletBalancesQueryKey && module.fetchWalletBalances) {
        queryClient.prefetchQuery({
          queryKey: module.getWalletBalancesQueryKey(connectedAddress),
          queryFn: () => module.fetchWalletBalances(connectedAddress),
        });
      }
    }).catch(() => {
      // Silently fail - prefetching is optional
    });

    // Prefetch wallet transactions
    import('@/hooks/useWalletTransactions').then((module) => {
      if (module.getWalletTransactionsQueryKey && module.fetchWalletTransactions) {
        queryClient.prefetchQuery({
          queryKey: module.getWalletTransactionsQueryKey(connectedAddress, 50),
          queryFn: () => module.fetchWalletTransactions({
            walletAddress: connectedAddress,
            limit: 50,
            offset: 0,
          }),
        });
      }
    }).catch(() => {
      // Silently fail - prefetching is optional
    });

    // Prefetch wallet NFTs
    import('@/hooks/useWalletNFTs').then((module) => {
      if (module.getWalletNFTsQueryKey && module.fetchWalletNFTs) {
        queryClient.prefetchQuery({
          queryKey: module.getWalletNFTsQueryKey(connectedAddress),
          queryFn: () => module.fetchWalletNFTs(connectedAddress),
        });
      }
    }).catch(() => {
      // Silently fail - prefetching is optional
    });
  }, [connectedAddress, queryClient]);

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
