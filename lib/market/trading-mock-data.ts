/**
 * Trading Page Mock Data
 * 
 * Mock data for the trading page (orderbook, trades, orders, etc.)
 * Designed to be easily replaced with API calls in the future
 */

export interface OrderBookEntry {
  price: string;
  quantity: string;
  total: string;
}

export interface Trade {
  price: string;
  quantity: string;
  total: string;
  time: string;
  side: "buy" | "sell";
}

export interface Order {
  token: string;
  value: string;
  quantity: string;
  margin: string;
  risk: string;
  lastPrice: string;
}

export interface TokenStats {
  price: string;
  change: string;
  changePositive: boolean;
  vol24h: string;
  high24h: string;
  low24h: string;
}

// Mock orderbook data (asks - sell orders, red)
export const MOCK_ASKS: OrderBookEntry[] = [
  { price: "89,050.1", quantity: "0.001349", total: "5.233458" },
  { price: "89,045.2", quantity: "0.001349", total: "5.233458" },
  { price: "89,040.3", quantity: "0.001349", total: "5.233458" },
  { price: "89,035.4", quantity: "0.001349", total: "5.233458" },
  { price: "89,030.5", quantity: "0.001349", total: "5.233458" },
  { price: "89,025.6", quantity: "0.001349", total: "5.233458" },
  { price: "89,020.7", quantity: "0.001349", total: "5.233458" },
  { price: "89,015.8", quantity: "0.001349", total: "5.233458" },
];

// Mock orderbook data (bids - buy orders, green)
export const MOCK_BIDS: OrderBookEntry[] = [
  { price: "88,980.1", quantity: "0.001349", total: "5.233458" },
  { price: "88,975.2", quantity: "0.001349", total: "5.233458" },
  { price: "88,970.3", quantity: "0.001349", total: "5.233458" },
  { price: "88,965.4", quantity: "0.001349", total: "5.233458" },
  { price: "88,960.5", quantity: "0.001349", total: "5.233458" },
  { price: "88,955.6", quantity: "0.001349", total: "5.233458" },
  { price: "88,950.7", quantity: "0.001349", total: "5.233458" },
  { price: "88,945.8", quantity: "0.001349", total: "5.233458" },
];

// Mock recent trades
export const MOCK_RECENT_TRADES: Trade[] = [
  { price: "54,980.1", quantity: "0.001349", total: "5.233458", time: "10:23:45", side: "sell" },
  { price: "54,980.1", quantity: "0.001349", total: "5.233458", time: "10:23:44", side: "sell" },
  { price: "54,980.1", quantity: "0.001349", total: "5.233458", time: "10:23:43", side: "buy" },
  { price: "54,980.1", quantity: "0.001349", total: "5.233458", time: "10:23:42", side: "buy" },
  { price: "54,980.1", quantity: "0.001349", total: "5.233458", time: "10:23:41", side: "sell" },
  { price: "54,980.1", quantity: "0.001349", total: "5.233458", time: "10:23:40", side: "buy" },
  { price: "54,980.1", quantity: "0.001349", total: "5.233458", time: "10:23:39", side: "sell" },
  { price: "54,980.1", quantity: "0.001349", total: "5.233458", time: "10:23:38", side: "buy" },
];

// Mock orders - add one order to test the design
export const MOCK_ORDERS: Order[] = [
  {
    token: "ZORA/USDT",
    value: "$5,015.09",
    quantity: "123.5",
    margin: "$100",
    risk: "0.00%",
    lastPrice: "$0.0259",
  },
];

// Mock token stats
export const getTokenStats = (pair: string): TokenStats => {
  // In real implementation, this would fetch from API based on pair
  return {
    price: "$89,000.02",
    change: "+1.13%",
    changePositive: true,
    vol24h: "$905.87B",
    high24h: "$243.08M",
    low24h: "$202.08M",
  };
};

// Helper to get token data by pair
export const getTokenByPair = (pair: string) => {
  // Parse pair like "BTC-USDT" or "BTC/USDT"
  const normalized = pair.replace("/", "-").toUpperCase();
  const [base, quote] = normalized.split("-");
  
  // In real implementation, fetch from API
  // For now, return mock data
  return {
    symbol: base,
    pair: `${base}/${quote}`,
    icon: "https://www.figma.com/api/mcp/asset/9b5d0736-e593-414d-93cf-f3282597b4eb", // BTC icon
    price: "$89,000.02",
    change: "+1.13%",
    changePositive: true,
  };
};

