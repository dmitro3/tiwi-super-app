/**
 * Chart Data Service
 * 
 * Main orchestration service for fetching chart data.
 * Implements fallback strategy: Pair → Base Token → Quote Token
 * Falls back to DexScreener if Bitquery fails.
 */

import { BitqueryChartProvider } from '@/lib/backend/providers/bitquery-chart-provider';
import { DexScreenerChartProvider } from '@/lib/backend/providers/dexscreener-chart-provider';
import { convertPairToWrapped } from '@/lib/backend/utils/token-address-helper';
import { getCrossChainPriceCalculator } from '@/lib/backend/utils/cross-chain-price-calculator';
import { getTokenService } from '@/lib/backend/services/token-service';
import type {
  ChartDataParams,
  OHLCBar,
  ChartProviderResponse,
  SymbolInfo,
  ChartConfiguration,
  ResolutionString,
} from '@/lib/backend/types/chart';
import { getCanonicalChain } from '@/lib/backend/registry/chains';

// ============================================================================
// Chart Data Service
// ============================================================================

export class ChartDataService {
  private bitqueryProvider: BitqueryChartProvider;
  private dexscreenerProvider: DexScreenerChartProvider;

  constructor() {
    this.bitqueryProvider = new BitqueryChartProvider();
    this.dexscreenerProvider = new DexScreenerChartProvider();
  }

  /**
   * Get historical OHLC bars with fallback strategy
   * Supports both same-chain and cross-chain pairs
   * 
   * Strategy:
   * 1. If cross-chain (baseChainId !== quoteChainId):
   *    - Fetch base token OHLC in USD from its chain
   *    - Fetch quote token OHLC in USD from its chain
   *    - Calculate pair price: basePriceUSD / quotePriceUSD
   * 
   * 2. If same-chain:
   *    - DexScreener (PRIMARY - free) → Bitquery (FALLBACK)
   */
  async getHistoricalBars(params: ChartDataParams): Promise<OHLCBar[]> {
    // Determine if this is a cross-chain pair
    const baseChainId = params.baseChainId || params.chainId;
    const quoteChainId = params.quoteChainId || params.chainId;
    const isCrossChain = baseChainId !== quoteChainId;

    if (isCrossChain) {
      // CROSS-CHAIN: Calculate pair price from individual token prices
      console.log(`[ChartDataService] Cross-chain pair detected: baseChainId=${baseChainId}, quoteChainId=${quoteChainId}`);
      
      if (!baseChainId || !quoteChainId) {
        throw new Error('Cross-chain pair requires both baseChainId and quoteChainId');
      }
      
      const calculator = getCrossChainPriceCalculator();
      return await calculator.calculateCrossChainBars({
        baseToken: params.baseToken,
        baseChainId,
        quoteToken: params.quoteToken,
        quoteChainId,
        resolution: params.resolution,
        from: params.from,
        to: params.to,
      });
    }

    // SAME-CHAIN: Use existing strategy (DexScreener → Bitquery)
    const chainId = params.chainId || baseChainId;
    
    if (!chainId) {
      throw new Error('Chain ID is required for same-chain pairs');
    }
    
    // Convert native tokens to wrapped versions
    const { baseToken, quoteToken } = convertPairToWrapped(
      params.baseToken,
      params.quoteToken,
      chainId
    );

    // Strategy 1: Try DexScreener FIRST (FREE, no API points consumed)
    try {
      const dexResponse = await this.dexscreenerProvider.fetchPairOHLC({
        baseToken,
        quoteToken,
        chainId: chainId,
        resolution: params.resolution,
        from: params.from,
        to: params.to,
      });

      if (dexResponse.bars && dexResponse.bars.length > 0) {
        console.log(`[ChartDataService] Successfully fetched DexScreener data: ${dexResponse.bars.length} bars (FREE)`);
        return dexResponse.bars;
      }
    } catch (error: any) {
      console.warn(`[ChartDataService] DexScreener fetch failed: ${error.message}`);
    }

    // Strategy 2: Fallback to Bitquery (for historical data or when DexScreener fails)
    try {
      const pairResponse = await this.bitqueryProvider.fetchPairOHLC({
        baseToken,
        quoteToken,
        chainId: chainId,
        resolution: params.resolution,
        from: params.from,
        to: params.to,
      });

      if (pairResponse.bars && pairResponse.bars.length > 0) {
        console.log(`[ChartDataService] Successfully fetched Bitquery data: ${pairResponse.bars.length} bars (FALLBACK)`);
        return pairResponse.bars;
      }
    } catch (error: any) {
      // Check if it's a points limit error - if so, don't try more (all keys exhausted)
      const errorMessage = (error?.message || '').toLowerCase();
      if (errorMessage.includes('points limit') || errorMessage.includes('all api keys')) {
        console.error(`[ChartDataService] Points limit exceeded for all API keys: ${error.message}`);
        // Don't throw - return empty array, data filler will generate synthetic data
      } else {
        console.warn(`[ChartDataService] Bitquery fetch failed: ${error.message}`);
      }
    }

    // Strategy 2: Try to fetch base token OHLC data
    // try {
    //   const baseResponse = await this.bitqueryProvider.fetchTokenOHLC({
    //     token: baseToken,
    //     chainId: params.chainId,
    //     resolution: params.resolution,
    //     from: params.from,
    //     to: params.to,
    //   });

    //   if (baseResponse.bars && baseResponse.bars.length > 0) {
    //     console.log(`[ChartDataService] Successfully fetched base token OHLC data: ${baseResponse.bars.length} bars`);
    //     return baseResponse.bars;
    //   }
    // } catch (error: any) {
    //   console.warn(`[ChartDataService] Base token OHLC fetch failed: ${error.message}`);
    // }

    // // Strategy 3: Try to fetch quote token OHLC data
    // try {
    //   const quoteResponse = await this.bitqueryProvider.fetchTokenOHLC({
    //     token: quoteToken,
    //     chainId: params.chainId,
    //     resolution: params.resolution,
    //     from: params.from,
    //     to: params.to,
    //   });

    //   if (quoteResponse.bars && quoteResponse.bars.length > 0) {
    //     console.log(`[ChartDataService] Successfully fetched quote token OHLC data: ${quoteResponse.bars.length} bars`);
    //     return quoteResponse.bars;
    //   }
    // } catch (error: any) {
    //   console.warn(`[ChartDataService] Quote token OHLC fetch failed: ${error.message}`);
    // }

    // // Strategy 4: Fallback to DexScreener
    // try {
    //   const dexResponse = await this.dexscreenerProvider.fetchPairOHLC({
    //     baseToken,
    //     quoteToken,
    //     chainId: params.chainId,
    //     resolution: params.resolution,
    //     from: params.from,
    //     to: params.to,
    //   });

    //   if (dexResponse.bars && dexResponse.bars.length > 0) {
    //     console.log(`[ChartDataService] Successfully fetched DexScreener data: ${dexResponse.bars.length} bars`);
    //     return dexResponse.bars;
    //   }
    // } catch (error: any) {
    //   console.warn(`[ChartDataService] DexScreener fetch failed: ${error.message}`);
    // }

    // All strategies failed - return empty array
    console.warn(`[ChartDataService] All data fetching strategies failed for ${baseToken}/${quoteToken} on chain ${params.chainId}`);
    return [];
  }

  /**
   * Resolve symbol information for TradingView
   * Supports both same-chain and cross-chain pairs
   * Symbol formats:
   * - Same-chain: baseAddress-quoteAddress-chainId
   * - Cross-chain: baseAddress-baseChainId-quoteAddress-quoteChainId
   * 
   * @param symbolName - Symbol identifier
   * @param resolution - Optional resolution/interval (e.g., "15", "1D", "1h") for display formatting
   */
  async resolveSymbol(symbolName: string, resolution?: ResolutionString | null): Promise<SymbolInfo> {
    const parts = symbolName.split('-');
    
    let baseAddress: string;
    let quoteAddress: string;
    let baseChainId: number;
    let quoteChainId: number;
    let isCrossChain = false;

    if (parts.length === 3) {
      // Same-chain format (backward compatible)
      const baseAddressPart = parts[0];
      const quoteAddressPart = parts[1];
      const chainIdStr = parts[2];
      baseAddress = baseAddressPart;
      quoteAddress = quoteAddressPart;
      const chainId = parseInt(chainIdStr, 10);
      if (isNaN(chainId)) {
        throw new Error(`[ChartDataService] Invalid chain ID: ${chainIdStr}`);
      }
      baseChainId = chainId;
      quoteChainId = chainId;
    } else if (parts.length === 4) {
      // Cross-chain format
      const baseAddressPart = parts[0];
      const baseChainIdStr = parts[1];
      const quoteAddressPart = parts[2];
      const quoteChainIdStr = parts[3];
      baseAddress = baseAddressPart;
      quoteAddress = quoteAddressPart;
      baseChainId = parseInt(baseChainIdStr, 10);
      quoteChainId = parseInt(quoteChainIdStr, 10);
      
      if (isNaN(baseChainId) || isNaN(quoteChainId)) {
        throw new Error(`[ChartDataService] Invalid chain IDs: ${baseChainIdStr}, ${quoteChainIdStr}`);
      }
      isCrossChain = baseChainId !== quoteChainId;
    } else {
      throw new Error(`[ChartDataService] Invalid symbol format: ${symbolName}. Expected: baseAddress-quoteAddress-chainId (same-chain) or baseAddress-baseChainId-quoteAddress-quoteChainId (cross-chain)`);
    }

    // Get chain information
    const baseChain = getCanonicalChain(baseChainId);
    const quoteChain = getCanonicalChain(quoteChainId);
    
    if (!baseChain || !quoteChain) {
      throw new Error(`[ChartDataService] Unsupported chain ID: ${baseChainId} or ${quoteChainId}`);
    }

    // Convert native tokens to wrapped
    const { baseToken } = convertPairToWrapped(baseAddress, '0x0000000000000000000000000000000000000000', baseChainId);
    const { baseToken: quoteToken } = convertPairToWrapped(quoteAddress, '0x0000000000000000000000000000000000000000', quoteChainId);

    // Fetch token symbols in parallel for speed
    const tokenService = getTokenService();
    let baseSymbol = 'UNKNOWN';
    let quoteSymbol = 'UNKNOWN';

    const [baseResult, quoteResult] = await Promise.allSettled([
      tokenService.searchTokens(baseToken, undefined, [baseChainId], 1),
      tokenService.searchTokens(quoteToken, undefined, [quoteChainId], 1),
    ]);

    if (baseResult.status === 'fulfilled' && baseResult.value.length > 0 && baseResult.value[0].symbol) {
      baseSymbol = baseResult.value[0].symbol;
    } else if (baseResult.status === 'rejected') {
      console.warn(`[ChartDataService] Failed to fetch base token symbol for ${baseToken} on chain ${baseChainId}:`, baseResult.reason);
      baseSymbol = baseToken.slice(0, 6) + '...' + baseToken.slice(-4);
    }

    if (quoteResult.status === 'fulfilled' && quoteResult.value.length > 0 && quoteResult.value[0].symbol) {
      quoteSymbol = quoteResult.value[0].symbol;
    } else if (quoteResult.status === 'rejected') {
      console.warn(`[ChartDataService] Failed to fetch quote token symbol for ${quoteToken} on chain ${quoteChainId}:`, quoteResult.reason);
      quoteSymbol = quoteToken.slice(0, 6) + '...' + quoteToken.slice(-4);
    }

    // Determine price scale based on typical token prices
    // For very small prices (scientific notation like 5e-13), we need high precision
    // pricescale = 10^n where n is the number of decimal places
    // Using 10^18 to handle very small prices (up to 18 decimal places)
    const pricescale = 1000000000000000000; // 18 decimals - handles very small prices

    // Format resolution for display (DexScreener style)
    // Examples: "15" -> "15", "60" -> "1h", "1D" -> "1D", "1W" -> "1W"
    let resolutionDisplay = resolution || '15';
    if (resolutionDisplay === '60') {
      resolutionDisplay = '1h';
    } else if (resolutionDisplay === '240') {
      resolutionDisplay = '4h';
    } else if (resolutionDisplay === '1D') {
      resolutionDisplay = '1D';
    } else if (resolutionDisplay === '1W') {
      resolutionDisplay = '1W';
    } else if (resolutionDisplay === '1M') {
      resolutionDisplay = '1M';
    }

    // Format name like DexScreener: "WBNB/TWC on BNB CHAIN • 15 • tiwiprotocol.xyz"
    // Ensure domain is lowercase
    const domain = 'tiwiprotocol.xyz';
    const chainName = isCrossChain 
      ? `${baseChain.name.toUpperCase()}/${quoteChain.name.toUpperCase()}` 
      : baseChain.name.toUpperCase(); // Make chain name uppercase like "BNB CHAIN"
    
    const name = `${baseSymbol}/${quoteSymbol} on ${chainName} • ${resolutionDisplay} • ${domain}`;

    // Build description (for tooltip/alt text)
    const exchange = isCrossChain 
      ? `${baseChain.name}/${quoteChain.name}` 
      : baseChain.name;
    const description = isCrossChain
      ? `${baseSymbol}/${quoteSymbol} (Cross-Chain: ${baseChain.name} → ${quoteChain.name})`
      : `${baseSymbol}/${quoteSymbol} on ${baseChain.name}`;

    return {
      name, // Format: "WBNB/TWC on BNB CHAIN • 15 • tiwiprotocol.xyz" (all lowercase domain)
      ticker: symbolName,
      description,
      type: 'crypto',
      session: '24x7',
      timezone: 'Etc/UTC',
      exchange: domain.toLowerCase(), // Use lowercase domain instead of chain name
      listed_exchange: domain.toLowerCase(), // Use lowercase domain instead of chain name
      minmov: 1,
      pricescale,
      has_intraday: true,
      has_daily: true,
      has_weekly_and_monthly: true,
      supported_resolutions: this.bitqueryProvider.getSupportedResolutions(),
      intraday_multipliers: ['1', '5', '15', '30', '60'],
      volume_precision: 2,
      data_status: 'endofday', // Use 'endofday' for historical data to prevent TradingView from continuously fetching
    };
  }

  /**
   * Get chart configuration
   */
  getConfiguration(): ChartConfiguration {
    return {
      supported_resolutions: this.bitqueryProvider.getSupportedResolutions(),
      
      exchanges: [
        { value: 'BSC', name: 'BNB Chain', desc: 'BNB Chain' },
        { value: 'ETH', name: 'Ethereum', desc: 'Ethereum' },
        { value: 'POLYGON', name: 'Polygon', desc: 'Polygon' },
        { value: 'ARBITRUM', name: 'Arbitrum', desc: 'Arbitrum' },
        { value: 'OPTIMISM', name: 'Optimism', desc: 'Optimism' },
        { value: 'BASE', name: 'Base', desc: 'Base' },
      ],
    };
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let chartDataServiceInstance: ChartDataService | null = null;

/**
 * Get the singleton ChartDataService instance
 */
export function getChartDataService(): ChartDataService {
  if (!chartDataServiceInstance) {
    chartDataServiceInstance = new ChartDataService();
  }
  return chartDataServiceInstance;
}

