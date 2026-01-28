/**
 * Symbol Resolution API Route
 * 
 * Resolves symbol information for TradingView.
 * Implements UDF (Unified Data Feed) protocol.
 * 
 * Query params:
 * - symbol: Symbol identifier
 *   - Same-chain: baseAddress-quoteAddress-chainId
 *   - Cross-chain: baseAddress-baseChainId-quoteAddress-quoteChainId
 * - resolution?: Optional resolution/interval (e.g., "15", "1D", "1h")
 * - currencyCode?: Optional currency code
 * - unitId?: Optional unit ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { getChartDataService } from '@/lib/backend/services/chart-data-service';
import { getCache, CACHE_TTL } from '@/lib/backend/utils/cache';
import type { ResolutionString } from '@/lib/backend/types/chart';

// ============================================================================
// GET Handler
// ============================================================================

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const symbol = searchParams.get('symbol');
    const resolution = searchParams.get('resolution') as ResolutionString | null;

    if (!symbol) {
      return NextResponse.json(
        { s: 'error', errmsg: 'Symbol parameter is required' },
        { status: 400 }
      );
    }

    // Check cache first (symbol info rarely changes)
    const cache = getCache();
    const cacheKey = `symbol:${symbol}:${resolution || '15'}`;
    const cached = cache.get<any>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const chartService = getChartDataService();
    const symbolInfo = await chartService.resolveSymbol(symbol, resolution);

    // Cache for 10 minutes
    cache.set(cacheKey, symbolInfo, 10 * 60 * 1000);

    // Return in UDF format
    return NextResponse.json(symbolInfo);
  } catch (error: any) {
    console.error('[API] /api/v1/charts/symbols GET error:', error);
    
    // Return UDF error format
    return NextResponse.json(
      { s: 'error', errmsg: error?.message || 'Failed to resolve symbol' },
      { status: 400 }
    );
  }
}

