/**
 * Binance Tickers Frontend API
 *
 * Fetches Binance ticker data via our own API route (server-side proxy).
 * This avoids Binance domain blocks in regions like Nigeria —
 * the server (deployed in the cloud) can reach Binance, and users
 * only connect to our own domain.
 */

import type { Token } from '@/lib/frontend/types/tokens';

export interface FetchBinanceTickersParams {
  marketType: 'spot' | 'perp';
  category?: 'top' | 'new' | 'gainers' | 'losers';
  limit?: number;
}

/**
 * Fetch Binance tickers via our server-side proxy API route
 */
export async function fetchBinanceTickers(
  params: FetchBinanceTickersParams,
): Promise<Token[]> {
  const { marketType, category = 'top', limit = 500 } = params;

  const searchParams = new URLSearchParams({
    marketType,
    category,
    limit: limit.toString(),
  });

  const response = await fetch(`/api/v1/binance/tickers?${searchParams}`);

  if (!response.ok) {
    throw new Error(`Binance tickers API error: ${response.status}`);
  }

  const data = await response.json();
  const tokens: any[] = data.tokens || [];

  // Transform API response to Token[]
  return tokens.map((t: any) => {
    const id = `0-${(t.address || t.symbol || '').toLowerCase()}`;

    return {
      id,
      name: t.name || t.symbol,
      symbol: t.symbol,
      address: t.address || t.symbol,
      logo: t.logoURI || t.logo || '',
      logoURI: t.logoURI || t.logo || '',
      chain: 'Binance',
      chainId: 0,
      price: t.priceUSD || t.price || '0',
      priceChange24h: typeof t.priceChange24h === 'number' ? t.priceChange24h : parseFloat(t.priceChange24h || '0'),
      volume24h: typeof t.volume24h === 'number' ? t.volume24h : parseFloat(t.volume24h || '0'),
      high24h: typeof t.highPrice === 'number' ? t.highPrice : parseFloat(t.highPrice || '0'),
      low24h: typeof t.lowPrice === 'number' ? t.lowPrice : parseFloat(t.lowPrice || '0'),
      ...(t.fundingRate !== undefined ? { fundingRate: t.fundingRate } : {}),
    } as Token;
  });
}
