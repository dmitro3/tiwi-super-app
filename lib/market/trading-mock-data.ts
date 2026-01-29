/**
 * Trading Page Types
 *
 * Type definitions for the trading page components.
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
