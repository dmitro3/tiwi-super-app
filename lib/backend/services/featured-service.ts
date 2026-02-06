/**
 * Featured Service
 * Provides high-priority tokens that should always be present in market lists.
 */

import { resolveOnChainMarket } from './onchain-market-service';

const FEATURED_TOKENS = [
    {
        symbol: 'TWC',
        name: 'TIWICAT',
        address: '0xda1060158f7d593667cce0a15db346bb3ffb3596',
        chainId: 56,
        provider: 'onchain' as const,
        marketType: 'spot' as const,
        logo: 'https://coin-images.coingecko.com/coins/images/68750/large/200px_tiwi.png?1769670437'
    }
];

/**
 * Gets enriched data for all featured tokens
 */
export async function getFeaturedMarkets() {
    const featuredResults = await Promise.all(FEATURED_TOKENS.map(async (token) => {
        try {
            const data = await resolveOnChainMarket(
                token.symbol,
                'USDT',
                token.address,
                token.chainId,
                { logoURI: token.logo, name: token.name }
            );

            if (!data) return null;

            return {
                ...data,
                isFeatured: true
            };
        } catch (e) {
            console.error(`[FeaturedService] Error resolving ${token.symbol}:`, e);
            return null;
        }
    }));

    return featuredResults.filter((f): f is any => f !== null);
}
