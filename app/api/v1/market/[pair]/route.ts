import { NextRequest, NextResponse } from 'next/server';

// Vercel Serverless Function Config
export const maxDuration = 60; // 60 seconds (Pro plan limit)

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

import { resolveOnChainMarket } from '@/lib/backend/services/onchain-market-service';

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
    const marketData = await resolveOnChainMarket(baseSymbol, quoteSymbol, address, chainId, existingToken);

    if (!marketData) {
        return NextResponse.json({ success: false, error: 'Failed to resolve market data' }, { status: 500 });
    }

    // Add pair field which is expected by the frontend detail page
    const responseData = {
        ...marketData,
        pair: `${baseSymbol}/${quoteSymbol}`,
    };

    return NextResponse.json({
        success: true,
        data: responseData
    });
}
