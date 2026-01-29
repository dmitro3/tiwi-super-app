/**
 * Historical OHLC Data API Route
 * 
 * Returns historical OHLC bars for TradingView chart.
 * Implements UDF (Unified Data Feed) protocol.
 * 
 * Query params:
 * - symbol: Symbol identifier (format: baseAddress-quoteAddress-chainId)
 * - resolution: Time resolution ("1", "5", "15", "30", "60", "1D", "1W", "1M")
 * - from: Start timestamp (Unix seconds)
 * - to: End timestamp (Unix seconds)
 * - countback?: Optional number of bars to fetch
 */

import { NextRequest, NextResponse } from 'next/server';
import { getChartDataService } from '@/lib/backend/services/chart-data-service';
import { getCache, CACHE_TTL } from '@/lib/backend/utils/cache';
import { fillChartData } from '@/lib/backend/utils/chart-data-filler';
import { updateLastCandleWithCurrentPrice } from '@/lib/backend/utils/chart-price-updater';
import type { ResolutionString } from '@/lib/backend/types/chart';

// ============================================================================
// GET Handler
// ============================================================================

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const symbol = searchParams.get('symbol');
    const resolution = searchParams.get('resolution') as ResolutionString;
    const fromStr = searchParams.get('from');
    const toStr = searchParams.get('to');
    const countbackStr = searchParams.get('countback');

    // Validate required parameters
    if (!symbol) {
      return NextResponse.json(
        { s: 'error', errmsg: 'Symbol parameter is required' },
        { status: 400 }
      );
    }

    if (!resolution) {
      return NextResponse.json(
        { s: 'error', errmsg: 'Resolution parameter is required' },
        { status: 400 }
      );
    }

    if (!fromStr || !toStr) {
      return NextResponse.json(
        { s: 'error', errmsg: 'From and to parameters are required' },
        { status: 400 }
      );
    }

    // Parse timestamps
    const from = parseInt(fromStr, 10);
    const to = parseInt(toStr, 10);
    const countback = countbackStr ? parseInt(countbackStr, 10) : undefined;

    if (isNaN(from) || isNaN(to)) {
      return NextResponse.json(
        { s: 'error', errmsg: 'Invalid timestamp format' },
        { status: 400 }
      );
    }

    // Parse symbol to support both same-chain and cross-chain pairs
    // Format options:
    // 1. Same-chain: baseAddress-quoteAddress-chainId (backward compatible)
    // 2. Cross-chain: baseAddress-baseChainId-quoteAddress-quoteChainId
    const parts = symbol.split('-');
    
    let baseToken: string;
    let quoteToken: string;
    let baseChainId: number | undefined;
    let quoteChainId: number | undefined;
    let chainId: number | undefined; // For backward compatibility

    if (parts.length === 3) {
      // Same-chain format (backward compatible)
      const [baseTokenPart, quoteTokenPart, chainIdStr] = parts;
      baseToken = baseTokenPart;
      quoteToken = quoteTokenPart;
      chainId = parseInt(chainIdStr, 10);
      if (isNaN(chainId)) {
        return NextResponse.json(
          { s: 'error', errmsg: 'Invalid chain ID in symbol' },
          { status: 400 }
        );
      }
      baseChainId = chainId;
      quoteChainId = chainId;
    } else if (parts.length === 4) {
      // Cross-chain format: baseAddress-baseChainId-quoteAddress-quoteChainId
      const [baseTokenPart, baseChainIdStr, quoteTokenPart, quoteChainIdStr] = parts;
      baseToken = baseTokenPart;
      quoteToken = quoteTokenPart;
      baseChainId = parseInt(baseChainIdStr, 10);
      quoteChainId = parseInt(quoteChainIdStr, 10);
      
      if (isNaN(baseChainId) || isNaN(quoteChainId)) {
        return NextResponse.json(
          { s: 'error', errmsg: 'Invalid chain IDs in symbol' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { s: 'error', errmsg: 'Invalid symbol format. Expected: baseAddress-quoteAddress-chainId (same-chain) or baseAddress-baseChainId-quoteAddress-quoteChainId (cross-chain)' },
        { status: 400 }
      );
    }

    // Create cache key based on request parameters
    const cacheKey = `chart:${symbol}:${resolution}:${from}:${to}`;
    const cache = getCache();
    
    // Check cache first (cache for 5 minutes to prevent repeated calls)
    const cachedData = cache.get<{ bars: any[] }>(cacheKey);
    if (cachedData) {
      console.log(`[API] /api/v1/charts/history - Returning cached data for ${symbol}`);
      const bars = cachedData.bars;
      
      // Transform to UDF format
      const response = {
        s: 'ok' as const,
        t: bars.map(bar => Math.floor(bar.time / 1000)),
        o: bars.map(bar => bar.open),
        h: bars.map(bar => bar.high),
        l: bars.map(bar => bar.low),
        c: bars.map(bar => bar.close),
        v: bars.map(bar => bar.volume || 0),
      };
      
      return NextResponse.json(response);
    }

    // Fetch historical bars (supports both same-chain and cross-chain)
    const chartService = getChartDataService();
    let bars = await chartService.getHistoricalBars({
      baseToken,
      quoteToken,
      chainId, // For backward compatibility
      baseChainId, // For cross-chain support
      quoteChainId, // For cross-chain support
      resolution,
      from,
      to,
      countback,
    });

    // Fill sparse data to ensure we always have enough bars for chart display
    // This ensures candlesticks are always visible even with limited data
    // NOTE: fillChartData will use the updated last candle price for synthetic bars
    const fromMs = from * 1000;
    const toMs = to * 1000;
    const minBars = countback || 50; // Minimum bars to display
    
    bars = fillChartData(bars, fromMs, toMs, resolution, minBars);

    // Update the last candle with the current price after filling
    // This ensures the chart displays the most accurate current price
    if (bars.length > 0) {
      bars = await updateLastCandleWithCurrentPrice(
        bars,
        baseToken,
        quoteToken,
        baseChainId || chainId!,
        quoteChainId || chainId!
      );
    }

    // Cache the result for 5 minutes (prevents repeated API calls)
    cache.set(cacheKey, { bars }, CACHE_TTL.CHART_DATA);

    // Transform to UDF format
    if (bars.length === 0) {
      return NextResponse.json({
        s: 'no_data',
      });
    }

    // UDF format: arrays of values
    const response = {
      s: 'ok' as const,
      t: bars.map(bar => Math.floor(bar.time / 1000)), // Convert to seconds
      o: bars.map(bar => bar.open),
      h: bars.map(bar => bar.high),
      l: bars.map(bar => bar.low),
      c: bars.map(bar => bar.close),
      v: bars.map(bar => bar.volume || 0),
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[API] /api/v1/charts/history GET error:', error);
    
    // Return UDF error format
    return NextResponse.json(
      { s: 'error', errmsg: error?.message || 'Failed to fetch historical data' },
      { status: 500 }
    );
  }
}

