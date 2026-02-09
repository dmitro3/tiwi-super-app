/**
 * Enrichment Service
 * Combines static metadata with dynamic DexScreener lookups to provide 
 * complete token profiles (names, logos, etc).
 */

import { CRYPTO_METADATA, getCryptoMetadata } from '../data/crypto-metadata';
import { searchTokenProfile, searchTokenByAddress } from './dexscreener-service';
import { getTokenDataByAddress, getCoinIdBySymbol, getCoinDataById, resolveNetworkByPlatform } from './coingecko-service';

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
    contractAddress?: string;
    chainId?: number;
    networkName?: string;
    source: 'static' | 'dexscreener' | 'dydx' | 'coingecko';
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

    // Lightweight merge for lists - No CoinGecko searching in loops!
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
 * PHASE 1 & 2 Optimized: Deep Institutional Resolver
 * TRIGGERED ONLY FOR INDIVIDUAL PAIR DETAIL PAGES.
 * Resolves a symbol to a full CoinGecko profile for high-trust overrides.
 */
export async function getDeepInstitutionalMetadata(symbol: string): Promise<any> {
    const cgId = await getCoinIdBySymbol(symbol);
    if (!cgId) return null;
    const cgData = await getCoinDataById(cgId);
    if (!cgData) return null;

    // Resolve network context from asset_platform_id
    const network = resolveNetworkByPlatform(cgData.assetPlatformId);
    const platformData = cgData.assetPlatformId ? cgData.platforms[cgData.assetPlatformId] : null;

    return {
        ...cgData,
        chainId: network?.chainId,
        networkName: network?.name,
        contractAddress: platformData?.contract_address,
        decimals: platformData?.decimal_place
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

    // Use ID from address-based lookup if available, otherwise fallback to symbol search
    // const cgId = cgMeta?.id || await getCoinIdBySymbol(upperSymbol);
    // const cgData = cgId ? await getCoinDataById(cgId) : null;

    // Resolve network context from asset_platform_id
    const network = cgMeta ? resolveNetworkByPlatform(cgMeta.assetPlatformId!) : null;
    const platformData = cgMeta?.assetPlatformId ? cgMeta.platforms[cgMeta.assetPlatformId] : null;

    // Phase 2 Social Override
    const twitterSocial = cgMeta?.twitter ? { type: 'twitter', url: cgMeta.twitter } : undefined;
    const telegramSocial = cgMeta?.telegram ? { type: 'telegram', url: cgMeta.telegram } : undefined;
    const combinedSocials = [
        ...(twitterSocial ? [twitterSocial] : []),
        ...(telegramSocial ? [telegramSocial] : []),
        ...(dexMeta?.socials?.filter((s: any) => s.type !== 'twitter' && s.type !== 'telegram') || [])
    ];

    return {
        symbol: upperSymbol,
        name: cgMeta?.name || dexMeta?.name || name,
        logo: cgMeta?.logo || logo || dexMeta?.logoUrl || '',
        description: cgMeta?.description || cgMeta?.description || dexMeta?.description,
        marketCap: cgMeta?.marketCap || dexMeta?.marketCap,
        fdv: cgMeta?.fdv || dexMeta?.fdv,
        liquidity: dexMeta?.liquidity,
        volume24h: cgMeta?.totalVolume || dexMeta?.volume24h,
        priceChange24h: cgMeta?.priceChange24h || dexMeta?.priceChange24h,
        high24h: cgMeta?.high24h || cgMeta?.high24h, // Prioritize Full CG Data -> CG Surgical -> Bars
        low24h: cgMeta?.low24h || cgMeta?.low24h,
        totalSupply: cgMeta?.totalSupply || (cgMeta?.totalSupply !== undefined ? cgMeta.totalSupply : undefined),
        circulatingSupply: cgMeta?.circulatingSupply || (cgMeta?.circulatingSupply !== undefined ? cgMeta.circulatingSupply : undefined),
        marketCapRank: (cgMeta?.marketCapRank !== undefined) ? cgMeta.marketCapRank : (cgMeta?.marketCapRank !== undefined ? cgMeta.marketCapRank : undefined),
        socials: combinedSocials,
        website: cgMeta?.website || dexMeta?.websites?.[0]?.url,
        websites: cgMeta?.website ? [{ label: 'Website', url: cgMeta.website }] : dexMeta?.websites,
        decimals: platformData?.decimal_place || cgMeta?.decimals || 18,
        contractAddress: platformData?.contract_address || address,
        chainId: network?.chainId || chainId,
        networkName: network?.name,
        rank: (cgMeta?.marketCapRank !== undefined) ? cgMeta.marketCapRank : (cgMeta?.marketCapRank !== undefined ? cgMeta.marketCapRank : undefined),
        source: cgMeta ? 'coingecko' : (dexMeta || cgMeta ? 'dexscreener' : 'static')
    };
}
