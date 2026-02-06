/**
 * TWC Service
 * Dedicated service to fetch reliable market data for the Tiwi Coin (TWC).
 * Uses DexScreener by contract address for maximum reliability.
 */

const TWC_CONTRACT = "0xDA1060158F7D593667cCE0a15DB346BB3FfB3596";
const BSC_CHAIN_ID = "bsc";
const DEXSCREENER_API = "https://api.dexscreener.com/latest/dex/tokens";

export interface TwcMarketData {
    id: string;
    symbol: string;
    name: string;
    logo: string;
    price: number;
    priceChange24h: number;
    volume24h: number;
    high24h: number;
    low24h: number;
    marketType: 'spot' | 'perp';
    provider: string;
    marketCap?: number;
    fdv?: number;
    liquidity?: number;
    rank?: number;
    chainId: number;
    socials?: any[];
    website?: string;
    websites?: any[];
}

/**
 * Fetches reliable TWC market data from DexScreener
 */
export async function getTwcMarketData(): Promise<TwcMarketData | null> {
    try {
        const url = `${DEXSCREENER_API}/${TWC_CONTRACT}`;
        const response = await fetch(url, { next: { revalidate: 30 } });

        if (!response.ok) return null;

        const data = await response.json();
        const pairs = data.pairs || [];

        // Find the best BSC pair (WBNB or USDT)
        const bscPairs = pairs.filter((p: any) => p.chainId === BSC_CHAIN_ID);
        if (bscPairs.length === 0) return null;

        // Sort by liquidity to get the primary pair
        const primaryPair = bscPairs.sort((a: any, b: any) =>
            (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
        )[0];

        return {
            id: `twc-bsc-spot`,
            symbol: "TWC",
            name: "Tiwi Coin",
            logo: primaryPair.info?.imageUrl || "/assets/icons/tokens/twc.svg",
            price: parseFloat(primaryPair.priceUsd || "0"),
            priceChange24h: parseFloat(primaryPair.priceChange?.h24 || "0"),
            volume24h: parseFloat(primaryPair.volume?.h24 || "0"),
            high24h: parseFloat(primaryPair.priceUsd || "0"), // DexScreener doesn't easily gve high/low in this endpoint
            low24h: parseFloat(primaryPair.priceUsd || "0"),
            marketType: 'spot',
            provider: 'dexscreener',
            marketCap: primaryPair.fdv, // Use FDV as market cap proxy if not available
            fdv: primaryPair.fdv,
            liquidity: primaryPair.liquidity?.usd,
            socials: primaryPair.info?.socials || [],
            website: primaryPair.info?.websites?.[0]?.url,
            websites: primaryPair.info?.websites || [],
            chainId: 56
        };
    } catch (error) {
        console.error("[TwcService] Error fetching TWC data:", error);
        return null;
    }
}
