/**
 * Binance Tickers Frontend API
 *
 * Fetches Binance 24hr ticker data DIRECTLY from the browser (client-side).
 * Uses multiple fallback endpoints in case primary domains are blocked/unreachable.
 */

import type { Token } from '@/lib/frontend/types/tokens';
import { getCryptoMetadata } from '@/lib/backend/data/crypto-metadata';

export interface FetchBinanceTickersParams {
  marketType: 'spot' | 'perp';
  category?: 'top' | 'new' | 'gainers' | 'losers';
  limit?: number;
}

// Leveraged/exotic token suffixes to exclude
const EXCLUDED_PATTERNS = ['UP', 'DOWN', 'BULL', 'BEAR'];

// Binance spot API endpoints (try in order)
const SPOT_ENDPOINTS = [
  'https://api.binance.com',
  'https://api1.binance.com',
  'https://api2.binance.com',
  'https://api3.binance.com',
  'https://api4.binance.com',
  'https://data-api.binance.vision',
];

// Binance futures API endpoints (try in order)
const FUTURES_ENDPOINTS = [
  'https://fapi.binance.com',
  'https://fapi1.binance.com',
  'https://fapi2.binance.com',
];

/**
 * Try fetching from multiple endpoints, return the first successful response
 */
async function fetchWithFallback(
  endpoints: string[],
  path: string,
): Promise<Response> {
  let lastError: Error | null = null;

  for (const base of endpoints) {
    try {
      const response = await fetch(`${base}${path}`, {
        signal: AbortSignal.timeout(10000),
      });
      if (response.ok) return response;
      lastError = new Error(`${base}${path} returned ${response.status}`);
    } catch (err: any) {
      lastError = err;
      // Continue to next endpoint
    }
  }

  throw lastError || new Error('All Binance endpoints failed');
}

/**
 * Fetch Binance tickers directly from the browser and transform to Token[]
 */
export async function fetchBinanceTickers(
  params: FetchBinanceTickersParams,
): Promise<Token[]> {
  const { marketType, category = 'top', limit = 500 } = params;

  let rawTickers: any[];

  if (marketType === 'perp') {
    // Fetch futures tickers and funding rates in parallel
    const [tickerResponse, fundingResponse] = await Promise.all([
      fetchWithFallback(FUTURES_ENDPOINTS, '/fapi/v1/ticker/24hr'),
      fetchWithFallback(FUTURES_ENDPOINTS, '/fapi/v1/premiumIndex').catch(() => null),
    ]);

    const rawData: any[] = await tickerResponse.json();

    // Build funding rate map
    const fundingRateMap = new Map<string, number>();
    if (fundingResponse && fundingResponse.ok) {
      const fundingData: any[] = await fundingResponse.json();
      for (const f of fundingData) {
        fundingRateMap.set(f.symbol, parseFloat(f.lastFundingRate));
      }
    }

    // Filter to USDT perpetuals
    rawTickers = rawData
      .filter((t: any) => {
        if (!t.symbol.endsWith('USDT')) return false;
        if (parseFloat(t.quoteVolume) < 1000) return false;
        return true;
      })
      .map((t: any) => {
        let baseAsset = t.symbol.replace('USDT', '');
        if (baseAsset.startsWith('1000')) {
          baseAsset = baseAsset.replace('1000', '');
        }
        return {
          ...t,
          baseAsset,
          fundingRate: fundingRateMap.get(t.symbol),
        };
      });
  } else {
    // Fetch spot tickers
    const response = await fetchWithFallback(SPOT_ENDPOINTS, '/api/v3/ticker/24hr');

    const rawData: any[] = await response.json();

    // Filter to USDT pairs, exclude leveraged tokens
    rawTickers = rawData
      .filter((t: any) => {
        if (!t.symbol.endsWith('USDT')) return false;
        const base = t.symbol.replace('USDT', '');
        if (EXCLUDED_PATTERNS.some(p => base.endsWith(p))) return false;
        if (parseFloat(t.quoteVolume) < 1000) return false;
        return true;
      })
      .map((t: any) => ({
        ...t,
        baseAsset: t.symbol.replace('USDT', ''),
      }));
  }

  // Apply category sorting/filtering
  let filtered: any[];

  switch (category) {
    case 'top':
      filtered = [...rawTickers].sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume));
      break;
    case 'gainers':
      filtered = rawTickers
        .filter((t: any) => parseFloat(t.priceChangePercent) > 0)
        .sort((a: any, b: any) => parseFloat(b.priceChangePercent) - parseFloat(a.priceChangePercent));
      break;
    case 'losers':
      filtered = rawTickers
        .filter((t: any) => parseFloat(t.priceChangePercent) < 0)
        .sort((a: any, b: any) => parseFloat(a.priceChangePercent) - parseFloat(b.priceChangePercent));
      break;
    case 'new':
      filtered = [...rawTickers].sort((a, b) => parseInt(a.count) - parseInt(b.count));
      break;
    default:
      filtered = rawTickers;
  }

  // Take the limit
  filtered = filtered.slice(0, limit);

  // Transform to Token[]
  return filtered.map((t: any) => {
    const baseAsset = t.baseAsset;
    const meta = getCryptoMetadata(baseAsset);
    const lastPrice = parseFloat(t.lastPrice);
    const highPrice = parseFloat(t.highPrice);
    const lowPrice = parseFloat(t.lowPrice);
    const quoteVolume = parseFloat(t.quoteVolume);
    const priceChangePercent = parseFloat(t.priceChangePercent);

    const id = `0-${t.symbol.toLowerCase()}`;

    return {
      id,
      name: meta.name,
      symbol: baseAsset,
      address: t.symbol, // e.g. "BTCUSDT"
      logo: meta.logo,
      logoURI: meta.logo,
      chain: 'Binance',
      chainId: 0,
      price: lastPrice.toString(),
      priceChange24h: priceChangePercent,
      volume24h: quoteVolume,
      high24h: highPrice,
      low24h: lowPrice,
      ...(t.fundingRate !== undefined ? { fundingRate: t.fundingRate } : {}),
    } as Token;
  });
}
