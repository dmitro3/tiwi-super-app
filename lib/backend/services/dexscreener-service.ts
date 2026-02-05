/**
 * DexScreener Service
 * Fetches token metadata and logos from DexScreener API.
 */

const DEXSCREENER_API = 'https://api.dexscreener.com/latest/dex';

interface DexScreenerProfile {
    symbol: string;
    name: string;
    logoUrl?: string;
    description?: string;
    fdv?: number;
    liquidity?: number;
    socials?: { type: string; url: string }[];
    websites?: { label: string; url: string }[];
}

// In-memory cache for metadata (1 hour TTL)
const metadataCache = new Map<string, { data: DexScreenerProfile; expiry: number }>();
const CACHE_TTL = 3600000; // 1 hour

/**
 * Searches DexScreener for a token profile by symbol
 */
export async function searchTokenProfile(symbol: string): Promise<DexScreenerProfile | null> {
    const cacheKey = symbol.toUpperCase();
    const cached = metadataCache.get(cacheKey);

    if (cached && cached.expiry > Date.now()) {
        return cached.data;
    }

    try {
        const url = `${DEXSCREENER_API}/search?q=${symbol}`;
        const response = await fetch(url);

        if (!response.ok) return null;

        const data = await response.json();

        if (!data.pairs || data.pairs.length === 0) return null;

        // Sort pairs by liquidity to find the most relevant one
        const bestPair = data.pairs.sort((a: any, b: any) =>
            (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
        )[0];

        const profile: DexScreenerProfile = {
            symbol: bestPair.baseToken.symbol,
            name: bestPair.baseToken.name,
            logoUrl: bestPair.info?.imageUrl,
            description: bestPair.info?.description,
            fdv: bestPair.fdv || bestPair.marketCap,
            liquidity: bestPair.liquidity?.usd,
            socials: bestPair.info?.socials || [],
            websites: bestPair.info?.websites || [],
        };

        // Cache the result
        metadataCache.set(cacheKey, {
            data: profile,
            expiry: Date.now() + CACHE_TTL
        });

        return profile;
    } catch (error) {
        console.error('[DexScreenerService] Error searching token:', error);
        return null;
    }
}
