import { NextRequest, NextResponse } from 'next/server';
import { getDydxMarkets } from '@/lib/backend/services/dydx-service';
import { getBinanceTickers } from '@/lib/backend/services/binance-ticker-service';
import { getEnrichedMetadata } from '@/lib/backend/services/enrichment-service';
import { getCryptoMetadata } from '@/lib/backend/data/crypto-metadata';
import { getTokenService } from '@/lib/backend/services/token-service';
import { getTokenPrice } from '@/lib/backend/providers/price-provider';
import { getChartDataService } from '@/lib/backend/services/chart-data-service';

/**
 * GET /api/v1/market/[pair]
 * 
 * Returns comprehensive market details for a specific trading pair.
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ pair: string }> }
) {
    try {
        const { pair } = await params;
        const searchParams = req.nextUrl.searchParams;
        const chainIdParam = searchParams.get('chainId');
        const marketType = searchParams.get('marketType') || 'all';

        const normalized = pair.replace("/", "-").replace("_", "-").toUpperCase();
        const parts = normalized.split("-");

        if (parts.length < 2) {
            return NextResponse.json(
                { success: false, error: 'Invalid pair format. Expected: BASE-QUOTE' },
                { status: 400 }
            );
        }

        const [baseSymbol, quoteSymbol] = parts;
        const chainId = chainIdParam ? parseInt(chainIdParam, 10) : 56;

        // ============================================================
        // 1. Try dYdX (Perp)
        // ============================================================
        if (marketType === 'all' || marketType === 'perp') {
            const markets = await getDydxMarkets();
            const pairSymbol = `${baseSymbol}-${quoteSymbol}`;
            const market = markets.find(m => m.symbol === pairSymbol);

            if (market) {
                const tickerPrice = market.price;
                const circulatingSupply = market.marketCap ? market.marketCap / tickerPrice : null;
                const totalSupply = market.fdv ? market.fdv / tickerPrice : (circulatingSupply || null);

                return NextResponse.json({
                    success: true,
                    data: {
                        id: market.id,
                        symbol: baseSymbol,
                        pair: `${baseSymbol}/${quoteSymbol}`,
                        price: tickerPrice,
                        priceUSD: tickerPrice,
                        priceChange24h: market.priceChange24h,
                        high24h: market.high24h || tickerPrice,
                        low24h: market.low24h || tickerPrice,
                        volume24h: market.volume24h,
                        fundingRate: market.fundingRate,
                        openInterest: market.openInterest,
                        marketCap: market.marketCap,
                        fdv: market.fdv,
                        liquidity: market.liquidity,
                        circulatingSupply,
                        totalSupply,
                        baseToken: {
                            symbol: baseSymbol,
                            name: market.name,
                            address: baseSymbol, // Symbol is address for dYdX
                            chainId: 4,
                            logo: market.logo,
                        },
                        quoteToken: {
                            symbol: quoteSymbol,
                            name: quoteSymbol,
                            address: quoteSymbol,
                            chainId: 4,
                            logo: '',
                        },
                        metadata: {
                            name: market.name,
                            logo: market.logo,
                            description: market.description,
                            socials: market.socials,
                            websites: market.websites,
                            website: market.website,
                        },
                        provider: 'dydx',
                        marketType: 'perp',
                        chainId: 4
                    }
                });
            }
        }

        // ============================================================
        // 2. Try Binance (Spot)
        // ============================================================
        if (marketType === 'all' || marketType === 'spot' || quoteSymbol === 'USDT') {
            const binanceSymbol = `${baseSymbol}${quoteSymbol === 'USD' ? 'USDT' : quoteSymbol}`;
            const tickers = await getBinanceTickers('spot', 'top', 500);
            const ticker = tickers.find(t => t.symbol === binanceSymbol);

            if (ticker) {
                const meta = await getEnrichedMetadata(baseSymbol);
                const quoteMeta = getCryptoMetadata(quoteSymbol);
                const currentPrice = ticker.lastPrice;
                const circulatingSupply = meta.marketCap ? meta.marketCap / currentPrice : null;
                const totalSupply = meta.fdv ? meta.fdv / currentPrice : (circulatingSupply || null);

                return NextResponse.json({
                    success: true,
                    data: {
                        id: `binance-${binanceSymbol.toLowerCase()}`,
                        symbol: baseSymbol,
                        pair: `${baseSymbol}/${quoteSymbol}`,
                        price: currentPrice,
                        priceUSD: currentPrice,
                        priceChange24h: ticker.priceChangePercent,
                        high24h: ticker.highPrice,
                        low24h: ticker.lowPrice,
                        volume24h: ticker.quoteVolume,
                        marketCap: meta.marketCap,
                        fdv: meta.fdv,
                        liquidity: meta.liquidity,
                        circulatingSupply,
                        totalSupply,
                        baseToken: {
                            symbol: baseSymbol,
                            name: meta.name,
                            address: baseSymbol,
                            chainId: 0, // Binance internal
                            logo: meta.logo,
                        },
                        quoteToken: {
                            symbol: quoteSymbol,
                            name: quoteMeta.name || quoteSymbol,
                            address: quoteSymbol,
                            chainId: 0,
                            logo: quoteMeta.logo,
                        },
                        metadata: {
                            name: meta.name,
                            logo: meta.logo,
                            description: meta.description,
                            socials: meta.socials,
                            websites: meta.websites,
                            website: meta.website,
                        },
                        provider: 'binance',
                        marketType: 'spot',
                        chainId: 0
                    }
                });
            }
        }

        // ============================================================
        // 3. Fallback: On-Chain
        // ============================================================
        const tokenService = getTokenService();
        const baseTokens = await tokenService.searchTokens(baseSymbol, undefined, [chainId], 1);
        const baseToken = baseTokens[0];

        if (baseToken) {
            const meta = await getEnrichedMetadata(baseSymbol);
            const chartService = getChartDataService();
            const now = Math.floor(Date.now() / 1000);
            const yesterday = now - 24 * 60 * 60;

            const [priceInfo, bars] = await Promise.all([
                getTokenPrice(baseToken.address, chainId, baseSymbol).catch(() => null),
                chartService.getHistoricalBars({
                    baseToken: baseToken.address,
                    quoteToken: '0x0000000000000000000000000000000000000000',
                    chainId,
                    resolution: '15' as any,
                    from: yesterday,
                    to: now,
                    countback: 96,
                }).catch(() => [] as any[]),
            ]);

            const currentPrice = priceInfo ? parseFloat(priceInfo.priceUSD) : parseFloat(baseToken.priceUSD || '0');
            const high24h = bars.length > 0 ? Math.max(...bars.map(b => b.high)) : currentPrice;
            const low24h = bars.length > 0 ? Math.min(...bars.map(b => b.low)) : currentPrice;
            const volume24h = bars.length > 0 ? bars.reduce((s, b) => s + (b.volume || 0), 0) : (baseToken.volume24h || 0);
            const priceChange24h = bars.length > 0 && bars[0].open > 0 ? ((bars[bars.length - 1].close - bars[0].open) / bars[0].open) * 100 : (baseToken.priceChange24h || 0);

            const circulatingSupply = meta.marketCap ? meta.marketCap / currentPrice : null;
            const totalSupply = meta.fdv ? meta.fdv / currentPrice : (circulatingSupply || null);

            return NextResponse.json({
                success: true,
                data: {
                    id: `onchain-${chainId}-${baseToken.address.toLowerCase()}`,
                    symbol: baseSymbol,
                    name: meta.name || baseToken.name,
                    pair: `${baseSymbol}/${quoteSymbol}`,
                    price: currentPrice,
                    priceUSD: currentPrice,
                    priceChange24h,
                    high24h,
                    low24h,
                    volume24h,
                    marketCap: meta.marketCap || baseToken.marketCap,
                    fdv: meta.fdv,
                    liquidity: meta.liquidity || baseToken.liquidity,
                    circulatingSupply,
                    totalSupply,
                    baseToken: {
                        symbol: baseSymbol,
                        name: meta.name || baseToken.name,
                        address: baseToken.address,
                        chainId,
                        logo: meta.logo || baseToken.logoURI,
                    },
                    quoteToken: {
                        symbol: quoteSymbol,
                        name: quoteSymbol,
                        address: '0x0000000000000000000000000000000000000000',
                        chainId,
                        logo: '',
                    },
                    metadata: {
                        name: meta.name || baseToken.name,
                        logo: meta.logo || baseToken.logoURI,
                        description: meta.description,
                        socials: meta.socials,
                        websites: meta.websites,
                        website: meta.website,
                    },
                    provider: 'onchain',
                    marketType: 'spot',
                    chainId
                }
            });
        }

        return NextResponse.json({ success: false, error: 'Market not found' }, { status: 404 });

    } catch (error: any) {
        console.error('[Unified Market API] Error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
