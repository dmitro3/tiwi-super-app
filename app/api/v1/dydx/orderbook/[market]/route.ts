import { NextRequest, NextResponse } from 'next/server';
import { getDydxOrderbook, getDydxTicker } from '@/lib/backend/services/dydx-service';

/**
 * GET /api/v1/dydx/orderbook/[market]
 * 
 * Returns orderbook snapshot and ticker data for a dYdX market.
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ market: string }> }
) {
    try {
        const { market } = await params;

        // Fetch snapshot and ticker in parallel
        const [orderbook, ticker] = await Promise.all([
            getDydxOrderbook(market),
            getDydxTicker(market)
        ]);

        if (!orderbook) {
            return NextResponse.json(
                { success: false, error: `Market ${market} not found on dYdX` },
                { status: 404 }
            );
        }

        return NextResponse.json({
            symbol: orderbook.symbol,
            bids: orderbook.bids,
            asks: orderbook.asks,
            currentPrice: ticker ? parseFloat(ticker.oraclePrice) : 0,
            lastUpdateId: orderbook.lastUpdateId,
            timestamp: orderbook.timestamp,
            supported: true,
            indexerData: ticker // Pass-through extra data for mobile/advanced users
        }, {
            headers: {
                'Cache-Control': 'public, s-maxage=2, stale-while-revalidate=5',
            }
        });
    } catch (error: any) {
        console.error('[dYdX Orderbook API] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch dYdX orderbook' },
            { status: 500 }
        );
    }
}
