/**
 * Base Bridge Adapter
 * 
 * Base class for bridge adapters with common functionality.
 */

import type { BridgeAdapter, BridgeQuote, BridgeExecutionResult, BridgeStatus } from './types';
import type { Address } from 'viem';

/**
 * Base Bridge Adapter
 * 
 * Provides common functionality for bridge adapters.
 */
export abstract class BaseBridgeAdapter implements BridgeAdapter {
  abstract bridgeId: string;
  abstract bridgeName: string;
  
  abstract getSupportedChains(): Promise<number[]>;
  abstract supportsChainPair(fromChain: number, toChain: number): Promise<boolean>;
  abstract getQuote(
    fromChain: number,
    toChain: number,
    fromToken: Address,
    toToken: Address,
    amountIn: bigint,
    slippage?: number
  ): Promise<BridgeQuote | null>;
  abstract executeBridge(
    quote: BridgeQuote,
    userAddress: Address
  ): Promise<BridgeExecutionResult>;
  abstract getBridgeStatus(
    transactionHash: string,
    fromChain: number
  ): Promise<BridgeStatus | null>;
  
  /**
   * Default priority (can be overridden)
   */
  getPriority(): number {
    return 100;
  }
  
  /**
   * Validate quote before execution
   */
  protected validateQuote(quote: BridgeQuote): boolean {
    // Check expiration
    if (Date.now() >= quote.expiresAt) {
      return false;
    }
    
    // Check amounts
    if (quote.amountIn <= BigInt(0) || quote.amountOut <= BigInt(0)) {
      return false;
    }
    
    // Check chains
    if (quote.fromChain === quote.toChain) {
      return false; // Not a cross-chain bridge
    }
    
    return true;
  }
  
  /**
   * Calculate minimum amount out with slippage
   */
  protected calculateMinAmountOut(amountOut: bigint, slippage: number): bigint {
    const slippageBps = BigInt(Math.round(slippage * 100));
    const slippageMultiplier = BigInt(10000) - slippageBps;
    return (amountOut * slippageMultiplier) / BigInt(10000);
  }
}


