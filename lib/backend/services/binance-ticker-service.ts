/**
 * Binance Ticker Service
 * Fetches 24hr ticker data from Binance for spot and perpetual futures markets.
 * Provides caching and category-based filtering/sorting.
 */

import { getCryptoMetadata } from '@/lib/backend/data/crypto-metadata';

// ============================================================================
// Types
// ============================================================================

export interface BinanceTicker {
  symbol: string;           // e.g., "BTCUSDT"
  baseAsset: string;        // e.g., "BTC"
  quoteAsset: string;       // e.g., "USDT"
  lastPrice: number;
  priceChange: number;
  priceChangePercent: number;
  weightedAvgPrice: number;
  volume: number;           // Base asset volume
  quoteVolume: number;      // Quote (USDT) volume
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  count: number;            // Number of trades
  name: string;             // Full name e.g., "Bitcoin"
  logo: string;             // Logo URL
  // Futures-specific
  fundingRate?: number;
}

export type TickerCategory = 'top' | 'new' | 'gainers' | 'losers';

// ============================================================================
// Cache
// ============================================================================

interface CacheEntry {
  data: BinanceTicker[];
  expiry: number;
}

const tickerCache = new Map<string, CacheEntry>();
const CACHE_TTL = 30_000; // 30 seconds

// Leveraged/exotic token suffixes to exclude
const EXCLUDED_PATTERNS = ['UP', 'DOWN', 'BULL', 'BEAR'];

// ============================================================================
// Fetchers
// ============================================================================

/**
 * Fetch all spot 24hr tickers from Binance
 */
async function fetchSpotTickers(): Promise<BinanceTicker[]> {
  const cacheKey = 'spot-all';
  const cached = tickerCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  console.log('[BinanceTickerService] Fetching spot tickers...');
  const response = await fetch('https://api.binance.com/api/v3/ticker/24hr', {
    headers: { 'Accept': 'application/json' },
  });

  if (!response.ok) {
    console.error('[BinanceTickerService] Spot ticker error:', response.status);
    throw new Error(`Binance spot API error: ${response.status}`);
  }

  const rawTickers: any[] = await response.json();

  // Filter to USDT pairs only, exclude leveraged tokens
  const tickers = rawTickers
    .filter((t: any) => {
      if (!t.symbol.endsWith('USDT')) return false;
      const base = t.symbol.replace('USDT', '');
      // Exclude leveraged tokens
      if (EXCLUDED_PATTERNS.some(p => base.endsWith(p))) return false;
      // Exclude very low volume pairs (dust)
      if (parseFloat(t.quoteVolume) < 1000) return false;
      return true;
    })
    .map((t: any) => {
      const baseAsset = t.symbol.replace('USDT', '');
      const meta = getCryptoMetadata(baseAsset);
      return {
        symbol: t.symbol,
        baseAsset,
        quoteAsset: 'USDT',
        lastPrice: parseFloat(t.lastPrice),
        priceChange: parseFloat(t.priceChange),
        priceChangePercent: parseFloat(t.priceChangePercent),
        weightedAvgPrice: parseFloat(t.weightedAvgPrice),
        volume: parseFloat(t.volume),
        quoteVolume: parseFloat(t.quoteVolume),
        openPrice: parseFloat(t.openPrice),
        highPrice: parseFloat(t.highPrice),
        lowPrice: parseFloat(t.lowPrice),
        count: parseInt(t.count, 10),
        name: meta.name,
        logo: meta.logo,
      };
    });

  console.log('[BinanceTickerService] Spot tickers fetched:', tickers.length);
  tickerCache.set(cacheKey, { data: tickers, expiry: Date.now() + CACHE_TTL });
  return tickers;
}

/**
 * Fetch all perpetual futures 24hr tickers from Binance
 */
async function fetchFuturesTickers(): Promise<BinanceTicker[]> {
  const cacheKey = 'perp-all';
  const cached = tickerCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  console.log('[BinanceTickerService] Fetching futures tickers...');

  // Fetch tickers and funding rates in parallel
  const [tickerResponse, fundingResponse] = await Promise.all([
    fetch('https://fapi.binance.com/fapi/v1/ticker/24hr', {
      headers: { 'Accept': 'application/json' },
    }),
    fetch('https://fapi.binance.com/fapi/v1/premiumIndex', {
      headers: { 'Accept': 'application/json' },
    }).catch(() => null),
  ]);

  if (!tickerResponse.ok) {
    console.error('[BinanceTickerService] Futures ticker error:', tickerResponse.status);
    throw new Error(`Binance futures API error: ${tickerResponse.status}`);
  }

  const rawTickers: any[] = await tickerResponse.json();

  // Build funding rate map
  const fundingRateMap = new Map<string, number>();
  if (fundingResponse && fundingResponse.ok) {
    const fundingData: any[] = await fundingResponse.json();
    for (const f of fundingData) {
      fundingRateMap.set(f.symbol, parseFloat(f.lastFundingRate));
    }
  }

  // Filter to USDT perpetuals
  const tickers = rawTickers
    .filter((t: any) => {
      if (!t.symbol.endsWith('USDT')) return false;
      if (parseFloat(t.quoteVolume) < 1000) return false;
      return true;
    })
    .map((t: any) => {
      let baseAsset = t.symbol.replace('USDT', '');
      // Handle 1000SHIB, 1000FLOKI display
      if (baseAsset.startsWith('1000')) {
        baseAsset = baseAsset.replace('1000', '');
      }
      const meta = getCryptoMetadata(baseAsset);
      return {
        symbol: t.symbol,
        baseAsset,
        quoteAsset: 'USDT',
        lastPrice: parseFloat(t.lastPrice),
        priceChange: parseFloat(t.priceChange),
        priceChangePercent: parseFloat(t.priceChangePercent),
        weightedAvgPrice: parseFloat(t.weightedAvgPrice),
        volume: parseFloat(t.volume),
        quoteVolume: parseFloat(t.quoteVolume),
        openPrice: parseFloat(t.openPrice),
        highPrice: parseFloat(t.highPrice),
        lowPrice: parseFloat(t.lowPrice),
        count: parseInt(t.count, 10),
        name: meta.name,
        logo: meta.logo,
        fundingRate: fundingRateMap.get(t.symbol),
      };
    });

  console.log('[BinanceTickerService] Futures tickers fetched:', tickers.length);
  tickerCache.set(cacheKey, { data: tickers, expiry: Date.now() + CACHE_TTL });
  return tickers;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Get tickers filtered and sorted by category
 */
export async function getBinanceTickers(
  marketType: 'spot' | 'perp',
  category: TickerCategory = 'top',
  limit: number = 500,
): Promise<BinanceTicker[]> {
  const allTickers = marketType === 'perp'
    ? await fetchFuturesTickers()
    : await fetchSpotTickers();

  let filtered: BinanceTicker[];

  switch (category) {
    case 'top':
      // Sort by USDT volume descending
      filtered = [...allTickers].sort((a, b) => b.quoteVolume - a.quoteVolume);
      break;
    case 'gainers':
      // Positive change, sorted by highest % gain
      filtered = allTickers
        .filter(t => t.priceChangePercent > 0)
        .sort((a, b) => b.priceChangePercent - a.priceChangePercent);
      break;
    case 'losers':
      // Negative change, sorted by most negative
      filtered = allTickers
        .filter(t => t.priceChangePercent < 0)
        .sort((a, b) => a.priceChangePercent - b.priceChangePercent);
      break;
    case 'new':
      // Sort by lowest trade count (proxy for newer listings)
      filtered = [...allTickers].sort((a, b) => a.count - b.count);
      break;
    default:
      filtered = allTickers;
  }

  return filtered.slice(0, limit);
}
