/**
 * Orderbook Service
 * Fetches real-time orderbook data from Binance exchange
 * Supports both spot and perpetual futures markets
 */

export interface OrderBookLevel {
  price: string;
  quantity: string;
  total: string;
}

export interface OrderBookData {
  symbol: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  lastUpdateId: number;
  timestamp: number;
}

// Binance API endpoints
const BINANCE_SPOT_API = 'https://api.binance.com/api/v3';
const BINANCE_FUTURES_API = 'https://fapi.binance.com/fapi/v1';

// Cache for orderbook data (3 second TTL)
const orderbookCache = new Map<string, { data: OrderBookData; expiry: number }>();
const ORDERBOOK_CACHE_TTL = 3000; // 3 seconds

/**
 * Normalize symbol for Binance (remove slashes, dashes, underscores)
 * Binance expects symbols like "XRPUSDT" not "XRP-USDT"
 */
function normalizeSymbol(pair: string): string {
  // Remove all non-alphanumeric characters and uppercase
  const normalized = pair.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  console.log('[OrderbookService] normalizeSymbol:', pair, '->', normalized);
  return normalized;
}

/**
 * Format price with appropriate decimal places
 */
function formatPrice(price: string): string {
  const num = parseFloat(price);
  if (num >= 1000) return num.toFixed(2);
  if (num >= 1) return num.toFixed(4);
  if (num >= 0.0001) return num.toFixed(6);
  return num.toFixed(8);
}

/**
 * Format quantity with appropriate decimal places
 */
function formatQuantity(qty: string): string {
  const num = parseFloat(qty);
  if (num >= 1000) return num.toFixed(2);
  if (num >= 1) return num.toFixed(4);
  return num.toFixed(6);
}

/**
 * Transform Binance orderbook response to our format
 */
function transformOrderbook(
  data: { bids: [string, string][]; asks: [string, string][]; lastUpdateId: number },
  symbol: string
): OrderBookData {
  const transformLevels = (levels: [string, string][]): OrderBookLevel[] => {
    return levels.slice(0, 12).map(([price, quantity]) => ({
      price: formatPrice(price),
      quantity: formatQuantity(quantity),
      total: formatQuantity((parseFloat(price) * parseFloat(quantity)).toString()),
    }));
  };

  // Binance returns asks in ascending order (lowest first)
  // Reverse them so highest price is at top, lowest at bottom (closest to spread)
  return {
    symbol,
    bids: transformLevels(data.bids),
    asks: transformLevels(data.asks).reverse(),
    lastUpdateId: data.lastUpdateId,
    timestamp: Date.now(),
  };
}

/**
 * Fetch spot orderbook from Binance
 */
export async function getSpotOrderbook(pair: string): Promise<OrderBookData | null> {
  const symbol = normalizeSymbol(pair);
  const cacheKey = `spot:${symbol}`;

  console.log('[OrderbookService] getSpotOrderbook called with pair:', pair, '-> symbol:', symbol);

  // Check cache
  const cached = orderbookCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    console.log('[OrderbookService] Returning cached orderbook for:', symbol);
    return cached.data;
  }

  const url = `${BINANCE_SPOT_API}/depth?symbol=${symbol}&limit=20`;
  console.log('[OrderbookService] Fetching:', url);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    console.log('[OrderbookService] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'unknown error');
      console.error('[OrderbookService] Binance API error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    console.log('[OrderbookService] Response data keys:', Object.keys(data));

    if (!data.bids || !data.asks) {
      console.error('[OrderbookService] Invalid response - missing bids/asks:', JSON.stringify(data).slice(0, 200));
      return null;
    }

    console.log('[OrderbookService] Raw bids count:', data.bids.length, 'asks count:', data.asks.length);

    const orderbook = transformOrderbook(data, symbol);
    console.log('[OrderbookService] Transformed orderbook:', symbol, 'bids:', orderbook.bids.length, 'asks:', orderbook.asks.length);

    // Cache result
    orderbookCache.set(cacheKey, { data: orderbook, expiry: Date.now() + ORDERBOOK_CACHE_TTL });

    return orderbook;
  } catch (error: any) {
    console.error('[OrderbookService] FETCH ERROR for', symbol, ':', error.name, error.message, error.stack);
    return null;
  }
}

/**
 * Fetch perpetual futures orderbook from Binance
 */
export async function getPerpOrderbook(pair: string): Promise<OrderBookData | null> {
  let symbol = normalizeSymbol(pair);
  const cacheKey = `perp:${symbol}`;

  console.log('[OrderbookService] getPerpOrderbook called with pair:', pair, '-> symbol:', symbol);

  // Handle 1000SHIB, 1000FLOKI special cases for perps
  if (symbol === 'SHIBUSDT') symbol = '1000SHIBUSDT';
  if (symbol === 'FLOKIUSDT') symbol = '1000FLOKIUSDT';

  // Check cache
  const cached = orderbookCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    console.log('[OrderbookService] Returning cached perp orderbook for:', symbol);
    return cached.data;
  }

  const url = `${BINANCE_FUTURES_API}/depth?symbol=${symbol}&limit=20`;
  console.log('[OrderbookService] Fetching perp:', url);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    console.log('[OrderbookService] Perp response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'unknown error');
      console.error('[OrderbookService] Binance Futures API error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    console.log('[OrderbookService] Perp response data keys:', Object.keys(data));

    if (!data.bids || !data.asks) {
      console.error('[OrderbookService] Invalid perp response - missing bids/asks:', JSON.stringify(data).slice(0, 200));
      return null;
    }

    console.log('[OrderbookService] Raw perp bids count:', data.bids.length, 'asks count:', data.asks.length);

    const orderbook = transformOrderbook(data, symbol);
    console.log('[OrderbookService] Transformed perp orderbook:', symbol, 'bids:', orderbook.bids.length, 'asks:', orderbook.asks.length);

    // Cache result
    orderbookCache.set(cacheKey, { data: orderbook, expiry: Date.now() + ORDERBOOK_CACHE_TTL });

    return orderbook;
  } catch (error: any) {
    console.error('[OrderbookService] PERP FETCH ERROR for', symbol, ':', error.name, error.message, error.stack);
    return null;
  }
}

/**
 * Get orderbook for a pair (auto-detects spot vs perp based on marketType)
 */
export async function getOrderbook(
  pair: string,
  marketType: 'spot' | 'perp' = 'spot'
): Promise<OrderBookData | null> {
  if (marketType === 'perp') {
    return getPerpOrderbook(pair);
  }
  return getSpotOrderbook(pair);
}

/**
 * Get current ticker price from Binance
 */
export async function getTickerPrice(pair: string, marketType: 'spot' | 'perp' = 'spot'): Promise<number | null> {
  const symbol = normalizeSymbol(pair);

  try {
    const baseUrl = marketType === 'perp' ? BINANCE_FUTURES_API : BINANCE_SPOT_API;
    const url = `${baseUrl}/ticker/price?symbol=${symbol}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'TIWI-Trading/1.0'
      },
      signal: controller.signal,
      cache: 'no-store',
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return parseFloat(data.price);
  } catch (error: any) {
    console.error('[OrderbookService] Error fetching ticker price:', error.message || error);
    return null;
  }
}

/**
 * Check if a pair is likely supported (based on common patterns)
 * This is a hint, actual support is determined by the API response
 */
export function isLikelySupported(pair: string): boolean {
  const symbol = normalizeSymbol(pair);
  // Most USDT pairs on major cryptos are supported
  return symbol.endsWith('USDT') || symbol.endsWith('BTC') || symbol.endsWith('ETH');
}
