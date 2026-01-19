/**
 * useStaking Hook
 * 
 * Hook for interacting with TIWI Staking Pool smart contract
 */

import { useAccount, useChainId, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useMemo } from 'react';
import { parseUnits, formatUnits, Address } from 'viem';
import { TIWI_STAKING_POOL_ABI } from '@/lib/contracts/types';
import type { TiwiStakingPoolFullUserInfo, TiwiStakingPoolConfig } from '@/lib/contracts/types';

interface UseStakingOptions {
  contractAddress?: Address;
  stakingTokenAddress?: Address;
  rewardTokenAddress?: Address;
  decimals?: number;
  enabled?: boolean;
}

interface UseStakingReturn {
  // Contract state
  userInfo: TiwiStakingPoolFullUserInfo | null;
  poolConfig: TiwiStakingPoolConfig | null;
  pendingReward: bigint | null;
  totalStaked: bigint | null;
  
  // Loading states
  isLoading: boolean;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: Error | null;
  
  // Transaction states
  depositTxHash: string | null;
  withdrawTxHash: string | null;
  claimTxHash: string | null;
  
  // Actions
  deposit: (amount: string) => Promise<void>;
  withdraw: (amount: string) => Promise<void>;
  claim: () => Promise<void>;
  
  // Approval
  approve: (amount?: string) => Promise<void>;
  allowance: bigint | null;
  needsApproval: (amount: string) => boolean;
  
  // Refresh
  refetch: () => void;
}

const ERC20_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'spender', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'address', name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export function useStaking({
  contractAddress,
  stakingTokenAddress,
  rewardTokenAddress,
  decimals = 18,
  enabled = true,
}: UseStakingOptions): UseStakingReturn {
  const { address } = useAccount();
  const chainId = useChainId();
  const { writeContract, data: txHash, isPending, isSuccess, isError, error, reset } = useWriteContract();
  
  // Read user info
  const { data: userInfoData, refetch: refetchUserInfo } = useReadContract({
    address: contractAddress,
    abi: TIWI_STAKING_POOL_ABI,
    functionName: 'getUserInfo',
    args: address ? [address] : undefined,
    query: {
      enabled: enabled && !!contractAddress && !!address,
    },
  });

  // Read pending reward
  const { data: pendingRewardData, refetch: refetchPending } = useReadContract({
    address: contractAddress,
    abi: TIWI_STAKING_POOL_ABI,
    functionName: 'pendingReward',
    args: address ? [address] : undefined,
    query: {
      enabled: enabled && !!contractAddress && !!address,
      refetchInterval: 5000, // Refetch every 5 seconds
    },
  });

  // Read pool config
  const { data: totalStakedData, refetch: refetchTotalStaked } = useReadContract({
    address: contractAddress,
    abi: TIWI_STAKING_POOL_ABI,
    functionName: 'totalStaked',
    query: {
      enabled: enabled && !!contractAddress,
    },
  });

  const { data: rewardPerSecondData } = useReadContract({
    address: contractAddress,
    abi: TIWI_STAKING_POOL_ABI,
    functionName: 'rewardPerSecond',
    query: {
      enabled: enabled && !!contractAddress,
    },
  });

  const { data: maxTvlData } = useReadContract({
    address: contractAddress,
    abi: TIWI_STAKING_POOL_ABI,
    functionName: 'maxTvl',
    query: {
      enabled: enabled && !!contractAddress,
    },
  });

  const { data: poolRewardData } = useReadContract({
    address: contractAddress,
    abi: TIWI_STAKING_POOL_ABI,
    functionName: 'poolReward',
    query: {
      enabled: enabled && !!contractAddress,
    },
  });

  const { data: rewardDurationSecondsData } = useReadContract({
    address: contractAddress,
    abi: TIWI_STAKING_POOL_ABI,
    functionName: 'rewardDurationSeconds',
    query: {
      enabled: enabled && !!contractAddress,
    },
  });

  const { data: stakingTokenData } = useReadContract({
    address: contractAddress,
    abi: TIWI_STAKING_POOL_ABI,
    functionName: 'stakingToken',
    query: {
      enabled: enabled && !!contractAddress,
    },
  });

  const { data: rewardTokenData } = useReadContract({
    address: contractAddress,
    abi: TIWI_STAKING_POOL_ABI,
    functionName: 'rewardToken',
    query: {
      enabled: enabled && !!contractAddress,
    },
  });

  const { data: startTimeData } = useReadContract({
    address: contractAddress,
    abi: TIWI_STAKING_POOL_ABI,
    functionName: 'startTime',
    query: {
      enabled: enabled && !!contractAddress,
    },
  });

  const { data: endTimeData } = useReadContract({
    address: contractAddress,
    abi: TIWI_STAKING_POOL_ABI,
    functionName: 'endTime',
    query: {
      enabled: enabled && !!contractAddress,
    },
  });

  // Read allowance
  const { data: allowanceData, refetch: refetchAllowance } = useReadContract({
    address: stakingTokenAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address && contractAddress ? [address, contractAddress] : undefined,
    query: {
      enabled: enabled && !!stakingTokenAddress && !!contractAddress && !!address,
    },
  });

  // Wait for transaction
  const { isLoading: isWaitingTx } = useWaitForTransactionReceipt({
    hash: txHash || undefined,
    onSuccess: () => {
      // Refetch data after successful transaction
      refetchUserInfo();
      refetchPending();
      refetchTotalStaked();
      refetchAllowance();
      reset();
    },
  });

  // Parse user info
  const userInfo = useMemo(() => {
    if (!userInfoData) return null;
    const [amount, rewardDebt, stakeTime, pending] = userInfoData as [bigint, bigint, bigint, bigint];
    return {
      amount,
      rewardDebt,
      stakeTime,
      pending,
    } as TiwiStakingPoolFullUserInfo;
  }, [userInfoData]);

  // Parse pool config
  const poolConfig = useMemo(() => {
    if (!contractAddress || !stakingTokenData || !rewardTokenData) return null;
    return {
      stakingToken: stakingTokenData as Address,
      rewardToken: rewardTokenData as Address,
      rewardPerSecond: (rewardPerSecondData as bigint) || BigInt(0),
      totalStaked: (totalStakedData as bigint) || BigInt(0),
      maxTvl: (maxTvlData as bigint) || BigInt(0),
      poolReward: (poolRewardData as bigint) || BigInt(0),
      rewardDurationSeconds: (rewardDurationSecondsData as bigint) || BigInt(0),
      startTime: (startTimeData as bigint) || BigInt(0),
      endTime: (endTimeData as bigint) || BigInt(0),
    } as TiwiStakingPoolConfig;
  }, [
    contractAddress,
    stakingTokenData,
    rewardTokenData,
    rewardPerSecondData,
    totalStakedData,
    maxTvlData,
    poolRewardData,
    rewardDurationSecondsData,
    startTimeData,
    endTimeData,
  ]);

  // Actions
  const deposit = async (amount: string) => {
    if (!contractAddress || !amount) return;
    
    const amountBigInt = parseUnits(amount, decimals);
    
    writeContract({
      address: contractAddress,
      abi: TIWI_STAKING_POOL_ABI,
      functionName: 'deposit',
      args: [amountBigInt],
    });
  };

  const withdraw = async (amount: string) => {
    if (!contractAddress || !amount) return;
    
    const amountBigInt = parseUnits(amount, decimals);
    
    writeContract({
      address: contractAddress,
      abi: TIWI_STAKING_POOL_ABI,
      functionName: 'withdraw',
      args: [amountBigInt],
    });
  };

  const claim = async () => {
    if (!contractAddress) return;
    
    writeContract({
      address: contractAddress,
      abi: TIWI_STAKING_POOL_ABI,
      functionName: 'claim',
    });
  };

  const approve = async (amount?: string) => {
    if (!stakingTokenAddress || !contractAddress) return;
    
    // Approve max if no amount specified
    const amountBigInt = amount 
      ? parseUnits(amount, decimals)
      : BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
    
    writeContract({
      address: stakingTokenAddress,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [contractAddress, amountBigInt],
    });
  };

  const needsApproval = (amount: string): boolean => {
    if (!allowanceData || !amount) return false;
    const amountBigInt = parseUnits(amount, decimals);
    return allowanceData < amountBigInt;
  };

  const refetch = () => {
    refetchUserInfo();
    refetchPending();
    refetchTotalStaked();
    refetchAllowance();
  };

  // Determine transaction type from function call
  const depositTxHash = txHash && isPending ? txHash : null;
  const withdrawTxHash = txHash && isPending ? txHash : null;
  const claimTxHash = txHash && isPending ? txHash : null;

  return {
    userInfo,
    poolConfig,
    pendingReward: pendingRewardData as bigint | null,
    totalStaked: totalStakedData as bigint | null,
    isLoading: isWaitingTx,
    isPending,
    isSuccess,
    isError,
    error: error as Error | null,
    depositTxHash,
    withdrawTxHash,
    claimTxHash,
    deposit,
    withdraw,
    claim,
    approve,
    allowance: allowanceData as bigint | null,
    needsApproval,
    refetch,
  };
}
