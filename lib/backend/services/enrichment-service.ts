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

    // Initial defaults from symbol or internal fallback
    const basicMeta = getCryptoMetadata(upperSymbol);
    let name = basicMeta.name;
    let logo = basicMeta.logo || '';
    let description = basicMeta.description || '';
    let source: 'static' | 'dexscreener' | 'dydx' = 'static';

    // 1. Try static metadata (highest trust for logo/name)
    const staticMeta = CRYPTO_METADATA[upperSymbol];
    if (staticMeta && staticMeta.logo) {
        name = staticMeta.name;
        logo = staticMeta.logo;
        description = staticMeta.description || description;
    }

    // 2. Fetch dynamic metadata from DexScreener (Market Cap, Liquidity, Socials)
    const dexMeta = await searchTokenProfile(upperSymbol);

    // Combine the data
    return {
        symbol: upperSymbol,
        name: dexMeta?.name || name,
        logo: logo || dexMeta?.logoUrl || '',
        description: description || dexMeta?.description,
        marketCap: dexMeta?.fdv,
        liquidity: dexMeta?.liquidity,
        socials: dexMeta?.socials,
        website: dexMeta?.websites?.[0]?.url,
        source: dexMeta ? 'dexscreener' : 'static'
    };
}
