"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IoChevronDownOutline, IoCloseOutline, IoSearchOutline } from "react-icons/io5";
import { useChains } from "@/hooks/useChains";
import { fetchTokens } from "@/lib/frontend/api/tokens";
import type { Token } from "@/lib/frontend/types/tokens";
import { TokenIcon } from "@/components/portfolio/token-icon";
import { getTokenFallbackIcon } from "@/lib/shared/utils/portfolio-formatting";
import { useDebounce } from "@/hooks/useDebounce";
import PoolSuccessModal from "./pool-success-modal";
import { useAccount, useChainId, useWaitForTransactionReceipt } from "wagmi";
import { useWalletConnection } from "@/hooks/useWalletConnection";
import ConnectWalletModal from "@/components/wallet/connect-wallet-modal";
import { useFactoryStaking } from "@/hooks/useFactoryStaking";
import { parseUnits, Address } from "viem";

interface CreatePoolModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreatePoolModal({
  open,
  onOpenChange,
}: CreatePoolModalProps) {
  const [step, setStep] = useState(1);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const { chains, isLoading: chainsLoading } = useChains(); // Fetches all supported chains

  // Wallet connection
  const { address: connectedAddress, isConnected } = useAccount();
  const chainId = useChainId();
  const { openModal: openWalletModal, isModalOpen: isWalletModalOpen, closeModal: closeWalletModal } = useWalletConnection();

  // Factory staking hook - for creating pools on-chain
  const factoryStaking = useFactoryStaking({ enabled: isConnected });

  // Step 1 fields
  const [selectedChain, setSelectedChain] = useState<{ id: number; name: string } | null>(null);
  const [selectedToken, setSelectedToken] = useState<{
    symbol: string;
    name: string;
    address: string;
    logo: string;
  } | null>(null);
  const [allTokens, setAllTokens] = useState<Token[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [tokenSearchQuery, setTokenSearchQuery] = useState("");
  const [showTokenDropdown, setShowTokenDropdown] = useState(false);
  const [minStakingPeriod, setMinStakingPeriod] = useState<number | "">("");
  const [minStakeAmount, setMinStakeAmount] = useState("");
  const [maxStakeAmount, setMaxStakeAmount] = useState("");
  const [showChainDropdown, setShowChainDropdown] = useState(false);


  // Step 2 fields
  const [stakeModificationFee, setStakeModificationFee] = useState(false);
  const [timeBoost, setTimeBoost] = useState(false);

  const [stakePoolCreationFee, setStakePoolCreationFee] = useState("0.15");
  const [rewardPoolCreationFee, setRewardPoolCreationFee] = useState("");

  // Reward configuration fields
  const [maxTvl, setMaxTvl] = useState(""); // Maximum TVL or Total Staked Tokens
  const [poolReward, setPoolReward] = useState(""); // Pool Reward
  const [rewardDurationDays, setRewardDurationDays] = useState<number | "">(""); // Reward duration in days (converted to seconds)

  const chainRef = useRef<HTMLDivElement>(null);
  const tokenRef = useRef<HTMLDivElement>(null);




  // Debounce search query for API calls (400ms delay)
  const debouncedSearchQuery = useDebounce(tokenSearchQuery, 400);

  // Set default chain to Ethereum if available
  useEffect(() => {
    if (chains.length > 0 && !selectedChain) {
      const ethereum = chains.find(c => c.name === "Ethereum" || c.id === "1");
      if (ethereum) {
        setSelectedChain({ id: parseInt(ethereum.id, 10), name: ethereum.name });
      }
    }
  }, [chains, selectedChain]);

  // Reset selected token when chain changes
  useEffect(() => {
    if (selectedChain) {
      setSelectedToken(null);
      setTokenSearchQuery("");
    }
  }, [selectedChain]);

  // Fetch tokens from the selected chain (sync with chain selection)
  useEffect(() => {
    if (open && selectedChain) {
      setIsLoadingTokens(true);
      // Fetch tokens - filter by selected chain
      fetchTokens({
        chains: [selectedChain.id], // Filter tokens by selected chain
        limit: 1000, // High limit to get all available tokens from the selected chain
        query: debouncedSearchQuery.trim() || undefined, // Pass debounced search query to API
      })
        .then((tokens) => {
          setAllTokens(tokens);
        })
        .catch((error) => {
          console.error("Error fetching tokens:", error);
          setAllTokens([]);
        })
        .finally(() => {
          setIsLoadingTokens(false);
        });
    } else if (open && !selectedChain) {
      // If no chain is selected, clear tokens
      setAllTokens([]);
    }
  }, [open, selectedChain, debouncedSearchQuery]);

  // Client-side filtering for instant results while typing (before debounce)
  // Also filter by selected chain to ensure tokens match the chain
  const filteredTokens = useMemo(() => {
    let tokens = allTokens;

    // Filter by selected chain if available (double-check chainId matches)
    if (selectedChain) {
      tokens = tokens.filter(token => {
        // Match by chainId if available, or by chain name
        return token.chainId === selectedChain.id ||
          token.chain === selectedChain.name ||
          parseInt(token.chain) === selectedChain.id;
      });
    }

    // If no search query, show all filtered tokens
    if (!tokenSearchQuery.trim()) {
      return tokens;
    }

    // Instant client-side filtering while user types
    const query = tokenSearchQuery.toLowerCase().trim();
    return tokens.filter(
      (token) =>
        token.symbol.toLowerCase().includes(query) ||
        token.name.toLowerCase().includes(query) ||
        token.address.toLowerCase().includes(query)
    );
  }, [allTokens, tokenSearchQuery, selectedChain]);

  useEffect(() => {
    if (!open) {
      setStep(1);
      // Reset all fields
      setSelectedToken(null);
      setTokenSearchQuery("");
      setMinStakingPeriod("");
      setMinStakeAmount("");
      setMaxStakeAmount("");
      setStakeModificationFee(false);
      setTimeBoost(false);

      setStakePoolCreationFee("0.15");
      setRewardPoolCreationFee("");
      setShowTokenDropdown(false);

      // Reset reward configuration
      setMaxTvl("");
      setPoolReward("");
      setRewardDurationDays("");
      // Reset chain selection but keep default
      if (chains.length > 0) {
        const ethereum = chains.find(c => c.name === "Ethereum" || c.id === "1");
        if (ethereum) {
          setSelectedChain({ id: parseInt(ethereum.id, 10), name: ethereum.name });
        } else {
          setSelectedChain(null);
        }
      }
    }
  }, [open, chains]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (chainRef.current && !chainRef.current.contains(event.target as Node)) {
        setShowChainDropdown(false);
      }
      if (tokenRef.current && !tokenRef.current.contains(event.target as Node)) {
        setShowTokenDropdown(false);
      }

    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);



  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNext = async () => {
    if (step === 1) {
      // Validate step 1 fields
      if (!selectedChain || !selectedToken || !minStakeAmount) {
        alert("Please fill in all required fields: Chain, Token, and Min Stake Amount");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      // Validate step 2 fields
      if (!selectedChain || !selectedToken || !minStakeAmount) {
        alert("Please fill in all required fields");
        return;
      }

      // Check if wallet is connected
      if (!isConnected || !connectedAddress) {
        alert("Please connect your wallet first. You need a connected wallet to create pools on-chain.");
        openWalletModal();
        return;
      }

      // Validate reward configuration (required for on-chain pool creation)
      if (!maxTvl || !poolReward || !rewardDurationDays) {
        alert("Please fill in all reward configuration fields: Max TVL, Pool Reward, and Reward Duration.");
        return;
      }

      setIsSubmitting(true);
      try {
        // Safely parse numeric values with validation
        const parseSafeNumber = (value: string, defaultValue: number = 0): number => {
          if (!value || value.trim() === "") return defaultValue;
          const cleaned = value.trim().replace(/[^\d.]/g, '');
          const parts = cleaned.split('.');
          if (parts.length > 2) return defaultValue;
          const integerPart = parts[0] || '0';
          const decimalPart = parts[1] || '';
          if (integerPart.length > 30) return defaultValue;
          if (decimalPart.length > 8) {
            const truncated = decimalPart.substring(0, 8);
            const parsed = parseFloat(integerPart + '.' + truncated);
            return isNaN(parsed) || !isFinite(parsed) ? defaultValue : Math.max(0, parsed);
          }
          const parsed = parseFloat(cleaned);
          if (isNaN(parsed) || !isFinite(parsed)) return defaultValue;
          return Math.max(0, Math.round(parsed * 100000000) / 100000000);
        };

        const minStakeAmountValue = parseSafeNumber(minStakeAmount, 0);
        const maxStakeAmountValue = maxStakeAmount ? parseSafeNumber(maxStakeAmount, 0) : undefined;
        const stakePoolCreationFeeValue = parseSafeNumber(stakePoolCreationFee, 0.15);

        // Parse reward configuration (required for on-chain creation)
        const maxTvlValue = parseSafeNumber(maxTvl, 0);
        const poolRewardValue = parseSafeNumber(poolReward, 0);
        const rewardDurationSecondsValue = typeof rewardDurationDays === 'number'
          ? rewardDurationDays * 24 * 60 * 60
          : undefined;

        if (!maxTvlValue || !poolRewardValue || !rewardDurationSecondsValue) {
          throw new Error("Max TVL, Pool Reward, and Reward Duration are required for on-chain pool creation.");
        }

        // Get reward token address (defaults to staking token if same token for reward)
        const rewardTokenAddress = selectedToken.address as Address; // TODO: Allow admin to select reward token separately

        // Step 1: Create pool on-chain via factory contract
        console.log("Creating pool on-chain...", {
          stakingToken: selectedToken.address,
          rewardToken: rewardTokenAddress,
          poolReward: poolRewardValue.toString(),
          rewardDurationSeconds: rewardDurationSecondsValue,
          maxTvl: maxTvlValue.toString(),
        });

        const createdPoolId = await factoryStaking.createPool(
          selectedToken.address as Address,
          rewardTokenAddress,
          poolRewardValue.toString(),
          rewardDurationSecondsValue,
          maxTvlValue.toString()
        );

        console.log("Pool created on-chain. Received poolId:", createdPoolId, typeof createdPoolId);

        // Validate poolId was returned
        if (createdPoolId === null || createdPoolId === undefined) {
          throw new Error("Failed to create pool on-chain. Pool ID was not returned. Please check the transaction on the block explorer and manually add the poolId to the database.");
        }

        // Convert BigInt to number for database storage
        const poolIdNumber = Number(createdPoolId);

        // Validate poolId is a valid number
        if (isNaN(poolIdNumber) || poolIdNumber < 0) {
          throw new Error(`Invalid pool ID received: ${createdPoolId}. Expected a valid number >= 0.`);
        }

        console.log("Pool created successfully with poolId:", poolIdNumber);

        // Step 2: Get factory contract address for this chain
        const FACTORY_ADDRESSES: Record<number, string> = {
          1: process.env.NEXT_PUBLIC_FACTORY_ADDRESS_MAINNET || '',
          56: process.env.NEXT_PUBLIC_FACTORY_ADDRESS_BSC || '0x9178044f7cC0DD0dB121E7fCD4b068a0d1B76b07',
          137: process.env.NEXT_PUBLIC_FACTORY_ADDRESS_POLYGON || '',
          42161: process.env.NEXT_PUBLIC_FACTORY_ADDRESS_ARBITRUM || '',
          8453: process.env.NEXT_PUBLIC_FACTORY_ADDRESS_BASE || '',
          10: process.env.NEXT_PUBLIC_FACTORY_ADDRESS_OPTIMISM || '',
          43114: process.env.NEXT_PUBLIC_FACTORY_ADDRESS_AVALANCHE || '',
        };

        const factoryAddress = FACTORY_ADDRESSES[selectedChain.id] || '';

        if (!factoryAddress || !factoryAddress.startsWith('0x')) {
          throw new Error(`Factory address not configured for chain ${selectedChain.name} (chainId: ${selectedChain.id}). Please add NEXT_PUBLIC_FACTORY_ADDRESS_${selectedChain.name.toUpperCase()} to your environment variables.`);
        }

        console.log("Using factory address:", factoryAddress, "for chain:", selectedChain.name);

        console.log("Saving pool to database...", {
          poolId: poolIdNumber,
          factoryAddress: factoryAddress,
          chainId: selectedChain.id,
          tokenAddress: selectedToken.address,
        });

        // Step 3: Save pool to database with on-chain data
        const poolData = {
          chainId: selectedChain.id,
          chainName: selectedChain.name,
          tokenAddress: selectedToken.address,
          tokenSymbol: selectedToken.symbol,
          tokenName: selectedToken.name,
          tokenLogo: selectedToken.logo,
          minStakingPeriod: minStakingPeriod !== "" && typeof minStakingPeriod === 'number' ? `${minStakingPeriod} days` : undefined,
          minStakeAmount: minStakeAmountValue,
          maxStakeAmount: maxStakeAmountValue,
          stakeModificationFee: stakeModificationFee,
          timeBoost: timeBoost,
          timeBoostConfig: timeBoost ? {} : undefined,

          stakePoolCreationFee: stakePoolCreationFeeValue,
          rewardPoolCreationFee: rewardPoolCreationFee || undefined,
          apy: undefined, // Will be calculated from pool config
          // Reward configuration
          maxTvl: maxTvlValue,
          poolReward: poolRewardValue,
          rewardDurationSeconds: rewardDurationSecondsValue,
          // On-chain data - CRITICAL: These fields are required for staking to work
          poolId: poolIdNumber,
          factoryAddress: factoryAddress,
          contractAddress: undefined, // Not used for factory-based pools (use factoryAddress instead)
          status: "active" as const,
        };

        console.log("Pool data to be saved:", JSON.stringify(poolData, null, 2));

        const response = await fetch("/api/v1/staking-pools", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(poolData),
        });

        console.log("API Response status:", response.status, response.statusText);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
          console.error("API Error Response:", errorData);

          // Provide detailed error message
          let errorMsg = `Failed to save staking pool to database (HTTP ${response.status}).\n\n`;
          errorMsg += errorData.error || 'Unknown error';
          errorMsg += `\n\nThe pool was created on-chain (poolId: ${poolIdNumber}) but could not be saved to the database. `;
          errorMsg += `You can manually add it using the poolId: ${poolIdNumber} and factory address: ${factoryAddress}`;

          throw new Error(errorMsg);
        }

        const responseData = await response.json();
        console.log("Pool saved successfully to database:", responseData);

        // Verify poolId was saved correctly
        if (responseData.pool && responseData.pool.poolId !== poolIdNumber) {
          console.warn('Warning: Saved poolId does not match created poolId', {
            created: poolIdNumber,
            saved: responseData.pool.poolId
          });
        }

        // Show success modal and refresh pools
        setShowSuccessModal(true);
        onOpenChange(false);

        // Trigger refresh event
        window.dispatchEvent(new Event("stakingPoolUpdated"));
      } catch (error: any) {
        console.error("Error creating staking pool:", error);
        alert(error.message || "Failed to create staking pool. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    }
  };

  const handleTimeBoostToggle = () => {
    setTimeBoost(!timeBoost);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="bg-[#121712] border-[#1f261e] text-white max-w-2xl max-h-[90vh] overflow-y-auto"
          showCloseButton={false}
        >
          <DialogHeader className="flex flex-row items-center justify-between mb-6">
            <DialogTitle className="text-xl font-semibold text-white">
              Create Staking Pool
            </DialogTitle>
            <button
              onClick={() => onOpenChange(false)}
              className="flex items-center gap-2 text-[#b1f128] hover:text-[#9dd81f] transition-colors font-medium"
            >
              <IoCloseOutline className="w-5 h-5" />
              <span>Cancel</span>
            </button>
          </DialogHeader>

          {/* Wallet Connection Status */}
          <div className="mb-4 p-3 bg-[#0b0f0a] border border-[#1f261e] rounded-lg">
            {isConnected && connectedAddress ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-[#b5b5b5]">Connected:</span>
                  <span className="text-sm text-white font-mono">
                    {connectedAddress.slice(0, 6)}...{connectedAddress.slice(-4)}
                  </span>
                </div>
                <span className="text-xs text-[#b1f128]">Admin Wallet Active</span>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-sm text-[#b5b5b5]">Wallet not connected</span>
                </div>
                <button
                  onClick={openWalletModal}
                  className="px-4 py-1.5 bg-[#b1f128] text-black text-sm font-medium rounded-lg hover:bg-[#9dd81f] transition-colors"
                >
                  Connect Wallet
                </button>
              </div>
            )}
          </div>

          {step === 1 && (
            <div className="space-y-6">
              {/* Chain Selection */}
              <div className="relative" ref={chainRef}>
                <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
                  Chain Selection
                </label>
                <button
                  onClick={() => {
                    setShowChainDropdown(!showChainDropdown);
                  }}
                  disabled={chainsLoading}
                  className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white flex items-center justify-between hover:border-[#b1f128] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center gap-2">
                    {selectedChain ? (
                      <>
                        <span>{selectedChain.name}</span>
                      </>
                    ) : (
                      <span className="text-[#7c7c7c]">Select chain</span>
                    )}
                  </div>
                  <IoChevronDownOutline className="w-5 h-5 text-[#b5b5b5]" />
                </button>
                {showChainDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-[#0b0f0a] border border-[#1f261e] rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {chains.map((chain) => (
                      <button
                        key={chain.id}
                        onClick={() => {
                          setSelectedChain({ id: parseInt(chain.id, 10), name: chain.name });
                          setShowChainDropdown(false);
                        }}
                        className="w-full text-left px-4 py-2 text-white hover:bg-[#121712] transition-colors flex items-center gap-2"
                      >
                        <span>{chain.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Select Token Dropdown */}
              <div className="relative" ref={tokenRef}>
                <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
                  Select Token
                </label>
                <button
                  onClick={() => {
                    setShowTokenDropdown(!showTokenDropdown);
                  }}
                  className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white flex items-center justify-between transition-colors hover:border-[#b1f128]"
                >
                  <div className="flex items-center gap-3">
                    {selectedToken ? (
                      <>
                        <TokenIcon
                          src={selectedToken.logo || getTokenFallbackIcon(selectedToken.symbol)}
                          symbol={selectedToken.symbol}
                          alt={selectedToken.symbol}
                          width={32}
                          height={32}
                        />
                        <div className="text-left">
                          <div className="text-white font-medium text-sm">
                            {selectedToken.symbol}
                          </div>
                          <div className="text-[#b5b5b5] text-xs">
                            {selectedToken.name}
                          </div>
                        </div>
                      </>
                    ) : (
                      <span className="text-[#7c7c7c] text-sm">Select a token</span>
                    )}
                  </div>
                  <IoChevronDownOutline className="w-5 h-5 text-[#b5b5b5]" />
                </button>
                {showTokenDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-[#0b0f0a] border border-[#1f261e] rounded-lg shadow-lg max-h-96 overflow-y-auto">
                    <div className="p-2 border-b border-[#1f261e] sticky top-0 bg-[#0b0f0a]">
                      <div className="relative">
                        <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7c7c7c]" />
                        <input
                          type="text"
                          placeholder="Search by symbol, name, or address"
                          value={tokenSearchQuery}
                          onChange={(e) => setTokenSearchQuery(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full bg-[#121712] border border-[#1f261e] rounded-lg pl-10 pr-3 py-2 text-sm text-white placeholder-[#7c7c7c] focus:outline-none focus:border-[#b1f128]"
                          autoFocus
                        />
                      </div>
                    </div>
                    {isLoadingTokens ? (
                      <div className="p-8 text-center">
                        <p className="text-[#b5b5b5] text-sm">Loading tokens...</p>
                      </div>
                    ) : filteredTokens.length === 0 ? (
                      <div className="p-8 text-center">
                        <p className="text-[#b5b5b5] text-sm">
                          {tokenSearchQuery ? "No tokens found matching your search." : "No tokens available."}
                        </p>
                      </div>
                    ) : (
                      <div className="max-h-80 overflow-y-auto">
                        {filteredTokens.map((token) => (
                          <button
                            key={token.id}
                            onClick={() => {
                              setSelectedToken({
                                symbol: token.symbol,
                                name: token.name,
                                address: token.address,
                                logo: token.logo || getTokenFallbackIcon(token.symbol),
                              });
                              setShowTokenDropdown(false);
                              // Don't clear search query - keep it for next time dropdown opens
                            }}
                            className="w-full text-left px-4 py-3 text-white hover:bg-[#121712] transition-colors flex items-center gap-3 border-b border-[#1f261e] last:border-b-0"
                          >
                            <TokenIcon
                              src={token.logo || getTokenFallbackIcon(token.symbol)}
                              symbol={token.symbol}
                              alt={token.symbol}
                              width={24}
                              height={24}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm text-white">
                                {token.symbol}
                              </div>
                              <div className="text-[#b5b5b5] text-xs truncate">
                                {token.name}
                              </div>
                              <div className="text-[#7c7c7c] text-xs font-mono truncate">
                                {token.address}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Minimum staking period */}
              <div>
                <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
                  Minimum staking period
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={minStakingPeriod}
                  onChange={(e) => {
                    const value = e.target.value === "" ? "" : parseInt(e.target.value, 10);
                    if (value === "" || (!isNaN(value) && value >= 0)) {
                      setMinStakingPeriod(value);
                    }
                  }}
                  className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white placeholder-[#7c7c7c] focus:outline-none focus:border-[#b1f128]"
                  placeholder="Enter number (e.g., 30 for 30 days)"
                />
                <p className="text-[#7c7c7c] text-xs mt-1">
                  Enter the minimum staking period in days (numbers only)
                </p>
              </div>

              {/* Min Stake Amount */}
              <div>
                <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
                  Min Stake Amount
                </label>
                <input
                  type="text"
                  value={minStakeAmount}
                  onChange={(e) => setMinStakeAmount(e.target.value)}
                  className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white placeholder-[#7c7c7c] focus:outline-none focus:border-[#b1f128]"
                  placeholder="0.00"
                />
              </div>

              {/* Max Stake Amount */}
              <div>
                <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
                  Max Stake Amount
                </label>
                <input
                  type="text"
                  value={maxStakeAmount}
                  onChange={(e) => setMaxStakeAmount(e.target.value)}
                  className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white placeholder-[#7c7c7c] focus:outline-none focus:border-[#b1f128]"
                  placeholder="0.00"
                />
              </div>

              {/* Navigation */}
              <div className="flex justify-end gap-4 pt-4 border-t border-[#1f261e]">
                <button
                  onClick={() => onOpenChange(false)}
                  className="px-6 py-2.5 text-[#b5b5b5] hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleNext}
                  disabled={!selectedChain || !selectedToken || !minStakeAmount}
                  className="px-6 py-2.5 bg-[#b1f128] text-[#010501] rounded-lg hover:bg-[#9dd81f] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              {/* Stake modification fee */}
              <div className="flex items-center justify-between">
                <label className="block text-[#b5b5b5] text-sm font-medium">
                  Stake modification fee
                </label>
                <button
                  onClick={() => setStakeModificationFee(!stakeModificationFee)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${stakeModificationFee ? "bg-[#b1f128]" : "bg-[#1f261e]"
                    }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${stakeModificationFee ? "translate-x-6" : "translate-x-1"
                      }`}
                  />
                </button>
              </div>

              {/* Time boost */}
              <div>
                <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
                  Time boost
                </label>
                <button
                  onClick={handleTimeBoostToggle}
                  className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-[#b1f128] hover:border-[#b1f128] transition-colors font-medium flex items-center justify-center gap-2"
                >
                  {timeBoost ? "Reset Option" : "+ Add Option"}
                </button>
              </div>

              {/* Reward Configuration */}
              <div className="bg-[#0b0f0a] border border-[#1f261e] rounded-lg p-4 space-y-4">
                <div>
                  <h4 className="text-white font-semibold text-sm mb-3">Reward Configuration (TIWI Protocol)</h4>
                  <p className="text-[#7c7c7c] text-xs mb-4">
                    Configure staking rewards using the TIWI Protocol formula:
                    <br />
                    <span className="text-[#b5b5b5]">Reward Rate = Pool Reward / (Total Staked Tokens × Time)</span>
                  </p>
                </div>

                {/* Maximum TVL / Total Staked Tokens */}
                <div>
                  <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
                    Maximum TVL / Total Staked Tokens
                  </label>
                  <input
                    type="text"
                    value={maxTvl}
                    onChange={(e) => setMaxTvl(e.target.value)}
                    className="w-full bg-[#121712] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white placeholder-[#7c7c7c] focus:outline-none focus:border-[#b1f128]"
                    placeholder="0.00"
                  />
                  <p className="text-[#7c7c7c] text-xs mt-1">
                    Maximum Total Value Locked or Total Staked Tokens for the pool
                  </p>
                </div>

                {/* Pool Reward */}
                <div>
                  <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
                    Pool Reward (Total Reward Tokens)
                  </label>
                  <input
                    type="text"
                    value={poolReward}
                    onChange={(e) => setPoolReward(e.target.value)}
                    className="w-full bg-[#121712] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white placeholder-[#7c7c7c] focus:outline-none focus:border-[#b1f128]"
                    placeholder="0.00"
                  />
                  <p className="text-[#7c7c7c] text-xs mt-1">
                    Total reward tokens allocated to the pool
                  </p>
                </div>

                {/* Reward Duration */}
                <div>
                  <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
                    Reward Duration (Days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={rewardDurationDays}
                    onChange={(e) => {
                      const value = e.target.value === "" ? "" : parseInt(e.target.value, 10);
                      if (value === "" || (!isNaN(value) && value >= 0)) {
                        setRewardDurationDays(value);
                      }
                    }}
                    className="w-full bg-[#121712] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white placeholder-[#7c7c7c] focus:outline-none focus:border-[#b1f128]"
                    placeholder="30"
                  />
                  <p className="text-[#7c7c7c] text-xs mt-1">
                    Reward duration in days (will be converted to seconds: {rewardDurationDays !== "" && typeof rewardDurationDays === 'number' ? (rewardDurationDays * 24 * 60 * 60).toLocaleString() : '0'} seconds)
                  </p>
                </div>

                {/* Calculated Reward Rate (display only) */}
                {maxTvl && poolReward && rewardDurationDays !== "" && typeof rewardDurationDays === 'number' && parseFloat(maxTvl) > 0 && parseFloat(poolReward) > 0 && rewardDurationDays > 0 && (
                  <div className="bg-[#081f02] border border-[#b1f128] rounded-lg p-3 mt-2">
                    <div className="text-[#b1f128] text-xs font-medium mb-2">Calculated Reward Rate:</div>
                    <div className="text-white text-sm">
                      {(parseFloat(poolReward) / (parseFloat(maxTvl) * rewardDurationDays * 24 * 60 * 60)).toExponential(6)} tokens per token per second
                    </div>
                    <div className="text-[#7c7c7c] text-xs mt-1">
                      Reward Per Second: {(parseFloat(poolReward) / (rewardDurationDays * 24 * 60 * 60)).toFixed(6)} tokens/sec
                    </div>
                  </div>
                )}
              </div>

              {/* Fee Information */}
              <div className="bg-[#0b0f0a] border border-[#1f261e] rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[#b5b5b5] text-sm">Stake Pool Creation Fee</span>
                  <span className="text-white text-sm font-medium">
                    {stakePoolCreationFee} {selectedChain?.name === "Ethereum" ? "ETH" : selectedChain?.name || "ETH"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#b5b5b5] text-sm">Reward Pool Creation Fee</span>
                  <span className="text-white text-sm font-medium">
                    {rewardPoolCreationFee || "%"}
                  </span>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-end gap-4 pt-4 border-t border-[#1f261e]">
                <button
                  onClick={handleBack}
                  className="px-6 py-2.5 text-[#b5b5b5] hover:text-white transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleNext}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-[#b1f128] text-[#010501] rounded-lg hover:bg-[#9dd81f] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Creating..." : "Create Stake Pool"}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Wallet Connection Modal */}
      <ConnectWalletModal
        open={isWalletModalOpen}
        onOpenChange={closeWalletModal}
        onWalletConnect={() => {
          closeWalletModal();
        }}
        onOpenExplorer={() => { }}
      />

      <PoolSuccessModal
        open={showSuccessModal}
        onOpenChange={setShowSuccessModal}
        chainName={selectedChain?.name || "Ethereum"}
      />
    </>
  );
}
