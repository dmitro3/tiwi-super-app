/**
 * CoinGecko Service
 * High-trust metadata fetches for contract addresses.
 */

const COINGECKO_API = 'https://api.coingecko.com/api/v3';
const API_KEY = 'CG-H5hx3pVrExRw76mpSVmATxTq';

interface CoinGeckoData {
    description?: string;
    high24h?: number;
    low24h?: number;
    totalSupply?: number;
    circulatingSupply?: number;
    maxSupply?: number;
    marketCapRank?: number;
    decimals?: number;
    id: string; // The CoinGecko unique ID
    assetPlatformId?: string;
    platforms?: any;
    name?: string;
    logo?: string;
    website?: string;
    twitter?: string;
    telegram?: string;
    marketCap?: number;
    fdv?: number;
    totalVolume?: number;
    priceChange24h?: number;
}

/**
 * In-memory cache for ID Persistence (mappings from Symbol -> ID)
 */
const SYMBOL_TO_ID_CACHE = new Map<string, string>();
const COIN_DATA_CACHE = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes cache for market data

/**
 * Institutional Platform Registry
 * Maps CoinGecko Platform Slugs to rich Network Context (Chain ID, Pretty Name)
 * Derived from LiFi and CoinGecko technical specifications.
 */
export interface NetworkConfig {
    chainId: number;
    name: string;
}

export const PLATFORM_REGISTRY: Record<string, NetworkConfig> = {
    'ethereum': { chainId: 1, name: 'Ethereum' },
    'binance-smart-chain': { chainId: 56, name: 'BNB Chain' },
    'polygon-pos': { chainId: 137, name: 'Polygon' },
    'base': { chainId: 8453, name: 'Base' },
    'arbitrum-one': { chainId: 42161, name: 'Arbitrum' },
    'optimistic-ethereum': { chainId: 10, name: 'Optimism' },
    'avalanche': { chainId: 43114, name: 'Avalanche' },
    'fantom': { chainId: 250, name: 'Fantom' },
    'solana': { chainId: 7565164, name: 'Solana' },
    'xdai': { chainId: 100, name: 'Gnosis' },
    'metis-andromeda': { chainId: 1088, name: 'Metis' },
    'lisk': { chainId: 1135, name: 'Lisk' },
    'sei-network': { chainId: 1329, name: 'Sei' },
    'sonic': { chainId: 146, name: 'Sonic' },
    'gravity-alpha': { chainId: 1625, name: 'Gravity' },
    'taiko': { chainId: 167000, name: 'Taiko' },
    'soneium': { chainId: 1868, name: 'Soneium' },
    'swell': { chainId: 1923, name: 'Swellchain' },
    'ronin': { chainId: 2020, name: 'Ronin' },
    'cronos': { chainId: 25, name: 'Cronos' },
    'zksync': { chainId: 324, name: 'zkSync' },
    'apechain': { chainId: 33139, name: 'Apechain' },
    'mode': { chainId: 34443, name: 'Mode' },
    'celo': { chainId: 42220, name: 'Celo' },
    'mantle': { chainId: 5000, name: 'Mantle' },
    'scroll': { chainId: 534352, name: 'Scroll' },
    'linea': { chainId: 59144, name: 'Linea' },
    'blast': { chainId: 81457, name: 'Blast' },
    'hyperliquid': { chainId: 1337, name: 'Hyperliquid' }
};

/**
 * Resolves a CoinGecko Platform Slug to a Network Config
 */
export function resolveNetworkByPlatform(platformId: string | null): NetworkConfig | null {
    if (!platformId) return null;
    return PLATFORM_REGISTRY[platformId] || null;
}

/**
 * Fetches verified token data by contract address from CoinGecko
 */
export async function getTokenDataByAddress(chainId: number, address: string): Promise<CoinGeckoData | null> {
    // Resolve platform slug from chain ID using the registry
    const entries = Object.entries(PLATFORM_REGISTRY);
    const [platform] = entries.find(([_, config]) => config.chainId === chainId) || [];
    if (!platform) return null;

    try {
        const url = `${COINGECKO_API}/coins/${platform}/contract/${address}`;
        const response = await fetch(url, {
            headers: {
                'x-cg-demo-api-key': API_KEY
            }
        });

        if (!response.ok) {
            console.error(`[CoinGeckoService] API returned ${response.status} for ${address} on ${platform}`);
            return null;
        }

        const data = await response.json();

        return {
            id: data.id,
            name: data.name,
            logo: data.image?.large,
            description: data.description?.en,
            website: data.links?.homepage?.[0],
            twitter: data.links?.twitter_screen_name ? `https://x.com/${data.links.twitter_screen_name}` : undefined,
            telegram: data.links?.telegram_channel_identifier ? `https://t.me/${data.links.telegram_channel_identifier}` : undefined,
            marketCapRank: data.market_cap_rank,
            marketCap: data.market_data?.market_cap?.usd,
            fdv: data.market_data?.fully_diluted_valuation?.usd,
            totalVolume: data.market_data?.total_volume?.usd,
            high24h: data.market_data?.high_24h?.usd,
            low24h: data.market_data?.low_24h?.usd,
            priceChange24h: data.market_data?.price_change_percentage_24h,
            totalSupply: data.market_data?.total_supply,
            maxSupply: data.market_data?.max_supply,
            circulatingSupply: data.market_data?.circulating_supply,
            assetPlatformId: data.asset_platform_id,
            platforms: data.detail_platforms
        };
    } catch (error) {
        console.error('[CoinGeckoService] Error fetching token data:', error);
        return null;
    }
}

/**
 * PHASE 1: Step 1 & 2 - Adaptive Search and Intelligent Filter
 * Resolves a symbol (e.g. BTC) to a CoinGecko ID (e.g. bitcoin)
 */
export async function getCoinIdBySymbol(symbol: string): Promise<string | null> {
    const upperSymbol = symbol.toUpperCase();

    // Step 3: ID Persistence (Check Cache)
    if (SYMBOL_TO_ID_CACHE.has(upperSymbol)) {
        return SYMBOL_TO_ID_CACHE.get(upperSymbol)!;
    }

    try {
        const url = `${COINGECKO_API}/search?query=${symbol}`;
        const response = await fetch(url, {
            headers: {
                'x-cg-demo-api-key': API_KEY
            }
        });

        if (!response.ok) return null;

        const data = await response.json();
        const coins = data.coins || [];

        // Intelligent Filter: Prioritize exact symbol matches with the best rank
        const bestMatch = coins
            .filter((c: any) => c.symbol.toUpperCase() === upperSymbol)
            .sort((a: any, b: any) => (a.market_cap_rank || 999999) - (b.market_cap_rank || 999999))[0];

        if (bestMatch) {
            SYMBOL_TO_ID_CACHE.set(upperSymbol, bestMatch.id);
            return bestMatch.id;
        }

        return null;
    } catch (error) {
        console.error('[CoinGeckoService] Error searching coin:', error);
        return null;
    }
}

/**
 * PHASE 2: High-Fidelity Resolver
 * Fetches full coin profile and extracts institutional fields.
 */
export async function getCoinDataById(id: string) {
    // Check Cache
    const cached = COIN_DATA_CACHE.get(id);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        return cached.data;
    }

    try {
        const url = `${COINGECKO_API}/coins/${id}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false`;
        console.log("🚀 ~ getTokenDataByAddress ~ url:", url)
        console.log("🚀 ~ getTokenDataByAddress ~ url:", url)
        const response = await fetch(url, {
            headers: {
                'x-cg-demo-api-key': API_KEY
            }
        });

        if (!response.ok) return null;

        const data = await response.json();

        // Surgical Extraction
        const refined = {
            id: data.id,
            name: data.name,
            logo: data.image?.large,
            description: data.description?.en,
            website: data.links?.homepage?.[0],
            twitter: data.links?.twitter_screen_name ? `https://x.com/${data.links.twitter_screen_name}` : undefined,
            telegram: data.links?.telegram_channel_identifier ? `https://t.me/${data.links.telegram_channel_identifier}` : undefined,
            marketCapRank: data.market_cap_rank,
            marketCap: data.market_data?.market_cap?.usd,
            fdv: data.market_data?.fully_diluted_valuation?.usd,
            totalVolume: data.market_data?.total_volume?.usd,
            high24h: data.market_data?.high_24h?.usd,
            low24h: data.market_data?.low_24h?.usd,
            priceChange24h: data.market_data?.price_change_percentage_24h,
            totalSupply: data.market_data?.total_supply,
            maxSupply: data.market_data?.max_supply,
            circulatingSupply: data.market_data?.circulating_supply,
            assetPlatformId: data.asset_platform_id,
            platforms: data.detail_platforms
        };

        COIN_DATA_CACHE.set(id, { data: refined, timestamp: Date.now() });
        return refined;
    } catch (error) {
        console.error(`[CoinGeckoService] Error fetching coin data for ${id}:`, error);
        return null;
    }
}
