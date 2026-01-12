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
import { getGasEstimationService } from '@/lib/backend/services/gas-estimation-service';

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
      
      // ✅ Find best route using multi-hop path finding (like tiwi-test)
      const amountIn = BigInt(params.fromAmount);
      const bestRoute = await this.findBestRoute(
        fromToken,
        toToken,
        amountIn,
        fromChainId,
        routerAddress,
        publicClient
      );
      
      if (!bestRoute) {
        return null; // No route found
      }
      
      const path = bestRoute.path;
      const amountOut = bestRoute.expectedOutput;
      const amountOutString = amountOut.toString();
      
      // Use provided decimals from RouterParams (passed from RouteService)
      // These come from token data (enriched by TokenService), no contract call needed
      const fromDecimals = params.fromDecimals;
      const toDecimals = params.toDecimals;
      
      // Debug logging to verify raw amount and decimals
      console.log('[PancakeSwapAdapter] Raw amountOut:', amountOutString, 'length:', amountOutString.length);
      console.log('[PancakeSwapAdapter] Token decimals - from:', fromDecimals, 'to:', toDecimals);
      
      // Use price impact from best route if available, otherwise calculate
      const priceImpact = bestRoute.priceImpact ?? this.calculatePriceImpact(amountIn, amountOut, path.length);
      
      // Estimate gas cost (non-blocking - don't fail route if estimation fails)
      let gasEstimate = '0';
      let gasUSD = '0';
      // try {
      //   const gasService = getGasEstimationService();
      //   const gasResult = await gasService.estimateSwapGas({
      //     chainId: fromChainId,
      //     routerAddress,
      //     fromToken: getAddress(params.fromToken),
      //     toToken: getAddress(params.toToken),
      //     amountIn,
      //     path,
      //   });
      //   gasEstimate = gasResult.gasEstimate;
      //   gasUSD = gasResult.gasUSD;
      // } catch (error) {
      //   console.warn('[PancakeSwapAdapter] Gas estimation failed, using fallback:', error);
      //   // Continue with '0' values (will be handled in normalizeRoute)
      // }
      
      // Normalize to RouterRoute format
      const normalizedRoute = this.normalizeRoute(
        fromChainId,
        toChainId,
        params.fromToken,
        params.toToken,
        params.fromAmount,
        amountOutString,
        fromDecimals,
        toDecimals,
        path,
        priceImpact,
        params.slippage || 0.5,
        gasEstimate,
        gasUSD,
        routerAddress,
        params.fromToken, // Original tokenIn (before WETH conversion)
        params.toToken   // Original tokenOut (before WETH conversion)
      );
      
      // Debug logging to verify converted amount
      console.log('[PancakeSwapAdapter] Converted toToken.amount:', normalizedRoute.toToken.amount);
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
   * Get intermediate tokens for routing (chain-specific)
   * These are high-liquidity tokens used for multi-hop swaps
   */
  private getIntermediateTokens(chainId: number): Address[] {
    const weth = WETH_ADDRESSES[chainId];
    if (!weth) return [];

    const intermediates: Address[] = [weth]; // Always try WETH first

    // Add chain-specific common tokens (high liquidity)
    if (chainId === 56) {
      // BSC
      intermediates.push(
        getAddress('0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82'), // CAKE
        getAddress('0x55d398326f99059fF775485246999027B3197955'), // USDT
        getAddress('0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56'), // BUSD
        getAddress('0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d'), // USDC
        getAddress('0x50c5725949A6F0c72E6C4a641F24049A917E0Cb6'), // FDUSD
      );
    } else if (chainId === 1) {
      // Ethereum
      intermediates.push(
        getAddress('0xdAC17F958D2ee523a2206206994597C13D831ec7'), // USDT
        getAddress('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'), // USDC
        getAddress('0x6B175474E89094C44Da98b954EedeAC495271d0F'), // DAI
      );
    } else if (chainId === 137) {
      // Polygon
      intermediates.push(
        getAddress('0xc2132D05D31c914a87C6611C10748AEb04B58e8F'), // USDT
        getAddress('0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'), // USDC
      );
    } else if (chainId === 42161) {
      // Arbitrum
      intermediates.push(
        getAddress('0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'), // USDT
        getAddress('0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8'), // USDC
      );
    } else if (chainId === 10) {
      // Optimism
      intermediates.push(
        getAddress('0x94b008aA00579c1307B0EF2c499aD98a8ce58e58'), // USDT
        getAddress('0x7F5c764cBc14f9669B88837ca1490cCa17c31607'), // USDC
      );
    } else if (chainId === 8453) {
      // Base
      intermediates.push(
        getAddress('0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2'), // USDC
        getAddress('0x50c5725949A6F0c72E6C4a641F24049A917E0Cb6'), // DAI
      );
    }

    return intermediates;
  }

  /**
   * Find best route using multi-hop path finding (like tiwi-test)
   * Tries multiple paths and returns the one with highest output
   */
  private async findBestRoute(
    tokenIn: Address,
    tokenOut: Address,
    amountIn: bigint,
    chainId: number,
    routerAddress: Address,
    publicClient: any
  ): Promise<{ path: Address[]; expectedOutput: bigint; priceImpact: number } | null> {
    const intermediates = this.getIntermediateTokens(chainId);
    console.log("🚀 ~ PancakeSwapAdapter ~ findBestRoute ~ intermediates:", intermediates)
    
    // Build all possible paths
    const paths: Address[][] = [
      [tokenIn, tokenOut], // Direct path
    ];

    // Add 2-hop paths through intermediates
    for (const intermediate of intermediates) {
      if (
        intermediate.toLowerCase() !== tokenIn.toLowerCase() &&
        intermediate.toLowerCase() !== tokenOut.toLowerCase()
      ) {
        paths.push([tokenIn, intermediate, tokenOut]);
      }
    }

    // Add 3-hop paths (token -> intermediate1 -> intermediate2 -> token)
    for (let i = 0; i < intermediates.length; i++) {
      for (let j = i + 1; j < intermediates.length; j++) {
        const intermediate1 = intermediates[i];
        const intermediate2 = intermediates[j];
        if (
          intermediate1.toLowerCase() !== tokenIn.toLowerCase() &&
          intermediate1.toLowerCase() !== tokenOut.toLowerCase() &&
          intermediate2.toLowerCase() !== tokenIn.toLowerCase() &&
          intermediate2.toLowerCase() !== tokenOut.toLowerCase() &&
          intermediate1.toLowerCase() !== intermediate2.toLowerCase()
        ) {
          paths.push([tokenIn, intermediate1, intermediate2, tokenOut]);
        }
      }
    }

    // Try each path and collect valid routes
    const validRoutes: Array<{ path: Address[]; expectedOutput: bigint; priceImpact: number }> = [];
    console.log("🚀 ~ PancakeSwapAdapter ~ findBestRoute ~ validRoutes:", validRoutes)
    
    // Test all paths in parallel for speed
    const pathTests = paths.map(async (path) => {
      try {
        const amounts = await publicClient.readContract({
          address: routerAddress,
          abi: ROUTER_ABI,
          functionName: 'getAmountsOut',
          args: [amountIn, path],
        }) as bigint[];
        console.log("🚀 ~ PancakeSwapAdapter ~ findBestRoute ~ amounts:", amounts)

        if (amounts && amounts.length > 0 && amounts[amounts.length - 1] > BigInt(0)) {
          // Calculate price impact (simplified)
          const inputAmount = Number(amountIn) / 1e18;
          const outputAmount = Number(amounts[amounts.length - 1]) / 1e18;
          const priceImpact = inputAmount > 0 
            ? Math.abs((inputAmount - outputAmount) / inputAmount) * 100 
            : 0;

          return {
            path,
            expectedOutput: amounts[amounts.length - 1],
            priceImpact: Math.min(priceImpact, 100),
          };
        }
        return null;
      } catch (error) {
        // Path doesn't exist or has insufficient liquidity, skip it
        return null;
      }
    });

    const results = await Promise.allSettled(pathTests);
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        validRoutes.push(result.value);
      }
    }

    if (validRoutes.length === 0) {
      return null;
    }

    // Sort by highest output, then lowest price impact
    validRoutes.sort((a, b) => {
      if (a.expectedOutput > b.expectedOutput) return -1;
      if (a.expectedOutput < b.expectedOutput) return 1;
      if (a.priceImpact < b.priceImpact) return -1;
      if (a.priceImpact > b.priceImpact) return 1;
      return 0;
    });

    return validRoutes[0];
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
    slippage: number,
    gasEstimate: string = '0',
    gasUSD: string = '0',
    routerAddress: Address,
    originalTokenIn: string,
    originalTokenOut: string
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
      },
    };
  }
}

