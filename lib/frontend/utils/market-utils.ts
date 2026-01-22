import type { MarketTokenPair } from "@/lib/backend/types/backend-tokens";
import type { Token } from "@/lib/frontend/types/tokens";

/**
 * Helper to transform backend MarketTokenPair to frontend Token format
 */
export const marketPairToToken = (pair: MarketTokenPair): Token => {
  const { baseToken } = pair;
  return {
    id: `${pair.chainId}-${baseToken.address.toLowerCase()}`,
    name: baseToken.name,
    symbol: baseToken.symbol,
    address: baseToken.address,
    logo: baseToken.logoURI,
    logoURI: baseToken.logoURI,
    chain: pair.chainName,
    chainId: pair.chainId,
    decimals: baseToken.decimals,
    price: pair.pairPrice || baseToken.priceUSD,
    priceChange24h: pair.priceChange24h,
    volume24h: pair.volume24h,
    liquidity: pair.liquidity,
    marketCap: pair.marketCap,
    transactionCount: pair.transactionCount,
    // Store original pair for specialized rendering
    pair: pair,
  };
};
