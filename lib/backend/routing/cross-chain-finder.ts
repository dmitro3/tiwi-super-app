/**
 * Cross-Chain Route Finder
 * 
 * Finds routes for cross-chain swaps using:
 * 1. Same-chain route finder for source chain (to bridgeable token)
 * 2. LiFi for bridging
 * 3. Same-chain route finder for destination chain (from bridgeable token)
 * 
 * Bridgeable tokens (priority):
 * - WETH/ETH (most common)
 * - USDT
 * - USDC
 */

import type { Address } from 'viem';
import { getSameChainRouteFinder, type SameChainRoute } from './same-chain-finder';
import { getBridgeableTokens, getWrappedNativeToken } from './intermediaries';
import { getQuote, getRoutes } from '@lifi/sdk';
import { initializeBackendLiFiSDK } from '@/lib/backend/config/lifi-sdk-config';

// Initialize LiFi SDK config for backend
initializeBackendLiFiSDK();

/**
 * Cross-chain route
 */
export interface CrossChainRoute {
  sourceRoute: SameChainRoute; // Route on source chain
  bridge: {
    fromChain: number;
    toChain: number;
    fromToken: Address;
    toToken: Address;
    amountIn: bigint;
    amountOut: bigint;
    quote: any; // LiFi quote
  };
  destRoute: SameChainRoute; // Route on destination chain
  totalOutput: bigint;
  chainId: number; // Final chain ID
}

/**
 * Cross-Chain Route Finder
 */
export class CrossChainRouteFinder {
  private sameChainFinder = getSameChainRouteFinder();
  
  /**
   * Find cross-chain route
   * 
   * @param fromToken Source token address
   * @param toToken Destination token address
   * @param fromChainId Source chain ID
   * @param toChainId Destination chain ID
   * @param amountIn Input amount in smallest unit
   * @param recipient Recipient address (optional)
   * @returns Cross-chain route or null
   */
  async findRoute(
    fromToken: Address,
    toToken: Address,
    fromChainId: number,
    toChainId: number,
    amountIn: bigint,
    recipient?: Address,
    fromAddress?: Address // User's wallet address (for LiFi)
  ): Promise<CrossChainRoute | null> {
    console.log(`\n[CrossChainFinder] ========================================`);
    console.log(`[CrossChainFinder] 🌉 FINDING CROSS-CHAIN ROUTE`);
    console.log(`[CrossChainFinder] From: ${fromToken} on chain ${fromChainId}`);
    console.log(`[CrossChainFinder] To: ${toToken} on chain ${toChainId}`);
    console.log(`[CrossChainFinder] Amount In: ${amountIn.toString()}`);
    console.log(`[CrossChainFinder] Recipient: ${recipient || 'not provided'}`);
    console.log(`[CrossChainFinder] ========================================\n`);
    
    // Get bridgeable tokens (priority: native > stablecoins)
    const bridgeableTokens = getBridgeableTokens(fromChainId);
    console.log(`[CrossChainFinder] 📋 Bridgeable tokens on chain ${fromChainId}: ${bridgeableTokens.length} tokens`);
    bridgeableTokens.forEach((token, idx) => {
      console.log(`[CrossChainFinder]   ${idx + 1}. ${token}`);
    });
    console.log(`[CrossChainFinder] Will try each bridgeable token in order...\n`);
    
    // Try each bridgeable token
    for (let i = 0; i < bridgeableTokens.length; i++) {
      const bridgeToken = bridgeableTokens[i];
      console.log(`[CrossChainFinder] 🔄 Attempt ${i + 1}/${bridgeableTokens.length}: Trying bridgeable token ${bridgeToken}`);
      
      // Step 1: Find route on source chain: fromToken → bridgeToken
      console.log(`[CrossChainFinder] 📍 STEP 1: Finding route on source chain (${fromChainId})...`);
      console.log(`[CrossChainFinder]   From: ${fromToken} → To: ${bridgeToken}`);
      const sourceRoute = await this.sameChainFinder.findRoute(
        fromToken,
        bridgeToken,
        fromChainId,
        amountIn
      );
      
      if (!sourceRoute) {
        console.log(`[CrossChainFinder]   ❌ No route found on source chain to bridge token ${bridgeToken}`);
        console.log(`[CrossChainFinder]   Moving to next bridgeable token...\n`);
        continue;
      }
      
      console.log(`[CrossChainFinder]   ✅ Source route found!`);
      console.log(`[CrossChainFinder]   Path: ${sourceRoute.path.map(p => p.slice(0, 10) + '...').join(' → ')}`);
      console.log(`[CrossChainFinder]   Output: ${sourceRoute.outputAmount.toString()}`);
      
      // CRITICAL FIX: Extract actual output token from route
      // The route path tells us what token we actually get after the swap
      // This might be different from bridgeToken if route went through intermediaries
      const actualBridgeToken = sourceRoute.path[sourceRoute.path.length - 1];
      console.log(`[CrossChainFinder]   🔍 Extracted actual output token: ${actualBridgeToken}`);
      if (actualBridgeToken.toLowerCase() !== bridgeToken.toLowerCase()) {
        console.log(`[CrossChainFinder]   ⚠️ Note: Actual token differs from requested bridge token!`);
        console.log(`[CrossChainFinder]   Requested: ${bridgeToken}`);
        console.log(`[CrossChainFinder]   Actual: ${actualBridgeToken}`);
      }
      
      // Step 2: Find corresponding token on destination chain
      console.log(`[CrossChainFinder] 📍 STEP 2: Finding corresponding token on destination chain (${toChainId})...`);
      const destBridgeToken = this.findCorrespondingToken(
        actualBridgeToken, // Use actual token from route, not assumed bridgeToken
        fromChainId,
        toChainId
      );
      
      if (!destBridgeToken) {
        console.log(`[CrossChainFinder]   ❌ No corresponding token found on destination chain`);
        console.log(`[CrossChainFinder]   Moving to next bridgeable token...\n`);
        continue;
      }
      
      console.log(`[CrossChainFinder]   ✅ Corresponding token found: ${destBridgeToken}`);
      console.log(`[CrossChainFinder]   Mapping: ${actualBridgeToken} (chain ${fromChainId}) → ${destBridgeToken} (chain ${toChainId})`);
      
      // Step 3: Get LiFi bridge quote
      console.log(`[CrossChainFinder] 📍 STEP 3: Getting LiFi bridge quote...`);
      console.log(`[CrossChainFinder]   From: ${actualBridgeToken} on chain ${fromChainId}`);
      console.log(`[CrossChainFinder]   To: ${destBridgeToken} on chain ${toChainId}`);
      console.log(`[CrossChainFinder]   Amount: ${sourceRoute.outputAmount.toString()}`);
      console.log(`[CrossChainFinder]   📍 Getting LiFi quote with addresses:`);
      console.log(`[CrossChainFinder]     fromAddress: ${fromAddress || 'NOT PROVIDED ⚠️'}`);
      console.log(`[CrossChainFinder]     recipient: ${recipient || 'NOT PROVIDED ⚠️'}`);
      const bridgeQuote = await this.getLiFiQuote(
        actualBridgeToken, // Use actual token from route
        destBridgeToken,
        fromChainId,
        toChainId,
        sourceRoute.outputAmount,
        recipient,
        fromAddress // Pass fromAddress to LiFi
      );
      
      if (!bridgeQuote) {
        console.log(`[CrossChainFinder]   ❌ LiFi quote failed`);
        console.log(`[CrossChainFinder]   Moving to next bridgeable token...\n`);
        continue;
      }
      
      console.log(`[CrossChainFinder]   ✅ Bridge quote received!`);
      console.log(`[CrossChainFinder]   Amount Out: ${bridgeQuote.amountOut.toString()}`);
      console.log(`[CrossChainFinder]   Bridge Provider: ${bridgeQuote.quote?.tool || 'unknown'}`);
      
      // Step 4: Find route on destination chain: destBridgeToken → toToken
      console.log(`[CrossChainFinder] 📍 STEP 4: Finding route on destination chain (${toChainId})...`);
      console.log(`[CrossChainFinder]   From: ${destBridgeToken} → To: ${toToken}`);
      console.log(`[CrossChainFinder]   Amount In: ${bridgeQuote.amountOut.toString()}`);
      const destRoute = await this.sameChainFinder.findRoute(
        destBridgeToken,
        toToken,
        toChainId,
        bridgeQuote.amountOut
      );
      
      if (!destRoute) {
        console.log(`[CrossChainFinder]   ❌ No route found on destination chain`);
        console.log(`[CrossChainFinder]   Moving to next bridgeable token...\n`);
        continue;
      }
      
      console.log(`[CrossChainFinder]   ✅ Destination route found!`);
      console.log(`[CrossChainFinder]   Path: ${destRoute.path.map(p => p.slice(0, 10) + '...').join(' → ')}`);
      console.log(`[CrossChainFinder]   Output: ${destRoute.outputAmount.toString()}`);
      
      // Step 5: Return complete cross-chain route
      console.log(`[CrossChainFinder] ✅ SUCCESS: Complete cross-chain route found!`);
      console.log(`[CrossChainFinder] Total Output: ${destRoute.outputAmount.toString()}`);
      console.log(`[CrossChainFinder] ========================================\n`);
      
      return {
        sourceRoute,
        bridge: {
          fromChain: fromChainId,
          toChain: toChainId,
          fromToken: actualBridgeToken, // Use actual token from route
          toToken: destBridgeToken,
          amountIn: sourceRoute.outputAmount,
          amountOut: bridgeQuote.amountOut,
          quote: bridgeQuote.quote,
        },
        destRoute,
        totalOutput: destRoute.outputAmount,
        chainId: toChainId,
      };
    }
    
    console.warn(`[CrossChainFinder] ⚠️ No cross-chain route found after trying all bridgeable tokens`);
    console.log(`[CrossChainFinder] ========================================\n`);
    return null;
  }
  
  /**
   * Find corresponding token on another chain
   * 
   * Enhanced mapping for:
   * - Wrapped native tokens (WBNB, WETH, WMATIC)
   * - Stablecoins (USDT, USDC, BUSD, DAI)
   * - LST tokens (stETH, wstETH, cbETH)
   */
  private findCorrespondingToken(
    tokenAddress: Address,
    fromChainId: number,
    toChainId: number
  ): Address | null {
    const tokenAddrLower = tokenAddress.toLowerCase();
    
    // Token mappings across chains
    const TOKEN_MAPPINGS: Record<string, Record<number, Address>> = {
      // WETH mappings
      'weth': {
        1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' as Address, // Ethereum
        10: '0x4200000000000000000000000000000000000006' as Address, // Optimism
        42161: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1' as Address, // Arbitrum
        8453: '0x4200000000000000000000000000000000000006' as Address, // Base
      },
      // WBNB (BSC native)
      'wbnb': {
        56: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c' as Address, // BSC
      },
      // WMATIC (Polygon native)
      'wmatic': {
        137: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270' as Address, // Polygon
      },
      // USDT mappings
      'usdt': {
        1: '0xdAC17F958D2ee523a2206206994597C13D831ec7' as Address, // Ethereum
        56: '0x55d398326f99059fF775485246999027B3197955' as Address, // BSC
        137: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F' as Address, // Polygon
        10: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58' as Address, // Optimism
        42161: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9' as Address, // Arbitrum
      },
      // USDC mappings
      'usdc': {
        1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address, // Ethereum
        56: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d' as Address, // BSC
        137: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' as Address, // Polygon
        10: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607' as Address, // Optimism
        42161: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8' as Address, // Arbitrum
        8453: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2' as Address, // Base
      },
      // wstETH mappings
      'wsteth': {
        1: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0' as Address, // Ethereum
        10: '0x1F32b1c2345538c0C6F582fB022929c35a05FeF0' as Address, // Optimism
        42161: '0x5979D7b546E38E414F7E9822514be443A4800529' as Address, // Arbitrum
      },
    };
    
    // Check if token is wrapped native on source chain
    const sourceWrappedNative = getWrappedNativeToken(fromChainId);
    if (sourceWrappedNative && tokenAddrLower === sourceWrappedNative.toLowerCase()) {
      const destWrappedNative = getWrappedNativeToken(toChainId);
      if (destWrappedNative) {
        return destWrappedNative;
      }
    }
    
    // Check token mappings
    for (const [tokenKey, chainMap] of Object.entries(TOKEN_MAPPINGS)) {
      const sourceToken = chainMap[fromChainId];
      if (sourceToken && tokenAddrLower === sourceToken.toLowerCase()) {
        const destToken = chainMap[toChainId];
        if (destToken) {
          return destToken;
        }
      }
    }
    
    // Special case: ETH on BSC → WETH on destination
    const ethOnBSC = '0x2170Ed0880ac9A755fd29B2688956BD959F933F8';
    if (tokenAddrLower === ethOnBSC.toLowerCase() && fromChainId === 56) {
      const wethMapping = TOKEN_MAPPINGS['weth'];
      if (wethMapping && wethMapping[toChainId]) {
        return wethMapping[toChainId];
      }
    }
    
    return null;
  }
  
  /**
   * Get LiFi bridge quote
   */
  private async getLiFiQuote(
    fromToken: Address,
    toToken: Address,
    fromChainId: number,
    toChainId: number,
    amountIn: bigint,
    recipient?: Address,
    fromAddress?: Address // User's wallet address (for LiFi)
  ): Promise<{ amountOut: bigint; quote: any } | null> {
    try {
      console.log(`[CrossChainFinder] ========================================`);
      console.log(`[CrossChainFinder] 🌉 GETTING LIFI BRIDGE QUOTE`);
      console.log(`[CrossChainFinder] Parameters being sent to LiFi:`);
      console.log(`[CrossChainFinder]   fromChain: ${fromChainId}`);
      console.log(`[CrossChainFinder]   fromToken: ${fromToken}`);
      console.log(`[CrossChainFinder]   fromAmount: ${amountIn.toString()}`);
      console.log(`[CrossChainFinder]   toChain: ${toChainId}`);
      console.log(`[CrossChainFinder]   toToken: ${toToken}`);
      console.log(`[CrossChainFinder]   fromAddress: ${fromAddress || 'NOT PROVIDED ⚠️'}`);
      console.log(`[CrossChainFinder]   toAddress (recipient): ${recipient || 'NOT PROVIDED ⚠️'}`);
      console.log(`[CrossChainFinder]   order: RECOMMENDED`);
      console.log(`[CrossChainFinder]   slippage: 0.5%`);
      console.log(`[CrossChainFinder] ========================================`);
      
      const startTime = Date.now();
      const quoteParams: any = {
        fromChain: fromChainId,
        fromToken: fromToken,
        fromAmount: amountIn.toString(),
        toChain: toChainId,
        toToken: toToken,
        order: 'RECOMMENDED',
        slippage: 0.5, // Default slippage
      };
      
      // Add addresses if provided (improves quote accuracy)
      if (fromAddress) {
        quoteParams.fromAddress = fromAddress;
        console.log(`[CrossChainFinder] ✅ Adding fromAddress to LiFi request`);
      } else {
        console.log(`[CrossChainFinder] ⚠️ fromAddress not provided - quote may be less accurate`);
      }
      
      if (recipient) {
        quoteParams.toAddress = recipient;
        console.log(`[CrossChainFinder] ✅ Adding toAddress (recipient) to LiFi request`);
      } else {
        console.log(`[CrossChainFinder] ⚠️ recipient not provided - using default`);
      }
      
      // Try getQuote first (faster and more accurate when fromAddress is provided)
      if (fromAddress) {
        try {
          console.log(`[CrossChainFinder] 📡 Calling LiFi getQuote (with fromAddress) with params:`, JSON.stringify(quoteParams, null, 2));
          
          const quote = await getQuote(quoteParams);
          const quoteTime = Date.now() - startTime;
          
          console.log(`[CrossChainFinder] ⏱️ LiFi getQuote took ${quoteTime}ms`);
          
          if (quote && quote.action) {
            const amountOut = BigInt(quote.action.toAmount || '0');
            
            console.log(`[CrossChainFinder] ✅ LiFi getQuote received!`);
            console.log(`[CrossChainFinder]   Amount Out: ${amountOut.toString()}`);
            console.log(`[CrossChainFinder]   Tool: ${quote.action.tool || 'unknown'}`);
            console.log(`[CrossChainFinder]   Steps: ${quote.action.steps?.length || 0}`);
            console.log(`[CrossChainFinder]   Estimated Time: ${quote.estimate?.executionDuration || 'unknown'} seconds`);
            console.log(`[CrossChainFinder] ========================================\n`);
            
            return {
              amountOut,
              quote,
            };
          }
        } catch (quoteError: any) {
          console.warn(`[CrossChainFinder] ⚠️ getQuote failed, falling back to getRoutes:`, quoteError.message);
        }
      }
      
      // Fallback to getRoutes (returns multiple routes, use best one)
      try {
        console.log(`[CrossChainFinder] 📡 Calling LiFi getRoutes (fallback) with params:`, JSON.stringify(quoteParams, null, 2));
        
        const routesParams: any = {
          fromChainId: fromChainId,
          toChainId: toChainId,
          fromTokenAddress: fromToken,
          toTokenAddress: toToken,
          fromAmount: amountIn.toString(),
        };
        
        if (fromAddress) {
          routesParams.fromAddress = fromAddress;
        }
        if (recipient) {
          routesParams.toAddress = recipient;
        }
        
        const routesResult = await getRoutes(routesParams);
        const routesTime = Date.now() - startTime;
        
        console.log(`[CrossChainFinder] ⏱️ LiFi getRoutes took ${routesTime}ms`);
        
        if (routesResult.routes && routesResult.routes.length > 0) {
          // Use first route (best route)
          const bestRoute = routesResult.routes[0];
          const amountOut = BigInt(bestRoute.estimate?.toAmount || '0');
          
          console.log(`[CrossChainFinder] ✅ LiFi getRoutes received!`);
          console.log(`[CrossChainFinder]   Routes found: ${routesResult.routes.length}`);
          console.log(`[CrossChainFinder]   Amount Out: ${amountOut.toString()}`);
          console.log(`[CrossChainFinder]   Steps: ${bestRoute.steps?.length || 0}`);
          console.log(`[CrossChainFinder]   Estimated Time: ${bestRoute.estimate?.executionDuration || 'unknown'} seconds`);
          console.log(`[CrossChainFinder] ========================================\n`);
          
          return {
            amountOut,
            quote: bestRoute, // Use route as quote for compatibility
          };
        }
      } catch (routesError: any) {
        console.error(`[CrossChainFinder] ❌ getRoutes also failed:`, routesError.message);
      }
      
      console.log(`[CrossChainFinder] ❌ Both getQuote and getRoutes failed`);
      console.log(`[CrossChainFinder] ========================================\n`);
      return null;
    } catch (error: any) {
      console.error(`[CrossChainFinder] ❌ LiFi quote error:`);
      console.error(`[CrossChainFinder]   Error message: ${error.message}`);
      console.error(`[CrossChainFinder]   Error stack:`, error.stack);
      console.error(`[CrossChainFinder]   Parameters that failed:`, {
        fromChain: fromChainId,
        fromToken,
        toChain: toChainId,
        toToken,
        amountIn: amountIn.toString(),
      });
      console.log(`[CrossChainFinder] ========================================\n`);
      return null;
    }
  }
}

// Singleton instance
let crossChainFinderInstance: CrossChainRouteFinder | null = null;

/**
 * Get singleton CrossChainRouteFinder instance
 */
export function getCrossChainRouteFinder(): CrossChainRouteFinder {
  if (!crossChainFinderInstance) {
    crossChainFinderInstance = new CrossChainRouteFinder();
  }
  return crossChainFinderInstance;
}

