/**
 * On-Chain Market Service
 * Provides robust, multi-source enrichment for on-chain tokens.
 * Matches the logic used in the individual market pair resolution.
 */

import { getSurgicalMetadata } from './enrichment-service';
import { getTokenPrice } from '../providers/price-provider';
import { getChartDataService } from './chart-data-service';

export interface OnChainMarketData {
    id: string;
    symbol: string;
    name: string;
    logo?: string;
    price: number;
    priceUSD: number;
    priceChange24h: number;
    high24h: number;
    low24h: number;
    volume24h: number;
    marketCap: number | null;
    fdv: number | null;
    liquidity: number | null;
    circulatingSupply: number | null;
    totalSupply: number | null;
    rank?: number;
    marketCapRank?: number;
    socials?: any[];
    website?: string;
    websites?: any[];
    decimals?: number;
    description?: string;
    fundingRate?: number;
    openInterest?: number;
    baseToken: {
        symbol: string;
        name: string;
        address: string;
        chainId: number;
        logo?: string;
    };
    quoteToken: {
        symbol: string;
        name: string;
        address: string;
        chainId: number;
        logo?: string;
    };
    metadata: {
        name: string;
        logo?: string;
        description?: string;
        socials?: any[];
        websites?: any[];
        website?: string;
    };
    provider: 'onchain';
    marketType: 'spot' | 'perp';
    chainId: number;
}

/**
 * Resolves comprehensive market data for an on-chain token
 */
export async function resolveOnChainMarket(
    baseSymbol: string,
    quoteSymbol: string,
    address: string,
    chainId: number,
    existingToken?: any
): Promise<OnChainMarketData | null> {
    try {
        // 1. Fetch Surgical Metadata (logos, socials, names, descriptions)
        const meta = await getSurgicalMetadata(baseSymbol, address, chainId);

        // 2. Setup historical window for stats
        const chartService = getChartDataService();
        const now = Math.floor(Date.now() / 1000);
        const yesterday = now - 24 * 60 * 60;

        // 3. Fetch Price and Historical Bars in parallel
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

        const currentPrice = priceInfo ? parseFloat(priceInfo.priceUSD) : parseFloat(existingToken?.priceUSD || '0');

        // 4. Calculate High/Low with Priority: CoinGecko -> Historical Bars -> DexScreener -> Current Price
        const high24h = (meta.high24h && meta.high24h > 0)
            ? meta.high24h
            : (bars.length > 0 ? Math.max(...bars.map(b => b.high)) : (meta.high24h || currentPrice));

        const low24h = (meta.low24h && meta.low24h > 0)
            ? meta.low24h
            : (bars.length > 0 ? Math.min(...bars.map(b => b.low)) : (meta.low24h || currentPrice));

        // 5. Calculate Supply Metrics
        const circulatingSupply = meta.circulatingSupply || (meta.marketCap && currentPrice > 0 ? meta.marketCap / currentPrice : null);
        const totalSupply = meta.totalSupply || (meta.fdv && currentPrice > 0 ? meta.fdv / currentPrice : (circulatingSupply || null));

        return {
            id: `onchain-${chainId}-${address.toLowerCase()}`,
            symbol: baseSymbol,
            name: meta.name || existingToken?.name || baseSymbol,
            logo: meta.logo || existingToken?.logoURI,
            price: currentPrice,
            priceUSD: currentPrice,
            priceChange24h: meta.priceChange24h || 0,
            high24h,
            low24h,
            volume24h: meta.volume24h || 0,
            marketCap: meta.marketCap || null,
            fdv: meta.fdv || null,
            liquidity: meta.liquidity || null,
            rank: meta.marketCapRank,
            marketCapRank: meta.marketCapRank,
            circulatingSupply,
            totalSupply,
            socials: meta.socials,
            website: meta.website,
            websites: meta.websites,
            decimals: meta.decimals || 18,
            description: meta.description,
            fundingRate: 0,
            openInterest: 0,
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
        };
    } catch (error) {
        console.error('[OnChainMarketService] Error resolving market:', error);
        return null;
    }
}
