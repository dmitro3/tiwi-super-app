/**
 * PancakeSwap Router Adapter
 * 
 * Implements SwapRouter interface for PancakeSwap V2.
 * Supports BNB Chain (56) primarily, with fallback support for other EVM chains.
 */

import { createPublicClient, http, type Address, getAddress } from 'viem';
import { BaseRouter } from '../base';
import { toHumanReadable } from '../transformers/amount-transformer';
import { QUOTE_EXPIRATION_SECONDS } from '../constants';
import type { RouterParams, RouterRoute, RouteStep } from '../types';
import { getGasEstimationService } from '@/lib/backend/services/gas-estimation-service';
// Import tiwi-test utilities
import { PANCAKESWAP_V2_FACTORY, PANCAKESWAP_V2_ROUTER, WETH_ADDRESSES } from '@/lib/backend/utils/pancakeswap-constants';
import { getCachedClient, fastRpcCall } from '@/lib/backend/utils/pancakeswap-optimization';
import { getPairAddress, getPairReserves, verifySwapPath, verifyPairExists } from '@/lib/backend/utils/pancakeswap-pairs';
import { findBestRoute, detectFeeOnTransfer, calculateDynamicSlippage } from '@/lib/backend/utils/pancakeswap-router';
import { getChainConfig } from '@/lib/backend/utils/chain-config';

// Router ABI (PancakeSwap V2 Router02)
const ROUTER_ABI = [
  {
    inputs: [
      { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
      { internalType: 'address[]', name: 'path', type: 'address[]' },
    ],
    name: 'getAmountsOut',
    outputs: [{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

/**
 * PancakeSwap Router Adapter
 */
export class PancakeSwapAdapter extends BaseRouter {
  name = 'pancakeswap';
  displayName = 'PancakeSwap';
  
  /**
   * Get router priority (lower = higher priority)
   * PancakeSwap is priority 5 (after LiFi, before Uniswap for BNB Chain)
   */
  getPriority(): number {
    return 5;
  }
  
  /**
   * Get supported chains
   * PancakeSwap primarily supports BNB Chain, but can work on other EVM chains
   */
  async getSupportedChains(): Promise<number[]> {
    return Object.keys(PANCAKESWAP_V2_ROUTER).map(id => parseInt(id, 10));
  }
  
  /**
   * Check if router supports a specific chain
   */
  async supportsChain(chainId: number): Promise<boolean> {
    return chainId in PANCAKESWAP_V2_ROUTER;
  }
  
  /**
   * PancakeSwap only supports same-chain swaps (no cross-chain)
   */
  supportsCrossChain(): boolean {
    return false;
  }
  
  /**
   * Get route from PancakeSwap
   * Matches tiwi-test getPancakeSwapV2Quote implementation exactly
   */
  async getRoute(params: RouterParams): Promise<RouterRoute | null> {
    try {
      console.log('[PancakeSwapAdapter] Starting route request:', {
        fromToken: params.fromToken,
        toToken: params.toToken,
        fromAmount: params.fromAmount,
        fromChainId: params.fromChainId
      });

      // Validate parameters
      if (!params.fromChainId || !params.toChainId || !params.fromToken || !params.toToken || !params.fromAmount) {
        throw new Error('Missing required parameters');
      }
      
      // Ensure same chain (PancakeSwap doesn't support cross-chain)
      const fromChainId = typeof params.fromChainId === 'number' 
        ? params.fromChainId 
        : parseInt(String(params.fromChainId), 10);
      const toChainId = typeof params.toChainId === 'number'
        ? params.toChainId
        : parseInt(String(params.toChainId), 10);
      
      if (fromChainId !== toChainId) {
        return null; // Cross-chain not supported
      }
      
      const chainId = fromChainId;
      const routerAddress = PANCAKESWAP_V2_ROUTER[chainId];
      if (!routerAddress) {
        console.warn(`[PancakeSwapAdapter] Chain ${chainId} not supported by PancakeSwap V2`);
        return null;
      }

      const chain = getChainConfig(chainId);
      if (!chain) {
        console.warn(`[PancakeSwapAdapter] Chain ${chainId} not configured`);
        return null;
      }

      // Convert amount to BigInt once at the start
      const amountInBigInt = BigInt(params.fromAmount);
      const tokenIn = getAddress(params.fromToken);
      const tokenOut = getAddress(params.toToken);

      // Try advanced routing first (graph-based)
      try {
        const publicClient = createPublicClient({
          chain,
          transport: http(),
        });

        console.log('[PancakeSwapAdapter] Attempting advanced graph-based routing...');
        const route = await findBestRoute(tokenIn, tokenOut, amountInBigInt, chainId);
        
        if (route && route.expectedOutput > BigInt(0)) {
          // Detect fee-on-transfer
          const isFeeOnTransfer = await detectFeeOnTransfer(tokenIn, chainId, publicClient);
          
          // Calculate dynamic slippage
          const slippage = calculateDynamicSlippage(
            route.priceImpact,
            isFeeOnTransfer,
            route.liquidity < BigInt(1000000) // Low liquidity threshold
          );

          const originalTokenIn = getAddress(params.fromToken);
          const originalTokenOut = getAddress(params.toToken);

          console.log('[PancakeSwapAdapter] Advanced routing found route:', {
            path: route.path.map(addr => addr.slice(0, 6) + '...' + addr.slice(-4)).join(' -> '),
            expectedOutput: route.expectedOutput.toString(),
            priceImpact: route.priceImpact,
            slippage,
            isFeeOnTransfer
          });

          // Normalize to RouterRoute format
          return this.normalizeRoute(
            chainId,
            chainId,
            params.fromToken,
            params.toToken,
            params.fromAmount,
            route.expectedOutput.toString(),
            params.fromDecimals || 18,
            params.toDecimals || 18,
            route.path,
            route.priceImpact,
            slippage,
            '0',
            '0',
            routerAddress,
            originalTokenIn,
            originalTokenOut,
            isFeeOnTransfer
          );
        }
      } catch (advancedError) {
        console.warn('[PancakeSwapAdapter] Advanced routing failed, falling back to simple routing:', advancedError);
      }

      // Fallback to original simple routing logic
      // Convert native tokens to WETH
      const tokenInWETH = this.convertToWETH(params.fromToken, chainId);
      const tokenOutWETH = this.convertToWETH(params.toToken, chainId);
      
      console.log('[PancakeSwapAdapter] Token conversion:', {
        originalTokenIn: params.fromToken,
        originalTokenOut: params.toToken,
        tokenInWETH,
        tokenOutWETH,
        wethAddress: WETH_ADDRESSES[chainId]
      });

      // Helper function to check if a pair has sufficient reserves for a swap
      const checkPairReserves = async (tokenA: Address, tokenB: Address, amountIn: bigint): Promise<boolean> => {
        try {
          const reserves = await getPairReserves(tokenA, tokenB, chainId);
          if (!reserves) return false;
          
          // Check if reserves are sufficient (at least 2x the swap amount to avoid "K" errors)
          const minReserve = amountIn * BigInt(2);
          return reserves.reserve0 >= minReserve || reserves.reserve1 >= minReserve;
        } catch {
          return false;
        }
      };

      // Try multiple path strategies
      const wethAddress = WETH_ADDRESSES[chainId];
      if (!wethAddress) {
        return null;
      }

      // OPTIMIZED: Check all pairs in parallel using multicall (no retries, no delays)
      const isTokenInWETH = tokenInWETH.toLowerCase() === wethAddress.toLowerCase();
      const isTokenOutWETH = tokenOutWETH.toLowerCase() === wethAddress.toLowerCase();
      
      // Build all pair checks to run in parallel
      const pairChecks: Promise<Address | null>[] = [];
      
      // Strategy 1: Direct pair (check both orders in parallel)
      pairChecks.push(getPairAddress(tokenInWETH, tokenOutWETH, chainId));
      pairChecks.push(getPairAddress(tokenOutWETH, tokenInWETH, chainId));
      
      // Strategy 2: Through WETH (if not already WETH)
      let wethPair1: Address | null = null;
      let wethPair2: Address | null = null;
      
      if (!isTokenInWETH && !isTokenOutWETH) {
        pairChecks.push(
          getPairAddress(tokenInWETH, wethAddress, chainId).then(addr => { wethPair1 = addr; return addr; })
        );
        pairChecks.push(
          getPairAddress(wethAddress, tokenInWETH, chainId).then(addr => { if (!wethPair1) wethPair1 = addr; return addr; })
        );
        pairChecks.push(
          getPairAddress(wethAddress, tokenOutWETH, chainId).then(addr => { wethPair2 = addr; return addr; })
        );
        pairChecks.push(
          getPairAddress(tokenOutWETH, wethAddress, chainId).then(addr => { if (!wethPair2) wethPair2 = addr; return addr; })
        );
      }
      
      // Execute all pair checks in parallel (no delays, no retries)
      const [directPair1, directPair2, ...wethResults] = await Promise.all(pairChecks);
      const directPair = directPair1 || directPair2;
      
      console.log('[PancakeSwapAdapter] Parallel pair check results:', {
        direct: !!directPair,
        weth: !!(wethPair1 && wethPair2)
      });
      
      // Strategy 3: Try through USDT/USDC if available (parallel check)
      let stablecoinPath: Address[] | null = null;
      
      const stablecoinAddresses: Address[] = [];
      if (chainId === 56) {
        stablecoinAddresses.push(getAddress('0x55d398326f99059fF775485246999027B3197955')); // USDT
        stablecoinAddresses.push(getAddress('0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d')); // USDC
      } else if (chainId === 1) {
        stablecoinAddresses.push(getAddress('0xdAC17F958D2ee523a2206206994597C13D831ec7')); // USDT
        stablecoinAddresses.push(getAddress('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48')); // USDC
      } else if (chainId === 137) {
        stablecoinAddresses.push(getAddress('0xc2132D05D31c914a87C6611C10748AEb04B58e8F')); // USDT
        stablecoinAddresses.push(getAddress('0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174')); // USDC
      }
      
      // Check stablecoin paths in parallel if needed
      if (!directPair && (!wethPair1 || !wethPair2) && stablecoinAddresses.length > 0) {
        const stablecoinChecks = stablecoinAddresses
          .filter(sc => sc.toLowerCase() !== tokenInWETH.toLowerCase() && sc.toLowerCase() !== tokenOutWETH.toLowerCase())
          .map(async (stablecoin) => {
            const [pair1, pair2] = await Promise.all([
              getPairAddress(tokenInWETH, stablecoin, chainId),
              getPairAddress(stablecoin, tokenOutWETH, chainId),
            ]);
            return pair1 && pair2 ? [tokenInWETH, stablecoin, tokenOutWETH] as Address[] : null;
          });
        
        const stablecoinResults = await Promise.all(stablecoinChecks);
        stablecoinPath = stablecoinResults.find(path => path !== null) || null;
      }
      
      // Choose the best path
      let path: Address[];
      let needsPairCreation = false;
      const missingPairs: Array<{ tokenA: Address; tokenB: Address }> = [];
      
      if (directPair) {
        // Direct pair exists - check reserves if possible
        const hasReserves = await checkPairReserves(tokenInWETH, tokenOutWETH, amountInBigInt);
        if (hasReserves || directPair) { // Use direct pair even if reserve check fails (might be RPC issue)
          path = [tokenInWETH, tokenOutWETH];
          console.log('[PancakeSwapAdapter] Using direct path');
        } else {
          // Direct pair exists but might have low reserves, try WETH path
          if (wethPair1 && wethPair2) {
            path = [tokenInWETH, wethAddress, tokenOutWETH];
            console.log('[PancakeSwapAdapter] Direct pair has low reserves, using WETH path');
          } else {
            path = [tokenInWETH, tokenOutWETH]; // Use direct anyway
          }
        }
      } else if (wethPair1 && wethPair2) {
        // WETH routing available
        path = [tokenInWETH, wethAddress, tokenOutWETH];
        console.log('[PancakeSwapAdapter] Using WETH routing path');
      } else if (stablecoinPath) {
        // Stablecoin routing available
        path = stablecoinPath;
        console.log('[PancakeSwapAdapter] Using stablecoin routing path');
      } else {
        // No path found - track missing pairs
        if (isTokenInWETH || isTokenOutWETH) {
          missingPairs.push({ tokenA: tokenInWETH, tokenB: tokenOutWETH });
        } else {
          if (!wethPair1) {
            missingPairs.push({ tokenA: tokenInWETH, tokenB: wethAddress });
          }
          if (!wethPair2) {
            missingPairs.push({ tokenA: wethAddress, tokenB: tokenOutWETH });
          }
        }
        needsPairCreation = true;
        // Still try to get a quote - pairs can be created
        path = wethPair1 && !wethPair2 
          ? [tokenInWETH, wethAddress, tokenOutWETH] 
          : !wethPair1 && wethPair2
          ? [tokenInWETH, wethAddress, tokenOutWETH]
          : [tokenInWETH, tokenOutWETH];
        console.log('[PancakeSwapAdapter] No complete path found, using best available path');
      }

      const publicClient = getCachedClient(chainId);

      // Ensure all addresses in path are properly checksummed
      const checksummedPath = path.map(addr => getAddress(addr));
      const checksummedRouter = getAddress(routerAddress);
      
      console.log('[PancakeSwapAdapter] Final path for quote:', {
        path: checksummedPath,
        routerAddress: checksummedRouter,
        factoryAddress: PANCAKESWAP_V2_FACTORY[chainId],
        amountIn: params.fromAmount,
        needsPairCreation
      });

      // Get quote from router - try multiple times with better error handling
      // For low liquidity tokens, we need to try progressively smaller amounts
      let amounts: bigint[] | null = null;
      let lastError: any = null;
      
      // OPTIMIZED: Try getAmountsOut with fast timeout and parallel test amounts
      const tryGetAmountsOut = async (testAmount: bigint): Promise<bigint[] | null> => {
        try {
          const result = await fastRpcCall(async () => {
            return await publicClient.readContract({
              address: checksummedRouter,
              abi: ROUTER_ABI,
              functionName: 'getAmountsOut',
              args: [testAmount, checksummedPath],
            }) as bigint[];
          }, 1000); // 1s timeout for quotes
          
          if (result && result.length > 0 && result[result.length - 1] > BigInt(0)) {
            return result;
          }
          return null;
        } catch (error: any) {
          const errorMsg = error?.message || error?.toString() || '';
          if (errorMsg.includes('Pancake: K') || errorMsg.includes('PancakeSwap: K') || 
              errorMsg.includes('constant product') || errorMsg.includes('K:') ||
              errorMsg.includes('timeout')) {
            return null;
          }
          throw error;
        }
      };
      
      // Try full amount first with fast timeout
      try {
        amounts = await tryGetAmountsOut(amountInBigInt);
      } catch (error: any) {
        lastError = error;
      }
      
      // If failed, try smaller amounts in PARALLEL (not sequential)
      if (!amounts || (amounts.length > 0 && amounts[amounts.length - 1] === BigInt(0))) {
        const testAmounts = [
          amountInBigInt / BigInt(2),
          amountInBigInt / BigInt(10),
          amountInBigInt / BigInt(100),
          BigInt(10 ** 18),
        ].filter(amt => amt > BigInt(0));
        
        // Try all test amounts in parallel
        const testResults = await Promise.allSettled(
          testAmounts.map(testAmount => tryGetAmountsOut(testAmount))
        );
        
        // Find first successful result
        for (let i = 0; i < testResults.length; i++) {
          const result = testResults[i];
          if (result.status === 'fulfilled' && result.value) {
            const testAmount = testAmounts[i];
            const testAmountsResult = result.value;
            const testAmountOut = testAmountsResult[testAmountsResult.length - 1];
            const ratio = amountInBigInt / testAmount;
            
            let scaleFactor = BigInt(100);
            if (ratio > BigInt(100)) scaleFactor = BigInt(75);
            else if (ratio > BigInt(10)) scaleFactor = BigInt(90);
            
            const estimatedAmountOut = (testAmountOut * ratio * scaleFactor) / BigInt(100);
            amounts = [amountInBigInt];
            for (let j = 0; j < checksummedPath.length - 1; j++) {
              if (j === checksummedPath.length - 2) {
                amounts.push(estimatedAmountOut);
              } else {
                const intermediateOut = testAmountsResult[j + 1];
                amounts.push((intermediateOut * ratio * scaleFactor) / BigInt(100));
              }
            }
            break;
          }
        }
      }

      // If we still don't have amounts, check if pairs exist and try to estimate from reserves
      if (!amounts || amounts.length === 0 || (amounts[amounts.length - 1] === BigInt(0) && !needsPairCreation)) {
        // Check if pairs actually exist (they might exist but getAmountsOut failed due to low liquidity)
        // Verify all pairs in the path exist
        const pathPairsExist = await verifySwapPath(checksummedPath, chainId);
        
        if (!amounts && pathPairsExist.valid) {
          // All pairs exist but quote failed - likely very low liquidity
          // Try to get reserves to estimate a conservative quote
          console.warn('[PancakeSwapAdapter] Pairs exist but getAmountsOut failed. Checking reserves for estimate...');
          
          try {
            // Check reserves of the first pair in the path
            const firstPairReserves = await getPairReserves(checksummedPath[0], checksummedPath[1], chainId);
            if (firstPairReserves) {
              // Estimate based on reserves - use a very conservative ratio
              const reserveIn = firstPairReserves.reserve0 > firstPairReserves.reserve1 
                ? firstPairReserves.reserve0 
                : firstPairReserves.reserve1;
              const reserveOut = firstPairReserves.reserve0 > firstPairReserves.reserve1 
                ? firstPairReserves.reserve1 
                : firstPairReserves.reserve0;
              
              if (reserveIn > BigInt(0) && reserveOut > BigInt(0)) {
                // Use constant product formula estimate: amountOut ≈ (amountIn * reserveOut) / reserveIn
                // But apply 50% reduction for price impact and slippage
                const estimatedOut = (amountInBigInt * reserveOut * BigInt(50)) / (reserveIn * BigInt(100));
                
                if (estimatedOut > BigInt(0)) {
                  amounts = [amountInBigInt];
                  for (let i = 0; i < checksummedPath.length - 1; i++) {
                    if (i === checksummedPath.length - 2) {
                      amounts.push(estimatedOut);
                    } else {
                      // For multi-hop, estimate intermediate amounts
                      amounts.push(amountInBigInt / BigInt(2)); // Rough estimate
                    }
                  }
                  console.log('[PancakeSwapAdapter] Estimated quote from reserves:', {
                    reserveIn: reserveIn.toString(),
                    reserveOut: reserveOut.toString(),
                    estimatedOut: estimatedOut.toString()
                  });
                }
              }
            }
          } catch (reserveError) {
            console.warn('[PancakeSwapAdapter] Could not get reserves for estimation:', reserveError);
          }
          
          // If still no amounts, use very conservative estimate
          if (!amounts) {
            const conservativeEstimate = amountInBigInt / BigInt(1000);
            console.warn('[PancakeSwapAdapter] Using very conservative estimate (1:1000 ratio)');
            const originalTokenIn = getAddress(params.fromToken);
            const originalTokenOut = getAddress(params.toToken);
            
            return this.normalizeRoute(
              chainId,
              chainId,
              params.fromToken,
              params.toToken,
              params.fromAmount,
              conservativeEstimate > BigInt(0) ? conservativeEstimate.toString() : '1',
              params.fromDecimals || 18,
              params.toDecimals || 18,
              checksummedPath,
              0,
              params.slippage || 0.5,
              '0',
              '0',
              routerAddress,
              originalTokenIn,
              originalTokenOut
            );
          }
        }
        
        // If getAmountsOut returns 0, it means pairs don't exist or have no liquidity
        // But we should double-check by verifying pairs exist with retries
        if (needsPairCreation) {
          // Verify pairs one more time with retries (in case of RPC delay)
          let pairsActuallyExist = false;
          for (const pair of missingPairs) {
            const verified = await verifyPairExists(pair.tokenA, pair.tokenB, chainId, 3, 2000);
            if (verified) {
              pairsActuallyExist = true;
              break;
            }
          }
          
          // If pairs actually exist but quote is 0, it might be insufficient liquidity
          // Still return needsPairCreation = false since pairs exist
          if (pairsActuallyExist) {
            console.log('[PancakeSwapAdapter] Pairs exist but quote is 0 - might be insufficient liquidity');
            const originalTokenIn = getAddress(params.fromToken);
            const originalTokenOut = getAddress(params.toToken);
            
            // Return conservative estimate instead of 0
            const conservativeEstimate = BigInt(params.fromAmount) / BigInt(1000);
            return this.normalizeRoute(
              chainId,
              chainId,
              params.fromToken,
              params.toToken,
              params.fromAmount,
              conservativeEstimate > BigInt(0) ? conservativeEstimate.toString() : '1',
              params.fromDecimals || 18,
              params.toDecimals || 18,
              checksummedPath,
              0,
              params.slippage || 0.5,
              '0',
              '0',
              routerAddress,
              originalTokenIn,
              originalTokenOut
            );
          }
          
          // Pairs don't exist - return quote for pair creation
          const originalTokenIn = getAddress(params.fromToken);
          const originalTokenOut = getAddress(params.toToken);
          
          console.log('[PancakeSwapAdapter] Creating quote for pair creation with original addresses:', {
            tokenIn: originalTokenIn,
            tokenOut: originalTokenOut,
            path: checksummedPath
          });
          
          // Return conservative estimate even if pairs don't exist
          const conservativeEstimate = BigInt(params.fromAmount) / BigInt(1000);
          return this.normalizeRoute(
            chainId,
            chainId,
            params.fromToken,
            params.toToken,
            params.fromAmount,
            conservativeEstimate > BigInt(0) ? conservativeEstimate.toString() : '1',
            params.fromDecimals || 18,
            params.toDecimals || 18,
            checksummedPath,
            0,
            params.slippage || 0.5,
            '0',
            '0',
            routerAddress,
            originalTokenIn,
            originalTokenOut
          );
        }
        
        // If still no amounts after all attempts, return null
        if (!amounts || amounts.length === 0) {
          console.warn('[PancakeSwapAdapter] All quote attempts failed, returning null');
          return null;
        }
      }
      
      // If we have amounts (even if estimated), return the quote
      if (amounts && amounts.length > 0) {
        const amountOut = amounts[amounts.length - 1];
        const originalTokenIn = getAddress(params.fromToken);
        const originalTokenOut = getAddress(params.toToken);
        
        // Always return a quote, even if amountOut is very small (it's better than nothing)
        const finalAmountOut = amountOut > BigInt(0) ? amountOut : BigInt(1); // At least 1 wei
        
        console.log('[PancakeSwapAdapter] Returning quote:', {
          tokenIn: originalTokenIn,
          tokenOut: originalTokenOut,
          amountOut: finalAmountOut.toString(),
          path: checksummedPath,
          needsPairCreation: false,
          pairsExist: true,
        });

        // Calculate price impact (simplified)
        const inputAmount = parseFloat(amountInBigInt.toString()) / 1e18;
        const outputAmount = parseFloat(finalAmountOut.toString()) / 1e18;
        const priceImpact = inputAmount > 0 ? Math.abs((inputAmount - outputAmount) / inputAmount) * 100 : 0;

        return this.normalizeRoute(
          chainId,
          chainId,
          params.fromToken,
          params.toToken,
          params.fromAmount,
          finalAmountOut.toString(),
          params.fromDecimals || 18,
          params.toDecimals || 18,
          checksummedPath,
          Math.min(priceImpact, 100),
          params.slippage || 0.5,
          '0',
          '0',
          routerAddress,
          originalTokenIn,
          originalTokenOut
        );
      }
      
      // If we get here, something went wrong but we don't have a clear error
      console.warn('[PancakeSwapAdapter] Unable to get quote - amounts:', amounts);
      return null;
    } catch (error: any) {
      console.error('[PancakeSwapAdapter] Unexpected error:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[PancakeSwapAdapter] Error details:', {
        fromToken: params.fromToken,
        toToken: params.toToken,
        chainId: params.fromChainId,
        error: errorMsg
      });
      
      // If error indicates no route, return null (not an error)
      if (error?.message?.includes('INSUFFICIENT_OUTPUT_AMOUNT') || 
          error?.message?.includes('INSUFFICIENT_LIQUIDITY') ||
          error?.message?.includes('No route')) {
        return null;
      }
      
      throw error;
    }
  }

  
  /**
   * Convert native token address to WETH address
   * Matches tiwi-test convertToWETH implementation
   */
  private convertToWETH(tokenAddress: string, chainId: number): Address {
    if (
      tokenAddress === '0x0000000000000000000000000000000000000000' ||
      tokenAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
    ) {
      return WETH_ADDRESSES[chainId] || getAddress(tokenAddress);
    }
    return getAddress(tokenAddress);
  }
  
  /**
   * Normalize PancakeSwap quote to RouterRoute format
   */
  private normalizeRoute(
    fromChainId: number,
    toChainId: number,
    fromTokenAddress: string,
    toTokenAddress: string,
    fromAmount: string,
    toAmount: string,
    fromDecimals: number,
    toDecimals: number,
    path: Address[],
    priceImpact: number,
    slippage: number,
    gasEstimate: string = '0',
    gasUSD: string = '0',
    routerAddress: Address,
    originalTokenIn: string,
    originalTokenOut: string,
    isFeeOnTransfer?: boolean
  ): RouterRoute {
    // Debug logging
    console.log('[PancakeSwapAdapter.normalizeRoute] Converting amounts:', {
      fromAmount,
      fromDecimals,
      toAmount,
      toDecimals,
    });
    
    // Convert amounts to human-readable
    const fromAmountHuman = toHumanReadable(fromAmount, fromDecimals);
    const toAmountHuman = toHumanReadable(toAmount, toDecimals);
    
    // Debug logging
    console.log('[PancakeSwapAdapter.normalizeRoute] Converted amounts:', {
      fromAmountHuman,
      toAmountHuman,
    });
    
    // Calculate exchange rate
    const fromAmountNum = parseFloat(fromAmountHuman);
    const toAmountNum = parseFloat(toAmountHuman);
    const exchangeRate = fromAmountNum > 0 ? (toAmountNum / fromAmountNum).toFixed(6) : '0';
    
    // Build route steps
    const steps: RouteStep[] = [];
    for (let i = 0; i < path.length - 1; i++) {
      steps.push({
        type: 'swap',
        chainId: fromChainId,
        fromToken: {
          address: path[i],
          amount: i === 0 ? fromAmountHuman : '0', // Only first step has input
        },
        toToken: {
          address: path[i + 1],
          amount: i === path.length - 2 ? toAmountHuman : '0', // Only last step has output
        },
        protocol: 'PancakeSwap V2',
        description: `Swap ${path[i].slice(0, 6)}...${path[i].slice(-4)} → ${path[i + 1].slice(0, 6)}...${path[i + 1].slice(-4)}`,
      });
    }
    
    return {
      router: this.name,
      routeId: `pancakeswap-${fromChainId}-${Date.now()}`,
      fromToken: {
        chainId: fromChainId,
        address: fromTokenAddress,
        symbol: '', // Will be enriched by RouteService
        amount: fromAmountHuman,
        amountUSD: undefined, // Will be enriched by RouteService
        decimals: fromDecimals,
      },
      toToken: {
        chainId: toChainId,
        address: toTokenAddress,
        symbol: '', // Will be enriched by RouteService
        amount: toAmountHuman,
        amountUSD: undefined, // Will be enriched by RouteService
        decimals: toDecimals,
      },
      exchangeRate,
      priceImpact: priceImpact.toFixed(2),
      slippage: slippage.toFixed(2),
      fees: {
        protocol: '0', // V2 has no protocol fee (only LP fee)
        gas: gasEstimate, // Gas estimate from eth_estimateGas
        gasUSD: gasUSD, // Gas cost in USD
        tiwiProtocolFeeUSD: undefined, // Will be enriched by RouteService
        total: '0', // Will be enriched by RouteService
      },
      steps,
      estimatedTime: 0, // Same-chain swaps are instant
      expiresAt: Date.now() + (QUOTE_EXPIRATION_SECONDS * 1000),
      // Store raw router response data for simulation
      raw: {
        path: path.map(addr => addr.toLowerCase()), // Exact path array from router
        routerAddress: routerAddress.toLowerCase(),
        tokenIn: getAddress(originalTokenIn).toLowerCase(), // Original token address (before WETH conversion)
        tokenOut: getAddress(originalTokenOut).toLowerCase(), // Original token address (before WETH conversion)
        amountOut: toAmount, // Output amount in smallest units
        isFeeOnTransfer: isFeeOnTransfer || false, // Fee-on-transfer flag from detection
      },
    };
  }
}

