/**
 * Enrichment Service
 * Combines static metadata with dynamic DexScreener lookups to provide 
 * complete token profiles (names, logos, etc).
 */

import { CRYPTO_METADATA, getCryptoMetadata } from '../data/crypto-metadata';
import { searchTokenProfile, searchTokenByAddress } from './dexscreener-service';
import { getTokenDataByAddress } from './coingecko-service';

export interface TokenMetadata {
    symbol: string;
    name: string;
    logo: string;
    description?: string;
    marketCap?: number;
    fdv?: number;
    liquidity?: number;
    volume24h?: number;
    priceChange24h?: number;
    high24h?: number;
    low24h?: number;
    totalSupply?: number;
    circulatingSupply?: number;
    marketCapRank?: number;
    socials?: any[];
    website?: string;
    websites?: any[];
    decimals?: number;
    rank?: number;
    source: 'static' | 'dexscreener' | 'dydx';
}

/**
 * Gets the best available metadata for a token symbol
 */
export async function getEnrichedMetadata(symbol: string): Promise<TokenMetadata> {
    const upperSymbol = symbol.toUpperCase();

    // Initial defaults from symbol or internal fallback
    const basicMeta = getCryptoMetadata(upperSymbol);
    let name = basicMeta.name;
    let logo = basicMeta.logo || '';
    let description = basicMeta.description || '';

    // 1. Try static metadata (highest trust for logo/name)
    const staticMeta = CRYPTO_METADATA[upperSymbol];
    if (staticMeta && staticMeta.logo) {
        name = staticMeta.name;
        logo = staticMeta.logo;
        description = staticMeta.description || description;
    }

    // 2. Fetch dynamic metadata from DexScreener (Market Cap, Liquidity, Socials, Websites)
    const dexMeta = await searchTokenProfile(upperSymbol);

    // Combine the data, prioritizing static for name/logo/description if available,
    // but allowing DexScreener to fill in the gaps and provide market metrics.
    return {
        symbol: upperSymbol,
        name: dexMeta?.name || name,
        logo: logo || dexMeta?.logoUrl || '',
        description: description || dexMeta?.description,
        marketCap: dexMeta?.marketCap,
        fdv: dexMeta?.fdv,
        liquidity: dexMeta?.liquidity,
        socials: dexMeta?.socials,
        website: dexMeta?.websites?.[0]?.url,
        websites: dexMeta?.websites,
        source: dexMeta ? 'dexscreener' : 'static'
    };
}

/**
 * Gets precise metadata for a specific token address (Surgical Resolution)
 */
export async function getSurgicalMetadata(symbol: string, address: string, chainId: number): Promise<TokenMetadata> {
    const upperSymbol = symbol.toUpperCase();

    // 1. Initial defaults from static mapping
    const basicMeta = getCryptoMetadata(upperSymbol);
    let name = basicMeta.name;
    let logo = basicMeta.logo || '';
    let description = basicMeta.description || '';

    const staticMeta = CRYPTO_METADATA[upperSymbol];
    if (staticMeta && staticMeta.logo) {
        name = staticMeta.name;
        logo = staticMeta.logo;
        description = staticMeta.description || description;
    }

    // 2. Surgical lookups in parallel
    const [dexMeta, cgMeta] = await Promise.all([
        searchTokenByAddress(address, chainId),
        getTokenDataByAddress(chainId, address).catch(() => null)
    ]);

    return {
        symbol: upperSymbol,
        name: dexMeta?.name || name,
        logo: logo || dexMeta?.logoUrl || '',
        description: description || cgMeta?.description || dexMeta?.description,
        marketCap: dexMeta?.marketCap,
        fdv: dexMeta?.fdv,
        liquidity: dexMeta?.liquidity,
        volume24h: dexMeta?.volume24h,
        priceChange24h: dexMeta?.priceChange24h,
        high24h: cgMeta?.high24h, // Prioritize CG for verified 24h stats
        low24h: cgMeta?.low24h,
        totalSupply: cgMeta?.totalSupply,
        circulatingSupply: cgMeta?.circulatingSupply,
        marketCapRank: cgMeta?.marketCapRank,
        socials: dexMeta?.socials,
        website: dexMeta?.websites?.[0]?.url,
        websites: dexMeta?.websites,
        decimals: cgMeta?.decimals || 18,
        rank: cgMeta?.marketCapRank,
        source: dexMeta || cgMeta ? 'dexscreener' : 'static'
    };
}
