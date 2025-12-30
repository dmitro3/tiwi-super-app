/**
 * PancakeSwap Router Adapter
 * 
 * Implements SwapRouter interface for PancakeSwap V2.
 * Supports BNB Chain (56) primarily, with fallback support for other EVM chains.
 */

import { createPublicClient, http, type Address, getAddress } from 'viem';
import { bsc, mainnet, arbitrum, optimism, polygon, base } from 'viem/chains';
import { BaseRouter } from '../base';
import { toHumanReadable } from '../transformers/amount-transformer';
import { QUOTE_EXPIRATION_SECONDS } from '../constants';
import type { RouterParams, RouterRoute, RouteStep } from '../types';

// PancakeSwap V2 Router addresses
const PANCAKESWAP_V2_ROUTER: Record<number, Address> = {
  56: getAddress('0x10ED43C718714eb63d5aA57B78B54704E256024E'), // BSC (PancakeSwap)
  // Fallback support (using SushiSwap on other chains)
  1: getAddress('0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'), // Ethereum
  42161: getAddress('0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F'), // Arbitrum
  10: getAddress('0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F'), // Optimism
  137: getAddress('0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'), // Polygon
  8453: getAddress('0x6BDED42c6DA8FBf0d2bA55B2fa120C5e0c8D7891'), // Base
};

// WETH/WBNB addresses
const WETH_ADDRESSES: Record<number, Address> = {
  56: getAddress('0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'), // BSC WBNB
  1: getAddress('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'), // Ethereum WETH
  42161: getAddress('0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'), // Arbitrum WETH
  10: getAddress('0x4200000000000000000000000000000000000006'), // Optimism WETH
  137: getAddress('0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270'), // Polygon WMATIC
  8453: getAddress('0x4200000000000000000000000000000000000006'), // Base WETH
};

// Chain configs for viem
const CHAIN_CONFIGS: Record<number, any> = {
  56: bsc,
  1: mainnet,
  42161: arbitrum,
  10: optimism,
  137: polygon,
  8453: base,
};

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
   */
  async getRoute(params: RouterParams): Promise<RouterRoute | null> {
    try {
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
      
      if (!(fromChainId in PANCAKESWAP_V2_ROUTER)) {
        return null; // Chain not supported
      }
      
      // Get router address
      const routerAddress = PANCAKESWAP_V2_ROUTER[fromChainId];
      const wethAddress = WETH_ADDRESSES[fromChainId];
      
      if (!routerAddress || !wethAddress) {
        return null;
      }
      
      // Get chain config and create public client
      const chainConfig = CHAIN_CONFIGS[fromChainId];
      if (!chainConfig) {
        return null;
      }
      
      const publicClient = createPublicClient({
        chain: chainConfig,
        transport: http(),
      });
      
      // Convert native token addresses to WETH
      const fromToken = this.convertToWETH(params.fromToken, fromChainId);
      const toToken = this.convertToWETH(params.toToken, fromChainId);
      
      // Build swap path
      const path = this.buildSwapPath(fromToken, toToken, wethAddress);
      
      // Get quote from router
      const amountIn = BigInt(params.fromAmount);
      const amounts = await publicClient.readContract({
        address: routerAddress,
        abi: ROUTER_ABI,
        functionName: 'getAmountsOut',
        args: [amountIn, path],
      });
      
      if (!amounts || amounts.length === 0 || amounts[amounts.length - 1] === BigInt(0)) {
        return null; // No route found
      }
      
      const amountOut = amounts[amounts.length - 1];
      
      // Get token decimals (default to 18 if not provided)
      const fromDecimals = 18; // Will be provided by RouteService
      const toDecimals = 18;
      
      // Calculate price impact (simplified: assume 0.3% fee for V2)
      const priceImpact = this.calculatePriceImpact(amountIn, amountOut, path.length);
      
      // Normalize to RouterRoute format
      const normalizedRoute = this.normalizeRoute(
        fromChainId,
        toChainId,
        params.fromToken,
        params.toToken,
        params.fromAmount,
        amountOut.toString(),
        fromDecimals,
        toDecimals,
        path,
        priceImpact,
        params.slippage || 0.5
      );
      return normalizedRoute;
    } catch (error: any) {
      // If error indicates no route, return null (not an error)
      if (error?.message?.includes('INSUFFICIENT_OUTPUT_AMOUNT') || 
          error?.message?.includes('INSUFFICIENT_LIQUIDITY') ||
          error?.message?.includes('No route')) {
        return null;
      }
      
      console.error('[PancakeSwapAdapter] Error fetching route:', error);
      throw error;
    }
  }
  
  /**
   * Convert native token address to WETH address
   */
  private convertToWETH(tokenAddress: string, chainId: number): Address {
    const zeroAddress = '0x0000000000000000000000000000000000000000';
    const nativeAddress = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    
    if (tokenAddress.toLowerCase() === zeroAddress || 
        tokenAddress.toLowerCase() === nativeAddress) {
      return WETH_ADDRESSES[chainId];
    }
    
    return getAddress(tokenAddress);
  }
  
  /**
   * Build swap path (direct or through WETH)
   */
  private buildSwapPath(fromToken: Address, toToken: Address, wethAddress: Address): Address[] {
    // Direct pair
    if (fromToken.toLowerCase() !== wethAddress.toLowerCase() && 
        toToken.toLowerCase() !== wethAddress.toLowerCase()) {
      // Try direct first, fallback to WETH if needed
      return [fromToken, toToken];
    }
    
    // One token is WETH
    if (fromToken.toLowerCase() === wethAddress.toLowerCase()) {
      return [fromToken, toToken];
    }
    
    if (toToken.toLowerCase() === wethAddress.toLowerCase()) {
      return [fromToken, toToken];
    }
    
    // Both are WETH (shouldn't happen, but handle gracefully)
    return [fromToken, toToken];
  }
  
  /**
   * Calculate price impact (simplified)
   * V2 has 0.3% fee per hop
   */
  private calculatePriceImpact(amountIn: bigint, amountOut: bigint, pathLength: number): number {
    // Simplified calculation: assume 0.3% fee per hop
    const feePerHop = 0.003;
    const totalFee = feePerHop * (pathLength - 1);
    
    // Price impact is roughly the fee percentage
    return totalFee * 100; // Convert to percentage
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
    slippage: number
  ): RouterRoute {
    // Convert amounts to human-readable
    const fromAmountHuman = toHumanReadable(fromAmount, fromDecimals);
    const toAmountHuman = toHumanReadable(toAmount, toDecimals);
    
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
        decimals: fromDecimals,
      },
      toToken: {
        chainId: toChainId,
        address: toTokenAddress,
        symbol: '', // Will be enriched by RouteService
        amount: toAmountHuman,
        decimals: toDecimals,
      },
      exchangeRate,
      priceImpact: priceImpact.toFixed(2),
      slippage: slippage.toFixed(2),
      fees: {
        protocol: '0', // V2 has no protocol fee (only LP fee)
        gas: '0', // Gas estimate not available from quote
        gasUSD: '0',
        total: '0',
      },
      steps,
      estimatedTime: 0, // Same-chain swaps are instant
      expiresAt: Date.now() + (QUOTE_EXPIRATION_SECONDS * 1000),
    };
  }
}

