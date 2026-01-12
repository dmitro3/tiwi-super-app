/**
 * Jupiter Router Adapter
 * 
 * Implements SwapRouter interface for Jupiter Aggregator (Solana).
 * Uses Jupiter API for route fetching and quote generation.
 */

import { BaseRouter } from '../base';
import { toHumanReadable } from '../transformers/amount-transformer';
import { QUOTE_EXPIRATION_SECONDS } from '../constants';
import type { RouterParams, RouterRoute, RouteStep } from '../types';

// Jupiter API base URL
const JUPITER_API_BASE = 'https://quote-api.jup.ag/v6';

/**
 * Jupiter Router Adapter
 * 
 * Handles route fetching from Jupiter Aggregator API.
 * Supports Solana only (same-chain swaps).
 */
export class JupiterAdapter extends BaseRouter {
  name = 'jupiter';
  displayName = 'Jupiter';
  
  /**
   * Get router priority (lower = higher priority)
   * Jupiter is priority 1 (after LiFi, before PancakeSwap/Uniswap for Solana)
   */
  getPriority(): number {
    return 1;
  }
  
  /**
   * Get supported chains from Jupiter
   * Jupiter only supports Solana
   */
  async getSupportedChains(): Promise<number[]> {
    return [7565164]; // Solana canonical chain ID
  }
  
  /**
   * Check if Jupiter supports a specific chain
   */
  async supportsChain(chainId: number): Promise<boolean> {
    return chainId === 7565164; // Only Solana
  }
  
  /**
   * Jupiter only supports same-chain swaps (no cross-chain)
   */
  supportsCrossChain(): boolean {
    return false;
  }
  
  /**
   * Get route from Jupiter
   */
  async getRoute(params: RouterParams): Promise<RouterRoute | null> {
    try {
      // Validate parameters
      if (!params.fromChainId || !params.toChainId || !params.fromToken || !params.toToken || !params.fromAmount) {
        throw new Error('Missing required parameters');
      }
      
      // Ensure same chain (Jupiter doesn't support cross-chain)
      const fromChainId = typeof params.fromChainId === 'number' 
        ? params.fromChainId 
        : parseInt(String(params.fromChainId), 10);
      const toChainId = typeof params.toChainId === 'number'
        ? params.toChainId
        : parseInt(String(params.toChainId), 10);
      
      if (fromChainId !== toChainId) {
        return null; // Cross-chain not supported
      }
      
      if (fromChainId !== 7565164) {
        return null; // Only Solana supported
      }
      
      // Convert slippage to basis points (Jupiter uses basis points: 50 = 0.5%)
      const slippageBps = Math.round((params.slippage || 0.5) * 100);
      
      // Build Jupiter API request
      const quoteUrl = `${JUPITER_API_BASE}/quote?` + new URLSearchParams({
        inputMint: params.fromToken,
        outputMint: params.toToken,
        amount: params.fromAmount,
        slippageBps: slippageBps.toString(),
        onlyDirectRoutes: 'false',
        asLegacyTransaction: 'false',
      });
      
      console.log('[JupiterAdapter] Fetching quote from:', quoteUrl);
      
      // Fetch quote from Jupiter
      const quoteResponse = await fetch(quoteUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!quoteResponse.ok) {
        const errorText = await quoteResponse.text();
        console.error('[JupiterAdapter] Quote API error:', errorText);
        
        // If error indicates no route, return null (not an error)
        if (quoteResponse.status === 400 || quoteResponse.status === 404) {
          return null;
        }
        
        throw new Error(`Jupiter API error: ${quoteResponse.status} ${errorText}`);
      }
      
      const quote = await quoteResponse.json();
      console.log('[JupiterAdapter] Quote response:', quote);
      
      if (!quote || !quote.outAmount || quote.outAmount === '0') {
        return null; // No route found
      }
      
      // Use provided decimals from RouterParams
      const fromDecimals = params.fromDecimals;
      const toDecimals = params.toDecimals;
      
      // Calculate price impact (Jupiter provides this)
      const priceImpact = quote.priceImpactPct ? parseFloat(quote.priceImpactPct) * 100 : 0;
      
      // Normalize to RouterRoute format
      const normalizedRoute = this.normalizeRoute(
        fromChainId,
        toChainId,
        params.fromToken,
        params.toToken,
        params.fromAmount,
        quote.outAmount,
        fromDecimals,
        toDecimals,
        quote,
        priceImpact,
        params.slippage || 0.5
      );
      
      console.log('[JupiterAdapter] Normalized route:', normalizedRoute);
      return normalizedRoute;
    } catch (error: any) {
      // If error indicates no route, return null (not an error)
      if (error?.message?.includes('No route') || 
          error?.message?.includes('No route available') ||
          error?.message?.includes('400') ||
          error?.message?.includes('404')) {
        return null;
      }
      
      console.error('[JupiterAdapter] Error fetching route:', error);
      throw error;
    }
  }
  
  /**
   * Normalize Jupiter quote to RouterRoute format
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
    quote: any,
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
    
    // Build route steps from Jupiter route plan
    const steps: RouteStep[] = [];
    if (quote.routePlan && Array.isArray(quote.routePlan)) {
      for (const step of quote.routePlan) {
        steps.push({
          type: 'swap',
          chainId: fromChainId,
          fromToken: {
            address: step.swapInfo?.inputMint || fromTokenAddress,
            amount: step.swapInfo?.inAmount ? toHumanReadable(step.swapInfo.inAmount, fromDecimals) : '0',
            symbol: '',
          },
          toToken: {
            address: step.swapInfo?.outputMint || toTokenAddress,
            amount: step.swapInfo?.outAmount ? toHumanReadable(step.swapInfo.outAmount, toDecimals) : '0',
            symbol: '',
          },
          protocol: step.swapInfo?.label || 'Jupiter',
          description: `Swap via ${step.swapInfo?.label || 'Jupiter'}`,
        });
      }
    } else {
      // Single step swap
      steps.push({
        type: 'swap',
        chainId: fromChainId,
        fromToken: {
          address: fromTokenAddress,
          amount: fromAmountHuman,
        },
        toToken: {
          address: toTokenAddress,
          amount: toAmountHuman,
        },
        protocol: 'Jupiter',
        description: `Swap ${fromTokenAddress.slice(0, 6)}...${fromTokenAddress.slice(-4)} → ${toTokenAddress.slice(0, 6)}...${toTokenAddress.slice(-4)}`,
      });
    }
    
    // Estimate gas (Solana transaction fee is typically ~0.000005 SOL)
    const gasEstimate = '5000'; // lamports (0.000005 SOL)
    const gasUSD = '0.01'; // Approximate USD value
    
    return {
      router: this.name,
      routeId: `jupiter-${fromChainId}-${Date.now()}`,
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
        protocol: '0', // Jupiter has no protocol fee (only LP fees)
        gas: gasEstimate,
        gasUSD: gasUSD,
        tiwiProtocolFeeUSD: undefined, // Will be enriched by RouteService
        total: '0', // Will be enriched by RouteService
      },
      steps,
      estimatedTime: 0, // Same-chain swaps are instant
      expiresAt: Date.now() + (QUOTE_EXPIRATION_SECONDS * 1000),
      transactionData: quote.swapTransaction || undefined, // Jupiter provides swap transaction
      raw: quote, // Store raw quote for execution
    };
  }
}

