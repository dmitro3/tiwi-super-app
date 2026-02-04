/**
 * DEX Pair Query Utility
 * 
 * Queries DEX factories directly for pair existence.
 * Verifies pairs work with router.getAmountsOut.
 * Only uses DexScreener as fallback.
 */

import type { Address } from 'viem';
import { createPublicClient, http } from 'viem';
import { getSupportedDEXes, getFactoryAddress, getRouterAddress, ROUTER_ABI } from './dex-registry';
import { getRpcUrl as getCustomRpcUrl } from '@/lib/backend/utils/rpc-config';

/**
 * DEX Pair Info (verified with router.getAmountsOut)
 */
export interface DEXPairInfo {
  pairAddress: Address;
  dexId: string;
  tokenA: Address;
  tokenB: Address;
  verified: true;
  routerAddress: Address;
  outputAmount?: bigint; // Output amount from getAmountsOut verification
}

/**
 * Factory ABI (getPair function)
 */
const FACTORY_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'tokenA', type: 'address' },
      { internalType: 'address', name: 'tokenB', type: 'address' },
    ],
    name: 'getPair',
    outputs: [{ internalType: 'address', name: 'pair', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

/**
 * Get chain config for public client
 */
function getChain(chainId: number) {
  const { bsc, mainnet, polygon, optimism, arbitrum, base } = require('viem/chains');
  const chainMap: Record<number, any> = {
    1: mainnet,
    56: bsc,
    137: polygon,
    10: optimism,
    42161: arbitrum,
    8453: base,
  };
  return chainMap[chainId];
}

/**
 * Get RPC URL for chain
 */
function getRpcUrl(chainId: number): string {
  const customRpc = getCustomRpcUrl(chainId);
  if (customRpc) {
    return customRpc;
  }
  
  const rpcMap: Record<number, string> = {
    1: 'https://eth.llamarpc.com',
    56: 'https://bsc-dataseed.binance.org',
    137: 'https://polygon-rpc.com',
    10: 'https://mainnet.optimism.io',
    42161: 'https://arb1.arbitrum.io/rpc',
    8453: 'https://mainnet.base.org',
  };
  return rpcMap[chainId] || 'https://eth.llamarpc.com';
}

/**
 * Query DEX factory for pair and verify with router
 * 
 * @param tokenA First token address
 * @param tokenB Second token address
 * @param chainId Chain ID
 * @param dexId DexScreener dexId
 * @param testAmount Amount to test with (default: 1 wei)
 * @returns DEX pair info if valid, null if invalid
 */
export async function queryDEXPair(
  tokenA: Address,
  tokenB: Address,
  chainId: number,
  dexId: string,
  testAmount: bigint = BigInt(1)
): Promise<DEXPairInfo | null> {
  console.log(`[DEXPairQuery] ========================================`);
  console.log(`[DEXPairQuery] 🔍 QUERYING DEX PAIR`);
  console.log(`[DEXPairQuery] TokenA: ${tokenA}`);
  console.log(`[DEXPairQuery] TokenB: ${tokenB}`);
  console.log(`[DEXPairQuery] Chain: ${chainId}`);
  console.log(`[DEXPairQuery] DEX: ${dexId}`);
  console.log(`[DEXPairQuery] Test Amount: ${testAmount.toString()}`);
  
  // Get factory and router addresses
  const factoryAddress = getFactoryAddress(chainId, dexId);
  const routerAddress = getRouterAddress(chainId, dexId);
  
  if (!factoryAddress) {
    console.log(`[DEXPairQuery] ❌ No factory address found for ${dexId} on chain ${chainId}`);
    console.log(`[DEXPairQuery] ========================================\n`);
    return null;
  }
  
  if (!routerAddress) {
    console.log(`[DEXPairQuery] ❌ No router address found for ${dexId} on chain ${chainId}`);
    console.log(`[DEXPairQuery] ========================================\n`);
    return null;
  }
  
  console.log(`[DEXPairQuery] Factory: ${factoryAddress}`);
  console.log(`[DEXPairQuery] Router: ${routerAddress}`);
  
  // Get public client
  const chain = getChain(chainId);
  const rpcUrl = getRpcUrl(chainId);
  console.log(`[DEXPairQuery] RPC URL: ${rpcUrl}`);
  
  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });
  
  try {
    const startTime = Date.now();
    
    // Query factory.getPair (primary order)
    console.log(`[DEXPairQuery] 📡 Querying factory.getPair(${tokenA}, ${tokenB})...`);
    const pairAddress = await publicClient.readContract({
      address: factoryAddress,
      abi: FACTORY_ABI,
      functionName: 'getPair',
      args: [tokenA, tokenB],
    }) as Address;
    
    const queryTime = Date.now() - startTime;
    console.log(`[DEXPairQuery] ⏱️ Factory query took ${queryTime}ms`);
    console.log(`[DEXPairQuery] Pair Address (primary): ${pairAddress}`);
    
    let finalPairAddress: Address | null = null;
    
    // Check if pair exists
    if (pairAddress && pairAddress !== '0x0000000000000000000000000000000000000000') {
      finalPairAddress = pairAddress;
      console.log(`[DEXPairQuery] ✅ Pair found with primary order`);
    } else {
      // Try reverse order
      console.log(`[DEXPairQuery] 📡 Pair not found, trying reverse order...`);
      console.log(`[DEXPairQuery] Querying factory.getPair(${tokenB}, ${tokenA})...`);
      
      const reverseStartTime = Date.now();
      const reversePair = await publicClient.readContract({
        address: factoryAddress,
        abi: FACTORY_ABI,
        functionName: 'getPair',
        args: [tokenB, tokenA],
      }) as Address;
      
      const reverseTime = Date.now() - reverseStartTime;
      console.log(`[DEXPairQuery] ⏱️ Reverse factory query took ${reverseTime}ms`);
      console.log(`[DEXPairQuery] Pair Address (reverse): ${reversePair}`);
      
      if (reversePair && reversePair !== '0x0000000000000000000000000000000000000000') {
        finalPairAddress = reversePair;
        console.log(`[DEXPairQuery] ✅ Pair found with reverse order`);
      } else {
        console.log(`[DEXPairQuery] ❌ No pair found on ${dexId}`);
        console.log(`[DEXPairQuery] ========================================\n`);
        return null;
      }
    }
    
    // Verify pair works with router.getAmountsOut
    console.log(`[DEXPairQuery] 🔄 Verifying pair with router.getAmountsOut...`);
    console.log(`[DEXPairQuery] Path: [${tokenA}, ${tokenB}]`);
    console.log(`[DEXPairQuery] Amount In: ${testAmount.toString()}`);
    
    const verifyStartTime = Date.now();
    const verified = await verifyPairWithRouter(
      finalPairAddress!,
      tokenA,
      tokenB,
      chainId,
      dexId,
      routerAddress,
      publicClient,
      testAmount
    );
    const verifyTime = Date.now() - verifyStartTime;
    
    if (verified) {
      console.log(`[DEXPairQuery] ⏱️ Verification took ${verifyTime}ms`);
      console.log(`[DEXPairQuery] ✅ Pair verified! Output: ${verified.outputAmount?.toString() || 'unknown'}`);
      console.log(`[DEXPairQuery] ========================================\n`);
      
      return {
        pairAddress: finalPairAddress!,
        dexId,
        tokenA,
        tokenB,
        verified: true,
        routerAddress,
        outputAmount: verified.outputAmount,
      };
    } else {
      console.log(`[DEXPairQuery] ⏱️ Verification took ${verifyTime}ms`);
      console.log(`[DEXPairQuery] ❌ Pair verification failed (getAmountsOut returned 0 or error)`);
      console.log(`[DEXPairQuery] ========================================\n`);
      return null;
    }
  } catch (error: any) {
    console.error(`[DEXPairQuery] ❌ Error querying pair:`, error.message);
    console.error(`[DEXPairQuery] Stack:`, error.stack);
    console.log(`[DEXPairQuery] ========================================\n`);
    return null;
  }
}

/**
 * Verify pair works with router.getAmountsOut
 */
async function verifyPairWithRouter(
  pairAddress: Address,
  tokenA: Address,
  tokenB: Address,
  chainId: number,
  dexId: string,
  routerAddress: Address,
  publicClient: any,
  testAmount: bigint
): Promise<{ outputAmount?: bigint } | null> {
  try {
    const path = [tokenA, tokenB];

    const testAmounts = [
      testAmount,
      testAmount * BigInt(10),
      testAmount * BigInt(100),
      testAmount * BigInt(1000),
      BigInt(10 ** 6),
      BigInt(10 ** 9),
      BigInt(10 ** 12),
      BigInt(10 ** 15),
      BigInt(10 ** 18),
    ];
    
    const uniqueTestAmounts = Array.from(new Set(testAmounts.filter(a => a > BigInt(0))));
    
    for (const amount of uniqueTestAmounts) {
      try {
        console.log(`[DEXPairQuery]   Calling router.getAmountsOut(${amount.toString()}, [${path.join(', ')}])`);
        
        const amounts = await publicClient.readContract({
          address: routerAddress,
          abi: ROUTER_ABI,
          functionName: 'getAmountsOut',
          args: [amount, path],
        }) as bigint[];
        
        console.log(`[DEXPairQuery]   Router response:`, amounts?.map(a => a.toString()).join(' → '));
        
        // If we get a valid output amount > 0, pair works
        if (amounts && amounts.length === 2 && amounts[1] > BigInt(0)) {
          console.log(`[DEXPairQuery]   ✅ Output amount > 0: ${amounts[1].toString()}`);
          return { outputAmount: amounts[1] };
        }
      } catch (error: any) {
        const errorMsg = error?.message || error?.toString() || '';
        if (
          errorMsg.includes('K') ||
          errorMsg.includes('constant product') ||
          errorMsg.includes('insufficient') ||
          errorMsg.includes('INSUFFICIENT')
        ) {
          // Try another test amount
          continue;
        }
      }
    }
    
    console.log(`[DEXPairQuery]   ❌ Invalid output: 0`);
    return null;
  } catch (error: any) {
    console.error(`[DEXPairQuery]   ❌ Router verification error:`, error.message);
    return null;
  }
}

/**
 * Query all DEXes for a token pair with all intermediaries
 * 
 * @param token Token address
 * @param intermediaries Array of intermediary tokens
 * @param chainId Chain ID
 * @param testAmount Amount to test with (default: 1 wei)
 * @returns Array of verified DEX pairs
 */
export async function queryDEXPairsForToken(
  token: Address,
  intermediaries: Array<{ address: Address; symbol: string; priority: number; category: string }>,
  chainId: number,
  testAmount: bigint = BigInt(1)
): Promise<Array<DEXPairInfo & { intermediary: typeof intermediaries[0] }>> {
  console.log(`\n[DEXPairQuery] ========================================`);
  console.log(`[DEXPairQuery] 🎯 QUERYING DEX PAIRS FOR TOKEN`);
  console.log(`[DEXPairQuery] Token: ${token}`);
  console.log(`[DEXPairQuery] Chain: ${chainId}`);
  console.log(`[DEXPairQuery] Intermediaries: ${intermediaries.length} tokens`);
  console.log(`[DEXPairQuery] Test Amount: ${testAmount.toString()}`);
  intermediaries.forEach((i, idx) => {
    console.log(`[DEXPairQuery]   ${idx + 1}. ${i.symbol} (${i.address})`);
  });
  console.log(`[DEXPairQuery] ========================================\n`);
  
  const supportedDEXes = getSupportedDEXes(chainId);
  console.log(`[DEXPairQuery] Supported DEXes on chain ${chainId}: ${supportedDEXes.length}`);
  supportedDEXes.forEach((dex, idx) => {
    console.log(`[DEXPairQuery]   ${idx + 1}. ${dex.name} (${dex.dexId})`);
  });
  console.log(`[DEXPairQuery] Total queries to make: ${intermediaries.length * supportedDEXes.length}\n`);
  
  const results: Array<DEXPairInfo & { intermediary: typeof intermediaries[0] }> = [];
  
  // Query all intermediaries in parallel (for each DEX)
  const queries = intermediaries.flatMap((intermediary, interIdx) =>
    supportedDEXes.map(async (dex, dexIdx) => {
      const queryNum = interIdx * supportedDEXes.length + dexIdx + 1;
      const totalQueries = intermediaries.length * supportedDEXes.length;
      
      console.log(`[DEXPairQuery] [${queryNum}/${totalQueries}] Querying ${token.slice(0, 10)}.../${intermediary.symbol} on ${dex.dexId}...`);
      
      const pairInfo = await queryDEXPair(token, intermediary.address, chainId, dex.dexId, testAmount);
      
      if (pairInfo) {
        console.log(`[DEXPairQuery] [${queryNum}/${totalQueries}] ✅ Found pair: ${token.slice(0, 10)}.../${intermediary.symbol} on ${dex.dexId}`);
        return { ...pairInfo, intermediary };
      } else {
        console.log(`[DEXPairQuery] [${queryNum}/${totalQueries}] ❌ No pair: ${token.slice(0, 10)}.../${intermediary.symbol} on ${dex.dexId}`);
        return null;
      }
    })
  );
  
  console.log(`[DEXPairQuery] ⏳ Executing ${queries.length} queries in parallel...\n`);
  const pairResults = await Promise.all(queries);
  
  const validPairs = pairResults.filter((p): p is NonNullable<typeof p> => p !== null);
  
  console.log(`\n[DEXPairQuery] ========================================`);
  console.log(`[DEXPairQuery] ✅ QUERY COMPLETE`);
  console.log(`[DEXPairQuery] Valid pairs found: ${validPairs.length}/${queries.length}`);
  validPairs.forEach((pair, idx) => {
    console.log(`[DEXPairQuery]   ${idx + 1}. ${pair.intermediary.symbol} on ${pair.dexId} (${pair.pairAddress})`);
  });
  console.log(`[DEXPairQuery] ========================================\n`);
  
  return validPairs;
}




