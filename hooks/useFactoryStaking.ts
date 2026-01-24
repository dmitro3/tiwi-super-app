/**
 * useFactoryStaking Hook
 * 
 * Hook for interacting with TIWI Staking Pool Factory contract
 * Allows admin to create pools and users to interact with pools via poolId
 */

import { useAccount, useChainId, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient, useConfig } from 'wagmi';
import { getConnectorClient, switchChain } from '@wagmi/core';
import { useMemo } from 'react';
import { parseUnits, formatUnits, Address, decodeEventLog } from 'viem';
import { TIWI_STAKING_POOL_FACTORY_ABI_ARRAY } from '@/lib/contracts/types';
import type { FactoryPoolInfo, FactoryUserInfo, FactoryPoolConfig, FactoryPoolState } from '@/lib/contracts/types';

// ERC20 ABI for approvals
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

// Factory address per chain - should be in env config
const FACTORY_ADDRESSES: Record<number, Address> = {
  1: (process.env.NEXT_PUBLIC_FACTORY_ADDRESS_MAINNET as Address) || '0x0000000000000000000000000000000000000000',
  56: (process.env.NEXT_PUBLIC_FACTORY_ADDRESS_BSC as Address) || '0x0000000000000000000000000000000000000000',
  137: (process.env.NEXT_PUBLIC_FACTORY_ADDRESS_POLYGON as Address) || '0x0000000000000000000000000000000000000000',
  42161: (process.env.NEXT_PUBLIC_FACTORY_ADDRESS_ARBITRUM as Address) || '0x0000000000000000000000000000000000000000',
  8453: (process.env.NEXT_PUBLIC_FACTORY_ADDRESS_BASE as Address) || '0x0000000000000000000000000000000000000000',
  10: (process.env.NEXT_PUBLIC_FACTORY_ADDRESS_OPTIMISM as Address) || '0x0000000000000000000000000000000000000000',
  43114: (process.env.NEXT_PUBLIC_FACTORY_ADDRESS_AVALANCHE as Address) || '0x0000000000000000000000000000000000000000',
};

interface UseFactoryStakingOptions {
  factoryAddress?: Address; // Optional override
  poolId?: bigint | number;
  stakingTokenAddress?: Address;
  decimals?: number;
  enabled?: boolean;
  walletAddress?: Address; // Optional wallet address override (for custom wallet connections)
  requiredChainId?: number; // Optional required chain ID for auto-switching
}

interface UseFactoryStakingReturn {
  // Pool info (if poolId provided)
  poolInfo: FactoryPoolInfo | null;
  userInfo: FactoryUserInfo | null;
  pendingReward: bigint | null;

  // All pools
  allPoolIds: bigint[] | null;

  // Loading states
  isLoading: boolean;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: Error | null;

  // Transaction states
  createPoolTxHash: string | null;
  depositTxHash: string | null;
  withdrawTxHash: string | null;
  claimTxHash: string | null;
  fundPoolTxHash: string | null;

  // Actions
  createPool: (stakingToken: Address, rewardToken: Address, poolReward: string, rewardDurationSeconds: number, maxTvl: string) => Promise<bigint | null>;
  deposit: (poolId: bigint | number, amount: string) => Promise<void>;
  withdraw: (poolId: bigint | number, amount: string) => Promise<void>;
  claim: (poolId: bigint | number) => Promise<void>;
  fundPool: (poolId: bigint | number) => Promise<void>;
  updatePoolConfig: (poolId: bigint | number, poolReward: string, rewardDurationSeconds: number, maxTvl: string) => Promise<void>;
  authorizeAdmin: (adminAddress: Address) => Promise<void>;
  revokeAdmin: (adminAddress: Address) => Promise<void>;

  // Approval
  approve: (poolId: bigint | number, amount?: string) => Promise<string | undefined>;
  allowance: bigint | null;
  needsApproval: (poolId: bigint | number, amount: string) => boolean;

  // Refresh
  refetch: () => void;
}

export function useFactoryStaking(options: UseFactoryStakingOptions = {}): UseFactoryStakingReturn {
  const { address: wagmiAddress, isConnected: wagmiConnected, connector } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const config = useConfig();
  const { writeContract, data: txHash, isPending, isError, error, isSuccess, reset } = useWriteContract();
  const { isLoading: isWaiting } = useWaitForTransactionReceipt({ hash: txHash });

  const {
    factoryAddress,
    poolId,
    stakingTokenAddress,
    decimals = 18,
    enabled = true,
    walletAddress,
    requiredChainId,
  } = options;

  // Use provided walletAddress if available, otherwise fall back to wagmi address
  const address = walletAddress || wagmiAddress;
  const isConnected = walletAddress ? true : wagmiConnected;

  // Get factory address (from options, chain mapping, or env)
  const contractAddress = useMemo(() => {
    if (factoryAddress) return factoryAddress;
    if (chainId && FACTORY_ADDRESSES[chainId]) return FACTORY_ADDRESSES[chainId];
    return undefined;
  }, [factoryAddress, chainId]);

  // Get all pool IDs
  const { data: allPoolIdsData, refetch: refetchPoolIds } = useReadContract({
    address: contractAddress,
    abi: TIWI_STAKING_POOL_FACTORY_ABI_ARRAY,
    functionName: 'getActivePoolIds',
    query: {
      enabled: enabled && !!contractAddress,
    },
  });

  // Get pool info (if poolId provided)
  const { data: poolInfoData, refetch: refetchPoolInfo } = useReadContract({
    address: contractAddress,
    abi: TIWI_STAKING_POOL_FACTORY_ABI_ARRAY,
    functionName: 'getPoolInfo',
    args: poolId !== undefined ? [BigInt(poolId)] : undefined,
    query: {
      enabled: enabled && !!contractAddress && poolId !== undefined,
    },
  });

  // Get user info (if poolId and address provided)
  const { data: userInfoData, refetch: refetchUserInfo } = useReadContract({
    address: contractAddress,
    abi: TIWI_STAKING_POOL_FACTORY_ABI_ARRAY,
    functionName: 'getUserInfo',
    args: poolId !== undefined && address ? [BigInt(poolId), address] : undefined,
    query: {
      enabled: enabled && !!contractAddress && poolId !== undefined && !!address,
      refetchInterval: 5000, // Refetch every 5 seconds
    },
  });

  // Get pending reward
  const { data: pendingRewardData, refetch: refetchPending } = useReadContract({
    address: contractAddress,
    abi: TIWI_STAKING_POOL_FACTORY_ABI_ARRAY,
    functionName: 'pendingReward',
    args: poolId !== undefined && address ? [BigInt(poolId), address] : undefined,
    query: {
      enabled: enabled && !!contractAddress && poolId !== undefined && !!address,
      refetchInterval: 5000,
    },
  });

  // Get allowance (if stakingTokenAddress and poolId provided)
  const poolConfig = poolInfoData?.[0] as FactoryPoolConfig | undefined;
  const { data: allowanceData, refetch: refetchAllowance } = useReadContract({
    address: stakingTokenAddress || poolConfig?.stakingToken,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address && contractAddress ? [address, contractAddress] : undefined,
    query: {
      enabled: enabled && !!address && !!contractAddress && !!(stakingTokenAddress || poolConfig?.stakingToken),
    },
  });

  // Actions
  const createPool = async (
    stakingToken: Address,
    rewardToken: Address,
    poolReward: string,
    rewardDurationSeconds: number,
    maxTvl: string
  ): Promise<bigint | null> => {
    if (!contractAddress) throw new Error('Factory address not configured for this chain');
    if (!address) throw new Error('Wallet not connected');

    const poolRewardWei = parseUnits(poolReward, 18);
    const maxTvlWei = parseUnits(maxTvl, 18);

    console.log('[useFactoryStaking] createPool called', {
      contractAddress,
      stakingToken,
      rewardToken,
      poolReward,
      rewardDurationSeconds,
      maxTvl,
    });

    try {
      const hash = await writeContract({
        address: contractAddress,
        abi: TIWI_STAKING_POOL_FACTORY_ABI_ARRAY,
        functionName: 'createPool',
        args: [stakingToken, rewardToken, poolRewardWei, BigInt(rewardDurationSeconds), maxTvlWei],
      });

      console.log('[useFactoryStaking] createPool writeContract returned:', hash);

      // In wagmi v2, writeContract should return the hash directly
      // But also check the hook's data property as fallback
      // Wait a bit for txHash to be set if hash is not immediately available
      let finalHash = hash || txHash;

      if (!finalHash) {
        // Wait up to 10 seconds for txHash to be set in the hook
        // This gives time for the wallet to prompt and user to confirm
        console.log('[useFactoryStaking] Waiting for transaction hash...', {
          initialHash: hash,
          initialTxHash: txHash,
          isPending,
          isError,
        });

        for (let i = 0; i < 100; i++) {
          await new Promise(resolve => setTimeout(resolve, 100));

          // Check if hash appeared in the hook's state
          if (txHash) {
            finalHash = txHash;
            console.log('[useFactoryStaking] Transaction hash found in hook state:', finalHash);
            break;
          }

          // Also check if isPending became true (transaction submitted)
          if (isPending) {
            console.log('[useFactoryStaking] Transaction is pending, waiting for hash...');
            // Continue waiting for hash
          }

          // Check if there's an error
          if (isError && error) {
            console.error('[useFactoryStaking] Error detected while waiting for hash:', error);
            throw error;
          }

          // If we've waited 5 seconds and still no hash, but isPending is true, 
          // the transaction might have been submitted but hash not yet available
          if (i === 50 && isPending && !txHash) {
            console.log('[useFactoryStaking] Transaction pending but hash not available yet, continuing to wait...');
          }
        }
      }

      console.log('[useFactoryStaking] createPool transaction hash:', finalHash, {
        hash,
        txHash,
        isPending,
        isError,
        error,
        isSuccess,
      });

      if (!finalHash) {
        console.error('[useFactoryStaking] createPool: No transaction hash returned after waiting', {
          hash,
          txHash,
          isPending,
          isError,
          error,
          isSuccess,
        });

        // Check if there's an error that wasn't thrown
        if (isError && error) {
          throw error;
        }

        // If transaction is pending but we don't have hash, try to get it from the receipt
        // by waiting a bit more and checking the factory for new pools
        if (isPending) {
          console.log('[useFactoryStaking] Transaction is pending but no hash available. Waiting for completion...');
          // Wait for transaction to complete
          let waitCount = 0;
          while (isPending && waitCount < 60) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            waitCount++;
            if (txHash) {
              finalHash = txHash;
              break;
            }
          }
        }

        // If still no hash, try fallback: get latest pool from factory
        if (!finalHash) {
          console.log('[useFactoryStaking] No hash available, trying to get poolId from factory directly...');
          // Wait a bit for transaction to be mined
          await new Promise(resolve => setTimeout(resolve, 5000));

          try {
            const allPoolIds = await publicClient.readContract({
              address: contractAddress,
              abi: TIWI_STAKING_POOL_FACTORY_ABI_ARRAY,
              functionName: 'getActivePoolIds',
            }) as bigint[];

            console.log('[useFactoryStaking] All pool IDs from factory (fallback, no hash):', allPoolIds);

            if (allPoolIds.length > 0) {
              // The newest pool should be the last one (or highest ID)
              const newPoolId = allPoolIds[allPoolIds.length - 1];
              console.log('[useFactoryStaking] Found new poolId from factory (no hash available):', newPoolId);
              return newPoolId;
            } else {
              throw new Error('No pools found in factory. The transaction may have failed or not been mined yet.');
            }
          } catch (fallbackError: any) {
            console.error('[useFactoryStaking] Fallback method also failed:', fallbackError);
            throw new Error('Pool creation transaction was submitted but poolId could not be determined. Please check the factory contract on BSCScan and manually set the poolId in the database.');
          }
        }
      }

      // Wait for transaction receipt to get poolId from PoolCreated event
      if (!publicClient) {
        throw new Error('Public client not available');
      }

      // If we have a hash, wait for receipt
      if (finalHash) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash: finalHash });
        console.log('[useFactoryStaking] createPool receipt:', receipt);

        // Parse PoolCreated event to get poolId
        const poolCreatedEvent = receipt.logs.find((log: any) => {
          try {
            const decoded = decodeEventLog({
              abi: TIWI_STAKING_POOL_FACTORY_ABI_ARRAY,
              data: log.data,
              topics: log.topics,
            });
            return decoded.eventName === 'PoolCreated';
          } catch {
            return false;
          }
        });

        if (poolCreatedEvent) {
          const decoded = decodeEventLog({
            abi: TIWI_STAKING_POOL_FACTORY_ABI_ARRAY,
            data: poolCreatedEvent.data,
            topics: poolCreatedEvent.topics,
          });
          const poolId = (decoded.args as any).poolId as bigint;
          console.log('[useFactoryStaking] createPool poolId from event:', poolId);
          return poolId;
        }
      }

      // Fallback: Try to get poolId from getActivePoolIds (last one should be the new pool)
      // This works even if we don't have the transaction hash
      console.log('[useFactoryStaking] createPool: Using fallback method to get poolId...');

      // Wait a bit for the transaction to be fully processed
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Get pool count before (if possible) to compare
      const allPoolIds = await publicClient.readContract({
        address: contractAddress,
        abi: TIWI_STAKING_POOL_FACTORY_ABI_ARRAY,
        functionName: 'getActivePoolIds',
      }) as bigint[];

      console.log('[useFactoryStaking] createPool: All pool IDs from factory:', allPoolIds);

      if (allPoolIds.length > 0) {
        // The newest pool should be the last one (or highest ID)
        const newPoolId = allPoolIds[allPoolIds.length - 1];
        console.log('[useFactoryStaking] createPool poolId from getActivePoolIds (fallback):', newPoolId);
        return newPoolId;
      }

      console.warn('[useFactoryStaking] createPool: Could not extract poolId from transaction or factory');
      throw new Error('Pool was created but poolId could not be determined. Please check the factory contract and manually set the poolId in the database.');
    } catch (error: any) {
      console.error('[useFactoryStaking] createPool error:', error);
      if (error?.message?.includes('User rejected') || error?.message?.includes('denied') || error?.message?.includes('rejected')) {
        throw new Error('Transaction was rejected. Please try again.');
      }
      if (error?.message?.includes('getChainId') || error?.message?.includes('connector')) {
        throw new Error('Wallet connection issue. Please disconnect and reconnect your wallet, or switch to the correct network.');
      }
      throw error;
    }
  };

  // Authorize an admin wallet (factory owner only)
  const authorizeAdmin = async (adminAddress: Address) => {
    if (!contractAddress) throw new Error('Factory address not configured');

    await writeContract({
      address: contractAddress,
      abi: TIWI_STAKING_POOL_FACTORY_ABI_ARRAY,
      functionName: 'authorizeAdmin',
      args: [adminAddress],
    });
  };

  // Revoke admin authorization (factory owner only)
  const revokeAdmin = async (adminAddress: Address) => {
    if (!contractAddress) throw new Error('Factory address not configured');

    await writeContract({
      address: contractAddress,
      abi: TIWI_STAKING_POOL_FACTORY_ABI_ARRAY,
      functionName: 'revokeAdmin',
      args: [adminAddress],
    });
  };

  const deposit = async (poolId: bigint | number, amount: string) => {
    if (!contractAddress) throw new Error('Factory address not configured');

    // Better error messages for wallet connection issues
    if (!address) {
      console.error('[useFactoryStaking] deposit: No wallet address', {
        walletAddress,
        wagmiAddress,
        address,
      });
      throw new Error('Wallet not connected. Please connect your wallet and try again.');
    }

    // If we have walletAddress but wagmi doesn't show connected, still try (wallet might be connected at browser level)
    if (!walletAddress && !wagmiConnected) {
      console.error('[useFactoryStaking] deposit: Wallet not connected in wagmi', {
        walletAddress,
        wagmiAddress,
        address,
        isConnected,
        wagmiConnected,
      });
      throw new Error('Wallet is not connected. Please reconnect your wallet and try again.');
    }

    const amountWei = parseUnits(amount, decimals);

    // Determine required chain ID from options, factory address, or current chain
    const targetChainId = requiredChainId || 
      (Object.keys(FACTORY_ADDRESSES).find(
        (id) => FACTORY_ADDRESSES[Number(id)]?.toLowerCase() === contractAddress.toLowerCase()
      ) ? Number(Object.keys(FACTORY_ADDRESSES).find(
        (id) => FACTORY_ADDRESSES[Number(id)]?.toLowerCase() === contractAddress.toLowerCase()
      )) : chainId);

    console.log('[useFactoryStaking] deposit called', {
      contractAddress,
      poolId: Number(poolId),
      amount,
      amountWei: amountWei.toString(),
      address,
      isConnected,
      walletAddress,
      wagmiAddress,
      wagmiConnected,
      chainId,
      targetChainId,
    });

    try {
      // Always reset before attempting transaction to clear any previous errors
      console.log('[useFactoryStaking] Resetting writeContract hook state before deposit...');
      reset();
      // Wait a bit for reset to take effect
      await new Promise(resolve => setTimeout(resolve, 200));

      // Get current chain ID - try multiple sources
      let currentChainId = chainId;
      if (!currentChainId && connector) {
        try {
          currentChainId = await connector.getChainId();
        } catch (e) {
          console.warn('[useFactoryStaking] Could not get chainId from connector');
        }
      }

      // Check if we need to switch chains - DO THIS FIRST before any connector operations
      if (targetChainId && currentChainId !== targetChainId) {
        console.log(`[useFactoryStaking] Current chain (${currentChainId}) doesn't match required chain (${targetChainId}). Switching...`);
        try {
          // Try to switch chain - this should work even if connector has issues
          await switchChain(config, { chainId: targetChainId });
          // Wait for chain switch to complete
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Verify chain switch succeeded
          const newChainId = chainId; // Use the hook value, not calling it as function
          if (newChainId !== targetChainId) {
            // Wait a bit more and check again
            await new Promise(resolve => setTimeout(resolve, 1000));
            // Re-read chainId from hook after waiting
            // Note: We can't directly read hook state in async function, so we'll just wait and proceed
            console.log(`[useFactoryStaking] Chain switch initiated. Proceeding with transaction...`);
          }
          
          console.log(`[useFactoryStaking] Successfully switched to chain ${targetChainId}`);
        } catch (switchError: any) {
          console.error('[useFactoryStaking] Failed to switch chain:', switchError);
          
          // If user rejected, throw a user-friendly error
          if (switchError?.code === 4001 || switchError?.message?.toLowerCase().includes('user rejected')) {
            throw new Error('Chain switch was rejected. Please switch to the correct network manually and try again.');
          }
          
          // If chain not added, provide helpful message
          if (switchError?.code === 4902) {
            throw new Error(`Please add chain ${targetChainId} to your wallet and try again.`);
          }
          
          // For other errors, still try to proceed - user might have switched manually
          console.warn('[useFactoryStaking] Chain switch failed, but continuing in case user switched manually');
        }
      }

      // Wait a bit for connector to be ready after chain switch
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify connector is available and ready
      if (!connector) {
        console.error('[useFactoryStaking] No connector available after waiting');
        throw new Error('Wallet connector is not available. Please ensure your wallet is properly connected via the wallet modal and try again.');
      }

      // Verify wagmi shows wallet is connected
      if (!wagmiConnected && !walletAddress) {
        console.error('[useFactoryStaking] Wallet not connected according to wagmi');
        throw new Error('Wallet is not connected. Please connect your wallet using the "Connect Wallet" button and try again.');
      }

      // Log connector info
      console.log('[useFactoryStaking] Connector ready:', {
        connectorId: connector.id,
        connectorName: connector.name,
        chainId,
        address,
        wagmiConnected,
      });

      // Verify connector client can be obtained
      try {
        const connectorClient = await getConnectorClient(config, { connector });
        console.log('[useFactoryStaking] Connector client obtained successfully:', {
          account: connectorClient.account.address,
          chain: connectorClient.chain.id,
        });
      } catch (connectorError: any) {
        console.error('[useFactoryStaking] Failed to get connector client:', connectorError);
        throw new Error('Unable to communicate with your wallet. Please disconnect and reconnect your wallet, then try again.');
      }

      // Call writeContract - this will trigger the wallet transaction prompt
      let hash: string | undefined;

      try {
        console.log('[useFactoryStaking] Calling writeContract for deposit...');
        hash = await writeContract({
          address: contractAddress,
          abi: TIWI_STAKING_POOL_FACTORY_ABI_ARRAY,
          functionName: 'deposit',
          args: [BigInt(poolId), amountWei],
        });
      } catch (writeErr: any) {
        console.error('[useFactoryStaking] writeContract threw error:', writeErr);

        // Handle specific errors
        if (writeErr?.message?.includes('User rejected') ||
            writeErr?.message?.includes('denied') ||
            writeErr?.code === 4001) {
          throw new Error('Transaction was rejected in your wallet. Please try again.');
        }

        if (writeErr?.message?.includes('getChainId') ||
            writeErr?.message?.includes('connector')) {
          throw new Error('Wallet connection error. Please disconnect your wallet, refresh the page, reconnect, and try again.');
        }

        // Re-throw other errors
        throw writeErr;
      }

      console.log('[useFactoryStaking] deposit writeContract returned:', hash);

      // In wagmi v2, writeContract should return the hash directly
      // But also check the hook's data property as fallback
      // Wait a bit for txHash to be set if hash is not immediately available
      let finalHash = hash || txHash;

      if (!finalHash) {
        // Wait up to 10 seconds for txHash to be set in the hook
        // This gives time for the wallet to prompt and user to confirm
        console.log('[useFactoryStaking] Waiting for transaction hash...', {
          initialHash: hash,
          initialTxHash: txHash,
          isPending,
          isError,
          writeError: writeError?.message,
        });

        for (let i = 0; i < 100; i++) {
          await new Promise(resolve => setTimeout(resolve, 100));

          // Check if hash appeared in the hook's state
          if (txHash) {
            finalHash = txHash;
            console.log('[useFactoryStaking] Transaction hash found in hook state:', finalHash);
            break;
          }

          // Also check if isPending became true (transaction submitted)
          if (isPending) {
            console.log('[useFactoryStaking] Transaction is pending, waiting for hash...');
            // Continue waiting for hash
          }

          // Check if there's an error (but don't throw immediately - might be transient)
          if (isError && error) {
            // Only throw if it's not a connector error (those might be transient)
            const errorMsg = error?.message || '';
            if (!errorMsg.includes('getChainId') && !errorMsg.includes('connector') && !errorMsg.includes('connection.connector')) {
              console.error('[useFactoryStaking] Error detected while waiting for hash:', error);
              throw error;
            } else {
              console.warn('[useFactoryStaking] Connector error detected, continuing to wait...', error);
            }
          }
        }
      }

      console.log('[useFactoryStaking] deposit transaction hash:', finalHash, {
        hash,
        txHash,
        isPending,
        isError,
        error,
        isSuccess,
        writeError: writeError?.message,
      });

      if (!finalHash) {
        console.error('[useFactoryStaking] deposit: No transaction hash returned after waiting', {
          hash,
          txHash,
          isPending,
          isError,
          error,
          isSuccess,
          writeError: writeError?.message,
        });

        // Check if there's an error that wasn't thrown
        if (isError && error) {
          const errorMsg = error?.message || '';
          // Handle connector errors specifically
          if (errorMsg.includes('getChainId') || errorMsg.includes('connector') || errorMsg.includes('connection.connector')) {
            throw new Error('Wallet connection issue. Please disconnect and reconnect your wallet, or switch to the correct network.');
          }
          throw error;
        }

        // If we had a writeError but no hash, throw that error
        if (writeError) {
          const errorMsg = writeError?.message || '';
          if (errorMsg.includes('getChainId') || errorMsg.includes('connector') || errorMsg.includes('connection.connector')) {
            throw new Error('Wallet connection issue. Please disconnect and reconnect your wallet, or switch to the correct network.');
          }
          throw writeError;
        }

        throw new Error('Transaction was not submitted. Please check your wallet and try again.');
      }

      console.log('[useFactoryStaking] deposit transaction hash:', finalHash);
      return finalHash;
    } catch (error: any) {
      console.error('[useFactoryStaking] deposit error:', error);

      // Handle user rejection
      if (error?.message?.toLowerCase().includes('user rejected') ||
        error?.message?.toLowerCase().includes('user denied') ||
        error?.message?.toLowerCase().includes('rejected') ||
        error?.code === 4001) {
        throw new Error('Transaction was rejected. Please try again when ready.');
      }

      // Handle contract revert errors
      if (error?.message?.includes('#1002') || 
          error?.message?.includes('execution reverted') ||
          error?.data || 
          error?.reason ||
          error?.shortMessage?.includes('reverted')) {
        let revertReason = error?.reason || error?.data || error?.shortMessage || error?.message || 'Transaction reverted';
        
        // Provide user-friendly error messages
        if (revertReason.includes('#1002') || revertReason.includes('1002')) {
          revertReason = 'Transaction reverted: Insufficient allowance or balance. Please ensure you have approved enough tokens and have sufficient balance.';
        } else if (revertReason.includes('insufficient') || revertReason.includes('allowance')) {
          revertReason = 'Insufficient allowance. Please approve more tokens and try again.';
        } else if (revertReason.includes('balance')) {
          revertReason = 'Insufficient balance. Please check your token balance.';
        } else if (revertReason.includes('maxTvl') || revertReason.includes('TVL')) {
          revertReason = 'Pool has reached maximum TVL. Cannot deposit more tokens.';
        } else if (revertReason.includes('active') || revertReason.includes('paused')) {
          revertReason = 'Pool is not active. Please check the pool status.';
        } else if (revertReason.includes('startTime') || revertReason.includes('endTime')) {
          revertReason = 'Pool has not started yet or has already ended.';
        }
        
        throw new Error(revertReason);
      }

      // Handle connector/chain errors - but don't throw if we can still proceed
      if (error?.message?.includes('getChainId') || error?.message?.includes('connector')) {
        // Check if we're on the wrong chain - try to switch
        const currentChain = chainId;
        if (targetChainId && currentChain !== targetChainId) {
          throw new Error(`Please switch to the correct network (Chain ID: ${targetChainId}) and try again.`);
        }
        throw new Error('Wallet connection issue. Please disconnect and reconnect your wallet, or switch to the correct network.');
      }
      // If error mentions wallet not connected, provide helpful message
      if (error?.message?.toLowerCase().includes('not connected') || error?.message?.toLowerCase().includes('no account')) {
        throw new Error('Wallet not connected. Please ensure your wallet is connected and try again.');
      }
      throw error;
    }
  };

  const withdraw = async (poolId: bigint | number, amount: string) => {
    if (!contractAddress) throw new Error('Factory address not configured');
    if (!address) throw new Error('Wallet not connected');

    // If we have walletAddress but wagmi doesn't show connected, still try (wallet might be connected at browser level)
    if (!walletAddress && !wagmiConnected) {
      throw new Error('Wallet is not connected. Please reconnect your wallet and try again.');
    }

    const amountWei = parseUnits(amount, decimals);

    try {
      await writeContract({
        address: contractAddress,
        abi: TIWI_STAKING_POOL_FACTORY_ABI_ARRAY,
        functionName: 'withdraw',
        args: [BigInt(poolId), amountWei],
      });
    } catch (error: any) {
      console.error('[useFactoryStaking] withdraw error:', error);
      if (error?.message?.includes('getChainId') || error?.message?.includes('connector')) {
        throw new Error('Wallet connection issue. Please disconnect and reconnect your wallet, or switch to the correct network.');
      }
      if (error?.message?.toLowerCase().includes('not connected') || error?.message?.toLowerCase().includes('no account')) {
        throw new Error('Wallet not connected. Please ensure your wallet is connected and try again.');
      }
      throw error;
    }
  };

  const claim = async (poolId: bigint | number) => {
    if (!contractAddress) throw new Error('Factory address not configured');
    if (!address) throw new Error('Wallet not connected');

    // If we have walletAddress but wagmi doesn't show connected, still try (wallet might be connected at browser level)
    if (!walletAddress && !wagmiConnected) {
      throw new Error('Wallet is not connected. Please reconnect your wallet and try again.');
    }

    try {
      await writeContract({
        address: contractAddress,
        abi: TIWI_STAKING_POOL_FACTORY_ABI_ARRAY,
        functionName: 'claim',
        args: [BigInt(poolId)],
      });
    } catch (error: any) {
      console.error('[useFactoryStaking] claim error:', error);
      if (error?.message?.includes('getChainId') || error?.message?.includes('connector')) {
        throw new Error('Wallet connection issue. Please disconnect and reconnect your wallet, or switch to the correct network.');
      }
      if (error?.message?.toLowerCase().includes('not connected') || error?.message?.toLowerCase().includes('no account')) {
        throw new Error('Wallet not connected. Please ensure your wallet is connected and try again.');
      }
      throw error;
    }
  };

  const fundPool = async (poolId: bigint | number) => {
    if (!contractAddress) throw new Error('Factory address not configured');

    await writeContract({
      address: contractAddress,
      abi: TIWI_STAKING_POOL_FACTORY_ABI_ARRAY,
      functionName: 'fundPoolRewards',
      args: [BigInt(poolId)],
    });
  };

  const updatePoolConfig = async (
    poolId: bigint | number,
    poolReward: string,
    rewardDurationSeconds: number,
    maxTvl: string
  ) => {
    if (!contractAddress) throw new Error('Factory address not configured');

    const poolRewardWei = parseUnits(poolReward, 18);
    const maxTvlWei = parseUnits(maxTvl, 18);

    await writeContract({
      address: contractAddress,
      abi: TIWI_STAKING_POOL_FACTORY_ABI_ARRAY,
      functionName: 'updatePoolConfig',
      args: [BigInt(poolId), poolRewardWei, BigInt(rewardDurationSeconds), maxTvlWei],
    });
  };

  const approve = async (poolId: bigint | number, amount?: string): Promise<string | undefined> => {
    const tokenAddress = stakingTokenAddress || poolConfig?.stakingToken;
    if (!tokenAddress) throw new Error('Staking token address not found');
    if (!contractAddress) throw new Error('Factory address not configured');
    if (!address) throw new Error('Wallet not connected');

    // If we have walletAddress but wagmi doesn't show connected, still try (wallet might be connected at browser level)
    if (!walletAddress && !wagmiConnected) {
      throw new Error('Wallet is not connected. Please reconnect your wallet and try again.');
    }

    const amountWei = amount ? parseUnits(amount, decimals) : BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');

    // Determine required chain ID from options, factory address, or current chain
    const targetChainId = requiredChainId || 
      (Object.keys(FACTORY_ADDRESSES).find(
        (id) => FACTORY_ADDRESSES[Number(id)]?.toLowerCase() === contractAddress.toLowerCase()
      ) ? Number(Object.keys(FACTORY_ADDRESSES).find(
        (id) => FACTORY_ADDRESSES[Number(id)]?.toLowerCase() === contractAddress.toLowerCase()
      )) : chainId);

    console.log('[useFactoryStaking] approve called', {
      tokenAddress,
      contractAddress,
      amount,
      amountWei: amountWei.toString(),
      address,
      walletAddress,
      wagmiAddress,
      wagmiConnected,
      chainId,
      targetChainId,
      isConnected,
    });

    try {
      // Always reset before attempting transaction to clear any previous errors
      console.log('[useFactoryStaking] Resetting writeContract hook state before approve...');
      reset();
      // Wait a bit for reset to take effect
      await new Promise(resolve => setTimeout(resolve, 200));

      // Get current chain ID - try multiple sources
      let currentChainId = chainId;
      if (!currentChainId && connector) {
        try {
          currentChainId = await connector.getChainId();
        } catch (e) {
          console.warn('[useFactoryStaking] Could not get chainId from connector');
        }
      }

      // Check if we need to switch chains - DO THIS FIRST before any connector operations
      if (targetChainId && currentChainId !== targetChainId) {
        console.log(`[useFactoryStaking] Current chain (${currentChainId}) doesn't match required chain (${targetChainId}). Switching...`);
        try {
          await switchChain(config, { chainId: targetChainId });
          await new Promise(resolve => setTimeout(resolve, 2000));
          console.log(`[useFactoryStaking] Successfully switched to chain ${targetChainId}`);
        } catch (switchError: any) {
          console.error('[useFactoryStaking] Failed to switch chain:', switchError);
          
          if (switchError?.code === 4001 || switchError?.message?.toLowerCase().includes('user rejected')) {
            throw new Error('Chain switch was rejected. Please switch to the correct network manually and try again.');
          }
          
          if (switchError?.code === 4902) {
            throw new Error(`Please add chain ${targetChainId} to your wallet and try again.`);
          }
          
          console.warn('[useFactoryStaking] Chain switch failed, but continuing in case user switched manually');
        }
      }

      // Wait a bit for connector to be ready after chain switch
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify connector is available and ready
      if (!connector) {
        console.error('[useFactoryStaking] No connector available for approval');
        throw new Error('Wallet connector is not available. Please ensure your wallet is properly connected and try again.');
      }

      // Verify wagmi shows wallet is connected
      if (!wagmiConnected && !walletAddress) {
        console.error('[useFactoryStaking] Wallet not connected for approval');
        throw new Error('Wallet is not connected. Please connect your wallet and try again.');
      }

      // Log connector info
      console.log('[useFactoryStaking] Connector ready for approval:', {
        connectorId: connector.id,
        connectorName: connector.name,
        chainId,
        address,
      });

      // Verify connector client can be obtained
      try {
        const connectorClient = await getConnectorClient(config, { connector });
        console.log('[useFactoryStaking] Connector client obtained for approval');
      } catch (connectorError: any) {
        console.error('[useFactoryStaking] Failed to get connector client for approval:', connectorError);
        throw new Error('Unable to communicate with your wallet. Please disconnect and reconnect your wallet.');
      }

      // Call writeContract for token approval
      console.log('[useFactoryStaking] Calling writeContract for approve...', {
        tokenAddress,
        contractAddress,
        amountWei: amountWei.toString(),
      });

      let hash: string | undefined;

      try {
        hash = await writeContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [contractAddress, amountWei],
        });
      } catch (writeErr: any) {
        console.error('[useFactoryStaking] approve writeContract threw error:', writeErr);

        // Handle specific errors
        if (writeErr?.message?.includes('User rejected') ||
            writeErr?.message?.includes('denied') ||
            writeErr?.code === 4001) {
          throw new Error('Approval was rejected in your wallet. Please try again.');
        }

        if (writeErr?.message?.includes('getChainId') ||
            writeErr?.message?.includes('connector')) {
          throw new Error('Wallet connection error. Please disconnect your wallet, refresh the page, reconnect, and try again.');
        }

        // Re-throw other errors
        throw writeErr;
      }

      console.log('[useFactoryStaking] approve writeContract returned:', hash);

      // In wagmi v2, writeContract should return the hash directly
      // But also check the hook's data property as fallback
      // Wait a bit for txHash to be set if hash is not immediately available
      let finalHash = hash || txHash;

      if (!finalHash) {
        // Wait up to 10 seconds for txHash to be set in the hook
        // This gives time for the wallet to prompt and user to confirm
        console.log('[useFactoryStaking] Waiting for transaction hash...', {
          initialHash: hash,
          initialTxHash: txHash,
          isPending,
          isError,
          writeError: writeError?.message,
        });

        for (let i = 0; i < 100; i++) {
          await new Promise(resolve => setTimeout(resolve, 100));

          // Check if hash appeared in the hook's state
          if (txHash) {
            finalHash = txHash;
            console.log('[useFactoryStaking] Transaction hash found in hook state:', finalHash);
            break;
          }

          // Also check if isPending became true (transaction submitted)
          if (isPending) {
            console.log('[useFactoryStaking] Transaction is pending, continuing to wait for hash...');
            // Continue waiting for hash
          }

          // Check if there's an error (but don't throw immediately - might be transient)
          if (isError && error) {
            const errorMsg = error?.message || '';
            // Only throw if it's not a connector error (those might be transient)
            if (!errorMsg.includes('getChainId') && !errorMsg.includes('connector') && !errorMsg.includes('connection.connector')) {
              console.error('[useFactoryStaking] Error detected while waiting for hash:', error);
              throw error;
            } else {
              console.warn('[useFactoryStaking] Connector error detected, continuing to wait...', error);
            }
          }
        }
      }

      console.log('[useFactoryStaking] approve transaction hash:', finalHash, {
        hash,
        txHash,
        isPending,
        isError,
        error,
        isSuccess,
        writeError: writeError?.message,
      });

      if (!finalHash) {
        console.error('[useFactoryStaking] approve: No transaction hash returned after waiting', {
          hash,
          txHash,
          isPending,
          isError,
          error,
          isSuccess,
          writeError: writeError?.message,
        });

        // Check if there's an error that wasn't thrown
        if (isError && error) {
          const errorMsg = error?.message || '';
          if (errorMsg.includes('getChainId') || errorMsg.includes('connector') || errorMsg.includes('connection.connector')) {
            throw new Error('Wallet connection issue. Please disconnect and reconnect your wallet, or switch to the correct network.');
          }
          throw error;
        }

        // If we had a writeError but no hash, throw that error
        if (writeError) {
          const errorMsg = writeError?.message || '';
          if (errorMsg.includes('getChainId') || errorMsg.includes('connector') || errorMsg.includes('connection.connector')) {
            throw new Error('Wallet connection issue. Please disconnect and reconnect your wallet, or switch to the correct network.');
          }
          throw writeError;
        }

        throw new Error('Approval transaction was not submitted. Please check your wallet and try again.');
      }

      return finalHash;
    } catch (error: any) {
      console.error('[useFactoryStaking] approve error:', error);

      // Handle user rejection
      if (error?.code === 4001 ||
        error?.message?.toLowerCase().includes('user rejected') ||
        error?.message?.toLowerCase().includes('user denied') ||
        error?.message?.toLowerCase().includes('rejected') ||
        error?.message?.toLowerCase().includes('denied')) {
        throw new Error('Transaction was rejected. Please try again when ready.');
      }

      // Provide more helpful error message
      if (error?.message?.includes('getChainId') || error?.message?.includes('connector')) {
        throw new Error('Wallet connection issue. Please disconnect and reconnect your wallet, or switch to the correct network.');
      }

      if (error?.message?.toLowerCase().includes('not connected') || error?.message?.toLowerCase().includes('no account')) {
        throw new Error('Wallet not connected. Please ensure your wallet is connected and try again.');
      }

      // Re-throw with original error message if it's informative
      throw error;
    }
  };

  const needsApproval = (poolId: bigint | number, amount: string): boolean => {
    if (!allowanceData) return true;

    // Validate amount is a valid string
    if (!amount || typeof amount !== 'string' || amount.trim() === '') {
      console.warn('[useFactoryStaking] needsApproval called with invalid amount:', amount);
      return true; // If amount is invalid, assume approval is needed
    }

    try {
      const amountWei = parseUnits(amount, decimals);
      return allowanceData < amountWei;
    } catch (error) {
      console.error('[useFactoryStaking] Error parsing amount in needsApproval:', error, { amount, decimals });
      return true; // If parsing fails, assume approval is needed
    }
  };

  const refetch = () => {
    refetchPoolIds();
    refetchPoolInfo();
    refetchUserInfo();
    refetchPending();
    refetchAllowance();
  };

  // Parse pool info
  const poolInfo: FactoryPoolInfo | null = poolInfoData
    ? {
      config: poolInfoData[0] as FactoryPoolConfig,
      state: poolInfoData[1] as FactoryPoolState,
    }
    : null;

  // Parse user info
  const userInfo: FactoryUserInfo | null = userInfoData
    ? {
      amount: userInfoData[0] as bigint,
      rewardDebt: userInfoData[1] as bigint,
      stakeTime: userInfoData[2] as bigint,
      pending: userInfoData[3] as bigint,
    }
    : null;

  return {
    poolInfo,
    userInfo,
    pendingReward: pendingRewardData as bigint | null,
    allPoolIds: allPoolIdsData as bigint[] | null,
    isLoading: isWaiting,
    isPending,
    isSuccess,
    isError,
    error: error as Error | null,
    createPoolTxHash: txHash || null,
    depositTxHash: txHash || null,
    withdrawTxHash: txHash || null,
    claimTxHash: txHash || null,
    fundPoolTxHash: txHash || null,
    createPool,
    deposit,
    withdraw,
    claim,
    fundPool,
    updatePoolConfig,
    authorizeAdmin,
    revokeAdmin,
    approve,
    allowance: allowanceData as bigint | null,
    needsApproval,
    refetch,
  };
}
