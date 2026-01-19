/**
 * Bridge Types
 * 
 * Types for cross-chain bridge integrations.
 */

import type { Address } from 'viem';

/**
 * Bridge quote
 */
export interface BridgeQuote {
  bridgeId: string;
  bridgeName: string;
  fromChain: number;
  toChain: number;
  fromToken: Address;
  toToken: Address;
  amountIn: bigint;
  amountOut: bigint;
  fees: {
    bridge: string; // Bridge fee in USD
    gas: string; // Gas cost in USD
    total: string; // Total cost in USD
  };
  estimatedTime: number; // Estimated time in seconds
  minAmountOut: bigint; // Minimum amount out (with slippage)
  slippage: number; // Slippage tolerance
  expiresAt: number; // Quote expiration timestamp
  transactionData?: string; // Encoded transaction data
  raw?: any; // Raw bridge response
}

/**
 * Bridge execution result
 */
export interface BridgeExecutionResult {
  success: boolean;
  transactionHash?: string;
  fromChainTxHash?: string;
  toChainTxHash?: string;
  error?: string;
  estimatedCompletionTime?: number;
}

/**
 * Bridge status
 */
export interface BridgeStatus {
  bridgeId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  fromChainTxHash?: string;
  toChainTxHash?: string;
  progress: number; // 0-100
  message: string;
  estimatedTimeRemaining?: number;
}

/**
 * Cross-chain route
 */
export interface CrossChainRoute {
  sourceSwap?: {
    fromToken: Address;
    toToken: Address;
    amountIn: bigint;
    amountOut: bigint;
    dex: string;
    chainId: number;
  };
  bridge: {
    bridgeId: string;
    bridgeName: string;
    fromChain: number;
    toChain: number;
    fromToken: Address;
    toToken: Address;
    amountIn: bigint;
    amountOut: bigint;
    fees: BridgeQuote['fees'];
    estimatedTime: number;
  };
  destinationSwap?: {
    fromToken: Address;
    toToken: Address;
    amountIn: bigint;
    amountOut: bigint;
    dex: string;
    chainId: number;
  };
  totalGas: {
    source: bigint;
    destination: bigint;
  };
  totalFees: {
    source: string;
    bridge: string;
    destination: string;
    total: string;
  };
}

/**
 * Bridge adapter interface
 */
export interface BridgeAdapter {
  /**
   * Bridge identifier
   */
  bridgeId: string;
  
  /**
   * Bridge display name
   */
  bridgeName: string;
  
  /**
   * Get supported chains
   */
  getSupportedChains(): Promise<number[]>;
  
  /**
   * Check if bridge supports a chain pair
   */
  supportsChainPair(fromChain: number, toChain: number): Promise<boolean>;
  
  /**
   * Get quote for bridge
   */
  getQuote(
    fromChain: number,
    toChain: number,
    fromToken: Address,
    toToken: Address,
    amountIn: bigint,
    slippage?: number
  ): Promise<BridgeQuote | null>;
  
  /**
   * Execute bridge
   */
  executeBridge(
    quote: BridgeQuote,
    userAddress: Address
  ): Promise<BridgeExecutionResult>;
  
  /**
   * Get bridge status
   */
  getBridgeStatus(
    transactionHash: string,
    fromChain: number
  ): Promise<BridgeStatus | null>;
  
  /**
   * Get bridge priority (lower = higher priority)
   */
  getPriority(): number;
}


