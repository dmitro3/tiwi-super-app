import { NextRequest, NextResponse } from 'next/server';
import { getDydxMarkets } from '@/lib/backend/services/dydx-service';
import { getBinanceTickers } from '@/lib/backend/services/binance-ticker-service';
import { getEnrichedMetadata, getSurgicalMetadata } from '@/lib/backend/services/enrichment-service';
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
        const address = searchParams.get('address');
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
        // 1. Smart Dispatcher: Check for explicit address (Phase 1)
        // ============================================================
        if (address && address.startsWith('0x')) {
            // Bypass dYdX and Binance - Route directly to External/On-Chain flow
            return await handleExternalTokenResolution(baseSymbol, quoteSymbol, address, chainId);
        }

        // ============================================================
        // 2. Try dYdX (Perp)
        // ============================================================
        if (marketType === 'all' || marketType === 'perp') {
            const { getDydxMarkets } = await import('@/lib/backend/services/dydx-service');
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
        // 3. Try Binance (Spot)
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
        // 4. Default Resolution: On-Chain Search
        // ============================================================
        const tokenService = getTokenService();
        const baseTokens = await tokenService.searchTokens(baseSymbol, undefined, [chainId], 1);
        const baseToken = baseTokens[0];

        if (baseToken) {
            return await handleExternalTokenResolution(baseSymbol, quoteSymbol, baseToken.address, chainId, baseToken);
        }

        return NextResponse.json({ success: false, error: 'Market not found' }, { status: 404 });

    } catch (error: any) {
        console.error('[Unified Market API] Error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * Shared logic for resolving and enriching external (on-chain) tokens
 */
async function handleExternalTokenResolution(
    baseSymbol: string,
    quoteSymbol: string,
    address: string,
    chainId: number,
    existingToken?: any
) {
    const meta = await getSurgicalMetadata(baseSymbol, address, chainId);
    console.log("🚀 ~ handleExternalTokenResolution ~ meta:", meta)
    const chartService = getChartDataService();
    const now = Math.floor(Date.now() / 1000);
    const yesterday = now - 24 * 60 * 60;

    const [priceInfo, bars] = await Promise.all([
        getTokenPrice(address, chainId, baseSymbol).catch(() => null),
        chartService.getHistoricalBars({
            baseToken: address,
            quoteToken: '0x0000000000000000000000000000000000000000',
            chainId,
            resolution: '15' as any,
            from: yesterday,
            to: now,
            countback: 96,
        }).catch(() => [] as any[]),
    ]);
    console.log("🚀 ~ handleExternalTokenResolution ~ priceInfo:", { priceInfo, bars })

    const currentPrice = priceInfo ? parseFloat(priceInfo.priceUSD) : parseFloat(existingToken?.priceUSD || '0');

    // Priority: CoinGecko Verified -> Historical Bars -> DexScreener -> Current Price
    // Ensure we don't return 0 if better data is available
    const high24h = (meta.high24h && meta.high24h > 0)
        ? meta.high24h
        : (bars.length > 0 ? Math.max(...bars.map(b => b.high)) : (meta.high24h || currentPrice));

    const low24h = (meta.low24h && meta.low24h > 0)
        ? meta.low24h
        : (bars.length > 0 ? Math.min(...bars.map(b => b.low)) : (meta.low24h || currentPrice));

    // Suppressed or Calculated Supply
    const circulatingSupply = meta.circulatingSupply || (meta.marketCap ? meta.marketCap / currentPrice : null);
    const totalSupply = meta.totalSupply || (meta.fdv ? meta.fdv / currentPrice : (circulatingSupply || null));

    return NextResponse.json({
        success: true,
        data: {
            id: `onchain-${chainId}-${address.toLowerCase()}`,
            symbol: baseSymbol,
            name: meta.name || existingToken?.name || baseSymbol,
            pair: `${baseSymbol}/${quoteSymbol}`,
            price: currentPrice,
            priceUSD: currentPrice,
            priceChange24h: meta.priceChange24h,
            high24h,
            low24h,
            volume24h: meta.volume24h,
            fundingRate: 0.00, // Spot fallback
            openInterest: 0.00, // Spot fallback
            marketCap: meta.marketCap || existingToken?.marketCap,
            fdv: meta.fdv,
            liquidity: meta.liquidity || existingToken?.liquidity,
            circulatingSupply,
            totalSupply,
            baseToken: {
                symbol: baseSymbol,
                name: meta.name || existingToken?.name || baseSymbol,
                address: address,
                chainId,
                logo: meta.logo || existingToken?.logoURI,
            },
            quoteToken: {
                symbol: quoteSymbol,
                name: quoteSymbol,
                address: '0x0000000000000000000000000000000000000000',
                chainId,
                logo: '',
            },
            metadata: {
                name: meta.name || existingToken?.name || baseSymbol,
                logo: meta.logo || existingToken?.logoURI,
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
