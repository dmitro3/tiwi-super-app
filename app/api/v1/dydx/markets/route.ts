import { NextResponse } from 'next/server';
import { getDydxMarkets } from '@/lib/backend/services/dydx-service';

/**
 * GET /api/v1/dydx/markets
 * 
 * Returns all perpetual markets from dYdX Indexer.
 */
export async function GET() {
    try {
        const markets = await getDydxMarkets();

        return NextResponse.json({
            success: true,
            count: markets.length,
            markets
        }, {
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
            }
        });
    } catch (error: any) {
        console.error('[dYdX Markets API] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch dYdX markets' },
            { status: 500 }
        );
    }
}
