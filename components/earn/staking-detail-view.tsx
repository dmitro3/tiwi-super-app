"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { ArrowLeft, RefreshCw, X, Zap, AlertTriangle } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { useWalletBalances } from "@/hooks/useWalletBalances";
import { formatTokenAmount, formatCurrency, parseFormattedAmount } from "@/lib/shared/utils/portfolio-formatting";
import { useWallet } from "@/lib/wallet/hooks/useWallet";
import { useActiveWalletAddress } from "@/lib/wallet/hooks/useActiveWalletAddress";
import { useChainId, usePublicClient, useAccount } from "wagmi";
import { formatUnits, parseUnits, Address } from "viem";
import { useStaking } from "@/hooks/useStaking";
import { useFactoryStaking } from "@/hooks/useFactoryStaking";
import TransactionToast from "./transaction-toast";
import type { StakingPool } from "@/data/mock-staking-pools";
import { calculateAPRFromPoolConfig } from "@/lib/shared/utils/staking-rewards";
import { TIWI_STAKING_POOL_FACTORY_ABI_ARRAY } from "@/lib/contracts/types";

interface StakingDetailViewProps {
  pool: StakingPool;
  onBack: () => void;
}

export default function StakingDetailView({ pool, onBack }: StakingDetailViewProps) {
  const [activeTab, setActiveTab] = useState<"boost" | "unstake">("boost");
  const [showBoostMessage, setShowBoostMessage] = useState(true);
  const [showUnstakeWarning, setShowUnstakeWarning] = useState(true);
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastSuccess, setToastSuccess] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [txHash, setTxHash] = useState<string | undefined>();
  const [txChainId, setTxChainId] = useState<number | undefined>();
  const [isStakingInProgress, setIsStakingInProgress] = useState(false); // Prevent multiple simultaneous calls

  // Use the same wallet address hook as portfolio (works for both local and external wallets)
  const activeAddress = useActiveWalletAddress();
  const { isConnected, address } = useWallet();
  const { connector: wagmiConnector } = useAccount(); // Get wagmi connector for validation
  const chainId = useChainId();
  const publicClient = usePublicClient();

  // Use the same wallet balances method as portfolio for accurate balance
  const tokenAddress = pool.tokenAddress;
  // TWC token is on BSC (chain ID 56) - ensure we use the correct chain
  const TWC_ADDRESS = '0xDA1060158F7D593667cCE0a15DB346BB3FfB3596';
  const isTWC = tokenAddress?.toLowerCase() === TWC_ADDRESS.toLowerCase();
  const poolChainId = isTWC ? 56 : (pool.chainId || chainId);

  // Fetch all wallet balances (EXACT same as portfolio)
  const {
    balances: walletTokens,
    isLoading: balanceLoading,
    error: balanceError,
    refetch: refetchTokenBalance
  } = useWalletBalances(activeAddress);

  // Find the specific token in the balances - EXACT same logic as portfolio
  // Portfolio finds tokens by matching address and chainId from walletTokens array
  const foundToken = useMemo(() => {
    if (!tokenAddress || !walletTokens || walletTokens.length === 0) {
      return null;
    }

    const tokenAddressLower = tokenAddress.toLowerCase();

    // Find token by address and chainId (EXACT same as portfolio)
    const token = walletTokens.find((token: any) =>
      token.address?.toLowerCase() === tokenAddressLower &&
      token.chainId === poolChainId
    );

    return token || null;
  }, [walletTokens, tokenAddress, poolChainId]);

  // Extract balance values - EXACT same as portfolio
  // Portfolio uses: token.balanceFormatted directly from WalletToken
  const tokenBalanceFormatted = foundToken?.balanceFormatted || '0.00';
  const tokenUsdValue = foundToken?.usdValue || '0.00';

  // Format balance like portfolio (uses compact notation for large numbers like "6.89B")
  // Portfolio uses: formatTokenAmount(token.balanceFormatted, 6)
  const displayBalance = formatTokenAmount(tokenBalanceFormatted, 6);

  // Format USD value like portfolio
  // Portfolio uses: formatCurrency(token.usdValue)
  const displayUsdValue = formatCurrency(tokenUsdValue);

  // Use balanceFormatted for calculations (same as portfolio)
  // Portfolio uses balanceFormatted directly - it's already a human-readable number string
  const decimals = pool.decimals || 18;

  // Parse balanceFormatted for calculations
  // balanceFormatted is already a number string like "6893232532.312375042" (no commas)
  const tokenBalanceNum = parseFloat(tokenBalanceFormatted) || 0;


  // Use factory staking hook if pool has poolId or factory address
  // Try to find poolId by matching token address with factory pools
  const poolIdFromDb = (pool as any).poolId; // Pool ID from factory contract (if stored in DB)
  let factoryAddress = (pool as any).factoryAddress || pool.contractAddress; // Factory contract address

  // If factory address is a placeholder, try to get it from chain config
  if (factoryAddress === 'FACTORY_CONTRACT' || !factoryAddress || !factoryAddress.startsWith('0x')) {
    // Try to get factory address from environment variables based on chain
    const FACTORY_ADDRESSES: Record<number, string> = {
      1: process.env.NEXT_PUBLIC_FACTORY_ADDRESS_MAINNET || '',
      56: process.env.NEXT_PUBLIC_FACTORY_ADDRESS_BSC || '',
      137: process.env.NEXT_PUBLIC_FACTORY_ADDRESS_POLYGON || '',
      42161: process.env.NEXT_PUBLIC_FACTORY_ADDRESS_ARBITRUM || '',
      8453: process.env.NEXT_PUBLIC_FACTORY_ADDRESS_BASE || '',
      10: process.env.NEXT_PUBLIC_FACTORY_ADDRESS_OPTIMISM || '',
      43114: process.env.NEXT_PUBLIC_FACTORY_ADDRESS_AVALANCHE || '',
    };

    const chainFactoryAddress = poolChainId ? FACTORY_ADDRESSES[poolChainId] : undefined;
    if (chainFactoryAddress && chainFactoryAddress.startsWith('0x')) {
      factoryAddress = chainFactoryAddress;
      console.log('[Staking] Using factory address from chain config:', factoryAddress);
    }
  }

  // Validate factory address (after trying to get it from chain config)
  const isValidFactoryAddress = factoryAddress &&
    typeof factoryAddress === 'string' &&
    factoryAddress.startsWith('0x') &&
    factoryAddress.length === 42 &&
    factoryAddress !== 'FACTORY_CONTRACT';

  // Validate contract address before using it
  const isValidContractAddress = pool.contractAddress &&
    typeof pool.contractAddress === 'string' &&
    pool.contractAddress.startsWith('0x') &&
    pool.contractAddress.length === 42 &&
    pool.contractAddress !== 'FACTORY_CONTRACT'; // Reject placeholder values

  // Auto-discover poolId from factory if missing
  const [discoveredPoolId, setDiscoveredPoolId] = useState<number | undefined>(undefined);

  // Use factory staking hook to get all pool IDs (for discovery)
  const factoryStakingForDiscovery = useFactoryStaking({
    factoryAddress: factoryAddress && factoryAddress.startsWith('0x') ? (factoryAddress as Address) : undefined,
    poolId: undefined, // Don't pass poolId yet - we're discovering it
    stakingTokenAddress: pool.tokenAddress as Address | undefined,
    decimals: decimals,
    enabled: isValidFactoryAddress && !!pool.tokenAddress,
    walletAddress: activeAddress as Address | undefined,
    requiredChainId: poolChainId, // Pass the required chain ID for auto-switching
  });

  // Auto-discover poolId from factory if missing
  useEffect(() => {
    // Log current state for debugging
    console.log('[Staking] Pool discovery state:', {
      isValidFactoryAddress,
      poolIdFromDb,
      tokenAddress: pool.tokenAddress,
      allPoolIds: factoryStakingForDiscovery.allPoolIds,
      allPoolIdsLength: factoryStakingForDiscovery.allPoolIds?.length,
      isLoading: factoryStakingForDiscovery.isLoading,
      isError: factoryStakingForDiscovery.isError,
      error: factoryStakingForDiscovery.error,
      factoryAddress,
    });

    // Only try to discover if we have factory address but no poolId
    if (isValidFactoryAddress && !poolIdFromDb && pool.tokenAddress) {
      // Wait for pools to load if still loading
      if (factoryStakingForDiscovery.isLoading) {
        console.log('[Staking] Waiting for pools to load...');
        return;
      }

      // Check if we have pool data (even if empty)
      if (factoryStakingForDiscovery.allPoolIds !== null && factoryStakingForDiscovery.allPoolIds !== undefined) {
        const findPoolId = async () => {
          try {
            const targetTokenAddress = pool.tokenAddress?.toLowerCase();
            if (!targetTokenAddress || !publicClient || !factoryAddress) {
              console.warn('[Staking] Missing required data for pool discovery:', {
                targetTokenAddress,
                publicClient: !!publicClient,
                factoryAddress,
              });
              return;
            }

            // If no pools, log and return early
            if (factoryStakingForDiscovery.allPoolIds.length === 0) {
              console.warn('[Staking] Factory has 0 pools. Cannot discover poolId.');
              return;
            }

            // If only one pool, use it (likely correct)
            if (factoryStakingForDiscovery.allPoolIds.length === 1) {
              const foundPoolId = Number(factoryStakingForDiscovery.allPoolIds[0]);
              console.log('[Staking] Auto-discovered poolId (single pool):', foundPoolId);
              setDiscoveredPoolId(foundPoolId);
              return;
            }

            // Multiple pools - check each one's stakingToken
            console.log('[Staking] Checking', factoryStakingForDiscovery.allPoolIds.length, 'pools to find matching token...');

            for (const poolIdBigInt of factoryStakingForDiscovery.allPoolIds) {
              try {
                const poolIdNum = Number(poolIdBigInt);
                // Call getPoolInfo to get the pool config
                const poolInfo = await publicClient.readContract({
                  address: factoryAddress as Address,
                  abi: TIWI_STAKING_POOL_FACTORY_ABI_ARRAY,
                  functionName: 'getPoolInfo',
                  args: [BigInt(poolIdNum)],
                });

                // poolInfo[0] is the config, poolInfo[0].stakingToken is the token address
                const config = poolInfo[0] as any;
                const stakingTokenAddress = config?.stakingToken?.toLowerCase();

                console.log('[Staking] Pool', poolIdNum, 'stakingToken:', stakingTokenAddress, 'target:', targetTokenAddress);

                if (stakingTokenAddress === targetTokenAddress) {
                  console.log('[Staking] Auto-discovered poolId (matched token):', poolIdNum);
                  setDiscoveredPoolId(poolIdNum);
                  return;
                }
              } catch (error) {
                console.warn('[Staking] Error checking pool', poolIdBigInt, ':', error);
                // Continue to next pool
              }
            }

            // No matching pool found
            console.warn('[Staking] No pool found matching token address', targetTokenAddress);
          } catch (error) {
            console.error('[Staking] Error discovering poolId:', error);
          }
        };

        findPoolId();
      } else if (factoryStakingForDiscovery.isError) {
        console.error('[Staking] Error loading pools:', factoryStakingForDiscovery.error);
      }
    }
  }, [isValidFactoryAddress, poolIdFromDb, pool.tokenAddress, factoryStakingForDiscovery.allPoolIds, factoryStakingForDiscovery.isLoading, factoryStakingForDiscovery.isError, factoryStakingForDiscovery.error, publicClient, factoryAddress]);

  // Use discovered poolId if available
  const effectivePoolId = poolIdFromDb || discoveredPoolId;

  // Use effectivePoolId for factory staking (with poolId if we have it)
  const factoryStakingWithPoolId = useFactoryStaking({
    factoryAddress: factoryAddress && factoryAddress.startsWith('0x') ? (factoryAddress as Address) : undefined,
    poolId: effectivePoolId ? Number(effectivePoolId) : undefined,
    stakingTokenAddress: pool.tokenAddress as Address | undefined,
    decimals: decimals,
    enabled: !!factoryAddress && factoryAddress.startsWith('0x') && !!pool.tokenAddress,
    walletAddress: activeAddress as Address | undefined, // Pass activeAddress to hook
    requiredChainId: poolChainId, // Pass the required chain ID for auto-switching
  });

  // Use single contract staking if no poolId (legacy pools)
  const singleStaking = useStaking({
    contractAddress: isValidContractAddress ? (pool.contractAddress as Address) : undefined,
    stakingTokenAddress: pool.tokenAddress as Address | undefined,
    decimals: decimals,
    enabled: isValidContractAddress && !!pool.tokenAddress && !effectivePoolId && !isValidFactoryAddress,
    walletAddress: activeAddress as Address | undefined, // Pass activeAddress to hook
  });

  // Use factory staking if available, otherwise fall back to single contract
  // If we have a valid factory address, prefer factory staking even without poolId
  const staking = (effectivePoolId || isValidFactoryAddress) ? {
    userInfo: factoryStakingWithPoolId.userInfo,
    pendingReward: factoryStakingWithPoolId.pendingReward,
    totalStaked: factoryStakingWithPoolId.poolInfo?.state.totalStaked || null,
    isPending: factoryStakingWithPoolId.isPending,
    isLoading: factoryStakingWithPoolId.isLoading,
    isError: factoryStakingWithPoolId.isError,
    error: factoryStakingWithPoolId.error,
    depositTxHash: factoryStakingWithPoolId.depositTxHash,
    withdrawTxHash: factoryStakingWithPoolId.withdrawTxHash,
    claimTxHash: factoryStakingWithPoolId.claimTxHash,
    deposit: (amt: string) => {
      if (!effectivePoolId) {
        throw new Error(`Pool ID not found for token ${pool.tokenSymbol}. Please ensure the staking pool is properly configured in the database with a valid poolId.`);
      }
      return factoryStakingWithPoolId.deposit(Number(effectivePoolId), amt);
    },
    withdraw: (amt: string) => {
      if (!effectivePoolId) {
        throw new Error(`Pool ID not found for token ${pool.tokenSymbol}. Please ensure the staking pool is properly configured in the database with a valid poolId.`);
      }
      return factoryStakingWithPoolId.withdraw(Number(effectivePoolId), amt);
    },
    claim: () => {
      if (!effectivePoolId) {
        throw new Error(`Pool ID not found for token ${pool.tokenSymbol}. Please ensure the staking pool is properly configured in the database with a valid poolId.`);
      }
      return factoryStakingWithPoolId.claim(Number(effectivePoolId));
    },
    approve: (amt?: string) => {
      if (!effectivePoolId) {
        throw new Error(`Pool ID not found for token ${pool.tokenSymbol}. Please ensure the staking pool is properly configured in the database with a valid poolId.`);
      }
      return factoryStakingWithPoolId.approve(Number(effectivePoolId), amt);
    },
    allowance: factoryStakingWithPoolId.allowance,
    needsApproval: (amt: string) => {
      if (!effectivePoolId) return false;
      return factoryStakingWithPoolId.needsApproval(Number(effectivePoolId), amt);
    },
    refetch: () => {
      refetchTokenBalance();
      factoryStakingWithPoolId.refetch();
    },
  } : {
    ...singleStaking,
    refetch: () => {
      refetchTokenBalance();
      singleStaking.refetch();
    },
  };

  // Determine if we need approval
  // CRITICAL: needsApproval requires poolId as first parameter
  // Ensure amount is a string
  const needsApproval = effectivePoolId && pool.tokenAddress && amount
    ? staking.needsApproval(effectivePoolId, String(amount))
    : false;

  // Use contract transaction hash if available, otherwise fall back to local state
  const currentTxHash = staking.depositTxHash || staking.withdrawTxHash || staking.claimTxHash || txHash;
  const isProcessingContract = staking.isPending || staking.isLoading;

  // Get min and max limits set by admin for this staking pool
  // These limits are configured by the admin and must be enforced
  const minStakeAmount = pool.minStakeAmount || 0; // Admin-set minimum (required)
  const adminMaxStakeAmount = pool.maxStakeAmount; // Admin-set maximum (optional)

  // Debug: Log admin limits to verify they're being read correctly
  useEffect(() => {
    if (pool.minStakeAmount !== undefined || pool.maxStakeAmount !== undefined) {
      console.log('[Staking] Admin limits:', {
        minStakeAmount: pool.minStakeAmount,
        maxStakeAmount: pool.maxStakeAmount,
        tokenBalanceNum,
        effectiveMax: adminMaxStakeAmount !== undefined
          ? Math.min(adminMaxStakeAmount, tokenBalanceNum)
          : tokenBalanceNum
      });
    }
  }, [pool.minStakeAmount, pool.maxStakeAmount, tokenBalanceNum, adminMaxStakeAmount]);

  // Effective maximum: admin-set max (if exists) or user's balance, whichever is lower
  // This ensures we respect both admin limits and user's available balance
  const effectiveMax = adminMaxStakeAmount !== undefined
    ? Math.min(adminMaxStakeAmount, tokenBalanceNum)
    : tokenBalanceNum;

  // Calculate percentage amounts
  const handlePercentageClick = (percentage: number) => {
    if (activeTab === "boost") {
      // For staking, use effective max (admin limit or balance, whichever is lower)
      if (effectiveMax > 0) {
        const amountToSet = (effectiveMax * percentage / 100).toString();
        setAmount(amountToSet);
      }
    } else {
      // For unstaking, use staked amount
      if (staking.userInfo) {
        const stakedAmount = parseFloat(formatUnits(staking.userInfo.amount, decimals));
        const amountToSet = (stakedAmount * percentage / 100).toString();
        setAmount(amountToSet);
      }
    }
  };

  // Format amount for display in input (with K, M, B, T)
  const formattedInputValue = useMemo(() => {
    if (!amount || amount === '0' || amount === '') return '';
    const num = parseFloat(amount);
    if (isNaN(num) || num === 0) return '';
    return formatTokenAmount(amount, 6);
  }, [amount]);

  // Handle input change - parse formatted values back to raw numbers
  // Also enforce admin-set limits in real-time
  const handleAmountChange = (value: string | number) => {
    // Ensure value is a string
    const stringValue = String(value || '');

    // If empty, set to empty
    if (stringValue === '' || stringValue.trim() === '') {
      setAmount('');
      return;
    }

    // Parse formatted value (handles K, M, B, T)
    const rawAmount = parseFormattedAmount(stringValue);
    const parsedNum = parseFloat(rawAmount);

    // If parsed value is valid, enforce admin limits
    if (!isNaN(parsedNum) && parsedNum > 0) {
      // Clamp to admin-set maximum if it exists
      if (adminMaxStakeAmount !== undefined && parsedNum > adminMaxStakeAmount) {
        // Set to admin max limit
        setAmount(adminMaxStakeAmount.toString());
        return;
      }

      // Also ensure it doesn't exceed balance
      if (parsedNum > tokenBalanceNum) {
        setAmount(tokenBalanceNum.toString());
        return;
      }
    }

    setAmount(rawAmount);
  };

  // Validation state
  const amountNum = parseFloat(amount || '0');
  // Valid if: >= min (admin limit), <= effectiveMax, and > 0
  const isValidAmount = amountNum >= minStakeAmount && amountNum <= effectiveMax && amountNum > 0;
  const isBelowMin = amountNum > 0 && amountNum < minStakeAmount;
  // Check if exceeds admin-set max (if admin set one) or balance
  const isAboveMax = adminMaxStakeAmount !== undefined
    ? amountNum > adminMaxStakeAmount
    : amountNum > tokenBalanceNum;
  const exceedsBalance = amountNum > tokenBalanceNum;

  const handleMaxClick = () => {
    handlePercentageClick(100);
  };

  // Get staked amount for display
  const stakedAmount = staking.userInfo
    ? formatUnits(staking.userInfo.amount, decimals)
    : "0";

  // Get pending rewards for display
  const pendingRewards = staking.pendingReward
    ? formatUnits(staking.pendingReward, decimals)
    : "0";

  const handleStakeNow = async () => {
    // Prevent multiple simultaneous calls
    if (isStakingInProgress || isProcessing) {
      console.log('[Staking] handleStakeNow already in progress, ignoring duplicate call');
      return;
    }

    console.log('[Staking] handleStakeNow called', {
      activeAddress,
      amount,
      tokenBalanceNum,
      poolId: effectivePoolId,
      poolIdFromDb,
      discoveredPoolId,
      poolTokenAddress: pool.tokenAddress,
      poolContractAddress: pool.contractAddress,
      chainId,
      needsApproval,
    });

    if (!activeAddress) {
      setToastSuccess(false);
      setToastMessage("Please connect your wallet first");
      setToastOpen(true);
      setIsStakingInProgress(false);
      return;
    }

    // Verify wagmi connector is available (required for blockchain transactions)
    if (!wagmiConnector) {
      setToastSuccess(false);
      setToastMessage("Wallet connection not fully initialized. Please disconnect and reconnect your wallet using the 'Connect Wallet' button at the top right, then try again.");
      setToastOpen(true);
      setIsStakingInProgress(false);
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setToastSuccess(false);
      setToastMessage("Please enter a valid amount");
      setToastOpen(true);
      setIsStakingInProgress(false);
      return;
    }

    // Set flag to prevent multiple calls
    setIsStakingInProgress(true);

    const amountNum = parseFloat(amount);

    // Check minimum stake
    if (amountNum < minStakeAmount) {
      setToastSuccess(false);
      setToastMessage(`Minimum stake amount is ${formatTokenAmount(minStakeAmount.toString(), 6)} ${pool.tokenSymbol}`);
      setToastOpen(true);
      return;
    }

    // Check maximum stake - validate against admin-set limit first, then balance
    if (adminMaxStakeAmount !== undefined && amountNum > adminMaxStakeAmount) {
      setToastSuccess(false);
      setToastMessage(`Maximum stake amount set by admin is ${formatTokenAmount(adminMaxStakeAmount.toString(), 6)} ${pool.tokenSymbol}`);
      setToastOpen(true);
      return;
    }

    // Check if exceeds user's balance
    if (amountNum > tokenBalanceNum) {
      setToastSuccess(false);
      setToastMessage(`Insufficient balance. Maximum available: ${formatTokenAmount(tokenBalanceNum.toString(), 6)} ${pool.tokenSymbol}`);
      setToastOpen(true);
      return;
    }

    // Final check against effective max (shouldn't reach here if above checks pass, but safety check)
    if (amountNum > effectiveMax) {
      setToastSuccess(false);
      setToastMessage(`Maximum stake amount is ${formatTokenAmount(effectiveMax.toString(), 6)} ${pool.tokenSymbol}`);
      setToastOpen(true);
      return;
    }

    // This check is now handled above with better messaging

    // Check if contract is configured
    if (effectivePoolId) {
      // Factory contract - check if poolId and tokenAddress are available
      if (!pool.tokenAddress) {
        setToastSuccess(false);
        setToastMessage("Staking pool not configured with token address");
        setToastOpen(true);
        setIsStakingInProgress(false);
        return;
      }
      if (!factoryAddress) {
        setToastSuccess(false);
        setToastMessage("Factory address not configured");
        setToastOpen(true);
        setIsStakingInProgress(false);
        return;
      }
    } else if (factoryAddress && factoryAddress !== 'FACTORY_CONTRACT' && factoryAddress.startsWith('0x')) {
      // Factory contract without poolId - try to use discovered poolId
      if (!pool.tokenAddress) {
        setToastSuccess(false);
        setToastMessage("Staking pool not configured with token address");
        setToastOpen(true);
        setIsStakingInProgress(false);
        return;
      }

      // If we still don't have a poolId, show error
      if (!discoveredPoolId) {
        const poolCount = factoryStakingForDiscovery.allPoolIds?.length ?? 0;
        const isLoadingPools = factoryStakingForDiscovery.isLoading;
        const poolError = factoryStakingForDiscovery.error;

        let errorMessage = `❌ Pool Configuration Error\n\n`;
        errorMessage += `Pool ID not found for ${pool.tokenSymbol} on ${pool.chainId ? `chain ${pool.chainId}` : 'this chain'}.\n\n`;

        if (isLoadingPools) {
          errorMessage += `⏳ Loading pool information from factory contract...\n`;
          errorMessage += `Please wait a moment and try again.`;
        } else if (poolError) {
          errorMessage += `⚠️ Error communicating with factory contract:\n`;
          errorMessage += `${poolError.message || 'Unknown error'}\n\n`;
          errorMessage += `Troubleshooting:\n`;
          errorMessage += `• Check your network connection\n`;
          errorMessage += `• Verify factory address: ${factoryAddress?.slice(0, 10)}...\n`;
          errorMessage += `• Ensure you're connected to the correct network`;
        } else if (poolCount === 0) {
          errorMessage += `⚠️ No pools found in factory contract.\n\n`;
          errorMessage += `Factory address: ${factoryAddress}\n\n`;
          errorMessage += `Action required:\n`;
          errorMessage += `1. Create a new pool using the admin panel at /admin/staking-pools\n`;
          errorMessage += `2. Ensure the pool was created successfully on-chain\n`;
          errorMessage += `3. Verify the poolId was saved to the database`;
        } else {
          errorMessage += `⚠️ Pool exists but poolId is not configured.\n\n`;
          errorMessage += `Factory has ${poolCount} pool(s) but this pool's ID is missing.\n\n`;
          errorMessage += `Action required:\n`;
          errorMessage += `1. Check the database entry for this staking pool\n`;
          errorMessage += `2. Add the 'poolId' field (number from factory contract)\n`;
          errorMessage += `3. Or contact admin to reconfigure this pool`;
        }

        setToastSuccess(false);
        setToastMessage(errorMessage);
        setToastOpen(true);
        setIsStakingInProgress(false);
        return;
      }
    } else {
      // Single contract - check if contract address is available
      if (!isValidContractAddress || !pool.tokenAddress) {
        console.error('[Staking] Invalid pool configuration:', {
          poolId,
          factoryAddress,
          contractAddress: pool.contractAddress,
          isValidContractAddress,
          isValidFactoryAddress,
          tokenAddress: pool.tokenAddress,
        });

        // Provide more helpful error message
        if (isValidFactoryAddress && !effectivePoolId) {
          setToastSuccess(false);
          setToastMessage(`Pool ID not found for token ${pool.tokenSymbol}. Please ensure the staking pool is properly configured in the database with a valid poolId.`);
          setToastOpen(true);
        } else if (!pool.tokenAddress) {
          setToastSuccess(false);
          setToastMessage("Staking pool not configured with token address");
          setToastOpen(true);
        } else if (!isValidFactoryAddress && !isValidContractAddress) {
          setToastSuccess(false);
          setToastMessage(`Staking pool configuration incomplete. Please configure either a valid factory address (for factory staking) or contract address (for single contract staking) in the database. Current chain: ${poolChainId || 'unknown'}`);
          setToastOpen(true);
        } else {
          setToastSuccess(false);
          setToastMessage("Staking pool not properly configured. Please contact support.");
          setToastOpen(true);
        }
        setIsStakingInProgress(false);
        return;
      }
    }

    setIsProcessing(true);

    try {
      // Validate wallet connection and chain before proceeding
      if (!activeAddress) {
        setToastSuccess(false);
        setToastMessage("Please connect your wallet first");
        setToastOpen(true);
        setIsProcessing(false);
        setIsStakingInProgress(false);
        return;
      }

      // Check if wagmi is connected (required for blockchain transactions)
      if (!isConnected && !address) {
        setToastSuccess(false);
        setToastMessage("Wallet connection issue. Please disconnect and reconnect your wallet through the wallet connection modal.");
        setToastOpen(true);
        setIsProcessing(false);
        setIsStakingInProgress(false);
        return;
      }

      if (!isConnected) {
        setToastSuccess(false);
        setToastMessage("Wallet is not connected. Please reconnect your wallet.");
        setToastOpen(true);
        setIsProcessing(false);
        setIsStakingInProgress(false);
        return;
      }

      // Check if we're on the correct chain
      const poolChainId = pool.chainId || chainId;
      if (chainId !== poolChainId) {
        setToastSuccess(false);
        setToastMessage(`Please switch to ${pool.chainId ? 'the correct network' : 'the required network'} to stake.`);
        setToastOpen(true);
        setIsProcessing(false);
        return;
      }

      // Check if approval is needed
      if (needsApproval) {
        // Approve first - this will trigger wallet approval prompt
        console.log('[Staking] Approval needed, calling approve...', { amount, poolId: effectivePoolId });
        setToastMessage(`Please approve ${pool.tokenSymbol} in your wallet...`);
        setToastOpen(true);

        try {
          console.log('[Staking] Calling staking.approve with poolId...', {
            poolId: effectivePoolId,
            amount,
            currentAllowance: staking.allowance?.toString(),
          });

          // CRITICAL FIX: approve() requires poolId as first parameter
          // This will trigger the wallet prompt automatically for approval transaction
          // Ensure amount is a string
          const approveTxHash = await staking.approve(effectivePoolId, String(amount));
          console.log('[Staking] Approval transaction hash received:', approveTxHash);

          // Wait for approval transaction to be confirmed
          // The wallet prompt appears automatically when writeContract is called
          // We wait for the transaction hash, which means user has confirmed in wallet
          if (!approveTxHash) {
            throw new Error('Approval transaction was not submitted. Please try again.');
          }

          // Wait for approval transaction receipt to be confirmed on-chain
          setToastMessage(`Waiting for approval confirmation...`);
          let approvalReceipt = null;
          if (approveTxHash && publicClient) {
            try {
              console.log('[Staking] Waiting for approval transaction receipt...', { hash: approveTxHash });
              approvalReceipt = await publicClient.waitForTransactionReceipt({
                hash: approveTxHash as `0x${string}`,
                timeout: 120_000, // 2 minutes timeout
              });
              console.log('[Staking] Approval transaction receipt received:', approvalReceipt);

              // Check if approval transaction was successful
              if (approvalReceipt.status === 'reverted') {
                throw new Error('Approval transaction was reverted. Please try approving again.');
              }
            } catch (receiptError: any) {
              console.error('[Staking] Error waiting for approval receipt:', receiptError);
              throw new Error('Failed to confirm approval transaction. Please try again.');
            }
          }

          // Wait a bit more for the approval to be fully processed
          await new Promise(resolve => setTimeout(resolve, 2000));

          // Refetch allowance to verify approval went through
          console.log('[Staking] Refetching allowance after approval...');
          staking.refetch();
          await new Promise(resolve => setTimeout(resolve, 2000));

          // Double-check allowance after a delay
          const currentAllowance = staking.allowance;
          const amountWei = parseUnits(amount, decimals);
          console.log('[Staking] Checking allowance after approval:', {
            currentAllowance: currentAllowance?.toString(),
            requiredAmount: amountWei.toString(),
            isSufficient: currentAllowance && currentAllowance >= amountWei,
          });

          if (!currentAllowance || currentAllowance < amountWei) {
            throw new Error('Approval did not complete or is insufficient. Please try approving again.');
          }

          console.log('[Staking] Approval confirmed, proceeding to deposit...');
        } catch (approvalError: any) {
          console.error("[Staking] Approval error:", approvalError);
          const errorMsg = approvalError?.message || approvalError?.shortMessage || approvalError?.cause?.message || "Approval failed. Please check your wallet and try again.";

          // Handle user rejection
          if (errorMsg.includes('User rejected') || errorMsg.includes('denied') || errorMsg.includes('rejected')) {
            setToastSuccess(false);
            setToastMessage("Approval was cancelled. Please try again when ready.");
            setToastOpen(true);
            setIsProcessing(false);
            return;
          }

          // Handle specific connector errors
          if (errorMsg.includes('getChainId') || errorMsg.includes('connector')) {
            throw new Error('Wallet connection issue. Please disconnect and reconnect your wallet, or switch to the correct network.');
          }

          throw new Error(errorMsg);
        }
      }

      // Deposit tokens - this will trigger wallet transaction prompt
      if (activeTab === "boost") {
        console.log('[Staking] Depositing tokens...', { amount, poolId: effectivePoolId, isValidFactoryAddress, isValidContractAddress });

        // Final check: Verify allowance is sufficient before attempting deposit
        const finalAllowance = staking.allowance;
        const amountWei = parseUnits(amount, decimals);
        if (finalAllowance && finalAllowance < amountWei) {
          console.error('[Staking] Insufficient allowance before deposit:', {
            allowance: finalAllowance.toString(),
            required: amountWei.toString(),
          });
          throw new Error('Insufficient allowance. Please approve more tokens and try again.');
        }

        setToastMessage(`Please confirm staking ${amount} ${pool.tokenSymbol} in your wallet...`);
        setToastOpen(true);

        try {
          console.log('[Staking] Calling staking.deposit with poolId...', {
            poolId: effectivePoolId,
            amount,
            amountWei: amountWei.toString(),
            allowance: finalAllowance?.toString(),
          });

          // CRITICAL FIX: deposit() requires poolId as first parameter
          // This will trigger the wallet prompt automatically for deposit transaction
          // The promise resolves with transaction hash when user confirms in wallet
          // Ensure amount is a string
          const depositTxHash = await staking.deposit(effectivePoolId, String(amount));
          console.log('[Staking] Deposit transaction hash received:', depositTxHash);

          if (!depositTxHash) {
            console.error('[Staking] No transaction hash returned from deposit', {
              depositTxHash,
              stakingDepositTxHash: staking.depositTxHash,
              isPending: staking.isPending,
              isError: staking.isError,
              error: staking.error,
            });
            throw new Error('Deposit transaction was not submitted. Please try again.');
          }

          // Wait for deposit transaction to be confirmed
          // The wallet prompt appears automatically when writeContract is called
          // We wait for the transaction hash, which means user has confirmed in wallet
          setToastMessage(`Waiting for transaction confirmation...`);

          // Wait for transaction receipt using publicClient
          let receipt = null;
          if (depositTxHash && publicClient) {
            try {
              console.log('[Staking] Waiting for transaction receipt...', { hash: depositTxHash });
              receipt = await publicClient.waitForTransactionReceipt({
                hash: depositTxHash as `0x${string}`,
                timeout: 120_000, // 2 minutes timeout
              });
              console.log('[Staking] Transaction receipt received:', receipt);

              // Check if transaction was successful
              if (receipt.status === 'reverted') {
                // Transaction reverted - try to get more details
                let revertReason = 'Transaction was reverted';
                
                // Try to decode revert reason from receipt
                try {
                  // Check if there's error data in the receipt
                  if (receipt.logs && receipt.logs.length > 0) {
                    // Try to find error logs
                    const errorLog = receipt.logs.find((log: any) => log.topics && log.topics.length > 0);
                    if (errorLog) {
                      console.log('[Staking] Found error log in receipt:', errorLog);
                    }
                  }
                  
                  // Common revert reasons for staking
                  revertReason = 'Transaction reverted. This usually means:\n' +
                    '1. Insufficient allowance - Please approve more tokens\n' +
                    '2. Insufficient balance - Please check your token balance\n' +
                    '3. Pool paused or inactive - Please check pool status\n' +
                    '4. Amount exceeds pool limits - Please try a smaller amount';
                } catch (decodeError) {
                  console.error('[Staking] Could not decode revert reason:', decodeError);
                }
                
                throw new Error(revertReason);
              }
            } catch (receiptError: any) {
              console.error('[Staking] Error waiting for transaction receipt:', receiptError);

              // If timeout, check transaction status one more time
              if (receiptError?.name === 'TimeoutError' || receiptError?.message?.includes('timeout')) {
                console.warn('[Staking] Transaction receipt timeout, checking status...');
                // Don't throw - transaction might still be processing
              } else {
                // Re-throw other errors
                throw receiptError;
              }
            }
          }

          // Fallback: Wait for transaction to be mined (check isPending/isLoading)
          if (!receipt) {
            let waitCount = 0;
            const maxWait = 120; // 2 minutes max wait
            while ((staking.isPending || staking.isLoading) && waitCount < maxWait) {
              await new Promise(resolve => setTimeout(resolve, 1000));
              waitCount++;

              // Check for errors while waiting
              if (staking.isError) {
                const errorMsg = staking.error?.message || staking.error?.shortMessage || "Transaction failed";
                throw new Error(errorMsg);
              }
            }

            // If still pending after max wait, check one more time
            if (staking.isPending || staking.isLoading) {
              console.warn('[Staking] Transaction still pending after max wait time');
              // Don't throw - transaction might still be processing
            }
          }

          console.log('[Staking] Deposit transaction status:', {
            receipt: receipt ? { status: receipt.status, blockNumber: receipt.blockNumber } : null,
            isPending: staking.isPending,
            isLoading: staking.isLoading,
            isError: staking.isError,
            error: staking.error,
            txHash: depositTxHash,
          });

          // Check if transaction was successful
          if (staking.isError) {
            const errorMsg = staking.error?.message || staking.error?.shortMessage || "Transaction failed";
            
            // Provide more helpful error messages for common revert reasons
            let userFriendlyError = errorMsg;
            if (errorMsg.includes('#1002') || errorMsg.includes('execution reverted')) {
              userFriendlyError = 'Transaction reverted: This usually means insufficient allowance or balance. Please ensure you have approved enough tokens and have sufficient balance.';
            } else if (errorMsg.includes('insufficient') || errorMsg.includes('allowance')) {
              userFriendlyError = 'Insufficient allowance. Please approve more tokens and try again.';
            } else if (errorMsg.includes('balance')) {
              userFriendlyError = 'Insufficient balance. Please check your token balance.';
            }
            
            throw new Error(userFriendlyError);
          }

          // Get transaction hash for database record
          const txHash = depositTxHash || staking.depositTxHash || currentTxHash;

          if (!txHash) {
            console.warn('[Staking] No transaction hash available, but transaction may have succeeded');
            // Continue anyway - the transaction might have succeeded even without hash
          }

          // Create user stake record in database after successful contract transaction
          try {
            console.log('[Staking] Creating user stake record in database...', {
              userWallet: activeAddress,
              poolId: pool.id,
              stakedAmount: amountNum,
              transactionHash: txHash,
              pool: {
                id: pool.id,
                minStakingPeriod: pool.minStakingPeriod,
              },
            });

            // Get lock period from pool (if configured)
            let lockPeriodDays: number | undefined = undefined;
            if (pool.minStakingPeriod) {
              // Try to parse lock period (could be "30 days", "30", etc.)
              const match = pool.minStakingPeriod.match(/\d+/);
              if (match) {
                lockPeriodDays = parseInt(match[0]);
              }
            }

            const requestBody = {
              userWallet: activeAddress,
              poolId: pool.id,
              stakedAmount: amountNum,
              rewardsEarned: 0, // Initial rewards are 0
              lockPeriodDays: lockPeriodDays,
              status: 'active' as const,
              transactionHash: txHash || undefined, // Only include if we have a hash
            };

            console.log('[Staking] Request body:', JSON.stringify(requestBody, null, 2));

            const stakeResponse = await fetch('/api/v1/user-stakes', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(requestBody),
            });

            if (!stakeResponse.ok) {
              const errorData = await stakeResponse.json();
              console.error('[Staking] Failed to create stake record:', {
                status: stakeResponse.status,
                statusText: stakeResponse.statusText,
                error: errorData,
                errorCode: errorData.code,
                errorDetails: errorData.details,
                errorHint: errorData.hint,
                insertData: errorData.insertData,
              });
              // Don't throw - transaction succeeded, just log the error
              // The stake will still be visible from the contract
            } else {
              const result = await stakeResponse.json();
              console.log('[Staking] Successfully created stake record in database:', result);
            }
          } catch (dbError: any) {
            console.error('[Staking] Error creating stake record:', {
              error: dbError,
              message: dbError?.message,
              stack: dbError?.stack,
            });
            // Don't throw - transaction succeeded, just log the error
          }

          setTxChainId(chainId);
          setTxHash(txHash);
          setToastSuccess(true);
          setToastMessage(`Successfully staked ${amount} ${pool.tokenSymbol}`);
          setToastOpen(true);

          // Refresh data after successful stake
          refetchTokenBalance();
          staking.refetch();

          // Trigger a page refresh to update "Active Positions" and "My Stakes"
          // This will be handled by the parent component watching for changes
          if (typeof window !== 'undefined') {
            // Dispatch a custom event to notify parent component
            window.dispatchEvent(new CustomEvent('stake-updated', {
              detail: { poolId: pool.id, userWallet: activeAddress }
            }));
          }
        } catch (depositError: any) {
          console.error("[Staking] Deposit error:", depositError);
          const errorMsg = depositError?.message || depositError?.shortMessage || depositError?.cause?.message || depositError?.toString() || "Staking failed. Please check your wallet and try again.";

          // Handle user rejection
          if (errorMsg.toLowerCase().includes('user rejected') ||
            errorMsg.toLowerCase().includes('denied') ||
            errorMsg.toLowerCase().includes('rejected') ||
            errorMsg.toLowerCase().includes('user denied') ||
            errorMsg.toLowerCase().includes('transaction was rejected')) {
            setToastSuccess(false);
            setToastMessage("Transaction was cancelled. Please try again when ready.");
            setToastOpen(true);
            setIsProcessing(false);
            return;
          }

          // Handle "transaction was not submitted" errors
          if (errorMsg.toLowerCase().includes('transaction was not submitted') ||
            errorMsg.toLowerCase().includes('not submitted')) {
            setToastSuccess(false);
            setToastMessage("Transaction was not submitted. Please check your wallet connection and try again.");
            setToastOpen(true);
            setIsProcessing(false);
            return;
          }

          // Handle specific connector errors
          if (errorMsg.includes('getChainId') || errorMsg.includes('connector')) {
            setToastSuccess(false);
            setToastMessage('Wallet connection issue. Please disconnect and reconnect your wallet, or switch to the correct network.');
            setToastOpen(true);
            setIsProcessing(false);
            return;
          }

          // For other errors, show the error message
          setToastSuccess(false);
          setToastMessage(errorMsg);
          setToastOpen(true);
          setIsProcessing(false);
          return;
        }
      } else {
        // Withdraw tokens
        setToastMessage(`Please confirm unstaking ${amount} ${pool.tokenSymbol} in your wallet...`);
        setToastOpen(true);

        try {
          await staking.withdraw(amount);

          // Wait for withdraw transaction to be submitted and confirmed
          let waitCount = 0;
          while ((staking.isPending || staking.isLoading) && waitCount < 120) {
            await new Promise(resolve => setTimeout(resolve, 500));
            waitCount++;
          }

          if (staking.isError) {
            throw new Error(staking.error?.message || "Transaction failed");
          }

          // Get transaction hash
          const withdrawTxHash = staking.withdrawTxHash || currentTxHash;

          // Update user stake record in database after successful unstaking
          try {
            console.log('[Staking] Updating user stake record after unstaking...', {
              userWallet: activeAddress,
              poolId: pool.id,
              unstakedAmount: amountNum,
              transactionHash: withdrawTxHash,
            });

            // Find the user's active stake for this pool
            const stakesResponse = await fetch(`/api/v1/user-stakes?userWallet=${encodeURIComponent(activeAddress || '')}&status=active`);
            if (stakesResponse.ok) {
              const stakesData = await stakesResponse.json();
              const activeStake = stakesData.stakes?.find((s: any) => s.poolId === pool.id);

              if (activeStake) {
                const remainingAmount = activeStake.stakedAmount - amountNum;

                // Update stake record - if fully unstaked, mark as withdrawn, otherwise update amount
                const updateResponse = await fetch('/api/v1/user-stakes', {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    id: activeStake.id,
                    stakedAmount: remainingAmount,
                    status: remainingAmount <= 0 ? 'withdrawn' : 'active',
                    transactionHash: withdrawTxHash,
                  }),
                });

                if (!updateResponse.ok) {
                  const errorData = await updateResponse.json();
                  console.error('[Staking] Failed to update stake record:', errorData);
                  // Don't throw - transaction succeeded, just log the error
                } else {
                  console.log('[Staking] Successfully updated stake record in database');
                }
              }
            }
          } catch (dbError: any) {
            console.error('[Staking] Error updating stake record:', dbError);
            // Don't throw - transaction succeeded, just log the error
          }

          setTxChainId(chainId);
          setTxHash(withdrawTxHash);
          setToastSuccess(true);
          setToastMessage(`Successfully unstaked ${amount} ${pool.tokenSymbol}`);
          setToastOpen(true);

          // Refresh data after successful unstake
          refetchTokenBalance();
          staking.refetch();

          // Trigger a page refresh to update "Active Positions" and "My Stakes"
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('stake-updated', {
              detail: { poolId: pool.id, userWallet: activeAddress }
            }));
          }
        } catch (withdrawError: any) {
          console.error("Withdraw error:", withdrawError);
          throw new Error(withdrawError?.message || withdrawError?.shortMessage || "Unstaking failed. Please try again.");
        }
      }

      // Reset form after successful transaction
      setAmount("");
      refetchTokenBalance();
      staking.refetch();
    } catch (error: any) {
      console.error("Transaction error:", error);
      setToastSuccess(false);
      const errorMessage = error?.message || error?.shortMessage || error?.toString() || "Transaction failed. Please try again.";
      setToastMessage(errorMessage);
      setToastOpen(true);
    } finally {
      setIsProcessing(false);
      setIsStakingInProgress(false); // Reset flag to allow future calls
    }
  };

  // Handle claim rewards
  const handleClaim = async () => {
    if (!activeAddress) {
      setToastSuccess(false);
      setToastMessage("Please connect your wallet first");
      setToastOpen(true);
      return;
    }

    if (!effectivePoolId && !pool.contractAddress) {
      setToastSuccess(false);
      setToastMessage("Staking pool not configured");
      setToastOpen(true);
      return;
    }

    setIsProcessing(true);

    try {
      await staking.claim();
      setTxChainId(chainId);
      setToastSuccess(true);
      setToastMessage("Successfully claimed rewards");
      setToastOpen(true);

      refetchTokenBalance();
      staking.refetch();
    } catch (error: any) {
      console.error("Claim error:", error);
      setToastSuccess(false);
      setToastMessage(error.message || "Claim failed. Please try again.");
      setToastOpen(true);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-6 items-center relative shrink-0 w-full max-w-[880px] mx-auto px-4 lg:px-0 staking-detail-enter">
        {/* Header with Back Button and Token - Centered as per Figma */}
        <div className="flex items-center justify-start relative shrink-0 w-full">
          <button
            onClick={onBack}
            className="cursor-pointer relative shrink-0 size-10 hover:opacity-80 transition-opacity"
            aria-label="Back"
          >
            <ArrowLeft className="size-10 text-white" />
          </button>
          <div className="flex gap-2 items-center relative shrink-0 mx-auto">
            <div className="relative shrink-0 size-10">
              <Image
                src={pool.tokenIcon}
                alt={pool.tokenSymbol}
                width={40}
                height={40}
                className="block max-w-none size-full rounded-full"
              />
            </div>
            <div className="flex flex-col items-start justify-center relative shrink-0">
              <p className="font-['Manrope',sans-serif] font-semibold leading-normal relative shrink-0 text-base text-white whitespace-nowrap">
                {pool.tokenSymbol}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Card */}
        <div className="bg-[#0b0f0a] border-[#273024] border-[0.5px] border-solid flex flex-col items-start overflow-clip p-4 relative rounded-xl shrink-0 w-full">
          <div className="flex gap-px items-center relative shrink-0 w-full">
            <div className="flex-1 flex flex-col items-center relative shrink-0">
              <div className="flex flex-col font-['Manrope',sans-serif] font-medium gap-1 items-center leading-normal relative shrink-0 text-center w-full">
                <p className="relative shrink-0 text-[#7c7c7c] text-xs tracking-[-0.48px] w-full">
                  TVL
                </p>
                <p className="relative shrink-0 text-sm text-white tracking-[-0.56px] w-full">
                  {(() => {
                    // Calculate TVL from pool info
                    if (factoryStakingWithPoolId.poolInfo) {
                      const totalStaked = Number(formatUnits(factoryStakingWithPoolId.poolInfo.state.totalStaked, decimals));
                      const maxTvl = Number(formatUnits(factoryStakingWithPoolId.poolInfo.config.maxTvl, decimals));
                      // TVL is current total staked, or max TVL if set
                      return maxTvl > 0
                        ? `${totalStaked.toLocaleString(undefined, { maximumFractionDigits: 2 })} / ${maxTvl.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${pool.tokenSymbol}`
                        : `${totalStaked.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${pool.tokenSymbol}`;
                    }
                    if (staking.totalStaked) {
                      return `${formatUnits(staking.totalStaked, decimals)} ${pool.tokenSymbol}`;
                    }
                    return pool.tvl || "N/A";
                  })()}
                </p>
              </div>
            </div>
            <div className="flex-1 flex flex-col items-start relative shrink-0">
              <div className="flex flex-col font-['Manrope',sans-serif] font-medium gap-1 items-center leading-normal relative shrink-0 text-center w-full">
                <p className="relative shrink-0 text-[#7c7c7c] text-xs tracking-[-0.48px] w-full">
                  APR
                </p>
                <p className="relative shrink-0 text-sm text-white tracking-[-0.56px] w-full">
                  {(() => {
                    // Calculate APR from pool config
                    if (factoryStakingWithPoolId.poolInfo) {
                      const poolConfig = factoryStakingWithPoolId.poolInfo.config;
                      const poolState = factoryStakingWithPoolId.poolInfo.state;
                      const poolReward = Number(formatUnits(poolConfig.poolReward, decimals));
                      const maxTvl = Number(formatUnits(poolConfig.maxTvl, decimals));
                      const totalStaked = Number(formatUnits(poolState.totalStaked, decimals));
                      const rewardDurationSeconds = Number(poolConfig.rewardDurationSeconds);

                      // Use maxTvl or totalStaked (whichever is relevant)
                      const tvlForCalculation = maxTvl > 0 ? maxTvl : (totalStaked > 0 ? totalStaked : maxTvl);

                      // Calculate APR (assuming same token price for staking and reward)
                      // In production, you'd fetch token prices from oracles
                      if (tvlForCalculation > 0 && rewardDurationSeconds > 0) {
                        const apr = calculateAPRFromPoolConfig(
                          poolReward,
                          tvlForCalculation,
                          rewardDurationSeconds,
                          1, // rewardTokenPrice (placeholder - should fetch from oracle)
                          1  // stakingTokenPrice (placeholder - should fetch from oracle)
                        );
                        return `${apr.toFixed(2)}%`;
                      }
                      return "N/A";
                    }
                    return pool.apr || pool.apy || "N/A";
                  })()}
                </p>
              </div>
            </div>
            <div className="flex-1 flex flex-col items-start relative shrink-0">
              <div className="flex flex-col font-['Manrope',sans-serif] font-medium gap-1 items-center leading-normal relative shrink-0 text-center w-full">
                <p className="relative shrink-0 text-[#7c7c7c] text-xs tracking-[-0.48px] w-full">
                  Total Staked
                </p>
                <p className="relative shrink-0 text-sm text-white tracking-[-0.56px] w-full">
                  {(() => {
                    if (factoryStakingWithPoolId.poolInfo) {
                      const totalStaked = Number(formatUnits(factoryStakingWithPoolId.poolInfo.state.totalStaked, decimals));
                      return `${totalStaked.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${pool.tokenSymbol}`;
                    }
                    if (staking.totalStaked) {
                      return `${formatUnits(staking.totalStaked, decimals)} ${pool.tokenSymbol}`;
                    }
                    return pool.totalStaked || "N/A";
                  })()}
                </p>
              </div>
            </div>
            <div className="flex-1 flex flex-col items-start relative shrink-0">
              <div className="flex flex-col font-['Manrope',sans-serif] font-medium gap-1 items-center leading-normal relative shrink-0 text-center w-full">
                <p className="relative shrink-0 text-[#7c7c7c] text-xs tracking-[-0.48px] w-full">
                  Limits
                </p>
                <p className="relative shrink-0 text-sm text-white tracking-[-0.56px] w-full">
                  {pool.limits || "N/A"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Section - Exact Figma dimensions */}
        <div className="bg-[#0b0f0a] border-[#273024] border-[0.5px] border-solid flex flex-col h-[71px] items-start px-4 py-3.5 relative rounded-full shrink-0 w-full max-w-[881px]">
          <div className="flex gap-4 lg:gap-[233px] items-center justify-between relative shrink-0 w-full">
            <div className="bg-[#0b0f0a] flex items-center p-1 relative rounded-full shrink-0 w-full lg:w-[568px]">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "boost" | "unstake")} className="w-full">
                <TabsList className="bg-transparent p-0 h-[35px] w-full gap-0">
                  <TabsTrigger
                    value="boost"
                    className="data-[state=active]:bg-[#141e00] data-[state=active]:border-[#b1f128] data-[state=active]:border data-[state=active]:text-[#b1f128] text-[#7c7c7c] h-[35px] rounded-full px-4 py-1.5 text-sm font-medium flex-1 lg:w-[280px] border-0 cursor-pointer"
                  >
                    Boost
                  </TabsTrigger>
                  <TabsTrigger
                    value="unstake"
                    className="data-[state=active]:bg-[#141e00] data-[state=active]:border-[#b1f128] data-[state=active]:border data-[state=active]:text-[#b1f128] text-[#7c7c7c] h-[35px] rounded-full px-4 py-1.5 text-sm font-medium flex-1 lg:w-[280px] border-0 cursor-pointer"
                  >
                    Unstake
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <button
              onClick={() => {
                refetchTokenBalance();
                factoryStakingWithPoolId.refetch();
                staking.refetch?.();
              }}
              className="bg-[#0b0f0a] h-[43px] overflow-clip relative rounded-[20px] shrink-0 w-12 flex items-center justify-center hover:opacity-80 transition-opacity"
              aria-label="Refresh"
            >
              <RefreshCw className="size-6 text-white" />
            </button>
          </div>
        </div>

        {/* Boost Message Banner */}
        {showBoostMessage && activeTab === "boost" && (
          <div className="bg-[rgba(73,143,0,0.15)] border-[#498f00] border-[0.5px] border-solid flex flex-col items-start overflow-clip px-4 py-3 relative rounded-xl shrink-0 w-full">
            <div className="flex items-start justify-between relative shrink-0 w-full">
              <div className="flex gap-2 items-center relative shrink-0">
                <Zap className="size-6 text-[#498f00]" />
                <p className="font-['Inter',sans-serif] font-normal leading-normal not-italic relative shrink-0 text-[#498f00] text-[10px] whitespace-pre-wrap">
                  Boost your earnings by extending your lock period or adding more tokens.
                </p>
              </div>
              <button
                onClick={() => setShowBoostMessage(false)}
                className="cursor-pointer relative shrink-0 size-4 hover:opacity-80 transition-opacity"
                aria-label="Dismiss"
              >
                <X className="size-4 text-[#498f00]" />
              </button>
            </div>
          </div>
        )}

        {/* Unstake Warning Banner */}
        {showUnstakeWarning && activeTab === "unstake" && (
          <div className="bg-[rgba(255,68,68,0.15)] border-[#ff4444] border-[0.5px] border-solid flex flex-col items-start overflow-clip px-4 py-3 relative rounded-xl shrink-0 w-full">
            <div className="flex items-start justify-between relative shrink-0 w-full">
              <div className="flex gap-2 items-center relative shrink-0">
                <AlertTriangle className="size-6 text-[#ff4444]" />
                <p className="font-['Inter',sans-serif] font-normal leading-normal not-italic relative shrink-0 text-[#ff4444] text-[10px] whitespace-pre-wrap">
                  Unstaking initiates a 30-day cooldown, though you can cancel at any point.
                </p>
              </div>
              <button
                onClick={() => setShowUnstakeWarning(false)}
                className="cursor-pointer relative shrink-0 size-4 hover:opacity-80 transition-opacity"
                aria-label="Dismiss"
              >
                <X className="size-4 text-[#ff4444]" />
              </button>
            </div>
          </div>
        )}

        {/* Content Section - Changes based on active tab */}
        {activeTab === "boost" ? (
          /* Boost Tab - Add More Tokens Section */
          <div className="flex flex-col gap-6 lg:gap-7 items-center justify-center relative shrink-0 w-full max-w-[612px]">
            <p className="font-['Manrope',sans-serif] font-medium leading-normal relative shrink-0 text-base text-white w-full whitespace-pre-wrap text-left">
              Add More Tokens
            </p>
            {/* Token Balance Display - Same format as portfolio */}
            <div className="flex flex-col gap-1 w-full max-w-[606px] px-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#7c7c7c]">Available Balance:</span>
                <div className="flex flex-col items-end">
                  {!activeAddress ? (
                    <span className="text-yellow-500 text-xs">No wallet connected</span>
                  ) : balanceLoading ? (
                    <span className="text-[#7c7c7c] text-base">Loading...</span>
                  ) : balanceError ? (
                    <span className="text-red-500 text-xs">Error: {balanceError}</span>
                  ) : !tokenAddress ? (
                    <span className="text-yellow-500 text-xs">No token address configured</span>
                  ) : (
                    <>
                      <span className="text-base text-white font-semibold">
                        {displayBalance} {pool.tokenSymbol}
                      </span>
                      {tokenUsdValue && parseFloat(tokenUsdValue) > 0 && (
                        <span className="text-sm text-[#7c7c7c]">
                          {displayUsdValue}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-4 items-center justify-center relative shrink-0 w-full">
              {/* Percentage Buttons Row - Above input box */}
              {activeAddress && (
                <div className="flex gap-2 items-center justify-end w-full max-w-[606px]">
                  <button
                    onClick={() => handlePercentageClick(30)}
                    type="button"
                    disabled={tokenBalanceNum === 0}
                    className="px-3 py-1.5 bg-[#0b0f0a] border border-[#1f261e] rounded-lg text-xs text-white hover:border-[#b1f128] hover:bg-[#141e00] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    30%
                  </button>
                  <button
                    onClick={() => handlePercentageClick(50)}
                    type="button"
                    disabled={tokenBalanceNum === 0}
                    className="px-3 py-1.5 bg-[#0b0f0a] border border-[#1f261e] rounded-lg text-xs text-white hover:border-[#b1f128] hover:bg-[#141e00] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    50%
                  </button>
                  <button
                    onClick={() => handlePercentageClick(75)}
                    type="button"
                    disabled={tokenBalanceNum === 0}
                    className="px-3 py-1.5 bg-[#0b0f0a] border border-[#1f261e] rounded-lg text-xs text-white hover:border-[#b1f128] hover:bg-[#141e00] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    75%
                  </button>
                  <button
                    onClick={handleMaxClick}
                    type="button"
                    disabled={tokenBalanceNum === 0}
                    className="px-3 py-1.5 bg-[#b1f128] rounded-lg text-xs text-black font-medium hover:bg-[#9dd81f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Max
                  </button>
                </div>
              )}

              {/* Input Box - Expanded */}
              <div className="h-[112px] relative shrink-0 w-full max-w-[606px] mb-6">
                <div className="absolute bg-[#010501] border border-[#1f261e] border-solid flex flex-col items-center justify-center left-0 px-0 py-6 rounded-2xl top-0 w-full">
                  <div className="flex flex-col items-center px-6 py-0 relative shrink-0 w-full">
                    <div className="border-[#7c7c7c] border-[0.2px] border-solid h-16 overflow-visible relative rounded-2xl shrink-0 w-full max-w-[500px]">
                      {/* Max button inside input box (fallback if no balance) */}
                      {(!activeAddress || tokenBalanceNum === 0) && (
                        <div className="absolute bg-[#b1f128] h-7 flex items-center justify-center right-4 px-4 py-1 rounded-full top-1/2 translate-y-[-50%] z-10">
                          <button
                            onClick={handleMaxClick}
                            type="button"
                            className="flex flex-col font-['Manrope',sans-serif] font-medium justify-center leading-0 relative shrink-0 text-base text-black text-right whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity"
                          >
                            Max
                          </button>
                        </div>
                      )}
                      <div className="absolute flex font-['Manrope',sans-serif] font-medium gap-1 items-end leading-0 left-4 text-right top-1.5 pr-2" style={{ right: '60px' }}>
                        <Input
                          type="text"
                          value={formattedInputValue}
                          onChange={(e) => handleAmountChange(e.target.value)}
                          onWheel={(e) => e.currentTarget.blur()}
                          placeholder={activeAddress && tokenBalanceNum > 0 ? displayBalance : "0.000"}
                          className={`bg-transparent border-0 p-0 text-[40px] text-white placeholder:text-[#7c7c7c] focus-visible:ring-0 focus-visible:ring-offset-0 w-full h-auto [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${isBelowMin || isAboveMax || exceedsBalance ? 'text-red-400' : ''}`}
                        />
                        <div className="flex flex-col h-6 justify-center relative shrink-0 text-sm text-white w-[33px]">
                          <p className="leading-normal whitespace-pre-wrap">{pool.tokenSymbol}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Validation messages - outside the input box */}
                {amount && amountNum > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 text-xs text-center">
                    {isBelowMin && (
                      <span className="text-red-400">
                        Minimum stake (admin limit): {formatTokenAmount(minStakeAmount.toString(), 6)} {pool.tokenSymbol}
                      </span>
                    )}
                    {isAboveMax && !exceedsBalance && (
                      <span className="text-red-400">
                        {adminMaxStakeAmount !== undefined
                          ? `Maximum stake (admin limit): ${formatTokenAmount(adminMaxStakeAmount.toString(), 6)} ${pool.tokenSymbol}. You entered: ${formatTokenAmount(amountNum.toString(), 6)}`
                          : `Maximum stake: ${formatTokenAmount(effectiveMax.toString(), 6)} ${pool.tokenSymbol}`
                        }
                      </span>
                    )}
                    {exceedsBalance && (
                      <span className="text-red-400">Insufficient balance. Available: {formatTokenAmount(tokenBalanceNum.toString(), 6)} {pool.tokenSymbol}</span>
                    )}
                    {isValidAmount && (
                      <span className="text-green-400">✓ Valid amount (within admin limits: {formatTokenAmount(minStakeAmount.toString(), 6)}-{formatTokenAmount(effectiveMax.toString(), 6)} {pool.tokenSymbol})</span>
                    )}
                  </div>
                )}
              </div>
              <Button
                onClick={handleStakeNow}
                disabled={isProcessing || isProcessingContract || !amount || !isValidAmount}
                className="bg-[#081f02] h-14 items-center justify-center px-6 py-4 relative rounded-full shrink-0 w-full max-w-[606px] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <p className="font-['Manrope',sans-serif] font-semibold leading-normal relative shrink-0 text-[#b1f128] text-lg text-center tracking-[0.018px] whitespace-pre-wrap">
                  {needsApproval && isProcessingContract ? "Approving..." : isProcessing || isProcessingContract ? "Processing..." : needsApproval ? "Approve & Stake Now" : "Stake Now"}
                </p>
              </Button>
            </div>
          </div>
        ) : (
          /* Unstake Tab - Unstake Tokens Section */
          <div className="flex flex-col gap-6 lg:gap-7 items-center justify-center relative shrink-0 w-full max-w-[612px]">
            <p className="font-['Manrope',sans-serif] font-medium leading-normal relative shrink-0 text-base text-white w-full whitespace-pre-wrap text-left">
              Unstake Tokens
            </p>
            <div className="flex flex-col gap-12 sm:gap-16 lg:gap-20 items-center justify-center relative shrink-0 w-full">
              <div className="flex flex-col gap-4 w-full max-w-[606px]">
                {/* Staked Amount Display */}
                {activeAddress && staking.userInfo && parseFloat(stakedAmount) > 0 && (
                  <div className="flex items-center justify-between px-2">
                    <span className="text-xs text-[#7c7c7c]">Staked Amount:</span>
                    <span className="text-sm text-white font-medium">
                      {parseFloat(stakedAmount).toLocaleString(undefined, { maximumFractionDigits: 6 })} {pool.tokenSymbol}
                    </span>
                  </div>
                )}

                {/* Percentage Buttons for Unstaking */}
                {activeAddress && staking.userInfo && parseFloat(stakedAmount) > 0 && (
                  <div className="flex gap-2 items-center">
                    <button
                      onClick={() => handlePercentageClick(25)}
                      type="button"
                      className="flex-1 px-3 py-1.5 bg-[#0b0f0a] border border-[#1f261e] rounded-lg text-xs text-white hover:border-[#b1f128] transition-colors"
                    >
                      25%
                    </button>
                    <button
                      onClick={() => handlePercentageClick(50)}
                      type="button"
                      className="flex-1 px-3 py-1.5 bg-[#0b0f0a] border border-[#1f261e] rounded-lg text-xs text-white hover:border-[#b1f128] transition-colors"
                    >
                      50%
                    </button>
                    <button
                      onClick={() => handlePercentageClick(75)}
                      type="button"
                      className="flex-1 px-3 py-1.5 bg-[#0b0f0a] border border-[#1f261e] rounded-lg text-xs text-white hover:border-[#b1f128] transition-colors"
                    >
                      75%
                    </button>
                    <button
                      onClick={handleMaxClick}
                      type="button"
                      className="flex-1 px-3 py-1.5 bg-[#b1f128] rounded-lg text-xs text-black font-medium hover:bg-[#9dd81f] transition-colors"
                    >
                      Max
                    </button>
                  </div>
                )}

                {/* Amount Input */}
                <div className="h-[112px] relative shrink-0 w-full mb-6">
                  <div className="absolute bg-[#010501] border border-[#1f261e] border-solid flex flex-col items-center justify-center left-0 px-0 py-6 rounded-2xl top-0 w-full">
                    <div className="flex flex-col items-center px-6 py-0 relative shrink-0 w-full">
                      <div className="border-[#7c7c7c] border-[0.2px] border-solid h-16 overflow-hidden relative rounded-2xl shrink-0 w-full max-w-[353px]">
                        <div className="absolute bg-[#b1f128] h-7 flex items-center justify-center right-4 px-4 py-1 rounded-full top-1/2 translate-y-[-50%]">
                          <button
                            onClick={handleMaxClick}
                            type="button"
                            className="flex flex-col font-['Manrope',sans-serif] font-medium justify-center leading-0 relative shrink-0 text-base text-black text-right whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity"
                          >
                            Max
                          </button>
                        </div>
                        <div className="absolute flex font-['Manrope',sans-serif] font-medium gap-1 items-end leading-0 left-4 text-right top-1.5 w-[180px]">
                          <Input
                            type="text"
                            value={formattedInputValue}
                            onChange={(e) => handleAmountChange(e.target.value)}
                            onWheel={(e) => e.currentTarget.blur()}
                            placeholder="0.000"
                            className={`bg-transparent border-0 p-0 text-[40px] text-white placeholder:text-[#7c7c7c] focus-visible:ring-0 focus-visible:ring-offset-0 w-full h-auto [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${isBelowMin || isAboveMax || exceedsBalance ? 'text-red-400' : ''}`}
                          />
                          <div className="flex flex-col h-6 justify-center relative shrink-0 text-sm text-white w-[33px]">
                            <p className="leading-normal whitespace-pre-wrap">{pool.tokenSymbol}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Validation messages for unstake - outside the input box */}
                  {amount && amountNum > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 text-xs text-center">
                      {isBelowMin && (
                        <span className="text-red-400">Minimum unstake: {formatTokenAmount(minStakeAmount.toString(), 6)} {pool.tokenSymbol}</span>
                      )}
                      {isAboveMax && !exceedsBalance && (
                        <span className="text-red-400">
                          {adminMaxStakeAmount !== undefined
                            ? `Maximum unstake (admin limit): ${formatTokenAmount(adminMaxStakeAmount.toString(), 6)} ${pool.tokenSymbol}`
                            : `Maximum unstake: ${formatTokenAmount(effectiveMax.toString(), 6)} ${pool.tokenSymbol}`
                          }
                        </span>
                      )}
                      {exceedsBalance && (
                        <span className="text-red-400">Exceeds staked amount</span>
                      )}
                      {isValidAmount && (
                        <span className="text-green-400">✓ Valid amount</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <Button
                onClick={handleStakeNow}
                disabled={isProcessing || isProcessingContract || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > parseFloat(stakedAmount)}
                className="bg-[#081f02] h-14 items-center justify-center px-6 py-4 relative rounded-full shrink-0 w-full max-w-[606px] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <p className="font-['Manrope',sans-serif] font-semibold leading-normal relative shrink-0 text-[#b1f128] text-lg text-center tracking-[0.018px] whitespace-pre-wrap">
                  {isProcessing || isProcessingContract ? "Processing..." : "Unstake"}
                </p>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Pending Rewards Display - if user has staked */}
      {staking.userInfo && staking.userInfo.amount > 0n && (
        <div className="bg-[#0b0f0a] border-[#273024] border-[0.5px] border-solid flex flex-col items-start overflow-clip p-4 relative rounded-xl shrink-0 w-full">
          <div className="flex justify-between items-center w-full mb-2">
            <p className="text-[#7c7c7c] text-xs">Pending Rewards</p>
            <p className="text-white text-sm font-medium">{pendingRewards} {pool.tokenSymbol}</p>
          </div>
          <div className="flex justify-between items-center w-full">
            <p className="text-[#7c7c7c] text-xs">Staked Amount</p>
            <p className="text-white text-sm font-medium">{stakedAmount} {pool.tokenSymbol}</p>
          </div>
          {parseFloat(pendingRewards) > 0 && (
            <Button
              onClick={handleClaim}
              disabled={isProcessing || isProcessingContract}
              className="mt-4 w-full bg-[#b1f128] text-[#010501] hover:bg-[#9dd81f] disabled:opacity-50"
            >
              Claim Rewards
            </Button>
          )}
        </div>
      )}

      {/* Transaction Toast */}
      <TransactionToast
        open={toastOpen}
        onOpenChange={setToastOpen}
        success={toastSuccess}
        message={toastMessage}
        txHash={currentTxHash}
        chainId={txChainId || chainId}
      />
    </>
  );
}

