import { NextRequest, NextResponse } from 'next/server';
import {
  getOrderbook,
  getTickerPrice,
} from '@/lib/backend/services/orderbook-service';

/**
 * GET /api/v1/market/[pair]/orderbook
 *
 * Returns real-time orderbook data from Binance exchange.
 *
 * Query params:
 * - marketType: 'spot' | 'perp' (defaults to 'spot')
 *
 * Response:
 * - symbol: Trading pair symbol
 * - bids: Array of bid levels [{ price, quantity, total }]
 * - asks: Array of ask levels [{ price, quantity, total }]
 * - currentPrice: Current market price
 * - lastUpdateId: Binance orderbook update ID
 * - supported: Whether the pair is supported on Binance
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ pair: string }> }
) {
  try {
    const { pair } = await params;
    const searchParams = req.nextUrl.searchParams;
    const marketType = (searchParams.get('marketType') || 'spot') as 'spot' | 'perp';

    // Normalize pair format (remove slashes, keep dashes for our internal format)
    const normalizedPair = pair.replace('/', '-').replace('_', '-').toUpperCase();

    console.log('[Orderbook API] Request:', normalizedPair, 'marketType:', marketType);

    // Fetch orderbook and current price in parallel
    let orderbook = null;
    let currentPrice = null;

    try {
      [orderbook, currentPrice] = await Promise.all([
        getOrderbook(normalizedPair, marketType),
        getTickerPrice(normalizedPair, marketType),
      ]);
    } catch (fetchError: any) {
      console.error('[Orderbook API] Fetch error:', fetchError.message || fetchError);
    }

    console.log('[Orderbook API] Result:', {
      pair: normalizedPair,
      hasOrderbook: !!orderbook,
      bids: orderbook?.bids?.length || 0,
      asks: orderbook?.asks?.length || 0,
      currentPrice,
    });

    if (!orderbook || (orderbook.bids.length === 0 && orderbook.asks.length === 0)) {
      return NextResponse.json({
        symbol: normalizedPair,
        bids: [],
        asks: [],
        currentPrice: currentPrice || 0,
        lastUpdateId: 0,
        supported: false,
        message: `${normalizedPair} is not available on Binance ${marketType} market`,
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      });
    }

    return NextResponse.json({
      symbol: orderbook.symbol,
      bids: orderbook.bids,
      asks: orderbook.asks,
      currentPrice: currentPrice || 0,
      lastUpdateId: orderbook.lastUpdateId,
      timestamp: orderbook.timestamp,
      supported: true,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=2, stale-while-revalidate=5',
      },
    });
  } catch (error: any) {
    console.error('[Orderbook API] Error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to fetch orderbook',
        supported: false,
        bids: [],
        asks: [],
        currentPrice: 0,
      },
      { status: 500 }
    );
  }
}
