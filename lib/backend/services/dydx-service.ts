/**
 * dYdX v4 Indexer Service with Enrichment
 * Fetches real-time market data from dYdX Indexer and enriches it with logos/metadata.
 */

import { OrderBookData, OrderBookLevel } from './orderbook-service';
import { getEnrichedMetadata } from './enrichment-service';

// dYdX Indexer API endpoints
const DYDX_INDEXER_API = 'https://indexer.dydx.trade/v4';

/**
 * Normalizes dYdX market name (e.g., "BTC-USD")
 */
function normalizeMarket(market: string): string {
    return market.toUpperCase().replace('_', '-').replace('/', '-');
}

/**
 * Formats dYdX values (prices/quantities are strings)
 */
function formatValue(value: string | number, decimals: number = 2): string {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '0.00';
    return num.toFixed(decimals);
}

/**
 * Fetches OHLC candles from dYdX
 */
export async function getDydxCandles(market: string, resolution: string = '1DAY', limit: number = 1): Promise<any[]> {
    const symbol = normalizeMarket(market);
    // Corrected path: /v4/candles/perpetualMarkets/{market}
    const url = `${DYDX_INDEXER_API}/candles/perpetualMarkets/${symbol}?resolution=${resolution}&limit=${limit}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`[DydxService] Candles API returned ${response.status} for ${symbol}`);
            return [];
        }
        const data = await response.json();
        return data.candles || [];
    } catch (error) {
        console.error('[DydxService] Error fetching candles:', error);
        return [];
    }
}

/**
 * Fetches all perpetual markets from dYdX with enriched metadata
 */
export async function getDydxMarkets(): Promise<any[]> {
    const url = `${DYDX_INDEXER_API}/perpetualMarkets`;
    try {
        const response = await fetch(url);
        if (!response.ok) return [];
        const data = await response.json();
        const rawMarkets = data.markets ? Object.values(data.markets) : [];

        // Enrich markets with metadata and stats in parallel
        const enrichedMarkets = await Promise.all(
            rawMarkets.map(async (market: any) => {
                try {
                    const baseSymbol = market.ticker.split('-')[0];
                    const [meta, candles] = await Promise.all([
                        getEnrichedMetadata(baseSymbol),
                        getDydxCandles(market.ticker, '1DAY', 1).catch(() => [])
                    ]);
                    
                    const tickerPrice = parseFloat(market.oraclePrice || '0');
                    const priceChange = parseFloat(market.priceChange24H || '0');
                    const priceChangePct = tickerPrice > 0 ? (priceChange / (tickerPrice - priceChange)) * 100 : 0;
                    
                    const lastCandle = candles[0];

                    return {
                        id: `dydx-${market.ticker.toLowerCase()}`,
                        symbol: market.ticker,
                        name: meta.name || market.ticker,
                        logo: meta.logo,
                        description: meta.description,
                        price: tickerPrice,
                        priceChange24h: priceChangePct,
                        volume24h: parseFloat(market.volume24H || '0'),
                        high24h: lastCandle ? parseFloat(lastCandle.high) : tickerPrice,
                        low24h: lastCandle ? parseFloat(lastCandle.low) : tickerPrice,
                        fundingRate: parseFloat(market.nextFundingRate || '0'),
                        openInterest: parseFloat(market.openInterest || '0'),
                        marketCap: meta.marketCap,
                        liquidity: meta.liquidity,
                        socials: meta.socials,
                        website: meta.website,
                        // dYdX atomicResolution is usually negative (e.g. -10 means 10 decimals for price)
                        // Quantum exponent influences quantity
                        decimals: Math.abs(market.atomicResolution || 8),
                        marketType: 'perp',
                        provider: 'dydx',
                        metadataSource: meta.source
                    };
                } catch (enrichError) {
                    return {
                        id: `dydx-${market.ticker.toLowerCase()}`,
                        symbol: market.ticker,
                        name: market.ticker,
                        logo: '',
                        price: parseFloat(market.oraclePrice || '0'),
                        priceChange24h: 0,
                        volume24h: parseFloat(market.volume24H || '0'),
                        marketType: 'perp',
                        provider: 'dydx',
                        metadataSource: 'fallback'
                    };
                }
            })
        );

        return enrichedMarkets;
    } catch (error) {
        console.error('[DydxService] Error fetching markets:', error);
        return [];
    }
}

/**
 * Fetches orderbook snapshot from dYdX
 */
export async function getDydxOrderbook(market: string): Promise<OrderBookData | null> {
    const symbol = normalizeMarket(market);
    const url = `${DYDX_INDEXER_API}/orderbook/${symbol}`;

    try {
        const response = await fetch(url);
        if (!response.ok) return null;

        const data = await response.json();

        const transformLevels = (levels: any[]): OrderBookLevel[] => {
            return levels.slice(0, 12).map((level: any) => ({
                price: formatValue(level.price, 2),
                quantity: formatValue(level.size, 4),
                total: formatValue((parseFloat(level.price) * parseFloat(level.size)).toString(), 2),
            }));
        };

        return {
            symbol: symbol,
            bids: transformLevels(data.bids || []),
            asks: transformLevels(data.asks || []).reverse(),
            lastUpdateId: 0,
            timestamp: Date.now(),
        };
    } catch (error) {
        console.error('[DydxService] Error fetching orderbook:', error);
        return null;
    }
}

/**
 * Fetches 24hr ticker for a market with high/low
 */
export async function getDydxTicker(market: string): Promise<any | null> {
    const symbol = normalizeMarket(market);
    const url = `${DYDX_INDEXER_API}/perpetualMarkets/${symbol}`;

    try {
        const [tickerRes, candleRes] = await Promise.all([
            fetch(url),
            getDydxCandles(symbol, '1DAY', 1)
        ]);

        if (!tickerRes.ok) return null;
        const data = await tickerRes.json();
        const marketData = data.market;

        if (!marketData) return null;

        const lastCandle = candleRes[0];

        return {
            ...marketData,
            high24h: lastCandle ? parseFloat(lastCandle.high) : parseFloat(marketData.oraclePrice),
            low24h: lastCandle ? parseFloat(lastCandle.low) : parseFloat(marketData.oraclePrice),
        };
    } catch (error) {
        console.error('[DydxService] Error fetching ticker:', error);
        return null;
    }
}
