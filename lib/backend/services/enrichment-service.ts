/**
 * Enrichment Service
 * Combines static metadata with dynamic DexScreener lookups to provide 
 * complete token profiles (names, logos, etc).
 */

import { CRYPTO_METADATA, getCryptoMetadata } from '../data/crypto-metadata';
import { searchTokenProfile } from './dexscreener-service';

export interface TokenMetadata {
    symbol: string;
    name: string;
    logo: string;
    description?: string;
    marketCap?: number;
    fdv?: number;
    liquidity?: number;
    socials?: any[];
    website?: string;
    websites?: any[];
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

    if (upperSymbol === 'BTC') {
        console.log('DexScreener metadata for LINK:', dexMeta);
    }

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
