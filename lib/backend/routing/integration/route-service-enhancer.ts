/**
 * Route Service Enhancer
 * 
 * Optional enhancement to RouteService that adds universal routing.
 * This is opt-in and doesn't modify the existing RouteService.
 */

import type { RouteRequest, RouteResponse } from '@/lib/backend/routers/types';
import { getQuoteAggregator } from '../quote-aggregator/quote-aggregator';
import { getRouteValidator } from '../quote-aggregator/route-validator';
import type { Address } from 'viem';
import { getAddress } from 'viem';

/**
 * Enhanced route response with universal routing
 */
export interface EnhancedRouteResponse extends RouteResponse {
  sources?: string[]; // Which sources provided routes
  universalRoutingEnabled?: boolean; // Whether universal routing was used
}

/**
 * Route Service Enhancer
 * 
 * Enhances existing RouteService with universal routing capabilities.
 * This is a wrapper that can be used optionally.
 */
export class RouteServiceEnhancer {
  private quoteAggregator = getQuoteAggregator();
  private routeValidator = getRouteValidator();
  
  /**
   * Get enhanced route with universal routing
   * 
   * This method:
   * 1. Gets routes from existing RouteService (existing routers)
   * 2. Gets routes from universal routing system
   * 3. Aggregates and ranks all routes
   * 4. Returns the best route
   * 
   * @param request Route request
   * @param existingRouteResponse Response from existing RouteService
   * @param options Enhancement options
   * @returns Enhanced route response
   */
  async enhanceRoute(
    request: RouteRequest,
    existingRouteResponse: RouteResponse,
    options: {
      enableUniversalRouting?: boolean;
      preferUniversalRouting?: boolean; // Prefer universal routing over existing
      gasPrice?: bigint;
      inputTokenPriceUSD?: number;
      outputTokenPriceUSD?: number;
    } = {}
  ): Promise<EnhancedRouteResponse> {
    console.log(`\n[RouteServiceEnhancer] ========================================`);
    console.log(`[RouteServiceEnhancer] 🚀 ENHANCING ROUTE`);
    console.log(`[RouteServiceEnhancer] Request Parameters:`);
    console.log(`[RouteServiceEnhancer]   From: ${request.fromToken.address} (chain ${request.fromToken.chainId})`);
    console.log(`[RouteServiceEnhancer]   To: ${request.toToken.address} (chain ${request.toToken.chainId})`);
    console.log(`[RouteServiceEnhancer]   Amount: ${request.fromAmount}`);
    console.log(`[RouteServiceEnhancer]   FromAddress: ${request.fromAddress || 'NOT PROVIDED'}`);
    console.log(`[RouteServiceEnhancer]   Recipient: ${request.recipient || 'NOT PROVIDED'}`);
    console.log(`[RouteServiceEnhancer]   Slippage: ${request.slippage || 'default'}`);
    console.log(`[RouteServiceEnhancer] Options:`);
    console.log(`[RouteServiceEnhancer]   enableUniversalRouting: ${options.enableUniversalRouting ?? true}`);
    console.log(`[RouteServiceEnhancer]   preferUniversalRouting: ${options.preferUniversalRouting ?? false}`);
    console.log(`[RouteServiceEnhancer] Existing Route Response:`);
    console.log(`[RouteServiceEnhancer]   Route: ${existingRouteResponse.route ? existingRouteResponse.route.router : 'null'}`);
    console.log(`[RouteServiceEnhancer]   Alternatives: ${existingRouteResponse.alternatives?.length || 0}`);
    console.log(`[RouteServiceEnhancer] ========================================\n`);
    
    const {
      enableUniversalRouting = true,
      preferUniversalRouting = false,
      gasPrice,
      inputTokenPriceUSD,
      outputTokenPriceUSD,
    } = options;
    
    // If universal routing is disabled, return existing response as-is
    if (!enableUniversalRouting) {
      console.log(`[RouteServiceEnhancer] ⚠️ Universal routing disabled, returning existing response`);
      return {
        ...existingRouteResponse,
        sources: [existingRouteResponse.route?.router || 'unknown'],
        universalRoutingEnabled: false,
      };
    }
    
    try {
      // Prepare parameters for quote aggregation
      const fromToken = getAddress(request.fromToken.address);
      const toToken = getAddress(request.toToken.address);
      const chainId = request.fromToken.chainId;
      const toChainId = request.toToken.chainId;
      const isCrossChain = chainId !== toChainId;
      
      console.log(`[RouteServiceEnhancer] 📍 Preparing parameters...`);
      console.log(`[RouteServiceEnhancer]   FromToken: ${fromToken}`);
      console.log(`[RouteServiceEnhancer]   ToToken: ${toToken}`);
      console.log(`[RouteServiceEnhancer]   ChainId: ${chainId}`);
      console.log(`[RouteServiceEnhancer]   ToChainId: ${toChainId}`);
      console.log(`[RouteServiceEnhancer]   IsCrossChain: ${isCrossChain}`);
      
      // CRITICAL FIX: Convert human-readable amount to smallest unit before BigInt
      // request.fromAmount is a decimal string (e.g., "0.010689481219786505")
      // We need to convert it to smallest unit using token decimals
      const fromDecimals = request.fromToken.decimals ?? 18; // Default to 18 if not provided
      console.log(`[RouteServiceEnhancer]   FromDecimals: ${fromDecimals}`);
      console.log(`[RouteServiceEnhancer]   FromAmount (human-readable): ${request.fromAmount}`);
      
      const { toSmallestUnit } = await import('@/lib/backend/routers/transformers/amount-transformer');
      const fromAmountSmallest = toSmallestUnit(request.fromAmount, fromDecimals);
      const amountIn = BigInt(fromAmountSmallest);
      console.log(`[RouteServiceEnhancer]   AmountIn (smallest unit): ${amountIn.toString()}`);
      
      // Get existing routes
      const existingRoutes = existingRouteResponse.route
        ? [existingRouteResponse.route]
        : [];
      
      if (existingRouteResponse.alternatives) {
        existingRoutes.push(...existingRouteResponse.alternatives);
      }
      
      console.log(`[RouteServiceEnhancer]   Existing routes: ${existingRoutes.length}`);
      existingRoutes.forEach((route, idx) => {
        console.log(`[RouteServiceEnhancer]     ${idx + 1}. ${route.router} - ${route.toToken.amount} output`);
      });
      
      // Aggregate quotes
      console.log(`[RouteServiceEnhancer] 📍 Calling QuoteAggregator.aggregateQuotes...`);
      console.log(`[RouteServiceEnhancer]   Parameters being passed:`);
      console.log(`[RouteServiceEnhancer]     fromToken: ${fromToken}`);
      console.log(`[RouteServiceEnhancer]     toToken: ${toToken}`);
      console.log(`[RouteServiceEnhancer]     chainId: ${chainId}`);
      console.log(`[RouteServiceEnhancer]     amountIn: ${amountIn.toString()}`);
      console.log(`[RouteServiceEnhancer]     existingRoutes: ${existingRoutes.length}`);
      console.log(`[RouteServiceEnhancer]     options:`, {
        includeUniversalRouting: true,
        includeExistingRouters: true,
        maxQuotes: 5,
        minLiquidityUSD: 0,
        gasPrice: gasPrice?.toString(),
        inputTokenPriceUSD,
        outputTokenPriceUSD,
      });
      
      // Pass recipient and fromAddress for cross-chain routes
      console.log(`[RouteServiceEnhancer]   Recipient: ${request.recipient || 'NOT PROVIDED'}`);
      console.log(`[RouteServiceEnhancer]   FromAddress: ${request.fromAddress || 'NOT PROVIDED'}`);
      
      const aggregatedQuotes = await this.quoteAggregator.aggregateQuotes(
        fromToken,
        toToken,
        chainId,
        amountIn,
        existingRoutes,
        {
          includeUniversalRouting: true,
          includeExistingRouters: true,
          maxQuotes: 5,
          gasPrice,
          inputTokenPriceUSD,
          outputTokenPriceUSD,
          recipient: request.recipient ? getAddress(request.recipient) : undefined,
          fromAddress: request.fromAddress ? getAddress(request.fromAddress) : undefined,
          toChainId, // Pass toChainId for cross-chain detection
        },
        toChainId // Also pass as separate parameter for backward compatibility
      );
      
      console.log(`[RouteServiceEnhancer] 📊 QuoteAggregator returned ${aggregatedQuotes.length} quote(s)`);
      aggregatedQuotes.forEach((quote, idx) => {
        console.log(`[RouteServiceEnhancer]   Quote ${idx + 1}:`);
        console.log(`[RouteServiceEnhancer]     Source: ${quote.source}`);
        console.log(`[RouteServiceEnhancer]     Router: ${(quote.route as any).router || 'unknown'}`);
        console.log(`[RouteServiceEnhancer]     Output: ${quote.outputAmount}`);
        console.log(`[RouteServiceEnhancer]     Score: ${quote.score}`);
      });
      
      if (aggregatedQuotes.length === 0) {
        console.log(`[RouteServiceEnhancer] ❌ No quotes found from QuoteAggregator`);
        console.log(`[RouteServiceEnhancer] Returning existing response...`);
        // No quotes found, return existing response
        return {
          ...existingRouteResponse,
          sources: existingRoutes.map(r => r.router),
          universalRoutingEnabled: false,
        };
      }
      
      // Get best quote
      const bestQuote = aggregatedQuotes[0];
      
      // Validate the route
      const validation = this.routeValidator.validateRoute(bestQuote.route);
      
      if (!validation.isValid) {
        console.warn('[RouteServiceEnhancer] Best route failed validation:', validation.errors);
        
        // Try next best route
        for (let i = 1; i < aggregatedQuotes.length; i++) {
          const quote = aggregatedQuotes[i];
          const quoteValidation = this.routeValidator.validateRoute(quote.route);
          if (quoteValidation.isValid) {
            return this.buildEnhancedResponse(quote, aggregatedQuotes, existingRouteResponse);
          }
        }
        
        // All routes invalid, return existing response
        return {
          ...existingRouteResponse,
          sources: existingRoutes.map(r => r.router),
          universalRoutingEnabled: false,
        };
      }
      
      // Check if we should prefer universal routing
      if (preferUniversalRouting && bestQuote.source === 'universal') {
        return this.buildEnhancedResponse(bestQuote, aggregatedQuotes, existingRouteResponse);
      }
      
      // Compare with existing route
      const existingRoute = existingRouteResponse.route;
      if (existingRoute) {
        const existingOutput = parseFloat(existingRoute.toToken.amount || '0');
        const newOutput = parseFloat(bestQuote.outputAmount);

        // Use new route if it's better (higher output)
        if (newOutput > existingOutput * 1.01) {
          // New route is at least 1% better
          console.log(`[RouteServiceEnhancer] ✅ New route is better: ${newOutput} vs ${existingOutput}`);
          return this.buildEnhancedResponse(bestQuote, aggregatedQuotes, existingRouteResponse);
        }

        // Use existing route if it's better or similar
        return {
          ...existingRouteResponse,
          sources: aggregatedQuotes.map(q => q.source),
          universalRoutingEnabled: bestQuote.source === 'universal',
        };
      }

      // No existing route - use the new route from quote aggregator
      console.log(`[RouteServiceEnhancer] ✅ No existing route, using new route from QuoteAggregator`);
      return this.buildEnhancedResponse(bestQuote, aggregatedQuotes, existingRouteResponse);
    } catch (error) {
      console.error('[RouteServiceEnhancer] Error enhancing route:', error);
      
      // On error, return existing response
      return {
        ...existingRouteResponse,
        sources: [existingRouteResponse.route?.router || 'unknown'],
        universalRoutingEnabled: false,
      };
    }
  }
  
  /**
   * Build enhanced response from aggregated quote
   */
  private buildEnhancedResponse(
    bestQuote: any,
    allQuotes: any[],
    existingResponse: RouteResponse
  ): EnhancedRouteResponse {
    // Convert UniversalRoute to RouterRoute format if needed
    const route = this.convertToRouterRoute(bestQuote.route);
    
    // Build alternatives from other quotes
    const alternatives = allQuotes
      .slice(1, 4) // Top 3 alternatives
      .map(q => this.convertToRouterRoute(q.route))
      .filter(r => r !== null);
    
    return {
      route,
      alternatives: alternatives.length > 0 ? alternatives : undefined,
      timestamp: Date.now(),
      expiresAt: bestQuote.route.expiresAt || Date.now() + 60000,
      sources: allQuotes.map(q => q.source),
      universalRoutingEnabled: bestQuote.source === 'universal',
    };
  }
  
  /**
   * Convert UniversalRoute to RouterRoute format
   */
  private convertToRouterRoute(route: any): any {
    // If it's already a RouterRoute, return as-is
    if (route.router && route.fromToken && route.toToken) {
      return route;
    }
    
    // Convert UniversalRoute to RouterRoute
    return {
      router: 'universal',
      routeId: route.routeId || `universal-${Date.now()}`,
      fromToken: route.fromToken,
      toToken: route.toToken,
      priceImpact: route.priceImpact,
      gasEstimate: route.gasEstimate,
      fees: route.fees,
      steps: route.steps || [],
      slippage: '0.5', // Default slippage
      expiresAt: route.expiresAt,
      raw: route,
    };
  }
}

// Singleton instance
let routeServiceEnhancerInstance: RouteServiceEnhancer | null = null;

/**
 * Get singleton RouteServiceEnhancer instance
 */
export function getRouteServiceEnhancer(): RouteServiceEnhancer {
  if (!routeServiceEnhancerInstance) {
    routeServiceEnhancerInstance = new RouteServiceEnhancer();
  }
  return routeServiceEnhancerInstance;
}

