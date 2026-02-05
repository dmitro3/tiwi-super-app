/**
 * Quote Aggregator
 * 
 * Aggregates quotes from multiple sources:
 * - Universal routing system (new)
 * - Existing routers (PancakeSwap, Uniswap, LiFi, Jupiter)
 * 
 * This service combines all routes and ranks them to find the best option.
 */

import type { Address } from 'viem';
import type { UniversalRoute } from '../types';
import type { RouterRoute } from '@/lib/backend/routers/types';
// TODO: Replace with on-demand route finder

/**
 * Quote source
 */
export type QuoteSource = 'universal' | 'pancakeswap' | 'uniswap' | 'lifi' | 'jupiter' | 'other';

/**
 * Aggregated quote
 */
export interface AggregatedQuote {
  route: RouterRoute | UniversalRoute;
  source: QuoteSource;
  score: number;
  outputAmount: string;
  outputAmountUSD: string;
  totalCostUSD: string;
  priceImpact: number;
  gasEstimate: bigint;
  gasUSD: string;
}

/**
 * Quote aggregation options
 */
export interface QuoteAggregationOptions {
  includeUniversalRouting?: boolean; // Include new universal routing
  includeExistingRouters?: boolean; // Include existing routers
  maxQuotes?: number; // Maximum quotes to return
  minLiquidityUSD?: number; // Minimum liquidity threshold
  gasPrice?: bigint; // Gas price for cost calculation
  inputTokenPriceUSD?: number;
  outputTokenPriceUSD?: number;
  recipient?: Address; // Recipient address (for cross-chain)
  fromAddress?: Address; // User's wallet address (for LiFi)
  toChainId?: number; // Destination chain ID (for cross-chain detection)
}

/**
 * Quote Aggregator Service
 * 
 * Aggregates quotes from multiple sources and ranks them.
 */
export class QuoteAggregator {
  // TODO: Replace with on-demand route finder
  constructor() {
    // Old graph builder removed, will be replaced with on-demand finder
  }
  
  /**
   * Aggregate quotes from all sources
   * 
   * @param fromToken Source token
   * @param toToken Target token
   * @param chainId Chain ID
   * @param amountIn Input amount
   * @param existingRoutes Routes from existing routers (optional)
   * @param options Aggregation options
   * @returns Array of aggregated quotes, sorted by score
   */
  async aggregateQuotes(
    fromToken: Address,
    toToken: Address,
    chainId: number,
    amountIn: bigint,
    existingRoutes: RouterRoute[] = [],
    options: QuoteAggregationOptions = {},
    toChainId?: number // Optional: for cross-chain swaps
  ): Promise<AggregatedQuote[]> {
    const {
      includeUniversalRouting = true,
      includeExistingRouters = true,
      maxQuotes = 5,
      minLiquidityUSD = 0,
      gasPrice,
      inputTokenPriceUSD,
      outputTokenPriceUSD,
    } = options;
    
    // Convert native tokens to wrapped tokens for routing
    // Native tokens (0x0000...0000) can't be in DEX pairs, need wrapped versions
    const { isNativeToken, getWrappedNativeToken } = await import('@/lib/backend/utils/token-address-helper');

    let routingFromToken = fromToken;
    let routingToToken = toToken;
    let needsUnwrap = false;

    // Check both tokens at once (no need for separate if blocks)
    const toIsNative = isNativeToken(toToken);
    const fromIsNative = isNativeToken(fromToken);

    if (toIsNative) {
      const wrappedToken = getWrappedNativeToken(chainId);
      if (wrappedToken) {
        routingToToken = wrappedToken;
        needsUnwrap = true;
      }
    }

    if (fromIsNative) {
      const wrappedToken = getWrappedNativeToken(chainId);
      if (wrappedToken) {
        routingFromToken = wrappedToken;
      }
    }
    
    const quotes: AggregatedQuote[] = [];
    
    // 1. Get quotes from universal routing (new system)
    // Use wrapped tokens for routing
    if (includeUniversalRouting) {
      try {
        console.log(`[QuoteAggregator] 📍 Calling getUniversalRoutes with:`);
        console.log(`[QuoteAggregator]   recipient: ${options.recipient || 'NOT PROVIDED ⚠️'}`);
        console.log(`[QuoteAggregator]   fromAddress: ${options.fromAddress || 'NOT PROVIDED ⚠️'}`);
        console.log(`[QuoteAggregator]   toChainId: ${options.toChainId || 'NOT PROVIDED (assuming same-chain)'}`);
        
        const universalQuotes = await this.getUniversalRoutes(
          routingFromToken,
          routingToToken,
          chainId,
          amountIn,
          {
            minLiquidityUSD,
            gasPrice,
            inputTokenPriceUSD,
            outputTokenPriceUSD,
            needsUnwrap, // Pass flag so route can add unwrap step if needed
            recipient: options.recipient,
            fromAddress: options.fromAddress,
            toChainId: options.toChainId, // Pass toChainId for cross-chain detection
          }
        );
        quotes.push(...universalQuotes);
      } catch (error) {
        console.warn('[QuoteAggregator] Universal routing failed:', error);
        // Continue with other sources
      }
    }
    
    // 2. Get quotes from existing routers
    if (includeExistingRouters && existingRoutes.length > 0) {
      const existingQuotes = this.convertExistingRoutes(
        existingRoutes,
        gasPrice,
        inputTokenPriceUSD,
        outputTokenPriceUSD
      );
      quotes.push(...existingQuotes);
    }
    
    // 3. Rank and sort quotes
    const rankedQuotes = this.rankQuotes(quotes);
    
    // 4. Return top N quotes
    return rankedQuotes.slice(0, maxQuotes);
  }
  
  /**
   * Get routes from universal routing system
   * 
   * Uses on-demand route finders (Phase 6-7):
   * - Same-chain: SameChainRouteFinder
   * - Cross-chain: CrossChainRouteFinder
   */
  private async getUniversalRoutes(
    fromToken: Address,
    toToken: Address,
    chainId: number,
    amountIn: bigint,
    options: {
      minLiquidityUSD: number;
      gasPrice?: bigint;
      inputTokenPriceUSD?: number;
      outputTokenPriceUSD?: number;
      needsUnwrap?: boolean; // If true, add unwrap step at end
      recipient?: Address; // Recipient address (for cross-chain)
      fromAddress?: Address; // User's wallet address (for LiFi)
      toChainId?: number; // Destination chain ID (for cross-chain)
    }
  ): Promise<AggregatedQuote[]> {
    console.log(`\n[QuoteAggregator] ========================================`);
    console.log(`[QuoteAggregator] 🎯 GETTING UNIVERSAL ROUTES`);
    console.log(`[QuoteAggregator] From: ${fromToken} on chain ${chainId}`);
    console.log(`[QuoteAggregator] To: ${toToken} on chain ${chainId}`);
    console.log(`[QuoteAggregator] Amount In: ${amountIn.toString()}`);
    console.log(`[QuoteAggregator] Min Liquidity: $${options.minLiquidityUSD.toLocaleString()}`);
    console.log(`[QuoteAggregator] ========================================\n`);
    
    try {
      // CRITICAL FIX: For cross-chain swaps, toToken is on destination chain, not source chain
      const toTokenChainId = options.toChainId || chainId;
      const isCrossChain = toTokenChainId !== chainId;

      const fromTokenSymbol: string | undefined = undefined;
      const toTokenSymbol: string | undefined = undefined;

      console.log(`[QuoteAggregator] 📍 STEP 2: Determining routing strategy...`);
      console.log(`[QuoteAggregator]   From Chain: ${chainId}`);
      console.log(`[QuoteAggregator]   To Chain: ${toTokenChainId}`);
      console.log(`[QuoteAggregator]   Is Cross-Chain: ${isCrossChain}`);

      // Pre-import modules upfront (avoids repeated dynamic imports)
      const [
        { getSameChainRouteFinder },
        { getCrossChainRouteFinder },
        { getMultiHopRouter },
        { convertSameChainRouteToRouterRoute, convertCrossChainRouteToRouterRoute },
      ] = await Promise.all([
        import('../same-chain-finder'),
        import('../cross-chain-finder'),
        import('../multi-hop-router'),
        import('../route-converter'),
      ]);

      const startTime = Date.now();

      if (isCrossChain) {
        // CROSS-CHAIN: Run cross-chain finder AND multi-hop router in PARALLEL
        console.log(`[QuoteAggregator] ⚡ Cross-chain: running cross-chain finder + multi-hop in parallel`);

        const crossChainFinder = getCrossChainRouteFinder();
        const multiHopRouter = getMultiHopRouter();

        const [crossChainResult, multiHopResult] = await Promise.allSettled([
          // Cross-chain finder (direct bridge)
          crossChainFinder.findRoute(
            fromToken, toToken, chainId, toTokenChainId,
            amountIn, options.recipient, options.fromAddress
          ),
          // Multi-hop router (swap + bridge + swap)
          multiHopRouter.findMultiHopRoute(
            fromToken, toToken, chainId, toTokenChainId,
            amountIn.toString(), options.fromAddress
          ),
        ]);

        console.log(`[QuoteAggregator] ⚡ Parallel cross-chain search took ${Date.now() - startTime}ms`);

        // Collect all valid quotes
        const crossChainQuotes: AggregatedQuote[] = [];

        // Process cross-chain finder result
        if (crossChainResult.status === 'fulfilled' && crossChainResult.value && crossChainResult.value.totalOutput > BigInt(0)) {
          const routerRoute = await convertCrossChainRouteToRouterRoute(
            crossChainResult.value,
            { address: fromToken, symbol: fromTokenSymbol },
            { address: toToken, symbol: toTokenSymbol },
            amountIn, options.recipient
          );
          crossChainQuotes.push(this.convertRouterRouteToQuote(
            routerRoute, options.gasPrice, options.inputTokenPriceUSD, options.outputTokenPriceUSD
          ));
          console.log(`[QuoteAggregator] ✅ Cross-chain finder returned quote`);
        }

        // Process multi-hop result
        if (multiHopResult.status === 'fulfilled' && multiHopResult.value) {
          crossChainQuotes.push(this.convertRouterRouteToQuote(
            multiHopResult.value.combinedRoute, options.gasPrice,
            options.inputTokenPriceUSD, options.outputTokenPriceUSD
          ));
          console.log(`[QuoteAggregator] ✅ Multi-hop router returned quote`);
        }

        if (crossChainQuotes.length > 0) {
          // Return best quote (highest output)
          crossChainQuotes.sort((a, b) => parseFloat(b.outputAmount) - parseFloat(a.outputAmount));
          console.log(`[QuoteAggregator] ✅ Returning best of ${crossChainQuotes.length} cross-chain quotes (${Date.now() - startTime}ms total)`);
          return crossChainQuotes;
        }

        console.log(`[QuoteAggregator] ❌ No cross-chain route found`);
      } else {
        // SAME-CHAIN: Run same-chain finder AND multi-hop in PARALLEL
        console.log(`[QuoteAggregator] ⚡ Same-chain: running finder + multi-hop in parallel`);

        const sameChainFinder = getSameChainRouteFinder();
        const multiHopRouter = getMultiHopRouter();

        const [sameChainResult, multiHopResult] = await Promise.allSettled([
          // Direct same-chain finder
          sameChainFinder.findRoute(
            fromToken, toToken, chainId, amountIn,
            fromTokenSymbol, toTokenSymbol
          ),
          // Multi-hop router (through intermediaries)
          multiHopRouter.findMultiHopRoute(
            fromToken, toToken, chainId, chainId,
            amountIn.toString(), options.fromAddress
          ),
        ]);

        console.log(`[QuoteAggregator] ⚡ Parallel same-chain search took ${Date.now() - startTime}ms`);

        const sameChainQuotes: AggregatedQuote[] = [];

        // Process same-chain finder result
        if (sameChainResult.status === 'fulfilled' && sameChainResult.value) {
          const routerRoute = await convertSameChainRouteToRouterRoute(
            sameChainResult.value,
            { address: fromToken, symbol: fromTokenSymbol },
            { address: toToken, symbol: toTokenSymbol },
            amountIn, chainId
          );
          sameChainQuotes.push(this.convertRouterRouteToQuote(
            routerRoute, options.gasPrice, options.inputTokenPriceUSD, options.outputTokenPriceUSD
          ));
          console.log(`[QuoteAggregator] ✅ Same-chain finder returned quote`);
        }

        // Process multi-hop result
        if (multiHopResult.status === 'fulfilled' && multiHopResult.value) {
          sameChainQuotes.push(this.convertRouterRouteToQuote(
            multiHopResult.value.combinedRoute, options.gasPrice,
            options.inputTokenPriceUSD, options.outputTokenPriceUSD
          ));
          console.log(`[QuoteAggregator] ✅ Multi-hop router returned quote`);
        }

        if (sameChainQuotes.length > 0) {
          sameChainQuotes.sort((a, b) => parseFloat(b.outputAmount) - parseFloat(a.outputAmount));
          console.log(`[QuoteAggregator] ✅ Returning best of ${sameChainQuotes.length} same-chain quotes (${Date.now() - startTime}ms total)`);
          return sameChainQuotes;
        }

        console.log(`[QuoteAggregator] ❌ No same-chain route found`);
      }

      console.log(`[QuoteAggregator] ❌ No route found (${Date.now() - startTime}ms total)`);
      return [];
    } catch (error) {
      console.error('[QuoteAggregator] ❌ Error getting universal routes:', error);
      console.error('[QuoteAggregator] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.log(`[QuoteAggregator] ========================================\n`);
      return [];
    }
  }
  
  /**
   * Convert RouterRoute to AggregatedQuote
   */
  private convertRouterRouteToQuote(
    route: RouterRoute,
    gasPrice?: bigint,
    inputTokenPriceUSD?: number,
    outputTokenPriceUSD?: number
  ): AggregatedQuote {
    const score = this.calculateRouteScore(route, gasPrice, inputTokenPriceUSD, outputTokenPriceUSD);
    
    return {
      route,
      source: 'universal',
      score,
      outputAmount: route.toToken.amount,
      outputAmountUSD: route.toToken.amountUSD || '0.00',
      totalCostUSD: route.fees.total || '0.00',
      priceImpact: parseFloat(route.priceImpact?.toString() || '0'),
      gasEstimate: BigInt(route.fees.gas || '0'),
      gasUSD: route.fees.gasUSD || '0.00',
    };
  }
  
  
  /**
   * Convert existing router routes to aggregated quotes
   */
  private convertExistingRoutes(
    routes: RouterRoute[],
    gasPrice?: bigint,
    inputTokenPriceUSD?: number,
    outputTokenPriceUSD?: number
  ): AggregatedQuote[] {
    return routes.map(route => {
      // Calculate score for existing routes
      const score = this.calculateRouteScore(route, gasPrice, inputTokenPriceUSD, outputTokenPriceUSD);
      
      return {
        route,
        source: this.getRouteSource(route.router),
        score,
        outputAmount: route.toToken.amount,
        outputAmountUSD: route.toToken.amountUSD || '0.00',
        totalCostUSD: route.fees.total || '0.00',
        priceImpact: parseFloat(route.priceImpact?.toString() || '0'),
        gasEstimate: BigInt(route.fees.gas || '0'),
        gasUSD: route.fees.gasUSD || '0.00',
      };
    });
  }
  
  /**
   * Calculate score for an existing route
   */
  private calculateRouteScore(
    route: RouterRoute,
    gasPrice?: bigint,
    inputTokenPriceUSD?: number,
    outputTokenPriceUSD?: number
  ): number {
    // Extract values
    const outputAmount = parseFloat(route.toToken.amount || '0');
    const outputUSD = parseFloat(route.toToken.amountUSD || '0');
    const inputUSD = parseFloat(route.fromToken.amountUSD || '0');
    const gasUSD = parseFloat(route.fees.gasUSD || '0');
    const protocolFees = parseFloat(route.fees.protocol || '0');
    const priceImpact = parseFloat(route.priceImpact?.toString() || '0');
    
    // Calculate net value
    const totalCost = gasUSD + protocolFees + (inputUSD * priceImpact / 100);
    const netValue = outputUSD - inputUSD - totalCost;
    
    return netValue;
  }
  
  /**
   * Get quote source from router name
   */
  private getRouteSource(router: string): QuoteSource {
    const routerLower = router.toLowerCase();
    if (routerLower.includes('pancake')) return 'pancakeswap';
    if (routerLower.includes('uniswap')) return 'uniswap';
    if (routerLower.includes('lifi')) return 'lifi';
    if (routerLower.includes('jupiter')) return 'jupiter';
    if (routerLower.includes('universal')) return 'universal';
    return 'other';
  }
  
  /**
   * Rank quotes by score
   */
  private rankQuotes(quotes: AggregatedQuote[]): AggregatedQuote[] {
    return quotes.sort((a, b) => {
      // Primary: score (higher is better)
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      
      // Secondary: output amount (higher is better)
      const outputA = parseFloat(a.outputAmount);
      const outputB = parseFloat(b.outputAmount);
      if (outputB !== outputA) {
        return outputB - outputA;
      }
      
      // Tertiary: lower price impact is better
      return a.priceImpact - b.priceImpact;
    });
  }
  
  /**
   * Get best quote (highest score)
   */
  async getBestQuote(
    fromToken: Address,
    toToken: Address,
    chainId: number,
    amountIn: bigint,
    existingRoutes: RouterRoute[] = [],
    options: QuoteAggregationOptions = {}
  ): Promise<AggregatedQuote | null> {
    const quotes = await this.aggregateQuotes(
      fromToken,
      toToken,
      chainId,
      amountIn,
      existingRoutes,
      { ...options, maxQuotes: 1 }
    );
    
    return quotes.length > 0 ? quotes[0] : null;
  }
}

// Singleton instance
let quoteAggregatorInstance: QuoteAggregator | null = null;

/**
 * Get singleton QuoteAggregator instance
 */
export function getQuoteAggregator(): QuoteAggregator {
  if (!quoteAggregatorInstance) {
    quoteAggregatorInstance = new QuoteAggregator();
  }
  return quoteAggregatorInstance;
}

