/**
 * PancakeSwap Router Adapter
 * 
 * Implements SwapRouter interface for PancakeSwap V2.
 * Supports BNB Chain (56) primarily, with fallback support for other EVM chains.
 * Relies on advanced graph-based routing from pancakeswap-router utility.
 */

import { createPublicClient, http, type Address, getAddress } from 'viem';
import { BaseRouter } from '../base';
import { toHumanReadable } from '../transformers/amount-transformer';
import { QUOTE_EXPIRATION_SECONDS } from '../constants';
import type { RouterParams, RouterRoute, RouteStep } from '../types';
import { PANCAKESWAP_V2_ROUTER, WETH_ADDRESSES } from '@/lib/backend/utils/pancakeswap-constants';
import { findBestRoute, detectFeeOnTransfer, calculateDynamicSlippage } from '@/lib/backend/utils/pancakeswap-router';
import { getChainConfig } from '@/lib/backend/utils/chain-config';

/**
 * PancakeSwap Router Adapter
 */
export class PancakeSwapAdapter extends BaseRouter {
  name = 'pancakeswap';
  displayName = 'PancakeSwap';

  /**
   * Get router priority (lower = higher priority)
   */
  getPriority(): number {
    return 5;
  }

  /**
   * Get supported chains
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
   * PancakeSwap only supports same-chain swaps
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
      if (!params.fromChainId || !params.fromToken || !params.toToken || !params.fromAmount) {
        return null;
      }

      const chainId = typeof params.fromChainId === 'number'
        ? params.fromChainId
        : parseInt(String(params.fromChainId), 10);

      const routerAddress = PANCAKESWAP_V2_ROUTER[chainId];
      if (!routerAddress) return null;

      const chain = getChainConfig(chainId);
      if (!chain) return null;

      const amountInBigInt = BigInt(params.fromAmount);
      const tokenIn = getAddress(params.fromToken);
      const tokenOut = getAddress(params.toToken);

      // Use advanced routing (graph-based)
      try {
        const publicClient = createPublicClient({
          chain,
          transport: http(),
        });

        const route = await findBestRoute(tokenIn, tokenOut, amountInBigInt, chainId);

        if (!route || route.expectedOutput <= BigInt(0)) {
          return null;
        }

        // Detect fee-on-transfer
        const isFeeOnTransfer = await detectFeeOnTransfer(tokenIn, chainId, publicClient);

        // Calculate dynamic slippage
        const slippage = calculateDynamicSlippage(
          route.priceImpact,
          isFeeOnTransfer,
          route.liquidity < BigInt(1000000)
        );

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
          tokenIn,
          tokenOut,
          isFeeOnTransfer
        );
      } catch (error) {
        console.error('[PancakeSwapAdapter] Routing failed:', error);
        return null;
      }
    } catch (error: any) {
      console.error('[PancakeSwapAdapter] Unexpected error:', error);
      return null;
    }
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
    const fromAmountHuman = toHumanReadable(fromAmount, fromDecimals);
    const toAmountHuman = toHumanReadable(toAmount, toDecimals);

    const fromAmountNum = parseFloat(fromAmountHuman);
    const toAmountNum = parseFloat(toAmountHuman);
    const exchangeRate = fromAmountNum > 0 ? (toAmountNum / fromAmountNum).toFixed(6) : '0';

    const steps: RouteStep[] = [];
    for (let i = 0; i < path.length - 1; i++) {
      steps.push({
        type: 'swap',
        chainId: fromChainId,
        fromToken: {
          address: path[i],
          amount: i === 0 ? fromAmountHuman : '0',
        },
        toToken: {
          address: path[i + 1],
          amount: i === path.length - 2 ? toAmountHuman : '0',
        },
        protocol: 'PancakeSwap V2',
        description: `Swap ${path[i].slice(0, 6)}... → ${path[i + 1].slice(0, 6)}...`,
      });
    }

    return {
      router: this.name,
      routeId: `pancakeswap-${fromChainId}-${Date.now()}`,
      fromToken: {
        chainId: fromChainId,
        address: fromTokenAddress,
        symbol: '',
        amount: fromAmountHuman,
        decimals: fromDecimals,
      },
      toToken: {
        chainId: toChainId,
        address: toTokenAddress,
        symbol: '',
        amount: toAmountHuman,
        decimals: toDecimals,
      },
      exchangeRate,
      priceImpact: priceImpact.toFixed(2),
      slippage: slippage.toFixed(2),
      fees: {
        protocol: '0',
        gas: gasEstimate,
        gasUSD: gasUSD,
        total: '0',
      },
      steps,
      estimatedTime: 0,
      expiresAt: Date.now() + (QUOTE_EXPIRATION_SECONDS * 1000),
      raw: {
        path: path.map(addr => addr.toLowerCase()),
        routerAddress: routerAddress.toLowerCase(),
        tokenIn: getAddress(originalTokenIn).toLowerCase(),
        tokenOut: getAddress(originalTokenOut).toLowerCase(),
        amountOut: toAmount,
        isFeeOnTransfer: isFeeOnTransfer || false,
      },
    };
  }
}
