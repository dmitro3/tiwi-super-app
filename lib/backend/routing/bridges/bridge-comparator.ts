/**
 * Bridge Comparator
 * 
 * Compares multiple bridge quotes and selects the best one.
 */

import type { BridgeAdapter, BridgeQuote } from './types';
import { getBridgeRegistry } from './bridge-registry';

/**
 * Bridge comparison result
 */
export interface BridgeComparison {
  bridge: BridgeAdapter;
  quote: BridgeQuote;
  score: number;
  ranking: number;
}

/**
 * Bridge Comparator
 * 
 * Compares bridges and selects the best option.
 */
export class BridgeComparator {
  private bridgeRegistry = getBridgeRegistry();
  
  /**
   * Compare bridges for a route
   * 
   * @param fromChain Source chain
   * @param toChain Destination chain
   * @param fromToken Source token
   * @param toToken Destination token
   * @param amountIn Input amount
   * @param slippage Slippage tolerance
   * @returns Array of bridge comparisons, sorted by score
   */
  async compareBridges(
    fromChain: number,
    toChain: number,
    fromToken: string,
    toToken: string,
    amountIn: bigint,
    slippage: number = 0.5
  ): Promise<BridgeComparison[]> {
    // Get all bridges that support this chain pair
    const bridges = await this.bridgeRegistry.getBridgesForChainPair(fromChain, toChain);
    
    // Get quotes from all bridges in parallel
    const quotePromises = bridges.map(async (bridge) => {
      try {
        const quote = await bridge.getQuote(
          fromChain,
          toChain,
          fromToken as any,
          toToken as any,
          amountIn,
          slippage
        );
        
        if (!quote) {
          return null;
        }
        
        // Score the quote
        const score = this.scoreBridgeQuote(quote, bridge);
        
        return {
          bridge,
          quote,
          score,
          ranking: 0, // Will be set after sorting
        };
      } catch (error) {
        console.warn(`[BridgeComparator] Error getting quote from ${bridge.bridgeName}:`, error);
        return null;
      }
    });
    
    const results = await Promise.all(quotePromises);
    const comparisons = results.filter((r): r is BridgeComparison => r !== null);
    
    // Sort by score (highest first)
    comparisons.sort((a, b) => b.score - a.score);
    
    // Set rankings
    comparisons.forEach((comp, index) => {
      comp.ranking = index + 1;
    });
    
    return comparisons;
  }
  
  /**
   * Get best bridge
   */
  async getBestBridge(
    fromChain: number,
    toChain: number,
    fromToken: string,
    toToken: string,
    amountIn: bigint,
    slippage: number = 0.5
  ): Promise<BridgeComparison | null> {
    const comparisons = await this.compareBridges(
      fromChain,
      toChain,
      fromToken,
      toToken,
      amountIn,
      slippage
    );
    
    return comparisons.length > 0 ? comparisons[0] : null;
  }
  
  /**
   * Score a bridge quote
   * 
   * Scoring factors:
   * - Output amount (primary)
   * - Bridge fees (lower is better)
   * - Estimated time (faster is better)
   * - Bridge priority (reliability)
   */
  private scoreBridgeQuote(quote: BridgeQuote, bridge: BridgeAdapter): number {
    // Primary: Output amount (higher is better)
    const outputAmount = Number(quote.amountOut);
    
    // Secondary: Total fees (lower is better)
    const totalFees = parseFloat(quote.fees.total || '0');
    const feePenalty = totalFees * 100; // Convert to score penalty
    
    // Tertiary: Estimated time (faster is better)
    const timePenalty = quote.estimatedTime / 10; // 10 seconds = 1 point penalty
    
    // Bridge priority bonus (more reliable bridges get bonus)
    const priorityBonus = (100 - bridge.getPriority()) * 10; // Lower priority number = higher bonus
    
    // Calculate score
    const score = outputAmount - feePenalty - timePenalty + priorityBonus;
    
    return score;
  }
}

// Singleton instance
let bridgeComparatorInstance: BridgeComparator | null = null;

/**
 * Get singleton BridgeComparator instance
 */
export function getBridgeComparator(): BridgeComparator {
  if (!bridgeComparatorInstance) {
    bridgeComparatorInstance = new BridgeComparator();
  }
  return bridgeComparatorInstance;
}


