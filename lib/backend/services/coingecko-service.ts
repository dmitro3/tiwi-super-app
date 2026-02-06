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
    marketCapRank?: number;
}

/**
 * Maps Tiwi Chain IDs to CoinGecko Platform IDs
 */
function getPlatformId(chainId: number): string | null {
    const mapping: Record<number, string> = {
        1: 'ethereum',
        56: 'binance-smart-chain',
        137: 'polygon-pos',
        8453: 'base',
        42161: 'arbitrum-one',
        10: 'optimistic-ethereum',
        43114: 'avalanche'
    };
    return mapping[chainId] || null;
}

/**
 * Fetches verified token data by contract address from CoinGecko
 */
export async function getTokenDataByAddress(chainId: number, address: string): Promise<CoinGeckoData | null> {
    const platform = getPlatformId(chainId);
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
            description: data.description?.en,
            high24h: data.market_data?.high_24h?.usd,
            low24h: data.market_data?.low_24h?.usd,
            totalSupply: data.market_data?.total_supply,
            circulatingSupply: data.market_data?.circulating_supply,
            marketCapRank: data.market_cap_rank
        };
    } catch (error) {
        console.error('[CoinGeckoService] Error fetching token data:', error);
        return null;
    }
}
