/**
 * Auto Slippage Service
 * 
 * Orchestrates multi-attempt route fetching with increasing slippage.
 * Selects the best route from successful attempts based on output amount.
 * 
 * Strategy:
 * 1. Get liquidity for token pair
 * 2. Calculate initial slippage from liquidity
 * 3. Try 2 slippage values in parallel (initial + 2x) - OPTIMIZED from 3 sequential
 * 4. Select best route (highest output amount) from successful attempts
 */

import { getLiquidityService, MAX_AUTO_SLIPPAGE } from './liquidity-service';
import { getRouteService } from './route-service';
import type { RouteRequest, RouteResponse, RouterRoute } from '@/lib/backend/routers/types';

// ============================================================================
// Types
// ============================================================================

export interface SlippageAttempt {
  slippage: number;
  route: RouterRoute | null;
  error: Error | null;
  outputAmount: number; // For comparison (toToken.amount as number)
}

export interface AutoSlippageResult {
  route: RouterRoute;
  appliedSlippage: number;
  attempts: SlippageAttempt[];
  liquidityUSD?: number;
}

// ============================================================================
// Auto Slippage Service
// ============================================================================

export class AutoSlippageService {
  private liquidityService = getLiquidityService();
  private routeService = getRouteService();

  /**
   * Get optimal route with auto slippage
   * 
   * This method:
   * 1. Fetches liquidity for the token pair
   * 2. Calculates initial slippage based on liquidity
   * 3. Attempts to fetch routes with 2 slippage values in parallel (optimized from 3 sequential)
   * 4. Selects the best route (highest output amount) from successful attempts
   * 
   * IMPORTANT: For each slippage attempt, we still query ALL routers
   * (LiFi, Uniswap, PancakeSwap) and select the best route from them.
   * Then we compare the best routes from all slippage attempts.
   * 
   * @param request - Route request (slippageMode should be 'auto')
   * @returns Best route with applied slippage
   */
  async getRouteWithAutoSlippage(
    request: RouteRequest
  ): Promise<AutoSlippageResult> {
    // 1. Get liquidity for token pair
    // Priority: Use liquidity from request (frontend) > Fetch from API (fallback)
    let liquidityUSD: number | null = null;
    
    if (request.liquidityUSD !== undefined && request.liquidityUSD > 0) {
      // Use liquidity provided by frontend (from token data)
      liquidityUSD = request.liquidityUSD;
      console.log('[AutoSlippageService] Using liquidity from frontend:', liquidityUSD);
    } else {
      // Fallback: Fetch liquidity from DexScreener (for edge cases like direct API calls)
      console.log('[AutoSlippageService] Liquidity not provided, fetching from API...');
      const liquidity = await this.liquidityService.getPairLiquidity(
        {
          address: request.fromToken.address,
          chainId: request.fromToken.chainId,
        },
        {
          address: request.toToken.address,
          chainId: request.toToken.chainId,
        }
      );
      liquidityUSD = liquidity?.liquidityUSD || null;
    }

    // 2. Calculate initial slippage
    const initialSlippage = liquidityUSD !== null
      ? this.liquidityService.calculateInitialSlippage(liquidityUSD)
      : 0.5; // Default if liquidity unknown

    console.log('[AutoSlippageService] Starting auto slippage:', {
      liquidityUSD: liquidityUSD || 'unknown',
      initialSlippage,
      fromToken: request.fromToken.symbol,
      toToken: request.toToken.symbol,
    });

    // 3. OPTIMIZED: Try 2 slippage values in parallel (reduced from 3 sequential)
    // This reduces total attempts from 3 (sequential) to 2 (parallel)
    const attempts: SlippageAttempt[] = [];
    
    // Calculate both slippage values upfront
    const slippage1 = initialSlippage;
    const slippage2 = this.liquidityService.calculateNextSlippage(initialSlippage, 1);
    
    // Ensure slippage2 doesn't exceed max
    const finalSlippage2 = Math.min(slippage2, MAX_AUTO_SLIPPAGE);
    
    console.log(`[AutoSlippageService] Running 2 parallel attempts with slippage: ${slippage1}%, ${finalSlippage2}%`);

    // OPTIMIZATION: Run both attempts in parallel
    const [attempt1Result, attempt2Result] = await Promise.allSettled([
      // Attempt 1: Initial slippage
      (async () => {
        try {
          console.log(`[AutoSlippageService] Attempt 1 (parallel) with slippage ${slippage1}%`);
          const routeResponse: RouteResponse = await this.routeService.getRoute({
            ...request,
            slippage: slippage1,
            slippageMode: 'fixed', // Force fixed mode for this attempt
          });

          if (routeResponse.route) {
            const outputAmount = parseFloat(routeResponse.route.toToken.amount) || 0;
            console.log(`[AutoSlippageService] Attempt 1 succeeded:`, {
              slippage: slippage1,
              outputAmount,
              router: routeResponse.route.router,
            });
            return {
              slippage: slippage1,
              route: routeResponse.route,
              error: null,
              outputAmount,
            };
          } else {
            console.log(`[AutoSlippageService] Attempt 1 failed: No route found`);
            return {
              slippage: slippage1,
              route: null,
              error: new Error('No route found'),
              outputAmount: 0,
            };
          }
        } catch (error: any) {
          console.log(`[AutoSlippageService] Attempt 1 failed:`, error.message);
          return {
            slippage: slippage1,
            route: null,
            error: error instanceof Error ? error : new Error(String(error)),
            outputAmount: 0,
          };
        }
      })(),
      
      // Attempt 2: Higher slippage (only if different from attempt 1)
      slippage1 !== finalSlippage2 ? (async () => {
        try {
          console.log(`[AutoSlippageService] Attempt 2 (parallel) with slippage ${finalSlippage2}%`);
          const routeResponse: RouteResponse = await this.routeService.getRoute({
            ...request,
            slippage: finalSlippage2,
            slippageMode: 'fixed', // Force fixed mode for this attempt
          });

          if (routeResponse.route) {
            const outputAmount = parseFloat(routeResponse.route.toToken.amount) || 0;
            console.log(`[AutoSlippageService] Attempt 2 succeeded:`, {
              slippage: finalSlippage2,
              outputAmount,
              router: routeResponse.route.router,
            });
            return {
              slippage: finalSlippage2,
              route: routeResponse.route,
              error: null,
              outputAmount,
            };
          } else {
            console.log(`[AutoSlippageService] Attempt 2 failed: No route found`);
            return {
              slippage: finalSlippage2,
              route: null,
              error: new Error('No route found'),
              outputAmount: 0,
            };
          }
        } catch (error: any) {
          console.log(`[AutoSlippageService] Attempt 2 failed:`, error.message);
          return {
            slippage: finalSlippage2,
            route: null,
            error: error instanceof Error ? error : new Error(String(error)),
            outputAmount: 0,
          };
        }
      })() : Promise.resolve({
        slippage: finalSlippage2,
        route: null,
        error: new Error('Skipped - same as attempt 1'),
        outputAmount: 0,
      }),
    ]);

    // Collect results from both attempts
    if (attempt1Result.status === 'fulfilled') {
      attempts.push(attempt1Result.value);
    } else {
      attempts.push({
        slippage: slippage1,
        route: null,
        error: attempt1Result.reason instanceof Error ? attempt1Result.reason : new Error(String(attempt1Result.reason)),
        outputAmount: 0,
      });
    }

    if (attempt2Result.status === 'fulfilled') {
      attempts.push(attempt2Result.value);
    } else {
      attempts.push({
        slippage: finalSlippage2,
        route: null,
        error: attempt2Result.reason instanceof Error ? attempt2Result.reason : new Error(String(attempt2Result.reason)),
        outputAmount: 0,
      });
    }

    // 4. Select best route from successful attempts
    const successfulAttempts = attempts.filter(a => a.route !== null && a.outputAmount > 0);

    if (successfulAttempts.length === 0) {
      const lastError = attempts[attempts.length - 1]?.error;
      throw new Error(
        `No route found after 2 parallel attempts with auto slippage. ` +
        `Tried slippage: ${attempts.map(a => `${a.slippage}%`).join(', ')}. ` +
        `Last error: ${lastError?.message || 'Unknown error'}. ` +
        `Consider using fixed slippage mode with higher tolerance.`
      );
    }

    // Select route with highest output amount (best price for user)
    const bestAttempt = this.selectBestRoute(successfulAttempts);

    console.log('[AutoSlippageService] Best route selected:', {
      slippage: bestAttempt.slippage,
      outputAmount: bestAttempt.outputAmount,
      router: bestAttempt.route?.router,
      totalAttempts: attempts.length,
      successfulAttempts: successfulAttempts.length,
    });

    return {
      route: bestAttempt.route!,
      appliedSlippage: bestAttempt.slippage,
      attempts: attempts,
      liquidityUSD: liquidityUSD || undefined,
    };
  }

  /**
   * Select best route from successful attempts
   * 
   * Criteria (priority order):
   * 1. Highest output amount (best price for user)
   * 2. Lower slippage (if output amounts are very similar)
   * 3. Lower gas fees (if outputs and slippage are similar)
   * 
   * @param attempts - Successful slippage attempts
   * @returns Best attempt
   */
  private selectBestRoute(attempts: SlippageAttempt[]): SlippageAttempt {
    if (attempts.length === 1) {
      return attempts[0];
    }

    // Sort by output amount (descending), then by slippage (ascending)
    const sorted = [...attempts].sort((a, b) => {
      const outputDiff = Math.abs(a.outputAmount - b.outputAmount);
      const outputDiffPercent = outputDiff / Math.max(a.outputAmount, b.outputAmount);

      // If output amounts are very similar (< 0.1% difference), prefer lower slippage
      if (outputDiffPercent < 0.001) {
        return a.slippage - b.slippage; // Lower slippage is better
      }

      // Otherwise, prefer higher output amount
      return b.outputAmount - a.outputAmount;
    });

    return sorted[0];
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let autoSlippageServiceInstance: AutoSlippageService | null = null;

/**
 * Get singleton AutoSlippageService instance
 */
export function getAutoSlippageService(): AutoSlippageService {
  if (!autoSlippageServiceInstance) {
    autoSlippageServiceInstance = new AutoSlippageService();
  }
  return autoSlippageServiceInstance;
}

