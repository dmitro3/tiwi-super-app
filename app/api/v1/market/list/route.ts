import { NextRequest, NextResponse } from 'next/server';
import { getBinanceTickers } from '@/lib/backend/services/binance-ticker-service';
import { getDydxMarkets } from '@/lib/backend/services/dydx-service';

/**
 * GET /api/v1/market/list
 * 
 * Returns a unified list of markets from Binance and dYdX.
 * Query params:
 * - marketType: 'spot' | 'perp' | 'all' (default: 'all')
 */
export async function GET(req: NextRequest) {
    try {
        const searchParams = req.nextUrl.searchParams;
        const marketType = searchParams.get('marketType') || 'all';
        const limit = parseInt(searchParams.get('limit') || '500', 10);

        const promises: Promise<any>[] = [];

        // Fetch enriched dYdX markets
        if (marketType === 'all' || marketType === 'perp') {
            promises.push(getDydxMarkets().then(markets => markets.map(m => ({
                id: m.id,
                symbol: m.symbol,
                name: m.name,
                logo: m.logo,
                price: m.price,
                priceChange24h: m.priceChange24h,
                volume24h: m.volume24h,
                high24h: m.high24h,
                low24h: m.low24h,
                marketType: 'perp',
                provider: 'dydx',
                fundingRate: m.fundingRate,
                openInterest: m.openInterest,
                marketCap: m.marketCap,
                liquidity: m.liquidity,
                socials: m.socials,
                website: m.website,
                decimals: m.decimals,
                description: m.description,
                chainId: 4 // dYdX
            }))));
        }

        const results = await Promise.all(promises);
        const combined = results.flat();

        return NextResponse.json({
            success: true,
            count: combined.length,
            markets: combined
        }, {
            headers: {
                'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
            }
        });
    } catch (error: any) {
        console.error('[Unified Markets API] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch unified market list' },
            { status: 500 }
        );
    }
}
