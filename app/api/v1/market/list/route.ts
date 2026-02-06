import { NextRequest, NextResponse } from 'next/server';
import { getBinanceTickers } from '@/lib/backend/services/binance-ticker-service';
import { getDydxMarkets } from '@/lib/backend/services/dydx-service';
import { getFeaturedMarkets } from '@/lib/backend/services/featured-service';

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

        // Fetch Featured Markets (Promoted tokens like TWC)
        promises.push(getFeaturedMarkets());

        // Fetch enriched dYdX markets (perps)

        if (marketType === 'all' || marketType === 'perp' || marketType === 'spot') {
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
                fdv: m.fdv,
                rank: m.rank,
                marketCapRank: m.rank,
                liquidity: m.liquidity,
                socials: m.socials,
                website: m.website,
                websites: m.websites,
                decimals: m.decimals,
                description: m.description,
                chainId: 4,
            }))));
        }

        // Fetch Binance spot markets
        // if (marketType === 'all' || marketType === 'spot') {
        // ...
        // }

        const results = await Promise.all(promises);
        let combined = results.flat();

        // Sort by volume, but PIN TWC to the top (index 0)
        combined.sort((a, b) => {
            if (a.symbol === 'TWC') return -1;
            if (b.symbol === 'TWC') return 1;
            return (b.volume24h || 0) - (a.volume24h || 0);
        });

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
