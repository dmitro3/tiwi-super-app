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
    marketCap?: number;
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

        if (symbol.toUpperCase() === 'BTC' && data.pairs?.[0]) {
            console.log('Base Token:', data.pairs);
        }

        if (!data.pairs || data.pairs.length === 0) return null;

        // 1. Sort pairs by liquidity to find the quantitative "best" pair
        const sortedPairs = [...data.pairs].sort((a: any, b: any) =>
            (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
        );
        const bestPair = sortedPairs[0];

        // 2. Aggregate qualitative data from all pairs (socials, websites, logos)
        // Some pairs might have missing info that others have.
        let logoUrl = bestPair.info?.imageUrl;
        let description = bestPair.info?.description;
        const socialsMap = new Map<string, { type: string; url: string }>();
        const websitesMap = new Map<string, { label: string; url: string }>();

        // Pre-populate with best pair info (preserving order/priority)
        if (bestPair.info?.socials) {
            bestPair.info.socials.forEach((s: any) => {
                if (s.url) socialsMap.set(s.url.toLowerCase(), { type: s.type, url: s.url });
            });
        }
        if (bestPair.info?.websites) {
            bestPair.info.websites.forEach((w: any) => {
                if (w.url) websitesMap.set(w.url.toLowerCase(), { label: w.label, url: w.url });
            });
        }

        // Fill in missing bits from other pairs
        for (const pair of sortedPairs) {
            if (!logoUrl && pair.info?.imageUrl) logoUrl = pair.info.imageUrl;
            if (!description && pair.info?.description) description = pair.info.description;

            if (pair.info?.socials) {
                pair.info.socials.forEach((s: any) => {
                    if (s.url && !socialsMap.has(s.url.toLowerCase())) {
                        socialsMap.set(s.url.toLowerCase(), { type: s.type, url: s.url });
                    }
                });
            }
            if (pair.info?.websites) {
                pair.info.websites.forEach((w: any) => {
                    if (w.url && !websitesMap.has(w.url.toLowerCase())) {
                        websitesMap.set(w.url.toLowerCase(), { label: w.label, url: w.url });
                    }
                });
            }
        }

        const profile: DexScreenerProfile = {
            symbol: bestPair.baseToken.symbol,
            name: bestPair.baseToken.name,
            logoUrl: logoUrl,
            description: description,
            marketCap: bestPair.marketCap,
            fdv: bestPair.fdv,
            liquidity: bestPair.liquidity?.usd,
            socials: Array.from(socialsMap.values()),
            websites: Array.from(websitesMap.values()),
        };

        // If no X/Twitter social exists, add a placeholder search redirect
        const hasTwitter = profile.socials?.some(s => s.type === 'twitter' || s.type === 'x');
        if (!hasTwitter) {
            profile.socials?.push({
                type: 'twitter',
                url: `https://x.com/search?q=${symbol}+token`
            });
        }

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
