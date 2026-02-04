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
    
    // Check if toToken is native (needs unwrap at end)
    if (isNativeToken(toToken)) {
      const wrappedToken = getWrappedNativeToken(chainId);
      if (wrappedToken) {
        console.log(`[QuoteAggregator] Converting native toToken ${toToken} to wrapped ${wrappedToken} for chain ${chainId}`);
        routingToToken = wrappedToken;
        needsUnwrap = true;
      } else {
        console.warn(`[QuoteAggregator] No wrapped token found for chain ${chainId}, cannot convert native token`);
      }
    }
    
    // Check if fromToken is native (needs wrap at start, but we'll handle that in execution)
    if (isNativeToken(fromToken)) {
      const wrappedToken = getWrappedNativeToken(chainId);
      if (wrappedToken) {
        console.log(`[QuoteAggregator] Converting native fromToken ${fromToken} to wrapped ${wrappedToken} for chain ${chainId}`);
        routingFromToken = wrappedToken;
      } else {
        console.warn(`[QuoteAggregator] No wrapped token found for chain ${chainId}, cannot convert native token`);
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
      // Get token symbols from DexScreener (for better route finding)
      console.log(`[QuoteAggregator] 📍 STEP 1: Getting token symbols from DexScreener...`);
      const { getTokenPairs } = await import('../dexscreener-client');
      
      // CRITICAL FIX: For cross-chain swaps, toToken is on destination chain, not source chain
      const toTokenChainId = options.toChainId || chainId;
      const isCrossChain = toTokenChainId !== chainId;

      console.log(`[QuoteAggregator]   Fetching pairs for fromToken: ${fromToken} on chain ${chainId}`);
      const fromPairs = await getTokenPairs(fromToken, chainId);
      console.log(`[QuoteAggregator]   Found ${fromPairs.length} pairs for fromToken`);

      console.log(`[QuoteAggregator]   Fetching pairs for toToken: ${toToken} on chain ${toTokenChainId}${isCrossChain ? ' (CROSS-CHAIN)' : ''}`);
      const toPairs = await getTokenPairs(toToken, toTokenChainId);
      console.log(`[QuoteAggregator]   Found ${toPairs.length} pairs for toToken`);
      
      // Extract symbol from pairs (find the token in the pair)
      let fromTokenSymbol: string | undefined;
      if (fromPairs.length > 0) {
        const pair = fromPairs[0];
        if (pair.baseToken.address.toLowerCase() === fromToken.toLowerCase()) {
          fromTokenSymbol = pair.baseToken.symbol;
          console.log(`[QuoteAggregator]   ✅ FromToken symbol: ${fromTokenSymbol} (from baseToken)`);
        } else if (pair.quoteToken.address.toLowerCase() === fromToken.toLowerCase()) {
          fromTokenSymbol = pair.quoteToken.symbol;
          console.log(`[QuoteAggregator]   ✅ FromToken symbol: ${fromTokenSymbol} (from quoteToken)`);
        } else {
          console.log(`[QuoteAggregator]   ⚠️ FromToken address not found in pair (address mismatch?)`);
        }
      } else {
        console.log(`[QuoteAggregator]   ⚠️ No pairs found for fromToken, symbol will be undefined`);
      }
      
      let toTokenSymbol: string | undefined;
      if (toPairs.length > 0) {
        const pair = toPairs[0];
        if (pair.baseToken.address.toLowerCase() === toToken.toLowerCase()) {
          toTokenSymbol = pair.baseToken.symbol;
          console.log(`[QuoteAggregator]   ✅ ToToken symbol: ${toTokenSymbol} (from baseToken)`);
        } else if (pair.quoteToken.address.toLowerCase() === toToken.toLowerCase()) {
          toTokenSymbol = pair.quoteToken.symbol;
          console.log(`[QuoteAggregator]   ✅ ToToken symbol: ${toTokenSymbol} (from quoteToken)`);
        } else {
          console.log(`[QuoteAggregator]   ⚠️ ToToken address not found in pair (address mismatch?)`);
        }
      } else {
        console.log(`[QuoteAggregator]   ⚠️ No pairs found for toToken, symbol will be undefined`);
      }
      
      console.log(`[QuoteAggregator]   Final symbols: ${fromTokenSymbol || 'unknown'} → ${toTokenSymbol || 'unknown'}\n`);

      console.log(`[QuoteAggregator] 📍 STEP 2: Determining routing strategy...`);
      console.log(`[QuoteAggregator]   From Chain: ${chainId}`);
      console.log(`[QuoteAggregator]   To Chain: ${toTokenChainId}`);
      console.log(`[QuoteAggregator]   Is Cross-Chain: ${isCrossChain}`);

      // CRITICAL: Skip same-chain finder for cross-chain swaps
      // For cross-chain, we need to use either:
      // 1. Cross-chain finder (direct bridge)
      // 2. Multi-hop router (swap + bridge + swap)
      if (isCrossChain) {
        console.log(`[QuoteAggregator] ⚡ Cross-chain swap detected, skipping same-chain finder`);
        console.log(`[QuoteAggregator] Will try: cross-chain finder → multi-hop router`);
      } else {
        // Try same-chain route finder (only for same-chain swaps)
        console.log(`[QuoteAggregator] 📍 STEP 2a: Trying same-chain route finder...`);
        console.log(`[QuoteAggregator]   Parameters:`);
        console.log(`[QuoteAggregator]     fromToken: ${fromToken}`);
        console.log(`[QuoteAggregator]     toToken: ${toToken}`);
        console.log(`[QuoteAggregator]     chainId: ${chainId}`);
        console.log(`[QuoteAggregator]     amountIn: ${amountIn.toString()}`);
        console.log(`[QuoteAggregator]     fromTokenSymbol: ${fromTokenSymbol || 'unknown'}`);
        console.log(`[QuoteAggregator]     toTokenSymbol: ${toTokenSymbol || 'unknown'}`);
        console.log(`[QuoteAggregator]     minLiquidityUSD: ${options.minLiquidityUSD}`);

        const { getSameChainRouteFinder } = await import('../same-chain-finder');
        const sameChainFinder = getSameChainRouteFinder();

        const sameChainRoute = await sameChainFinder.findRoute(
          fromToken,
          toToken,
          chainId,
          amountIn,
          fromTokenSymbol,
          toTokenSymbol,
          options.minLiquidityUSD
        );

        if (sameChainRoute) {
        console.log(`[QuoteAggregator] ✅ Route found!`);
        console.log(`[QuoteAggregator]   Path: ${sameChainRoute.path.map(p => p.slice(0, 10) + '...').join(' → ')}`);
        console.log(`[QuoteAggregator]   Output: ${sameChainRoute.outputAmount.toString()}`);
        console.log(`[QuoteAggregator]   Hops: ${sameChainRoute.hops}`);
        console.log(`[QuoteAggregator]   DEX: ${sameChainRoute.dexId}\n`);
        
        // Convert to RouterRoute
        console.log(`[QuoteAggregator] 📍 STEP 3: Converting route to RouterRoute format...`);
        const { convertSameChainRouteToRouterRoute } = await import('../route-converter');
        const routerRoute = await convertSameChainRouteToRouterRoute(
          sameChainRoute,
          { address: fromToken, symbol: fromTokenSymbol },
          { address: toToken, symbol: toTokenSymbol },
          amountIn,
          chainId
        );
        console.log(`[QuoteAggregator]   ✅ Route converted\n`);
        
        // Convert to AggregatedQuote
        console.log(`[QuoteAggregator] 📍 STEP 4: Converting to AggregatedQuote...`);
        const quote = this.convertRouterRouteToQuote(
          routerRoute,
          options.gasPrice,
          options.inputTokenPriceUSD,
          options.outputTokenPriceUSD
        );
        console.log(`[QuoteAggregator]   ✅ Quote created`);
        console.log(`[QuoteAggregator]   Score: ${quote.score}`);
        console.log(`[QuoteAggregator]   Output Amount: ${quote.outputAmount}`);
        console.log(`[QuoteAggregator] ========================================\n`);

        return [quote];
        }
      } // End of same-chain-only block

      // If cross-chain, try cross-chain finder
      if (isCrossChain) {
        console.log(`[QuoteAggregator] 📍 STEP 2b: Same-chain route not found, trying cross-chain finder...`);
        console.log(`[QuoteAggregator]   From Chain: ${chainId}`);
        console.log(`[QuoteAggregator]   To Chain: ${options.toChainId}`);
        console.log(`[QuoteAggregator]   Recipient: ${options.recipient || 'NOT PROVIDED ⚠️'}`);
        console.log(`[QuoteAggregator]   FromAddress: ${options.fromAddress || 'NOT PROVIDED ⚠️'}`);

        const { getCrossChainRouteFinder } = await import('../cross-chain-finder');
        const crossChainFinder = getCrossChainRouteFinder();

        const crossChainRoute = await crossChainFinder.findRoute(
          fromToken,
          toToken,
          chainId,
          toTokenChainId, // Use toTokenChainId instead of options.toChainId
          amountIn,
          options.recipient,
          options.fromAddress // Pass fromAddress to cross-chain finder
        );

        if (crossChainRoute && crossChainRoute.totalOutput > BigInt(0)) {
          console.log(`[QuoteAggregator] ✅ Cross-chain route found!`);
          console.log(`[QuoteAggregator]   Total Output: ${crossChainRoute.totalOutput.toString()}`);

          // Convert to RouterRoute
          console.log(`[QuoteAggregator] 📍 STEP 3: Converting cross-chain route to RouterRoute format...`);
          const { convertCrossChainRouteToRouterRoute } = await import('../route-converter');
          const routerRoute = await convertCrossChainRouteToRouterRoute(
            crossChainRoute,
            { address: fromToken, symbol: fromTokenSymbol },
            { address: toToken, symbol: toTokenSymbol },
            amountIn,
            options.recipient
          );
          console.log(`[QuoteAggregator]   ✅ Route converted\n`);

          // Convert to AggregatedQuote
          console.log(`[QuoteAggregator] 📍 STEP 4: Converting to AggregatedQuote...`);
          const quote = this.convertRouterRouteToQuote(
            routerRoute,
            options.gasPrice,
            options.inputTokenPriceUSD,
            options.outputTokenPriceUSD
          );
          console.log(`[QuoteAggregator]   ✅ Quote created`);
          console.log(`[QuoteAggregator]   Score: ${quote.score}`);
          console.log(`[QuoteAggregator]   Output Amount: ${quote.outputAmount}`);
          console.log(`[QuoteAggregator] ========================================\n`);

          return [quote];
        } else {
          if (crossChainRoute) {
            console.log(`[QuoteAggregator] ❌ Cross-chain route found but output is 0 (invalid), falling through to multi-hop`);
          } else {
            console.log(`[QuoteAggregator] ❌ Cross-chain route not found`);
          }
        }
      }

      // If no direct route found, try multi-hop routing
      // Note: isCrossChain and toTokenChainId already declared above

      console.log(`[QuoteAggregator] 📍 STEP 2c: No direct route found, trying multi-hop routing...`);
      console.log(`[QuoteAggregator]   Type: ${isCrossChain ? 'CROSS-CHAIN' : 'SAME-CHAIN'} multi-hop`);
      console.log(`[QuoteAggregator]   From Chain: ${chainId}`);
      console.log(`[QuoteAggregator]   To Chain: ${toTokenChainId}`);
      console.log(`[QuoteAggregator]   This will find routes through intermediate tokens (USDT, USDC, WBNB, etc.)`);

      try {
        const { getMultiHopRouter } = await import('../multi-hop-router');
        const multiHopRouter = getMultiHopRouter();

        const multiHopRoute = await multiHopRouter.findMultiHopRoute(
          fromToken,
          toToken,
          chainId,
          toTokenChainId,
          amountIn.toString(),
          options.fromAddress
        );

        if (multiHopRoute) {
          console.log(`[QuoteAggregator] ✅ Multi-hop route found!`);
          if (multiHopRoute.bridgeRoute) {
            console.log(`[QuoteAggregator]   Type: CROSS-CHAIN multi-hop with bridge`);
            console.log(`[QuoteAggregator]   Hop 1 (source chain): ${multiHopRoute.hop1.router}`);
            console.log(`[QuoteAggregator]   Bridge: ${multiHopRoute.bridgeRoute.router}`);
            console.log(`[QuoteAggregator]   Hop 2 (dest chain): ${multiHopRoute.hop2.router}`);
          } else {
            console.log(`[QuoteAggregator]   Type: SAME-CHAIN multi-hop`);
            console.log(`[QuoteAggregator]   Path: ${fromToken.slice(0, 10)}... → ${multiHopRoute.intermediateToken.slice(0, 10)}... → ${toToken.slice(0, 10)}...`);
            console.log(`[QuoteAggregator]   Hop 1: ${multiHopRoute.hop1.router}`);
            console.log(`[QuoteAggregator]   Hop 2: ${multiHopRoute.hop2.router}`);
          }
          console.log(`[QuoteAggregator]   Total Output: ${multiHopRoute.totalOutputAmount}`);

          // Use the combined route (already in RouterRoute format)
          const quote = this.convertRouterRouteToQuote(
            multiHopRoute.combinedRoute,
            options.gasPrice,
            options.inputTokenPriceUSD,
            options.outputTokenPriceUSD
          );

          console.log(`[QuoteAggregator]   ✅ Multi-hop quote created`);
          console.log(`[QuoteAggregator]   Score: ${quote.score}`);
          console.log(`[QuoteAggregator]   Output Amount: ${quote.outputAmount}`);
          console.log(`[QuoteAggregator] ========================================\n`);

          return [quote];
        } else {
          console.log(`[QuoteAggregator] ❌ Multi-hop route not found`);
        }
      } catch (error) {
        console.error('[QuoteAggregator] ❌ Multi-hop routing error:', error);
        console.error('[QuoteAggregator] Error details:', error instanceof Error ? error.stack : String(error));
      }

      console.log(`[QuoteAggregator] ❌ No route found (tried same-chain, cross-chain, and multi-hop)`);
      console.log(`[QuoteAggregator] ========================================\n`);
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

