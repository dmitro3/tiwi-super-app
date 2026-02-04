/**
 * Binance Tickers API Route
 *
 * GET /api/v1/binance/tickers?marketType=spot|perp&category=top|new|gainers|losers&limit=500
 *
 * Returns Binance 24hr ticker data in NormalizedToken format
 * so the frontend can use the same Token interface as other data sources.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBinanceTickers, type TickerCategory } from '@/lib/backend/services/binance-ticker-service';
import type { NormalizedToken } from '@/lib/backend/types/backend-tokens';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const marketType = (searchParams.get('marketType') || 'spot') as 'spot' | 'perp';
    const category = (searchParams.get('category') || 'top') as TickerCategory;
    const limit = parseInt(searchParams.get('limit') || '500', 10);

    const validCategories: TickerCategory[] = ['top', 'new', 'gainers', 'losers'];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${validCategories.join(', ')}`, tokens: [], total: 0 },
        { status: 400 },
      );
    }

    const tickers = await getBinanceTickers(marketType, category, limit);

    // Transform to NormalizedToken shape (same as /api/v1/tokens response)
    const tokens: NormalizedToken[] = tickers.map(t => ({
      chainId: 0, // 0 = Binance CEX
      address: t.symbol, // Use symbol as unique ID (e.g., "BTCUSDT")
      symbol: t.baseAsset,
      name: t.name,
      decimals: undefined,
      logoURI: t.logo,
      priceUSD: t.lastPrice.toString(),
      providers: ['binance'],
      volume24h: t.quoteVolume,
      priceChange24h: t.priceChangePercent,
      marketCap: undefined,
      // Pass through extra fields the frontend can use
      highPrice: t.highPrice,
      lowPrice: t.lowPrice,
      ...(t.fundingRate !== undefined ? { fundingRate: t.fundingRate } : {}),
    }));

    return NextResponse.json(
      {
        tokens,
        total: tokens.length,
        marketType,
        category,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=30',
        },
      },
    );
  } catch (error: any) {
    console.error('[Binance Tickers API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch Binance tickers', tokens: [], total: 0 },
      { status: 500 },
    );
  }
}
