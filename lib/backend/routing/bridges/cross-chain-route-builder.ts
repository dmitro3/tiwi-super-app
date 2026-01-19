/**
 * Cross-Chain Route Builder
 * 
 * Builds complete cross-chain routes by combining:
 * - Source chain swap (if needed)
 * - Bridge
 * - Destination chain swap (if needed)
 */

import type { Address } from 'viem';
import type { BridgeAdapter, BridgeQuote, CrossChainRoute } from './types';
import { getBridgeRegistry } from './bridge-registry';
// TODO: Replace with on-demand route finder (Phase 7)

/**
 * Cross-chain route request
 */
export interface CrossChainRouteRequest {
  fromChain: number;
  fromToken: Address;
  toChain: number;
  toToken: Address;
  amountIn: bigint;
  slippage?: number;
  recipient?: Address;
}

/**
 * Cross-Chain Route Builder
 * 
 * Builds complete cross-chain routes.
 */
export class CrossChainRouteBuilder {
  private bridgeRegistry = getBridgeRegistry();
  // TODO: Replace with on-demand route finder (Phase 7)
  
  /**
   * Build cross-chain route
   * 
   * This method:
   * 1. Determines if source swap is needed
   * 2. Finds best bridge
   * 3. Determines if destination swap is needed
   * 4. Combines everything into a route
   */
  async buildRoute(
    request: CrossChainRouteRequest
  ): Promise<CrossChainRoute | null> {
    const {
      fromChain,
      fromToken,
      toChain,
      toToken,
      amountIn,
      slippage = 0.5,
    } = request;
    
    // 1. Get best bridge for this chain pair
    const bridge = await this.bridgeRegistry.getBestBridge(fromChain, toChain);
    if (!bridge) {
      return null; // No bridge supports this chain pair
    }
    
    // 2. Determine bridge tokens (native tokens for each chain)
    const bridgeFromToken = this.getBridgeToken(fromChain);
    const bridgeToToken = this.getBridgeToken(toChain);
    
    // 3. Check if source swap is needed
    let sourceSwap: CrossChainRoute['sourceSwap'] | undefined;
    let bridgeAmountIn = amountIn;
    
    if (fromToken.toLowerCase() !== bridgeFromToken.toLowerCase()) {
      // Need to swap fromToken → bridgeToken on source chain
      const swap = await this.findSourceSwap(
        fromChain,
        fromToken,
        bridgeFromToken,
        amountIn
      );
      
      if (!swap) {
        return null; // Can't find source swap
      }
      
      sourceSwap = swap;
      bridgeAmountIn = swap.amountOut;
    }
    
    // 4. Get bridge quote
    const bridgeQuote = await bridge.getQuote(
      fromChain,
      toChain,
      bridgeFromToken,
      bridgeToToken,
      bridgeAmountIn,
      slippage
    );
    
    if (!bridgeQuote) {
      return null; // Bridge quote failed
    }
    
    // 5. Check if destination swap is needed
    let destinationSwap: CrossChainRoute['destinationSwap'] | undefined;
    const bridgeAmountOut = bridgeQuote.amountOut;
    
    if (toToken.toLowerCase() !== bridgeToToken.toLowerCase()) {
      // Need to swap bridgeToken → toToken on destination chain
      const swap = await this.findDestinationSwap(
        toChain,
        bridgeToToken,
        toToken,
        bridgeAmountOut
      );
      
      if (!swap) {
        return null; // Can't find destination swap
      }
      
      destinationSwap = swap;
    }
    
    // 6. Calculate total gas and fees
    const totalGas = {
      source: sourceSwap ? BigInt(150000) : BigInt(0), // Estimated gas
      destination: destinationSwap ? BigInt(150000) : BigInt(0),
    };
    
    const totalFees = {
      source: sourceSwap ? '0.00' : '0.00', // Would calculate actual fees
      bridge: bridgeQuote.fees.total,
      destination: destinationSwap ? '0.00' : '0.00',
      total: (
        parseFloat(bridgeQuote.fees.total) +
        (sourceSwap ? 0 : 0) +
        (destinationSwap ? 0 : 0)
      ).toFixed(2),
    };
    
    // 7. Build and return route
    return {
      sourceSwap,
      bridge: {
        bridgeId: bridge.bridgeId,
        bridgeName: bridge.bridgeName,
        fromChain,
        toChain,
        fromToken: bridgeFromToken,
        toToken: bridgeToToken,
        amountIn: bridgeAmountIn,
        amountOut: bridgeAmountOut,
        fees: bridgeQuote.fees,
        estimatedTime: bridgeQuote.estimatedTime,
      },
      destinationSwap,
      totalGas,
      totalFees,
    };
  }
  
  /**
   * Find source chain swap
   */
  private async findSourceSwap(
    chainId: number,
    fromToken: Address,
    toToken: Address,
    amountIn: bigint
  ): Promise<CrossChainRoute['sourceSwap'] | null> {
    try {
      const graph = this.graphBuilder.getGraph(chainId);
      const pathfinder = new Pathfinder(graph, 0);
      
      const routes = await pathfinder.findRoutes(
        {
          fromToken,
          toToken,
          chainId,
          amountIn,
          maxHops: 3,
        },
        {
          maxRoutes: 1,
          algorithm: 'auto',
        }
      );
      
      if (routes.length === 0) {
        return null;
      }
      
      const route = routes[0];
      const step = route.steps[0];
      
      if (!step) {
        return null;
      }
      
      return {
        fromToken,
        toToken,
        amountIn,
        amountOut: BigInt(step.amountOut),
        dex: step.dex,
        chainId,
      };
    } catch (error) {
      console.error('[CrossChainRouteBuilder] Error finding source swap:', error);
      return null;
    }
  }
  
  /**
   * Find destination chain swap
   */
  private async findDestinationSwap(
    chainId: number,
    fromToken: Address,
    toToken: Address,
    amountIn: bigint
  ): Promise<CrossChainRoute['destinationSwap'] | null> {
    // Same logic as source swap
    return this.findSourceSwap(chainId, fromToken, toToken, amountIn);
  }
  
  /**
   * Get bridge token for a chain (native wrapped token)
   */
  private getBridgeToken(chainId: number): Address {
    // Common wrapped native tokens
    const bridgeTokens: Record<number, Address> = {
      1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' as Address, // WETH
      56: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c' as Address, // WBNB
      137: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270' as Address, // WMATIC
      42161: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1' as Address, // WETH
      10: '0x4200000000000000000000000000000000000006' as Address, // WETH
      8453: '0x4200000000000000000000000000000000000006' as Address, // WETH
    };
    
    return bridgeTokens[chainId] || ('0x' as Address);
  }
}

// Singleton instance
let crossChainRouteBuilderInstance: CrossChainRouteBuilder | null = null;

/**
 * Get singleton CrossChainRouteBuilder instance
 */
export function getCrossChainRouteBuilder(): CrossChainRouteBuilder {
  if (!crossChainRouteBuilderInstance) {
    crossChainRouteBuilderInstance = new CrossChainRouteBuilder();
  }
  return crossChainRouteBuilderInstance;
}


