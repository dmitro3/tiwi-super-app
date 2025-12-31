/**
 * LiFi Router Adapter
 * 
 * Implements SwapRouter interface for LiFi Advanced Routes.
 * Uses @lifi/sdk for route fetching and quote generation.
 */

import { getQuote, getRoutes, type RouteExtended, type LiFiStep } from '@lifi/sdk';
import { BaseRouter } from '../base';
import { ChainTransformer } from '../transformers/chain-transformer';
import { toHumanReadable } from '../transformers/amount-transformer';
import { QUOTE_EXPIRATION_SECONDS } from '../constants';
import { getCanonicalChain, getCanonicalChainByProviderId } from '@/lib/backend/registry/chains';
import type { RouterParams, RouterRoute, RouteStep } from '../types';

/**
 * LiFi Router Adapter
 * 
 * Handles route fetching from LiFi Advanced Routes API.
 * Supports same-chain and cross-chain swaps.
 */
export class LiFiAdapter extends BaseRouter {
  name = 'lifi';
  displayName = 'LiFi';
  
  /**
   * Get router priority (lower = higher priority)
   * LiFi is high priority (0) as it's our primary router
   */
  getPriority(): number {
    return 0;
  }
  
  /**
   * Get supported chains from LiFi
   * Returns canonical chain IDs that LiFi supports
   */
  async getSupportedChains(): Promise<number[]> {
    try {
      // Get all canonical chains
      const { getCanonicalChains } = await import('@/lib/backend/registry/chains');
      const canonicalChains = getCanonicalChains();
      
      // Filter chains that have LiFi provider ID
      return canonicalChains
        .filter(chain => chain.providerIds.lifi !== null && chain.providerIds.lifi !== undefined)
        .map(chain => chain.id);
    } catch (error) {
      console.error('[LiFiAdapter] Error getting supported chains:', error);
      return [];
    }
  }
  
  /**
   * Check if LiFi supports a specific chain
   */
  async supportsChain(chainId: number): Promise<boolean> {
    const canonicalChain = getCanonicalChain(chainId);
    if (!canonicalChain) return false;
    
    return canonicalChain.providerIds.lifi !== null && 
           canonicalChain.providerIds.lifi !== undefined;
  }
  
  /**
   * LiFi supports cross-chain swaps
   */
  supportsCrossChain(): boolean {
    return true;
  }
  
  /**
   * Get route from LiFi
   */
  async getRoute(params: RouterParams): Promise<RouterRoute | null> {
    try {
      // Validate parameters
      if (!params.fromChainId || !params.toChainId || !params.fromToken || !params.toToken || !params.fromAmount) {
        throw new Error('Missing required parameters');
      }
      
      // Ensure chain IDs are numbers (LiFi uses numeric chain IDs)
      const fromChainId = typeof params.fromChainId === 'number' 
        ? params.fromChainId 
        : parseInt(String(params.fromChainId), 10);
      const toChainId = typeof params.toChainId === 'number'
        ? params.toChainId
        : parseInt(String(params.toChainId), 10);
      
      if (isNaN(fromChainId) || isNaN(toChainId)) {
        throw new Error('Invalid chain IDs');
      }
      
      // Try getQuote first (preferred method)
      let lifiRoute: RouteExtended | null = null;
      
      try {
        console.log("🚀 ~ LiFiAdapter ~ getRoute ~ params:", {
          fromChain: fromChainId,
          fromToken: params.fromToken,
          fromAmount: params.fromAmount,
          toChain: toChainId,
          toToken: params.toToken,
          toAddress: params.recipient,
          order: this.mapOrderPreference(params.order),
          slippage: params.slippage || 0.5
        });

        
        const quote: LiFiStep = await getQuote({
          fromChain: fromChainId,
          fromToken: params.fromToken,
          fromAmount: params.fromAmount,
          toChain: toChainId,
          toToken: params.toToken,
          toAddress: params.recipient,
          order: this.mapOrderPreference(params.order),
          slippage: params.slippage || 0.5,
        } as any);
        console.log("🚀 ~ LiFiAdapter ~ getRoute ~ getQuote:", quote)
        
        // Convert quote (LiFiStep) to RouteExtended format
        // A quote is essentially a single-step route
        const quoteAction = quote.action as any;
        lifiRoute = {
          id: quote.id || `quote-${Date.now()}`,
          fromChainId: fromChainId,
          toChainId: toChainId,
          fromAmount: quoteAction.fromAmount,
          toAmount: quoteAction.toAmount,
          steps: [quote],
          tags: [],
        } as unknown as RouteExtended;
      } catch (quoteError: any) {
        // If getQuote fails, try getRoutes as fallback
        console.warn('[LiFiAdapter] getQuote failed, trying getRoutes:', quoteError.message);
        
        const routesResult = await getRoutes({
          fromChainId: fromChainId,
          toChainId: toChainId,
          fromTokenAddress: params.fromToken,
          toTokenAddress: params.toToken,
          fromAmount: params.fromAmount,
          fromAddress: params.recipient,
        });
        console.log("🚀 ~ LiFiAdapter ~ getRoute ~ routesResult:", routesResult)
        
        if (routesResult.routes && routesResult.routes.length > 0) {
          // Use first route (best route)
          lifiRoute = routesResult.routes[0];
        } else {
          throw new Error('No routes found in LiFi');
        }
      }
      
      if (!lifiRoute) {
        return null;
      }
      
      // Normalize LiFi route to RouterRoute format
      return this.normalizeRoute(lifiRoute, fromChainId, toChainId);
    } catch (error: any) {
      console.error('[LiFiAdapter] Error fetching route:', error);
      throw error;
    }
  }
  
  /**
   * Map order preference to LiFi format
   */
  private mapOrderPreference(order?: string): 'RECOMMENDED' | 'FASTEST' | 'CHEAPEST' {
    switch (order) {
      case 'FASTEST':
        return 'FASTEST';
      case 'CHEAPEST':
        return 'CHEAPEST';
      case 'RECOMMENDED':
      default:
        return 'RECOMMENDED';
    }
  }
  
  /**
   * Normalize LiFi RouteExtended to RouterRoute format
   */
  private normalizeRoute(
    lifiRoute: RouteExtended,
    fromChainId: number,
    toChainId: number
  ): RouterRoute {
    // Get canonical chain IDs (may differ from LiFi chain IDs)
    const fromCanonicalChain = getCanonicalChainByProviderId('lifi', fromChainId);
    const toCanonicalChain = getCanonicalChainByProviderId('lifi', toChainId);
    
    const canonicalFromChainId = fromCanonicalChain?.id || fromChainId;
    const canonicalToChainId = toCanonicalChain?.id || toChainId;
    
    // Extract token information from first and last steps
    const firstStep = lifiRoute.steps[0];
    const lastStep = lifiRoute.steps[lifiRoute.steps.length - 1];
    
    if (!firstStep || !lastStep || !firstStep.action) {
      throw new Error('Invalid LiFi route: missing step actions');
    }
    
    // Handle action types (can be SwapAction or CallAction)
    const firstAction = firstStep.action as any;
    const lastAction = lastStep.action as any;
    
    const fromToken = firstAction.fromToken;
    const toToken = lastAction.toToken;
    
    if (!fromToken || !toToken) {
      throw new Error('Invalid LiFi route: missing token information');
    }
    
    // Calculate amounts
    const fromAmount = lifiRoute.fromAmount || firstAction.fromAmount || '0';
    const toAmount = lifiRoute.toAmount || (lastAction.toAmount || lastAction.toAmountMin || '0');
    
    // Extract USD values from route (LiFi provides these)
    const fromAmountUSD = (lifiRoute as any).fromAmountUSD || (firstAction as any).fromAmountUSD;
    const toAmountUSD = (lifiRoute as any).toAmountUSD || (lastAction as any).toAmountUSD;
    const routeGasCostUSD = (lifiRoute as any).gasCostUSD;
    
    // Convert amounts to human-readable format
    const fromAmountHuman = toHumanReadable(fromAmount, fromToken.decimals);
    const toAmountHuman = toHumanReadable(toAmount, toToken.decimals);
    
    // Calculate exchange rate
    const fromAmountNum = parseFloat(fromAmountHuman);
    const toAmountNum = parseFloat(toAmountHuman);
    const exchangeRate = fromAmountNum > 0 ? (toAmountNum / fromAmountNum).toFixed(6) : '0';
    
    // Extract price impact and slippage from first step estimate
    const firstStepEstimate = firstStep.estimate;
    const priceImpact = (firstStepEstimate as any)?.priceImpact || 0;
    const priceImpactPercent = typeof priceImpact === 'string' 
      ? parseFloat(priceImpact) 
      : (typeof priceImpact === 'number' ? priceImpact : 0);
    
    const slippage = (firstStepEstimate as any)?.slippage || 0;
    const slippagePercent = typeof slippage === 'string'
      ? parseFloat(slippage)
      : (typeof slippage === 'number' ? slippage : 0);
    
    // Calculate fees from all steps
    // Prefer route-level gasCostUSD if available, otherwise calculate from steps
    let totalGasUSD = routeGasCostUSD ? parseFloat(String(routeGasCostUSD)) : 0;
    let totalProtocolFeeUSD = 0;
    let gasEstimate = '0';
    
    // If route-level gasCostUSD not available, calculate from steps
    if (!routeGasCostUSD || totalGasUSD === 0) {
      for (const step of lifiRoute.steps) {
        const stepEstimate = step.estimate;
        if (stepEstimate) {
          // Gas costs
          const gasCosts = stepEstimate.gasCosts || [];
          for (const cost of gasCosts) {
            const costEstimate = cost.estimate as any;
            const costUSD = parseFloat(costEstimate?.usd || '0');
            totalGasUSD += costUSD;
            // Use first gas cost for gas estimate
            if (gasEstimate === '0' && cost.amount) {
              gasEstimate = cost.amount;
            }
          }
          
          // Protocol fees
          const feeCosts = stepEstimate.feeCosts || [];
          for (const fee of feeCosts) {
            const feeUSD = parseFloat((fee as any).amountUSD || '0');
            totalProtocolFeeUSD += feeUSD;
          }
        }
      }
    } else {
      // Route-level gasCostUSD available, but still need to extract gas estimate and protocol fees from steps
      for (const step of lifiRoute.steps) {
        const stepEstimate = step.estimate;
        if (stepEstimate) {
          // Gas estimate (native token amount)
          const gasCosts = stepEstimate.gasCosts || [];
          for (const cost of gasCosts) {
            if (gasEstimate === '0' && cost.amount) {
              gasEstimate = cost.amount;
              break;
            }
          }
          
          // Protocol fees
          const feeCosts = stepEstimate.feeCosts || [];
          for (const fee of feeCosts) {
            const feeUSD = parseFloat((fee as any).amountUSD || '0');
            totalProtocolFeeUSD += feeUSD;
          }
        }
      }
    }
    
    // Calculate Tiwi protocol fee (0.25% of fromAmountUSD)
    const TIWI_PROTOCOL_FEE_RATE = 0.0025; // 0.25%
    const fromAmountUSDNum = fromAmountUSD ? parseFloat(String(fromAmountUSD)) : 0;
    const tiwiProtocolFeeUSD = fromAmountUSDNum > 0 
      ? (fromAmountUSDNum * TIWI_PROTOCOL_FEE_RATE).toFixed(2)
      : '0.00';
    
    // Total fees = gas + protocol fees + Tiwi protocol fee
    const totalFeesUSD = totalGasUSD + totalProtocolFeeUSD + parseFloat(tiwiProtocolFeeUSD);
    
    // Normalize steps
    const steps: RouteStep[] = lifiRoute.steps.map((step) => {
      if (!step.action) {
        throw new Error('Invalid LiFi step: missing action');
      }
      
      const stepAction = step.action as any;
      const stepChainId = stepAction.fromChainId || fromChainId;
      const canonicalStepChain = getCanonicalChainByProviderId('lifi', stepChainId);
      const canonicalStepChainId = canonicalStepChain?.id || stepChainId;
      
      return {
        type: this.mapStepType(step.type),
        chainId: canonicalStepChainId,
        fromToken: {
          address: stepAction.fromToken?.address || '',
          amount: toHumanReadable(stepAction.fromAmount || '0', stepAction.fromToken?.decimals || 18),
          symbol: stepAction.fromToken?.symbol || '',
        },
        toToken: {
          address: stepAction.toToken?.address || '',
          amount: toHumanReadable(stepAction.toAmount || '0', stepAction.toToken?.decimals || 18),
          symbol: stepAction.toToken?.symbol || '',
        },
        protocol: (step as any).toolDetails?.name || (step as any).includedSteps?.[0]?.toolDetails?.name,
        description: this.getStepDescription(step),
      };
    });
    
    // Calculate estimated time (sum of all step times)
    const estimatedTime = lifiRoute.steps.reduce((sum, step) => {
      const stepEstimate = step.estimate;
      const stepTime = stepEstimate?.executionDuration || 0;
      return sum + (typeof stepTime === 'number' ? stepTime : 0);
    }, 0);
    
    // Calculate expiration timestamp
    const expiresAt = Date.now() + (QUOTE_EXPIRATION_SECONDS * 1000);
    
    // Generate route ID
    const routeId = `lifi-${lifiRoute.id || Date.now()}`;
    
    return {
      router: 'lifi',
      routeId,
      
      fromToken: {
        chainId: canonicalFromChainId,
        address: fromToken.address,
        symbol: fromToken.symbol,
        amount: fromAmountHuman,
        amountUSD: fromAmountUSD ? String(fromAmountUSD) : undefined,
        decimals: fromToken.decimals,
      },
      toToken: {
        chainId: canonicalToChainId,
        address: toToken.address,
        symbol: toToken.symbol,
        amount: toAmountHuman,
        amountUSD: toAmountUSD ? String(toAmountUSD) : undefined,
        decimals: toToken.decimals,
      },
      
      exchangeRate,
      priceImpact: priceImpactPercent.toFixed(2),
      slippage: slippagePercent.toFixed(2),
      
      fees: {
        protocol: totalProtocolFeeUSD.toFixed(2),
        gas: gasEstimate,
        gasUSD: totalGasUSD.toFixed(2),
        tiwiProtocolFeeUSD: tiwiProtocolFeeUSD,
        total: totalFeesUSD.toFixed(2),
      },
      
      steps,
      estimatedTime: Math.ceil(estimatedTime / 1000), // Convert to seconds
      expiresAt,
      
      // Store raw route for debugging
      raw: lifiRoute,
    };
  }
  
  /**
   * Map LiFi step type to our step type
   */
  private mapStepType(lifiType: string): RouteStep['type'] {
    const typeLower = lifiType.toLowerCase();
    
    if (typeLower.includes('swap')) return 'swap';
    if (typeLower.includes('bridge')) return 'bridge';
    if (typeLower.includes('wrap')) return 'wrap';
    if (typeLower.includes('unwrap')) return 'unwrap';
    
    // Default to swap
    return 'swap';
  }
  
  /**
   * Get human-readable step description
   */
  private getStepDescription(step: any): string {
    const toolName = step.toolDetails?.name || step.includedSteps?.[0]?.toolDetails?.name || 'Unknown';
    const action = step.action as any;
    const fromSymbol = action?.fromToken?.symbol || '';
    const toSymbol = action?.toToken?.symbol || '';
    
    if (step.type === 'SWAP') {
      return `Swap ${fromSymbol} → ${toSymbol} via ${toolName}`;
    }
    if (step.type === 'BRIDGE') {
      return `Bridge ${fromSymbol} → ${toSymbol} via ${toolName}`;
    }
    if (step.type === 'WRAP') {
      return `Wrap ${fromSymbol} via ${toolName}`;
    }
    if (step.type === 'UNWRAP') {
      return `Unwrap ${fromSymbol} via ${toolName}`;
    }
    
    return `${toolName}: ${fromSymbol} → ${toSymbol}`;
  }
}
