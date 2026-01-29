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
  walletAddress?: Address; // Optional wallet address override (for custom wallet connections)
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
  approve: (amount?: string) => Promise<string | undefined>;
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
  walletAddress,
}: UseStakingOptions): UseStakingReturn {
  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount();
  const chainId = useChainId();
  const { writeContract, data: txHash, isPending, isSuccess, isError, error, reset } = useWriteContract();
  
  // Use provided walletAddress if available, otherwise fall back to wagmi address
  const address = walletAddress || wagmiAddress;
  const isConnected = walletAddress ? true : wagmiConnected;
  
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
    if (!contractAddress || !amount) throw new Error('Contract address or amount not provided');
    
    // Validate contract address is a valid Ethereum address
    if (!contractAddress.startsWith('0x') || contractAddress.length !== 42) {
      console.error('[useStaking] deposit: Invalid contract address', {
        contractAddress,
        walletAddress,
        wagmiAddress,
      });
      throw new Error('Invalid contract address. Please check the staking pool configuration.');
    }
    
    // Better error messages for wallet connection issues
    if (!address) {
      console.error('[useStaking] deposit: No wallet address', {
        walletAddress,
        wagmiAddress: wagmiAddress,
        address,
      });
      throw new Error('Wallet not connected. Please connect your wallet and try again.');
    }
    
    // Check if wagmi is connected - required for writeContract
    if (!wagmiConnected && !wagmiAddress) {
      console.error('[useStaking] deposit: Wagmi not connected', {
        walletAddress,
        wagmiAddress,
        wagmiConnected,
      });
      throw new Error('Wallet connection issue. Please disconnect and reconnect your wallet through the wallet connection modal.');
    }
    
    const amountBigInt = parseUnits(amount, decimals);
    
    console.log('[useStaking] deposit called', {
      contractAddress,
      amount,
      address,
      walletAddress,
      wagmiAddress,
      isConnected,
      wagmiConnected,
    });
    
    try {
      // writeContract automatically triggers wallet prompt
      // Returns promise that resolves with transaction hash when user confirms
      const hash = await writeContract({
        address: contractAddress,
        abi: TIWI_STAKING_POOL_ABI,
        functionName: 'deposit',
        args: [amountBigInt],
      });
      
      console.log('[useStaking] deposit writeContract returned:', hash);
      
      // In wagmi v2, writeContract should return the hash directly
      // But also check the hook's data property as fallback
      // Wait a bit for txHash to be set if hash is not immediately available
      let finalHash = hash || txHash;
      
      if (!finalHash) {
        // Wait up to 2 seconds for txHash to be set in the hook
        for (let i = 0; i < 20; i++) {
          await new Promise(resolve => setTimeout(resolve, 100));
          if (txHash) {
            finalHash = txHash;
            break;
          }
        }
      }
      
      if (!finalHash) {
        console.error('[useStaking] deposit: No transaction hash returned', {
          hash,
          txHash,
          isPending,
          isError,
          error,
        });
        throw new Error('Transaction was not submitted. Please check your wallet and try again.');
      }
      
      return finalHash;
    } catch (error: any) {
      console.error('[useStaking] deposit error:', error);
      
      // Handle user rejection
      if (error?.message?.toLowerCase().includes('user rejected') || 
          error?.message?.toLowerCase().includes('user denied') ||
          error?.message?.toLowerCase().includes('rejected') ||
          error?.code === 4001) {
        throw new Error('Transaction was rejected. Please try again when ready.');
      }
      
      // Handle connector/chainId errors
      if (error?.message?.includes('getChainId') || 
          error?.message?.includes('connector') ||
          error?.message?.includes('connection.connector')) {
        throw new Error('Wallet connection issue. Please disconnect and reconnect your wallet through the wallet connection modal, or switch to the correct network.');
      }
      
      // Handle wallet connection issues
      if (error?.message?.includes('getChainId') || error?.message?.includes('connector')) {
        throw new Error('Wallet connection issue. Please disconnect and reconnect your wallet, or switch to the correct network.');
      }
      
      // Re-throw with original error message
      throw error;
    }
  };

  const withdraw = async (amount: string) => {
    if (!contractAddress || !amount) throw new Error('Contract address or amount not provided');
    if (!address) throw new Error('Wallet not connected');
    
    const amountBigInt = parseUnits(amount, decimals);
    
    const hash = await writeContract({
      address: contractAddress,
      abi: TIWI_STAKING_POOL_ABI,
      functionName: 'withdraw',
      args: [amountBigInt],
    });
    
    return hash;
  };

  const claim = async () => {
    if (!contractAddress) throw new Error('Contract address not provided');
    if (!address) throw new Error('Wallet not connected');
    
    const hash = await writeContract({
      address: contractAddress,
      abi: TIWI_STAKING_POOL_ABI,
      functionName: 'claim',
    });
    
    return hash;
  };

  const approve = async (amount?: string): Promise<string | undefined> => {
    if (!stakingTokenAddress || !contractAddress) throw new Error('Token or contract address not provided');
    if (!address) throw new Error('Wallet not connected');
    
    // Approve max if no amount specified
    const amountBigInt = amount 
      ? parseUnits(amount, decimals)
      : BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
    
    console.log('[useStaking] approve called', {
      stakingTokenAddress,
      contractAddress,
      amount,
      amountBigInt: amountBigInt.toString(),
      address,
      walletAddress,
      wagmiAddress,
      wagmiConnected,
      chainId,
    });
    
    try {
      // writeContract automatically triggers wallet prompt
      // Returns promise that resolves with transaction hash when user confirms
      const hash = await writeContract({
        address: stakingTokenAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [contractAddress, amountBigInt],
      });
      
      console.log('[useStaking] approve transaction hash:', hash);
      
      if (!hash) {
        // Wait a bit for hash to appear
        let finalHash = hash;
        for (let i = 0; i < 20; i++) {
          await new Promise(resolve => setTimeout(resolve, 100));
          // Check if hash appeared in the hook's state
          if (txHash) {
            finalHash = txHash;
            break;
          }
        }
        
        if (!finalHash) {
          throw new Error('Approval transaction was not submitted. Please check your wallet and try again.');
        }
        
        return finalHash;
      }
      
      return hash;
    } catch (error: any) {
      console.error('[useStaking] approve error:', error);
      if (error?.code === 4001 || error?.message?.includes('User rejected') || error?.message?.includes('denied') || error?.message?.includes('rejected')) {
        throw new Error('Transaction was rejected. Please try again.');
      }
      if (error?.message?.includes('getChainId') || error?.message?.includes('connector')) {
        throw new Error('Wallet connection issue. Please disconnect and reconnect your wallet, or switch to the correct network.');
      }
      if (error?.message?.toLowerCase().includes('not connected') || error?.message?.toLowerCase().includes('no account')) {
        throw new Error('Wallet not connected. Please ensure your wallet is connected and try again.');
      }
      throw error;
    }
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
