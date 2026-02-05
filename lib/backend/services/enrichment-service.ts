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
    liquidity?: number;
    socials?: any[];
    website?: string;
    source: 'static' | 'dexscreener' | 'dydx';
}

/**
 * Gets the best available metadata for a token symbol
 */
export async function getEnrichedMetadata(symbol: string): Promise<TokenMetadata> {
    const upperSymbol = symbol.toUpperCase();

    // 1. Try static metadata first (curated, highest trust)
    const staticMeta = CRYPTO_METADATA[upperSymbol];
    if (staticMeta && staticMeta.logo && staticMeta.logo !== '') {
        return {
            symbol: upperSymbol,
            name: staticMeta.name,
            logo: staticMeta.logo,
            description: staticMeta.description,
            source: 'static'
        };
    }

    // 2. Fallback to DexScreener (dynamic, handles long-tail tokens)
    const dexMeta = await searchTokenProfile(upperSymbol);
    if (dexMeta && dexMeta.logoUrl) {
        return {
            symbol: upperSymbol,
            name: dexMeta.name,
            logo: dexMeta.logoUrl,
            description: dexMeta.description,
            marketCap: dexMeta.fdv,
            liquidity: dexMeta.liquidity,
            socials: dexMeta.socials,
            website: dexMeta.websites?.[0]?.url,
            source: 'dexscreener'
        };
    }

    // 3. Last resort: internal fallback
    const basicMeta = getCryptoMetadata(upperSymbol);
    return {
        symbol: upperSymbol,
        name: basicMeta.name,
        logo: basicMeta.logo || '',
        description: basicMeta.description,
        source: 'static'
    };
}
